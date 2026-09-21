import { orderStatusStyle } from "@/lib/order-status";

/** R11: tint + text + label — status is never conveyed by color alone. */
export function StatusPill({ status }: { status: string }) {
  const style = orderStatusStyle(status);
  return (
    <span
      className="inline-block w-fit rounded-full px-3 py-1 text-xs font-extrabold"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}
