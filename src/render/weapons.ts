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
  /** Shotgun pump, slid back briefly after each shot. */
  pump?: THREE.Object3D;
  /** Detachable box magazine (absent on the shotgun). */
  mag?: THREE.Object3D;
  /** Rest position of the magazine, for the reload animation. */
  magRest?: THREE.Vector3;
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
  brass: THREE.Material;
  copper: THREE.Material;
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
    brass: new THREE.MeshStandardMaterial({
      color: 0xc9a253,
      metalness: 0.8,
      roughness: 0.3,
    }),
    copper: new THREE.MeshStandardMaterial({
      color: 0xb8653a,
      metalness: 0.8,
      roughness: 0.3,
    }),
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
      this.box(0.003, size, 0.007, this.m.gold, x, y, z - i * 0.013, -0.55);
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
    // Front body sits below the window so it never blocks the view.
    this.box(0.044, 0.012, 0.032, m.metal, 0, y + 0.012, z - 0.03);
    for (const s of [-1, 1])
      this.box(0.006, 0.006, 0.006, m.dark, s * 0.023, y + 0.012, z - 0.03);
    const glass = this.box(
      0.032,
      0.034,
      0.002,
      m.glass,
      0,
      y + 0.035,
      z - 0.01,
    );
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
    const g = this.box(
      0.032,
      0.105,
      0.042,
      this.m.polymer,
      0,
      -0.098,
      z,
      -0.32,
    );
    for (const s of [-1, 1])
      this.box(
        0.003,
        0.06,
        0.03,
        this.m.dark,
        s * 0.0165,
        -0.1,
        z + 0.002,
        -0.32,
      );
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
    mag.name = "mag";
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
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.034, 0.012, 0.072),
      m.polymer,
    );
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
    b.box(
      0.003,
      0.003,
      0.2,
      m.dark,
      Math.cos(a) * 0.0105,
      Math.sin(a) * 0.0105,
      -0.8,
    );
  }
  const muzzle = b.muzzleBrake(-0.94, 0.017, 0.07);
  // Precision stock with cheek riser and adjuster wheel.
  b.cyl(0.017, 0.12, m.steel, 0, -0.004, 0.12, 16);
  b.box(0.04, 0.03, 0.2, m.polymer, 0, -0.006, 0.19);
  b.box(0.036, 0.022, 0.14, m.polymer, 0, 0.03, 0.17);
  b.box(0.044, 0.15, 0.028, m.polymer, 0, -0.045, 0.3);
  b.box(0.022, 0.012, 0.15, m.polymer, 0, -0.075, 0.22, -0.35);
  b.box(0.003, 0.014, 0.04, m.gold, 0.021, 0.0, 0.2);
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.008, 12),
    m.dark,
  );
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(0.026, -0.006, 0.26);
  b.group.add(wheel);
  b.flipSight(-0.62, 0.035, true);
  const sightHeight = b.scope(-0.06, 0.035);
  return { group: b.group, muzzle, sightHeight };
}

function lightMachineGun(b: Builder): WeaponModel {
  const m = b.m;
  b.receiver(0.06, -0.24, -0.12);
  b.pistolGrip(0.02);
  b.trigger(-0.035);
  // Feed cover hinge and charging knob.
  b.box(0.06, 0.012, 0.11, m.metal, 0, 0.03, -0.13);
  b.cyl(0.008, 0.012, m.steel, 0.034, -0.01, -0.06, 10);
  // Ammo box hanging under the receiver.
  b.box(0.08, 0.1, 0.12, m.metal, 0, -0.135, -0.13);
  b.box(0.084, 0.012, 0.124, m.steel, 0, -0.085, -0.13);
  for (const s of [-1, 1]) {
    b.box(0.003, 0.11, 0.008, m.dark, s * 0.041, -0.135, -0.13, 0.75);
    b.box(0.003, 0.11, 0.008, m.dark, s * 0.041, -0.135, -0.13, -0.75);
  }
  b.box(0.022, 0.03, 0.014, m.polymer, 0, -0.095, -0.064);
  b.box(0.003, 0.05, 0.01, m.gold, 0.042, -0.14, -0.16, -0.55);
  // Linked belt rising from the box into the feed tray (right side).
  for (let i = 0; i < 6; i++) {
    const y = -0.082 + i * 0.012;
    b.cyl(0.0052, 0.03, m.brass, 0.036, y, -0.13, 8);
    b.cyl(0.0052, 0.012, m.copper, 0.036, y, -0.151, 8, 0.0015);
    b.box(0.004, 0.004, 0.03, m.dark, 0.042, y + 0.006, -0.13);
  }
  b.handguard(-0.24, -0.58, 0.068, 0.07);
  b.stripes(0.035, 0.005, -0.34);
  b.cyl(0.012, 0.13, m.steel, 0, 0, -0.645);
  const muzzle = b.muzzleBrake(-0.71, 0.016, 0.06);
  // Weapon light under the handguard.
  b.cyl(0.012, 0.075, m.polymer, 0.0, -0.072, -0.52, 12);
  b.cyl(0.0125, 0.004, m.glass, 0.0, -0.072, -0.56, 12);
  b.carbineStock(0.06);
  b.flipSight(-0.55, 0.035);
  b.flipSight(0.045, 0.035, true);
  const sightHeight = b.holo(-0.09, 0.035);
  return { group: b.group, muzzle, sightHeight };
}

function shotgun(b: Builder): WeaponModel {
  const m = b.m;
  b.receiver(0.05, -0.2, -0.1);
  b.pistolGrip(0.015);
  b.trigger(-0.04);
  // Slotted barrel shroud over a heavy barrel and tube magazine.
  b.box(0.06, 0.05, 0.32, m.metal, 0, 0.005, -0.36);
  for (const s of [-1, 1])
    for (let i = 0; i < 4; i++)
      b.box(0.004, 0.012, 0.05, m.dark, s * 0.03, 0.012, -0.25 - i * 0.07);
  b.rail(0.034, -0.2, -0.52);
  b.stripes(0.032, 0.0, -0.22);
  b.cyl(0.015, 0.1, m.steel, 0, 0, -0.57);
  const muzzle = b.muzzleBrake(-0.62, 0.021, 0.05);
  b.cyl(0.014, 0.42, m.steel, 0, -0.045, -0.41);
  b.cyl(0.016, 0.02, m.steel, 0, -0.045, -0.615, 12);
  // Ribbed pump forend.
  const pump = new THREE.Group();
  pump.position.set(0, -0.045, -0.37);
  b.group.add(pump);
  const forend = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.045, 0.15),
    m.polymer,
  );
  pump.add(forend);
  for (let i = 0; i < 7; i++)
    for (const s of [-1, 1]) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.004, 0.032, 0.006),
        m.dark,
      );
      rib.position.set(s * 0.026, 0, -0.06 + i * 0.016);
      pump.add(rib);
    }
  b.carbineStock(0.05);
  b.flipSight(-0.5, 0.038);
  b.flipSight(0.035, 0.035, true);
  const sightHeight = b.holo(-0.07, 0.035);
  return { group: b.group, muzzle, sightHeight, pump };
}

function handgun(b: Builder): WeaponModel {
  const m = b.m;
  // Slide with front/rear serrations and lightening cuts.
  b.box(0.03, 0.034, 0.2, m.metal, 0, 0.006, -0.08);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++)
      b.box(0.003, 0.012, 0.014, m.dark, s * 0.0152, 0.012, -0.155 + i * 0.02);
    for (let i = 0; i < 5; i++)
      b.box(
        0.003,
        0.022,
        0.003,
        m.dark,
        s * 0.0152,
        0.004,
        -0.13 + i * 0.008,
        0.3,
      );
    for (let i = 0; i < 5; i++)
      b.box(0.003, 0.022, 0.003, m.dark, s * 0.0152, 0.004, -0.0 + i * 0.008);
  }
  b.stripes(0.0155, 0.004, -0.05, 2, 0.02);
  b.cyl(0.007, 0.012, m.steel, 0, 0.004, -0.183, 10);
  // Frame with accessory rail, trigger guard and textured grip.
  b.box(0.028, 0.022, 0.17, m.polymer, 0, -0.022, -0.07);
  b.box(0.022, 0.008, 0.05, m.dark, 0, -0.036, -0.13);
  b.box(0.026, 0.006, 0.045, m.polymer, 0, -0.06, -0.06);
  b.box(0.006, 0.03, 0.006, m.polymer, 0, -0.046, -0.083);
  b.box(0.004, 0.02, 0.004, m.steel, 0, -0.044, -0.055, 0.3);
  b.box(0.03, 0.11, 0.042, m.polymer, 0, -0.08, -0.005, -0.28);
  for (const s of [-1, 1])
    b.box(0.003, 0.07, 0.032, m.dark, s * 0.0155, -0.085, -0.002, -0.28);
  b.box(0.034, 0.014, 0.05, m.polymer, 0, -0.137, 0.012, -0.28);
  // Removable magazine inside the grip (drops out on reload).
  const hgMag = new THREE.Group();
  hgMag.name = "mag";
  hgMag.position.set(0, -0.08, -0.005);
  hgMag.rotation.x = -0.28;
  b.group.add(hgMag);
  const hgMagBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.024, 0.1, 0.034),
    m.dark,
  );
  hgMagBody.position.y = -0.005;
  hgMag.add(hgMagBody);
  const hgMagPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.031, 0.01, 0.044),
    m.steel,
  );
  hgMagPlate.position.y = -0.062;
  hgMag.add(hgMagPlate);
  b.box(0.003, 0.035, 0.006, m.gold, 0.0155, -0.1, 0.012, -0.28);
  b.box(0.004, 0.006, 0.016, m.steel, 0.016, -0.018, -0.03);
  // Iron sights and a compact red-dot.
  b.box(0.006, 0.008, 0.006, m.dark, 0, 0.026, -0.172);
  b.box(0.022, 0.009, 0.008, m.dark, 0, 0.027, 0.01);
  const y = 0.023;
  b.box(0.026, 0.006, 0.04, m.polymer, 0, y + 0.003, -0.055);
  for (const s of [-1, 1])
    b.box(0.004, 0.028, 0.03, m.metal, s * 0.012, y + 0.02, -0.055);
  b.box(0.028, 0.005, 0.03, m.metal, 0, y + 0.036, -0.055, 0.15);
  b.box(0.028, 0.018, 0.012, m.metal, 0, y + 0.012, -0.075);
  const glass = b.box(0.02, 0.022, 0.002, m.glass, 0, y + 0.021, -0.058);
  glass.renderOrder = 1;
  const sightHeight = y + 0.021;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.001, 6, 4), m.dot);
  dot.position.set(0, sightHeight, -0.06);
  b.group.add(dot);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.004, -0.2);
  b.group.add(muzzle);
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
  limb(
    new THREE.Vector3(0.006, -0.09, gripZ + 0.04),
    rWrist,
    0.026,
    0.028,
    glove,
  );
  limb(rWrist, rElbow, 0.034, 0.045, sleeve);
  limb(rWrist, along(rWrist, rElbow, 0.18), 0.036, 0.037, strap);
  limb(
    along(rWrist, rElbow, 0.55),
    along(rWrist, rElbow, 0.65),
    0.043,
    0.045,
    orange,
  );

  // Left hand cupping the handguard; long reach back to the lower-left.
  const lHandPos = new THREE.Vector3(-0.01, foreY - 0.035, foreZ);
  const lWrist = new THREE.Vector3(-0.07, foreY - 0.075, foreZ + 0.07);
  const lElbow = new THREE.Vector3(-0.36, -0.3, foreZ + 0.44);
  const palm = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.032, 0.085),
    glove,
  );
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
  limb(
    along(lWrist, lElbow, 0.24),
    along(lWrist, lElbow, 0.28),
    0.04,
    0.041,
    orange,
  );
  limb(
    along(lWrist, lElbow, 0.6),
    along(lWrist, lElbow, 0.72),
    0.047,
    0.05,
    orange,
  );
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

export function buildWeapon(id: WeaponId, arms = true): WeaponModel {
  const b = new Builder(new THREE.Group(), palette());
  b.group.name = id;
  const build = {
    ar: assaultRifle,
    smg: submachineGun,
    dmr: marksmanRifle,
    lmg: lightMachineGun,
    sg: shotgun,
    hg: handgun,
  }[id];
  const model = build(b);
  // Pistol grip z, support-hand z and height per weapon.
  const [grip, fore, foreY] = (
    {
      ar: [0.015, -0.33, -0.05],
      smg: [0.012, -0.25, -0.05],
      dmr: [0.02, -0.36, -0.05],
      lmg: [0.02, -0.4, -0.05],
      sg: [0.015, -0.37, -0.07],
      hg: [-0.005, -0.01, -0.085],
    } as const
  )[id];
  if (arms) addArms(model.group, grip, fore, foreY);
  const mag = model.group.getObjectByName("mag");
  if (mag) {
    model.mag = mag;
    model.magRest = mag.position.clone();
  }
  return model;
}
