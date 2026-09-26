export type EquipmentSlot = "Helmet";
export type Metrics = Record<string, number>;
export interface Equipment {
  slot: string;
  name: string;
  rarity: string;
  raw: string;
  unsupported: string[];
}
export interface SkillSet {
  name: string;
  level: number;
}
export interface TargetBuild {
  equipment: Equipment[];
  skills: SkillSet[];
  passiveTree?: { version: string };
  metadata: Record<string, unknown>;
  metrics: Metrics;
}
export interface Snapshot extends TargetBuild {
  warnings: string[];
}
export interface BuildState {
  xml: string;
  baseline: Snapshot;
}
export interface ItemInput {
  text: string;
}
export interface BuildEvaluator {
  loadBuild(xml: string): Promise<BuildState>;
  evaluateReplacement(
    build: BuildState,
    slot: EquipmentSlot,
    item: ItemInput | null,
  ): Promise<Snapshot>;
  probe(build: BuildState, mod: string): Promise<Snapshot>;
}
export interface ItemCandidate {
  id: string;
  name: string;
  text: string;
  price: number;
  currency: "exalted";
  url?: string;
}
export interface CandidateRequest {
  budget: number;
  candidates: ItemCandidate[];
}
export interface CandidateProvider {
  findCandidates(request: CandidateRequest): Promise<ItemCandidate[]>;
}
export interface Constraints {
  elementalFloor: number;
  chaosFloor: number;
  minSpirit: number;
}
export type DpsMetric =
  "CombinedDPS" | "TotalDPS" | "FullDPS" | "AverageDamage";
export interface Delta {
  before: number;
  after: number;
  absolute: number;
  percent: number | null;
}
export interface Evaluation {
  candidate: ItemCandidate;
  snapshot?: Snapshot;
  deltas: Record<string, Delta>;
  violations: string[];
  review: string[];
  eligible: boolean;
  score: number;
  explanation: string[];
  error?: string;
}
