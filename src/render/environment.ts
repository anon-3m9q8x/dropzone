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
  const shadows = !large && quality !== "low";
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(0xc4d9ea, large ? 70 : 45, large ? 330 : 240);
  scene.add(new THREE.HemisphereLight(0xd6ebff, 0x6f6658, 2.1));
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.1);
  sun.position.set(-40, 70, -25);
  if (shadows) {
    // 射撃場だけ影を落として、段差や足場の高さが分かるようにする。
    sun.castShadow = true;
    sun.shadow.mapSize.set(
      quality === "high" ? 4096 : 2048,
      quality === "high" ? 4096 : 2048,
    );
    const c = sun.shadow.camera;
    c.left = -34;
    c.right = 34;
    c.top = 34;
    c.bottom = -34;
    c.near = 10;
    c.far = 160;
    sun.position.set(-30, 60, -10);
    sun.target.position.set(0, 0, 15);
    scene.add(sun.target);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
  }
  scene.add(sun);

  const ground = asphalt();
  const concreteMap = concrete();
  const siding = CONTAINERS.map(([a, b]) => container(a, b));
  let wallIndex = 0;
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x59626c,
    metalness: 0.55,
    roughness: 0.45,
  });
  const yellow = new THREE.MeshStandardMaterial({
    color: 0xd9a92c,
    roughness: 0.6,
  });
  const dirt = new THREE.MeshStandardMaterial({
    color: 0x7a7257,
    roughness: 1,
  });
  const grass = new THREE.MeshStandardMaterial({
    color: 0x5f7a45,
    roughness: 1,
  });
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x2f5d8a,
    metalness: 0.3,
    roughness: 0.55,
  });
  for (const box of boxes) {
    if (box.id.startsWith("rack")) continue; // 武器台は Range 側で詳しく描く
    const w = box.max.x - box.min.x,
      h = box.max.y - box.min.y,
      d = box.max.z - box.min.z;
    const center = new THREE.Vector3(
      (box.max.x + box.min.x) / 2,
      (box.max.y + box.min.y) / 2,
      (box.max.z + box.min.z) / 2,
    );
    const put = (m: THREE.Object3D) => {
      m.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = shadows && box.id !== "ground";
          o.receiveShadow = shadows;
        }
      });
      scene.add(m);
    };
    if (box.id.includes("barrel")) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(w / 2, w / 2, h, 18),
        barrelMat,
      );
      g.add(body);
      for (const y of [-h * 0.3, h * 0.3]) {
        const hoop = new THREE.Mesh(
          new THREE.TorusGeometry(w / 2 + 0.005, 0.015, 6, 20),
          steelMat,
        );
        hoop.rotation.x = Math.PI / 2;
        hoop.position.y = y;
        g.add(hoop);
      }
      g.position.copy(center);
      put(g);
      continue;
    }
    if (box.id.startsWith("rail")) {
      // 手すり: 上下2本のパイプと支柱(当たり判定は箱のまま)。
      const g = new THREE.Group();
      const along = w > d ? "x" : "z";
      const len = Math.max(w, d);
      for (const y of [h / 2 - 0.04, 0]) {
        const pipe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, len, 8),
          yellow,
        );
        if (along === "x") pipe.rotation.z = Math.PI / 2;
        else pipe.rotation.x = Math.PI / 2;
        pipe.position.y = y;
        g.add(pipe);
      }
      for (
        let t = -len / 2;
        t <= len / 2 + 1e-6;
        t += len / Math.max(1, Math.round(len / 1.4))
      ) {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, h, 0.06),
          steelMat,
        );
        post.position.set(along === "x" ? t : 0, 0, along === "z" ? t : 0);
        g.add(post);
      }
      g.position.copy(center);
      put(g);
      continue;
    }
    let material: THREE.MeshStandardMaterial;
    if (box.id.startsWith("berm"))
      material = box.id.endsWith("2") ? grass : dirt;
    else if (
      box.id.startsWith("platform") ||
      box.id.startsWith("stair") ||
      box.id.startsWith("bridge")
    ) {
      const map = concreteMap.clone();
      map.repeat.set(Math.max(1, Math.max(w, d) / 2), Math.max(1, h / 1.5));
      material = box.id.startsWith("bridge-deck")
        ? steelMat
        : new THREE.MeshStandardMaterial({
            map,
            roughness: 0.9,
            color: box.id.startsWith("stair") ? 0xb8b2a6 : 0xffffff,
          });
    } else if (box.id === "ground") {
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
    mesh.position.copy(center);
    put(mesh);
    // 階段・高台・ブリッジの縁に黄色の注意帯。
    if (
      box.id.startsWith("stair") ||
      box.id === "platform-left" ||
      box.id === "bridge-deck" ||
      box.id.startsWith("stack-right")
    ) {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.02, 0.06, d + 0.02),
        yellow,
      );
      edge.position.set(center.x, box.max.y - 0.03, center.z);
      put(edge);
    }
  }
  if (!large) {
    // 壁の外に積んだコンテナ(背景に高さを出す。当たり判定なし)。
    const stack = (
      x: number,
      z: number,
      levels: number,
      rotY: number,
      k: number,
    ) => {
      for (let l = 0; l < levels; l++) {
        const map = siding[(k + l) % siding.length]!.clone();
        map.repeat.set(2.5, 1);
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(6, 2.6, 2.44),
          new THREE.MeshStandardMaterial({
            map,
            roughness: 0.7,
            metalness: 0.25,
          }),
        );
        m.position.set(x + (l % 2) * 0.4, 1.3 + l * 2.6, z);
        m.rotation.y = rotY + (l % 2) * 0.05;
        m.castShadow = shadows;
        m.receiveShadow = shadows;
        scene.add(m);
      }
    };
    stack(-23.5, 4, 3, Math.PI / 2, 0);
    stack(-23.5, 14, 2, Math.PI / 2, 1);
    stack(-23.5, 30, 3, Math.PI / 2, 2);
    stack(23.5, 0, 2, Math.PI / 2, 3);
    stack(23.5, 12, 3, Math.PI / 2, 1);
    stack(23.5, 36, 2, Math.PI / 2, 0);
    stack(-8, 43.5, 2, 0, 2);
    stack(9, 43.5, 3, 0, 3);
    // 照明塔。
    for (const [x, z] of [
      [-19, 20],
      [19, 20],
      [-19, -8],
      [19, -8],
    ] as const) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 9, 8),
        steelMat,
      );
      pole.position.set(x, 4.5, z);
      pole.castShadow = shadows;
      scene.add(pole);
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.35, 0.5),
        steelMat,
      );
      head.position.set(x - Math.sign(x) * 0.5, 9, z);
      scene.add(head);
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.08, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xfff3c4 }),
      );
      lamp.position.set(x - Math.sign(x) * 0.5, 8.8, z);
      scene.add(lamp);
    }
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
    peak.position.set(
      Math.sin(a) * radius,
      height / 2 - 4,
      Math.cos(a) * radius,
    );
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
      group.position.set(
        Math.sin(a) * 160,
        70 + (i % 4) * 8,
        Math.cos(a) * 160,
      );
      for (let j = 0; j < 5; j++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(8 + j * 1.5, 10, 8),
          cloud,
        );
        puff.position.set((j - 2) * 9, Math.sin(j) * 2, (j % 2) * 5);
        puff.scale.y = 0.55;
        group.add(puff);
      }
      group.lookAt(0, group.position.y, 0);
      scene.add(group);
    }
  }

  // Lattice watchtower beyond the far wall.
  const steel = new THREE.MeshStandardMaterial({
    color: 0x3b3f44,
    metalness: 0.6,
  });
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
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.4, 12),
    steel,
  );
  deck.position.y = top;
  tower.add(deck);
  const cabin = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 2.6, 12),
    steel,
  );
  cabin.position.y = top + 1.5;
  tower.add(cabin);
  tower.position.set(large ? -60 : -28, 0, large ? 125 : 58);
  scene.add(tower);
}
