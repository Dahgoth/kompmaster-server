import { contacts } from "@/lib/content";

export const NAV_LINKS = [
  { href: "/catalog", label: "Каталог" },
  { href: "/about", label: "О нас" },
  { href: "/faq", label: "Вопросы" },
  { href: "/contacts", label: "Контакты" },
] as const;

/**
 * Brand/identity constants. Contact data lives in `lib/content.ts` (ported
 * verbatim from the v1 storefront) and is re-exported here so there is exactly
 * one owner — a second hardcoded copy previously drifted, shipping a wrong
 * Telegram handle on the payment page and a fabricated phone number in the
 * global footer.
 *
 * `phone` is empty in the v1 source on purpose: the shop contacts customers
 * through Telegram. Renderers must hide the phone block when it is empty
 * rather than showing a placeholder.
 */
export const BRAND = {
  name: "КомпМастер",
  tagline: "Восстановленная электроника с гарантией",
  phone: contacts.phone,
  phoneHref: contacts.phone ? `tel:${contacts.phone.replace(/[^\d+]/g, "")}` : "",
  telegram: contacts.telegramLink,
  telegramHandle: contacts.telegram,
  address: contacts.address,
  email: contacts.email,
  workTime: contacts.workTime,
} as const;
