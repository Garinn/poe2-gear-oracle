import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { importBuild } from "../src/import.js";
import { metricDeltas, checkConstraints, rank } from "../src/evaluate.js";
import { parseWorkerOutput } from "../src/pob.js";
import { ManualCandidateProvider } from "../src/candidates.js";
import { requestSchema } from "../src/service.js";
import type { Snapshot, Evaluation } from "../src/domain.js";
const xml = readFileSync("fixtures/current.xml", "utf8");
const s: Snapshot = {
  metrics: {
    FireResist: 75,
    ColdResist: 75,
    LightningResist: 75,
    ChaosResist: 0,
    Str: 100,
    ReqStr: 100,
    Dex: 80,
    ReqDex: 70,
    Int: 60,
    ReqInt: 40,
    SpiritUnreserved: 0,
    ManaUnreserved: 30,
    LifeUnreserved: 100,
  },
  equipment: [],
  skills: [],
  warnings: [],
  metadata: {},
};
const c = { elementalFloor: 75, chaosFloor: 0, minSpirit: 0 };
test("imports XML and compressed URL-safe PoB2 codes; rejects other formats", () => {
  assert.equal(importBuild(xml), xml.trim());
  assert.equal(importBuild(deflateSync(xml).toString("base64url")), xml);
  for (const bad of [
    "<PathOfBuilding/>",
    "https://pobb.in/abc",
    "{}",
    "nonsense",
    "<!DOCTYPE x><PathOfBuilding2/>",
    "<PathOfBuilding2>",
  ])
    assert.throws(() => importBuild(bad));
});
test("bounded decompression refuses oversized exports", () =>
  assert.throws(() =>
    importBuild(deflateSync("x".repeat(2_100_000)).toString("base64url")),
  ));
test("worker protocol tolerates PoB logs, fails closed on error/missing/malformed data", () => {
  assert.deepEqual(
    parseWorkerOutput(
      "Startup logs\nGEAR_ORACLE_JSON:" + JSON.stringify(s) + "\n",
    ),
    s,
  );
  for (const bad of [
    "logs only",
    'GEAR_ORACLE_JSON:{"error":"bad build"}',
    'GEAR_ORACLE_JSON:{"metrics":{"Life":"oops"}}',
  ])
    assert.throws(() => parseWorkerOutput(bad));
});
test("metric deltas preserve losses, zero denominators and missing values", () => {
  const d = metricDeltas(
    { Life: 100, EnergyShield: 0, Armour: 20 },
    { Life: 80, EnergyShield: 30 },
  );
  assert.equal(d.Life.percent, -20);
  assert.equal(d.EnergyShield.percent, null);
  assert.equal(d.EnergyShield.absolute, 30);
  assert.equal(d.Armour, undefined);
});
test("caps, attributes and reservation constraints use recalculated values", () => {
  assert.deepEqual(checkConstraints(s, c), { violations: [], review: [] });
  const d = checkConstraints(
    {
      ...s,
      metrics: { ...s.metrics, ColdResist: 74, Dex: 69, SpiritUnreserved: -1 },
    },
    c,
  );
  assert.equal(d.violations.length, 3);
  assert.equal(
    checkConstraints(
      { ...s, metrics: { ...s.metrics, FireResistTotal: 180 } },
      c,
    ).violations.length,
    0,
  );
});
test("unsupported modifiers and upstream warnings prevent a clean viability claim", () => {
  assert.equal(
    checkConstraints(
      {
        ...s,
        warnings: ["too many skills"],
        equipment: [
          {
            slot: "Helmet",
            name: "Rare",
            raw: "",
            rarity: "RARE",
            unsupported: ["unknown mod"],
          },
        ],
      },
      c,
    ).review.length,
    2,
  );
});
const make = (
  id: string,
  damage: number,
  ehp: number,
  eligible = true,
  price = 5,
): Evaluation => ({
  candidate: { id, name: id, text: "item", price, currency: "exalted" },
  deltas: metricDeltas(
    { CombinedDPS: 100, TotalEHP: 100 },
    { CombinedDPS: 100 + damage, TotalEHP: 100 + ehp },
  ),
  violations: eligible ? [] : ["constraint"],
  review: [],
  eligible,
  score: 0,
  explanation: [],
});
test("viability first, explicit damage/defence trade-off, price tie-break, stable order", () => {
  const a = rank(
    [
      make("unsafe", 100, 100, false),
      make("defence", 2, 10),
      make("damage", 10, 2),
      make("cheap", 10, 2, true, 3),
    ],
    "CombinedDPS",
    0.8,
  );
  assert.deepEqual(
    a.map((x) => x.candidate.id),
    ["cheap", "damage", "defence", "unsafe"],
  );
  assert.equal(a[0].score, 8.4);
  assert.match(a[0].explanation[0], /80%/);
});
test("zero metric cannot silently win ranking", () => {
  const a = make("zero", 1, 1);
  a.deltas.CombinedDPS.percent = null;
  assert.equal(rank([a], "CombinedDPS", 0.5)[0].eligible, false);
});
test("manual candidates respect budget without converting currencies", async () => {
  assert.equal(
    (
      await new ManualCandidateProvider().findCandidates({
        budget: 4,
        candidates: [make("expensive", 0, 0).candidate],
      })
    ).length,
    0,
  );
});
test("request boundary rejects negative prices, other slots and excessive batches", () => {
  const valid = {
    current: xml,
    target: xml,
    slot: "Helmet",
    budget: 30,
    offence: 0.5,
    dpsMetric: "CombinedDPS",
    constraints: c,
    candidates: [
      { ...make("a", 0, 0).candidate, text: "Rarity: RARE\nHelmet text" },
    ],
  };
  assert.equal(requestSchema.safeParse(valid).success, true);
  for (const invalid of [
    { ...valid, slot: "Ring" },
    { ...valid, candidates: [{ ...valid.candidates[0], price: -1 }] },
    { ...valid, candidates: Array(13).fill(valid.candidates[0]) },
  ])
    assert.equal(requestSchema.safeParse(invalid).success, false);
});
