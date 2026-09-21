# DESIGN.md

> **Regeneration pending (2026-09-21, ADR 006/007):** the storefront is being
> rebuilt from scratch as a self-hosted Next.js SSR/ISR app
> (`docs/frontend-v2-plan.md`). This file is **not** an input to the rebuild —
> the visual language is defined by the `@theme` tokens in
> `frontend/src/app/globals.css` and will be **regenerated from the
> implemented v2 UI** once the storefront pages are complete (plan phase 3 in
> progress: catalog read path, header/footer shell, cards, pagination, search
> form, auth forms), per ADR 001 §1a. The rules below remain binding
> regardless of styling; the previous full contract (colors, typography,
> shape tables) is preserved in git history.

This document will again become the UX/UI contract for the KompMaster
storefront once the v2 implementation is complete and this file is rewritten
from it. Any change to visuals, layout, motion, or voice must keep this
document in sync (see `CONTRIBUTING.md`; the docs-in-sync tooling enforces
this on frontend changes).

## Interim binding rules (carry over from the previous contract)

1. **Soft retail surface.** White canvas, hairline borders, elevation from
   border + shadow — never gray fills or dark surfaces.
2. **One primary action per surface.** A single accent-colored CTA per view;
   everything else neutral.
3. **Status color is always paired with a label.** Order states render as
   tint + text + label — never color alone.
4. **Russian voice.** Product copy, labels, and errors in Russian; buttons
   use concrete verb + object; no hype in errors; no emoji in product chrome.
5. **Accessibility floor.** Visible focus, keyboard-operable dialogs and
   drawers, 44px touch targets, `prefers-reduced-motion` respected, every
   interactive element handles default/hover/focus-visible/active/disabled/
   loading/error states where relevant.
6. **Motion is functional.** 200–300ms ease for hovers/drawer/modal,
   `transform`/`opacity` only.

Token values live in `frontend/src/app/globals.css` (`@theme`); the current
token set mirrors the original brand (white surfaces, hairline borders, the
pink→violet→cyan→lime identity gradient) but is defined there, not here.

## Code style

This document governs the visual contract above, not code formatting. Code
formatting is enforced by Prettier and ESLint at the workspace root — see
`DEVELOPMENT.md` §Linting and formatting. Formatting-only commits must not
change rendered markup, styling, or behavior; visually meaningful changes
must follow the contract above and be documented here.
