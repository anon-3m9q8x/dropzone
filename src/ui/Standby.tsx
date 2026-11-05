import { useEffect, useState } from "react";
import "./standby.css";
import type { PlayMode } from "../core/battle";
import { CONFIG, WEAPON_IDS, weaponDefinition } from "../core/config";
import { readRecords } from "../core/records";
import type { WeaponId } from "../core/types";

/* 待機画面（ライト・荒野テーマ）
   案C 出撃前ロード → 案A 出撃ロビー（射撃練習・CPU戦）/ 案B 降下ブリーフィング（バトルロイヤル） */

const weaponJa: Record<WeaponId, string> = {
  ar: "アサルトライフル",
  smg: "サブマシンガン",
  dmr: "マークスマンライフル",
  lmg: "ライトマシンガン",
  sg: "ショットガン",
  hg: "ハンドガン",
};
const weaponEn: Record<WeaponId, string> = {
  ar: "ASSAULT RIFLE",
  smg: "SUBMACHINE GUN",
  dmr: "MARKSMAN RIFLE",
  lmg: "LIGHT MACHINE GUN",
  sg: "SHOTGUN",
  hg: "HANDGUN",
};
const modeJa: Record<PlayMode, string> = {
  training: "射撃練習場",
  cpu: "CPU戦",
  br: "バトルロイヤル",
};
const modeEn: Record<PlayMode, string> = {
  training: "FIRING RANGE",
  cpu: "CPU SKIRMISH",
  br: "BATTLE ROYALE · 8 PLAYERS",
};

const TIPS: Record<PlayMode, string[]> = {
  training: [
    "後ろの武器台に近づいて E。武器は2つまで持てる。",
    "1 / 2 / Q / ホイールで持っている武器を持ち替え。",
    "高台やブリッジの上にも的が出る。見上げて探そう。",
    "右クリック長押しで ADS。遠くの的は覗いて撃とう。",
  ],
  cpu: [
    "リロード中は無防備。瓦礫の陰に入ってから R を押そう。",
    "1〜6 で武器を切り替え。距離に合った武器を選ぼう。",
    "H で回復キット。射撃・ダッシュで中断される。",
    "ダッシュ中は撃てない。撃ち合いの前に足を止めよう。",
  ],
  br: [
    "安全地帯の外では砂嵐でダメージを受け続ける。",
    "降りたらまず物資（弾薬・シールド・回復キット）を拾え。",
    "最初の縮小が始まる前に、円の内側へ寄っておこう。",
    "リロード中は無防備。瓦礫の陰に入ってから R を押そう。",
  ],
};

const KEYS: [string, string][] = [
  ["WASD", "移動"],
  ["SHIFT", "ダッシュ"],
  ["R", "リロード"],
  ["H", "回復キット"],
  ["ESC", "一時停止"],
];

function Mark() {
  return (
    <span className="sb-mark" aria-hidden="true">
      S∕
    </span>
  );
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/* ───────── 案C 出撃前ロード ───────── */
export function LoadingScreen({
  mode,
  fast,
  onDone,
  onCancel,
}: {
  mode: PlayMode;
  fast: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [pct, setPct] = useState(0);
  const [tip] = useState(
    () => TIPS[mode][Math.floor(Math.random() * TIPS[mode].length)]!,
  );
  useEffect(() => {
    const total = fast ? 500 : 1800;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / total);
      setPct(Math.round(p * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(onDone, fast ? 0 : 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const keys: [string, string][] =
    mode === "training"
      ? [...KEYS.slice(0, 3), ["E", "武器台から取る"], ["1 / 2", "持ち替え"]]
      : [...KEYS.slice(0, 3), ["1〜6", "武器切り替え"], ["H", "回復キット"]];
  return (
    <div className="sb sb-loading" role="status" aria-live="polite">
      <svg
        className="sb-bg"
        aria-hidden="true"
        viewBox="0 0 1280 720"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="sbc-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6eedd" />
            <stop offset="0.55" stopColor="#ead6b0" />
            <stop offset="1" stopColor="#d4b483" />
          </linearGradient>
          <linearGradient id="sbc-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f3ecdd" stopOpacity="0.92" />
            <stop offset="0.5" stopColor="#f3ecdd" stopOpacity="0.25" />
            <stop offset="1" stopColor="#f3ecdd" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="1280" height="720" fill="url(#sbc-sky)" />
        <circle cx="980" cy="230" r="70" fill="#fbf5e8" />
        <circle cx="980" cy="230" r="150" fill="#fbf5e8" opacity="0.4" />
        <polygon
          points="560,440 560,300 590,292 600,320 630,316 630,250 652,238 662,270 700,270 700,360 760,360 760,286 784,276 792,304 820,300 820,420"
          fill="#d9c09a"
        />
        <polygon
          points="1040,430 1040,330 1070,322 1080,346 1110,342 1110,280 1128,272 1140,300 1180,300 1180,380 1240,380 1240,430"
          fill="#d9c09a"
        />
        <g fill="#c0a173">
          <rect x="600" y="420" width="600" height="18" />
          <rect x="640" y="438" width="22" height="80" />
          <rect x="820" y="438" width="22" height="80" />
          <rect x="1000" y="438" width="22" height="80" />
          <polygon points="1180,420 1220,420 1250,470 1236,476 1206,438 1180,438" />
        </g>
        <g stroke="#a88c62" strokeWidth="2">
          <line x1="880" y1="460" x2="890" y2="330" />
          <line x1="868" y1="344" x2="914" y2="340" />
          <line x1="1120" y1="470" x2="1150" y2="350" />
          <line x1="1130" y1="362" x2="1172" y2="372" />
        </g>
        <polygon
          points="0,520 220,480 460,500 720,470 980,490 1280,470 1280,720 0,720"
          fill="#cfae7c"
        />
        <polygon
          points="0,600 300,560 620,590 900,556 1280,580 1280,720 0,720"
          fill="#bf9a66"
        />
        <g fill="#8a6c47">
          <path d="M820 586 h120 l14 -22 h-40 l-14 -16 h-52 l-16 20 h-12 z" />
          <circle cx="842" cy="588" r="10" />
          <circle cx="924" cy="588" r="10" />
        </g>
        <g className="sb-dust" fill="#b39567">
          <circle cx="300" cy="420" r="2" />
          <circle cx="420" cy="380" r="1.5" />
          <circle cx="700" cy="200" r="1.5" />
          <circle cx="1180" cy="520" r="2" />
          <circle cx="520" cy="300" r="1.5" />
        </g>
        <rect width="1280" height="720" fill="url(#sbc-fade)" />
      </svg>
      <div className="sb-bar-top" aria-hidden="true" />
      <div className="sb-bar-bottom" aria-hidden="true" />

      <div className="sb-load-title">
        <div className="sb-row">
          <Mark />
          <span className="sb-type sb-accent">{modeEn[mode]}</span>
        </div>
        <h1 className="sb-display">サバイバー</h1>
        <p>
          {mode === "br" ? (
            <>
              文明が崩れた荒野。
              <br />
              最後の1人になるまで、生き延びろ。
            </>
          ) : mode === "cpu" ? (
            <>
              瓦礫の街で、CPU 3体を迎え撃て。
              <br />
              全員倒せば、あなたの勝ち。
            </>
          ) : (
            <>
              荒野の射撃場。
              <br />
              次の一発を磨いておこう。
            </>
          )}
        </p>
      </div>

      <aside className="sb-manual" aria-label="操作">
        <span className="sb-type sb-accent">FIELD MANUAL / 操作</span>
        <dl>
          {keys.map(([k, v]) => (
            <div key={k}>
              <dt>
                <kbd>{k}</kbd>
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <div className="sb-load-panel">
        <div className="sb-row sb-tip">
          <span className="sb-tip-tag">TIP</span>
          <span>{tip}</span>
        </div>
        <div className="sb-row">
          <div
            className="sb-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <i style={{ width: `${pct}%` }} />
          </div>
          <b className="sb-pct">{pct}%</b>
        </div>
        <div className="sb-row sb-small">
          <span className="sb-type">
            {pct < 100 ? "地形データを読み込み中…" : "準備完了"}
          </span>
          <span className="sb-push">読み込みが終わると待機画面に進みます</span>
          <button type="button" className="sb-btn" onClick={onDone}>
            スキップ
          </button>
          <button type="button" className="sb-btn" onClick={onCancel}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

function useRecordSummary() {
  const [s] = useState(() => {
    const rs = readRecords();
    const wins = rs.filter((r) => r.outcome === "victory").length;
    const places = rs
      .filter((r) => r.mode === "br" && r.place)
      .map((r) => r.place!);
    return {
      wins,
      best: places.length ? `${Math.min(...places)}位` : "—",
      count: rs.length,
    };
  });
  return s;
}

/* ───────── 案A 出撃ロビー ───────── */
export function LobbyScreen({
  mode,
  onStart,
  onExit,
}: {
  mode: Exclude<PlayMode, "br">;
  onStart: () => void;
  onExit: () => void;
}) {
  const rec = useRecordSummary();
  const cpus = Array.from({ length: 3 }, (_, i) => ({
    name: `CPU ${pad(i + 1)}`,
    weapon: (i % 3 === 0 ? "ar" : i % 3 === 1 ? "smg" : "dmr") as WeaponId,
  }));
  const loadout: WeaponId[] = mode === "training" ? ["ar"] : [...WEAPON_IDS];
  return (
    <div className="sb sb-lobby">
      <header className="sb-head">
        <div className="sb-row">
          <Mark />
          <span className="sb-display sb-brand">サバイバー</span>
        </div>
        <span className="sb-mode">{modeJa[mode]}</span>
        <span className="sb-type sb-muted sb-push">
          汚染区域 第7セクター · {modeEn[mode]}
        </span>
      </header>

      <aside className="sb-col sb-left">
        {mode === "cpu" ? (
          <>
            <span className="sb-type sb-accent">SURVIVORS 4 / 4</span>
            <h2 className="sb-display">生存者名簿</h2>
            <ol className="sb-roster">
              <li className="me">
                <b>01</b>あなた<span className="ok">準備完了</span>
              </li>
              {cpus.map((c, i) => (
                <li key={c.name}>
                  <b>{pad(i + 2)}</b>
                  {c.name}
                  <span>{weaponJa[c.weapon]}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <span className="sb-type sb-accent">RANGE NOTES</span>
            <h2 className="sb-display">射撃場メモ</h2>
            <ol className="sb-roster">
              <li className="me">
                <b>01</b>倒れる的を撃ち続ける
              </li>
              <li>
                <b>02</b>後ろの武器台で武器を取る
              </li>
              <li>
                <b>03</b>武器は2つまで持てる
              </li>
              <li>
                <b>04</b>高台・ブリッジにも的
              </li>
              <li>
                <b>05</b>予備弾薬は無制限
              </li>
            </ol>
          </>
        )}
      </aside>

      <main className="sb-stage">
        <svg
          className="sb-bg"
          aria-hidden="true"
          viewBox="0 0 640 552"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="sba-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f4ead6" />
              <stop offset="0.7" stopColor="#e6cfa6" />
              <stop offset="1" stopColor="#d8bb8c" />
            </linearGradient>
          </defs>
          <rect width="640" height="552" fill="url(#sba-sky)" />
          <circle cx="470" cy="150" r="54" fill="#f7efe0" opacity="0.9" />
          <circle cx="470" cy="150" r="90" fill="#f7efe0" opacity="0.35" />
          <polygon
            points="0,330 30,330 30,260 52,248 58,270 80,270 80,210 96,200 104,222 120,222 120,300 160,300 160,240 178,236 184,252 200,252 200,320 0,320"
            fill="#cdb48c"
          />
          <polygon
            points="400,320 400,230 418,226 430,244 444,240 444,190 460,180 468,204 486,204 486,262 520,262 520,236 540,236 548,254 566,250 566,320"
            fill="#cdb48c"
          />
          <g stroke="#a88c62" strokeWidth="2" fill="none">
            <line x1="250" y1="330" x2="262" y2="200" />
            <line x1="242" y1="214" x2="282" y2="210" />
            <line x1="330" y1="330" x2="352" y2="214" />
            <line x1="336" y1="224" x2="374" y2="232" />
            <path d="M262 212 Q307 240 352 222" />
          </g>
          <polygon
            points="0,380 120,350 260,368 420,340 640,362 640,552 0,552"
            fill="#cfae7c"
          />
          <polygon
            points="0,440 180,410 360,430 520,404 640,420 640,552 0,552"
            fill="#bf9a66"
          />
          <g fill="#8a6c47">
            <path d="M70 430 h86 l10 -16 h-30 l-10 -12 h-36 l-12 14 h-8 z" />
            <circle cx="86" cy="432" r="7" />
            <circle cx="146" cy="432" r="7" />
          </g>
          <g stroke="#a3814f" strokeWidth="1.5" fill="none" opacity="0.8">
            <path d="M60 500 l40 -8 l18 12 l36 -10" />
            <path d="M380 492 l30 10 l26 -6 l40 12" />
            <path d="M220 530 l24 -12 l30 6" />
          </g>
          <ellipse cx="320" cy="512" rx="140" ry="18" fill="#a3814f" opacity="0.45" />
          <path
            d="M320 150 c-26 0 -40 22 -40 46 c0 18 8 30 18 36 l-34 18 c-18 10 -28 30 -30 52 l-8 120 h40 l8 -80 l10 80 h72 l10 -80 l8 80 h40 l-8 -120 c-2 -22 -12 -42 -30 -52 l-34 -18 c10 -6 18 -18 18 -36 c0 -24 -14 -46 -40 -46 z"
            fill="#3b3127"
          />
          <path d="M282 196 h76 l-6 -14 h-64 z" fill="#5a4a38" />
          <rect x="296" y="200" width="48" height="9" rx="2" fill="#b4471c" />
        </svg>
        <div className="sb-standby">
          <span className="sb-type sb-accent">STANDBY</span>
          <h1 className="sb-display">出撃待機中</h1>
          <p>
            {mode === "cpu"
              ? "あなた vs CPU 3体 · 全CPUを倒すと勝利"
              : "時間制限なし · 練習結果は戦績に含まれません"}
          </p>
        </div>
      </main>

      <aside className="sb-col sb-right">
        <span className="sb-type sb-accent">LOADOUT</span>
        <h2 className="sb-display">
          {mode === "training" ? "最初の武器" : "使える武器"}
        </h2>
        <div className={`sb-loadout ${loadout.length > 2 ? "compact" : ""}`}>
          {loadout.map((id, i) => {
            const d = weaponDefinition(id);
            return (
              <div className={`sb-slot ${i === 0 ? "on" : ""}`} key={id}>
                <span className="sb-type">
                  {mode === "training" ? "SLOT 01" : `KEY ${i + 1}`}
                </span>
                <b>{loadout.length > 2 ? id.toUpperCase() : weaponEn[id]}</b>
                <small>
                  {loadout.length > 2
                    ? `${weaponJa[id]} · ${d.magazineSize}発`
                    : `${d.magazineSize}発 · 毎秒${d.shotsPerSecond} · 射程${d.rangeMeters}m`}
                </small>
              </div>
            );
          })}
          {mode === "training" && (
            <div className="sb-slot empty">
              <span className="sb-type">SLOT 02</span>
              <b>空き</b>
              <small>武器台で E を押して取る</small>
            </div>
          )}
        </div>
        <dl className="sb-record">
          <dt>通算勝利</dt>
          <dd>{rec.wins}</dd>
          <dt>BR最高順位</dt>
          <dd>{rec.best}</dd>
        </dl>
      </aside>

      <footer className="sb-foot">
        <div className="sb-foot-text">
          <span>クリックで開始</span>
          <b>READY</b>
        </div>
        <div className="sb-progress sb-grow" aria-hidden="true">
          <i style={{ width: "100%" }} />
        </div>
        <button type="button" className="sb-btn" onClick={onExit}>
          ホームへ戻る
        </button>
        <button type="button" className="sb-btn sb-primary" onClick={onStart}>
          {mode === "training" ? "練習を開始" : "準備完了"}
        </button>
      </footer>
    </div>
  );
}

/* ───────── 案B 降下ブリーフィング ───────── */
export function BriefingScreen({
  spawn,
  onStart,
  onExit,
}: {
  spawn: { x: number; z: number };
  onStart: () => void;
  onExit: () => void;
}) {
  const phases = CONFIG.zone.phases;
  const r0 = phases[0]!.fromRadius;
  const firstShrink =
    phases.find((p) => p.toRadius < p.fromRadius)?.startSecond ?? 0;
  const max = CONFIG.match.maxSeconds;
  const players = CONFIG.match.totalActors;
  // 地図：1m = 3px（192m → 576px）、中心 (320,320)
  const S = 3,
    C = 320;
  const px = C + spawn.x * S,
    pz = C + spawn.z * S;
  return (
    <div className="sb sb-brief">
      <section className="sb-map" aria-label="降下地点の地図">
        <svg
          role="img"
          aria-label={`192m四方のアリーナ。最初の安全地帯は半径${r0}m。あなたの降下地点は中心から${Math.round(Math.hypot(spawn.x, spawn.z))}m`}
          viewBox="0 0 640 640"
        >
          <rect x="4" y="4" width="632" height="632" fill="#f1e6cf" stroke="#2a231b" strokeWidth="2" />
          <g fill="none" stroke="#c4ad85" strokeWidth="1.4">
            <path d="M40 520 C140 460 200 500 280 430 S420 380 520 420 S600 470 620 440" />
            <path d="M30 560 C150 500 220 540 300 470 S440 420 540 460 S610 510 630 490" />
            <path d="M60 140 C160 180 220 120 300 160 S440 220 560 170" />
            <path d="M40 100 C160 140 230 80 310 120 S450 180 590 130" />
            <ellipse cx="180" cy="300" rx="70" ry="44" />
            <ellipse cx="180" cy="300" rx="42" ry="24" />
          </g>
          <rect x={C - 96 * S} y={C - 96 * S} width={192 * S} height={192 * S} fill="none" stroke="#2a231b" strokeWidth="3" strokeDasharray="12 6" />
          <circle cx={C} cy={C} r={r0 * S} fill="#5f6b3a" fillOpacity="0.12" stroke="#5f6b3a" strokeWidth="3" />
          {phases
            .filter((p) => p.toRadius < p.fromRadius)
            .slice(0, 2)
            .map((p) => (
              <circle key={p.startSecond} cx={C} cy={C} r={p.toRadius * S} fill="none" stroke="#5f6b3a" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.7" />
            ))}
          <path d={`M40 600 Q ${(40 + px) / 2 - 60} ${(600 + pz) / 2 - 40} ${px} ${pz}`} fill="none" stroke="#2a231b" strokeWidth="2" strokeDasharray="3 9" />
          <g transform={`translate(${px} ${pz})`}>
            <circle r="26" fill="none" stroke="#b4471c" strokeWidth="4" transform="rotate(-8)" />
            <path d="M-13 -13 L13 13 M13 -13 L-13 13" stroke="#b4471c" strokeWidth="5" strokeLinecap="round" />
            <text x="34" y="-10" className="sb-maptext" fill="#b4471c">LZ / あなた</text>
          </g>
          <g transform="translate(590 600)">
            <line x1="0" y1="10" x2="0" y2="-34" stroke="#2a231b" strokeWidth="1.5" />
            <path d="M0 -44 l-7 14 h14 z" fill="#2a231b" />
            <text x="-5" y="28" className="sb-maptext" fill="#2a231b">N</text>
          </g>
          <text x={C + 8} y={C - r0 * S + 18} className="sb-maptext" fill="#4d5a2a">
            安全地帯 {r0}m
          </text>
          <circle cx={C} cy={C} r="4" fill="#2a231b" />
        </svg>
        <div className="sb-map-label">
          <span className="sb-type sb-accent">ARENA 192 × 192 m</span>
          <span>緑の円：最初の安全地帯 · 点線：縮小後の目安</span>
        </div>
        <div className="sb-map-tags">
          <span className="sb-tag sb-tag-accent">あなたの降下地点</span>
          <span className="sb-tag">中心まで {Math.round(Math.hypot(spawn.x, spawn.z))}m</span>
        </div>
      </section>

      <section className="sb-brief-side">
        <div className="sb-row">
          <Mark />
          <span className="sb-display sb-brand">サバイバー</span>
          <span className="sb-type sb-muted sb-push">BRIEFING / 作戦指令</span>
        </div>
        <div className="sb-countdown">
          <span>最初の縮小まで</span>
          <b>
            {pad(Math.floor(firstShrink / 60))}:{pad(firstShrink % 60)}
          </b>
        </div>
        <dl className="sb-facts">
          <div>
            <dt>生存者</dt>
            <dd>
              {players} / {players}
            </dd>
          </div>
          <div>
            <dt>安全地帯</dt>
            <dd>{r0}m</dd>
          </div>
          <div>
            <dt>制限時間</dt>
            <dd>
              {pad(Math.floor(max / 60))}:{pad(max % 60)}
            </dd>
          </div>
        </dl>
        <div className="sb-memo">
          <h2 className="sb-display">作戦メモ</h2>
          <ul>
            <li>降りたらまず物資（弾薬・シールド・回復キット）を拾え</li>
            <li>安全地帯の外では砂嵐でダメージを受け続ける</li>
            <li>H で回復キット（射撃・ダッシュで中断）· 1〜6 で武器切り替え</li>
          </ul>
        </div>
        <div className="sb-row sb-actions">
          <button type="button" className="sb-btn sb-primary sb-grow" onClick={onStart}>
            降下する
          </button>
          <button type="button" className="sb-btn" onClick={onExit}>
            ホームへ戻る
          </button>
        </div>
        <small className="sb-muted">クリックするとマウスがゲームに固定されます。Esc で解放。</small>
      </section>
    </div>
  );
}
