"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError, apiRequest } from "@/api/client";
import { z } from "zod";
import { AdminShell } from "@/features/admin/AdminShell";
import { formatDateTime } from "@/lib/format";

/**
 * /admin/users: search by login/display_name, role changes. Every change is
 * written to audit_log by the backend; the confirmation copy says so.
 */
const adminUserSchema = z.object({
  id: z.string(),
  login: z.string(),
  display_name: z.string().nullable(),
  role: z.enum(["user", "manager", "admin"]),
  created_at: z.string(),
  orders_count: z.coerce.number().int(),
});

type AdminUser = z.infer<typeof adminUserSchema>;

export function AdminUsersView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-users", submittedSearch],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (submittedSearch) params.set("search", submittedSearch);
      return apiRequest(z.array(adminUserSchema), "GET", `/users?${params.toString()}`, {
        scope: "admin",
        signal,
      });
    },
    staleTime: 30_000,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiRequest(
        z.object({ id: z.string(), login: z.string(), role: z.string() }),
        "PUT",
        `/users/${encodeURIComponent(id)}/role`,
        { scope: "admin", body: { role } },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
    },
  });

  function onSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedSearch(search.trim());
  }

  return (
    <AdminShell active="/admin/users">
      <div className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-btn bg-soft p-3 text-sm font-bold">
            {error}
          </p>
        ) : null}

        <form
          onSubmit={onSearch}
          className="flex gap-2"
          role="search"
          aria-label="Поиск пользователей"
        >
          <label className="sr-only" htmlFor="admin-user-search">
            Логин или имя
          </label>
          <input
            id="admin-user-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Логин или имя"
            className="h-12 w-full max-w-xs rounded-btn border border-line bg-white px-3 text-sm focus:border-pink"
          />
          <button
            type="submit"
            className="h-12 rounded-btn border border-line bg-white px-4 text-sm font-extrabold hover:bg-soft"
          >
            Найти
          </button>
        </form>

        {list.isLoading ? (
          <div className="h-32 animate-pulse rounded-card bg-soft" aria-busy="true" />
        ) : list.isError ? (
          <p
            role="alert"
            className="rounded-card border border-line bg-white p-6 text-sm text-muted shadow-card"
          >
            Не удалось загрузить пользователей.{" "}
            <button type="button" onClick={() => list.refetch()} className="font-bold underline">
              Повторить
            </button>
          </p>
        ) : list.data && list.data.length ? (
          <ul className="divide-y divide-line rounded-panel border border-line bg-white shadow-card">
            {list.data.map((entry) => (
              <UserRow
                key={entry.id}
                entry={entry}
                busy={roleMutation.isPending}
                onChange={(role) => {
                  if (
                    window.confirm(
                      `Изменить роль ${entry.login} на «${role}»? Изменение записывается в журнал аудита.`,
                    )
                  ) {
                    roleMutation.mutate({ id: entry.id, role });
                  }
                }}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-card border border-line bg-white p-6 text-sm text-muted shadow-card">
            Пользователи не найдены.
          </p>
        )}
      </div>
    </AdminShell>
  );
}

function UserRow({
  entry,
  busy,
  onChange,
}: {
  entry: AdminUser;
  busy: boolean;
  onChange: (role: string) => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
      <div className="min-w-0">
        <p className="truncate font-bold">
          {entry.display_name || entry.login}
          <span className="ml-2 font-normal text-muted">{entry.login}</span>
        </p>
        <p className="text-muted tabular-nums">
          заказов: {entry.orders_count} · с {formatDateTime(entry.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`role-${entry.id}`}>
          Роль пользователя {entry.login}
        </label>
        <select
          id={`role-${entry.id}`}
          defaultValue={entry.role}
          disabled={busy}
          onChange={(e) => {
            if (e.target.value !== entry.role) onChange(e.target.value);
          }}
          className="h-11 rounded-btn border border-line bg-white px-3 text-sm font-bold"
        >
          <option value="user">Покупатель</option>
          <option value="manager">Менеджер</option>
          <option value="admin">Администратор</option>
        </select>
      </div>
    </li>
  );
}
