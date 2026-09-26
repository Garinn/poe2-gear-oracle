import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { z } from "zod";
import type {
  BuildEvaluator,
  BuildState,
  Snapshot,
  EquipmentSlot,
  ItemInput,
} from "./domain.js";
export const POB_REVISION = "ce566eac45ea8a86477f513c7ee65a1ebe60014e";
const snapshotSchema = z.object({
  metrics: z.record(z.string(), z.number().finite()),
  equipment: z.array(
    z.object({
      slot: z.string(),
      name: z.string(),
      rarity: z.string(),
      raw: z.string(),
      unsupported: z.array(z.string()),
    }),
  ),
  skills: z.array(z.object({ name: z.string(), level: z.number() })),
  warnings: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()),
});
export function parseWorkerOutput(stdout: string): Snapshot {
  const line = stdout
    .split("\n")
    .findLast((l) => l.startsWith("GEAR_ORACLE_JSON:"));
  if (!line)
    throw Error(
      "PoB exited without a calculation result. Check Lua dependencies and the pinned revision.",
    );
  const value = JSON.parse(line.slice("GEAR_ORACLE_JSON:".length));
  if (value.error) throw Error(`PoB: ${value.error}`);
  return snapshotSchema.parse(value);
}
export class PobEvaluator implements BuildEvaluator {
  constructor(
    private root = resolve(process.env.POB_ROOT || ".pob/PathOfBuilding-PoE2"),
    private binary = process.env.LUAJIT || "luajit",
  ) {}
  private verified?: Promise<void>;
  private verify() {
    return (this.verified ??= (async () => {
      const { stdout } = await promisify(execFile)(
        "git",
        ["rev-parse", "HEAD"],
        { cwd: this.root },
      );
      if (stdout.trim() !== POB_REVISION)
        throw Error(
          "PoB revision differs from the tested pin. Run npm run setup:pob.",
        );
    })());
  }
  async run(request: Record<string, unknown>): Promise<Snapshot> {
    await this.verify();
    return new Promise((res, rej) => {
      const child = spawn(this.binary, [resolve("worker/evaluate.lua")], {
        cwd: resolve(this.root, "src"),
        env: {
          ...process.env,
          CI: undefined,
          LUA_PATH: `${resolve(this.root, "runtime/lua")}/?.lua;${resolve(this.root, "runtime/lua")}/?/init.lua;;`,
        },
        stdio: ["pipe", "pipe", "pipe"],
      });
      let out = "",
        err = "",
        done = false;
      const finish = (error?: Error, value?: Snapshot) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (error) rej(error);
        else res(value!);
      };
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish(Error("PoB timed out after 90 seconds."));
      }, 90_000);
      child.on("error", (e) =>
        finish(
          Error(
            `Cannot start PoB worker: ${e.message}. Run npm run setup:pob.`,
          ),
        ),
      );
      child.stdin.on("error", () => {});
      child.stdout.on("data", (b) => {
        out += b;
        if (out.length > 8_000_000) {
          child.kill("SIGKILL");
          finish(Error("PoB response exceeded size limit."));
        }
      });
      child.stderr.on("data", (b) => {
        err = (err + b).slice(-4000);
      });
      child.on("close", (code) => {
        try {
          const value = parseWorkerOutput(out);
          if (code !== 0) throw Error(`PoB exited ${code}: ${err}`);
          finish(undefined, value);
        } catch (e) {
          finish(e instanceof Error ? e : Error(String(e)));
        }
      });
      child.stdin.end(JSON.stringify(request));
    });
  }
  async loadBuild(xml: string): Promise<BuildState> {
    return { xml, baseline: await this.run({ xml }) };
  }
  evaluateReplacement(
    build: BuildState,
    slot: EquipmentSlot,
    item: ItemInput | null,
  ) {
    if (slot !== "Helmet") throw Error("Only Helmet is supported.");
    return this.run({ xml: build.xml, mode: "replacement", item: item?.text });
  }
  probe(build: BuildState, mod: string) {
    return this.run({ xml: build.xml, mode: "probe", mod });
  }
}
