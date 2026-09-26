import { z } from "zod";
import { importBuild } from "./import.js";
import { PobEvaluator, POB_REVISION } from "./pob.js";
import { ManualCandidateProvider, discovery } from "./candidates.js";
import { checkConstraints, metricDeltas, rank } from "./evaluate.js";
import type {
  BuildEvaluator,
  Evaluation,
  CandidateProvider,
} from "./domain.js";
export const requestSchema = z.object({
  current: z.string().max(2_000_000),
  target: z.string().max(2_000_000),
  slot: z.literal("Helmet"),
  budget: z.number().finite().nonnegative().max(1e8),
  offence: z.number().min(0).max(1),
  dpsMetric: z.enum(["CombinedDPS", "TotalDPS", "FullDPS", "AverageDamage"]),
  constraints: z.object({
    elementalFloor: z.number().min(-200).max(100),
    chaosFloor: z.number().min(-200).max(100),
    minSpirit: z.number().min(0).max(1e5),
  }),
  candidates: z
    .array(
      z.object({
        id: z.string().max(100),
        name: z.string().min(1).max(120),
        text: z.string().min(10).max(20000),
        price: z.number().finite().nonnegative().max(1e8),
        currency: z.literal("exalted"),
        url: z
          .string()
          .url()
          .refine(
            (u) => u.startsWith("https://www.pathofexile.com/trade2/"),
            "Use an official trade link.",
          )
          .optional(),
      }),
    )
    .max(12),
});
export async function runWorkflow(
  input: unknown,
  evaluator: BuildEvaluator = new PobEvaluator(),
  provider: CandidateProvider = new ManualCandidateProvider(),
) {
  const r = requestSchema.parse(input);
  if (new Set(r.candidates.map((c) => c.id)).size !== r.candidates.length)
    throw Error("Candidate IDs must be unique.");
  const build = await evaluator.loadBuild(importBuild(r.current));
  const target = (await evaluator.loadBuild(importBuild(r.target))).baseline;
  const baselineChecks = checkConstraints(build.baseline, r.constraints);
  const search = await discovery(evaluator, build, target, r.constraints);
  const candidates = await provider.findCandidates(r);
  const results: Evaluation[] = [];
  for (const candidate of candidates) {
    try {
      const snapshot = await evaluator.evaluateReplacement(build, r.slot, {
        text: candidate.text,
      });
      const checks = checkConstraints(snapshot, r.constraints);
      const beforeHelmet = build.baseline.equipment.find(
        (i) => i.slot === "Helmet",
      );
      if (beforeHelmet?.rarity === "UNIQUE")
        checks.review.push(
          `Replacing unique ${beforeHelmet.name}; verify build-defining interactions.`,
        );
      results.push({
        candidate,
        snapshot,
        deltas: metricDeltas(build.baseline.metrics, snapshot.metrics),
        ...checks,
        eligible:
          !checks.violations.length &&
          !snapshot.equipment.find((i) => i.slot === "Helmet")?.unsupported
            .length &&
          !snapshot.warnings.some((w) => !build.baseline.warnings.includes(w)),
        score: 0,
        explanation: [],
      });
    } catch (e) {
      results.push({
        candidate,
        deltas: {},
        violations: [],
        review: [],
        eligible: false,
        score: 0,
        explanation: [],
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return {
    engine: { name: "Path of Building Community PoE2", revision: POB_REVISION },
    league: "Standard",
    baseline: build.baseline,
    baselineChecks,
    target,
    search,
    results: rank(results, r.dpsMetric, r.offence),
    excludedByBudget: r.candidates.length - candidates.length,
  };
}
