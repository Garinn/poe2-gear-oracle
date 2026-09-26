import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PobEvaluator } from "../src/pob.js";
import { runWorkflow } from "../src/service.js";
import { checkConstraints } from "../src/evaluate.js";
const enabled = process.env.POB_INTEGRATION === "1";
const current = readFileSync("fixtures/current.xml", "utf8"),
  target = readFileSync("fixtures/target.xml", "utf8");
const candidates = JSON.parse(readFileSync("fixtures/candidates.json", "utf8"));
const constraints = { elementalFloor: 75, chaosFloor: 0, minSpirit: 0 };
test(
  "real PoB replacement, isolation, identity, invalid items and original-build warnings",
  { skip: !enabled, timeout: 180_000 },
  async () => {
    const p = new PobEvaluator();
    const b = await p.loadBuild(current);
    assert.ok(b.baseline.metrics.CombinedDPS > 1000);
    assert.equal(b.baseline.metadata.mainSkill, "Explosive Grenade");
    assert.deepEqual(checkConstraints(b.baseline, constraints).violations, []);
    assert.ok(
      checkConstraints(b.baseline, constraints).review.length > 0,
      "Existing upstream unsupported modifiers remain visible",
    );
    const helmet = b.baseline.equipment.find((i) => i.slot === "Helmet")!;
    const identical = await p.evaluateReplacement(b, "Helmet", {
      text: helmet.raw,
    });
    for (const k of [
      "CombinedDPS",
      "TotalEHP",
      "Life",
      "Str",
      "SpiritUnreserved",
    ])
      assert.equal(identical.metrics[k], b.baseline.metrics[k], k);
    const better = await p.evaluateReplacement(b, "Helmet", {
      text: candidates[0].text,
    });
    assert.ok(better.metrics.Life > b.baseline.metrics.Life);
    const broken = await p.evaluateReplacement(b, "Helmet", {
      text: candidates[2].text,
    });
    assert.ok(
      checkConstraints(broken, constraints).violations.some((v) =>
        v.startsWith("Dex"),
      ),
    );
    const reset = await p.evaluateReplacement(b, "Helmet", {
      text: helmet.raw,
    });
    assert.equal(reset.metrics.Life, b.baseline.metrics.Life);
    await assert.rejects(
      () =>
        p.evaluateReplacement(b, "Helmet", {
          text: "Rarity: RARE\nRing\nGold Ring\nImplicits: 0\n+50 to maximum Life",
        }),
      /helmet/,
    );
    const original = await p.loadBuild(
      readFileSync("fixtures/gemling.xml", "utf8"),
    );
    assert.ok(original.baseline.metrics.SpiritUnreserved < 0);
    assert.ok(original.baseline.warnings.length > 0);
  },
);
test(
  "entire workflow uses live PoB, returns search guidance and ranks viable replacements",
  { skip: !enabled, timeout: 240_000 },
  async () => {
    const r = await runWorkflow({
      current,
      target,
      slot: "Helmet",
      budget: 30,
      offence: 0.5,
      dpsMetric: "CombinedDPS",
      constraints,
      candidates,
    });
    assert.equal(r.results.length, 3);
    assert.equal(r.results[0].candidate.id, "balanced");
    assert.equal(r.results[0].eligible, true);
    assert.equal(r.results[2].candidate.id, "broken");
    assert.equal(r.results[2].eligible, false);
    assert.equal(r.search.priorities.length, 3);
    assert.ok(
      r.search.needs.some((n) => n.label === "Dexterity" && n.minimum > 0),
    );
    console.log(
      JSON.stringify(
        r.results.map((x) => ({
          name: x.candidate.name,
          eligible: x.eligible,
          life: x.deltas.Life?.absolute,
          dps: x.deltas.CombinedDPS?.percent,
          ehp: x.deltas.TotalEHP?.percent,
          violations: x.violations,
          review: x.review,
        })),
        null,
        2,
      ),
    );
  },
);
