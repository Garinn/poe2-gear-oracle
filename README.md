# Gear Oracle — PoE2 helmet upgrades

A local, mobile-first Vue + TypeScript prototype. Import current and reference **PoB2 XML/share codes**, enter rare helmet listings, and compare real PoB recalculations. No game calculation logic is implemented in TypeScript. No automated trade requests, accounts, or hosted service.

## Run (recommended: Docker)

Requires Docker Compose, internet during first build, and roughly 2 GB RAM. From this folder:

```sh
docker compose up --build
```

Open `http://localhost:3000`. On your phone, open `http://YOUR-COMPUTER-LAN-IP:3000` while on the same trusted Wi-Fi. Allow port 3000 through your local firewall if needed. This unauthenticated prototype is for your trusted LAN; do not expose it publicly. Docker is also the recommended Windows path.

Click **Load example build**, then **Find upgrades**. The first comparison takes around a minute on the tested environment. All numbers come from live PoB. Nothing is mocked when the worker is unavailable: evaluation returns an error.

## Native setup (Linux / WSL)

Node 22+, npm, git, LuaJIT 2.1, and the `lua-utf8` C module for LuaJIT/Lua 5.1. On distributions with LuaRocks, install `luautf8` for Lua 5.1, or follow the pinned source compilation in the Dockerfile. No other native Lua modules are needed; PoB supplies its XML and JSON libraries.

```sh
npm ci
npm run setup:pob
npm run dev
```

`npm run build` creates the Vue production assets. `npm start` serves those if available, otherwise uses Vite middleware. Set `HOST=0.0.0.0` for phone access. Default is `127.0.0.1:3000`.

Optional environment variables: `POB_ROOT` (absolute path to the pinned PoB checkout), `LUAJIT` (binary path), `LUA_CPATH` (custom Lua module path), `HOST`, `PORT`. The adapter verifies the PoB Git commit before calculations. Upstream code is downloaded separately and not bundled in this archive.

## Your actual build

1. In **Path of Building Community PoE2**, import your character and configure skill selection, enemy conditions, buffs, item set and weapon set accurately. Export a share code or save its XML.
2. Import that export here and a PoB2 reference build. For pobb.in, import its link into PoB2 first, then export. Mobalytics `.build` JSON is not supported directly: it is an in-game guide, not a fully configured calculation state.
3. Select your damage metric and hard requirements. Defaults: elemental resistances ≥75%, chaos ≥0%, unreserved spirit ≥0. Change these for your build; they are user policy, not game rules.
4. Generate search guidance, open official trade, shortlist different rare helmet combinations, and paste complete **English** item text plus prices. Use **Standard** league and **exalted orbs**. There is no currency conversion or live price check.
5. Find upgrades. Inspect deltas and every warning before purchasing. Full DPS requires PoB's full-DPS groups to be configured; selected-skill CombinedDPS is the default.

## What ranking means

Each candidate is equipped into a fresh copy of the current build, preserving current skills, passives and configuration. The reference build never replaces them. Existing helmet runes and helmet socketed jewels are cleared; candidate rune modifiers must be in its text. Other equipment stays intact.

Sort: candidates without hard violations, unsupported candidate helmet modifiers or new PoB warnings first; then `offenceWeight × damageChange% + (1 − offenceWeight) × EHPChange%`; lower price breaks ties. Missing/zero damage or EHP prevents a trustworthy percentage rank. The formula and component deltas are visible. Resistance and attribute thresholds are checked separately, never rewarded linearly. The app can correctly conclude that none of the candidates improves your selected balance.

Unchanged unsupported modifiers elsewhere in the build remain visible as **Needs review**. They do not prevent relative ordering, but the app never calls that result fully verified. A unique current helmet also triggers manual review. This is deliberate: PoB's own support coverage limits the oracle.

## Boundaries

- `src/import.ts`: bounded share-code decompression and PoB2 XML validation.
- `src/pob.ts`, `worker/evaluate.lua`: `BuildEvaluator`, narrow process protocol, upstream load/parse/equip/recalculate operations.
- `src/candidates.ts`: replaceable `CandidateProvider`; manual listings in V1. Helmet-removal deficits and three real PoB probes guide discovery.
- `src/domain.ts`: source-neutral `TargetBuild`, equipment/skills/metadata and evaluator contracts. PoB snapshot is one implementation; no Mobalytics coupling.
- `src/evaluate.ts`: comparisons, user thresholds and transparent ranking; no combat formulas.
- `src/service.ts`: one complete workflow; `src/server.ts`: same-origin API, request limits, one evaluation at a time.
- `web/`: mobile UI. No build persistence; refresh clears inputs.

PoB is pinned to `ce566eac45ea8a86477f513c7ee65a1ebe60014e`. See [research and decisions](docs/RESEARCH.md), [fixture provenance](fixtures/README.md), and [validation](docs/VALIDATION.md).

## Tests

```sh
npm test             # imports, protocol, constraints, deltas, ranking, providers
npm run test:pob     # real worker; requires setup:pob + Lua runtime
npm run build        # strict TS/Vue checking + production build
```

The integration tests use a real public Gemling export, verify identical replacement, independence between candidates, a broken attribute requirement, and the entire workflow. Docker builds include development dependencies so tests can also run using `docker compose run --rm gear-oracle npm run test:pob`.

## Limits

Rare helmets, one current loadout, Standard league, manual prices, up to 12 candidates. Candidate discovery is heuristic and does not guarantee the best market item. Probe damage modifiers are generic global perturbations, not promised helmet affixes. No crafting, purchasing, currency conversion, Mobalytics reverse engineering or automated trade access.

V1 ranks selected player damage and EHP; specialized minion, trigger, ailment and multi-skill objectives require careful PoB configuration and may need an additional metric adapter. The app cannot prove every special unique dependency, uptime assumption, ailment immunity or game-specific condition. EHP is scenario dependent; maximum-hit and other component metrics are also shown. Unsupported/partially parsed mods and upstream warnings remain visible. Two weapon sets are not optimized simultaneously.

The provided Dockerfile has the tested Lua dependencies, but this environment cannot run Docker itself. See validation notes for what was actually executed.

## Notices

PoB2 is MIT-licensed; its full upstream third-party notices are retained in `docs/POB-LICENSE.md`. The application is MIT-licensed (`LICENSE`). GGG game data/assets have separate ownership; no permission to reuse GGG branding is implied. This product isn't affiliated with or endorsed by Grinding Gear Games in any way.
