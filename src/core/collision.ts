import type { Aabb, Vec3, TrainingTargetState } from "./types";
export const trainingColliders: Aabb[] = [
  {
    id: "ground",
    solid: true,
    min: { x: -20, y: -0.3, z: -10 },
    max: { x: 20, y: 0, z: 40 },
  },
  {
    id: "wall-left",
    solid: true,
    min: { x: -20.3, y: 0, z: -10 },
    max: { x: -20, y: 3, z: 40 },
  },
  {
    id: "wall-right",
    solid: true,
    min: { x: 20, y: 0, z: -10 },
    max: { x: 20.3, y: 3, z: 40 },
  },
  {
    id: "wall-back",
    solid: true,
    min: { x: -20, y: 0, z: -10.3 },
    max: { x: 20, y: 3, z: -10 },
  },
  {
    id: "wall-far",
    solid: true,
    min: { x: -20, y: 0, z: 40 },
    max: { x: 20, y: 5, z: 40.3 },
  },
  {
    id: "cover-left",
    solid: true,
    min: { x: -10, y: 0, z: 5 },
    max: { x: -7, y: 1.4, z: 8 },
  },
  {
    id: "cover-mid",
    solid: true,
    min: { x: -3, y: 0, z: 15 },
    max: { x: -1, y: 1.3, z: 17 },
  },
  {
    id: "cover-right",
    solid: true,
    min: { x: 9, y: 0, z: 18 },
    max: { x: 12, y: 1.7, z: 21 },
  },
  // 武器台(スタート地点の後ろ)。上に6種類の武器が置いてある。
  {
    id: "rack-bench",
    solid: true,
    min: { x: -7, y: 0, z: -4.7 },
    max: { x: 7, y: 0.9, z: -3.5 },
  },
  // 左後方の高台と、そこへ上る階段(1段0.4m)。
  {
    id: "platform-left",
    solid: true,
    min: { x: -20, y: 0, z: -10 },
    max: { x: -13, y: 2.4, z: -3 },
  },
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `stair-left-${i + 1}`,
    solid: true,
    min: { x: -13 + (5 - i) * 0.6, y: 0, z: -8 },
    max: { x: -13 + (6 - i) * 0.6, y: 0.4 * (i + 1), z: -5 },
  })),
  {
    id: "rail-left-front",
    solid: true,
    min: { x: -20, y: 2.4, z: -3.12 },
    max: { x: -13, y: 3.4, z: -3 },
  },
  {
    id: "rail-left-side",
    solid: true,
    min: { x: -13.12, y: 2.4, z: -5 },
    max: { x: -13, y: 3.4, z: -3 },
  },
  // 窓の開いた壁(左中央)。窓越しに撃てる。
  {
    id: "cover-window-low",
    solid: true,
    min: { x: -15, y: 0, z: 12 },
    max: { x: -11, y: 0.9, z: 12.6 },
  },
  {
    id: "cover-window-left",
    solid: true,
    min: { x: -15, y: 0.9, z: 12 },
    max: { x: -14.2, y: 2.4, z: 12.6 },
  },
  {
    id: "cover-window-right",
    solid: true,
    min: { x: -11.8, y: 0.9, z: 12 },
    max: { x: -11, y: 2.4, z: 12.6 },
  },
  {
    id: "cover-window-top",
    solid: true,
    min: { x: -15, y: 1.7, z: 12 },
    max: { x: -11, y: 2.4, z: 12.6 },
  },
  {
    id: "cover-barrel-1",
    solid: true,
    min: { x: 6.6, y: 0, z: 9.6 },
    max: { x: 7.4, y: 1.1, z: 10.4 },
  },
  {
    id: "cover-barrel-2",
    solid: true,
    min: { x: 7.6, y: 0, z: 10 },
    max: { x: 8.4, y: 1.1, z: 10.8 },
  },
  // 中央奥の高架ブリッジ(上に的が立つ)。
  {
    id: "bridge-deck",
    solid: true,
    min: { x: -8, y: 3.2, z: 26.4 },
    max: { x: 8, y: 3.5, z: 27.6 },
  },
  {
    id: "bridge-pillar-left",
    solid: true,
    min: { x: -8.4, y: 0, z: 26.6 },
    max: { x: -7.6, y: 3.2, z: 27.4 },
  },
  {
    id: "bridge-pillar-right",
    solid: true,
    min: { x: 7.6, y: 0, z: 26.6 },
    max: { x: 8.4, y: 3.2, z: 27.4 },
  },
  // 右奥のコンテナ2段積み(上に的が立つ)。
  {
    id: "stack-right-low",
    solid: true,
    min: { x: 14, y: 0, z: 24 },
    max: { x: 20, y: 2.6, z: 30 },
  },
  {
    id: "stack-right-high",
    solid: true,
    min: { x: 15.5, y: 2.6, z: 25.5 },
    max: { x: 20, y: 4.4, z: 28.5 },
  },
  // 奥の段々の土手。
  {
    id: "berm-1",
    solid: true,
    min: { x: -20, y: 0, z: 36 },
    max: { x: 20, y: 0.8, z: 40 },
  },
  {
    id: "berm-2",
    solid: true,
    min: { x: -20, y: 0.8, z: 38 },
    max: { x: 20, y: 1.6, z: 40 },
  },
];
/** 高い場所にある的の置き場所(的の中心の高さ = 足場の上面 + 1m)。 */
export const ELEVATED_TARGET_SPOTS = [
  { x: -4, y: 4.5, z: 27, moving: true },
  { x: 4, y: 4.5, z: 27, moving: false },
  { x: 16.8, y: 3.6, z: 26 },
  { x: 17.8, y: 5.4, z: 27 },
  { x: -10, y: 2.6, z: 38.8 },
  { x: 10, y: 2.6, z: 38.8 },
] as const;
export function rayAabb(
  origin: Vec3,
  direction: Vec3,
  box: Aabb,
  maxDistance: number,
): number | null {
  let min = 0,
    max = maxDistance;
  for (const axis of ["x", "y", "z"] as const) {
    const d = direction[axis];
    if (Math.abs(d) < 1e-9) {
      if (origin[axis] < box.min[axis] || origin[axis] > box.max[axis])
        return null;
      continue;
    }
    const a = (box.min[axis] - origin[axis]) / d,
      b = (box.max[axis] - origin[axis]) / d;
    min = Math.max(min, Math.min(a, b));
    max = Math.min(max, Math.max(a, b));
    if (max < min) return null;
  }
  return min <= maxDistance ? min : null;
}
export function horizontalOverlap(
  pos: Vec3,
  radius: number,
  box: Aabb,
): boolean {
  const x = Math.max(box.min.x, Math.min(pos.x, box.max.x)),
    z = Math.max(box.min.z, Math.min(pos.z, box.max.z));
  return (pos.x - x) ** 2 + (pos.z - z) ** 2 < radius ** 2 - 1e-8;
}
export function blocked(
  pos: Vec3,
  height: number,
  radius: number,
  boxes: readonly Aabb[],
): boolean {
  return boxes.some(
    (b) =>
      b.solid &&
      pos.y + height > b.min.y + 1e-4 &&
      pos.y < b.max.y - 1e-4 &&
      horizontalOverlap(pos, radius, b),
  );
}
export const targetBox = (t: TrainingTargetState): Aabb => ({
  id: t.id,
  solid: false,
  min: { x: t.position.x - 0.6, y: t.position.y - 0.8, z: t.position.z - 0.12 },
  max: { x: t.position.x + 0.6, y: t.position.y + 0.8, z: t.position.z + 0.12 },
});
export function nearestShot(
  origin: Vec3,
  direction: Vec3,
  range: number,
  boxes: readonly Aabb[],
  targets: readonly TrainingTargetState[],
): { id: string; distance: number; kind: "target" | "cover" } | null {
  let result: {
    id: string;
    distance: number;
    kind: "target" | "cover";
  } | null = null;
  for (const b of boxes) {
    const d = rayAabb(origin, direction, b, range);
    if (d !== null && (!result || d < result.distance))
      result = { id: b.id, distance: d, kind: "cover" };
  }
  for (const t of targets) {
    const d = rayAabb(origin, direction, targetBox(t), range);
    if (d !== null && (!result || d < result.distance - 1e-6))
      result = { id: t.id, distance: d, kind: "target" };
  }
  return result;
}
