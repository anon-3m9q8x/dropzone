import { describe, it, expect } from "vitest";
import {
  createTraining,
  emptyInput,
  stepTraining,
  switchWeapon,
} from "../src/core/training";
import { nearestShot, trainingColliders, blocked } from "../src/core/collision";
import { CONFIG, validateGameConfig } from "../src/core/config";
import {
  defaults,
  emptySave,
  readSave,
  writeSettings,
  SAVE_KEY,
} from "../src/core/storage";
const play = () => {
  const s = createTraining(123);
  s.phase = "playing";
  return s;
};
const ticks = (s: ReturnType<typeof play>, n: number, input = emptyInput()) => {
  for (let i = 0; i < n; i++) stepTraining(s, input, 1 / 60);
};
describe("training simulation", () => {
  it("validates supplied config and rejects malformed constants", () => {
    expect(validateGameConfig(CONFIG).ok).toBe(true);
    expect(validateGameConfig({ ...CONFIG, weapons: [] }).ok).toBe(false);
    const c = structuredClone(CONFIG);
    c.zone.phases[1]!.startSecond = 59;
    expect(validateGameConfig(c).ok).toBe(false);
  });
  it("walks 5m/sec and normalizes diagonal speed", () => {
    const s = play(),
      d = play();
    ticks(s, 60, { ...emptyInput(), forward: 1 });
    ticks(d, 60, { ...emptyInput(), forward: 1, strafe: 1 });
    expect(s.player.position.z).toBeCloseTo(5);
    expect(Math.hypot(d.player.position.x, d.player.position.z)).toBeCloseTo(5);
  });
  it("cannot walk through the range wall", () => {
    const s = play();
    ticks(s, 600, { ...emptyInput(), strafe: 1 });
    expect(s.player.position.x).toBeGreaterThan(-19.66);
    expect(blocked(s.player.position, 1.75, 0.35, trainingColliders)).toBe(
      false,
    );
  });
  it("jumps and lands on the floor", () => {
    const s = play();
    ticks(s, 1, { ...emptyInput(), jumpPressed: true });
    expect(s.player.position.y).toBeGreaterThan(0);
    ticks(s, 120);
    expect(s.player.position.y).toBe(0);
    expect(s.player.grounded).toBe(true);
  });
  it("moves the target and reflects at its bounds", () => {
    const s = play();
    ticks(s, 600);
    const t = s.training.targets[3]!;
    expect(t.direction).toBe(-1);
    expect(t.position.x).toBeCloseTo(4);
  });
  it("freezes movement, ammo and time when paused", () => {
    const s = createTraining(123);
    const original = JSON.stringify(s);
    ticks(s, 120, { ...emptyInput(), fireHeld: true, forward: 1 });
    expect(JSON.stringify(s)).toBe(original);
  });
  it("counts real shots and hits; cannot shoot through cover", () => {
    const s = play();
    s.player.facing.pitch = -0.05;
    ticks(s, 1, { ...emptyInput(), fireHeld: true, ads: true });
    expect(s.training.shotsFired).toBe(1);
    expect(s.training.shotsHit).toBe(1);
    const target = {
      ...s.training.targets[0]!,
      position: { x: -8, y: 1, z: 12 },
    };
    expect(
      nearestShot(
        { x: -8, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 },
        85,
        trainingColliders,
        [target],
      )?.kind,
    ).toBe("cover");
  });
  it("requires reload with unlimited reserve, no weapon-switch refill", () => {
    const s = play();
    ticks(s, 300, { ...emptyInput(), fireHeld: true });
    expect(s.training.shotsFired).toBe(30);
    expect(s.practiceWeapons.ar.magazine).toBe(0);
    switchWeapon(s, "smg");
    switchWeapon(s, "ar");
    expect(s.practiceWeapons.ar.magazine).toBe(0);
    ticks(s, 1, { ...emptyInput(), reloadPressed: true });
    expect(s.practiceWeapons.ar.magazine).toBe(0);
    ticks(s, 130);
    expect(s.practiceWeapons.ar.magazine).toBe(30);
    expect(s.practiceWeapons.ar.reserve).toBe(90);
  });
  it("DMR is semi-auto and observes its cooldown", () => {
    const s = play();
    switchWeapon(s, "dmr");
    ticks(s, 1);
    ticks(s, 60, { ...emptyInput(), fireHeld: true });
    expect(s.training.shotsFired).toBe(1);
    ticks(s, 1);
    ticks(s, 1, { ...emptyInput(), fireHeld: true });
    expect(s.training.shotsFired).toBe(2);
    ticks(s, 1);
    ticks(s, 1, { ...emptyInput(), fireHeld: true });
    expect(s.training.shotsFired).toBe(2);
  });
  it("shotgun fires 8 pellets per semi-auto pull from one shell", () => {
    const s = play();
    switchWeapon(s, "sg");
    ticks(s, 1);
    ticks(s, 60, { ...emptyInput(), fireHeld: true });
    expect(s.training.shotsFired).toBe(8);
    expect(s.practiceWeapons.sg.magazine).toBe(5);
  });
  it("LMG and handgun use their own magazines and fire modes", () => {
    const s = play();
    switchWeapon(s, "lmg");
    ticks(s, 60, { ...emptyInput(), fireHeld: true });
    expect(s.practiceWeapons.lmg.magazine).toBe(90);
    switchWeapon(s, "hg");
    ticks(s, 1);
    ticks(s, 60, { ...emptyInput(), fireHeld: true });
    expect(s.practiceWeapons.hg.magazine).toBe(14);
    expect(s.practiceWeapons.ar.magazine).toBe(30);
  });
  it("sprint blocks shooting/reloading, ADS overrides sprint", () => {
    const s = play();
    ticks(s, 30, { ...emptyInput(), sprint: true, fireHeld: true });
    expect(s.training.shotsFired).toBe(0);
    ticks(s, 1, { ...emptyInput(), sprint: true, ads: true, fireHeld: true });
    expect(s.training.shotsFired).toBe(1);
    expect(s.player.isSprinting).toBe(false);
  });
  it("same seed and input produce identical combat results", () => {
    const a = play(),
      b = play();
    ticks(a, 100, { ...emptyInput(), fireHeld: true });
    ticks(b, 100, { ...emptyInput(), fireHeld: true });
    expect(a.training).toEqual(b.training);
    expect(a.rngState).toBe(b.rngState);
  });
});
describe("settings storage", () => {
  it("round trips settings without fabricating battle records", () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
    };
    const d = emptySave();
    writeSettings(storage, d, { ...defaults, sensitivity: 2 }, false);
    const read = readSave(storage);
    expect(read.protected).toBe(false);
    expect(read.data.settings.sensitivity).toBe(2);
    expect(read.data.stats.matches).toBe(0);
    expect(read.data.results).toEqual([]);
  });
  it("preserves unknown future, malformed and existing match saves", () => {
    for (const raw of [
      "invalid",
      JSON.stringify({ ...emptySave(), schemaVersion: 2 }),
      JSON.stringify({ ...emptySave(), currentMatch: { session: {} } }),
      JSON.stringify({
        ...emptySave(),
        settings: { ...defaults, sensitivity: 99 },
      }),
    ]) {
      let saved = raw;
      const st = {
        getItem: () => saved,
        setItem: (_k: string, v: string) => {
          saved = v;
        },
      };
      const r = readSave(st);
      expect(r.protected).toBe(true);
      writeSettings(st, r.data, defaults, r.protected);
      expect(saved).toBe(raw);
    }
  });
  it("reports quota errors without throwing", () => {
    expect(
      writeSettings(
        {
          setItem: () => {
            throw Error("quota");
          },
        },
        emptySave(),
        defaults,
        false,
      ),
    ).toContain("保存できません");
    expect(SAVE_KEY).toBe("dropzone-save-v1");
  });
});
