# Validation — 2026-09-25

Executed against the pinned PoB2 commit `ce566eac45ea8a86477f513c7ee65a1ebe60014e`.

## Passed

- Strict TypeScript/Vue type checking and Vite production build.
- 10 automated tests: XML/share import, malformed/oversized input, worker framing and errors, numeric deltas, thresholds, unsupported data warnings, ranking, zero denominators, budget filtering and request validation.
- 2 real-PoB integration suites: baseline and identity replacement, candidate independence, increased life, dexterity failure, wrong-slot rejection, original public export warnings, and full reference → discovery → candidates → ranking workflow.
- Chromium mobile UI at 390 × 844 and desktop at 1280 × 900. Full demo submitted through the browser to the real Node/Lua backend, three results rendered, dexterity failure visible, no JavaScript errors, no horizontal overflow. Manual item entry and stale-result invalidation verified.

Tested engine/runtime: locally compiled LuaJIT `c6ffc141a8762b41703f9287d63d93622a13dd8f` and lua-utf8 `a47b1433473a2509d77ad28f59a976716d187927`, Node 24.19.0. Docker targets Node 22 and distribution LuaJIT.

## Observed demo results

Default selected-skill CombinedDPS / EHP weighting is 50/50.

| Candidate | Illustrative price | Life delta | DPS change | EHP change | Checks |
|---|---:|---:|---:|---:|---|
| Empyrean Shelter | 8 ex | +103 | 0% | +5.18% | Quantified constraints pass; inherited unsupported effects require review |
| Gale Shelter | 5 ex | +61 | 0% | +4.03% | Quantified constraints pass; inherited unsupported effects require review |
| Hollow Shelter | 3 ex | +61 | −2.12% | +5.31% | Excluded: dexterity 74 < 85 |

The life deltas differ from the helmet's literal life-affix differences because PoB also recalculates attribute and passive interactions. The item with the highest EHP is not a viable upgrade because it breaks a requirement.

## Not claimed

- Docker build/runtime was not executed: no Docker daemon was available. Its Lua dependency recipe mirrors the tested native setup, but users may encounter platform/package-specific differences.
- No real-time listing acquisition, prices, or user character were tested. The public build is real; demo helmets and prices are clearly labelled constructed fixtures.
- PoB has unsupported modifiers and assumptions. A numeric output is not proof of in-game accuracy for every mechanic.
- No live mobile device or actual Steam Deck was used; browser viewport QA is not a hardware test.
