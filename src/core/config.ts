import raw from "../../data/game-config.json";
import type { Result, WeaponDefinition, WeaponId } from "./types";
export type GameConfig = typeof raw;
/** Number-key order: 1 AR, 2 SMG, 3 DMR, 4 LMG, 5 SG, 6 HG. */
export const WEAPON_IDS = ["ar", "smg", "dmr", "lmg", "sg", "hg"] as const;
function shape(value: unknown, example: unknown): boolean {
  if (typeof example === "number")
    return typeof value === "number" && Number.isFinite(value);
  if (Array.isArray(example))
    return (
      Array.isArray(value) &&
      value.length === example.length &&
      value.every((v, i) => shape(v, example[i]))
    );
  if (example !== null && typeof example === "object")
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.entries(example).every(([k, v]) =>
        shape((value as Record<string, unknown>)[k], v),
      )
    );
  return typeof value === typeof example;
}
export function validateGameConfig(value: unknown): Result<GameConfig> {
  const fail = (): Result<GameConfig> => ({
    ok: false,
    error: {
      code: "INVALID_INPUT",
      message: "ゲーム定数に不整合があります。開始できません。",
      recoverable: false,
    },
  });
  if (!shape(value, raw)) return fail();
  const c = value as GameConfig;
  if (
    c.schemaVersion !== 1 ||
    c.world.halfExtentMeters !== 96 ||
    c.match.botCount !== 7 ||
    c.match.totalActors !== 8 ||
    c.match.maxSeconds !== 600 ||
    c.world.fixedDeltaSeconds !== 1 / 60 ||
    c.world.maxTicksPerFrame < 1 ||
    c.world.maxTicksPerFrame > 5
  )
    return fail();
  if (
    new Set(c.weapons.map((w) => w.id)).size !== WEAPON_IDS.length ||
    c.weapons.some(
      (w) =>
        !(WEAPON_IDS as readonly string[]).includes(w.id) ||
        !Number.isInteger(w.pellets) ||
        w.pellets < 1 ||
        w.magazineSize < 1 ||
        !Number.isInteger(w.magazineSize) ||
        w.reloadSeconds <= 0 ||
        w.shotsPerSecond <= 0 ||
        w.rangeMeters <= 0,
    )
  )
    return fail();
  let end = 0,
    last = 90;
  for (const p of c.zone.phases) {
    if (
      p.startSecond !== end ||
      p.endSecond <= p.startSecond ||
      p.fromRadius !== last ||
      p.toRadius > p.fromRadius ||
      p.toRadius < 5 ||
      p.outsideDamagePerSecond < 0
    )
      return fail();
    end = p.endSecond;
    last = p.toRadius;
  }
  if (
    end !== 600 ||
    last !== 5 ||
    c.camera.pitchMinDegrees >= c.camera.pitchMaxDegrees ||
    c.camera.defaultFovDegrees <= 0 ||
    c.match.maxHealth < 1 ||
    c.world.walkMetersPerSecond <= 0 ||
    c.world.playerRadiusMeters <= 0
  )
    return fail();
  return { ok: true, value: c };
}
export const configResult = validateGameConfig(raw);
export const CONFIG: Readonly<GameConfig> = Object.freeze(raw);
export function weaponDefinition(id: WeaponId): WeaponDefinition {
  const w = CONFIG.weapons.find((w) => w.id === id);
  if (!w) throw Error("武器定義がありません");
  return { ...w, id };
}
