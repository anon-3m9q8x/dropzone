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
];
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
