"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError, apiRequest } from "@/api/client";
import { z } from "zod";
import { queryKeys } from "@/api/categories";
import { orderSchema } from "@/api/schemas";
import { AdminShell } from "@/features/admin/AdminShell";
import { StatusPill } from "@/components/common/StatusPill";
import { ORDER_STATUSES } from "@/lib/order-status";
import { formatPrice } from "@/lib/format";

const PAGE_SIZE = 30;
const ALL = "all";

/**
 * /admin/orders: status filter + number search + status transitions.
 * Mirrors the backend's triple protection on every mutation (adminLimiter
 * first, requireRole admin|manager, requireAdminPanelSession). Cancel
 * restores stock server-side in a transaction; only admin (not manager) may
 * hard-delete an order — destructive path hidden behind a confirm + reason.
 */
const ordersListSchema = z.array(orderSchema);

export function AdminOrdersView({ role }: { role: "admin" | "manager" }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: queryKeys.adminOrders({
      status: status === ALL ? undefined : status,
      search: submittedSearch || undefined,
      page,
    }),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (status !== ALL) params.set("status", status);
      if (submittedSearch) params.set("search", submittedSearch);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      return apiRequest(ordersListSchema, "GET", `/orders?${params.toString()}`, {
        scope: "admin",
        signal,
      });
    },
    staleTime: 15_000,
  });

  function onError(err: unknown) {
    setError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
    queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders({}) });
  }

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) =>
      apiRequest(orderSchema, "PUT", `/orders/${encodeURIComponent(id)}/status`, {
        scope: "admin",
        body: { status: next },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
    onError,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiRequest(
        z.object({ ok: z.boolean() }),
        "POST",
        `/orders/${encodeURIComponent(id)}/cancel`,
        { scope: "admin", body: { reason: reason || undefined } },
      ),
    onSuccess: () => {
      setCancelTarget(null);
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders({}) });
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(z.object({ ok: z.boolean() }), "DELETE", `/orders/${encodeURIComponent(id)}`, {
        scope: "admin",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
    onError,
  });

  function onSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedSearch(search.trim());
    setPage(1);
  }

  return (
    <AdminShell active="/admin/orders">
      <div className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-btn bg-soft p-3 text-sm font-bold">
            {error}
          </p>
        ) : null}

        <form
          onSubmit={onSearch}
          className="flex flex-wrap gap-2"
          role="search"
          aria-label="Поиск заказов"
        >
          <label className="sr-only" htmlFor="admin-order-search">
            Номер заказа
          </label>
          <input
            id="admin-order-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Номер заказа"
            className="h-12 w-full max-w-xs rounded-btn border border-line bg-white px-3 text-sm focus:border-pink"
          />
          <label className="sr-only" htmlFor="admin-order-status">
            Статус
          </label>
          <select
            id="admin-order-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-12 rounded-btn border border-line bg-white px-3 text-sm font-bold focus:border-pink"
          >
            <option value={ALL}>Все статусы</option>
            {Object.keys(ORDER_STATUSES).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
            Не удалось загрузить заказы.{" "}
            <button type="button" onClick={() => list.refetch()} className="font-bold underline">
              Повторить
            </button>
          </p>
        ) : list.data && list.data.length ? (
          <ul className="space-y-3">
            {list.data.map((order) => (
              <li
                key={order.id}
                className="space-y-3 rounded-card border border-line bg-white p-4 shadow-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-extrabold">Заказ №{order.number}</p>
                    <p className="text-sm text-muted tabular-nums">
                      {formatPrice(order.total)} · {order.contact_phone ?? "без телефона"}
                    </p>
                  </div>
                  <StatusPill status={order.status} />
                </div>

                <ul className="space-y-1 text-sm text-muted">
                  {order.items.map((item) => (
                    <li key={item.productId}>
                      {item.name} × {item.qty}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`status-${order.id}`}>
                    Новый статус заказа №{order.number}
                  </label>
                  <select
                    id={`status-${order.id}`}
                    defaultValue={order.status}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (next !== order.status) {
                        statusMutation.mutate({ id: order.id, next });
                      }
                    }}
                    disabled={statusMutation.isPending}
                    className="h-11 rounded-btn border border-line bg-white px-3 text-sm font-bold"
                  >
                    {Object.keys(ORDER_STATUSES).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setCancelTarget(order.id)}
                    className="h-11 rounded-btn border border-line bg-white px-4 text-sm font-extrabold hover:bg-soft"
                  >
                    Отменить
                  </button>
                  {role === "admin" ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Удалить заказ №${order.number} полностью? Остатки уже учтены отменой — удаление стирает историю.`,
                          )
                        ) {
                          deleteMutation.mutate(order.id);
                        }
                      }}
                      className="h-11 rounded-btn border border-line px-4 text-sm font-bold text-muted underline hover:text-ink"
                    >
                      Удалить
                    </button>
                  ) : null}
                </div>

                {cancelTarget === order.id ? (
                  <form
                    className="flex flex-wrap items-center gap-2 rounded-btn bg-soft p-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      cancelMutation.mutate({
                        id: order.id,
                        reason: cancelReason.trim() || undefined,
                      });
                    }}
                  >
                    <label className="sr-only" htmlFor={`cancel-reason-${order.id}`}>
                      Причина отмены
                    </label>
                    <input
                      id={`cancel-reason-${order.id}`}
                      type="text"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Причина отмены (опционально)"
                      className="h-11 min-w-52 flex-1 rounded-btn border border-line bg-white px-3 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={cancelMutation.isPending}
                      className="h-11 rounded-btn bg-pink px-4 text-sm font-extrabold text-white disabled:opacity-60"
                    >
                      {cancelMutation.isPending ? "Отменяем…" : "Подтвердить отмену"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCancelTarget(null);
                        setCancelReason("");
                      }}
                      className="h-11 rounded-btn px-3 text-sm font-bold underline"
                    >
                      Закрыть
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-card border border-line bg-white p-6 text-sm text-muted shadow-card">
            Заказы не найдены.
          </p>
        )}

        {list.data ? (
          <div className="flex gap-2">
            <PagerButton
              label="Назад"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            />
            <span className="flex h-11 items-center px-2 text-sm text-muted tabular-nums">
              Стр. {page}
            </span>
            <PagerButton
              label="Вперёд"
              disabled={(list.data?.length ?? 0) < PAGE_SIZE}
              onClick={() => setPage((p) => p + 1)}
            />
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-11 rounded-btn border border-line bg-white px-4 text-sm font-extrabold hover:bg-soft disabled:opacity-50"
    >
      {label}
    </button>
  );
}
