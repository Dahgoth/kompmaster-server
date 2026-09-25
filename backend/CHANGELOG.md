# Changelog

## [2.2.0](https://github.com/Dahgoth/kompmaster-server/compare/kompmaster-server-v2.1.1...kompmaster-server-v2.2.0) (2026-09-25)


### Features

* **backend:** product slugs, content pages, telemetry sink (ADR 007) ([ba44acd](https://github.com/Dahgoth/kompmaster-server/commit/ba44acdbd3eb5fc38e00f5df58e01b068f218b9d))
* **backup:** encrypt dumps and upload to a dedicated offsite bucket (ADR-005) ([6119cf2](https://github.com/Dahgoth/kompmaster-server/commit/6119cf229c08712bdce1ed84a39c36aa90afa633))
* **frontend:** profile, reviews, and two blocking bugs (plan phase 3c) ([0f10394](https://github.com/Dahgoth/kompmaster-server/commit/0f103943b961bd61dafbc41f34cf8eacdd854cc5))
* **frontend:** v2 Next.js storefront rebuild, review fixes, and dev-stack pinning ([#35](https://github.com/Dahgoth/kompmaster-server/issues/35)) ([061032c](https://github.com/Dahgoth/kompmaster-server/commit/061032cbfc47ed31171b8b081b12462627fa6d15))
* **infra:** dual-stack IPv4/IPv6 + operational docs ([f9dcfee](https://github.com/Dahgoth/kompmaster-server/commit/f9dcfeea610fcd166f4633538b23f10fdc1efdd8))
* **infra:** dual-stack IPv4/IPv6 + operational docs ([#34](https://github.com/Dahgoth/kompmaster-server/issues/34)) ([dbc0858](https://github.com/Dahgoth/kompmaster-server/commit/dbc0858e56a89d8b12701dfe87156b6998f78ea2))
* **release:** v2.0.0 + Blue/Green deploy + automated GitHub Deployment + AGENTS.md methodology ([#36](https://github.com/Dahgoth/kompmaster-server/issues/36)) ([8b0f6c2](https://github.com/Dahgoth/kompmaster-server/commit/8b0f6c2c98344b4813ece72b78ca82efde2ee88e))
* **release:** v2.0.0 version bump + Blue/Green deploy + automated GitHub Deployment ([cf50075](https://github.com/Dahgoth/kompmaster-server/commit/cf50075b3335b7fbce769982e8dd69367d4cb59b))
* **storefront:** deploy pipeline (rsync+PM2+health gate) + RAM measurement ([eb64eee](https://github.com/Dahgoth/kompmaster-server/commit/eb64eeec0ce82c7f912d34cbacd52b79ff521f84))
* **tooling:** add ESLint and Prettier with CI lint gates ([a773446](https://github.com/Dahgoth/kompmaster-server/commit/a77344673a67b94f709d6afdf452ff8ee564b997))
* **tooling:** add ESLint and Prettier with CI lint gates ([#28](https://github.com/Dahgoth/kompmaster-server/issues/28)) ([4589a9a](https://github.com/Dahgoth/kompmaster-server/commit/4589a9abb82e22c027a11ce41738336debb1a25e))


### Bug Fixes

* address all PR review comments ([841b7e6](https://github.com/Dahgoth/kompmaster-server/commit/841b7e6667e3aeb84a6267b1fee5ee032f6169a1))
* address all PR review comments ([ef75ba8](https://github.com/Dahgoth/kompmaster-server/commit/ef75ba8b86e912a26d46fc764a7474b53295bf6d))
* address fresh PR review comments ([9d17efe](https://github.com/Dahgoth/kompmaster-server/commit/9d17efea3529662a540efc9713b9c8f56601cffa))
* address PR review comments ([bbd258f](https://github.com/Dahgoth/kompmaster-server/commit/bbd258fecaaf661c8574150509ea15a99ba8ef62))
* address remaining PR review comments ([3b79277](https://github.com/Dahgoth/kompmaster-server/commit/3b792774352303f5b3b06f295524e287270ea781))
* **advisoryLock:** pass bigint string through, add empty rows guard ([12cca22](https://github.com/Dahgoth/kompmaster-server/commit/12cca220e716623014c316379521021479d57ffb))
* **api:** close uuid 22P02 crash class with shared isUuid guard ([44a5627](https://github.com/Dahgoth/kompmaster-server/commit/44a56272e0dc9a6a799269557a4d49899246ad7d))
* **backend:** correct slug transliteration and guarantee slug uniqueness ([efb26af](https://github.com/Dahgoth/kompmaster-server/commit/efb26af138f9e0d084a590ae90c14cb50f487645))
* **ci:** migrate to googleapis/release-please-action@v5; fix pnpm; Node 24 ([#62](https://github.com/Dahgoth/kompmaster-server/issues/62)) ([95c568f](https://github.com/Dahgoth/kompmaster-server/commit/95c568fb80ec9dfdfe337140c7e29a4941f0872f))
* **ci:** replace third-party actions with GitHub built-ins + fix action pinning ([#58](https://github.com/Dahgoth/kompmaster-server/issues/58)) ([e9769e3](https://github.com/Dahgoth/kompmaster-server/commit/e9769e390146f6eda41e18648050232cf74535fe))
* **deps:** adopt maintained SheetJS CE release for price import ([3758356](https://github.com/Dahgoth/kompmaster-server/commit/3758356e71112e75a0245312207b5dba6aaed0ff))
* **security:** place admin rate limiters first in route chains ([dc6bd1b](https://github.com/Dahgoth/kompmaster-server/commit/dc6bd1b5373c1711f59b30d69e7f6afc7fcf6a78))
* **security:** rate-limit admin panel endpoints ([d83cfdf](https://github.com/Dahgoth/kompmaster-server/commit/d83cfdfd18a2296661b98b9f3643db44ba68a335))
* **security:** rate-limit public order creation ([bdafb03](https://github.com/Dahgoth/kompmaster-server/commit/bdafb03b342276a03e2a475e42465ed3c3584a8b))
