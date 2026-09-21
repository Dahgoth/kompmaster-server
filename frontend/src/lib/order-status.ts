/**
 * Server-owned order statuses (R11): render every state as tint + text +
 * label — never color alone. Unknown statuses fall back to a neutral pill
 * with the raw server label (fail-visible, never fail-colorless).
 */

export interface OrderStatusStyle {
  label: string;
  bg: string;
  text: string;
}

export const ORDER_STATUSES: Record<string, OrderStatusStyle> = {
  "Формируется заказ": { label: "Формируется заказ", bg: "#fff1f8", text: "#a6005f" },
  "В пути": { label: "В пути", bg: "#edf9ff", text: "#00638a" },
  "Прибыл / готов к выдаче": { label: "Прибыл / готов к выдаче", bg: "#f2ffe9", text: "#3f7417" },
  "В пути к клиенту": { label: "В пути к клиенту", bg: "#f3efff", text: "#5d43b2" },
  "Завершён / выдан": { label: "Завершён / выдан", bg: "#eef1f3", text: "#45505a" },
  Отменён: { label: "Отменён", bg: "#f3efff", text: "#5d43b2" },
};

export function orderStatusStyle(status: string): OrderStatusStyle {
  return (
    ORDER_STATUS_MAP[status] ?? {
      label: status,
      bg: "#f8f8fb",
      text: "#45505a",
    }
  );
}

// Alias kept short for the map lookup above.
const ORDER_STATUS_MAP = ORDER_STATUSES;
