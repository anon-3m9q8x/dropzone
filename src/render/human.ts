import * as THREE from "three";
/** Original low-poly humanoid: head, face, torso, paired arms/legs and boots. */
export function human(color: number) {
  const group = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
    skin = new THREE.MeshStandardMaterial({ color: 0xd6a27e }),
    dark = new THREE.MeshStandardMaterial({ color: 0x192735 });
  const part = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };
  part(new THREE.CapsuleGeometry(0.21, 0.36, 4, 8), cloth, 0, 1.08, 0);
  part(new THREE.SphereGeometry(0.17, 12, 8), skin, 0, 1.57, 0);
  part(new THREE.BoxGeometry(0.3, 0.13, 0.3), dark, 0, 1.7, 0.015);
  part(new THREE.BoxGeometry(0.23, 0.055, 0.03), dark, 0, 1.59, -0.16);
  for (const sign of [-1, 1]) {
    part(
      new THREE.CapsuleGeometry(0.075, 0.38, 3, 6),
      cloth,
      sign * 0.29,
      1.06,
      -0.08,
    );
    part(new THREE.SphereGeometry(0.075, 8, 6), skin, sign * 0.29, 0.79, -0.08);
    const leg = part(
      new THREE.CapsuleGeometry(0.095, 0.48, 3, 6),
      dark,
      sign * 0.12,
      0.43,
      0,
    );
    leg.name = sign < 0 ? "legL" : "legR";
    part(
      new THREE.BoxGeometry(0.18, 0.13, 0.3),
      dark,
      sign * 0.12,
      0.08,
      -0.055,
    );
  }
  part(new THREE.BoxGeometry(0.12, 0.1, 0.65), dark, 0.27, 0.99, -0.32);
  return group;
}
export function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (
      obj instanceof THREE.Mesh ||
      obj instanceof THREE.LineSegments ||
      obj instanceof THREE.Line
    ) {
      obj.geometry.dispose();
      for (const m of Array.isArray(obj.material)
        ? obj.material
        : [obj.material])
        m.dispose();
    }
  });
}
