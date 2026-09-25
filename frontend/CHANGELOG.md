# Changelog

## [2.2.0](https://github.com/Dahgoth/kompmaster-server/compare/kompmaster-frontend-v2.1.1...kompmaster-frontend-v2.2.0) (2026-09-25)


### Features

* **frontend:** admin categories, users and reviews (plan phase 4b) ([f02346e](https://github.com/Dahgoth/kompmaster-server/commit/f02346e7747495d66f2dfb496c1ae68a7a5b3cf1))
* **frontend:** admin login, shell and product management (plan phase 4a) ([447be97](https://github.com/Dahgoth/kompmaster-server/commit/447be9749dd936c31ab44422c0d4c6d46b6773b5))
* **frontend:** admin orders with status, cancel and delete (plan phase 4a) ([5239989](https://github.com/Dahgoth/kompmaster-server/commit/52399898d3781bd493f8549f1d9f8bb6f9363232))
* **frontend:** auth pages with working password reset (plan phase 3) ([eb557cc](https://github.com/Dahgoth/kompmaster-server/commit/eb557ccf6d73b003b7082e61513022a6d9fb5abe))
* **frontend:** cart, checkout and orders flow (plan phase 3b) ([5355325](https://github.com/Dahgoth/kompmaster-server/commit/535532558bf447656728ef6f388cec2b33bfecee))
* **frontend:** catalog read path with SEO surface (plan phase 3) ([a784b18](https://github.com/Dahgoth/kompmaster-server/commit/a784b18c71906fcb29e44c3c8817e265871a5214))
* **frontend:** content editor and public pages (plan phase 4c) ([1a52c14](https://github.com/Dahgoth/kompmaster-server/commit/1a52c14a331ce3285caca4e20bf12b7ab19b7cf7))
* **frontend:** dry-run-first price import in admin products (plan R9) ([7d1f850](https://github.com/Dahgoth/kompmaster-server/commit/7d1f85099553b409149728320abb27298f16231e))
* **frontend:** profile, reviews, and two blocking bugs (plan phase 3c) ([0f10394](https://github.com/Dahgoth/kompmaster-server/commit/0f103943b961bd61dafbc41f34cf8eacdd854cc5))
* **frontend:** scaffold Next.js SSR storefront per ADR 007 phase 1 ([6322eec](https://github.com/Dahgoth/kompmaster-server/commit/6322eec10ffd3fb364ba436626faf070b862e67a))
* **frontend:** static content pages with FAQPage structured data ([f6a909d](https://github.com/Dahgoth/kompmaster-server/commit/f6a909d8ab87b158e6cec03f7e807d35ef11c5a4))
* **frontend:** tier A E2E matrix with MSW fixtures and a11y gate (plan phase 5) ([823d289](https://github.com/Dahgoth/kompmaster-server/commit/823d2891f26e8e72fdad34be2f40a07b4eefa775))
* **frontend:** typed API layer with Zod schemas and TanStack Query ([5e2c4a3](https://github.com/Dahgoth/kompmaster-server/commit/5e2c4a30b784168b7bc50e559d60bac81a9f685d))
* **frontend:** v2 Next.js storefront rebuild, review fixes, and dev-stack pinning ([#35](https://github.com/Dahgoth/kompmaster-server/issues/35)) ([061032c](https://github.com/Dahgoth/kompmaster-server/commit/061032cbfc47ed31171b8b081b12462627fa6d15))
* **release:** v2.0.0 + Blue/Green deploy + automated GitHub Deployment + AGENTS.md methodology ([#36](https://github.com/Dahgoth/kompmaster-server/issues/36)) ([8b0f6c2](https://github.com/Dahgoth/kompmaster-server/commit/8b0f6c2c98344b4813ece72b78ca82efde2ee88e))
* **release:** v2.0.0 version bump + Blue/Green deploy + automated GitHub Deployment ([cf50075](https://github.com/Dahgoth/kompmaster-server/commit/cf50075b3335b7fbce769982e8dd69367d4cb59b))
* **storefront:** deploy pipeline (rsync+PM2+health gate) + RAM measurement ([eb64eee](https://github.com/Dahgoth/kompmaster-server/commit/eb64eeec0ce82c7f912d34cbacd52b79ff521f84))
* **terraform:** Option B infrastructure — S3+CDN storefront, API-only VPS ([#19](https://github.com/Dahgoth/kompmaster-server/issues/19)) ([4410ed0](https://github.com/Dahgoth/kompmaster-server/commit/4410ed020db660fffd44e25ae48a10b84dd25a52))
* **terraform:** serve storefront from S3 + CDN, API-only VPS (Option B) ([23247ca](https://github.com/Dahgoth/kompmaster-server/commit/23247cac691b773d766995762c18b9427aab9a02))
* **tooling:** add ESLint and Prettier with CI lint gates ([a773446](https://github.com/Dahgoth/kompmaster-server/commit/a77344673a67b94f709d6afdf452ff8ee564b997))
* **tooling:** add ESLint and Prettier with CI lint gates ([#28](https://github.com/Dahgoth/kompmaster-server/issues/28)) ([4589a9a](https://github.com/Dahgoth/kompmaster-server/commit/4589a9abb82e22c027a11ce41738336debb1a25e))


### Bug Fixes

* address all PR review comments ([ef75ba8](https://github.com/Dahgoth/kompmaster-server/commit/ef75ba8b86e912a26d46fc764a7474b53295bf6d))
* **backend:** correct slug transliteration and guarantee slug uniqueness ([efb26af](https://github.com/Dahgoth/kompmaster-server/commit/efb26af138f9e0d084a590ae90c14cb50f487645))
* **ci:** migrate to googleapis/release-please-action@v5; fix pnpm; Node 24 ([#62](https://github.com/Dahgoth/kompmaster-server/issues/62)) ([95c568f](https://github.com/Dahgoth/kompmaster-server/commit/95c568fb80ec9dfdfe337140c7e29a4941f0872f))
* **ci:** replace third-party actions with GitHub built-ins + fix action pinning ([#58](https://github.com/Dahgoth/kompmaster-server/issues/58)) ([e9769e3](https://github.com/Dahgoth/kompmaster-server/commit/e9769e390146f6eda41e18648050232cf74535fe))
* **ci:** skip release-please PRs in CI; add version:sync to release workflow; update branch protection ([#60](https://github.com/Dahgoth/kompmaster-server/issues/60)) ([2c57658](https://github.com/Dahgoth/kompmaster-server/commit/2c57658e9b6d81c8c15a35a63545bfd2747d5c35))
* **frontend:** admin products list uses the real X-Total-Count ([7ba31cb](https://github.com/Dahgoth/kompmaster-server/commit/7ba31cb76e719068785be3747e767b4e4cceb2c5))
* **frontend:** block attribute injection in the content-page markdown renderer ([51b11ed](https://github.com/Dahgoth/kompmaster-server/commit/51b11ed8b2db30b13ae8e245b7ff1208a9113705))
* **frontend:** fix vitest root for hoisted layout ([ac1dfa9](https://github.com/Dahgoth/kompmaster-server/commit/ac1dfa9f1ff7e0acecbdbf980c4ddc2101b31dc5))
* **frontend:** replace regex router with segment matcher ([0d59e15](https://github.com/Dahgoth/kompmaster-server/commit/0d59e15832ad950603a7acabee7e8b6c113a1f48))
* **frontend:** single-source contact data and drop fabricated placeholders ([be24ade](https://github.com/Dahgoth/kompmaster-server/commit/be24ade1d2fba376655bc97507ef521c258dced2))
* **frontend:** sitemap cap counts products only, admin keys via queryKeys factory ([2afa781](https://github.com/Dahgoth/kompmaster-server/commit/2afa7812face6a2b74d01904d0957d775801f6e6))
