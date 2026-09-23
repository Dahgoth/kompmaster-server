"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError, apiRequest } from "@/api/client";
import { z } from "zod";
import { contentPageSchema, type ContentPage } from "@/api/schemas";
import { AdminShell } from "@/features/admin/AdminShell";

/**
 * /admin/pages: SEO content-page editor (ADR 007 decision: PO via admin,
 * markdown + live preview ~1 day). The same POST upserts by slug; the
 * backend hook revalidates `pages` + `page:<slug>` and pings IndexNow.
 * /p/<slug> is the public surface that consumes these rows (next slice).
 */
export function AdminPagesView() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ContentPage | null>(null);

  const list = useQuery({
    queryKey: ["admin-pages"],
    queryFn: ({ signal }) =>
      apiRequest(z.array(contentPageSchema), "GET", "/pages", {
        scope: "admin",
        signal,
      }),
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: (input: {
      slug: string;
      title: string;
      body_markdown?: string;
      meta_title?: string;
      meta_description?: string;
      noindex: boolean;
    }) => apiRequest(contentPageSchema, "POST", "/pages", { scope: "admin", body: input }),
    onSuccess: () => {
      setError(null);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) =>
      apiRequest(z.object({ ok: z.boolean() }), "DELETE", `/pages/${encodeURIComponent(slug)}`, {
        scope: "admin",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pages"] }),
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
    },
  });

  return (
    <AdminShell active="/admin/pages">
      <div className="space-y-6">
        <section className="rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="mb-2 text-lg font-extrabold">Страницы контента</h2>
          <p className="mb-4 text-sm text-muted">
            Публикуются на /p/&lt;слаг&gt; сразу после сохранения (ISR-хук + IndexNow). Слаг —
            латиница; переименование создаёт новый URL.
          </p>
          {error ? (
            <p role="alert" className="mb-4 rounded-btn bg-soft p-3 text-sm font-bold">
              {error}
            </p>
          ) : null}
          {list.isLoading ? (
            <div className="h-24 animate-pulse rounded-card bg-soft" aria-busy="true" />
          ) : list.isError ? (
            <p role="alert" className="text-sm text-muted">
              Не удалось загрузить страницы.{" "}
              <button type="button" onClick={() => list.refetch()} className="font-bold underline">
                Повторить
              </button>
            </p>
          ) : list.data && list.data.length ? (
            <ul className="divide-y divide-line">
              {list.data.map((page) => (
                <li
                  key={page.slug}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">{page.title}</p>
                    <p className="text-muted">
                      <code className="text-xs">/p/{page.slug}</code>
                      {page.noindex ? " · noindex" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(page)}
                      className="h-11 rounded-btn border border-line px-4 text-sm font-extrabold hover:bg-soft"
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Удалить страницу «${page.title}»? URL /p/${page.slug} перестанет работать.`,
                          )
                        ) {
                          deleteMutation.mutate(page.slug);
                        }
                      }}
                      className="h-11 rounded-btn border border-line px-4 text-sm font-extrabold hover:bg-soft"
                    >
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Страниц пока нет — создайте первую ниже.</p>
          )}
        </section>

        <PageEditor
          key={editing?.slug ?? "new"}
          initial={editing}
          busy={saveMutation.isPending}
          onCancel={() => setEditing(null)}
          onSave={(input) => saveMutation.mutate(input)}
        />
      </div>
    </AdminShell>
  );
}

function PageEditor({
  initial,
  busy,
  onCancel,
  onSave,
}: {
  initial: ContentPage | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (input: {
    slug: string;
    title: string;
    body_markdown?: string;
    meta_title?: string;
    meta_description?: string;
    noindex: boolean;
  }) => void;
}) {
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body_markdown ?? "");
  const [metaTitle, setMetaTitle] = useState(initial?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.meta_description ?? "");
  const [noindex, setNoindex] = useState(initial?.noindex ?? false);
  const [formError, setFormError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
      setFormError("Слаг: строчные латинские буквы, цифры и дефисы");
      return;
    }
    if (!title.trim()) {
      setFormError("Нужен заголовок страницы");
      return;
    }
    setFormError(null);
    onSave({
      slug: slug.trim(),
      title: title.trim(),
      body_markdown: body || undefined,
      meta_title: metaTitle.trim() || undefined,
      meta_description: metaDescription.trim() || undefined,
      noindex,
    });
  }

  return (
    <section className="rounded-panel border border-line bg-white p-6 shadow-card">
      <h2 className="mb-4 text-lg font-extrabold">
        {initial ? `Редактирование: ${initial.slug}` : "Новая страница"}
      </h2>
      {formError ? (
        <p role="alert" className="mb-4 rounded-btn bg-soft p-3 text-sm font-bold">
          {formError}
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Слаг *</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={!!initial}
            placeholder="kak-vybrat-noutbuk"
            className="h-12 w-full rounded-btn border border-line bg-white px-3 text-sm focus:border-pink disabled:bg-soft"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Заголовок *</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-12 w-full rounded-btn border border-line bg-white px-3 text-sm focus:border-pink"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Meta-title</span>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder="По умолчанию — заголовок"
            className="h-12 w-full rounded-btn border border-line bg-white px-3 text-sm focus:border-pink"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Meta-description</span>
          <input
            type="text"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            className="h-12 w-full rounded-btn border border-line bg-white px-3 text-sm focus:border-pink"
          />
        </label>
        <div className="grid gap-3 sm:col-span-2 lg:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Текст (markdown)</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full rounded-btn border border-line bg-white p-3 font-mono text-sm focus:border-pink"
              placeholder={
                "## Заголовок\n\nТекст с **жирным** и списками:\n\n- пункт один\n- пункт два"
              }
            />
          </label>
          <div>
            <p className="mb-1 text-sm font-bold">Предпросмотр</p>
            <div
              aria-live="polite"
              className="min-h-40 rounded-btn border border-line bg-soft p-3 text-sm whitespace-pre-line"
            >
              {body || <span className="text-muted">Пока пусто — начните писать слева.</span>}
            </div>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={noindex}
            onChange={(e) => setNoindex(e.target.checked)}
            className="h-4 w-4"
          />
          <span>Скрыть от поисковиков (noindex) — черновики, служебные страницы</span>
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-btn bg-gradient-to-r from-pink to-violet px-6 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {busy ? "Сохраняем…" : initial ? "Сохранить изменения" : "Создать страницу"}
          </button>
          {initial ? (
            <button
              type="button"
              onClick={onCancel}
              className="h-12 rounded-btn border border-line bg-white px-5 text-sm font-extrabold hover:bg-soft"
            >
              Отмена
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
