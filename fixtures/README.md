# Fixture provenance

Source: https://pobb.in/GPdtCXiBXmT- — public level 93 Explosive Grenade Gemling Legionnaire, tree 0.5, retrieved 2026-09-25 through the raw export route used by PoB2 itself. `gemling.xml` preserves the source's calculation state; the prose Notes section was removed. It is not the user's character and not asserted to be a correct guide.

The pinned PoB run of that source reports negative unreserved spirit and too many skill groups. Tests deliberately preserve and check those failures. PoB also reports unsupported modifiers on several equipped items; the UI exposes them.

`current.xml` and `target.xml` are explicitly **derived demo loadouts**. `scripts/make-fixtures.py` reproduces them from the source:

- Remove ungranted Blasphemy, Eternal Rage and Berserk groups; leave granted groups, all other skills, configuration, passives and non-helmet equipment intact.
- Replace the active helmet with a rare Viper Cap with life/evasion and strength/dexterity/intelligence suffixes.
- Reference variant has stronger life/evasion and attribute rolls.

`candidates.json` contains constructed, realistic-format rare helmets using real PoE2 bases and ordinary modifiers, not live market listings. Prices of 8/5/3 exalted are illustrative, not checked market offers. One helmet trades away attributes and fails the build's dexterity requirement. Import real listing text to validate your actual purchases. No unsupported baseline modifiers are removed from the fixtures to manufacture clean results.
