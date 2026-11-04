/** DROPZONE v1 — normative contracts. Logic is implemented by Claude Code. */
export type EntityId = string;
export type Milliseconds = number;
export type Seconds = number;
export type GameMode = 'training' | 'solo-br';
export type MatchPhase = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'finished' | 'error';
export type MatchOutcome = 'victory' | 'defeat' | 'draw' | 'abandoned';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type WeaponId = 'ar' | 'smg' | 'dmr';
export type LootKind = 'ammo-ar' | 'ammo-smg' | 'ammo-dmr' | 'medkit' | 'shield' | 'weapon-ar' | 'weapon-smg' | 'weapon-dmr';
export type BotBehavior = 'patrol' | 'seek-loot' | 'engage' | 'retreat' | 'heal' | 'move-to-zone';
export type AudioCue = 'shot-ar' | 'shot-smg' | 'shot-dmr' | 'hit' | 'shield-break' | 'reload' | 'pickup' | 'zone' | 'win' | 'lose' | 'ui';
export type UIPage = 'home' | 'mode-select' | 'training' | 'match' | 'pause' | 'result' | 'stats' | 'settings' | 'help';
export type ActorKind = 'player' | 'bot';

export interface Vec2 { x: number; z: number }
export interface Vec3 { x: number; y: number; z: number }
export interface Aabb { min: Vec3; max: Vec3; solid: boolean; id: string }
export interface Rotation { yaw: number; pitch: number }
export interface WeaponDefinition {
  id: WeaponId; label: string; damage: number; shotsPerSecond: number;
  magazineSize: number; defaultReserve: number; maxReserve: number;
  reloadSeconds: number; rangeMeters: number; hipSpreadDegrees: number;
  adsSpreadDegrees: number; automatic: boolean;
}
export interface WeaponState {
  id: WeaponId; magazine: number; reserve: number; reloadRemainingSeconds: number;
  fireCooldownSeconds: number; triggerPressedLastTick: boolean;
}
export interface InventoryState {
  slots: [WeaponState | null, WeaponState | null];
  activeSlot: 0 | 1; medkits: number;
}
export interface DamageEvent {
  attackerId: EntityId | null; targetId: EntityId; source: 'weapon' | 'zone';
  baseDamage: number; multiplier: number; appliedToShield: number;
  appliedToHealth: number; isHeadshot: boolean; atSeconds: number;
}
export interface ActorState {
  id: EntityId; kind: ActorKind; name: string; alive: boolean;
  position: Vec3; velocity: Vec3; facing: Rotation;
  health: number; shield: number; grounded: boolean; crouching: boolean;
  inventory: InventoryState; healingRemainingSeconds: number;
  eliminationCount: number; lastDamagedBy: EntityId | null;
}
export interface BotMemory {
  lastSeenTargetId: EntityId | null;
  lastSeenPosition: Vec3 | null; lastSeenAtSeconds: number | null;
  lastHeardPosition: Vec3 | null; lastHeardAtSeconds: number | null;
}
export interface BotState extends ActorState {
  kind: 'bot'; behavior: BotBehavior; difficulty: Difficulty;
  decisionCooldownSeconds: number; reactionRemainingSeconds: number;
  destination: Vec3 | null; memory: BotMemory;
}
export interface PlayerState extends ActorState {
  kind: 'player'; isAiming: boolean; isSprinting: boolean;
  selectedPickupId: EntityId | null;
}
export interface LootState {
  id: EntityId; kind: LootKind; position: Vec3; quantity: number; active: boolean;
  droppedWeapon?: WeaponState;
}
export interface ZoneState {
  center: Vec2; radiusMeters: number; phaseIndex: number;
  phaseElapsedSeconds: number; damagePerSecond: number;
}
export interface ArenaLayout {
  seed: number; halfExtentMeters: 96; staticColliders: Aabb[];
  lootSpawns: Vec3[]; actorSpawns: Vec3[];
}
export interface CombatMetrics { shotsFired: number; shotsHit: number; damageDealt: number }
export interface TrainingTargetState {
  id: EntityId; position: Vec3; isMoving: boolean;
  movementMinX: number; movementMaxX: number; direction: -1 | 0 | 1;
  speedMetersPerSecond: number; hitCount: number;
}
export interface TrainingState { targets: TrainingTargetState[]; shotsFired: number; shotsHit: number; ammoUnlimited: true }
export interface GameSession {
  schemaVersion: 1; matchId: string; mode: GameMode; phase: MatchPhase;
  seed: number; rngState: number; elapsedSeconds: number;
  difficulty: Difficulty; player: PlayerState; bots: BotState[];
  combatMetrics: CombatMetrics; startedAtIso: string;
  training: TrainingState | null;
  loot: LootState[]; zone: ZoneState; killFeed: KillFeedEntry[];
  result: MatchResult | null; accumulatorSeconds: number;
}
export interface KillFeedEntry { id: string; atSeconds: number; attackerName: string | null; targetName: string; reason: 'weapon' | 'zone' }
export interface MatchResult {
  matchId: string; mode: GameMode; difficulty: Difficulty;
  startedAtIso: string; finishedAtIso: string; elapsedSeconds: number;
  outcome: MatchOutcome; place: number | null; eliminations: number;
  shotsFired: number; shotsHit: number; damageDealt: number;
}
export interface MatchSnapshotV1 {
  schemaVersion: 1; savedAtIso: string; appVersion: string;
  session: Omit<GameSession, 'accumulatorSeconds'>;
}
export interface LifetimeStats {
  matches: number; wins: number; losses: number; draws: number;
  totalEliminations: number; totalDamage: number; totalShots: number;
  totalHits: number; totalPlaySeconds: number; bestPlacement: number | null;
}
export interface SettingsV1 {
  schemaVersion: 1; sensitivity: number; masterVolume: number;
  sfxEnabled: boolean; reducedMotion: boolean; showFps: boolean;
  uiScale: number; graphicsQuality: 'low' | 'medium' | 'high';
  colorAssistMode: boolean;
}
export interface SaveDataV1 {
  schemaVersion: 1; updatedAtIso: string; settings: SettingsV1;
  stats: LifetimeStats; results: MatchResult[];
  currentMatch: MatchSnapshotV1 | null;
}
export interface PlayerInput {
  forward: number; strafe: number; yawDeltaRadians: number; pitchDeltaRadians: number;
  sprint: boolean; crouch: boolean; jumpPressed: boolean; ads: boolean;
  fireHeld: boolean; reloadPressed: boolean; interactPressed: boolean;
  healPressed: boolean; switchSlot: 0 | 1 | null;
}
export interface HitScanResult { targetId: EntityId | null; hitType: 'head' | 'body' | 'cover' | 'none'; distanceMeters: number | null; point: Vec3 | null }
export type GameEvent =
  | { type: 'shot'; shooterId: EntityId; weaponId: WeaponId; hit: HitScanResult }
  | { type: 'damage'; payload: DamageEvent }
  | { type: 'elimination'; actorId: EntityId; byId: EntityId | null }
  | { type: 'pickup'; actorId: EntityId; lootId: EntityId }
  | { type: 'zone-phase'; phaseIndex: number }
  | { type: 'match-finished'; result: MatchResult }
  | { type: 'sound'; cue: AudioCue };
export type DomainErrorCode =
  | 'UNSUPPORTED_WEBGL' | 'POINTER_LOCK_DENIED' | 'SAVE_CORRUPTED' | 'SAVE_QUOTA'
  | 'UNSUPPORTED_SCHEMA' | 'INVALID_INPUT' | 'INVALID_ACTION' | 'SESSION_NOT_FOUND'
  | 'MATCH_ALREADY_FINISHED' | 'AUDIO_UNAVAILABLE' | 'UNKNOWN';
export interface DomainError { code: DomainErrorCode; message: string; recoverable: boolean; detail?: string }
export type Result<T> = { ok: true; value: T } | { ok: false; error: DomainError };
export interface TickResult { state: GameSession; events: GameEvent[] }
export interface VisibleHudState {
  health: number; shield: number; ammoMagazine: number; ammoReserve: number;
  activeWeapon: WeaponId; aliveCount: number; kills: number;
  zoneRadiusMeters: number; timeToNextZoneSeconds: number;
  matchElapsedSeconds: number; nearestLoot: { kind: LootKind; distanceMeters: number } | null;
}
