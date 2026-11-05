import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { PlayMode } from "../core/battle";
import { readRecords } from "../core/records";
import { WEAPON_IDS } from "../core/config";
import soldierUrl from "../assets/soldier.webp";
import { DAY, NIGHT, homeArt } from "./homeArt";
import "./home.css";

/* 案4「崩壊都市」のホーム画面。1280×720 の舞台を画面に合わせて拡大縮小する */

type Time = "night" | "day";
const TIME_KEY = "survivor-home-time-v1";
const MODE_KEY = "survivor-home-mode-v1";

const MODES: { id: PlayMode; name: string; note: string }[] = [
  { id: "br", name: "バトルロイヤル", note: "8人の個人戦・最後の1人へ" },
  { id: "cpu", name: "CPU戦", note: "あなた vs CPU 3体" },
  { id: "training", name: "射撃練習場", note: "倒れる的を撃ち続ける" },
];

function readPref<T extends string>(key: string, ok: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && ok.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* 保存できなくても今回だけ反映 */
  }
}

function untilMidnight(now: Date) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const ms = next.getTime() - now.getTime();
  const h = Math.floor(ms / 3600000),
    m = Math.floor((ms % 3600000) / 60000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 今日の戦績からデイリーミッションの進み具合を数える */
function dailyMissions(now: Date) {
  const today = now.toDateString();
  const rs = readRecords().filter((r) => new Date(r.at).toDateString() === today);
  const br = rs.filter((r) => r.mode === "br").length;
  const cpuWin = rs.filter((r) => r.mode === "cpu" && r.outcome === "victory").length;
  const kills = rs.reduce((n, r) => n + r.kills, 0);
  return [
    { icon: "target", label: "バトルロイヤルを3回プレイ", now: Math.min(br, 3), goal: 3 },
    { icon: "gun", label: "CPU戦で1回勝利する", now: Math.min(cpuWin, 1), goal: 1 },
    { icon: "flag", label: "今日の合計で10体倒す", now: Math.min(kills, 10), goal: 10 },
  ];
}

function Icon({ name }: { name: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinejoin: "round" as const };
  switch (name) {
    case "play":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3 L21 12 L5 21 Z" fill="currentColor" /></svg>;
    case "modes":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" fill="currentColor" /><rect x="13" y="3" width="8" height="8" {...p} /><rect x="3" y="13" width="8" height="8" {...p} /><rect x="13" y="13" width="8" height="8" fill="currentColor" /></svg>;
    case "gun":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9 H18 L20 7 H22 V11 H14 L12 14 H9 L10 11 H6 L4 15 H2 Z" {...p} strokeWidth={1.8} /></svg>;
    case "range":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" {...p} /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>;
    case "stats":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 V13 H8 V20 Z M10 20 V8 H14 V20 Z M16 20 V4 H20 V20 Z" fill="currentColor" /></svg>;
    case "settings":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5" {...p} /><path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M4.9 19.1 L7 17 M17 7 L19.1 4.9" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" /></svg>;
    case "keys":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2" {...p} /><path d="M6 10 H8 M10 10 H12 M14 10 H16 M7 14 H17" stroke="currentColor" strokeWidth={2} /></svg>;
    case "target":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" {...p} /><path d="M12 1 V7 M12 17 V23 M1 12 H7 M17 12 H23" stroke="currentColor" strokeWidth={2} /></svg>;
    case "flag":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 22 V3 M5 4 H18 L15 8 L18 12 H5" {...p} /></svg>;
    case "calendar":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" {...p} /><path d="M3 10 H21 M8 3 V7 M16 3 V7" stroke="currentColor" strokeWidth={2} /></svg>;
    case "sun":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" {...p} /><path d="M12 1.5 V4 M12 20 V22.5 M1.5 12 H4 M20 12 H22.5 M4.6 4.6 L6.4 6.4 M17.6 17.6 L19.4 19.4 M4.6 19.4 L6.4 17.6 M17.6 6.4 L19.4 4.6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" /></svg>;
    case "moon":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5 A8.5 8.5 0 1 1 9.5 4 A7 7 0 0 0 20 14.5 Z" {...p} /></svg>;
    case "chev":
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5 L15 12 L8 19" fill="none" stroke="currentColor" strokeWidth={2.5} /></svg>;
    default:
      return null;
  }
}

const GUN_PATHS: Record<string, string> = {
  ar: "M2 12 H60 L64 10 H78 V14 H62 L58 18 H40 L42 26 H34 L32 18 H14 L10 24 H2 Z",
  smg: "M8 12 H52 L56 10 H70 V14 H54 L50 18 H38 L40 28 H32 L30 18 H18 L14 24 H8 Z",
  dmr: "M0 14 H66 L70 12 H80 V16 H68 L62 20 H44 L46 28 H38 L36 20 H14 L8 26 H0 Z M28 6 H50 V12 H28 Z",
  lmg: "M2 10 H62 L66 8 H78 V14 H64 L58 18 H48 V28 H36 V18 H14 L10 24 H2 Z",
  sg: "M2 12 H66 L70 11 H80 V15 H64 L58 19 H30 L26 26 H18 L20 19 H12 L8 24 H2 Z",
  hg: "M22 8 H58 V16 H42 L40 26 H30 L32 16 H22 Z",
};

export function Home({
  canPlay,
  playNote,
  onPlay,
  onNavigate,
}: {
  canPlay: boolean;
  playNote: string;
  onPlay: (mode: PlayMode) => void;
  onNavigate: (page: string) => void;
}) {
  const [time, setTime] = useState<Time>(() => readPref(TIME_KEY, ["night", "day"] as const, "night"));
  const [mode, setMode] = useState<PlayMode>(() => readPref(MODE_KEY, ["br", "cpu", "training"] as const, "br"));
  const [picking, setPicking] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1280, window.innerHeight / 720));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  useEffect(() => {
    if (!picking) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setPicking(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [picking]);

  const c = time === "day" ? DAY : NIGHT;
  const art = useMemo(() => homeArt(c), [time]);
  const missions = useMemo(() => dailyMissions(now), [now.toDateString(), now.getMinutes()]);
  const rec = useMemo(() => {
    const rs = readRecords();
    return { wins: rs.filter((r) => r.outcome === "victory").length };
  }, []);
  const current = MODES.find((m) => m.id === mode)!;

  const vars = {
    "--h-panel": c.panel,
    "--h-panel2": c.panel2,
    "--h-line": c.line,
    "--h-text": c.text,
    "--h-muted": c.muted,
    "--h-accent": c.accent,
    "--h-accent-hi": c.accentHi,
    "--h-on-accent": c.onAccent,
    "--h-gold": c.gold,
    "--h-gun": c.gunIcon,
    "--h-far": c.far,
    "--h-sky": c.sky0,
    "--h-scale": scale,
  } as CSSProperties;

  function pickMode(m: PlayMode) {
    setMode(m);
    writePref(MODE_KEY, m);
    setPicking(false);
  }
  function toggleTime() {
    const t = time === "day" ? "night" : "day";
    setTime(t);
    writePref(TIME_KEY, t);
  }

  return (
    <div className={`home home-${time}`} style={vars}>
      <div className="home-stage">
        <div className="home-bg" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art }} />
        <img className={`home-hero ${time}`} src={soldierUrl} alt="" aria-hidden="true" />

        <div className="home-logo">
          <span className="home-kicker"><i>//</i>ブラウザFPS</span>
          <div className="home-wordmark">
            <svg viewBox="0 0 200 40" aria-hidden="true"><path d="M10 2 H190 L100 38 Z" /></svg>
            <h1>SURVIV<span>O</span>R</h1>
            <span className="home-wordmark-ja">サバイバー</span>
          </div>
        </div>

        <nav className="home-menu" aria-label="メインメニュー">
          <button className="home-play" disabled={!canPlay} onClick={() => onPlay(mode)}>
            <Icon name="play" />
            プレイ
            <small>{current.name}</small>
          </button>
          <button aria-expanded={picking} onClick={() => setPicking((v) => !v)}>
            <Icon name="modes" />モード選択
          </button>
          {picking && (
            <div className="home-modes" role="group" aria-label="モード">
              {MODES.map((m) => (
                <button key={m.id} aria-pressed={m.id === mode} onClick={() => pickMode(m.id)}>
                  <b>{m.name}</b>
                  <small>{m.note}</small>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => onNavigate("loadout")}><Icon name="gun" />ロードアウト</button>
          <button onClick={() => onNavigate("training")}><Icon name="range" />射撃練習場</button>
          <button onClick={() => onNavigate("stats")}><Icon name="stats" />戦績</button>
          <button onClick={() => onNavigate("settings")}><Icon name="settings" />設定</button>
          {!canPlay && <p className="home-note">{playNote}</p>}
        </nav>

        <div className="home-top">
          <button className="home-icon" aria-label={time === "day" ? "夜の表示に切り替え" : "昼の表示に切り替え"} title={time === "day" ? "夜にする" : "昼にする"} onClick={toggleTime}>
            <Icon name={time === "day" ? "moon" : "sun"} />
          </button>
          <button className="home-icon" aria-label="操作ガイド" title="操作ガイド" onClick={() => onNavigate("help")}>
            <Icon name="keys" />
          </button>
          <div className="home-player">
            <svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" /><circle cx="24" cy="18" r="9" /><path d="M6 48 C8 32 40 32 42 48 Z" /></svg>
            <div>
              <b>LOCAL PLAYER</b>
              <span>P1 · 通算勝利 {rec.wins}</span>
            </div>
          </div>
        </div>

        <aside className="home-daily" aria-label="デイリーミッション">
          <h2>
            <Icon name="calendar" />デイリーミッション
            <span>更新まで<b>{untilMidnight(now)}</b></span>
          </h2>
          {missions.map((m) => (
            <div className={`home-mission ${m.now >= m.goal ? "done" : ""}`} key={m.label}>
              <Icon name={m.icon} />
              <div>
                {m.label}
                <div className="home-progress-row">
                  <div className="home-progress"><i style={{ width: `${(m.now / m.goal) * 100}%` }} /></div>
                  <span>{m.now}/{m.goal}</span>
                </div>
              </div>
              <span className="home-badge">{m.now >= m.goal ? "達成" : "挑戦中"}</span>
            </div>
          ))}
          <button className="home-more" onClick={() => onNavigate("stats")}>
            戦績を見る<Icon name="chev" />
          </button>
        </aside>

        <div className="home-band">
          <div className="home-stage-info">
            <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 L44 40 H4 Z" className="tri" /><path d="M24 18 L32 34 H16 Z" className="core" /></svg>
            <div>
              <span>ステージ <b>07</b></span>
              <strong>崩壊の第7セクター</strong>
              <small>SECTOR 07 · 192 × 192 M</small>
            </div>
          </div>
          <div className="home-armory">
            <div className="home-armory-head">
              <span className="title"><Icon name="gun" />武器庫</span>
              <span>使える武器 <b>{WEAPON_IDS.length}</b> / {WEAPON_IDS.length}</span>
              <div className="home-armory-bar">{WEAPON_IDS.map((w) => <i key={w} />)}</div>
            </div>
            <div className="home-armory-list">
              {WEAPON_IDS.map((w) => (
                <div className="home-gun" key={w}>
                  <svg viewBox="0 0 80 30" aria-hidden="true"><path d={GUN_PATHS[w]} /></svg>
                  <span>{w.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="home-band-action">
            <button onClick={() => onNavigate("loadout")}>ロードアウト詳細<Icon name="chev" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
