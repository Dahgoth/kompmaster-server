/**
 * Payment configuration defaults — extracted from seed.json
 * Per ADR-002, external payment providers (Stripe, ЮKassa, Telegram Payments)
 * are DEFERRED. Manual payment mode is the only option for the PoC.
 */

export const paymentSettings = {
  mode: "manual",
  managerTelegram: "mastercompone",
  fallbackToManual: true,
  manualPageText:
    "Мы подключаем платёжную систему. Чтобы завершить покупку, свяжитесь с нашим менеджером — он подтвердит способ оплаты и дальнейшее оформление заказа.",
  managerMessageTemplate:
    "Здравствуйте! Хочу оформить заказ №{order}.\n\nТовары:\n{items}\n\nСумма: {total}\nПолучение: {receive}",
  activeIntegrationId: "",
  integrations: [],
};

export const paymentMethods = [
  {
    id: "manual",
    label: "Связаться с менеджером (Telegram)",
    description: "Оплата through Telegram after order confirmation",
    available: true,
  },
];

export const paymentStatuses = {
  pending: "Ожидает оплаты",
  paid: "Оплачен",
  manual: "Ожидает подтверждения",
  cancelled: "Отменён",
};

export const orderStatuses = [
  { value: "new", label: "Формируется заказ" },
  { value: "en_route", label: "В пути" },
  { value: "arrived", label: "Прибыл / готов к выдаче" },
  { value: "out_for_delivery", label: "В пути к клиенту" },
  { value: "completed", label: "Завершён / выдан" },
  { value: "cancelled", label: "Отменён" },
];
