import type {
  Metrics,
  Delta,
  Snapshot,
  Constraints,
  Evaluation,
  DpsMetric,
} from "./domain.js";
export const displayedMetrics = [
  "CombinedDPS",
  "TotalDPS",
  "FullDPS",
  "AverageDamage",
  "TotalEHP",
  "PhysicalMaximumHitTaken",
  "FireMaximumHitTaken",
  "ColdMaximumHitTaken",
  "LightningMaximumHitTaken",
  "ChaosMaximumHitTaken",
  "Life",
  "EnergyShield",
  "Armour",
  "Evasion",
  "FireResist",
  "ColdResist",
  "LightningResist",
  "ChaosResist",
  "FireResistTotal",
  "ColdResistTotal",
  "LightningResistTotal",
  "ChaosResistTotal",
  "Str",
  "Dex",
  "Int",
  "ReqStr",
  "ReqDex",
  "ReqInt",
  "Spirit",
  "SpiritUnreserved",
  "ManaUnreserved",
  "LifeUnreserved",
  "MovementSpeedMod",
];
export function metricDeltas(
  before: Metrics,
  after: Metrics,
): Record<string, Delta> {
  return Object.fromEntries(
    displayedMetrics
      .filter((k) => Number.isFinite(before[k]) && Number.isFinite(after[k]))
      .map((k) => [
        k,
        {
          before: before[k],
          after: after[k],
          absolute: after[k] - before[k],
          percent:
            before[k] === 0
              ? null
              : ((after[k] - before[k]) / Math.abs(before[k])) * 100,
        },
      ]),
  );
}
export function checkConstraints(
  s: Snapshot,
  c: Constraints,
): { violations: string[]; review: string[] } {
  const m = s.metrics,
    violations: string[] = [],
    review: string[] = [];
  for (const element of ["Fire", "Cold", "Lightning"]) {
    const key = element + "Resist";
    if (m[key] === undefined) review.push(`PoB did not report ${key}.`);
    else if (m[key] < c.elementalFloor)
      violations.push(
        `${element} resistance ${m[key].toFixed(1)}% is below ${c.elementalFloor}%.`,
      );
  }
  if (m.ChaosResist === undefined)
    review.push("PoB did not report chaos resistance.");
  else if (m.ChaosResist < c.chaosFloor)
    violations.push(
      `Chaos resistance ${m.ChaosResist.toFixed(1)}% is below ${c.chaosFloor}%.`,
    );
  for (const attr of ["Str", "Dex", "Int"]) {
    if (m[attr] === undefined || m["Req" + attr] === undefined)
      review.push(`PoB did not report ${attr} requirements.`);
    else if (m[attr] < m["Req" + attr])
      violations.push(
        `${attr} ${m[attr]} is below PoB requirement ${m["Req" + attr]}.`,
      );
  }
  for (const [key, floor] of [
    ["SpiritUnreserved", c.minSpirit],
    ["ManaUnreserved", 0],
    ["LifeUnreserved", 1],
  ] as const) {
    if (m[key] === undefined) review.push(`PoB did not report ${key}.`);
    else if (m[key] < floor)
      violations.push(`${key}: ${m[key]} (minimum ${floor}).`);
  }
  // Preserve upstream warnings; do not attempt to reimplement their conditions.
  review.push(...s.warnings.map((w) => `PoB warning: ${w}`));
  for (const item of s.equipment)
    for (const line of item.unsupported)
      review.push(
        `${item.slot}: unsupported or partially parsed modifier: ${line}`,
      );
  return { violations: [...new Set(violations)], review: [...new Set(review)] };
}
export function rank(
  evaluations: Evaluation[],
  dps: DpsMetric,
  offence: number,
): Evaluation[] {
  const defence = 1 - offence;
  for (const e of evaluations) {
    const damage = e.deltas[dps]?.percent,
      ehp = e.deltas.TotalEHP?.percent;
    if (damage == null || ehp == null) {
      e.review.push(
        "Selected damage or EHP metric is unavailable/zero; percentage ranking is not reliable.",
      );
      e.eligible = false;
    }
    e.score = (damage ?? 0) * offence + (ehp ?? 0) * defence;
    e.explanation = [
      `${Math.round(offence * 100)}% × damage change (${damage?.toFixed(2) ?? "n/a"}%) + ${Math.round(defence * 100)}% × EHP change (${ehp?.toFixed(2) ?? "n/a"}%) = ${e.score.toFixed(2)}.`,
      e.violations.length
        ? "Excluded by your requirements."
        : e.review.length
          ? "Needs review before purchase."
          : e.score > 0
            ? "Improves your selected damage/defence balance."
            : "Does not improve your selected damage/defence balance.",
    ];
  }
  return evaluations.sort(
    (a, b) =>
      Number(b.eligible) - Number(a.eligible) ||
      Number(!!a.error) - Number(!!b.error) ||
      b.score - a.score ||
      a.candidate.price - b.candidate.price ||
      a.candidate.id.localeCompare(b.candidate.id),
  );
}
