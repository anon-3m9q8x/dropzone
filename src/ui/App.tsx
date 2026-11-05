import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Range } from "../render/Range";
import type { PlayMode } from "../core/battle";
import { readRecords, addRecord } from "../core/records";
import type { Hud } from "../render/Range";
import { readSave, writeSettings, emptySave } from "../core/storage";
import { configResult } from "../core/config";
import type { SettingsV1 } from "../core/types";
import { BriefingScreen, LoadingScreen, LobbyScreen } from "./Standby";
import "./theme.css";
import { Home } from "./Home";
import { WEAPON_IDS, weaponDefinition } from "../core/config";
const names = {
  ar: "ASSAULT RIFLE",
  smg: "SUBMACHINE GUN",
  dmr: "MARKSMAN RIFLE",
  lmg: "LIGHT MACHINE GUN",
  sg: "SHOTGUN",
  hg: "HANDGUN",
};
const weaponJa = {
  ar: "アサルトライフル",
  smg: "サブマシンガン",
  dmr: "マークスマンライフル",
  lmg: "ライトマシンガン",
  sg: "ショットガン",
  hg: "ハンドガン",
};
const weaponShort = {
  ar: "AR",
  smg: "SMG",
  dmr: "DMR",
  lmg: "LMG",
  sg: "SG",
  hg: "HG",
};
const controls = [
  ["W A S D", "移動"],
  ["マウス", "視点・照準"],
  ["左クリック", "射撃"],
  ["右クリック（長押し）", "ADS / 精密照準"],
  ["R", "再装填"],
  ["1 〜 6", "武器の切り替え（CPU対戦・バトルロイヤル）"],
  ["E（射撃場）", "武器台から武器を取る（2つまで持てる）"],
  ["1 / 2 / Q / ホイール（射撃場）", "持っている2つの武器を持ち替え"],
  ["Shift", "ダッシュ"],
  ["Ctrl", "しゃがむ"],
  ["Space", "ジャンプ"],
  ["Esc", "一時停止・マウス解放"],
  ["E / H", "物資を拾う / 回復キットを使う"],
];
const modeNames = {
  training: "射撃練習場",
  cpu: "CPU戦",
  br: "バトルロイヤル",
};
function Training({
  settings,
  onExit,
  mode,
  onRetry,
}: {
  settings: SettingsV1;
  onExit: () => void;
  mode: PlayMode;
  onRetry: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<Range | null>(null);
  const [error, setError] = useState("");
  const [recordNote, setRecordNote] = useState("");
  const [stage, setStage] = useState<"loading" | "standby">("loading");
  const [hud, setHud] = useState<Hud>({
    phase: "ready",
    shots: 0,
    hits: 0,
    ammo: 30,
    weapon: "ar",
    reload: 0,
    seconds: 0,
    fps: 0,
    hit: false,
    x: 0,
    z: -38,
    yaw: Math.PI,
    health: 100,
    shield: 50,
    reserve: 90,
    alive: mode === "br" ? 8 : 4,
    kills: 0,
    zone: 90,
    outcome: null,
    place: null,
    mode,
    targets: 4,
    feed: [],
    pickup: "",
    medkits: 1,
    heal: 0,
    outside: false,
    matchId: "",
    slots: ["ar", null],
    activeSlot: 0,
    rack: "",
  });
  useEffect(() => {
    if (!host.current) return;
    let range: Range | null = null;
    try {
      if (!("pointerLockElement" in document)) throw Error("Pointer Lock");
      range = new Range(host.current, settings, setHud, setError, mode);
      engine.current = range;
    } catch {
      setError(
        "3D描画を開始できません。WebGL / Pointer Lock 対応のPCブラウザーを使用してください。",
      );
    }
    return () => {
      range?.dispose();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    engine.current?.update(settings);
  }, [settings]);
  useEffect(() => {
    if (hud.outcome && mode !== "training")
      setRecordNote(
        addRecord({
          id: hud.matchId,
          mode,
          outcome: hud.outcome,
          kills: hud.kills,
          place: hud.place,
          seconds: hud.seconds,
          at: new Date().toISOString(),
        })
          ? "このブラウザーに戦績を保存しました。"
          : "戦績を保存できませんでした。",
      );
  }, [hud.outcome]);
  return (
    <main
      className={`range-screen ${hud.outside ? "outside-zone" : ""}`}
      style={{ "--ui-scale": settings.uiScale } as CSSProperties}
    >
      <div className="range-canvas" ref={host} />
      <div className="range-top">
        <span className="tag">
          ●{" "}
          {mode === "training"
            ? "LIVE TRAINING"
            : mode === "cpu"
              ? "CPU SKIRMISH"
              : "SOLO BATTLE ROYALE"}
        </span>
        <span>
          {modeNames[mode]} <small>一人称</small>
        </span>
        <span>
          {String(Math.floor(hud.seconds / 60)).padStart(2, "0")}:
          {String(Math.floor(hud.seconds % 60)).padStart(2, "0")}
          {settings.showFps && ` · ${hud.fps} FPS`}
        </span>
      </div>
      <div className={`crosshair ${hud.hit ? "hit" : ""}`} aria-hidden="true">
        {hud.hit ? "×" : "+"}
      </div>
      <div className="range-stats">
        <span>
          SHOTS <b>{hud.shots}</b>
        </span>
        <span>
          {mode === "training" ? "DOWN" : "KILLS"}{" "}
          <b>{mode === "training" ? hud.hits : hud.kills}</b>
        </span>
        <span>
          {mode === "training" ? "ACCURACY" : "ALIVE"}{" "}
          <b>
            {mode === "training"
              ? `${hud.shots ? Math.round((hud.hits / hud.shots) * 100) : 0}%`
              : hud.alive}
          </b>
        </span>
        {mode === "br" && (
          <span>
            ZONE <b>{hud.zone.toFixed(0)}m</b>
          </span>
        )}
      </div>
      <div className="battle-feed">
        {hud.feed.map((item, i) => (
          <div key={`${item}-${i}`}>{item}</div>
        ))}
      </div>
      {mode === "br" && (
        <div className="minimap" aria-label="安全地帯と現在位置">
          <svg
            viewBox="-100 -100 200 200"
            role="img"
            aria-label={`安全地帯半径${Math.round(hud.zone)}メートル、中心まで${Math.round(Math.hypot(hud.x, hud.z))}メートル`}
          >
            <rect
              x="-96"
              y="-96"
              width="192"
              height="192"
              fill="#0d1b2a"
              stroke="#41627e"
            />
            <circle
              r={hud.zone}
              fill="#2c7cb32b"
              stroke="#66c6ff"
              strokeWidth="2"
            />
            <path
              d="M 0 -6 L -4 5 L 4 5 Z"
              fill="#ffc986"
              transform={`translate(${hud.x} ${hud.z}) rotate(${(-hud.yaw * 180) / Math.PI})`}
            />
            <circle r="2" fill="#9ad5ff" />
          </svg>
          <small>中心まで {Math.hypot(hud.x, hud.z).toFixed(0)} m · 北 ↑</small>
        </div>
      )}
      {hud.outside && (
        <div className="zone-warning">
          安全地帯の外です！ 青い円の中心へ移動してください
        </div>
      )}
      {hud.rack && (
        <div className="pickup-hint rack-hint">
          {hud.slots.includes(hud.rack)
            ? `E で ${weaponJa[hud.rack]} に持ち替える`
            : hud.slots.every(Boolean)
              ? `E で ${weaponJa[hud.rack]} を取る（今の${weaponJa[hud.weapon]}と入れ替え）`
              : `E で ${weaponJa[hud.rack]} を取る`}
        </div>
      )}
      {hud.pickup && (
        <div className="pickup-hint">
          E で{" "}
          {hud.pickup === "ammo"
            ? "弾薬"
            : hud.pickup === "shield"
              ? "シールド"
              : "回復キット"}{" "}
          を拾う
        </div>
      )}
      {hud.heal > 0 && (
        <div className="pickup-hint">回復中 {hud.heal.toFixed(1)} 秒</div>
      )}
      <div className="range-bottom">
        <div className="vitals">
          <span>
            SHIELD <b>{Math.ceil(hud.shield)}</b>
          </span>
          <i style={{ width: `${(hud.shield / 50) * 100}%` }} />
          <span>
            HEALTH <b>{Math.ceil(hud.health)}</b>
          </span>
          <i style={{ width: `${hud.health}%` }} />
          {mode !== "training" && <small>H 回復キット × {hud.medkits}</small>}
        </div>
        <div className="range-hint">
          {mode === "training"
            ? "WASD 移動 · 右クリック ADS · R 再装填 · 1/2・Q・ホイール 持ち替え · E 武器台から取る · Esc 停止"
            : "WASD 移動 · 右クリック ADS · R 再装填 · Esc 停止"}
        </div>
        <div className="ammo">
          {mode === "training" && (
            <div className="slot-row" aria-label="手持ちの武器">
              {hud.slots.map((w, i) => (
                <span
                  key={i}
                  className={`slot ${i === hud.activeSlot ? "on" : ""} ${w ? "" : "empty"}`}
                >
                  <b>{i + 1}</b>
                  {w ? weaponShort[w] : "空き"}
                </span>
              ))}
            </div>
          )}
          <span>{names[hud.weapon]}</span>
          <strong>
            {hud.ammo.toString().padStart(2, "0")}{" "}
            <small>/ {hud.reserve < 0 ? "∞" : hud.reserve}</small>
          </strong>
          <span>
            {hud.reload > 0
              ? `再装填中 ${hud.reload.toFixed(1)}s`
              : mode === "training"
                ? "予備弾薬：練習用無制限"
                : "E 物資を拾う · H 回復"}
          </span>
        </div>
      </div>
      {stage === "loading" && (
        <LoadingScreen
          mode={mode}
          fast={settings.reducedMotion}
          onDone={() => setStage("standby")}
          onCancel={onExit}
        />
      )}
      {stage === "standby" &&
        hud.phase === "ready" &&
        !hud.outcome &&
        !error &&
        (mode === "br" ? (
          <BriefingScreen
            spawn={{ x: hud.x, z: hud.z }}
            onStart={() => engine.current?.start()}
            onExit={onExit}
          />
        ) : (
          <LobbyScreen
            mode={mode}
            onStart={() => engine.current?.start()}
            onExit={onExit}
          />
        ))}
      {hud.phase !== "playing" && (
        <div className="overlay">
          <section className="pause-card">
            <span className="eyebrow">サバイバー / {modeNames[mode]}</span>
            <h1>
              {error
                ? "起動を確認してください"
                : hud.outcome
                  ? hud.outcome === "victory"
                    ? "VICTORY"
                    : hud.outcome === "defeat"
                      ? "ELIMINATED"
                      : "TIME UP"
                  : hud.phase === "ready"
                    ? "準備はいいですか？"
                    : "TRAINING PAUSED"}
            </h1>
            <p>
              {error ||
                (hud.outcome
                  ? `${hud.place ? `${hud.place}位 · ` : ""}${hud.kills} KILLS · 命中 ${hud.hits} / 発射 ${hud.shots}`
                  : "クリックするとマウスがゲームに固定されます。Esc でいつでも解放できます。")}
            </p>
            <div className="instruction-row">
              {mode === "training" ? (
                <>
                  <span>的に命中すると倒れます</span>
                  <span>後ろの武器台で武器を2つまで持てます</span>
                  <span>高台・ブリッジの上にも的が出ます</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === "cpu"
                      ? "あなた vs CPU 3体"
                      : "8人の個人戦・最後の1人へ"}
                  </span>
                  <span>
                    {mode === "br"
                      ? "安全地帯は段階的に縮小"
                      : "全CPUを倒すと勝利"}
                  </span>
                </>
              )}
            </div>
            {hud.outcome ? (
              <button className="primary" onClick={onRetry}>
                もう一度プレイ →
              </button>
            ) : (
              <button
                className="primary"
                disabled={!!error && !engine.current}
                onClick={() => {
                  setError("");
                  engine.current?.start();
                }}
              >
                {hud.phase === "ready"
                  ? mode === "training"
                    ? "練習を開始"
                    : "対戦を開始"
                  : "練習を再開"}{" "}
                <span>→</span>
              </button>
            )}
            <button className="secondary" onClick={onExit}>
              ホームへ戻る
            </button>
            <small>
              {hud.outcome
                ? recordNote
                : mode === "training"
                  ? "練習結果は戦績に含まれません。"
                  : "予備弾薬は有限です。Eで物資、Hで回復。試合中の保存・再開には未対応です。"}
            </small>
          </section>
        </div>
      )}
    </main>
  );
}
export function App() {
  const [loaded] = useState(() => {
    try {
      return readSave(localStorage);
    } catch {
      return {
        data: emptySave(),
        protected: true,
        message: "保存機能が使用できません。",
      };
    }
  });
  const [settings, setSettings] = useState<SettingsV1>(loaded.data.settings);
  const [message, setMessage] = useState(loaded.message);
  const [page, setPage] = useState("home");
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<PlayMode>("training");
  const [round, setRound] = useState(0);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(pointer: fine) and (min-width: 900px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  function change<K extends keyof SettingsV1>(key: K, value: SettingsV1[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      setMessage(
        writeSettings(localStorage, loaded.data, next, loaded.protected),
      );
    } catch {
      setMessage("設定は今回のみ反映します。");
    }
  }
  if (playing)
    return (
      <Training
        key={`${mode}-${round}`}
        mode={mode}
        settings={settings}
        onExit={() => setPlaying(false)}
        onRetry={() => setRound((n) => n + 1)}
      />
    );
  if (page === "home")
    return (
      <Home
        canPlay={desktop && configResult.ok}
        playNote={
          !configResult.ok
            ? "ゲーム定数に不整合があります。"
            : "プレイには PC とマウス、幅900px以上の画面が必要です。"
        }
        onPlay={(m) => {
          setMode(m);
          setPlaying(true);
        }}
        onNavigate={setPage}
      />
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" onClick={() => setPage("home")}>
          <span className="brand-mark">
            S<span>∕</span>
          </span>
          <div>サバイバー</div>
        </a>
        <div className="sidebar-label">OPERATIONS</div>
        <nav aria-label="メインナビゲーション">
          {[
            ["home", "⌂", "ホーム"],
            ["training", "⌖", "射撃練習場"],
            ["loadout", "▱", "ロードアウト"],
            ["stats", "▥", "戦績"],
            ["settings", "⚙", "設定"],
            ["help", "?", "操作ガイド"],
          ].map(([id, icon, label]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => setPage(id!)}
            >
              <span>{icon}</span>
              {label}
              <i>{page === id ? "●" : ""}</i>
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" /> LOCAL / OFFLINE READY
          <p>
            自分のペースで、
            <br />
            次の一発を磨こう。
          </p>
          <small>シングルプレイ · アカウント不要</small>
        </div>
        <div className="build-label">
          COMBAT BUILD <b>v0.2.0</b>
        </div>
      </aside>
      <div className="main-shell">
        <header>
          <div className="breadcrumb">
            OPERATIONS <span>/</span>{" "}
            {page === "home" ? "OVERVIEW" : page.toUpperCase()}
          </div>
          <div className="header-right">
            <span className="local-badge">
              <i /> LOCAL PLAYER
            </span>
            <span className="avatar">P1</span>
          </div>
        </header>
        <main className="content">
          {page === "training" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">WELCOME TO THE WASTELAND</span>
                  <h1>
                    {page === "training"
                      ? "射撃練習場"
                      : "荒野で、最後まで立っていろ。"}
                  </h1>
                  <p>
                    文明が崩れた荒野で、照準と立ち回りを磨く。生き残るのは、最後の1人。
                  </p>
                </div>
                <span className="version-chip">THREE MODES · FIRST PERSON</span>
              </div>
              <section className="hero">
                <div className="hero-art" aria-hidden="true">
                  <svg viewBox="0 0 1200 400" preserveAspectRatio="xMaxYMax slice">
                    <defs>
                      <linearGradient id="home-sky" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#f6eedd" />
                        <stop offset="0.6" stopColor="#ead6b0" />
                        <stop offset="1" stopColor="#d4b483" />
                      </linearGradient>
                    </defs>
                    <rect width="1200" height="400" fill="url(#home-sky)" />
                    <g className="sun">
                      <circle cx="930" cy="120" r="56" fill="#fbf5e8" />
                      <circle cx="930" cy="120" r="120" fill="#fbf5e8" opacity="0.4" />
                    </g>
                    <polygon points="560,300 560,170 590,162 600,190 630,186 630,120 652,108 662,140 700,140 700,230 760,230 760,156 784,146 792,174 820,170 820,300" fill="#d9c09a" />
                    <polygon points="980,300 980,200 1010,192 1020,216 1050,212 1050,150 1068,142 1080,170 1120,170 1120,250 1180,250 1180,300" fill="#d9c09a" />
                    <g fill="#c0a173">
                      <rect x="600" y="270" width="600" height="16" />
                      <rect x="640" y="286" width="20" height="60" />
                      <rect x="820" y="286" width="20" height="60" />
                      <rect x="1000" y="286" width="20" height="60" />
                    </g>
                    <g stroke="#a88c62" strokeWidth="2">
                      <line x1="880" y1="320" x2="892" y2="196" />
                      <line x1="868" y1="210" x2="916" y2="206" />
                    </g>
                    <polygon points="0,330 260,300 520,320 760,296 1000,314 1200,300 1200,400 0,400" fill="#cfae7c" />
                    <polygon points="0,370 320,346 640,364 900,340 1200,356 1200,400 0,400" fill="#bf9a66" />
                    <g fill="#8a6c47">
                      <path d="M860 368 h110 l12 -20 h-36 l-12 -14 h-46 l-14 18 h-14 z" />
                      <circle cx="880" cy="370" r="9" />
                      <circle cx="954" cy="370" r="9" />
                    </g>
                    <g transform="translate(1060 200)">
                      <circle r="44" fill="none" stroke="#b4471c" strokeWidth="4" />
                      <circle r="26" fill="none" stroke="#b4471c" strokeWidth="2" strokeDasharray="5 5" />
                      <path d="M-14 0 H14 M0 -14 V14" stroke="#b4471c" strokeWidth="3" />
                    </g>
                  </svg>
                  <span className="coordinates">
                    DAY 0417 — 汚染区域 第7セクター
                    <br />
                    SECTOR 07 / FIELD RANGE
                  </span>
                </div>
                <div className="hero-copy">
                  <span className="tag">FIELD RANGE OPEN</span>
                  <h2>
                    AIM.
                    <br />
                    SURVIVE.
                    <br />
                    <em>REPEAT.</em>
                  </h2>
                  <p>
                    荒野の射撃場で、6種の武器を試し撃ち。
                    <br />
                    時間制限なし。何度でも、納得のいくまで。
                  </p>
                  <button
                    className="primary"
                    disabled={!desktop || !configResult.ok}
                    onClick={() => {
                      setMode("training");
                      setPlaying(true);
                    }}
                  >
                    射撃練習を開始 <span>↗</span>
                  </button>
                  <small>
                    {!configResult.ok
                      ? "ゲーム定数に不整合があります。"
                      : desktop
                        ? "PC + マウスでプレイ · Esc で一時停止"
                        : "プレイには PC とマウス、幅900px以上の画面が必要です。"}
                  </small>
                </div>
                <span className="hero-number" aria-hidden="true">
                  07
                </span>
              </section>
              <section className="mode-grid" aria-label="ゲームモード">
                {(["training", "cpu", "br"] as const).map((id) => (
                  <article className={`mode-card mode-${id}`} key={id}>
                    <span className="eyebrow">
                      {id === "training"
                        ? "ENDLESS RANGE"
                        : id === "cpu"
                          ? "CPU SKIRMISH"
                          : "SURVIVOR"}
                    </span>
                    <h2>{modeNames[id]}</h2>
                    <p>
                      {id === "training"
                        ? "倒れる的を次々に撃つエンドレス練習。"
                        : id === "cpu"
                          ? "CPU 3体と対戦。全員を倒して勝利を目指す。"
                          : "7体のCPUと個人戦。縮小する安全地帯で生き残れ。"}
                    </p>
                    <button
                      className="secondary"
                      disabled={!desktop || !configResult.ok}
                      onClick={() => {
                        setMode(id);
                        setPlaying(true);
                      }}
                    >
                      {modeNames[id]}をプレイ →
                    </button>
                  </article>
                ))}
              </section>
              <div className="feature-grid">
                <article className="metric-card">
                  <span className="metric-icon">⌖</span>
                  <div>
                    <span>TARGETS</span>
                    <h3>
                      ∞ <small>ターゲット</small>
                    </h3>
                    <p>命中で倒れる · 続々出現</p>
                  </div>
                </article>
                <article className="metric-card">
                  <span className="metric-icon">▱</span>
                  <div>
                    <span>LOADOUT</span>
                    <h3>
                      6 <small>ウェポン</small>
                    </h3>
                    <p>AR / SMG / DMR / LMG / SG / HG</p>
                  </div>
                </article>
                <article className="metric-card">
                  <span className="metric-icon">∞</span>
                  <div>
                    <span>TRAINING AMMO</span>
                    <h3>
                      無制限 <small>予備弾薬</small>
                    </h3>
                    <p>マガジン再装填は必要</p>
                  </div>
                </article>
              </div>
              <div className="lower-grid">
                <section className="panel">
                  <div className="section-heading">
                    <h2>武器を知る</h2>
                    <span>YOUR LOADOUT</span>
                  </div>
                  {[
                    [
                      "01",
                      "AR",
                      "アサルトライフル",
                      "バランスのよい連射武器",
                      "30",
                      "8.0",
                    ],
                    [
                      "02",
                      "SMG",
                      "サブマシンガン",
                      "近距離向け・高い連射速度",
                      "36",
                      "12.0",
                    ],
                    [
                      "03",
                      "DMR",
                      "マークスマンライフル",
                      "一発ずつ狙うセミオート",
                      "12",
                      "2.2",
                    ],
                  ].map(([n, id, label, text, mag, rate]) => (
                    <div className="weapon-row" key={id}>
                      <span className="weapon-key">{n}</span>
                      <div className="weapon-symbol" aria-hidden="true">
                        ╾━╤
                      </div>
                      <div className="weapon-title">
                        <strong>
                          {id} <small>{label}</small>
                        </strong>
                        <p>{text}</p>
                      </div>
                      <div className="weapon-spec">
                        <b>{mag}</b>
                        <small>MAGAZINE</small>
                      </div>
                      <div className="weapon-spec">
                        <b>{rate}</b>
                        <small>SHOTS / SEC</small>
                      </div>
                    </div>
                  ))}
                </section>
                <section className="panel next-panel">
                  <span className="eyebrow">BATTLE ROYALE</span>
                  <h2>SURVIVOR</h2>
                  <span className="outline-tag">プレイ可能</span>
                  <p>
                    CPU 7体とのバトルロイヤル。
                    <br />
                    縮小する安全地帯と物資を駆使して、
                    <br />
                    最後の一人を目指す。
                  </p>
                  <div className="next-bottom">
                    <span>SOLO BATTLE ROYALE</span>
                    <span>CPU × 7</span>
                  </div>
                </section>
              </div>
            </>
          )}
          {page === "loadout" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">LOADOUT</span>
                  <h1>ロードアウト</h1>
                  <p>
                    CPU戦・バトルロイヤルでは 1〜6
                    キーで全武器を切り替え。射撃練習場では武器台から2つまで持てます。
                  </p>
                </div>
                <span className="version-chip">{WEAPON_IDS.length} WEAPONS</span>
              </div>
              <section className="panel">
                {WEAPON_IDS.map((id, i) => {
                  const d = weaponDefinition(id);
                  return (
                    <div className="weapon-row" key={id}>
                      <span className="weapon-key">KEY {i + 1}</span>
                      <div className="weapon-title">
                        <strong>
                          {names[id]} <small>{weaponJa[id]}</small>
                        </strong>
                      </div>
                      <div className="weapon-spec">
                        <b>{d.magazineSize}</b>
                        <small>MAGAZINE</small>
                      </div>
                      <div className="weapon-spec">
                        <b>{d.shotsPerSecond}</b>
                        <small>SHOTS / SEC</small>
                      </div>
                      <div className="weapon-spec">
                        <b>{d.damage}</b>
                        <small>DAMAGE</small>
                      </div>
                      <div className="weapon-spec">
                        <b>{d.rangeMeters}m</b>
                        <small>RANGE</small>
                      </div>
                      <div className="weapon-spec">
                        <b>{d.reloadSeconds}s</b>
                        <small>RELOAD</small>
                      </div>
                    </div>
                  );
                })}
              </section>
            </>
          )}
          {page === "settings" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">PREFERENCES</span>
                  <h1>プレイ環境を整える</h1>
                  <p>設定はこのブラウザーに保存されます。</p>
                </div>
              </div>
              <section className="panel settings-panel">
                {(
                  [
                    ["sensitivity", "マウス感度", 0.1, 3, 0.1],
                    ["masterVolume", "効果音の音量", 0, 1, 0.05],
                    ["uiScale", "プレイ中のUI倍率", 0.8, 1.4, 0.05],
                  ] as const
                ).map(([key, label, min, max, step]) => (
                  <label className="setting-row" key={key}>
                    <span>
                      {label}
                      <small>{settings[key].toFixed(2)}</small>
                    </span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={settings[key]}
                      onChange={(e) => change(key, Number(e.target.value))}
                    />
                  </label>
                ))}
                <label className="setting-row">
                  <span>
                    描画品質<small>高品質ほど描画解像度が上がります</small>
                  </span>
                  <select
                    value={settings.graphicsQuality}
                    onChange={(e) =>
                      change(
                        "graphicsQuality",
                        e.target.value as SettingsV1["graphicsQuality"],
                      )
                    }
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </label>
                {(
                  [
                    ["sfxEnabled", "効果音"],
                    ["showFps", "FPS表示"],
                    ["reducedMotion", "動き・発光を抑える"],
                    ["colorAssistMode", "ターゲットの高コントラスト配色"],
                  ] as const
                ).map(([key, label]) => (
                  <label className="setting-row" key={key}>
                    <span>{label}</span>
                    <input
                      className="toggle"
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) => change(key, e.target.checked)}
                    />
                  </label>
                ))}
                <p className="save-message" role="status">
                  {message || "設定を変更すると自動保存されます。"}
                </p>
              </section>
            </>
          )}
          {page === "help" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">FIELD MANUAL</span>
                  <h1>操作ガイド</h1>
                  <p>PC のキーボードとマウスで操作します。</p>
                </div>
              </div>
              <section className="panel help-panel">
                {controls.map(([key, label]) => (
                  <div className="help-row" key={key}>
                    <kbd>{key}</kbd>
                    <span>{label}</span>
                  </div>
                ))}
                <p>
                  ダッシュ中は射撃・再装填できません。ADSを優先するとダッシュが解除されます。DMRはクリックごとに1発発射します。遮蔽物の向こうのターゲットには命中しません。
                </p>
                <p>
                  タブ切り替え・ウィンドウのフォーカス解除・マウス解放時は自動で一時停止します。「練習を再開」を押すまで進行しません。
                </p>
              </section>
            </>
          )}
          {page === "stats" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">SERVICE RECORD</span>
                  <h1>戦績</h1>
                  <p>バトルロイヤルの記録用ページです。</p>
                </div>
              </div>
              <section className="panel empty-state">
                {readRecords().map((r) => (
                  <div className="record-row" key={r.id}>
                    <strong>{modeNames[r.mode]}</strong>
                    <span>
                      {r.outcome === "victory"
                        ? "勝利"
                        : r.outcome === "defeat"
                          ? "敗北"
                          : "時間切れ"}
                    </span>
                    <span>
                      {r.place ? `${r.place}位 · ` : ""}
                      {r.kills} KILLS
                    </span>
                    <small>{new Date(r.at).toLocaleString("ja-JP")}</small>
                  </div>
                ))}
                <span>▥</span>
                <h2>
                  {readRecords().length ? "対戦履歴" : "まだ戦績はありません"}
                </h2>
                <p>
                  CPU戦・バトルロイヤルの終了結果をこのブラウザーに記録します。
                  <br />
                  練習中の命中率はプレイ画面に表示し、戦績には保存しません。
                </p>
                <button
                  className="secondary"
                  onClick={() => setPage("training")}
                >
                  射撃練習場を見る →
                </button>
              </section>
            </>
          )}
          <footer>
            <span>サバイバー</span>
            <span>NO ACCOUNTS. JUST SURVIVE.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
