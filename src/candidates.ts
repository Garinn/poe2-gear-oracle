import type {
  CandidateProvider,
  CandidateRequest,
  Snapshot,
  Constraints,
  BuildEvaluator,
  BuildState,
  Metrics,
} from "./domain.js";
export class ManualCandidateProvider implements CandidateProvider {
  async findCandidates(r: CandidateRequest) {
    return r.candidates.filter((c) => c.price <= r.budget);
  }
}
export interface SearchPlan {
  tradeUrl: string;
  instructions: string[];
  needs: { label: string; minimum: number }[];
  priorities: {
    label: string;
    dpsPercent: number | null;
    ehpPercent: number | null;
  }[];
  targetNotes: string[];
}
export async function discovery(
  evaluator: BuildEvaluator,
  build: BuildState,
  target: Snapshot,
  c: Constraints,
): Promise<SearchPlan> {
  const naked = await evaluator.evaluateReplacement(build, "Helmet", null);
  const needs = [];
  for (const [label, key, floor] of [
    ["Fire resistance", "FireResistTotal", c.elementalFloor],
    ["Cold resistance", "ColdResistTotal", c.elementalFloor],
    ["Lightning resistance", "LightningResistTotal", c.elementalFloor],
    ["Chaos resistance", "ChaosResistTotal", c.chaosFloor],
  ] as const) {
    if (Number.isFinite(naked.metrics[key]))
      needs.push({
        label,
        minimum: Math.max(0, Math.ceil(floor - naked.metrics[key])),
      });
  }
  for (const [label, key] of [
    ["Strength", "Str"],
    ["Dexterity", "Dex"],
    ["Intelligence", "Int"],
  ] as const)
    needs.push({
      label,
      minimum: Math.max(
        0,
        (naked.metrics["Req" + key] ?? 0) - (naked.metrics[key] ?? 0),
      ),
    });
  const es = (target.metrics.EnergyShield ?? 0) > (target.metrics.Life ?? 0);
  const priorities = [];
  for (const [label, mod] of [
    [
      es ? "+40 maximum ES" : "+50 maximum life",
      es ? "+40 to maximum Energy Shield" : "+50 to maximum Life",
    ],
    ["+10 all attributes", "+10 to all Attributes"],
    ["+10% increased damage", "10% increased Damage"],
  ]) {
    const probe = await evaluator.probe(build, mod);
    const pct = (key: string) =>
      build.baseline.metrics[key]
        ? (100 * (probe.metrics[key] - build.baseline.metrics[key])) /
          build.baseline.metrics[key]
        : null;
    priorities.push({
      label,
      dpsPercent: pct("CombinedDPS"),
      ehpPercent: pct("TotalEHP"),
    });
  }
  const targetNotes = [
    `Reference selected skill: ${target.metadata.mainSkill}. Current selected skill: ${build.baseline.metadata.mainSkill}.`,
    es
      ? "Reference is ES-led; include ES bases in your shortlist."
      : "Reference is life-led; compare life rolls and the defensive base.",
  ];
  const helmet = target.equipment.find((i) => i.slot === "Helmet");
  if (helmet?.rarity === "UNIQUE")
    targetNotes.push(
      `Reference helmet is ${helmet.name}. V1 ranks rare alternatives; check build-defining unique effects manually.`,
    );
  if (
    build.baseline.equipment.find((i) => i.slot === "Helmet")?.rarity ===
    "UNIQUE"
  )
    targetNotes.push(
      "Replacing a unique helmet: PoB recalculates supported effects, but unique-dependent behavior needs your review.",
    );
  return {
    tradeUrl: "https://www.pathofexile.com/trade2/search/poe2/Standard",
    needs,
    priorities,
    targetNotes,
    instructions: [
      "On the official trade page: Standard league, rare helmets, buyout in exalted orbs, maximum your budget.",
      "Use the deficits below as rough combined needs, not exact modifier requirements. All-elemental resistance and all-attribute modifiers can cover several needs.",
      "Start broad with life OR energy shield and useful defensive bases. Shortlist different combinations; do not copy the reference helmet’s individual rolls.",
      "Paste each complete English item text, including quality, requirements and rune modifiers, with its listed price. Compare recalculations below.",
      "Probes add global modifiers to the current build. They indicate direction only; local helmet modifiers and thresholds can behave differently.",
    ],
  };
}
