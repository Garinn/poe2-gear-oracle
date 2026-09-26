# Verified research and implementation decisions

Research performed 2026-09-25 against primary sources and the checked-out upstream revision. Initial plan was established before application implementation; this file records the evidence and implemented decisions.

## PoB2 invocation: verified, then executed

Repository: https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2

Pinned revision: `ce566eac45ea8a86477f513c7ee65a1ebe60014e` (dev snapshot; upgrading is explicit).

Source links below are relative to that revision:

- [HeadlessWrapper.lua](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/blob/ce566eac45ea8a86477f513c7ee65a1ebe60014e/src/HeadlessWrapper.lua): initializes SimpleGraphic stubs, `Launch.lua`, OnInit/OnFrame; exposes `build`, `newBuild()` and `loadBuildFromXML(xml, name)`. This is an upstream headless harness, not a stable public calculation API.
- [.busted](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/blob/ce566eac45ea8a86477f513c7ee65a1ebe60014e/.busted) and [.github/workflows/test.yml](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/blob/ce566eac45ea8a86477f513c7ee65a1ebe60014e/.github/workflows/test.yml): upstream runs system tests under LuaJIT with that helper.
- [Classes/Item.lua](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/blob/ce566eac45ea8a86477f513c7ee65a1ebe60014e/src/Classes/Item.lua): `new('Item'):Item(raw)` is the native parser. Base/type/rarity validation and unparsed modifier information are available.
- [Classes/ItemsTab.lua](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/blob/ce566eac45ea8a86477f513c7ee65a1ebe60014e/src/Classes/ItemsTab.lua) and `ItemSlotControl.lua`: `AddItem(item,true)` disables auto-equip; `slots.Helmet:SetSelItemId(item.id)` updates both UI slot and active item set. `PopulateSlots()` synchronizes slots. Runes and socketed jewels have separate state.
- [Modules/CalcPerform.lua](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/blob/ce566eac45ea8a86477f513c7ee65a1ebe60014e/src/Modules/CalcPerform.lua): PoB calculates attribute requirement outputs and handles requirement-changing mechanics. Application compares these outputs; it does not derive requirements from affixes.
- `Modules/Build.lua`, `CalcsTab.lua`, `BuildDisplayStats.lua`: marking build/mod flags and invoking OnFrame recalculates `build.calcsTab.mainOutput`; upstream build warnings are exposed through `build.controls.warnings.lines`.

Chosen adapter: a small Lua wrapper around the existing headless harness. No patches to upstream. Node starts one process per calculation so globals, caches and candidate modifications cannot leak into other evaluations. stdin JSON carries XML and optional candidate; a marked JSON result on stdout separates structured results from startup logs. Time/output limits and schema validation fail closed. Revision verification prevents silently labelling a different engine version as tested.

Native runtime was compiled and run in this environment using LuaJIT and `lua-utf8`. PoB's bundled JSON/XML modules cover the remaining requirements. Headless compression stubs are deliberately avoided: Node only decodes zlib/base64 transport; it performs no game arithmetic.

## Imports

| Source | Evidence | V1 decision |
|---|---|---|
| Saved PoB2 XML | `Modules/Build.lua` loads/saves `PathOfBuilding2` root and loadouts | Direct import; current and reference use same path |
| PoB share code | `Classes/ImportTab.lua`: base64 URL-safe form of deflated XML | Decode with size limit, then validate XML |
| pobb.in | `Modules/BuildSiteTools.lua` contains `pobb.in/pob/<id>` import route | User imports link through PoB2 and exports code; no arbitrary URL fetch in app |
| Official character data | https://www.pathofexile.com/developer/docs/reference#characters-get and headless `loadBuildFromJSON` | Supported by upstream but imported character lacks correct main skill/configuration; defer OAuth |
| Mobalytics `.build` | https://mobalytics.gg/poe-2/guides/build-files | Download for in-game planner; not assumed to be a PoB state |
| Official `.build` schema | https://www.pathofexile.com/developer/docs/game | JSON guide format includes passive/skill IDs and inventory hints; lacks complete configured calculation state |

PoB2's `Modules/BuildExportPoE2.lua` exports the in-game format. An export feature is not evidence of a lossless reverse importer. No Mobalytics scraping or speculative conversion was implemented.

## Trade and OAuth policy

Primary source: https://www.pathofexile.com/developer/docs (Available Resources, Getting Started, Developer Guidelines) and https://www.pathofexile.com/developer/docs/reference.

On the research date, GGG documents support only for listed resources, says reverse-engineering endpoints outside its documentation violates its terms, and says new application registrations cannot currently be processed. The documented resource list includes character data and currency exchange history; it does not offer general rare-item trade search/fetch endpoints. Public stash access is labelled PoE1-only.

Consequently: no calls to internal `/api/trade2` endpoints and no scraping. The UI links to the official Standard trade page, gives human-readable search guidance, and accepts user-selected item text. It does not claim to generate a server-side saved search or prefill undocumented query schemas. Manual acquisition is the replaceable V1 provider. Existing tools' use of internal endpoints is not treated as permission for this application.

## Licensing

https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/blob/ce566eac45ea8a86477f513c7ee65a1ebe60014e/LICENSE.md contains the MIT permission notice and multiple third-party notices. Full notices are retained. The upstream source/data is downloaded during setup rather than copied into this repository. Item/tree data remains GGG-owned as its source headers state. A separate original-app MIT licence does not relicense upstream game data or public builds.

## Vertical slice and implementation sequence

1. Exercise upstream harness with a real public export; establish reproducible runtime and revision.
2. Implement isolated baseline/replacement/probe operations and JSON protocol. Preserve current configuration. Clear old helmet augment state.
3. Import current/reference XML or share codes. Keep `TargetBuild` source-neutral.
4. Calculate helmet-removal deficits and simple PoB marginal probes. Reference ES/life emphasis and unique/skill information guide discovery; no target-mod minima.
5. Accept a manual candidate batch, recalculate each, enforce user thresholds, expose warnings and metric deltas, then rank transparently.
6. Mobile Vue UI, fixtures, real-worker integration tests and reproducible setup package.

No database, queue service, OAuth integration or hosted Lua service was needed. Replacing the provider or target importer does not change final evaluation.

## Deliberate conservative behavior

Quantified threshold violations exclude a candidate. Unknown candidate helmet modifiers or new upstream warnings also prevent an eligible result. Inherited unsupported modifiers remain review notes and make every purchase recommendation conditional; they are not silently removed to make a fixture pass. Existing baseline violations are reported before results. Missing metrics are not treated as zero improvements.

The reference influences search direction, not final candidate damage/defence formulas. Three probes are deliberately rough; this validates the evaluation loop rather than trying to solve market-wide optimization.
