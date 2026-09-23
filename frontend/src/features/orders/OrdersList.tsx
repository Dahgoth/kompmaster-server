"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchMyOrders } from "@/api/orders";
import { queryKeys } from "@/api/categories";
import { StatusPill } from "@/components/common/StatusPill";
import { formatPrice } from "@/lib/format";
import { useAuth } from "@/features/auth/context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function OrdersList() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) {
      router.replace("/auth?redirect=/orders");
    }
  }, [ready, user, router]);

  const query = useQuery({
    queryKey: queryKeys.ordersMine,
    queryFn: ({ signal }) => fetchMyOrders({ signal }),
    enabled: !!user,
    staleTime: 15_000,
  });

  if (!ready || !user) return null;

  return (
    <div className="space-y-4">
      {query.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card border border-line bg-white" />
          ))}
        </div>
      ) : query.isError ? (
        <p
          role="alert"
          className="rounded-card border border-line bg-white p-6 text-muted shadow-card"
        >
          {query.error instanceof Error ? query.error.message : "Не удалось загрузить заказы."}{" "}
          <button type="button" onClick={() => query.refetch()} className="font-bold underline">
            Повторить
          </button>
        </p>
      ) : query.data && query.data.length ? (
        <ul className="space-y-3">
          {query.data.map((order) => (
            <li key={order.id}>
              <Link
                href={`/order/${encodeURIComponent(order.id)}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white p-4 shadow-card hover:shadow-lift"
              >
                <div>
                  <p className="font-extrabold">Заказ №{order.number}</p>
                  <p className="text-sm text-muted tabular-nums">
                    {formatPrice(order.total)} · {order.items.length} поз.
                  </p>
                </div>
                <StatusPill status={order.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-panel border border-line bg-white p-6 text-muted shadow-card">
          Заказов пока нет.{" "}
          <Link href="/catalog" className="font-bold underline">
            Начните с каталога
          </Link>
          .
        </p>
      )}
    </div>
  );
}
