import { describe, it, expect } from "vitest";
import { createBattle, stepBattle, damage } from "../src/core/battle";
import { createTraining, emptyInput, stepTraining } from "../src/core/training";
import { blocked, trainingColliders } from "../src/core/collision";
const battle = (mode: "cpu" | "br" = "cpu") => {
  const b = createBattle(mode, 123);
  b.session.phase = "playing";
  return b;
};
const tick = (b: ReturnType<typeof battle>, n: number) => {
  for (let i = 0; i < n; i++) stepBattle(b, emptyInput(), 1 / 60);
};
describe("endless targets", () => {
  it("falls once per target, cannot hit it twice, respawns with a new identity", () => {
    const s = createTraining(123);
    s.phase = "playing";
    s.player.facing.pitch = -0.05;
    stepTraining(s, { ...emptyInput(), ads: true, fireHeld: true }, 1 / 60);
    expect(s.fallenTargets["target-1"]).toBeDefined();
    for (let i = 0; i < 45; i++)
      stepTraining(s, { ...emptyInput(), ads: true, fireHeld: true }, 1 / 60);
    expect(s.training.shotsHit).toBe(1);
    for (let i = 0; i < 20; i++) stepTraining(s, emptyInput(), 1 / 60);
    expect(s.training.targets.some((t) => t.id === "target-1")).toBe(false);
    expect(s.training.targets).toHaveLength(4);
    expect(s.targetSequence).toBe(5);
    const spawned = s.training.targets.at(-1)!;
    expect(
      blocked({ ...spawned.position, y: 0 }, 1.8, 0.6, trainingColliders),
    ).toBe(false);
  });
  it("falling and spawning freeze while paused", () => {
    const s = createTraining(123);
    s.phase = "playing";
    s.fallenTargets["target-1"] = 0;
    s.phase = "paused";
    for (let i = 0; i < 120; i++) stepTraining(s, emptyInput(), 1 / 60);
    expect(s.targetSequence).toBe(4);
    expect(s.elapsedSeconds).toBe(0);
  });
});
describe("CPU and battle royale", () => {
  it("provides separate modes, 3 opponents or 7 opponents, and a 192m arena", () => {
    const cpu = battle(),
      br = battle("br");
    expect(cpu.session.bots).toHaveLength(3);
    expect(br.session.bots).toHaveLength(7);
    expect(br.boxes[0]!.max.x).toBe(96);
    expect(br.supplies.length).toBeGreaterThan(20);
  });
  it("CPU sees, approaches and shoots a visible player; shield absorbs damage first", () => {
    const b = battle();
    tick(b, 300);
    expect(b.session.bots[0]!.memory.lastSeenTargetId).toBe("player");
    expect(b.session.player.shield).toBeLessThan(50);
    expect(b.session.bots[0]!.inventory.slots[0]!.magazine).toBeLessThan(30);
  });
  it("CPU cannot fire through cover", () => {
    const b = battle();
    b.session.player.position = { x: 0, y: 0, z: 0 };
    b.session.bots = b.session.bots.slice(0, 1);
    const bot = b.session.bots[0]!;
    bot.position = { x: 0, y: 0, z: 15 };
    b.boxes.push({
      id: "block",
      solid: true,
      min: { x: -10, y: 0, z: 5 },
      max: { x: 10, y: 4, z: 8 },
    });
    tick(b, 60);
    expect(b.session.player.health).toBe(100);
    expect(b.session.player.shield).toBe(50);
    expect(bot.inventory.slots[0]!.magazine).toBe(30);
  });
  it("finite reload consumes reserve and does not create ammunition", () => {
    const b = battle();
    b.session.bots.forEach((bot) => {
      bot.position = { x: 80, y: 0, z: 80 };
    });
    const w = b.session.practiceWeapons.ar;
    w.magazine = 0;
    w.reserve = 7;
    stepBattle(b, { ...emptyInput(), reloadPressed: true }, 1 / 60);
    tick(b, 130);
    expect(w.magazine).toBe(7);
    expect(w.reserve).toBe(0);
  });
  it("shrinks zone according to elapsed time and applies outside damage", () => {
    const b = battle("br");
    b.session.elapsedSeconds = 500;
    b.session.player.position = { x: 85, y: 0, z: 85 };
    b.session.bots.forEach((bot) => {
      bot.position = { x: 0, y: 0, z: 0 };
    });
    tick(b, 60);
    expect(b.radius).toBeLessThan(40);
    expect(b.session.player.shield).toBeLessThan(50);
    expect(
      b.session.bots.every(
        (bot) =>
          bot.behavior === "move-to-zone" ||
          Math.hypot(bot.position.x, bot.position.z) < b.radius,
      ),
    ).toBe(true);
  });
  it("all enemies eliminated is victory, result cannot be counted twice", () => {
    const b = battle();
    for (const bot of b.session.bots) damage(b, bot, 999, b.session.player);
    stepBattle(b, emptyInput(), 1 / 60);
    expect(b.outcome).toBe("victory");
    expect(b.place).toBe(1);
    expect(b.session.player.eliminationCount).toBe(3);
    const t = b.session.elapsedSeconds;
    tick(b, 120);
    expect(b.session.elapsedSeconds).toBe(t);
  });
  it("player death produces defeat and correct remaining-player placement", () => {
    const b = battle("br");
    damage(b, b.session.player, 999, b.session.bots[0]!);
    stepBattle(b, emptyInput(), 1 / 60);
    expect(b.outcome).toBe("defeat");
    expect(b.place).toBe(8);
    expect(b.session.phase).toBe("finished");
  });
  it("stops bot decisions, zone and damage while paused", () => {
    const b = battle("br");
    b.session.phase = "paused";
    const before = JSON.stringify(b);
    tick(b, 120);
    expect(JSON.stringify(b)).toBe(before);
  });
  it("picks nearby supplies once and channels healing", () => {
    const b = battle();
    b.session.bots.forEach((bot) => {
      bot.position = { x: 80, y: 0, z: 80 };
    });
    b.supplies = [
      {
        id: "test",
        kind: "shield",
        position: { ...b.session.player.position },
        active: true,
      },
    ];
    b.session.player.shield = 0;
    stepBattle(b, { ...emptyInput(), interactPressed: true }, 1 / 60);
    expect(b.session.player.shield).toBe(25);
    stepBattle(b, { ...emptyInput(), interactPressed: true }, 1 / 60);
    expect(b.session.player.shield).toBe(25);
    b.session.player.health = 50;
    stepBattle(b, { ...emptyInput(), healPressed: true }, 1 / 60);
    tick(b, 125);
    expect(b.session.player.health).toBe(85);
    expect(b.session.player.inventory.medkits).toBe(0);
  });
  it("BR CPUs engage each other without only targeting the player", () => {
    const b = battle("br");
    b.session.player.position = { x: -80, y: 0, z: -80 };
    const a = b.session.bots[0]!,
      c = b.session.bots[1]!;
    a.position = { x: 0, y: 0, z: 0 };
    c.position = { x: 0, y: 0, z: 10 };
    tick(b, 210);
    expect(a.memory.lastSeenTargetId).toBe(c.id);
    expect(c.shield).toBeLessThan(50);
  });
});

describe("battle completion and damage invariants", () => {
  it("applies shield before HP, interrupts healing and credits exactly one elimination", () => {
    const b = battle();
    const target = b.session.bots[0]!;
    target.healingRemainingSeconds = 1;
    damage(b, target, 22, b.session.player);
    expect(target.shield).toBe(28);
    expect(target.health).toBe(100);
    expect(target.healingRemainingSeconds).toBe(0);
    damage(b, target, 999, b.session.player);
    damage(b, target, 999, b.session.player);
    expect(b.session.player.eliminationCount).toBe(1);
  });
  it("ends a surviving BR at the ten-minute limit", () => {
    const b = battle("br");
    b.session.elapsedSeconds = 599.99;
    b.session.player.position = { x: 0, y: 0, z: 0 };
    b.session.bots.forEach((bot, i) => {
      bot.position = { x: (i % 3) - 1, y: 0, z: i % 2 };
    });
    stepBattle(b, emptyInput(), 1 / 60);
    expect(b.outcome).toBe("draw");
    expect(b.session.phase).toBe("finished");
  });
  it("returns a finite flight endpoint even when a player shot misses everything", () => {
    const s = createTraining(123);
    s.phase = "playing";
    s.player.facing.pitch = 0.8;
    const shot = stepTraining(
      s,
      { ...emptyInput(), fireHeld: true },
      1 / 60,
    ).find((e) => e.type === "shot");
    expect(shot?.type).toBe("shot");
    if (shot?.type === "shot") {
      expect(shot.hit.point).not.toBeNull();
      expect(Number.isFinite(shot.hit.point!.z)).toBe(true);
      expect(shot.hit.hitType).toBe("none");
    }
  });
});
it("counts a head hit at the upper edge of the actor as an actual hit", () => {
  const b = battle();
  b.session.player.position = { x: 0, y: 0, z: 0 };
  b.session.player.facing.pitch = 0.002;
  b.session.player.inventory.slots[0] = b.session.practiceWeapons.dmr;
  b.session.bots.forEach((bot, i) => {
    bot.position = i === 0 ? { x: 0, y: 0, z: 10 } : { x: 80, y: 0, z: 80 };
  });
  b.session.rngState = 123;
  const events = stepBattle(
    b,
    { ...emptyInput(), ads: true, fireHeld: true },
    1 / 60,
  );
  const shot = events.find(
    (e) => e.type === "shot" && e.shooterId === "player",
  );
  expect(shot?.type === "shot" && shot.hit.hitType).toBe("head");
  expect(b.session.combatMetrics.shotsHit).toBe(1);
  expect(b.session.training.shotsHit).toBe(1);
});
