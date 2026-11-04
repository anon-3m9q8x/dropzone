import * as THREE from "three";
import type { WeaponId } from "../core/types";

/**
 * Original procedural first-person weapons: blackened metal receivers,
 * polymer furniture, gold accent stripes and holo / magnified optics.
 * Weapon space: bore axis on y = 0, muzzle toward -z, metres.
 */
export interface WeaponModel {
  group: THREE.Group;
  muzzle: THREE.Object3D;
  /** Height of the optic centre above the bore, used to line up ADS. */
  sightHeight: number;
}

interface Palette {
  metal: THREE.Material;
  steel: THREE.Material;
  polymer: THREE.Material;
  dark: THREE.Material;
  gold: THREE.Material;
  glass: THREE.Material;
  dot: THREE.Material;
  red: THREE.Material;
}

function palette(): Palette {
  return {
    metal: new THREE.MeshStandardMaterial({
      color: 0x4a4e55,
      metalness: 0.45,
      roughness: 0.5,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: 0x33363b,
      metalness: 0.7,
      roughness: 0.35,
    }),
    polymer: new THREE.MeshStandardMaterial({
      color: 0x2a2b2f,
      roughness: 0.85,
    }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.9 }),
    gold: new THREE.MeshStandardMaterial({
      color: 0xc29a4e,
      metalness: 0.35,
      roughness: 0.5,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xd89a3a,
      emissive: 0x2a1a06,
      metalness: 0.1,
      roughness: 0.05,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
    dot: new THREE.MeshBasicMaterial({ color: 0xff2b2b }),
    red: new THREE.MeshBasicMaterial({ color: 0xc8302c }),
  };
}

class Builder {
  constructor(
    readonly group: THREE.Group,
    readonly m: Palette,
  ) {}
  box(
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    rx = 0,
    rz = 0,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, 0, rz);
    this.group.add(mesh);
    return mesh;
  }
  /** Cylinder lying along the z axis. */
  cyl(
    r: number,
    length: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sides = 14,
    rFront = r,
    open = false,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(rFront, r, length, sides, 1, open),
      material,
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    return mesh;
  }
  /** Picatinny rail ridges between z0 (rear) and z1 (front). */
  rail(y: number, z0: number, z1: number, x = 0, vertical = false) {
    const length = z0 - z1;
    this.box(
      vertical ? 0.008 : 0.022,
      vertical ? 0.022 : 0.008,
      length,
      this.m.polymer,
      x,
      y,
      (z0 + z1) / 2,
    );
    for (let z = z0 - 0.006; z > z1; z -= 0.011)
      this.box(
        vertical ? 0.006 : 0.024,
        vertical ? 0.024 : 0.006,
        0.006,
        this.m.dark,
        x + (vertical ? Math.sign(x) * 0.006 : 0),
        y + (vertical ? 0 : 0.006),
        z,
      );
  }
  /** Slotted M-LOK style handguard. */
  handguard(z0: number, z1: number, w = 0.062, h = 0.066) {
    const length = z0 - z1;
    this.box(w, h, length, this.m.metal, 0, -0.008, (z0 + z1) / 2);
    // Chamfered lower edges.
    for (const s of [-1, 1])
      this.box(
        0.02,
        0.02,
        length,
        this.m.metal,
        s * (w / 2 - 0.004),
        -0.008 - h / 2 + 0.004,
        (z0 + z1) / 2,
        0,
        Math.PI / 4,
      );
    const slots = Math.max(2, Math.floor((length - 0.03) / 0.062));
    for (const s of [-1, 1])
      for (let i = 0; i < slots; i++) {
        const z = z0 - 0.04 - i * 0.062;
        this.box(0.004, 0.012, 0.042, this.m.dark, s * (w / 2), 0.009, z);
        this.box(0.004, 0.012, 0.042, this.m.dark, s * (w / 2), -0.021, z);
      }
    this.rail(h / 2 - 0.004, z0, z1 + 0.01);
    this.rail(-0.008 - h / 2 - 0.004, z0 - 0.05, z1 + 0.04);
  }
  /** Twin diagonal gold stripes (the recurring livery mark). */
  stripes(x: number, y: number, z: number, count = 2, size = 0.03) {
    for (let i = 0; i < count; i++)
      this.box(
        0.003,
        size,
        0.007,
        this.m.gold,
        x,
        y,
        z - i * 0.013,
        -0.55,
      );
  }
  muzzleBrake(z: number, r = 0.014, length = 0.05) {
    this.cyl(r, length, this.m.steel, 0, 0, z - length / 2, 8);
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++)
        this.box(
          0.004,
          r * 0.9,
          0.007,
          this.m.dark,
          s * r * 0.95,
          0,
          z - 0.01 - i * 0.013,
        );
    const tip = new THREE.Object3D();
    tip.position.set(0, 0, z - length - 0.01);
    this.group.add(tip);
    return tip;
  }
  /** Flip-up iron sight; the rear one sits folded behind an optic. */
  flipSight(z: number, y: number, folded = false) {
    this.box(0.022, 0.012, 0.02, this.m.polymer, 0, y + 0.006, z);
    if (folded) {
      this.box(0.018, 0.006, 0.026, this.m.polymer, 0, y + 0.014, z - 0.006);
      return;
    }
    for (const s of [-1, 1])
      this.box(0.004, 0.026, 0.008, this.m.polymer, s * 0.008, y + 0.024, z);
  }
  /** Holographic sight. Returns the optic centre height. */
  holo(z: number, y: number) {
    const m = this.m;
    this.box(0.04, 0.012, 0.075, m.polymer, 0, y + 0.006, z);
    // Hood: two side walls, roof and a thick front body with buttons.
    for (const s of [-1, 1])
      this.box(0.006, 0.042, 0.05, m.metal, s * 0.019, y + 0.033, z + 0.01);
    this.box(0.044, 0.007, 0.052, m.metal, 0, y + 0.057, z + 0.01, 0.12);
    this.box(0.044, 0.024, 0.032, m.metal, 0, y + 0.024, z - 0.03);
    for (const s of [-1, 1])
      this.box(0.006, 0.006, 0.006, m.dark, s * 0.023, y + 0.026, z - 0.03);
    const glass = this.box(0.032, 0.034, 0.002, m.glass, 0, y + 0.035, z - 0.01);
    glass.renderOrder = 1;
    const centre = y + 0.035;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0012, 6, 4), m.dot);
    dot.position.set(0, centre, z - 0.012);
    this.group.add(dot);
    return centre;
  }
  /** Variable-power scope on rings. Returns the optic centre height. */
  scope(z: number, y: number) {
    const m = this.m;
    const centre = y + 0.05;
    // Open-ended, double-sided tubes so ADS looks down the scope.
    const tube = new THREE.MeshStandardMaterial({
      color: 0x2b2d31,
      metalness: 0.6,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });
    this.cyl(0.015, 0.19, tube, 0, centre, z - 0.02, 18, 0.015, true);
    this.cyl(0.018, 0.05, tube, 0, centre, z - 0.14, 18, 0.028, true);
    this.cyl(0.028, 0.035, tube, 0, centre, z - 0.18, 18, 0.028, true);
    this.cyl(0.029, 0.006, m.gold, 0, centre, z - 0.163, 18, 0.029, true);
    this.cyl(0.02, 0.06, tube, 0, centre, z + 0.1, 18, 0.02, true);
    this.cyl(0.021, 0.02, m.dark, 0, centre, z + 0.085, 12, 0.021, true);
    // Fine crosshair at the eyepiece.
    for (const [w, h] of [
      [0.03, 0.0006],
      [0.0006, 0.03],
    ] as const) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m.dark);
      line.position.set(0, centre, z + 0.06);
      this.group.add(line);
    }
    this.box(0.004, 0.012, 0.016, m.gold, 0.021, centre + 0.004, z + 0.1);
    // Turrets.
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, 0.022, 14),
      m.dark,
    );
    top.position.set(0, centre + 0.027, z - 0.02);
    this.group.add(top);
    const side = top.clone();
    side.rotation.z = Math.PI / 2;
    side.position.set(0.027, centre, z - 0.02);
    this.group.add(side);
    // Rings + mount.
    for (const dz of [-0.07, 0.05]) {
      const post = centre - y - 0.017;
      this.box(0.02, post, 0.018, m.polymer, 0, y + post / 2, z + dz);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.017, 0.004, 6, 16),
        m.polymer,
      );
      ring.position.set(0, centre, z + dz);
      this.group.add(ring);
    }
    this.box(0.03, 0.008, 0.16, m.polymer, 0, y + 0.004, z - 0.01);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.027, 18), m.glass);
    glass.position.set(0, centre, z - 0.196);
    glass.renderOrder = 1;
    this.group.add(glass);
    return centre;
  }
  pistolGrip(z: number) {
    const g = this.box(0.032, 0.105, 0.042, this.m.polymer, 0, -0.098, z, -0.32);
    for (const s of [-1, 1])
      this.box(0.003, 0.06, 0.03, this.m.dark, s * 0.0165, -0.1, z + 0.002, -0.32);
    return g;
  }
  trigger(z: number) {
    this.box(0.008, 0.006, 0.06, this.m.metal, 0, -0.075, z - 0.005);
    this.box(0.004, 0.022, 0.004, this.m.steel, 0, -0.058, z - 0.012, 0.25);
  }
  /** Adjustable carbine stock on a buffer tube. */
  carbineStock(z: number) {
    const m = this.m;
    this.cyl(0.016, 0.16, m.steel, 0, -0.004, z + 0.08, 16);
    this.box(0.044, 0.05, 0.15, m.polymer, 0, -0.002, z + 0.13);
    this.box(0.048, 0.13, 0.025, m.polymer, 0, -0.04, z + 0.215);
    // Triangular lower brace.
    this.box(0.03, 0.012, 0.1, m.polymer, 0, -0.06, z + 0.16, -0.62);
    this.box(0.03, 0.01, 0.07, m.polymer, 0, -0.098, z + 0.18);
    this.box(0.003, 0.012, 0.03, m.gold, 0.0235, 0.008, z + 0.13, -0.55);
  }
  /** Ribbed polymer box magazine. */
  magazine(z: number, length: number, curve: number) {
    const m = this.m;
    const mag = new THREE.Group();
    mag.position.set(0, -0.05, z);
    mag.rotation.x = curve;
    this.group.add(mag);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, length, 0.066),
      m.polymer,
    );
    body.position.y = -length / 2;
    mag.add(body);
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const rib = new THREE.Mesh(
          new THREE.BoxGeometry(0.003, length * 0.22, 0.045),
          m.dark,
        );
        rib.position.set(s * 0.0145, -0.03 - i * length * 0.27, 0);
        mag.add(rib);
      }
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.012, 0.072), m.polymer);
    plate.position.y = -length;
    mag.add(plate);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.003, length * 0.35, 0.006),
      m.gold,
    );
    stripe.position.set(0.0155, -length * 0.62, -0.022);
    mag.add(stripe);
  }
  /** Upper + lower receiver block. */
  receiver(z0: number, z1: number, magZ: number) {
    const m = this.m;
    const length = z0 - z1;
    this.box(0.056, 0.05, length, m.metal, 0, 0.002, (z0 + z1) / 2);
    this.box(0.05, 0.035, length * 0.75, m.metal, 0, -0.04, z0 - length * 0.42);
    this.box(0.048, 0.03, 0.09, m.metal, 0, -0.068, magZ);
    this.box(0.002, 0.012, length * 0.55, m.dark, 0.0285, 0.012, (z0 + z1) / 2);
    // Ejection port cover, charging handle, selector, bolt release.
    this.box(0.003, 0.018, 0.06, m.steel, 0.029, -0.004, magZ + 0.02);
    this.box(0.03, 0.01, 0.025, m.polymer, 0, 0.028, z0 - 0.01);
    this.box(0.004, 0.008, 0.016, m.steel, 0.03, -0.04, z0 - 0.03);
    this.box(0.003, 0.003, 0.012, m.red, 0.0305, -0.03, z0 - 0.03);
    this.box(0.004, 0.014, 0.012, m.steel, -0.03, -0.04, magZ - 0.06);
    this.rail(0.031, z0, z1);
  }
}

function assaultRifle(b: Builder): WeaponModel {
  b.receiver(0.05, -0.2, -0.12);
  b.pistolGrip(0.015);
  b.trigger(-0.04);
  b.magazine(-0.12, 0.17, 0.16);
  b.handguard(-0.2, -0.5);
  b.box(0.012, 0.02, 0.05, b.m.polymer, 0.034, 0.004, -0.29);
  b.stripes(0.032, 0.0, -0.4);
  // Handstop under the rail.
  b.box(0.02, 0.022, 0.035, b.m.polymer, 0, -0.064, -0.42, 0.4);
  b.cyl(0.0095, 0.1, b.m.steel, 0, 0, -0.55);
  b.cyl(0.013, 0.012, b.m.steel, 0, 0, -0.512, 10);
  const muzzle = b.muzzleBrake(-0.6, 0.0145, 0.055);
  b.carbineStock(0.05);
  b.flipSight(-0.47, 0.035);
  b.flipSight(0.035, 0.035, true);
  const sightHeight = b.holo(-0.08, 0.035);
  return { group: b.group, muzzle, sightHeight };
}

function submachineGun(b: Builder): WeaponModel {
  b.receiver(0.04, -0.17, -0.1);
  b.pistolGrip(0.012);
  b.trigger(-0.04);
  b.magazine(-0.1, 0.15, 0.06);
  b.handguard(-0.17, -0.32, 0.066, 0.07);
  b.stripes(0.034, 0.005, -0.23);
  b.box(0.012, 0.022, 0.04, b.m.polymer, -0.036, 0.004, -0.26);
  b.cyl(0.009, 0.05, b.m.steel, 0, 0, -0.34);
  const muzzle = b.muzzleBrake(-0.36, 0.013, 0.04);
  b.carbineStock(0.04);
  b.flipSight(-0.3, 0.039);
  b.flipSight(0.03, 0.035, true);
  const sightHeight = b.holo(-0.07, 0.035);
  return { group: b.group, muzzle, sightHeight };
}

function marksmanRifle(b: Builder): WeaponModel {
  const m = b.m;
  b.receiver(0.06, -0.22, -0.13);
  b.pistolGrip(0.02);
  b.trigger(-0.035);
  b.magazine(-0.13, 0.12, 0.03);
  b.handguard(-0.22, -0.66);
  b.stripes(0.032, 0.0, -0.32);
  // Textured grip panel on the handguard side.
  b.box(0.003, 0.02, 0.12, m.dark, 0.0315, -0.025, -0.45);
  // Long fluted barrel.
  b.cyl(0.011, 0.28, m.steel, 0, 0, -0.8);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    b.box(0.003, 0.003, 0.2, m.dark, Math.cos(a) * 0.0105, Math.sin(a) * 0.0105, -0.8);
  }
  const muzzle = b.muzzleBrake(-0.94, 0.017, 0.07);
  // Precision stock with cheek riser and adjuster wheel.
  b.cyl(0.017, 0.12, m.steel, 0, -0.004, 0.12, 16);
  b.box(0.04, 0.03, 0.2, m.polymer, 0, -0.006, 0.19);
  b.box(0.036, 0.022, 0.14, m.polymer, 0, 0.03, 0.17);
  b.box(0.044, 0.15, 0.028, m.polymer, 0, -0.045, 0.3);
  b.box(0.022, 0.012, 0.15, m.polymer, 0, -0.075, 0.22, -0.35);
  b.box(0.003, 0.014, 0.04, m.gold, 0.021, 0.0, 0.2);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 12), m.dark);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(0.026, -0.006, 0.26);
  b.group.add(wheel);
  b.flipSight(-0.62, 0.035, true);
  const sightHeight = b.scope(-0.06, 0.035);
  return { group: b.group, muzzle, sightHeight };
}

/** Gloved hands, white sleeves with orange bands and a wrist computer. */
function addArms(
  group: THREE.Group,
  gripZ: number,
  foreZ: number,
  foreY = -0.05,
) {
  const sleeve = new THREE.MeshStandardMaterial({
    color: 0xd8d9dc,
    roughness: 0.95,
  });
  const glove = new THREE.MeshStandardMaterial({
    color: 0x16171a,
    roughness: 0.8,
  });
  const strap = new THREE.MeshStandardMaterial({
    color: 0x1f2024,
    roughness: 0.9,
  });
  const orange = new THREE.MeshStandardMaterial({
    color: 0xe8661e,
    roughness: 0.7,
  });
  const screen = new THREE.MeshStandardMaterial({
    color: 0x1b2a33,
    emissive: 0x0b1a22,
    metalness: 0.4,
    roughness: 0.2,
  });
  const up = new THREE.Vector3(0, 1, 0);
  const limb = (
    from: THREE.Vector3,
    to: THREE.Vector3,
    r0: number,
    r1: number,
    material: THREE.Material,
  ) => {
    const dir = to.clone().sub(from);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r1, r0, dir.length(), 12),
      material,
    );
    mesh.position.copy(from).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(up, dir.normalize());
    group.add(mesh);
    return mesh;
  };
  const along = (from: THREE.Vector3, to: THREE.Vector3, t: number) =>
    from.clone().lerp(to, t);

  // Right hand on the pistol grip, forearm running back toward the camera.
  const rWrist = new THREE.Vector3(0.012, -0.14, 0.07);
  const rElbow = new THREE.Vector3(0.09, -0.3, 0.38);
  const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.075, 0.06), glove);
  rHand.position.set(0.006, -0.1, gripZ + 0.012);
  rHand.rotation.x = -0.32;
  group.add(rHand);
  const thumb = limb(
    new THREE.Vector3(0.02, -0.07, gripZ + 0.02),
    new THREE.Vector3(0.028, -0.035, gripZ - 0.04),
    0.011,
    0.009,
    glove,
  );
  thumb.name = "thumb";
  limb(new THREE.Vector3(0.006, -0.09, gripZ + 0.04), rWrist, 0.026, 0.028, glove);
  limb(rWrist, rElbow, 0.034, 0.045, sleeve);
  limb(rWrist, along(rWrist, rElbow, 0.18), 0.036, 0.037, strap);
  limb(along(rWrist, rElbow, 0.55), along(rWrist, rElbow, 0.65), 0.043, 0.045, orange);

  // Left hand cupping the handguard; long reach back to the lower-left.
  const lHandPos = new THREE.Vector3(-0.01, foreY - 0.035, foreZ);
  const lWrist = new THREE.Vector3(-0.07, foreY - 0.075, foreZ + 0.07);
  const lElbow = new THREE.Vector3(-0.36, -0.3, foreZ + 0.44);
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.032, 0.085), glove);
  palm.position.copy(lHandPos);
  palm.rotation.z = 0.35;
  group.add(palm);
  for (let i = 0; i < 4; i++) {
    const z = foreZ - 0.03 + i * 0.02;
    limb(
      new THREE.Vector3(-0.025, foreY - 0.03, z),
      new THREE.Vector3(0.034, foreY + 0.005, z - 0.004),
      0.0095,
      0.0085,
      glove,
    );
  }
  limb(
    new THREE.Vector3(-0.03, foreY - 0.02, foreZ + 0.03),
    new THREE.Vector3(-0.034, foreY + 0.02, foreZ - 0.035),
    0.011,
    0.009,
    glove,
  );
  limb(lHandPos, lWrist, 0.025, 0.028, glove);
  limb(lWrist, lElbow, 0.034, 0.05, sleeve);
  limb(lWrist, along(lWrist, lElbow, 0.2), 0.037, 0.039, strap);
  limb(along(lWrist, lElbow, 0.24), along(lWrist, lElbow, 0.28), 0.04, 0.041, orange);
  limb(along(lWrist, lElbow, 0.6), along(lWrist, lElbow, 0.72), 0.047, 0.05, orange);
  // Wrist computer on top of the left wrist.
  const w = along(lWrist, lElbow, 0.1);
  const watch = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.05), strap);
  watch.position.set(w.x + 0.012, w.y + 0.032, w.z);
  watch.rotation.z = 0.5;
  group.add(watch);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.003, 0.04), screen);
  face.position.set(w.x + 0.0125, w.y + 0.04, w.z);
  face.rotation.z = 0.5;
  group.add(face);
}

export function buildWeapon(id: WeaponId): WeaponModel {
  const b = new Builder(new THREE.Group(), palette());
  b.group.name = id;
  const model =
    id === "ar"
      ? assaultRifle(b)
      : id === "smg"
        ? submachineGun(b)
        : marksmanRifle(b);
  const grip = id === "dmr" ? 0.02 : id === "smg" ? 0.012 : 0.015;
  const fore = id === "dmr" ? -0.36 : id === "smg" ? -0.25 : -0.33;
  addArms(model.group, grip, fore);
  return model;
}
