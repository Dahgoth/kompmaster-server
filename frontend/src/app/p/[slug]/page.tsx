import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiRequest } from "@/api/client";
import { contentPageSchema, type ContentPage } from "@/api/schemas";
import { cacheTags } from "@/api/categories";
import { renderMarkdown } from "@/lib/markdown";

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
