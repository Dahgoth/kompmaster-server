"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/api/client";
import { queryKeys } from "@/api/categories";
import { z } from "zod";

/**
 * Price import (plan R9/R10 + backend contract comment in
 * backend/src/routes/products.js): preview-first. The file posts as
 * multipart/form-data (multer single("file")) with dryRun=true, the admin
 * reviews sheet/rows/skipped/blank-stock/duplicates/sample, then confirms
 * with dryRun=false + mode (sync zeroes absent items, merge leaves them).
 */
const previewSchema = z.object({
  sheetName: z.string().nullable(),
  totalRows: z.number().int(),
  skipped: z.number().int(),
  blankStock: z.number().int(),
  duplicates: z.array(z.string()),
  sample: z.array(z.object({ name: z.string(), price: z.number(), available: z.number() })),
});

const applySchema = z.object({
  added: z.number().int(),
  updated: z.number().int(),
  zeroed: z.number().int(),
  skipped: z.number().int(),
  blankStock: z.number().int(),
  duplicates: z.array(z.string()),
});

type Preview = z.infer<typeof previewSchema>;
type ApplyResult = z.infer<typeof applySchema>;

function adminFetch(input: string, init: RequestInit): Promise<Response> {
  const token =
    typeof window !== "undefined" ? window.sessionStorage.getItem("km_admin_panel_token") : null;
  return fetch(input, {
    ...init,
    headers: {
      ...(token ? { "X-Admin-Panel-Token": token } : {}),
      ...(init.headers ?? {}),
    },
  });
}

/** Non-JSON fetch for multipart posts (apiRequest is JSON-only). */
async function adminMultipart(schema: typeof previewSchema, form: FormData): Promise<Preview>;
async function adminMultipart(schema: typeof applySchema, form: FormData): Promise<ApplyResult>;
async function adminMultipart(
  schema: z.ZodType<Preview | ApplyResult>,
  form: FormData,
): Promise<Preview | ApplyResult> {
  const response = await adminFetch("/api/products/import-price", {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data: unknown = await response.json();
      if (data !== null && typeof data === "object" && "error" in data) {
        message = String((data as { error: unknown }).error);
      }
    } catch {
      // keep status message
    }
    throw new ApiError(response.status, message);
  }
  return schema.parse(await response.json());
}

export function PriceImport() {
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState("");
  const [mode, setMode] = useState<"sync" | "merge">("sync");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileBytes, setFileBytes] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!fileBytes || !categoryId.trim()) {
        throw new Error("Выберите файл и раздел");
      }
      const form = new FormData();
      form.append("file", fileBytes);
      form.append("categoryId", categoryId.trim());
      form.append("mode", mode);
      form.append("dryRun", "true");
      return adminMultipart(previewSchema, form);
    },
    onSuccess: (data) => {
      setPreview(data);
      setResult(null);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Ошибка сети, попробуйте позже");
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!fileBytes || !categoryId.trim() || !preview) {
        throw new Error("Сначала покажите предпросмотр");
      }
      const form = new FormData();
      form.append("file", fileBytes);
      form.append("categoryId", categoryId.trim());
      form.append("mode", mode);
      form.append("dryRun", "false");
      return adminMultipart(applySchema, form);
    },
    onSuccess: (data) => {
      setResult(data);
      setPreview(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.products({}) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders({}) });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Ошибка сети, попробуйте позже");
    },
  });

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setFileBytes(file);
    setFileName(file ? file.name : null);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  return (
    <section className="rounded-panel border border-line bg-white p-6 shadow-card">
      <h2 className="mb-1 text-lg font-extrabold">Импорт прайса</h2>
      <p className="mb-4 text-sm text-muted">
        xlsx/xls/csv/tsv. Сначала показывается предпросмотр — импорт применяется только после
        подтверждения. Режим sync обнуляет остатки товаров раздела, которых нет в файле; merge
        оставляет их как есть.
      </p>

      {error ? (
        <p role="alert" className="mb-4 rounded-btn bg-soft p-3 text-sm font-bold">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Файл прайса *</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.tsv"
            onChange={onFile}
            className="block w-full rounded-btn border border-line bg-white p-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Раздел (id категории) *</span>
          <input
            type="text"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder="noutbuki"
            className="h-12 w-full rounded-btn border border-line bg-white px-3 text-sm focus:border-pink"
          />
        </label>
        <fieldset>
          <legend className="mb-1 text-sm font-bold">Режим</legend>
          <div className="flex gap-2">
            {(
              [
                ["sync", "sync — обнулить отсутствующие"],
                ["merge", "merge — не трогать отсутствующих"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`flex h-12 cursor-pointer items-center rounded-btn border px-4 text-sm font-bold ${
                  mode === value ? "border-pink" : "border-line"
                }`}
              >
                <input
                  type="radio"
                  name="import-mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => setMode(value)}
                  className="sr-only"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={previewMutation.isPending || !fileBytes || !categoryId.trim()}
          onClick={() => previewMutation.mutate()}
          className="h-12 rounded-btn border border-line bg-white px-5 text-sm font-extrabold hover:bg-soft disabled:opacity-50"
        >
          {previewMutation.isPending ? "Читаем файл…" : "Показать предпросмотр"}
        </button>
        {preview ? (
          <button
            type="button"
            disabled={applyMutation.isPending}
            onClick={() => applyMutation.mutate()}
            className="h-12 rounded-btn bg-gradient-to-r from-pink to-violet px-5 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {applyMutation.isPending ? "Применяем…" : "Применить импорт"}
          </button>
        ) : null}
      </div>

      {preview ? (
        <div
          className="mt-4 space-y-2 rounded-card border border-line p-4 text-sm"
          aria-live="polite"
        >
          <p>
            <span className="font-bold">Лист:</span> {preview.sheetName ?? "—"} ·{" "}
            <span className="font-bold">строк:</span> {preview.totalRows} ·{" "}
            <span className="font-bold">пропущено:</span> {preview.skipped} ·{" "}
            <span className="font-bold">без остатка:</span> {preview.blankStock}
          </p>
          {preview.duplicates.length ? (
            <p>
              <span className="font-bold">Дубликаты названий:</span> {preview.duplicates.join(", ")}
            </p>
          ) : null}
          {preview.sample.length ? (
            <div>
              <p className="font-bold">Первые строки:</p>
              <ul className="list-disc pl-5 text-muted">
                {preview.sample.map((row) => (
                  <li key={row.name}>
                    {row.name} — {row.price} ₽, остаток {row.available}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-card border border-line p-4 text-sm" role="status">
          <p className="font-extrabold">Импорт применён</p>
          <p className="mt-1 text-muted">
            добавлено {result.added}, обновлено {result.updated}, обнулено {result.zeroed},
            пропущено {result.skipped}
            {result.duplicates.length ? `, дубликаты: ${result.duplicates.join(", ")}` : ""}
          </p>
        </div>
      ) : null}

      {fileName ? <p className="mt-3 text-xs text-muted">Файл: {fileName}</p> : null}
    </section>
  );
}
