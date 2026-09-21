"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMyOrder } from "@/api/orders";
import { StatusPill } from "@/components/common/StatusPill";
import { formatDateTime, formatPrice } from "@/lib/format";
import { useAuth } from "@/features/auth/context";

export function OrderDetailView({ orderId }: { orderId: string }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) {
      router.replace(`/auth?redirect=/order/${encodeURIComponent(orderId)}`);
    }
  }, [ready, user, orderId, router]);

  const query = useQuery({
    queryKey: ["order", orderId],
    queryFn: ({ signal }) => fetchMyOrder(orderId, { signal }),
    enabled: !!user,
    staleTime: 15_000,
  });

  if (!ready || !user) return null;

  if (query.isLoading) {
    return (
      <div
        className="h-48 animate-pulse rounded-panel border border-line bg-white"
        aria-busy="true"
      />
    );
  }

  if (query.isError || !query.data) {
    return (
      <p
        role="alert"
        className="rounded-panel border border-line bg-white p-6 text-muted shadow-card"
      >
        Заказ не найден — возможно, он принадлежит другому аккаунту.{" "}
        <button type="button" onClick={() => query.refetch()} className="font-bold underline">
          Повторить
        </button>
      </p>
    );
  }

  const order = query.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-white p-6 shadow-card">
        <div>
          <p className="text-lg font-extrabold">Заказ №{order.number}</p>
          <p className="text-sm text-muted">Оформлен {formatDateTime(order.created_at)}</p>
        </div>
        <StatusPill status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3 rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="text-lg font-extrabold">Состав заказа</h2>
          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li
                key={item.productId}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <span className="min-w-0 truncate">
                  {item.name}
                  <span className="text-muted"> × {item.qty}</span>
                </span>
                <span className="shrink-0 font-bold tabular-nums">
                  {formatPrice(item.price * item.qty)}
                </span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t border-line pt-3 text-base font-extrabold">
            Итого
            <span className="tabular-nums">{formatPrice(order.total)}</span>
          </p>
          {order.cancel_reason ? (
            <p className="rounded-btn bg-soft p-3 text-sm">
              <span className="font-bold">Причина отмены:</span> {order.cancel_reason}
            </p>
          ) : null}
        </div>

        <aside className="h-fit space-y-4 rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="text-lg font-extrabold">Получение</h2>
          <p className="text-sm">
            <span className="block font-bold">
              {order.receive_method === "delivery" ? "Доставка" : "Самовывоз"}
            </span>
            {order.address ? <span className="block text-muted">{order.address}</span> : null}
            {order.contact_phone ? (
              <span className="block text-muted">{order.contact_phone}</span>
            ) : null}
          </p>
          <h2 className="text-lg font-extrabold">История</h2>
          <ol className="space-y-3">
            {order.history.map((entry) => (
              <li key={entry.id} className="border-l-2 border-line pl-3 text-sm">
                <p className="font-bold">{entry.text}</p>
                <p className="text-muted">{formatDateTime(entry.created_at)}</p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
