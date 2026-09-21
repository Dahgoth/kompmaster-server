import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/config";

/**
 * On-demand ISR invalidation (ADR 007 §Decision 1). The backend calls this
 * after admin mutations with cache tags; failures never block the mutation —
 * the ISR TTL is the backstop. Requires REVALIDATE_SECRET; when unset the
 * route always 401s (supported mode).
 */

export const dynamic = "force-dynamic";

const MAX_TAGS = 20;

export async function POST(request: NextRequest) {
  const provided = request.headers.get("x-revalidate-secret");
  if (!config.revalidateSecret || provided !== config.revalidateSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const rawTags = (body as { tags?: unknown } | null)?.tags;
  const tags = Array.isArray(rawTags)
    ? rawTags
        .filter((t): t is string => typeof t === "string" && t.length <= 100)
        .slice(0, MAX_TAGS)
    : [];
  if (!tags.length) {
    return NextResponse.json({ error: "Нужен непустой массив tags" }, { status: 400 });
  }

  for (const tag of tags) {
    revalidateTag(tag);
  }

  // IndexNow (Yandex/Bing): ping changed product/page URLs, best effort.
  const urls = tags
    .filter((tag) => tag.startsWith("product:") || tag.startsWith("page:"))
    .map((tag) => {
      const [, ...rest] = tag.split(":");
      const segment = encodeURIComponent(rest.join(":"));
      return tag.startsWith("product:")
        ? `${config.siteUrl}/product/${segment}`
        : `${config.siteUrl}/p/${segment}`;
    });
  if (urls.length && config.indexNowKey) {
    try {
      await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: new URL(config.siteUrl).host,
          key: config.indexNowKey,
          keyLocation: `${config.siteUrl}/api/indexnow`,
          urlList: urls,
        }),
      });
    } catch {
      // best effort — crawler backstop is the sitemap
    }
  }

  return NextResponse.json({ revalidated: true, tags });
}
