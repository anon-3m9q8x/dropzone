import * as THREE from "three";
import type { Aabb } from "../core/types";

/**
 * Daytime industrial yard: asphalt with painted lanes, shipping-container
 * walls, concrete barriers, and a distant mountain range under a clear sky.
 * Textures are drawn on canvases at runtime; no image files are loaded.
 */
export const SKY = 0x8fc3ea;

function canvasTexture(
  width: number,
  height: number,
  draw: (g: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d");
  if (g) draw(g);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Deterministic noise so every session looks the same. */
function speckle(
  g: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
  shades: string[],
  seed: number,
) {
  let x = seed;
  const next = () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    g.fillStyle = shades[Math.floor(next() * shades.length)]!;
    g.fillRect(next() * width, next() * height, 1 + next() * 2, 1 + next() * 2);
  }
}

const asphalt = () =>
  canvasTexture(256, 256, (g) => {
    g.fillStyle = "#6b6d70";
    g.fillRect(0, 0, 256, 256);
    speckle(g, 256, 256, 5000, ["#5c5e61", "#7a7c7f", "#646669", "#85878a"], 7);
  });

const concrete = () =>
  canvasTexture(128, 128, (g) => {
    g.fillStyle = "#b9b4aa";
    g.fillRect(0, 0, 128, 128);
    speckle(g, 128, 128, 1600, ["#a9a49a", "#c6c1b7", "#9d988e"], 11);
    g.fillStyle = "#8f8a8155";
    g.fillRect(0, 120, 128, 8);
  });

/** Corrugated container siding in the given base colour. */
const container = (base: string, dark: string) =>
  canvasTexture(128, 128, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x += 16) {
      g.fillStyle = dark;
      g.fillRect(x, 0, 5, 128);
      g.fillStyle = "#ffffff18";
      g.fillRect(x + 9, 0, 3, 128);
    }
    speckle(g, 128, 128, 700, ["#00000022", "#ffffff14", "#5a2a1a33"], 3);
    g.fillStyle = "#00000033";
    g.fillRect(0, 0, 128, 6);
    g.fillRect(0, 122, 128, 6);
  });

const CONTAINERS: [string, string][] = [
  ["#8e3b2c", "#6e2c20"],
  ["#2f4c6e", "#223a55"],
  ["#5d6e7a", "#4a5862"],
  ["#9a5a2c", "#7a4520"],
];

export function buildEnvironment(
  scene: THREE.Scene,
  boxes: readonly Aabb[],
  large: boolean,
  quality: "low" | "medium" | "high",
) {
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(0xc4d9ea, large ? 70 : 45, large ? 330 : 240);
  scene.add(new THREE.HemisphereLight(0xd6ebff, 0x6f6658, 2.1));
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.1);
  sun.position.set(-40, 70, -25);
  scene.add(sun);

  const ground = asphalt();
  const concreteMap = concrete();
  const siding = CONTAINERS.map(([a, b]) => container(a, b));
  let wallIndex = 0;
  for (const box of boxes) {
    const w = box.max.x - box.min.x,
      h = box.max.y - box.min.y,
      d = box.max.z - box.min.z;
    let material: THREE.MeshStandardMaterial;
    if (box.id === "ground") {
      const map = ground.clone();
      map.repeat.set(w / 6, d / 6);
      material = new THREE.MeshStandardMaterial({ map, roughness: 1 });
    } else if (box.id.includes("cover")) {
      const map = concreteMap.clone();
      map.repeat.set(Math.max(1, Math.max(w, d) / 2), Math.max(1, h / 1.5));
      material = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
    } else {
      const map = siding[wallIndex++ % siding.length]!.clone();
      map.repeat.set(Math.max(w, d) / 2.4, 1);
      material = new THREE.MeshStandardMaterial({
        map,
        roughness: 0.7,
        metalness: 0.25,
      });
    }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(
      (box.max.x + box.min.x) / 2,
      (box.max.y + box.min.y) / 2,
      (box.max.z + box.min.z) / 2,
    );
    scene.add(mesh);
  }

  // Painted lane markings just above the asphalt.
  const paint = new THREE.MeshBasicMaterial({ color: 0xd9b23c });
  const stripe = (x: number, z: number, length: number, alongZ: boolean) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(alongZ ? 0.18 : length, alongZ ? length : 0.18),
      paint,
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.01, z);
    scene.add(m);
  };
  if (large)
    for (let v = -75; v <= 75; v += 30) {
      stripe(v, 0, 180, true);
      stripe(0, v, 180, false);
    }
  else {
    for (const x of [-15, 15]) stripe(x, 15, 48, true);
    for (let z = 0; z <= 36; z += 6) stripe(0, z, 2.4, false);
  }

  // Distant snow-capped mountains and tree line, unaffected by fog.
  const rock = new THREE.MeshLambertMaterial({ color: 0x5c7a8c, fog: false });
  const snow = new THREE.MeshLambertMaterial({ color: 0xf1f5f8, fog: false });
  const pine = new THREE.MeshLambertMaterial({ color: 0x3f6b45 });
  const radius = large ? 240 : 190;
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + Math.sin(i * 7.1) * 0.08;
    const height = 45 + ((i * 37) % 11) * 6;
    const base = height * (1.3 + ((i * 13) % 5) * 0.12);
    const peak = new THREE.Mesh(new THREE.ConeGeometry(base, height, 7), rock);
    peak.position.set(Math.sin(a) * radius, height / 2 - 4, Math.cos(a) * radius);
    peak.rotation.y = i;
    scene.add(peak);
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(base * 0.3, height * 0.3, 7),
      snow,
    );
    cap.position.set(0, height * 0.36, 0);
    peak.add(cap);
  }
  if (quality !== "low") {
    const ring = large ? 110 : 34;
    const count = large ? 90 : 40;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = ring + ((i * 29) % 9) * (large ? 3 : 1.5);
      const h = 6 + ((i * 17) % 5);
      const tree = new THREE.Mesh(new THREE.ConeGeometry(h * 0.32, h, 6), pine);
      tree.position.set(Math.sin(a) * r, h / 2, Math.cos(a) * r);
      scene.add(tree);
    }
    // Soft clouds.
    const cloud = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: 0x9aa7b4,
      fog: false,
    });
    for (let i = 0; i < 14; i++) {
      const group = new THREE.Group();
      const a = i * 2.39;
      group.position.set(Math.sin(a) * 160, 70 + (i % 4) * 8, Math.cos(a) * 160);
      for (let j = 0; j < 5; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(8 + j * 1.5, 10, 8), cloud);
        puff.position.set((j - 2) * 9, Math.sin(j) * 2, (j % 2) * 5);
        puff.scale.y = 0.55;
        group.add(puff);
      }
      group.lookAt(0, group.position.y, 0);
      scene.add(group);
    }
  }

  // Lattice watchtower beyond the far wall.
  const steel = new THREE.MeshStandardMaterial({ color: 0x3b3f44, metalness: 0.6 });
  const tower = new THREE.Group();
  const top = 22;
  for (const [x, z] of [
    [-1.5, -1.5],
    [1.5, -1.5],
    [-1.5, 1.5],
    [1.5, 1.5],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, top, 0.25), steel);
    leg.position.set(x * 1.4, top / 2, z * 1.4);
    leg.rotation.set(-z * 0.04, 0, x * 0.04);
    tower.add(leg);
  }
  for (let y = 4; y < top; y += 4) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 4), steel);
    brace.position.y = y;
    tower.add(brace);
  }
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.4, 12), steel);
  deck.position.y = top;
  tower.add(deck);
  const cabin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 2.6, 12), steel);
  cabin.position.y = top + 1.5;
  tower.add(cabin);
  tower.position.set(large ? -60 : -28, 0, large ? 125 : 58);
  scene.add(tower);
}
