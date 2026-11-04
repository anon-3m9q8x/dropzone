export type * from "../../contracts/types.ts";
import type {
  GameSession,
  TrainingState,
  WeaponId,
  WeaponState,
} from "../../contracts/types.ts";
export type TrainingSession = GameSession & {
  mode: "training";
  training: TrainingState;
  practiceWeapons: Record<WeaponId, WeaponState>;
  fallenTargets: Record<string, number>;
  targetSequence: number;
};
