# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0](https://github.com/Dahgoth/kompmaster-server/compare/kompmaster-v2.1.1...kompmaster-v2.2.0) (2026-09-25)


### Features

* **backend:** implement complete server API with PostgreSQL and S3 storage ([db67caa](https://github.com/Dahgoth/kompmaster-server/commit/db67caa055f1e7478ae7551e023d0a0226f11e96))
* **backend:** product slugs, content pages, telemetry sink (ADR 007) ([ba44acd](https://github.com/Dahgoth/kompmaster-server/commit/ba44acdbd3eb5fc38e00f5df58e01b068f218b9d))
* **backup:** encrypt dumps and upload to a dedicated offsite bucket (ADR-005) ([6119cf2](https://github.com/Dahgoth/kompmaster-server/commit/6119cf229c08712bdce1ed84a39c36aa90afa633))
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
* **infra:** dual-stack IPv4/IPv6 + operational docs ([f9dcfee](https://github.com/Dahgoth/kompmaster-server/commit/f9dcfeea610fcd166f4633538b23f10fdc1efdd8))
* **infra:** dual-stack IPv4/IPv6 + operational docs ([#34](https://github.com/Dahgoth/kompmaster-server/issues/34)) ([dbc0858](https://github.com/Dahgoth/kompmaster-server/commit/dbc0858e56a89d8b12701dfe87156b6998f78ea2))
* **release:** re-enable release-please workflow ([e568856](https://github.com/Dahgoth/kompmaster-server/commit/e568856b690292f152803f2f82f953c98b0eaba0))
* **release:** re-enable release-please workflow ([#50](https://github.com/Dahgoth/kompmaster-server/issues/50)) ([fb01907](https://github.com/Dahgoth/kompmaster-server/commit/fb01907cfb7b8ac468cb3e6ca2ca048cfdb116b5))
* **release:** v2.0.0 + Blue/Green deploy + automated GitHub Deployment + AGENTS.md methodology ([#36](https://github.com/Dahgoth/kompmaster-server/issues/36)) ([8b0f6c2](https://github.com/Dahgoth/kompmaster-server/commit/8b0f6c2c98344b4813ece72b78ca82efde2ee88e))
* **release:** v2.0.0 version bump + Blue/Green deploy + automated GitHub Deployment ([cf50075](https://github.com/Dahgoth/kompmaster-server/commit/cf50075b3335b7fbce769982e8dd69367d4cb59b))
* **storefront:** deploy pipeline (rsync+PM2+health gate) + RAM measurement ([eb64eee](https://github.com/Dahgoth/kompmaster-server/commit/eb64eeec0ce82c7f912d34cbacd52b79ff521f84))
* **terraform:** Option B infrastructure — S3+CDN storefront, API-only VPS ([#19](https://github.com/Dahgoth/kompmaster-server/issues/19)) ([4410ed0](https://github.com/Dahgoth/kompmaster-server/commit/4410ed020db660fffd44e25ae48a10b84dd25a52))
* **terraform:** scaffold PoC infrastructure on Timeweb Cloud ([28d0faf](https://github.com/Dahgoth/kompmaster-server/commit/28d0faf6d5f3cb4af7194ed3d58c8e90d073a824))
* **terraform:** serve storefront from S3 + CDN, API-only VPS (Option B) ([23247ca](https://github.com/Dahgoth/kompmaster-server/commit/23247cac691b773d766995762c18b9427aab9a02))
* **tooling:** add ESLint and Prettier with CI lint gates ([a773446](https://github.com/Dahgoth/kompmaster-server/commit/a77344673a67b94f709d6afdf452ff8ee564b997))
* **tooling:** add ESLint and Prettier with CI lint gates ([#28](https://github.com/Dahgoth/kompmaster-server/issues/28)) ([4589a9a](https://github.com/Dahgoth/kompmaster-server/commit/4589a9abb82e22c027a11ce41738336debb1a25e))


### Bug Fixes

* address all PR review comments ([841b7e6](https://github.com/Dahgoth/kompmaster-server/commit/841b7e6667e3aeb84a6267b1fee5ee032f6169a1))
* address all PR review comments ([ef75ba8](https://github.com/Dahgoth/kompmaster-server/commit/ef75ba8b86e912a26d46fc764a7474b53295bf6d))
* address fresh PR review comments ([9d17efe](https://github.com/Dahgoth/kompmaster-server/commit/9d17efea3529662a540efc9713b9c8f56601cffa))
* address PR review comments ([bbd258f](https://github.com/Dahgoth/kompmaster-server/commit/bbd258fecaaf661c8574150509ea15a99ba8ef62))
* address remaining PR review comments ([3b79277](https://github.com/Dahgoth/kompmaster-server/commit/3b792774352303f5b3b06f295524e287270ea781))
* **ADR-008:** fix duplicate Alternatives section + missing numbered item ([99b1218](https://github.com/Dahgoth/kompmaster-server/commit/99b12187536f3ee62437faf27712c1d1233b0591))
* **advisoryLock:** pass bigint string through, add empty rows guard ([12cca22](https://github.com/Dahgoth/kompmaster-server/commit/12cca220e716623014c316379521021479d57ffb))
* **api:** close uuid 22P02 crash class with shared isUuid guard ([44a5627](https://github.com/Dahgoth/kompmaster-server/commit/44a56272e0dc9a6a799269557a4d49899246ad7d))
* **backend:** correct slug transliteration and guarantee slug uniqueness ([efb26af](https://github.com/Dahgoth/kompmaster-server/commit/efb26af138f9e0d084a590ae90c14cb50f487645))
* canonical reset-link origin, Terraform CDN toggle, Caddy DOMAIN default ([d903e38](https://github.com/Dahgoth/kompmaster-server/commit/d903e387a8190c41448b4cd27c728e78dac2ee5d))
* **ci:** add corepack enable pnpm to all jobs needing pnpm ([f5d9176](https://github.com/Dahgoth/kompmaster-server/commit/f5d91760dc035ae4756233635d15ca3b6fbc8fd0))
* **ci:** add fetch-depth: 0 to compose job checkout ([02a7351](https://github.com/Dahgoth/kompmaster-server/commit/02a7351ef8351dad7d2ca14ddd61a9768fce9cf6))
* **ci:** align the docs-in-sync classifier with the v2 file layout ([c07bccb](https://github.com/Dahgoth/kompmaster-server/commit/c07bccb7b51b835c05a72ea1ceaad27ff3b756f6))
* **ci:** bake storefront API_BASE and SITE_URL into the build job ([83cb95c](https://github.com/Dahgoth/kompmaster-server/commit/83cb95cb3c522a3e6e6e644dfe314217525fef25))
* **ci:** drop invalid --depth=0 fetch, fix backend syntax pathspec ([abf4295](https://github.com/Dahgoth/kompmaster-server/commit/abf4295cc46dd4d6c6e3ef51c5be58a492df306c))
* **ci:** extract change detection to composite action; fix ERE regex patterns ([fa34132](https://github.com/Dahgoth/kompmaster-server/commit/fa34132225fc02579d674a3b24fb0c39010cbbd2))
* **ci:** fix composite action error handling; add exclude-pattern for terraform ([089f14f](https://github.com/Dahgoth/kompmaster-server/commit/089f14f7bd03c60feef2dcb95485539a9cf18561))
* **ci:** handle grep exit codes properly - fail on error (2), allow no-match (1) ([1212087](https://github.com/Dahgoth/kompmaster-server/commit/12120877f92bf45f1adf590391ae3ef5df1fdd38))
* **ci:** handle no-match in detect-changes action ([a56f85d](https://github.com/Dahgoth/kompmaster-server/commit/a56f85d697d431b157fffbb355a1bc2a84db5f06))
* **ci:** migrate to googleapis/release-please-action@v5; fix pnpm; Node 24 ([#62](https://github.com/Dahgoth/kompmaster-server/issues/62)) ([95c568f](https://github.com/Dahgoth/kompmaster-server/commit/95c568fb80ec9dfdfe337140c7e29a4941f0872f))
* **ci:** pin all actions to full commit SHAs; inline changelog-types in release.yml ([c3ae254](https://github.com/Dahgoth/kompmaster-server/commit/c3ae2542667b04db1c077dcf60d4610a19cfcdde))
* **ci:** remove 2&gt;/dev/null from git diff to surface errors ([2261927](https://github.com/Dahgoth/kompmaster-server/commit/2261927eff82676ed82127ac12431e6ec303a050))
* **ci:** remove cache: pnpm from setup-node; enable pnpm via corepack after setup-node ([ad43d6d](https://github.com/Dahgoth/kompmaster-server/commit/ad43d6dba5e90de4992764dd68a4f6150bc6bcfe))
* **ci:** replace third-party actions with GitHub built-ins (pnpm cache + inline diff) ([8040b7a](https://github.com/Dahgoth/kompmaster-server/commit/8040b7ac0177caa52e5fa95ae2fd97aae01db9be))
* **ci:** replace third-party actions with GitHub built-ins + fix action pinning ([#58](https://github.com/Dahgoth/kompmaster-server/issues/58)) ([e9769e3](https://github.com/Dahgoth/kompmaster-server/commit/e9769e390146f6eda41e18648050232cf74535fe))
* **ci:** scope docs-sync to PR base, fix pre-push stdin consumption ([86c8785](https://github.com/Dahgoth/kompmaster-server/commit/86c87857274b306d2988753dd68f5ec10f01b4a4))
* **ci:** skip docs-sync, versions, commitlint on release-please PRs ([#61](https://github.com/Dahgoth/kompmaster-server/issues/61)) ([396a242](https://github.com/Dahgoth/kompmaster-server/commit/396a2422faa61ac1566d81bb64420f9f6ac3df48))
* **ci:** skip docs-sync, versions, commitlint on release-please PRs (github.actor) ([362373e](https://github.com/Dahgoth/kompmaster-server/commit/362373e9233bf64a4a7c1181106a04e5eb6e7d45))
* **ci:** skip release-please PRs in CI; add version:sync to release workflow ([c1e2b3d](https://github.com/Dahgoth/kompmaster-server/commit/c1e2b3de42b103453f65ed0cdabfc5af92474b6c))
* **ci:** skip release-please PRs in CI; add version:sync to release workflow; update branch protection ([#60](https://github.com/Dahgoth/kompmaster-server/issues/60)) ([2c57658](https://github.com/Dahgoth/kompmaster-server/commit/2c57658e9b6d81c8c15a35a63545bfd2747d5c35))
* **ci:** skip release-please PRs in docs-sync/versions/commitlint; update DEVELOPMENT.md ([dd24671](https://github.com/Dahgoth/kompmaster-server/commit/dd2467123ad9df91ea70a5a64e0713808568a8bc))
* **config:** set FRONTEND_ORIGIN default to compmasone.ru ([72e37f5](https://github.com/Dahgoth/kompmaster-server/commit/72e37f5d2a41fd5840fa98f058c8823abe5ae9bc))
* **deploy:** fail fast on SSH failure + validate active color ([c305d6e](https://github.com/Dahgoth/kompmaster-server/commit/c305d6e3af7d2a7478564cbade1bedb56460ac7a))
* **deploy:** fix tag input required + use TAG in release ([492231d](https://github.com/Dahgoth/kompmaster-server/commit/492231d0cc6e14a8e84594221eeb8b16372859d9))
* **deploy:** handle first deploy + consistent SSH target ([15c8b89](https://github.com/Dahgoth/kompmaster-server/commit/15c8b896ae33d62aa06db4a82f4bdbb98c2c26b3))
* **deploy:** handle tag from both push and workflow_call ([#46](https://github.com/Dahgoth/kompmaster-server/issues/46)) ([7200131](https://github.com/Dahgoth/kompmaster-server/commit/7200131c7d35631eaedb76887cdce5891cb9dd29))
* **deploy:** handle tag from both push and workflow_call triggers ([f1364f5](https://github.com/Dahgoth/kompmaster-server/commit/f1364f5fec5591ac274695d3d3227999dc2f2ba0))
* **deploy:** query active color from /etc/default/caddy on VPS ([3b8bb8c](https://github.com/Dahgoth/kompmaster-server/commit/3b8bb8cf3670d85ebdcc29af300a0dc5240eb995))
* **deploy:** remove --skip-build (keep PR [#47](https://github.com/Dahgoth/kompmaster-server/issues/47) fix for VPS build) ([603544d](https://github.com/Dahgoth/kompmaster-server/commit/603544d96be118bbe36103658900a3e00313ef5d))
* **deploy:** remove --skip-build to build on VPS ([fe00c0c](https://github.com/Dahgoth/kompmaster-server/commit/fe00c0c66a29372618a77b2a9fbc2f9246f42fef))
* **deploy:** remove --skip-build to build on VPS ([#47](https://github.com/Dahgoth/kompmaster-server/issues/47)) ([79dbd3f](https://github.com/Dahgoth/kompmaster-server/commit/79dbd3f87d67b604f3e480c4a0755eb6bb920d77))
* **deploy:** restore ternary tag logic for push+workflow_call triggers; refine Worktree & Branch Protection rule ([a0a922b](https://github.com/Dahgoth/kompmaster-server/commit/a0a922b44395b7115cae95c6ba4b903ee1d92dce))
* **deps:** adopt maintained SheetJS CE release for price import ([3758356](https://github.com/Dahgoth/kompmaster-server/commit/3758356e71112e75a0245312207b5dba6aaed0ff))
* **dev:** pin local Postgres to 16.15-alpine with verify-then-bump procedure ([2281a8f](https://github.com/Dahgoth/kompmaster-server/commit/2281a8f0f3790bb0da55b2fdf2078b50c68827f6))
* **dev:** pin MinIO to a Quay release and validate the compose stack in CI ([c826a46](https://github.com/Dahgoth/kompmaster-server/commit/c826a4607f390060000b3e58f23242f19350a643))
* **docker:** pull MinIO from quay.io after Docker Hub org removal ([a349116](https://github.com/Dahgoth/kompmaster-server/commit/a34911680b9b65e2b0518f9ba062c49db6c241b5))
* final nitpicks from review ([8775308](https://github.com/Dahgoth/kompmaster-server/commit/8775308b536ee272619080527a591c7ad5e1ab18))
* fix section numbering in README + footgun numbering in ENVIRONMENT ([0c680cc](https://github.com/Dahgoth/kompmaster-server/commit/0c680ccd4149dc0db21980d40b44035b24370647))
* **frontend:** admin products list uses the real X-Total-Count ([7ba31cb](https://github.com/Dahgoth/kompmaster-server/commit/7ba31cb76e719068785be3747e767b4e4cceb2c5))
* **frontend:** block attribute injection in the content-page markdown renderer ([51b11ed](https://github.com/Dahgoth/kompmaster-server/commit/51b11ed8b2db30b13ae8e245b7ff1208a9113705))
* **frontend:** fix vitest root for hoisted layout ([ac1dfa9](https://github.com/Dahgoth/kompmaster-server/commit/ac1dfa9f1ff7e0acecbdbf980c4ddc2101b31dc5))
* **frontend:** replace regex router with segment matcher ([0d59e15](https://github.com/Dahgoth/kompmaster-server/commit/0d59e15832ad950603a7acabee7e8b6c113a1f48))
* **frontend:** single-source contact data and drop fabricated placeholders ([be24ade](https://github.com/Dahgoth/kompmaster-server/commit/be24ade1d2fba376655bc97507ef521c258dced2))
* **frontend:** sitemap cap counts products only, admin keys via queryKeys factory ([2afa781](https://github.com/Dahgoth/kompmaster-server/commit/2afa7812face6a2b74d01904d0957d775801f6e6))
* **hooks:** scope pre-push checks to PR range, not push range ([803e430](https://github.com/Dahgoth/kompmaster-server/commit/803e430f8635fee01cba16e2697e8694958f0df5))
* **release:** add corepack enable pnpm before release-please action ([63a16e1](https://github.com/Dahgoth/kompmaster-server/commit/63a16e13e9463c9a046f753b506105bcebb8d6a8))
* **release:** add corepack enable pnpm for release-please workflow ([#63](https://github.com/Dahgoth/kompmaster-server/issues/63)) ([138625f](https://github.com/Dahgoth/kompmaster-server/commit/138625f3e546eb85a135233105237164706e0562))
* **release:** add setup-node+corepack; fix squash-merge comment; drop ruleset ID ([e9b37f7](https://github.com/Dahgoth/kompmaster-server/commit/e9b37f70c5c6d6de2d53849c946b0c052f8001f2))
* **release:** add trailing newline and duplication comment to config ([fe3fc90](https://github.com/Dahgoth/kompmaster-server/commit/fe3fc9017f8d8f592502c02615ddb18b7b804a47))
* **release:** fix changelog-types.json format for file() function (lesson from PR [#48](https://github.com/Dahgoth/kompmaster-server/issues/48)) ([76df8d5](https://github.com/Dahgoth/kompmaster-server/commit/76df8d5f39c24cb4163144c847970be2eb77e063))
* **release:** fix pnpm cache error and version sync failure ([#66](https://github.com/Dahgoth/kompmaster-server/issues/66)) ([b948e43](https://github.com/Dahgoth/kompmaster-server/commit/b948e4307b438f1ea1514102b0470b5c7c352bb9))
* **release:** inline changelog-types to fix workflow file error ([589103a](https://github.com/Dahgoth/kompmaster-server/commit/589103a4d47f8661d9e3a5268c23e1cc1c3c48e4))
* **release:** inline changelog-types to fix workflow file error ([#48](https://github.com/Dahgoth/kompmaster-server/issues/48)) ([58a7491](https://github.com/Dahgoth/kompmaster-server/commit/58a7491dfc1121887bb2c008da46feb221c04ec0))
* **release:** migrate to googleapis/release-please-action@v5; fix pnpm; Node 24 ([af63449](https://github.com/Dahgoth/kompmaster-server/commit/af63449c910c8a4c011573315c8e57f621a21acf))
* **release:** move corepack enable pnpm before setup-node for cache to work ([a250042](https://github.com/Dahgoth/kompmaster-server/commit/a250042f7c4d1023001ad055772c0c09c0f8c804))
* **release:** move corepack enable pnpm before setup-node to fix pnpm cache ([#64](https://github.com/Dahgoth/kompmaster-server/issues/64)) ([19be45b](https://github.com/Dahgoth/kompmaster-server/commit/19be45bfa59df4d6b505a9e0d27707542fe3a319))
* **release:** pin release-please-action SHA; corepack before setup-node ([ee467bb](https://github.com/Dahgoth/kompmaster-server/commit/ee467bbdb42e29622b513a178e4d57cc075bca2d))
* **release:** remove pnpm cache from setup-node; add explicit pnpm install before release-please ([dcc937b](https://github.com/Dahgoth/kompmaster-server/commit/dcc937b442dea4890e2aadef6863ef132bb8daef))
* **release:** remove redundant corepack enable pnpm step ([88b5f88](https://github.com/Dahgoth/kompmaster-server/commit/88b5f88d339b68e31de52dae4246fbd5703f2c8f))
* **release:** remove unnecessary Setup Node (lesson learned from PR [#51](https://github.com/Dahgoth/kompmaster-server/issues/51)) ([e06b7cd](https://github.com/Dahgoth/kompmaster-server/commit/e06b7cd8a645f4ce9105d04ba0968fa82639ac03))
* **release:** remove unnecessary Setup Node step ([db9422d](https://github.com/Dahgoth/kompmaster-server/commit/db9422d517a870f34b78d2ea1344edcf7f6c289f))
* remove duplicate API section header in README ([d8d86d7](https://github.com/Dahgoth/kompmaster-server/commit/d8d86d7ea4c02fc781bf859bf4435ed98d8969eb))
* **security:** CORS allowlist for FRONTEND_ORIGIN; advisory lock for migrations ([f42dfa7](https://github.com/Dahgoth/kompmaster-server/commit/f42dfa74a797bfda8286b7c31293ff905e6c8f25))
* **security:** place admin rate limiters first in route chains ([dc6bd1b](https://github.com/Dahgoth/kompmaster-server/commit/dc6bd1b5373c1711f59b30d69e7f6afc7fcf6a78))
* **security:** rate-limit admin panel endpoints ([d83cfdf](https://github.com/Dahgoth/kompmaster-server/commit/d83cfdfd18a2296661b98b9f3643db44ba68a335))
* **security:** rate-limit public order creation ([bdafb03](https://github.com/Dahgoth/kompmaster-server/commit/bdafb03b342276a03e2a475e42465ed3c3584a8b))


### Reverts

* **ci:** restore PR [#36](https://github.com/Dahgoth/kompmaster-server/issues/36) workflow state + add Worktree & Branch Protection rule ([b710079](https://github.com/Dahgoth/kompmaster-server/commit/b710079583d26fb8747f1b1e4b8df21f8e43d2f6))

## [2.1.1](https://github.com/Dahgoth/kompmaster-server/compare/v2.1.0...v2.1.1) (2026-09-25)


### Bug Fixes

* **ci:** add corepack enable pnpm to all jobs needing pnpm ([f5d9176](https://github.com/Dahgoth/kompmaster-server/commit/f5d91760dc035ae4756233635d15ca3b6fbc8fd0))
* **ci:** add fetch-depth: 0 to compose job checkout ([02a7351](https://github.com/Dahgoth/kompmaster-server/commit/02a7351ef8351dad7d2ca14ddd61a9768fce9cf6))
* **ci:** extract change detection to composite action; fix ERE regex patterns ([fa34132](https://github.com/Dahgoth/kompmaster-server/commit/fa34132225fc02579d674a3b24fb0c39010cbbd2))
* **ci:** fix composite action error handling; add exclude-pattern for terraform ([089f14f](https://github.com/Dahgoth/kompmaster-server/commit/089f14f7bd03c60feef2dcb95485539a9cf18561))
* **ci:** handle grep exit codes properly - fail on error (2), allow no-match (1) ([1212087](https://github.com/Dahgoth/kompmaster-server/commit/12120877f92bf45f1adf590391ae3ef5df1fdd38))
* **ci:** handle no-match in detect-changes action ([a56f85d](https://github.com/Dahgoth/kompmaster-server/commit/a56f85d697d431b157fffbb355a1bc2a84db5f06))
* **ci:** remove 2&gt;/dev/null from git diff to surface errors ([2261927](https://github.com/Dahgoth/kompmaster-server/commit/2261927eff82676ed82127ac12431e6ec303a050))
* **ci:** remove cache: pnpm from setup-node; enable pnpm via corepack after setup-node ([ad43d6d](https://github.com/Dahgoth/kompmaster-server/commit/ad43d6dba5e90de4992764dd68a4f6150bc6bcfe))
* **ci:** replace third-party actions with GitHub built-ins (pnpm cache + inline diff) ([8040b7a](https://github.com/Dahgoth/kompmaster-server/commit/8040b7ac0177caa52e5fa95ae2fd97aae01db9be))
* **ci:** replace third-party actions with GitHub built-ins + fix action pinning ([#58](https://github.com/Dahgoth/kompmaster-server/issues/58)) ([e9769e3](https://github.com/Dahgoth/kompmaster-server/commit/e9769e390146f6eda41e18648050232cf74535fe))
* **ci:** skip docs-sync, versions, commitlint on release-please PRs ([#61](https://github.com/Dahgoth/kompmaster-server/issues/61)) ([396a242](https://github.com/Dahgoth/kompmaster-server/commit/396a2422faa61ac1566d81bb64420f9f6ac3df48))
* **ci:** skip docs-sync, versions, commitlint on release-please PRs (github.actor) ([362373e](https://github.com/Dahgoth/kompmaster-server/commit/362373e9233bf64a4a7c1181106a04e5eb6e7d45))
* **ci:** skip release-please PRs in CI; add version:sync to release workflow ([c1e2b3d](https://github.com/Dahgoth/kompmaster-server/commit/c1e2b3de42b103453f65ed0cdabfc5af92474b6c))
* **ci:** skip release-please PRs in CI; add version:sync to release workflow; update branch protection ([#60](https://github.com/Dahgoth/kompmaster-server/issues/60)) ([2c57658](https://github.com/Dahgoth/kompmaster-server/commit/2c57658e9b6d81c8c15a35a63545bfd2747d5c35))
* **ci:** skip release-please PRs in docs-sync/versions/commitlint; update DEVELOPMENT.md ([dd24671](https://github.com/Dahgoth/kompmaster-server/commit/dd2467123ad9df91ea70a5a64e0713808568a8bc))
* **release:** add setup-node+corepack; fix squash-merge comment; drop ruleset ID ([e9b37f7](https://github.com/Dahgoth/kompmaster-server/commit/e9b37f70c5c6d6de2d53849c946b0c052f8001f2))

## [2.1.0](https://github.com/Dahgoth/kompmaster-server/compare/v2.0.1...v2.1.0) (2026-09-25)


### Features

* **release:** re-enable release-please workflow ([#50](https://github.com/Dahgoth/kompmaster-server/issues/50)) ([fb01907](https://github.com/Dahgoth/kompmaster-server/commit/fb01907cfb7b8ac468cb3e6ca2ca048cfdb116b5))


### Bug Fixes

* **ci:** pin all actions to full commit SHAs; inline changelog-types in release.yml ([c3ae254](https://github.com/Dahgoth/kompmaster-server/commit/c3ae2542667b04db1c077dcf60d4610a19cfcdde))
* **deploy:** remove --skip-build (keep PR [#47](https://github.com/Dahgoth/kompmaster-server/issues/47) fix for VPS build) ([603544d](https://github.com/Dahgoth/kompmaster-server/commit/603544d96be118bbe36103658900a3e00313ef5d))
* **deploy:** restore ternary tag logic for push+workflow_call triggers; refine Worktree & Branch Protection rule ([a0a922b](https://github.com/Dahgoth/kompmaster-server/commit/a0a922b44395b7115cae95c6ba4b903ee1d92dce))
* **release:** fix changelog-types.json format for file() function (lesson from PR [#48](https://github.com/Dahgoth/kompmaster-server/issues/48)) ([76df8d5](https://github.com/Dahgoth/kompmaster-server/commit/76df8d5f39c24cb4163144c847970be2eb77e063))
* **release:** remove unnecessary Setup Node (lesson learned from PR [#51](https://github.com/Dahgoth/kompmaster-server/issues/51)) ([e06b7cd](https://github.com/Dahgoth/kompmaster-server/commit/e06b7cd8a645f4ce9105d04ba0968fa82639ac03))


### Reverts

* **ci:** restore PR [#36](https://github.com/Dahgoth/kompmaster-server/issues/36) workflow state + add Worktree & Branch Protection rule ([b710079](https://github.com/Dahgoth/kompmaster-server/commit/b710079583d26fb8747f1b1e4b8df21f8e43d2f6))

## [Unreleased]

### Fixed
- **PR #56**: GitHub Actions CI failures after PR #55 merge:
  - Pinned all 10 GitHub Actions to full commit SHAs (org policy requirement)
  - Inlined `changelog-types` array in `release.yml` — the `${{ file() }}` expression is not valid in GitHub Actions and caused "Invalid workflow file" error
- **PR #55**: Reverted repository to PR #36 baseline (commit 8b0f6c2) while preserving lessons learned from PRs #37–#51:
  - Removed `--skip-build` from VPS deploy (PR #47 fix retained)
  - Removed unnecessary `Setup Node` step from `release-please` workflow (PR #51 fix retained)
  - Fixed `release-changelog-types.json` format for `file()` function compatibility (PR #48 fix retained)
  - Deleted obsolete `release.yml.disabled` file (added in PR #50)

### Added
- **AGENTS.md**: Worktree & Branch Protection rule — do not delete branches/worktrees containing unmerged work or active CI context; routine cleanup of merged branches permitted
- **AGENTS.md**: Command execution guidance — run commands from workspace root unless subdirectory explicitly required
  syntax for type uuid`. The 2026-09-22 `reviews/product/:id` fix is now closed
  class-wide: one shared `backend/src/utils/uuid.js#isUuid` guard replaces the
  duplicated per-file regexes and covers every uuid-column lookup —
  `products/:id`, `reviews/:id/approve|delete` and the manual-review body,
  `orders` (create item ids, `my/:id`, `:id/status`, `:id/cancel`, delete) and
  `users/:id/role`. Malformed values return 400 or 404 before the query runs
  (previously an unhandled error killed the process); verified live on all six
  routes, with `backend/tests/uuid.test.js` pinning the guard.
- Local dev: `docker-compose.yml` now pulls MinIO from Quay.io, pinned to
  `RELEASE.2025-09-07T16-13-09Z` — MinIO removed its Docker Hub organization,
  so `minio/minio` fails every `docker compose up` with `pull access denied /
  repository does not exist`. The dead reference dated from the first backend
  commit and survived because no CI job or test ever pulled the compose stack;
  a new path-filtered `compose` CI job now pulls it on every compose change.
  Postgres is pinned to `16.15-alpine` the same way, and DEVELOPMENT.md
  documents a verify-then-bump upgrade procedure for both dev-stack images.
  Also drops the obsolete `version:` key that warned on every Compose command.
- Sitemap product cap now counts only product entries (static route entries
  excluded), and admin create/delete mutations invalidate queries through the
  central `queryKeys` factory — ad-hoc `["products"]` key literals could leave
  stale cached data after product changes.
- Storefront contact data now has a single owner (`src/lib/content.ts`, the
  verbatim v1 port): the duplicate `BRAND` constants had drifted, shipping a
  wrong Telegram handle (`compmasoneone` instead of the live
  `compmasterone`) on the manual-payment page and a fabricated
  `+7 (900) 000-00-00` phone in the global footer. The phone block is now
  rendered only when a real number exists, matching v1 behavior.
- Cart persistence reads the storage key from `STORAGE_KEYS.cart` instead of a
  second hardcoded `"km_cart"` literal, so the key that must survive the v1
  cutover has one source of truth.
- Storefront deploy script `backend/scripts/deploy-storefront.sh` (phase 6):
  rsync + PM2 + health gate + auto-rollback, boot-verify on scratch port before
  shipping, release symlink flip (`current`), retention (`KEEP_RELEASES=3`),
  local mode for development, `--dry-run` with zero side effects.
- Storefront RAM measurement `backend/scripts/measure-storefront-ram.sh`:
  fresh standalone build, load test on scratch port, RSS sampling every 0.2s,
  min/avg/peak report vs `RAM_BUDGET_MB`, local baseline 80 MB peak (PASS vs
  512 MB), VPS formula `available − (postgres + api + storefront) ≥ 512 MB`.
- Caddy `www` block (phase 6 cutover): encodes zstd/gzip, immutable
  `_next/static/*` cache, HSTS, nosniff, CSP-Report-Only (nonce-less, reports
  only), `reverse_proxy 127.0.0.1:{$STOREFRONT_PORT:3000}`; `STOREFRONT_PORT`
  in `/etc/default/caddy`.
- Storefront runtime environment documented in `ENVIRONMENT.md`: `PORT`,
  `HOSTNAME`, `NODE_ENV`, `API_BASE`, `SITE_URL`, `REVALIDATE_SECRET`,
  `INDEXNOW_KEY`; `VITE_API_BASE` retired (v1 static build).
- `pnpm-workspace.yaml`: added `nodeLinker: hoisted` to fix Next.js standalone
  output (isolated layout produced broken `node_modules/next` stub).
- `next.config.ts`: `outputFileTracingRoot` set to workspace root so file trace
  reaches hoisted deps; standalone now emits complete runtime closure.

### Added
- Storefront v2 catalog read path (Next.js, phase 3 of `docs/frontend-v2-plan.md`;
  not yet deployed — the live static build still serves production): server-
  rendered home/catalog/category/product pages against the existing REST API,
  ISR with a 60s TTL plus an on-demand invalidation route
  (`/api/revalidate`, secret-gated) and an IndexNow key endpoint; product
  pages render Product/Offer JSON-LD, absolute canonicals, and 308-redirect
  legacy `/product/:uuid` links to the canonical slug URL; `sitemap.xml` is
  generated from the catalog (5,000-product cap per ADR 007) and `robots.txt`
  blocks account/admin surfaces; persistent cart state keeps the v1
  `km_cart` storage shape.
- Static content pages ported verbatim from the v1 storefront (`/about`,
  `/faq` with FAQPage JSON-LD, `/contacts`, `/warranty`): source of truth is
  `src/lib/content.ts` until the DB-backed `/p/[slug]` program (ADR 007)
  supersedes them with 301s.
- Admin panel shell (phase 4): `/admin/login` (second-password gate,
  sessionStorage panel session), role-gated shell (manager sees orders
  only), `/admin/products` with create/list/delete + category filter,
  `/admin/orders` with status filter + number search, status transitions,
  cancel-with-reason (restores stock) and admin-only delete,
  `/admin/categories` (create with kind/parent/image + delete, backend FK
  guard surfaced verbatim), `/admin/users` (login/name search + role changes
  confirmed with the audit notice), `/admin/reviews` (pending queue with
  publish/delete + manual reviews published immediately), price import
  inside `/admin/products` with mandatory dry-run preview (sync/merge modes,
  multipart upload; verified live incl. slug auto-generation for new rows),
  `/admin/pages` content editor (markdown + live preview, noindex flag,
  ISR revalidate + IndexNow on save) with the public `/p/[slug]` surface
  (server-rendered markdown without client JS, per-page canonicals,
  noindex honored; verified live end-to-end).
- Storefront auth slice (phase 3): login/registration/password-restore tabs
  (`/auth`), and a working `/reset-password` route that consumes the emailed
  token — the v1 storefront lacked this route entirely, so emailed reset
  links landed on the home page and never reset anything (ADR 006 §Context).
  Fixed the forgot-password contract (`{email}`, not `{login}` — the backend
  reads `email`, so every restore request silently no-op'd before).
- Profile (`/profile`): read-only account data + optional SMS phone
  verification (request/confirm with 400/429 backend messages verbatim).
- Product reviews: approved-review lists on product pages with
  AggregateRating JSON-LD, purchase-gated submission with the pending-
  moderation notice (403/409 surfaced as-is).
- `GET|POST /api/reviews/product/:id` now resolves slug-or-UUID to the
  product id first: unknown or non-UUID values return 404 instead of
  crashing the process with `22P02 invalid input syntax for type uuid`
  (found live 2026-09-22 — any crawler/typo on that route killed the API).
- Storefront order flow (phase 3): cart page with quantity steppers and
  persisted state, checkout with pickup/delivery + public-offer acceptance
  gate, atomic order creation with per-item 409 stock-conflict messages, my
  orders list and detail with the server-owned status pills (tint + text +
  label), and the manual-payment instructions page (ADR 002: providers still
  deferred).
- Tier A E2E matrix (phase 5 of `docs/frontend-v2-plan.md`): 20 Playwright
  specs + 2 Tier-B skips across 8 files (home, catalog, product, auth,
  reset-password, cart, seo, navigation incl. mobile drawer and skip-link),
  MSW fixture handlers, axe `assertNoViolations` on key flows; every label
  wired via `aria-labelledby` so `getByLabel` resolves deterministically;
  server/client API-base split hardened (`config.apiBase` throws in the
  browser by design, covered by unit tests) after E2E exposed a production
  crash from reading `API_BASE` client-side. The matrix is now executable
  (`pnpm e2e`, chromium + WebKit mobile) and enforced in CI: the `e2e` job
  provisions a throwaway Postgres, applies migrations, seeds deterministic
  fixtures (`backend/scripts/seed-e2e.js`) and runs the suite against a real
  backend — previously the specs had no runner at all.

### Changed
- Storefront rebuild started on the Next.js SSR/ISR stack (ADR 006/007):
  vanilla Vite app replaced by a TypeScript Next.js App Router scaffold with
  Tailwind v4 design tokens, workspace ESLint upgraded to typescript-eslint +
  react-hooks + jsx-a11y, tests moved to Vitest, CI gained a `tsc --noEmit`
  gate. Storefront behavior is unchanged until the storefront pages land
  (plan phases 2–4); the deployed static build still serves production.

### Added
- Product URLs are opaque UUIDs (`/product/<id>`, ADR 007 amendment
  2026-09-23): product transliteration slugs are removed as overengineering —
  the v1 storefront was never a working public path, so there is no legacy
  traffic to preserve and no keyword-URL value to repay the transliteration
  machinery. Migration 003 drops the `products.slug` column + index added by
  migration 002 §1 (002 ran only in local dev DBs); product reads are single
  UUID-guarded queries where non-UUID values 404 before touching the DB.
  `content_pages.slug` is unaffected (human-authored).
- `X-Total-Count` response header on `GET /api/products` for pagination.
- `POST /api/telemetry` — rate-limited frontend telemetry sink (errors, Web
  Vitals), log-only with strict body caps.
- Content pages API (`/api/pages`, admin + public `GET /api/pages/:slug`)
  backing the SEO publishing surface (`content_pages` table, migration 002).
- Catalog indexes: `pg_trgm` GIN on `products.name` (serves the ILIKE search
  the old tsvector index could not), `(category_id, created_at DESC)` and
  `created_at DESC` sort indexes (migration 002).
- Dual-stack IPv4/IPv6 support for PoC VPS via Terraform-managed floating IP (`twc_floating_ip` resource) in St. Petersburg zone (spb-3). Both A and AAAA records created for apex and `api` subdomain.
- SSH key pair generation documented in `terraform/RUNBOOK.md` (`ssh-keygen -t ed25519`) with public key registration in Timeweb panel.
- CDN configuration variables for media bucket (`media_cdn_enabled`, `media_cdn_cname`) alongside existing frontend CDN toggle.

### Changed
- PoC Terraform (`terraform/`) now provisions VPS in St. Petersburg (spb-3) with native IPv6 + floating IPv4, replacing the previous IPv6-only Moscow zone (msk-1). Terraform config updated: `availability_zone = "spb-3"`, `location = "ru-1"`, and added `twc_floating_ip.server_ipv4` resource.
- Documentation updated across `terraform/RUNBOOK.md`, `terraform/README.md`, `DEPLOY.md`, `DEVELOPMENT.md` for dual-stack accuracy and consistency.
- `backend/src/migrate.js` and `backend/src/utils/advisoryLock.js`: advisory lock key now computed via `hashtext('kompmaster:migrations')::bigint` cast to int8 for `pg_advisory_lock` compatibility.

### Security
- Replaced the abandoned npm `xlsx@0.18.5` (last registry release 2023) with
  the maintained SheetJS CE 0.20.3 from the official SheetJS CDN
  (`docs/adr/004-spreadsheet-import-stack.md`), fixing CVE-2023-30533
  (prototype pollution) and CVE-2024-22363 (ReDoS) — both reachable through
  admin-uploaded price files.

### Changed
- PoC Terraform (`terraform/`) drops the daily disk-backup schedule and its
  `backup_copy_count`/`backup_start_at` variables (ADR-005): Timeweb bills
  6 ₽/GB of disk per existing copy per month, which priced the previous 7-copy
  default at ~2,100 ₽/mo — outside the ADR-002 PoC basket. **Terraform config
  migration:** delete those two keys from the local gitignored
  `terraform.tfvars` before applying (stale keys produce an "undeclared
  variable" warning).
- Offsite DB backup flow replaces the VPS-local dump as the recovery control
  (ADR-005): a new private `twc_s3_bucket.backups` (separate per-bucket key,
  +79 ₽/mo) and `backend/scripts/backup.sh` now encrypts each daily `pg_dump`
  (AES-256-CTR + PBKDF2) before uploading it to that versioned bucket —
  versioning is re-asserted on every run so history survives accidental
  deletion/overwrite. Quarterly restore drill documented in
  `terraform/RUNBOOK.md` §5.
- Backend dependency cleanup on top of PR #29 (multer 2.4 fixes four upload
  CVEs; nodemailer 9; vite 6): removed `uuid` (S3 object keys now use
  `crypto.randomUUID()` from `node:crypto`) and `node-fetch` (native `fetch`
  in SMS/Telegram notifications) in favour of Node 24 built-ins.
- Price-file parsing (csv/tsv) now decodes text spreadsheets explicitly
  (BOM → strict UTF-8 → windows-1251) instead of relying on the parser's
  internal codepage option, which stopped working in SheetJS 0.20.x and
  would mojibake Cyrillic headers in windows-1251 CSV exports from Excel/1C.
- Removed the ADR-001 quarantined legacy family after recording its behavior
  in the ADR 001 §1b audit annex: `backend/src/{auth,mail,sheets}.js`,
  `backend/src/payment-adapters/`, `backend/src/schema.sql`,
  `backend/src/importFromBeta.js`, `backend/seed.json`,
  `backend/scripts/{init-db,reset-admin}.js`, and the archived
  `docs/legacy/` storefront monolith. All were unreferenced by the canonical
  core (the two ops scripts were ESM files that could not run under the
  CommonJS runtime at all). `GOOGLE_SERVICE_ACCOUNT_JSON` left the
  environment surface with `sheets.js`. The ESLint/Prettier quarantine
  exclusions were dropped — the whole repo is linted again.
- Migrated dependency management from npm to pnpm. `packageManager` pins
  `pnpm@12.4.2` (run via Corepack); the npm lockfiles are replaced by a single
  `pnpm-lock.yaml` at the root (`frontend/pnpm-lock.yaml` was removed;
  `frontend/` is now a workspace package). Husky hooks, CI,
  `backend/scripts/deploy.sh`, `scripts/check-docs.js`,
  and the install/run commands across `README.md`, `DEVELOPMENT.md`,
  `CONTRIBUTING.md`, `AGENTS.md`, `ENVIRONMENT.md`, `DEPLOY.md`,
  `frontend/README.md`, and the Terraform docs now use pnpm.
  The root `pnpm-workspace.yaml` approves only the `esbuild` build script.
- Restructured the repo as a pnpm workspace: the backend app moved from the
  repo root into `backend/` (`src/`→`backend/src/`, `tests/`→`backend/tests/`,
  `migrations/`→`backend/migrations/`,
  `seed.json`→`backend/seed.json`, `.env.example`→`backend/.env.example`,
  `package.json`→`backend/package.json`, operational scripts
  →`backend/scripts/`). The legacy single-file storefront
  (`public/index.html` + `public/server-bridge.js`) is archived under
  `docs/legacy/public/` rather than kept in the backend app directory.
  Repo-level tooling (`scripts/`, `.husky/`, `.github/`,
  `Caddyfile`, `docker-compose.yml`, `terraform/`, `docs/`) remains at the
  root. `frontend/` stays a workspace package; its `pnpm-lock.yaml` and
  `pnpm-workspace.yaml` were removed in favour of the single root lockfile and
  root `pnpm-workspace.yaml`. Entry point is now `backend/src/index.js`.
- Adopted fixed shared versioning: the root `package.json#version` is the
  single source of truth; `backend/` and `frontend/` mirror it.
  `pnpm run version:check` (CI `versions` job + Husky `pre-push`) enforces
  alignment; `pnpm run version:sync` propagates a bump after release. Release
  flow: bump root version → `pnpm run version:sync` → update `CHANGELOG.md`
  → tag. Backend and frontend always deploy from the same tag.
- Bumped minimum Node.js version from 20 LTS to 24 LTS. CI workflows now run
  on Node 24; install instructions in `README.md`, `DEVELOPMENT.md`, and
  `DEPLOY.md` updated accordingly. Added `engines.node` field to
  `package.json` (`>=24.0.0`) and `.nvmrc` pinning Node 24.
- Terraform: the CI `terraform` job now runs `terraform fmt -check -recursive`,
  a backend-less `terraform init` (verifying the committed
  `.terraform.lock.hcl`), and `terraform validate` instead of a placeholder
  asserting that no `.tf` files exist; the Husky `pre-push` hook runs the fmt
  check when Terraform files changed and the Terraform CLI is installed.
  `terraform/versions.tf` pins the Timeweb provider with `~> 1.8.2` so
  `terraform init -upgrade` cannot drift past the verified v1.8.2 series the
  CDN guidance depends on.
- Terraform CDN cutover is now a variable toggle (`frontend_cdn_enabled` +
  `frontend_cdn_cname`) instead of a manual DNS retarget that the next
  `terraform apply` would revert (drift). Frontend S3 preset defaults to the
  verified 10 GB tier (1 GB opt-in via `frontend_s3_disk_mb`).
- `package.json`: set `license` to `MIT`, added dev dependencies
  (commitlint, Husky), and `prepare`/`lint:commit` scripts.
- Changed license from AGPL-3.0 to MIT (resolves #6): the AGPL
  network-use clause (§13) was incompatible with the planned white-label
  commercial model where clients use the service over the network without
  receiving source code. MIT is permissive and imposes no
  source-disclosure obligations.

### Added
- Rate limiting on expensive endpoints (resolves CodeQL
  `js/missing-rate-limiting` alerts): `adminPanelVerifyLimiter`
  (10 attempts / 15 min) guards `POST /api/auth/admin-panel/verify` against
  second-password brute force, `adminLimiter` (300 requests / 15 min)
  guards the admin CRUD routes in orders, products, reviews, and users, and
  `orderCreateLimiter` (10 orders / hour) guards public order creation,
  which deducts stock in a transaction.
  Both sit first in each route's middleware chain (CodeQL models every
  middleware as a route handler, so the limiter must precede `requireAuth`)
  and key on the `Authorization` header — falling back to IP for token-less
  requests — because the app runs behind Caddy without `trust proxy`, where
  IP keys would collapse into a single shared bucket. Regression tests in
  `backend/tests/rateLimit.test.js`.
- Linting and formatting toolchain: ESLint 10 (flat `eslint.config.js`,
  `eslint:recommended` scope — parse errors, `no-undef`, unused vars, dead
  logic; style rules deliberately left to Prettier) and Prettier 3
  (`.prettierrc.json`, 100-char width) as root devDependencies, plus a shared
  `.editorconfig`. Root scripts `pnpm run lint` / `lint:backend` /
  `lint:frontend` / `format` / `format:check`; the per-app `lint` scripts
  delegate to the workspace root. CI `backend` and `frontend` jobs run ESLint
  before their suites, and the shared config files are part of both jobs'
  path filters. The six ADR-001-quarantined legacy ESM files in `backend/`
  are excluded from both tools and stay frozen.
- Path-filtered CI (`.github/workflows/ci.yml`): `docs-sync` (always-on
  `scripts/check-docs.js`), `commitlint` (PRs), `backend` / `frontend` /
  `terraform` jobs gated on changed paths via `dorny/paths-filter`.
- Path-aware Husky `pre-push`: runs only the suites whose area changed plus
  the docs-in-sync check; docs-only pushes run the docs check alone.
- `scripts/check-docs.js`: encodes the docs-in-sync hard rule as path
  classifiers, usable as `node scripts/check-docs.js [--staged|--base REF|files...]`.
- TDD test framework on the built-in `node:test` runner: `pnpm test`
  (backend) and `pnpm run test:frontend` (frontend);
  CI (`.github/workflows/ci.yml`) runs both suites, the frontend build,
  and commitlint on every push and PR; the Husky `pre-push` hook runs both
  suites before any push.
- Adopted MIT license (`LICENSE`).
- Added `AGENTS.md` describing repository ground rules and tooling for agents.
- Enforced Conventional Commits with commitlint + Husky (`commit-msg` hook).
- Added this changelog and linked it from `README.md`.
- Added `pnpm run lint:commit` helper to validate commit messages.
- Added `CONTRIBUTING.md` (contribution process), `DEVELOPMENT.md` (workspace
  setup), `ENVIRONMENT.md` (environment variables), and `DESIGN.md` (UX/UI
  contract), and referenced them from `README.md` and `AGENTS.md`.
- Added `backend/.env.example`.
- Added `terraform/` PoC infrastructure (Timeweb Cloud, ADR-002 Option D+A,
  Option B): single MSK-50-shape VPS running the API only, firewall
  (80/443/22), daily disk autobackups, media S3 bucket (`assets.` subdomain +
  SSL), and a static-storefront S3 bucket with website hosting (`www.`
  subdomain, 404→`index.html` SPA fallback). DNS `@`/`api` → VPS, `www`/`assets`
  → S3; CDN is attached manually (provider has no CDN resource). Backend
  CORS default now allows both `compmasone.ru` and `www.compmasone.ru`;
  Caddyfile redirects the apex to `www` and proxies `api.` to the app.
  No secrets in configs; state stays local.
- Added `docs/` planning documentation: executive cost estimate and strategic
  roadmap for the PoC web store and white-label platform
  (`docs/PoC_WhiteLabel_Cost_Roadmap_RU.md`, in Russian) plus the underlying
  pricing research reports (`docs/AI_TOOLING_COST_ESTIMATE_2026.md`,
  `docs/2026-hosting-pricing-research.md`).

### Removed
- Removed the legacy `Dockerfile` (built the un-runnable legacy
  `docs/legacy/server.js` entry on port 3000). Production deployment is
  PM2 (`backend/src/index.js`); Docker Compose remains for local PostgreSQL
  + MinIO databases only. Docker-based `backend/scripts/deploy.sh` and
  `backend/scripts/backup.sh` were rewritten for the PM2/host-`pg_dump` flow.
  Rationale: `docs/archive/DOCKER_EVALUATION.md`.
- Removed legacy `VERSION.txt`; `package.json` version is now the single
  source of truth for the release version.

### Fixed
- Storefront pages never rendered: `frontend/src/pages/index.js` built its
  `pageMap` from names that were only re-exported (`export { renderHome }
  from "./Home.js"` creates no local binding), so every `renderPage()` call
  threw `ReferenceError` before any page could be drawn. The renderers are
  now imported locally and re-exported explicitly. Found by ESLint `no-undef`
  during the linting rollout.
- Storefront header and drawer event handlers referenced `showEl`/`hideEl`
  helpers without importing them (`Header.js`, `Drawer.js`), so opening the
  mobile menu or closing the drawer threw `ReferenceError`. Both now import
  the helpers from `utils.js`. Found by ESLint `no-undef`.
- Password-reset e-mail links broke when `FRONTEND_ORIGIN` listed multiple
  origins: the comma-joined CORS allowlist was interpolated into the reset
  URL. Added `config.frontendCanonicalOrigin` (first listed origin) used for
  outbound links; `frontendOrigin` stays the CORS allowlist only. Regression
   tests in `backend/tests/config.test.js`.
- `Caddyfile` produced an empty site address when `DOMAIN` was unset (Caddy
  fails to adapt/start): site addresses now carry PoC defaults
  (`{$DOMAIN:compmasone.ru}`); `DEPLOY.md` §5 documents provisioning
  `DOMAIN`/`PORT` via `/etc/default/caddy`.
- CORS (E14): `FRONTEND_ORIGIN` is now a validated explicit allowlist
  (comma-separated, credentials preserved); wildcard `*` is rejected at
  startup (fail-closed). Requests without `Origin` (curl, health checks)
  are still allowed.
- `terraform/RUNBOOK.md`: the credential-inventory table header declared a
  leading `#` column that no row filled, shifting the rendered columns;
  the header now matches the four-column rows.
- Migrations (E17): `backend/src/migrate.js` now runs under a PostgreSQL advisory
  lock (`pg_advisory_lock`), so parallel deploys/replicas cannot apply the
  same migration twice. Added reusable `backend/src/utils/advisoryLock.js`
  (`withAdvisoryLock`) for future idempotent cron jobs.

## [1.0.0] - 2026-09-08

### Added
- Registration/login with JWT, roles (user/manager/admin), and a second
  password for the admin panel.
- Phone confirmation via SMS code with rate limits.
- Password recovery via one-time e-mail link.
- Product catalog, products, and price history.
- Price import (xlsx/xls/csv/tsv) with automatic column detection and
  CSV export of stock levels.
- Orders with atomic stock deduction (row locking in a transaction),
  statuses, and cancellation with stock return.
- Idempotent payment webhook (`/api/orders/payment-webhook`).
- Reviews with moderation workflow (client → pending → admin approval).
- Role assignment (admin/manager) by e-mail via `/api/users/:id/role`.
- Rate limiting on login/registration/SMS/password recovery.
- Telegram notifications for admins (new order, payment, new review).
- Image upload to S3-compatible storage.
- Database migrations (`npm run migrate`) with idempotent application.
- Optional import from the legacy HTML beta (`src/importFromBeta.js`).
