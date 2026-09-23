import { describe, expect, it } from "vitest";
import { orderStatusStyle } from "@/lib/order-status";

describe("orderStatusStyle (R11: tint + text + label, never color alone)", () => {
  it("maps every known backend status", () => {
    for (const status of [
      "Формируется заказ",
      "В пути",
      "Прибыл / готов к выдаче",
      "В пути к клиенту",
      "Завершён / выдан",
      "Отменён",
    ]) {
      const style = orderStatusStyle(status);
      expect(style.label).toBe(status);
      expect(style.bg).toMatch(/^#/);
      expect(style.text).toMatch(/^#/);
    }
  });

  it("falls back to a neutral pill with the raw server label for unknown statuses", () => {
    const style = orderStatusStyle("Новый статус из будущего");
    expect(style.label).toBe("Новый статус из будущего");
    expect(style.bg).toBe("#f8f8fb");
  });
});
