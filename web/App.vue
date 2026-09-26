<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import type { ItemCandidate, DpsMetric } from "../src/domain";
import type { runWorkflow } from "../src/service";
type Response = Awaited<ReturnType<typeof runWorkflow>>;
const current = ref(""),
  target = ref(""),
  budget = ref(30),
  offence = ref(0.5),
  dpsMetric = ref<DpsMetric>("CombinedDPS");
const elementalFloor = ref(75),
  chaosFloor = ref(0),
  minSpirit = ref(0);
const candidates = ref<ItemCandidate[]>([]),
  result = ref<Response>(),
  error = ref(""),
  busy = ref(false),
  elapsed = ref(0);
const name = ref(""),
  text = ref(""),
  price = ref(5),
  url = ref("");
const ready = computed(
  () => current.value.trim() && target.value.trim() && !busy.value,
);
const labels: Record<string, string> = {
  CombinedDPS: "Selected skill DPS",
  TotalDPS: "Hit DPS",
  FullDPS: "Full DPS",
  AverageDamage: "Average hit",
  TotalEHP: "Effective hit pool",
  Life: "Life",
  EnergyShield: "Energy shield",
  Armour: "Armour",
  Evasion: "Evasion",
  FireResist: "Fire resistance",
  ColdResist: "Cold resistance",
  LightningResist: "Lightning resistance",
  ChaosResist: "Chaos resistance",
  FireResistTotal: "Fire resistance, uncapped",
  ColdResistTotal: "Cold resistance, uncapped",
  LightningResistTotal: "Lightning resistance, uncapped",
  ChaosResistTotal: "Chaos resistance, uncapped",
  SpiritUnreserved: "Unreserved spirit",
  ManaUnreserved: "Unreserved mana",
  MovementSpeedMod: "Movement speed multiplier",
  Str: "Strength",
  Dex: "Dexterity",
  Int: "Intelligence",
  ReqStr: "Required strength",
  ReqDex: "Required dexterity",
  ReqInt: "Required intelligence",
};
const fmt = (v: number | undefined) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(v);
const signed = (v: number) => `${v > 0 ? "+" : ""}${fmt(v)}`;
function invalidate() {
  result.value = undefined;
  error.value = "";
}
async function demo() {
  try {
    const r = await fetch("/api/demo");
    if (!r.ok) throw Error("Could not load demo");
    const d = await r.json();
    current.value = d.current;
    target.value = d.target;
    candidates.value = d.candidates;
    invalidate();
  } catch (e) {
    error.value = String(e);
  }
}
async function readBuild(event: Event, kind: "current" | "target") {
  const f = (event.target as HTMLInputElement).files?.[0];
  if (!f) return;
  if (f.size > 2_000_000) {
    error.value = "Build file must be smaller than 2 MB.";
    return;
  }
  const v = await f.text();
  if (kind === "current") current.value = v;
  else target.value = v;
  invalidate();
}
function add() {
  if (!text.value.trim() || !Number.isFinite(price.value) || price.value < 0)
    return;
  candidates.value.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: name.value.trim() || `Helmet ${candidates.value.length + 1}`,
    text: text.value.trim(),
    price: price.value,
    currency: "exalted",
    ...(url.value ? { url: url.value } : {}),
  });
  name.value = "";
  text.value = "";
  url.value = "";
  invalidate();
}
async function evaluate() {
  busy.value = true;
  error.value = "";
  result.value = undefined;
  elapsed.value = 0;
  const t = setInterval(() => elapsed.value++, 1000);
  try {
    const r = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current: current.value,
        target: target.value,
        slot: "Helmet",
        budget: budget.value,
        offence: offence.value,
        dpsMetric: dpsMetric.value,
        constraints: {
          elementalFloor: elementalFloor.value,
          chaosFloor: chaosFloor.value,
          minSpirit: minSpirit.value,
        },
        candidates: candidates.value,
      }),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Calculation failed");
    result.value = d;
    await nextTick();
    document.querySelector(".results")?.scrollIntoView({ block: "start" });
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    clearInterval(t);
    busy.value = false;
  }
}
</script>
<template>
  <header>
    <a class="brand" href="/">◇ <span>GEAR ORACLE</span></a
    ><span class="pill">POE 2 · LOCAL PROTOTYPE</span>
  </header>
  <main>
    <section class="intro">
      <div>
        <p class="eyebrow">YOUR NEXT UPGRADE</p>
        <h1>Find the helmet<br />that fits your build.</h1>
        <p class="sub">Real PoB calculations. Every trade-off visible.</p>
      </div>
      <button class="secondary" @click="demo" :disabled="busy">
        Load example build ↗
      </button>
    </section>
    <div class="workspace">
      <aside>
        <section class="panel">
          <div class="section-title">
            <span class="step">01</span>
            <h2>Your builds</h2>
          </div>
          <fieldset :disabled="busy">
            <label
              >Current build <small>PoB2 share code or XML</small
              ><textarea
                v-model="current"
                @input="invalidate"
                rows="3"
                placeholder="Paste your PoB2 export…"
              ></textarea></label
            ><label class="file"
              >Or choose build file<input
                type="file"
                accept=".xml,.txt,.pob"
                @change="readBuild($event, 'current')"
            /></label>
            <label
              >Reference build <small>Guidance, not a shopping list</small
              ><textarea
                v-model="target"
                @input="invalidate"
                rows="3"
                placeholder="Paste the reference PoB2 export…"
              ></textarea></label
            ><label class="file"
              >Or choose reference file<input
                type="file"
                accept=".xml,.txt,.pob"
                @change="readBuild($event, 'target')"
            /></label>
            <div class="row">
              <label
                >Slot<select disabled>
                  <option>Helmet · rare</option>
                </select></label
              ><label
                >Budget · exalted<input
                  type="number"
                  min="0"
                  v-model.number="budget"
                  @input="invalidate"
              /></label>
            </div>
            <p class="muted">
              Standard league · English item text · up to 12 candidates
            </p>
            <details>
              <summary>Requirements & ranking</summary>
              <label
                >Minimum elemental resistance<input
                  type="number"
                  v-model.number="elementalFloor"
                  @input="invalidate" /></label
              ><label
                >Minimum chaos resistance<input
                  type="number"
                  v-model.number="chaosFloor"
                  @input="invalidate" /></label
              ><label
                >Minimum unreserved spirit<input
                  type="number"
                  min="0"
                  v-model.number="minSpirit"
                  @input="invalidate" /></label
              ><label
                >Damage metric<select v-model="dpsMetric" @change="invalidate">
                  <option value="CombinedDPS">
                    Selected skill · combined DPS
                  </option>
                  <option value="TotalDPS">Selected skill · hit DPS</option>
                  <option value="FullDPS">
                    Full DPS · configured skill groups
                  </option>
                  <option value="AverageDamage">
                    Selected skill · average hit
                  </option>
                </select></label
              ><label
                >Damage {{ Math.round(offence * 100) }}% / defence
                {{ Math.round((1 - offence) * 100) }}%<input
                  type="range"
                  min="0"
                  max="1"
                  step=".1"
                  v-model.number="offence"
                  @input="invalidate"
              /></label>
              <p class="muted">
                Viable items sort first, then this weighted percentage change in
                damage and EHP. Price breaks ties. Resistance caps and
                attributes are requirements, not linear bonuses.
              </p>
            </details>
          </fieldset>
        </section>
        <section class="panel">
          <div class="section-title">
            <span class="step">02</span>
            <h2>
              Your shortlist
              <span class="muted">{{ candidates.length }} / 12</span>
            </h2>
          </div>
          <p class="muted">
            Copy complete item text from PoB or a listing. Prices are entered
            manually.
          </p>
          <div class="candidate" v-for="(c, i) in candidates" :key="c.id">
            <div>
              <strong>{{ c.name }}</strong
              ><small>{{ c.price }} ex</small>
            </div>
            <button
              class="remove"
              :disabled="busy"
              @click="
                candidates.splice(i, 1);
                invalidate();
              "
              :aria-label="`Remove ${c.name}`"
            >
              ×
            </button>
          </div>
          <fieldset :disabled="busy || candidates.length >= 12">
            <label
              >Item text<textarea
                v-model="text"
                rows="5"
                placeholder="Rarity: Rare&#10;Item name&#10;Base type&#10;…"
              ></textarea>
            </label>
            <div class="row">
              <label
                >Label<input
                  v-model="name"
                  placeholder="Optional name" /></label
              ><label
                >Price · ex<input type="number" min="0" v-model.number="price"
              /></label>
            </div>
            <details>
              <summary>Listing link (optional)</summary>
              <label
                >Official trade URL<input
                  v-model="url"
                  type="url"
                  placeholder="https://www.pathofexile.com/trade2/…"
              /></label>
            </details>
            <button
              class="secondary full"
              @click="add"
              :disabled="!text.trim()"
            >
              + Add helmet
            </button>
          </fieldset>
        </section>
        <div class="action">
          <button class="primary" :disabled="!ready" @click="evaluate">
            {{
              busy
                ? `Calculating · ${elapsed}s`
                : candidates.length
                  ? "Find upgrades →"
                  : "Generate search guidance →"
            }}
          </button>
          <p class="muted">
            {{
              busy
                ? "Each build is recalculated in an isolated PoB process."
                : "Builds are processed in server memory. No trade API calls."
            }}
          </p>
        </div>
      </aside>
      <section class="results" aria-live="polite" :aria-busy="busy">
        <div v-if="error" class="panel error">
          <h2>Could not evaluate</h2>
          <p>{{ error }}</p>
        </div>
        <div v-if="busy" class="panel waiting">
          <div class="spinner"></div>
          <h2>Asking Path of Building…</h2>
          <p>Baseline, reference, search probes, then each helmet.</p>
        </div>
        <div v-if="!result && !busy" class="panel empty">
          <span class="orb">◇</span>
          <p class="eyebrow">BUILD FIRST. MODIFIERS SECOND.</p>
          <h2>Same build.<br />Different possibilities.</h2>
          <p>
            Import both builds to get search guidance, or load the example to
            compare three helmets immediately.
          </p>
          <div class="empty-grid">
            <span>01<br /><b>Calculate baseline</b></span
            ><span>02<br /><b>Swap one helmet</b></span
            ><span>03<br /><b>Check the difference</b></span>
          </div>
          <p class="muted">Nothing is scored until PoB has calculated it.</p>
        </div>
        <template v-if="result">
          <section class="panel baseline">
            <p class="eyebrow">
              CURRENT BUILD · LEVEL {{ result.baseline.metadata.level }}
            </p>
            <h2>
              {{ result.baseline.metadata.mainSkill
              }}<small>{{ result.baseline.metadata.ascendancy }}</small>
            </h2>
            <div class="metrics">
              <div>
                <span>{{ labels[dpsMetric] }}</span
                ><b>{{ fmt(result.baseline.metrics[dpsMetric]) }}</b>
              </div>
              <div>
                <span>Effective hit pool</span
                ><b>{{ fmt(result.baseline.metrics.TotalEHP) }}</b>
              </div>
              <div>
                <span>Life / ES</span
                ><b
                  >{{ fmt(result.baseline.metrics.Life) }} /
                  {{ fmt(result.baseline.metrics.EnergyShield) }}</b
                >
              </div>
            </div>
            <p class="muted">
              Uses the export’s selected skill, active gear, passives and combat
              configuration.
            </p>
            <details
              v-if="
                result.baselineChecks.violations.length ||
                result.baselineChecks.review.length
              "
              :open="result.baselineChecks.violations.length > 0"
            >
              <summary class="warning">
                Baseline:
                {{ result.baselineChecks.violations.length }} violations ·
                {{ result.baselineChecks.review.length }} review notes
              </summary>
              <ul>
                <li
                  v-for="w in [
                    ...result.baselineChecks.violations,
                    ...result.baselineChecks.review,
                  ]"
                >
                  {{ w }}
                </li>
              </ul>
            </details>
          </section>
          <details class="panel guidance" :open="!result.results.length">
            <summary>Search guidance from your build ↗</summary>
            <ul>
              <li v-for="note in result.search.targetNotes">{{ note }}</li>
            </ul>
            <h3>Approximate needs with helmet removed</h3>
            <div class="chips">
              <span v-for="need in result.search.needs" class="pill"
                >{{ need.label }}: +{{ fmt(need.minimum) }}</span
              >
            </div>
            <p class="muted">
              Nonlinear interactions may change these estimates. Candidate
              recalculation is decisive.
            </p>
            <h3>PoB marginal probes</h3>
            <div v-for="probe in result.search.priorities" class="probe">
              <b>{{ probe.label }}</b
              ><span
                >{{
                  probe.dpsPercent == null
                    ? "—"
                    : signed(probe.dpsPercent) + "%"
                }}
                DPS ·
                {{
                  probe.ehpPercent == null
                    ? "—"
                    : signed(probe.ehpPercent) + "%"
                }}
                EHP</span
              >
            </div>
            <ol>
              <li v-for="instruction in result.search.instructions">
                {{ instruction }}
              </li>
            </ol>
            <a
              class="button secondary"
              :href="result.search.tradeUrl"
              target="_blank"
              rel="noopener"
              >Open official trade ↗</a
            >
          </details>
          <div class="result-title">
            <h2>{{ result.results.length }} helmets compared</h2>
            <span class="muted" v-if="result.excludedByBudget"
              >{{ result.excludedByBudget }} over budget</span
            >
          </div>
          <article
            class="panel result"
            v-for="(r, i) in result.results"
            :key="r.candidate.id"
            :class="{ best: i === 0 && r.eligible, blocked: !r.eligible }"
          >
            <div class="card-heading">
              <span class="rank">{{ String(i + 1).padStart(2, "0") }}</span>
              <div>
                <h2>{{ r.candidate.name }}</h2>
                <span
                  class="status"
                  :class="{ warning: !r.eligible || r.review.length > 0 }"
                  >{{
                    r.error
                      ? "Calculation failed"
                      : r.violations.length
                        ? "Requirements not met"
                        : r.review.length
                          ? "Needs review"
                          : r.score > 0
                            ? "Upgrade · checked requirements met"
                            : "No gain at this balance"
                  }}</span
                >
              </div>
              <b class="price">{{ r.candidate.price }} <small>ex</small></b>
            </div>
            <p v-if="r.error" class="error">{{ r.error }}</p>
            <template v-else
              ><div class="metrics deltas">
                <div
                  v-for="k in [dpsMetric, 'TotalEHP', 'Life', 'EnergyShield']"
                >
                  <span>{{ labels[k] }}</span
                  ><b
                    :class="{
                      positive: (r.deltas[k]?.absolute ?? 0) > 0,
                      negative: (r.deltas[k]?.absolute ?? 0) < 0,
                    }"
                    >{{ r.deltas[k] ? signed(r.deltas[k].absolute) : "—" }}</b
                  ><small v-if="r.deltas[k]?.percent != null"
                    >{{ signed(r.deltas[k].percent!) }}%</small
                  >
                </div>
              </div>
              <ul class="violations" v-if="r.violations.length">
                <li v-for="v in r.violations">{{ v }}</li>
              </ul>
              <p>{{ r.explanation[1] }}</p>
              <details>
                <summary>Why this rank & all metrics</summary>
                <p class="muted">{{ r.explanation[0] }}</p>
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>PoB metric</th>
                        <th>Before</th>
                        <th>After</th>
                        <th>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(d, k) in r.deltas">
                        <td>{{ labels[k] || k }}</td>
                        <td>{{ fmt(d.before) }}</td>
                        <td>{{ fmt(d.after) }}</td>
                        <td
                          :class="{
                            positive: d.absolute > 0,
                            negative: d.absolute < 0,
                          }"
                        >
                          {{ signed(d.absolute) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <ul class="warning" v-if="r.review.length">
                  <li v-for="v in r.review">{{ v }}</li>
                </ul>
              </details></template
            >
            <details>
              <summary>Item text</summary>
              <pre>{{ r.candidate.text }}</pre>
            </details>
            <a
              v-if="r.candidate.url"
              :href="r.candidate.url"
              target="_blank"
              rel="noopener"
              >View listing ↗</a
            >
          </article>
          <p class="muted footnote">
            Calculated with PoB2 {{ result.engine.revision.slice(0, 8) }}. PoB
            estimates depend on your configuration and supported mechanics.
            Checked requirements do not prove every build-specific interaction.
            Demo item prices are illustrative.
          </p>
        </template>
      </section>
    </div>
  </main>
  <footer>
    This product isn't affiliated with or endorsed by Grinding Gear Games in any
    way.
  </footer>
</template>
