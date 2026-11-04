import type {
  TrainingSession,
  PlayerInput,
  WeaponId,
  WeaponState,
  GameEvent,
  Aabb,
} from "./types";
import { CONFIG, weaponDefinition } from "./config";
import {
  trainingColliders,
  blocked,
  horizontalOverlap,
  nearestShot,
} from "./collision";
export const emptyInput = (): PlayerInput => ({
  forward: 0,
  strafe: 0,
  yawDeltaRadians: 0,
  pitchDeltaRadians: 0,
  sprint: false,
  crouch: false,
  jumpPressed: false,
  ads: false,
  fireHeld: false,
  reloadPressed: false,
  interactPressed: false,
  healPressed: false,
  switchSlot: null,
});
export const newWeapon = (id: WeaponId): WeaponState => ({
  id,
  magazine: weaponDefinition(id).magazineSize,
  reserve: weaponDefinition(id).defaultReserve,
  reloadRemainingSeconds: 0,
  fireCooldownSeconds: 0,
  triggerPressedLastTick: false,
});
export function createTraining(
  seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? 1,
): TrainingSession {
  const w = newWeapon("ar");
  return {
    schemaVersion: 1,
    matchId: crypto.randomUUID(),
    mode: "training",
    phase: "ready",
    seed,
    rngState: seed >>> 0 || 0x6d2b79f5,
    elapsedSeconds: 0,
    difficulty: "normal",
    startedAtIso: new Date().toISOString(),
    player: {
      id: "player",
      kind: "player",
      name: "あなた",
      alive: true,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      facing: { yaw: Math.PI, pitch: 0 },
      health: CONFIG.match.initialHealth,
      shield: CONFIG.match.initialShield,
      grounded: true,
      crouching: false,
      inventory: {
        slots: [w, null],
        activeSlot: 0,
        medkits: CONFIG.match.initialMedkits,
      },
      healingRemainingSeconds: 0,
      eliminationCount: 0,
      lastDamagedBy: null,
      isAiming: false,
      isSprinting: false,
      selectedPickupId: null,
    },
    bots: [],
    combatMetrics: { shotsFired: 0, shotsHit: 0, damageDealt: 0 },
    training: {
      ammoUnlimited: true,
      shotsFired: 0,
      shotsHit: 0,
      targets: [
        {
          id: "target-1",
          position: { x: 0, y: 1, z: 12 },
          isMoving: false,
          movementMinX: 0,
          movementMaxX: 0,
          direction: 0,
          speedMetersPerSecond: 0,
          hitCount: 0,
        },
        {
          id: "target-2",
          position: { x: -6, y: 1, z: 22 },
          isMoving: false,
          movementMinX: -6,
          movementMaxX: -6,
          direction: 0,
          speedMetersPerSecond: 0,
          hitCount: 0,
        },
        {
          id: "target-3",
          position: { x: 6, y: 1, z: 32 },
          isMoving: false,
          movementMinX: 6,
          movementMaxX: 6,
          direction: 0,
          speedMetersPerSecond: 0,
          hitCount: 0,
        },
        {
          id: "target-moving",
          position: { x: -8, y: 1, z: 25 },
          isMoving: true,
          movementMinX: -8,
          movementMaxX: 8,
          direction: 1,
          speedMetersPerSecond: 2,
          hitCount: 0,
        },
      ],
    },
    loot: [],
    zone: {
      center: { x: 0, z: 0 },
      radiusMeters: 90,
      phaseIndex: 0,
      phaseElapsedSeconds: 0,
      damagePerSecond: 0,
    },
    killFeed: [],
    result: null,
    accumulatorSeconds: 0,
    fallenTargets: {},
    targetSequence: 4,
    practiceWeapons: { ar: w, smg: newWeapon("smg"), dmr: newWeapon("dmr") },
  };
}
export function switchWeapon(s: TrainingSession, id: WeaponId) {
  const current = s.player.inventory.slots[0];
  if (current) {
    current.reloadRemainingSeconds = 0;
    current.triggerPressedLastTick = true;
    s.practiceWeapons[current.id] = current;
  }
  const next = s.practiceWeapons[id];
  next.triggerPressedLastTick = true;
  next.reloadRemainingSeconds = 0;
  s.player.inventory.slots[0] = next;
}
export function random(s: TrainingSession) {
  let x = s.rngState;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  s.rngState = x >>> 0;
  return s.rngState / 4294967296;
}
export function stepTraining(
  s: TrainingSession,
  input: PlayerInput,
  dt: number,
  boxes: readonly Aabb[] = trainingColliders,
  unlimited = true,
): GameEvent[] {
  const events: GameEvent[] = [];
  if (s.phase !== "playing") return events;
  if (!Number.isFinite(dt) || dt <= 0 || dt > CONFIG.world.maxStepDeltaSeconds)
    throw Error("無効なtick間隔");
  s.elapsedSeconds += dt;
  const p = s.player;
  const w = p.inventory.slots[0];
  if (!w) return events;
  const def = weaponDefinition(w.id);
  p.facing.yaw += input.yawDeltaRadians;
  p.facing.pitch = Math.max(
    (CONFIG.camera.pitchMinDegrees * Math.PI) / 180,
    Math.min(
      (CONFIG.camera.pitchMaxDegrees * Math.PI) / 180,
      p.facing.pitch + input.pitchDeltaRadians,
    ),
  );
  const height = input.crouch
    ? CONFIG.world.crouchHeightMeters
    : CONFIG.world.standingHeightMeters;
  p.crouching =
    input.crouch ||
    blocked(p.position, height, CONFIG.world.playerRadiusMeters, boxes);
  const bodyHeight = p.crouching
    ? CONFIG.world.crouchHeightMeters
    : CONFIG.world.standingHeightMeters;
  p.isAiming = input.ads;
  p.isSprinting = input.sprint && !input.ads && !p.crouching;
  const speed = p.crouching
    ? CONFIG.world.crouchMetersPerSecond
    : p.isSprinting
      ? CONFIG.world.sprintMetersPerSecond
      : CONFIG.world.walkMetersPerSecond;
  const length = Math.max(1, Math.hypot(input.forward, input.strafe));
  const x =
      ((-Math.sin(p.facing.yaw) * input.forward +
        Math.cos(p.facing.yaw) * input.strafe) /
        length) *
      speed *
      dt,
    z =
      ((-Math.cos(p.facing.yaw) * input.forward -
        Math.sin(p.facing.yaw) * input.strafe) /
        length) *
      speed *
      dt;
  if (
    !blocked(
      { ...p.position, x: p.position.x + x },
      bodyHeight,
      CONFIG.world.playerRadiusMeters,
      boxes,
    )
  )
    p.position.x += x;
  if (
    !blocked(
      { ...p.position, z: p.position.z + z },
      bodyHeight,
      CONFIG.world.playerRadiusMeters,
      boxes,
    )
  )
    p.position.z += z;
  if (input.jumpPressed && p.grounded) {
    p.velocity.y = CONFIG.world.jumpInitialMetersPerSecond;
    p.grounded = false;
  }
  p.velocity.y -= CONFIG.world.gravityMetersPerSecondSquared * dt;
  let y = p.position.y + p.velocity.y * dt;
  let grounded = false;
  for (const b of boxes) {
    if (!horizontalOverlap(p.position, CONFIG.world.playerRadiusMeters, b))
      continue;
    if (p.velocity.y <= 0 && p.position.y >= b.max.y - 1e-4 && y < b.max.y) {
      y = b.max.y;
      p.velocity.y = 0;
      grounded = true;
    } else if (
      p.velocity.y > 0 &&
      p.position.y + bodyHeight <= b.min.y + 1e-4 &&
      y + bodyHeight > b.min.y
    ) {
      y = b.min.y - bodyHeight;
      p.velocity.y = 0;
    }
  }
  if (y <= 0) {
    y = 0;
    p.velocity.y = 0;
    grounded = true;
  }
  p.position.y = y;
  p.grounded = grounded;
  for (const t of s.training.targets)
    if (t.isMoving && s.fallenTargets[t.id] === undefined) {
      t.position.x += t.direction * t.speedMetersPerSecond * dt;
      if (t.position.x >= t.movementMaxX) {
        t.position.x = t.movementMaxX - (t.position.x - t.movementMaxX);
        t.direction = -1;
      }
      if (t.position.x <= t.movementMinX) {
        t.position.x = t.movementMinX + (t.movementMinX - t.position.x);
        t.direction = 1;
      }
    }
  w.fireCooldownSeconds =
    w.fireCooldownSeconds > 0 ? w.fireCooldownSeconds - dt : 0;
  if (p.isSprinting) w.reloadRemainingSeconds = 0;
  if (
    input.reloadPressed &&
    !p.isSprinting &&
    w.magazine < def.magazineSize &&
    (unlimited || w.reserve > 0) &&
    w.reloadRemainingSeconds === 0
  ) {
    w.reloadRemainingSeconds = def.reloadSeconds;
    events.push({ type: "sound", cue: "reload" });
  }
  if (w.reloadRemainingSeconds > 0) {
    w.reloadRemainingSeconds = Math.max(0, w.reloadRemainingSeconds - dt);
    if (w.reloadRemainingSeconds === 0) {
      const amount = unlimited
        ? def.magazineSize - w.magazine
        : Math.min(def.magazineSize - w.magazine, w.reserve);
      w.magazine += amount;
      if (!unlimited) w.reserve -= amount;
    }
  }
  const trigger =
    input.fireHeld && (def.automatic || !w.triggerPressedLastTick);
  if (
    trigger &&
    !p.isSprinting &&
    w.reloadRemainingSeconds === 0 &&
    w.fireCooldownSeconds <= 0 &&
    w.magazine > 0
  ) {
    w.magazine--;
    w.fireCooldownSeconds += 1 / def.shotsPerSecond;
    s.training.shotsFired++;
    s.combatMetrics.shotsFired++;
    const spread =
      ((p.isAiming ? def.adsSpreadDegrees : def.hipSpreadDegrees) * Math.PI) /
      180;
    const yaw = p.facing.yaw + (random(s) * 2 - 1) * spread,
      pitch = p.facing.pitch + (random(s) * 2 - 1) * spread;
    const direction = {
      x: -Math.sin(yaw) * Math.cos(pitch),
      y: Math.sin(pitch),
      z: -Math.cos(yaw) * Math.cos(pitch),
    };
    const origin = { ...p.position, y: p.position.y + bodyHeight * 0.94 };
    const hit = nearestShot(
      origin,
      direction,
      def.rangeMeters,
      boxes,
      s.training.targets.filter((t) => s.fallenTargets[t.id] === undefined),
    );
    if (hit?.kind === "target") {
      const t = s.training.targets.find((t) => t.id === hit.id);
      if (t) {
        t.hitCount++;
        if (unlimited) s.fallenTargets[t.id] = s.elapsedSeconds;
      }
      s.training.shotsHit++;
      s.combatMetrics.shotsHit++;
      if (
        unlimited &&
        s.training.shotsHit % 5 === 0 &&
        s.training.targets.length < 12
      )
        spawnTarget(s);
    }
    events.push({
      type: "shot",
      shooterId: "player",
      weaponId: w.id,
      hit: {
        targetId: hit?.id ?? null,
        hitType: hit?.kind === "target" ? "body" : hit ? "cover" : "none",
        distanceMeters: hit?.distance ?? null,
        point: {
          x: origin.x + direction.x * (hit?.distance ?? def.rangeMeters),
          y: origin.y + direction.y * (hit?.distance ?? def.rangeMeters),
          z: origin.z + direction.z * (hit?.distance ?? def.rangeMeters),
        },
      },
    });
  }
  if (unlimited) {
    for (const t of [...s.training.targets]) {
      const down = s.fallenTargets[t.id];
      if (down !== undefined && s.elapsedSeconds - down >= 1) {
        s.training.targets = s.training.targets.filter((x) => x.id !== t.id);
        delete s.fallenTargets[t.id];
        spawnTarget(s);
      }
    }
  }
  w.triggerPressedLastTick = input.fireHeld;
  return events;
}

function spawnTarget(s: TrainingSession) {
  const n = ++s.targetSequence;
  let position = { x: 0, y: 1, z: 30 };
  for (let i = 0; i < 64; i++) {
    const candidate = {
      x: (random(s) * 2 - 1) * 12,
      y: 1,
      z: 10 + random(s) * 24,
    };
    if (
      !blocked({ ...candidate, y: 0 }, 1.8, 0.65, trainingColliders) &&
      Math.hypot(
        candidate.x - s.player.position.x,
        candidate.z - s.player.position.z,
      ) > 4 &&
      s.training.targets.every(
        (t) =>
          Math.hypot(candidate.x - t.position.x, candidate.z - t.position.z) >
          2,
      )
    ) {
      position = candidate;
      break;
    }
  }
  s.training.targets.push({
    id: `target-${n}`,
    position,
    isMoving: n % 3 === 0,
    movementMinX: -12,
    movementMaxX: 12,
    direction: n % 3 === 0 ? 1 : 0,
    speedMetersPerSecond: 2 + Math.min(2, s.training.shotsHit / 20),
    hitCount: 0,
  });
}
