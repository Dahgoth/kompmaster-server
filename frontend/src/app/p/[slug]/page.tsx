import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiRequest } from "@/api/client";
import { contentPageSchema, type ContentPage } from "@/api/schemas";
import { cacheTags } from "@/api/categories";

interface ContentPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

async function loadPage(slug: string): Promise<ContentPage | null> {
  try {
    return await apiRequest(contentPageSchema, "GET", `/pages/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300, tags: [cacheTags.pages, cacheTags.page(slug)] },
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) return { title: "Страница не найдена" };
  return {
    title: page.meta_title || page.title,
    description: page.meta_description || undefined,
    alternates: { canonical: `/p/${encodeURIComponent(slug)}` },
    robots: page.noindex ? { index: false, follow: true } : undefined,
  };
}

/**
 * Minimal markdown renderer — the PO writes plain markdown in the admin
 * editor; this renders headings, bold, paragraphs, and list items without a
 * client-side dependency (SSR-visible for crawlers). Not a full CommonMark
 * implementation by design — documented limitation.
 */
function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  let inList = false;

  const inline = (text: string): string =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("### ")) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<h3>${inline(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<h2>${inline(trimmed.slice(3))}</h2>`);
    } else if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inline(trimmed.replace(/^[-*]\s+/, ""))}</li>`);
    } else if (trimmed === "") {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
    } else {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<p>${inline(trimmed)}</p>`);
    }
  }
  if (inList) html.push("</ul>");
  return html.join("");
}

export default async function ContentPageRoute({ params }: ContentPageProps) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) notFound();

  return (
    <article className="space-y-6 py-8">
      <h1 className="text-2xl font-extrabold">{page.title}</h1>
      {page.body_markdown ? (
        // Rendered from admin-entered markdown server-side; the renderer
        // escapes raw HTML first (inline()), so no script injection.
        <div
          className="prose max-w-none space-y-4 rounded-panel border border-line bg-white p-6 shadow-card text-base leading-relaxed [&_h2]:text-lg [&_h2]:font-extrabold [&_h3]:font-extrabold [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body_markdown) }}
        />
      ) : (
        <p className="text-muted">Текст страницы пока не заполнен.</p>
      )}
    </article>
  );
}
