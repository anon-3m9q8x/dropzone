import * as THREE from "three";
import { CONFIG, WEAPON_IDS } from "../core/config";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import {
  createTraining,
  emptyInput,
  stepTraining,
  switchWeapon,
} from "../core/training";
import { createBattle, stepBattle } from "../core/battle";
import type { Battle, PlayMode } from "../core/battle";
import { human, disposeObject } from "./human";
import { trainingColliders } from "../core/collision";
import { buildWeapon } from "./weapons";
import { buildEnvironment, SKY } from "./environment";
import type { WeaponModel } from "./weapons";
import type { SettingsV1, WeaponId } from "../core/types";
export interface Hud {
  phase: string;
  matchId: string;
  x: number;
  z: number;
  yaw: number;
  health: number;
  shield: number;
  reserve: number;
  alive: number;
  kills: number;
  zone: number;
  outcome: string | null;
  place: number | null;
  mode: PlayMode;
  targets: number;
  feed: string[];
  pickup: string;
  medkits: number;
  heal: number;
  outside: boolean;
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
  private aimCamera = new THREE.PerspectiveCamera();
  private battle: Battle | null = null;
  // First-person weapon and arms, drawn in a second pass over the world.
  private viewScene = new THREE.Scene();
  private viewRoot = new THREE.Group();
  private viewCamera = new THREE.PerspectiveCamera(75, 1, 0.01, 10);
  private gun = new THREE.Group();
  private weapons = new Map<WeaponId, WeaponModel>();
  private aim = 0;
  private kick = 0;
  private actors = new Map<string, THREE.Group>();
  private supplies = new Map<string, THREE.Mesh>();
  private zoneMesh: THREE.LineLoop | null = null;
  private tracers: {
    mesh: THREE.Line;
    from: THREE.Vector3;
    to: THREE.Vector3;
    age: number;
    duration: number;
  }[] = [];
  private interact = false;
  private heal = false;
  private controls: PointerLockControls;
  private session = createTraining();
  private keys = new Set<string>();
  private fire = false;
  private firePressed = false;
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
  private flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd28a }),
  );
  private settings: SettingsV1;
  private frameCount = 0;
  private fps = 0;
  private fpsAt = 0;
  constructor(
    private host: HTMLElement,
    settings: SettingsV1,
    private onHud: (h: Hud) => void,
    private onError: (s: string) => void,
    private mode: PlayMode = "training",
  ) {
    this.settings = settings;
    if (mode !== "training") {
      this.battle = createBattle(mode);
      this.session = this.battle.session;
    }
    this.renderer = new THREE.WebGLRenderer({
      antialias: settings.graphicsQuality !== "low",
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(SKY);
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
    const material = (color: number) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    buildEnvironment(
      this.scene,
      this.battle?.boxes ?? trainingColliders,
      !!this.battle,
      settings.graphicsQuality,
    );
    for (const target of this.mode === "training"
      ? this.session.training.targets
      : []) {
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
    this.renderer.autoClear = false;
    this.viewScene.add(new THREE.HemisphereLight(0xe8f0fa, 0x4a4f57, 3.2));
    const key = new THREE.DirectionalLight(0xfff6e8, 3.2);
    key.position.set(1.5, 3, 1);
    this.viewScene.add(key);
    const rim = new THREE.DirectionalLight(0xa8c8ff, 1.1);
    rim.position.set(-2, 1, -2);
    this.viewScene.add(rim);
    this.viewScene.add(this.viewRoot);
    this.viewRoot.add(this.gun);
    for (const id of WEAPON_IDS) {
      const model = buildWeapon(id);
      model.group.visible = false;
      this.weapons.set(id, model);
      this.gun.add(model.group);
    }
    this.flash.visible = false;
    if (this.battle) {
      for (const bot of this.session.bots) {
        const model = human(0xe6814f);
        this.actors.set(bot.id, model);
        this.scene.add(model);
      }
      for (const item of this.battle.supplies) {
        const m = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.35),
          new THREE.MeshStandardMaterial({
            color:
              item.kind === "ammo"
                ? 0xffca70
                : item.kind === "shield"
                  ? 0x59c9ff
                  : 0x67e7ad,
            emissive: 0x162c36,
          }),
        );
        m.position.set(item.position.x, 0.45, item.position.z);
        this.supplies.set(item.id, m);
        this.scene.add(m);
      }
      const points = Array.from(
        { length: 129 },
        (_, i) =>
          new THREE.Vector3(
            Math.sin((i / 128) * Math.PI * 2),
            0,
            Math.cos((i / 128) * Math.PI * 2),
          ),
      );
      this.zoneMesh = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0x51baff }),
      );
      this.zoneMesh.position.y = 0.1;
      this.scene.add(this.zoneMesh);
      this.zoneMesh.visible = this.mode === "br";
    }
    this.scene.add(this.camera);
    this.aimCamera.rotation.order = "YXZ";
    this.aimCamera.rotation.y = Math.PI;
    this.controls = new PointerLockControls(
      this.aimCamera,
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
      if (this.dead || this.session.phase === "finished") return;
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
        if (e.code === "KeyE") this.interact = true;
        if (e.code === "KeyH") this.heal = true;
        const slot = /^Digit([1-6])$/.exec(e.code)?.[1];
        if (slot) switchWeapon(this.session, WEAPON_IDS[Number(slot) - 1]!);
      }
      this.keys.add(e.code);
    }) as EventListener);
    listen(window, "keyup", ((e: KeyboardEvent) => {
      this.keys.delete(e.code);
    }) as EventListener);
    listen(window, "mousedown", ((e: MouseEvent) => {
      if (!this.controls.isLocked) return;
      if (e.button === 0) {
        this.fire = true;
        this.firePressed = true;
      }
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
    for (const t of this.mode === "training"
      ? this.session.training.targets
      : []) {
      const m = this.targets.get(t.id);
      if (!m) continue;
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
    if (this.dead || this.session.phase === "finished") return;
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
    if (this.session.phase !== "finished") this.session.phase = "paused";
    this.reset();
    this.acc = 0;
    if (this.controls.isLocked) this.controls.unlock();
    this.publish();
  }
  private reset() {
    this.keys.clear();
    this.fire = false;
    this.firePressed = false;
    this.ads = false;
    this.jump = false;
    this.reload = false;
    this.interact = false;
    this.heal = false;
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
      matchId: this.session.matchId,
      x: this.session.player.position.x,
      z: this.session.player.position.z,
      yaw: this.session.player.facing.yaw,
      health: this.session.player.health,
      shield: this.session.player.shield,
      reserve: this.mode === "training" ? -1 : w.reserve,
      alive:
        this.session.bots.filter((b) => b.alive).length +
        Number(this.session.player.alive),
      kills: this.session.player.eliminationCount,
      zone: this.battle?.radius ?? 0,
      outcome: this.battle?.outcome ?? null,
      place: this.battle?.place ?? null,
      mode: this.mode,
      targets: this.session.training.targets.filter(
        (t) => this.session.fallenTargets[t.id] === undefined,
      ).length,
      feed: this.battle?.feed ?? [],
      pickup:
        this.battle?.supplies.find(
          (x) =>
            x.active &&
            Math.hypot(
              x.position.x - this.session.player.position.x,
              x.position.z - this.session.player.position.z,
            ) < 2.2,
        )?.kind ?? "",
      medkits: this.session.player.inventory.medkits,
      heal: this.battle?.healRemaining ?? 0,
      outside:
        !!this.battle &&
        this.mode === "br" &&
        Math.hypot(
          this.session.player.position.x,
          this.session.player.position.z,
        ) > this.battle.radius,
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
          this.aimCamera.rotation.y - this.session.player.facing.yaw;
        input.pitchDeltaRadians =
          this.aimCamera.rotation.x - this.session.player.facing.pitch;
        input.sprint =
          this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
        input.crouch =
          this.keys.has("ControlLeft") || this.keys.has("ControlRight");
        input.ads = this.ads;
        input.fireHeld = this.fire || this.firePressed;
        this.firePressed = false;
        input.jumpPressed = this.jump;
        input.reloadPressed = this.reload;
        input.interactPressed = this.interact;
        input.healPressed = this.heal;
        this.jump = false;
        this.reload = false;
        this.interact = false;
        this.heal = false;
        const events = this.battle
          ? stepBattle(this.battle, input, 1 / 60)
          : stepTraining(this.session, input, 1 / 60);
        this.aimCamera.rotation.x = this.session.player.facing.pitch;
        this.aimCamera.rotation.y = this.session.player.facing.yaw;
        for (const e of events) {
          if (e.type === "shot") {
            const hit =
              e.shooterId === "player" &&
              (e.hit.hitType === "body" || e.hit.hitType === "head");
            const actor =
              e.shooterId === "player"
                ? this.session.player
                : this.session.bots.find((b) => b.id === e.shooterId);
            if (actor && e.hit.point)
              this.addTracer(
                e.shooterId === "player"
                  ? this.flash.getWorldPosition(new THREE.Vector3())
                  : new THREE.Vector3(
                      actor.position.x +
                        Math.cos(actor.facing.yaw) * 0.22 -
                        Math.sin(actor.facing.yaw) * 0.65,
                      actor.position.y + 1.03,
                      actor.position.z -
                        Math.sin(actor.facing.yaw) * 0.22 -
                        Math.cos(actor.facing.yaw) * 0.65,
                    ),
                new THREE.Vector3(e.hit.point.x, e.hit.point.y, e.hit.point.z),
                e.shooterId === "player",
              );
            if (e.shooterId === "player" && !this.settings.reducedMotion)
              this.kick = 1;
            if (hit) this.hitUntil = now + 150;
            this.flash.visible =
              e.shooterId === "player" && !this.settings.reducedMotion;
            this.tone(hit);
          }
        }
        if (this.battle?.outcome) {
          this.controls.unlock();
          this.publish();
          break;
        }
        this.acc -= 1 / 60;
        ticks++;
      }
      if (ticks === 5) this.acc = 0;
    }
    const p = this.session.player;
    const eye = new THREE.Vector3(
      p.position.x,
      p.position.y + (p.crouching ? 1.15 : 1.75) * 0.94,
      p.position.z,
    );
    this.aimCamera.position.copy(eye);
    this.camera.position.copy(eye);
    this.camera.quaternion.copy(this.aimCamera.quaternion);
    const fov = p.isAiming ? 60 : 75;
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld(true);
    this.updateViewModel(dt);
    if (this.mode === "training") this.syncTargets();
    for (const bot of this.session.bots) {
      const model = this.actors.get(bot.id)!;
      model.position.copy(bot.position);
      model.rotation.y = bot.facing.yaw;
      model.rotation.z = bot.alive ? 0 : Math.PI / 2;
      if (!bot.alive) model.position.y = 0.25;
      else if (!this.settings.reducedMotion) {
        const walk = bot.destination
          ? Math.sin(this.session.elapsedSeconds * 9) * 0.28
          : 0;
        model.getObjectByName("legL")!.rotation.x = walk;
        model.getObjectByName("legR")!.rotation.x = -walk;
      }
    }
    if (this.battle) {
      this.zoneMesh?.scale.setScalar(this.battle.radius);
      for (const item of this.battle.supplies) {
        if (!this.supplies.has(item.id)) {
          const mesh = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.35),
            new THREE.MeshStandardMaterial({ color: 0xffca70 }),
          );
          mesh.position.set(item.position.x, 0.45, item.position.z);
          this.scene.add(mesh);
          this.supplies.set(item.id, mesh);
        }
        this.supplies.get(item.id)!.visible = item.active;
      }
    }
    if (this.session.phase === "playing")
      for (const t of [...this.tracers]) {
        t.age += dt;
        const progress = Math.min(1, t.age / t.duration);
        const a = t.from.clone().lerp(t.to, Math.max(0, progress - 0.18)),
          b = t.from.clone().lerp(t.to, progress);
        t.mesh.geometry.setFromPoints([a, b]);
        t.mesh.children[0]?.position.copy(b);
        if (progress === 1) {
          this.scene.remove(t.mesh);
          disposeObject(t.mesh);
          this.tracers.splice(this.tracers.indexOf(t), 1);
        }
      }
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.viewScene, this.viewCamera);
    this.flash.visible = false;
    if (now - this.lastHud >= 100) {
      this.lastHud = now;
      this.publish();
    }
  };
  private updateViewModel(dt: number) {
    const p = this.session.player;
    const id = p.inventory.slots[0]!.id;
    const model = this.weapons.get(id)!;
    for (const [key, m] of this.weapons) m.group.visible = key === id;
    if (this.flash.parent !== model.muzzle) model.muzzle.add(this.flash);
    this.viewRoot.position.copy(this.camera.position);
    this.viewRoot.quaternion.copy(this.camera.quaternion);
    // Own camera with a short near plane so the stock and arms never clip.
    this.viewCamera.position.copy(this.camera.position);
    this.viewCamera.quaternion.copy(this.camera.quaternion);
    if (
      this.viewCamera.fov !== this.camera.fov ||
      this.viewCamera.aspect !== this.camera.aspect
    ) {
      this.viewCamera.fov = this.camera.fov;
      this.viewCamera.aspect = this.camera.aspect;
      this.viewCamera.updateProjectionMatrix();
    }
    const still = this.settings.reducedMotion;
    const blend = still ? 1 : 1 - Math.exp(-dt * 14);
    this.aim += ((p.isAiming ? 1 : 0) - this.aim) * blend;
    this.kick = Math.max(0, this.kick - dt * 9);
    const moving =
      !still &&
      this.session.phase === "playing" &&
      ["KeyW", "KeyA", "KeyS", "KeyD"].some((k) => this.keys.has(k));
    const t = this.session.elapsedSeconds * (p.isSprinting ? 13 : 9);
    const sway = moving ? 1 - this.aim * 0.85 : 0;
    const sprint = p.isSprinting && !p.isAiming ? 1 : 0;
    // Hip: weapon low and right. ADS: optic centred on the eye line.
    const scale = 0.62;
    this.gun.scale.setScalar(scale);
    this.gun.position.set(
      THREE.MathUtils.lerp(0.11, 0, this.aim) + Math.sin(t) * 0.005 * sway,
      THREE.MathUtils.lerp(-0.115, -model.sightHeight * scale, this.aim) -
        Math.abs(Math.cos(t)) * 0.005 * sway -
        sprint * 0.03,
      THREE.MathUtils.lerp(
        id === "hg" ? -0.34 : -0.3,
        id === "dmr" ? -0.085 : id === "hg" ? -0.22 : -0.08,
        this.aim,
      ) +
        this.kick * (id === "sg" ? 0.045 : 0.02),
    );
    if (model.pump) model.pump.position.z = -0.37 + this.kick * 0.05;
    this.gun.rotation.set(
      this.kick * 0.035 - sprint * 0.25,
      THREE.MathUtils.lerp(0.07, 0, this.aim) + sprint * 0.45,
      sprint * 0.2,
    );
  }
  private addTracer(from: THREE.Vector3, to: THREE.Vector3, player: boolean) {
    if (this.tracers.length >= 100) {
      const first = this.tracers.shift()!;
      this.scene.remove(first.mesh);
      disposeObject(first.mesh);
    }
    const mesh = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([from, from]),
      new THREE.LineBasicMaterial({
        color: player ? 0xffdb88 : 0xff774f,
        transparent: true,
        opacity: 0.95,
        depthTest: true,
      }),
    );
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 4),
      new THREE.MeshBasicMaterial({ color: player ? 0xfff1ad : 0xff8e65 }),
    );
    mesh.add(tip);
    this.scene.add(mesh);
    this.tracers.push({
      mesh,
      from,
      to,
      age: 0,
      duration: this.settings.reducedMotion
        ? 0.06
        : Math.max(0.14, Math.min(0.4, from.distanceTo(to) / 220)),
    });
  }
  private syncTargets() {
    for (const [id, mesh] of this.targets) {
      if (!this.session.training.targets.some((t) => t.id === id)) {
        this.scene.remove(mesh);
        disposeObject(mesh);
        this.targets.delete(id);
      }
    }
    for (const t of this.session.training.targets) {
      let mesh = this.targets.get(t.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 1.6, 0.24),
          new THREE.MeshStandardMaterial({
            color: this.settings.colorAssistMode
              ? 0xffdd55
              : t.isMoving
                ? 0x38c9dd
                : 0xf28c47,
          }),
        );
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.28, 0.035, 8, 32),
          new THREE.MeshBasicMaterial({ color: 0x132335 }),
        );
        ring.position.z = -0.13;
        mesh.add(ring);
        this.targets.set(t.id, mesh);
        this.scene.add(mesh);
      }
      const down = this.session.fallenTargets[t.id];
      const progress =
        down === undefined
          ? 0
          : Math.min(1, (this.session.elapsedSeconds - down) / 0.4);
      mesh.position.copy(t.position);
      mesh.position.y -= progress * 0.8;
      mesh.rotation.x = (progress * Math.PI) / 2;
    }
  }
  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.cleanups.forEach((fn) => fn());
    if (this.controls.isLocked) this.controls.unlock();
    this.controls.dispose();
    for (const root of [this.scene, this.viewScene])
      root.traverse((obj) => {
        if (
          obj instanceof THREE.Mesh ||
          obj instanceof THREE.LineSegments ||
          obj instanceof THREE.Line
        ) {
          obj.geometry.dispose();
          const materials = Array.isArray(obj.material)
            ? obj.material
            : [obj.material];
          materials.forEach((m) => {
          if ("map" in m && m.map instanceof THREE.Texture) m.map.dispose();
          m.dispose();
        });
        }
      });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    void this.audio?.close().catch(() => {});
  }
}
