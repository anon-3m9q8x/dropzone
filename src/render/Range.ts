import * as THREE from "three";
import { CONFIG } from "../core/config";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import {
  createTraining,
  emptyInput,
  stepTraining,
  switchWeapon,
} from "../core/training";
import { trainingColliders } from "../core/collision";
import type { SettingsV1, WeaponId } from "../core/types";
export interface Hud {
  phase: string;
  shots: number;
  hits: number;
  ammo: number;
  weapon: WeaponId;
  reload: number;
  seconds: number;
  fps: number;
  hit: boolean;
}
export class Range {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(
    CONFIG.camera.defaultFovDegrees,
    1,
    CONFIG.camera.nearMeters,
    CONFIG.camera.farMeters,
  );
  private controls: PointerLockControls;
  private session = createTraining();
  private keys = new Set<string>();
  private fire = false;
  private ads = false;
  private jump = false;
  private reload = false;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private lastHud = 0;
  private hitUntil = 0;
  private dead = false;
  private audio: AudioContext | null = null;
  private cleanups: (() => void)[] = [];
  private targets = new Map<string, THREE.Mesh>();
  private flash: THREE.Mesh;
  private settings: SettingsV1;
  private frameCount = 0;
  private fps = 0;
  private fpsAt = 0;
  constructor(
    private host: HTMLElement,
    settings: SettingsV1,
    private onHud: (h: Hud) => void,
    private onError: (s: string) => void,
  ) {
    this.settings = settings;
    this.renderer = new THREE.WebGLRenderer({
      antialias: settings.graphicsQuality !== "low",
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x0b1522);
    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        settings.graphicsQuality === "low"
          ? 1
          : settings.graphicsQuality === "high"
            ? 2
            : 1.5,
      ),
    );
    this.host.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "DROPZONE 3D 射撃練習場",
    );
    this.scene.fog = new THREE.Fog(0x0b1522, 25, 80);
    this.scene.add(new THREE.HemisphereLight(0x9ac8ff, 0x35404a, 2.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(-8, 20, -8);
    this.scene.add(sun);
    const material = (color: number) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    for (const box of trainingColliders) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(
          box.max.x - box.min.x,
          box.max.y - box.min.y,
          box.max.z - box.min.z,
        ),
        material(
          box.id === "ground"
            ? 0x182533
            : box.id.includes("cover")
              ? 0x425369
              : 0x26384b,
        ),
      );
      mesh.position.set(
        (box.max.x + box.min.x) / 2,
        (box.max.y + box.min.y) / 2,
        (box.max.z + box.min.z) / 2,
      );
      this.scene.add(mesh);
      if (box.id.includes("cover")) {
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(mesh.geometry),
          new THREE.LineBasicMaterial({ color: 0x6d8aa3 }),
        );
        mesh.add(edges);
      }
    }
    const grid = new THREE.GridHelper(40, 40, 0x426480, 0x273d51);
    grid.position.set(0, 0.012, 15);
    this.scene.add(grid);
    for (const target of this.session.training.targets) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.6, 0.24),
        material(target.isMoving ? 0x38c9dd : 0xf28c47),
      );
      mesh.position.copy(target.position);
      this.scene.add(mesh);
      const center = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.035, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0x132335 }),
      );
      center.position.z = -0.13;
      mesh.add(center);
      this.targets.set(target.id, mesh);
    }
    // Simple first-person tool: original geometry, no downloaded assets.
    const gun = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.13, 0.46),
      material(0x344359),
    );
    body.position.set(0.22, -0.21, -0.43);
    gun.add(body);
    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.035, 0.25),
      material(0xf28c47),
    );
    accent.position.set(0.22, -0.13, -0.44);
    gun.add(accent);
    this.flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xffd28a }),
    );
    this.flash.position.set(0.22, -0.19, -0.72);
    this.flash.visible = false;
    gun.add(this.flash);
    this.camera.add(gun);
    this.scene.add(this.camera);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = Math.PI;
    this.controls = new PointerLockControls(
      this.camera,
      this.renderer.domElement,
    );
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(5);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(175);
    this.controls.pointerSpeed = settings.sensitivity;
    const listen = (target: EventTarget, type: string, fn: EventListener) => {
      target.addEventListener(type, fn);
      this.cleanups.push(() => target.removeEventListener(type, fn));
    };
    const lock = () => {
      if (this.dead) return;
      this.session.phase = "playing";
      this.reset();
      this.last = performance.now();
      this.acc = 0;
      this.publish();
    };
    const unlock = () => this.pause();
    this.controls.addEventListener("lock", lock);
    this.controls.addEventListener("unlock", unlock);
    this.cleanups.push(() => {
      this.controls.removeEventListener("lock", lock);
      this.controls.removeEventListener("unlock", unlock);
    });
    listen(document, "pointerlockerror", () => {
      this.pause();
      this.onError(
        "マウス操作を開始できません。ブラウザーの許可を確認して、もう一度開始してください。",
      );
    });
    listen(window, "keydown", ((e: KeyboardEvent) => {
      if (!this.controls.isLocked) return;
      if (e.code === "Escape") {
        this.pause();
        return;
      }
      if (["Space", "ControlLeft", "ControlRight", "Tab"].includes(e.code))
        e.preventDefault();
      if (!e.repeat) {
        if (e.code === "Space") this.jump = true;
        if (e.code === "KeyR") this.reload = true;
        if (["Digit1", "Digit2", "Digit3"].includes(e.code))
          switchWeapon(
            this.session,
            (["ar", "smg", "dmr"] as const)[Number(e.code.slice(-1)) - 1]!,
          );
      }
      this.keys.add(e.code);
    }) as EventListener);
    listen(window, "keyup", ((e: KeyboardEvent) => {
      this.keys.delete(e.code);
    }) as EventListener);
    listen(window, "mousedown", ((e: MouseEvent) => {
      if (!this.controls.isLocked) return;
      if (e.button === 0) this.fire = true;
      if (e.button === 2) this.ads = true;
    }) as EventListener);
    listen(window, "mouseup", ((e: MouseEvent) => {
      if (e.button === 0) this.fire = false;
      if (e.button === 2) this.ads = false;
    }) as EventListener);
    listen(this.renderer.domElement, "contextmenu", (e) => e.preventDefault());
    listen(window, "blur", () => this.pause());
    listen(document, "visibilitychange", () => {
      if (document.hidden) this.pause();
    });
    listen(this.renderer.domElement, "webglcontextlost", (e) => {
      e.preventDefault();
      this.pause();
      this.onError("3D描画が停止しました。ホームへ戻って再起動してください。");
    });
    listen(window, "resize", () => this.resize());
    this.resize();
    this.publish();
    this.raf = requestAnimationFrame(this.frame);
  }
  update(settings: SettingsV1) {
    this.settings = settings;
    this.controls.pointerSpeed = settings.sensitivity;
    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        settings.graphicsQuality === "low"
          ? 1
          : settings.graphicsQuality === "high"
            ? 2
            : 1.5,
      ),
    );
    this.resize();
    for (const t of this.session.training.targets) {
      const m = this.targets.get(t.id)!;
      (m.material as THREE.MeshStandardMaterial).color.setHex(
        settings.colorAssistMode
          ? t.isMoving
            ? 0x3ce8ff
            : 0xffdd55
          : t.isMoving
            ? 0x38c9dd
            : 0xf28c47,
      );
    }
  }
  start() {
    if (this.dead) return;
    try {
      if (!this.audio && this.settings.sfxEnabled)
        this.audio = new AudioContext();
      void this.audio?.resume().catch(() => {});
    } catch {
      /* Audio optional; visuals remain playable. */
    }
    try {
      const result = this.controls.lock() as unknown as
        | Promise<void>
        | undefined;
      result?.catch(() => {
        if (!this.dead) {
          this.pause();
          this.onError(
            "マウス操作が許可されませんでした。もう一度開始してください。",
          );
        }
      });
    } catch {
      this.onError(
        "このブラウザーはマウスのロックに対応していません。PC版 Chrome / Edge をお試しください。",
      );
    }
  }
  pause() {
    if (this.dead) return;
    this.session.phase = "paused";
    this.reset();
    this.acc = 0;
    if (this.controls.isLocked) this.controls.unlock();
    this.publish();
  }
  private reset() {
    this.keys.clear();
    this.fire = false;
    this.ads = false;
    this.jump = false;
    this.reload = false;
  }
  private resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
  }
  private tone(hit: boolean) {
    if (!this.settings.sfxEnabled || !this.audio) return;
    const a = this.audio;
    const oscillator = a.createOscillator(),
      gain = a.createGain();
    oscillator.type = hit ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(hit ? 900 : 160, a.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      hit ? 500 : 45,
      a.currentTime + 0.08,
    );
    gain.gain.setValueAtTime(this.settings.masterVolume * 0.14, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.09);
    oscillator.connect(gain).connect(a.destination);
    oscillator.start();
    oscillator.stop(a.currentTime + 0.1);
  }
  private publish() {
    const w = this.session.player.inventory.slots[0]!;
    this.onHud({
      phase: this.session.phase,
      shots: this.session.training.shotsFired,
      hits: this.session.training.shotsHit,
      ammo: w.magazine,
      weapon: w.id,
      reload: w.reloadRemainingSeconds,
      seconds: this.session.elapsedSeconds,
      fps: this.fps,
      hit: performance.now() < this.hitUntil,
    });
  }
  private frame = (now: number) => {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(Math.max((now - (this.last || now)) / 1000, 0), 0.05);
    this.last = now;
    this.frameCount++;
    if (now - this.fpsAt >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.fpsAt));
      this.frameCount = 0;
      this.fpsAt = now;
    }
    if (this.session.phase === "playing" && this.controls.isLocked) {
      this.acc += dt;
      let ticks = 0;
      while (this.acc >= 1 / 60 && ticks < 5) {
        const input = emptyInput();
        input.forward =
          Number(this.keys.has("KeyW")) - Number(this.keys.has("KeyS"));
        input.strafe =
          Number(this.keys.has("KeyD")) - Number(this.keys.has("KeyA"));
        input.yawDeltaRadians =
          this.camera.rotation.y - this.session.player.facing.yaw;
        input.pitchDeltaRadians =
          this.camera.rotation.x - this.session.player.facing.pitch;
        input.sprint =
          this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
        input.crouch =
          this.keys.has("ControlLeft") || this.keys.has("ControlRight");
        input.ads = this.ads;
        input.fireHeld = this.fire;
        input.jumpPressed = this.jump;
        input.reloadPressed = this.reload;
        this.jump = false;
        this.reload = false;
        const events = stepTraining(this.session, input, 1 / 60);
        this.camera.rotation.x = this.session.player.facing.pitch;
        this.camera.rotation.y = this.session.player.facing.yaw;
        for (const e of events) {
          if (e.type === "shot") {
            const hit = e.hit.hitType === "body";
            if (hit) this.hitUntil = now + 150;
            this.flash.visible = !this.settings.reducedMotion;
            this.tone(hit);
          }
        }
        this.acc -= 1 / 60;
        ticks++;
      }
      if (ticks === 5) this.acc = 0;
    }
    const p = this.session.player;
    this.camera.position.set(
      p.position.x,
      p.position.y + (p.crouching ? 1.15 : 1.75) * 0.94,
      p.position.z,
    );
    const fov = p.isAiming ? 60 : 75;
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    for (const t of this.session.training.targets)
      this.targets.get(t.id)?.position.copy(t.position);
    this.renderer.render(this.scene, this.camera);
    this.flash.visible = false;
    if (now - this.lastHud >= 100) {
      this.lastHud = now;
      this.publish();
    }
  };
  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.cleanups.forEach((fn) => fn());
    if (this.controls.isLocked) this.controls.unlock();
    this.controls.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        materials.forEach((m) => m.dispose());
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    void this.audio?.close().catch(() => {});
  }
}
