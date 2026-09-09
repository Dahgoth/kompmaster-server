# DESIGN.md

This document is the UX/UI contract for the KompMaster storefront. The front
end lives in a single file, `public/index.html`, and is served directly by the
backend. Any change to visuals, layout, motion, or voice must keep this
document in sync (see `CONTRIBUTING.md`).

## Overview

**A soft, light-first storefront for a PC-parts shop, not a generic dashboard.**
The surface is white and rounded, with a single neon brand gradient that runs
pink → violet → cyan → lime. Color is load-bearing but never the only signal;
hierarchy comes from borders, surface tints, and type weight. The aesthetic is
friendly and retail: generous rounding, subtle lift on hover, and compact,
readable copy in Russian.

Three rules ground every screen:

1. **Build hierarchy with white surfaces and hairlines.** The app canvas is
   `--bg` (white). Cards and chrome are white with a 1px `--line` border and a
   soft shadow. There are no gray "boxes" — depth comes from border + shadow +
   a single lifted hover state.
2. **One neon primary per surface.** The brand gradient and `--pink` are
   reserved for the primary CTA and deliberate brand moments. Use `--pink` for
   one action per surface; everything else is neutral.
3. **Status color is paired with a label.** Order statuses, cart badge, and
   other semantic states always combine a tinted background, colored text, and
   a text label — never color alone.

## Color

### Surfaces and text

| Token       | Value      | Role                                          |
| ----------- | ---------- | --------------------------------------------- |
| `--bg`      | `#ffffff`  | App canvas                                    |
| `--soft`    | `#f8f8fb`  | Recessed/neutral fills (ghost buttons, chips) |
| `--ink`     | `#111114`  | Primary text                                  |
| `--muted`   | `#71717a`  | Secondary text, metadata, empty states        |
| `--line`    | `#dedee5`  | Standard 1px borders                          |

Do not introduce solid gray fills. Use `--soft` for neutral fills and `--line`
for boundaries. Hover states deepen `--line` toward `#bebec7`/`#c8c8d0` and add
a small shadow rather than changing fill.

### Brand and accents

| Token       | Value      | Role                                          |
| ----------- | ---------- | --------------------------------------------- |
| `--pink`    | `#ff18a8`  | Primary action, brand highlight, cart badge   |
| `--violet`  | `#7a5cff`  | Brand gradient stop, secondary emphasis       |
| `--cyan`    | `#0ccdf1`  | Brand gradient stop, link/info accent         |
| `--lime`    | `#8fe24b`  | Brand gradient stop, success accent           |

The **brand gradient** is `linear-gradient(90deg, #ff18a8, #a748ff 28%, #0ccdf1 58%, #8fe24b)`.
Use it for the hero border, splash, and logo/identity moments. The **primary
button** is `linear-gradient(100deg, #ff18a8, #f31191 45%, #a748ff)` with white
text and a `rgba(255,24,168,.18)` shadow.

Accents are a fixed set: do not invent new hues. `--pink` is the only primary
action color. `--cyan`, `--lime`, and `--violet` are brand/semantic accents,
not alternate button backgrounds.

### Status colors

Order statuses use a tinted pill (pastel background + saturated text). The
existing mappings are:

| Status (label)            | Background  | Text       |
| ------------------------- | ----------- | ---------- |
| Формируется заказ         | `#fff1f8`   | `#a6005f`  |
| В пути                    | `#edf9ff`   | `#00638a`  |
| Прибыл / готов к выдаче   | `#f2ffe9`   | `#3f7417`  |
| В пути к клиенту          | `#f3efff`   | `#5d43b2`  |
| Завершён / выдан          | `#eef1f3`   | `#45505a`  |

Keep tint + text + a text label together. New statuses must add a matching
pair here, not a one-off color.

## Typography

Use **Inter** with the system fallback
(`Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`).
Do not introduce another family.

- Body copy is `14–17px` with `line-height: 1.5–1.7`.
- Buttons and controls are `font-weight: 800` (extra-bold) with sentence case.
- Section titles use bold weights (`700–850`); brand numbers use `850`.
- Use `tabular-nums` for prices and quantities in columns.
- Product copy, labels, and errors are written in **Russian**.

## Layout and spacing

- Page content is centered in a readable column with comfortable padding.
- Cards use internal padding of `18–28px`; use `gap` over ad hoc margins.
- The header is sticky with a translucent white background
  (`rgba(255,255,255,.92)`) and `backdrop-filter: blur(18px)`.
- Prefer `gap` and consistent section spacing over arbitrary margins.

## Shape

Round corners generously — this is a soft retail surface, not a dense tool.

| Radius | Usage                                              |
| ------ | -------------------------------------------------- |
| `12px` | Inputs, quantity steppers, delivery options        |
| `14px` | Buttons, search, radio cards                       |
| `16px` | Product rows, cart rows, FAQ items, notices        |
| `18px` | Category cards, order cards, nav                   |
| `20px` | Form blocks, order summary                         |
| `24px` | Section cards, hero banner, modals, payment card   |
| `999px`| Status pills, badges, cart count, contact pill     |

Do not introduce one-off radii. Pills (`999px`) are for statuses and badges.

## Components and interaction

- **Buttons.** Primary: pink gradient, white text, `height: 52px`, `radius: 14px`,
  `font-weight: 800`. Outline: white, `--line` border. Ghost: `--soft` fill.
  One primary per surface.
- **Cards.** White, 1px `--line` border, `16–24px` radius, subtle shadow
  (`0 12px 35px rgba(17,17,20,.035)`). Hover lifts with `translateY(-3px)` and a
  slightly darker border — never a color fill.
- **Inputs.** White, 1px `--line` border, `12–14px` radius, visible label.
  Focus is a visible ring/outline change, never removed.
- **Status pills.** Full radius, `font-size: 12px`, `font-weight: 800`, tint +
  text + label (see status table).
- **Drawer / modal.** White surfaces with `24px` radius, a backdrop
  (`rgba(17,17,20,.25–.28)`), and a slide/fade transition. Close affordances
  are visible and keyboard-accessible.
- **Quantity stepper.** Bordered inline control with `36×38px` buttons.

Every interactive element must handle default, hover, focus-visible, active,
disabled, loading, and error states where relevant. Required actions must not
depend on hover; keep touch targets at least `44px`.

## Motion

Transitions are short and functional: `200–300ms` ease for hovers, drawer
slide, and modal fade. Use `transform` and `opacity`, not layout properties.
Respect `prefers-reduced-motion`.

## Voice

Product copy is clear, friendly, and in Russian. Buttons use concrete
verb + object (`Оформить заказ`, `Добавить в корзину`). Errors state what
happened and what to do next. No hype, no jokes in errors, and no emoji in
product chrome.

## Do and don't

**Do**

- Use the tokens in this document; prefer them over raw hex values.
- Keep one pink primary action per surface.
- Pair status color with a text label.
- Use the fixed accent set (pink / violet / cyan / lime).
- Preserve keyboard, screen-reader, reduced-motion, touch, and responsive
  behavior.

**Don't**

- Introduce gray card fills or dark surfaces.
- Use multiple pink primary buttons on one surface.
- Invent new brand hues or one-off radii.
- Depend on color alone to convey state.
- Use monospace or another font family for UI copy.
- Add casual/bouncy animation.
