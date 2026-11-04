import type {
  Aabb,
  ActorState,
  BotState,
  GameEvent,
  PlayerInput,
  TrainingSession,
  TrainingTargetState,
  Vec3,
} from "./types";
import { createTraining, newWeapon, random, stepTraining } from "./training";
import { CONFIG, weaponDefinition } from "./config";
import { blocked, nearestShot, rayAabb } from "./collision";
export type PlayMode = "training" | "cpu" | "br";
export interface Supply {
  id: string;
  position: Vec3;
  kind: "ammo" | "shield" | "medkit";
  active: boolean;
}
export interface Battle {
  mode: "cpu" | "br";
  session: TrainingSession;
  boxes: Aabb[];
  supplies: Supply[];
  radius: number;
  outcome: "victory" | "defeat" | "draw" | null;
  place: number | null;
  feed: string[];
  healRemaining: number;
  damageFlash: number;
}
const box = (
  id: string,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
): Aabb => ({
  id,
  solid: true,
  min: { x: x - w / 2, y: 0, z: z - d / 2 },
  max: { x: x + w / 2, y: h, z: z + d / 2 },
});
export function arenaBoxes(): Aabb[] {
  const boxes = [
    {
      id: "ground",
      solid: true,
      min: { x: -96, y: -0.3, z: -96 },
      max: { x: 96, y: 0, z: 96 },
    },
    box("wall-n", 0, -96, 192, 0.6, 4),
    box("wall-s", 0, 96, 192, 0.6, 4),
    box("wall-e", 96, 0, 0.6, 192, 4),
    box("wall-w", -96, 0, 0.6, 192, 4),
  ];
  for (let x = -60; x <= 60; x += 30)
    for (let z = -60; z <= 60; z += 30)
      if (x !== 0 || z !== 0)
        boxes.push(
          box(
            `cover-${x}-${z}`,
            x + 6,
            z + 4,
            5,
            4,
            (x + z) % 60 === 0 ? 3 : 1.4,
          ),
        );
  return boxes;
}
export function createBattle(mode: "cpu" | "br", seed?: number): Battle {
  const s = createTraining(seed);
  s.player.position = { x: 0, y: 0, z: -38 };
  s.player.facing.yaw = Math.PI;
  s.training.targets = [];
  s.bots = [];
  const count = mode === "br" ? 7 : 3;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const position =
      i === 0
        ? { x: 0, y: 0, z: -15 }
        : { x: Math.sin(angle) * 48, y: 0, z: Math.cos(angle) * 48 };
    const bot: BotState = {
      ...structuredClone(s.player),
      id: `cpu-${i + 1}`,
      kind: "bot",
      name: `CPU ${String(i + 1).padStart(2, "0")}`,
      position,
      inventory: {
        slots: [
          newWeapon(i % 3 === 0 ? "ar" : i % 3 === 1 ? "smg" : "dmr"),
          null,
        ],
        activeSlot: 0,
        medkits: 1,
      },
      facing: { yaw: Math.atan2(-position.x, -position.z), pitch: 0 },
      behavior: "patrol",
      difficulty: "normal",
      decisionCooldownSeconds: 0,
      reactionRemainingSeconds: 2.5 + i * 0.1,
      destination: null,
      memory: {
        lastSeenTargetId: null,
        lastSeenPosition: null,
        lastSeenAtSeconds: null,
        lastHeardPosition: null,
        lastHeardAtSeconds: null,
      },
    };
    s.bots.push(bot);
  }
  const supplies: Supply[] = [];
  for (let i = 0; i < 40; i++) {
    const p = {
      x: (random(s) * 2 - 1) * 75,
      y: 0,
      z: (random(s) * 2 - 1) * 75,
    };
    if (!blocked(p, 1, 0.5, arenaBoxes()))
      supplies.push({
        id: `supply-${i}`,
        position: p,
        kind: i % 3 === 0 ? "medkit" : i % 3 === 1 ? "shield" : "ammo",
        active: true,
      });
  }
  supplies.push({
    id: "start-ammo",
    position: { x: 2, y: 0, z: -35 },
    kind: "ammo",
    active: true,
  });
  return {
    mode,
    session: s,
    boxes: arenaBoxes(),
    supplies,
    radius: 90,
    outcome: null,
    place: null,
    feed: [],
    healRemaining: 0,
    damageFlash: 0,
  };
}
export function bodyBox(a: ActorState): Aabb {
  return {
    id: a.id,
    solid: false,
    min: { x: a.position.x - 0.35, y: a.position.y, z: a.position.z - 0.35 },
    max: {
      x: a.position.x + 0.35,
      y:
        a.position.y +
        (a.kind === "player" && (a as TrainingSession["player"]).crouching
          ? 1.15
          : 1.75),
      z: a.position.z + 0.35,
    },
  };
}
function proxy(a: ActorState): TrainingTargetState {
  return {
    id: a.id,
    position: { ...a.position, y: a.position.y + 0.875 },
    isMoving: false,
    movementMinX: 0,
    movementMaxX: 0,
    direction: 0,
    speedMetersPerSecond: 0,
    hitCount: 0,
  };
}
export function damage(
  b: Battle,
  target: ActorState,
  amount: number,
  attacker: ActorState | null,
) {
  if (!target.alive || b.outcome) return;
  const shield = Math.min(target.shield, amount);
  target.shield -= shield;
  target.health = Math.max(0, target.health - (amount - shield));
  target.lastDamagedBy = attacker?.id ?? null;
  target.healingRemainingSeconds = 0;
  if (target.kind === "player") {
    b.damageFlash = 0.25;
    b.healRemaining = 0;
  }
  if (target.health === 0) {
    target.alive = false;
    if (attacker) {
      attacker.eliminationCount++;
    }
    b.feed.unshift(`${attacker?.name ?? "安全地帯"} → ${target.name}`);
    b.feed = b.feed.slice(0, 5);
    b.supplies.push({
      id: `drop-${target.id}`,
      position: { ...target.position },
      kind: "ammo",
      active: true,
    });
  }
}
function visible(b: Battle, from: Vec3, to: Vec3) {
  const delta = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
  const length = Math.hypot(delta.x, delta.y, delta.z);
  if (length === 0) return true;
  const direction = {
    x: delta.x / length,
    y: delta.y / length,
    z: delta.z / length,
  };
  return !b.boxes.some((a) => {
    const d = rayAabb(from, direction, a, length);
    return d !== null && d < length - 0.05;
  });
}
function moveBot(b: Battle, bot: BotState, to: Vec3, dt: number) {
  const dx = to.x - bot.position.x,
    dz = to.z - bot.position.z,
    n = Math.hypot(dx, dz);
  if (n < 0.2) return;
  const speed = bot.behavior === "move-to-zone" ? 6 : 3.5;
  const x = (dx / n) * speed * dt,
    z = (dz / n) * speed * dt;
  const p = bot.position;
  let moved = false;
  for (const axis of ["x", "z"] as const) {
    const next = { ...p, [axis]: p[axis] + (axis === "x" ? x : z) };
    if (!blocked(next, 1.75, 0.35, b.boxes)) {
      p[axis] = next[axis];
      moved = true;
    }
  }
  if (!moved) {
    const sign = Number(bot.id.slice(-1)) % 2 ? 1 : -1;
    const side = { ...p, x: p.x - z * sign, z: p.z + x * sign };
    if (!blocked(side, 1.75, 0.35, b.boxes)) bot.position = side;
  }
  bot.facing.yaw = Math.atan2(-dx, -dz);
}
export function stepBattle(
  b: Battle,
  input: PlayerInput,
  dt: number,
): GameEvent[] {
  const s = b.session;
  if (s.phase !== "playing" || b.outcome) return [];
  const p = s.player;
  const actors: ActorState[] = [p, ...s.bots];
  s.training.targets = s.bots.filter((x) => x.alive).map(proxy);
  const events = stepTraining(s, input, dt, b.boxes, false);
  for (const event of events) {
    if (event.type !== "shot") continue;
    if (event.hit.hitType === "body") {
      s.training.shotsHit--;
      s.combatMetrics.shotsHit--;
    }
    const origin = {
      ...p.position,
      y: p.position.y + (p.crouching ? 1.15 : 1.75) * 0.94,
    };
    const point = event.hit.point;
    if (!point) continue;
    const delta = {
      x: point.x - origin.x,
      y: point.y - origin.y,
      z: point.z - origin.z,
    };
    const length = Math.hypot(delta.x, delta.y, delta.z);
    const dir = {
      x: delta.x / length,
      y: delta.y / length,
      z: delta.z / length,
    };
    let nearest: ActorState | null = null,
      dist = weaponDefinition(event.weaponId).rangeMeters;
    for (const bot of s.bots.filter((x) => x.alive)) {
      const d = rayAabb(origin, dir, bodyBox(bot), dist);
      if (
        d !== null &&
        visible(b, origin, {
          x: origin.x + dir.x * d,
          y: origin.y + dir.y * d,
          z: origin.z + dir.z * d,
        })
      ) {
        nearest = bot;
        dist = d;
      }
    }
    if (nearest) {
      s.training.shotsHit++;
      s.combatMetrics.shotsHit++;
      event.hit = {
        targetId: nearest.id,
        hitType:
          origin.y + dir.y * dist > nearest.position.y + 1.4 ? "head" : "body",
        distanceMeters: dist,
        point: {
          x: origin.x + dir.x * dist,
          y: origin.y + dir.y * dist,
          z: origin.z + dir.z * dist,
        },
      };
      const amount =
        weaponDefinition(event.weaponId).damage *
        (event.hit.hitType === "head" ? 1.5 : 1);
      s.combatMetrics.damageDealt += Math.min(
        amount,
        nearest.health + nearest.shield,
      );
      damage(b, nearest, amount, p);
    } else {
      let coverDistance = weaponDefinition(event.weaponId).rangeMeters;
      let covered = false;
      for (const box of b.boxes) {
        const d = rayAabb(origin, dir, box, coverDistance);
        if (d !== null) {
          covered = true;
          coverDistance = d;
        }
      }
      event.hit = {
        targetId: null,
        hitType: covered ? "cover" : "none",
        distanceMeters: covered ? coverDistance : null,
        point: {
          x: origin.x + dir.x * coverDistance,
          y: origin.y + dir.y * coverDistance,
          z: origin.z + dir.z * coverDistance,
        },
      };
    }
  }
  if (b.mode === "br") {
    const phase =
      CONFIG.zone.phases.find(
        (x) =>
          s.elapsedSeconds >= x.startSecond && s.elapsedSeconds < x.endSecond,
      ) ?? CONFIG.zone.phases.at(-1)!;
    const progress = Math.min(
      1,
      Math.max(
        0,
        (s.elapsedSeconds - phase.startSecond) /
          (phase.endSecond - phase.startSecond),
      ),
    );
    b.radius =
      phase.fromRadius + (phase.toRadius - phase.fromRadius) * progress;
    for (const a of actors)
      if (a.alive && Math.hypot(a.position.x, a.position.z) > b.radius)
        damage(b, a, phase.outsideDamagePerSecond * dt, null);
  }
  for (const bot of s.bots) {
    if (!bot.alive) continue;
    const weapon = bot.inventory.slots[0]!,
      def = weaponDefinition(weapon.id);
    weapon.fireCooldownSeconds = Math.max(0, weapon.fireCooldownSeconds - dt);
    if (weapon.reloadRemainingSeconds > 0) {
      weapon.reloadRemainingSeconds = Math.max(
        0,
        weapon.reloadRemainingSeconds - dt,
      );
      if (weapon.reloadRemainingSeconds === 0) {
        const n = Math.min(def.magazineSize, weapon.reserve);
        weapon.magazine = n;
        weapon.reserve -= n;
      }
    } else if (weapon.magazine === 0 && weapon.reserve > 0)
      weapon.reloadRemainingSeconds = def.reloadSeconds;
    const nearby = b.supplies.find(
      (item) =>
        item.active &&
        Math.hypot(
          item.position.x - bot.position.x,
          item.position.z - bot.position.z,
        ) < 2.2 &&
        ((item.kind === "ammo" && weapon.reserve < def.maxReserve) ||
          (item.kind === "shield" && bot.shield < 50) ||
          (item.kind === "medkit" && bot.inventory.medkits < 3)),
    );
    if (nearby) {
      nearby.active = false;
      if (nearby.kind === "ammo")
        weapon.reserve = Math.min(
          def.maxReserve,
          weapon.reserve + def.magazineSize,
        );
      if (nearby.kind === "shield") bot.shield = Math.min(50, bot.shield + 25);
      if (nearby.kind === "medkit")
        bot.inventory.medkits = Math.min(3, bot.inventory.medkits + 1);
    }
    if (
      bot.health < 40 &&
      bot.inventory.medkits > 0 &&
      bot.healingRemainingSeconds === 0
    ) {
      bot.healingRemainingSeconds = 2;
      bot.behavior = "heal";
    }
    if (bot.healingRemainingSeconds > 0) {
      bot.healingRemainingSeconds = Math.max(
        0,
        bot.healingRemainingSeconds - dt,
      );
      if (bot.healingRemainingSeconds === 0) {
        bot.health = Math.min(100, bot.health + 35);
        bot.inventory.medkits--;
      }
      continue;
    }
    bot.reactionRemainingSeconds = Math.max(
      0,
      bot.reactionRemainingSeconds - dt,
    );
    bot.decisionCooldownSeconds -= dt;
    if (bot.decisionCooldownSeconds <= 0) {
      bot.decisionCooldownSeconds = 0.2;
      const eye = { ...bot.position, y: 1.6 };
      const enemies = actors
        .filter(
          (a) =>
            a.alive &&
            a.id !== bot.id &&
            (b.mode === "br" || a.kind === "player"),
        )
        .sort(
          (a, c) =>
            Math.hypot(
              a.position.x - bot.position.x,
              a.position.z - bot.position.z,
            ) -
            Math.hypot(
              c.position.x - bot.position.x,
              c.position.z - bot.position.z,
            ),
        );
      const target = enemies.find(
        (a) =>
          Math.hypot(
            a.position.x - bot.position.x,
            a.position.z - bot.position.z,
          ) < 42 && visible(b, eye, { ...a.position, y: a.position.y + 1 }),
      );
      if (target) {
        if (bot.memory.lastSeenTargetId !== target.id)
          bot.reactionRemainingSeconds = Math.max(
            bot.reactionRemainingSeconds,
            0.65,
          );
        bot.memory.lastSeenTargetId = target.id;
        bot.memory.lastSeenPosition = { ...target.position };
        bot.memory.lastSeenAtSeconds = s.elapsedSeconds;
        bot.destination = { ...target.position };
        bot.behavior = "engage";
      } else {
        bot.memory.lastSeenTargetId = null;
        bot.behavior = "patrol";
        if (
          !bot.destination ||
          Math.hypot(
            bot.destination.x - bot.position.x,
            bot.destination.z - bot.position.z,
          ) < 2
        )
          bot.destination = {
            x: (random(s) * 2 - 1) * Math.min(65, b.radius * 0.7),
            y: 0,
            z: (random(s) * 2 - 1) * Math.min(65, b.radius * 0.7),
          };
      }
      if (weapon.reserve === 0 && weapon.magazine < 3) {
        const supply = b.supplies
          .filter((x) => x.active && x.kind === "ammo")
          .sort(
            (a, c) =>
              Math.hypot(
                a.position.x - bot.position.x,
                a.position.z - bot.position.z,
              ) -
              Math.hypot(
                c.position.x - bot.position.x,
                c.position.z - bot.position.z,
              ),
          )[0];
        if (supply) {
          bot.behavior = "seek-loot";
          bot.destination = { ...supply.position };
        }
      }
      if (
        b.mode === "br" &&
        Math.hypot(bot.position.x, bot.position.z) > b.radius - 6
      ) {
        bot.behavior = "move-to-zone";
        bot.destination = { x: 0, y: 0, z: 0 };
      }
    }
    const target = actors.find(
      (a) => a.id === bot.memory.lastSeenTargetId && a.alive,
    );
    if (
      bot.destination &&
      (bot.behavior !== "engage" ||
        !target ||
        Math.hypot(
          target.position.x - bot.position.x,
          target.position.z - bot.position.z,
        ) > 18)
    )
      moveBot(b, bot, bot.destination, dt);
    if (target && bot.behavior === "engage") {
      bot.facing.yaw = Math.atan2(
        bot.position.x - target.position.x,
        bot.position.z - target.position.z,
      );
      if (
        bot.reactionRemainingSeconds === 0 &&
        weapon.fireCooldownSeconds === 0 &&
        weapon.magazine > 0 &&
        weapon.reloadRemainingSeconds === 0
      ) {
        const origin = { ...bot.position, y: bot.position.y + 1.55 },
          aim = {
            ...target.position,
            y:
              target.position.y +
              (target.kind === "player" && p.crouching ? 0.55 : 1),
          };
        if (visible(b, origin, aim)) {
          const yaw =
              Math.atan2(-(aim.x - origin.x), -(aim.z - origin.z)) +
              (random(s) * 2 - 1) * 0.07,
            pitch =
              Math.atan2(
                aim.y - origin.y,
                Math.hypot(aim.x - origin.x, aim.z - origin.z),
              ) +
              (random(s) * 2 - 1) * 0.07;
          const dir = {
            x: -Math.sin(yaw) * Math.cos(pitch),
            y: Math.sin(pitch),
            z: -Math.cos(yaw) * Math.cos(pitch),
          };
          let d = def.rangeMeters,
            hit: ActorState | null = null;
          for (const a of actors.filter((a) => a.alive && a.id !== bot.id)) {
            const t = rayAabb(origin, dir, bodyBox(a), d);
            if (t !== null) {
              d = t;
              hit = a;
            }
          }
          let cover = false;
          for (const a of b.boxes) {
            const t = rayAabb(origin, dir, a, d);
            if (t !== null) {
              d = t;
              hit = null;
              cover = true;
            }
          }
          const point = {
            x: origin.x + dir.x * d,
            y: origin.y + dir.y * d,
            z: origin.z + dir.z * d,
          };
          weapon.magazine--;
          weapon.fireCooldownSeconds = Math.max(0.32, 1 / def.shotsPerSecond);
          if (hit) damage(b, hit, def.damage, bot);
          events.push({
            type: "shot",
            shooterId: bot.id,
            weaponId: weapon.id,
            hit: {
              targetId: hit?.id ?? null,
              hitType: hit ? "body" : cover ? "cover" : "none",
              distanceMeters: d,
              point,
            },
          });
        }
      }
    }
  }
  if (input.interactPressed) {
    const supply = b.supplies
      .filter(
        (x) =>
          x.active &&
          Math.hypot(x.position.x - p.position.x, x.position.z - p.position.z) <
            2.2,
      )
      .sort(
        (a, c) =>
          Math.hypot(a.position.x - p.position.x, a.position.z - p.position.z) -
          Math.hypot(c.position.x - p.position.x, c.position.z - p.position.z),
      )[0];
    if (supply) {
      supply.active = false;
      if (supply.kind === "ammo") {
        for (const w of Object.values(s.practiceWeapons))
          w.reserve = Math.min(
            weaponDefinition(w.id).maxReserve,
            w.reserve + weaponDefinition(w.id).magazineSize,
          );
      }
      if (supply.kind === "shield") p.shield = Math.min(50, p.shield + 25);
      if (supply.kind === "medkit")
        p.inventory.medkits = Math.min(3, p.inventory.medkits + 1);
    }
  }
  if (
    input.healPressed &&
    p.inventory.medkits > 0 &&
    p.health < 100 &&
    b.healRemaining === 0
  ) {
    b.healRemaining = 2;
  }
  if (b.healRemaining > 0) {
    if (input.fireHeld || input.sprint) b.healRemaining = 0;
    else {
      b.healRemaining = Math.max(0, b.healRemaining - dt);
      if (b.healRemaining === 0) {
        p.health = Math.min(100, p.health + 35);
        p.inventory.medkits--;
      }
    }
  }
  b.damageFlash = Math.max(0, b.damageFlash - dt);
  const remaining = s.bots.filter((x) => x.alive).length;
  if (!p.alive && remaining === 0) {
    b.outcome = "draw";
    b.place = null;
  } else if (!p.alive) {
    b.outcome = "defeat";
    b.place = remaining + 1;
  } else if (remaining === 0) {
    b.outcome = "victory";
    b.place = 1;
  } else if (s.elapsedSeconds >= (b.mode === "br" ? 600 : 300)) {
    b.outcome = "draw";
    b.place = null;
  }
  if (b.outcome) s.phase = "finished";
  return events;
}
