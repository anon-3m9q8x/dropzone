import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Range } from "../render/Range";
import type { Hud } from "../render/Range";
import { readSave, writeSettings, emptySave } from "../core/storage";
import { configResult } from "../core/config";
import type { SettingsV1 } from "../core/types";
const names = {
  ar: "ASSAULT RIFLE",
  smg: "SUBMACHINE GUN",
  dmr: "MARKSMAN RIFLE",
};
const controls = [
  ["W A S D", "移動"],
  ["マウス", "視点・照準"],
  ["左クリック", "射撃"],
  ["右クリック（長押し）", "ADS / 精密照準"],
  ["R", "再装填"],
  ["1 / 2 / 3", "AR / SMG / DMR"],
  ["Shift", "ダッシュ"],
  ["Ctrl", "しゃがむ"],
  ["Space", "ジャンプ"],
  ["Esc", "一時停止・マウス解放"],
];
function Training({
  settings,
  onExit,
}: {
  settings: SettingsV1;
  onExit: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<Range | null>(null);
  const [error, setError] = useState("");
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
  });
  useEffect(() => {
    if (!host.current) return;
    let range: Range | null = null;
    try {
      if (!("pointerLockElement" in document))
        throw Error("Pointer Lock 非対応");
      range = new Range(host.current, settings, setHud, setError);
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
  return (
    <main
      className="range-screen"
      style={{ "--ui-scale": settings.uiScale } as CSSProperties}
    >
      <div className="range-canvas" ref={host} />
      <div className="range-top">
        <span className="tag">● LIVE TRAINING</span>
        <span>
          射撃練習場 <small>40 × 50 M</small>
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
          HITS <b>{hud.hits}</b>
        </span>
        <span>
          ACCURACY{" "}
          <b>{hud.shots ? Math.round((hud.hits / hud.shots) * 100) : 0}%</b>
        </span>
      </div>
      <div className="range-bottom">
        <div className="vitals">
          <span>
            SHIELD <b>50</b>
          </span>
          <i />
          <span>
            HEALTH <b>100</b>
          </span>
          <i />
        </div>
        <div className="range-hint">
          WASD 移動 · 右クリック ADS · R 再装填 · Esc 一時停止
        </div>
        <div className="ammo">
          <span>{names[hud.weapon]}</span>
          <strong>
            {hud.ammo.toString().padStart(2, "0")} <small>/ ∞</small>
          </strong>
          <span>
            {hud.reload > 0
              ? `再装填中 ${hud.reload.toFixed(1)}s`
              : "予備弾薬：練習用無制限"}
          </span>
        </div>
      </div>
      {hud.phase !== "playing" && (
        <div className="overlay">
          <section className="pause-card">
            <span className="eyebrow">DROPZONE / FIRING RANGE</span>
            <h1>
              {error
                ? "起動を確認してください"
                : hud.phase === "ready"
                  ? "準備はいいですか？"
                  : "TRAINING PAUSED"}
            </h1>
            <p>
              {error ||
                "クリックするとマウスがゲームに固定されます。Esc でいつでも解放できます。"}
            </p>
            <div className="instruction-row">
              <span>01 静止ターゲット × 3</span>
              <span>02 移動ターゲット × 1</span>
            </div>
            <button
              className="primary"
              disabled={!!error && !engine.current}
              onClick={() => {
                setError("");
                engine.current?.start();
              }}
            >
              {hud.phase === "ready" ? "練習を開始" : "練習を再開"}{" "}
              <span>→</span>
            </button>
            <button className="secondary" onClick={onExit}>
              ホームへ戻る
            </button>
            <small>練習結果は戦績に含まれません。</small>
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
    return <Training settings={settings} onExit={() => setPlaying(false)} />;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" onClick={() => setPage("home")}>
          <span className="brand-mark">
            D<span>∕</span>
          </span>
          <div>
            DROPZONE<small>LAST SIGNAL</small>
          </div>
        </a>
        <div className="sidebar-label">OPERATIONS</div>
        <nav aria-label="メインナビゲーション">
          {[
            ["home", "⌂", "ホーム"],
            ["training", "⌖", "射撃練習場"],
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
          TRAINING BUILD <b>v0.1.0</b>
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
          {(page === "home" || page === "training") && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">WELCOME TO THE RANGE</span>
                  <h1>
                    {page === "training"
                      ? "射撃練習場"
                      : "一発の精度が、次を変える。"}
                  </h1>
                  <p>
                    照準、移動、武器の感覚。ここから、あなたのプレイをつくろう。
                  </p>
                </div>
                <span className="version-chip">STEP 01 · TRAINING</span>
              </div>
              <section className="hero">
                <div className="hero-art" aria-hidden="true">
                  <div className="art-grid" />
                  <div className="tower t1" />
                  <div className="tower t2" />
                  <div className="tower t3" />
                  <div className="target-art">
                    <i />
                    <i />
                    <b>+</b>
                  </div>
                  <span className="coordinates">
                    35°40′ N — 139°45′ E<br />
                    SECTOR 07 / TRAINING FACILITY
                  </span>
                </div>
                <div className="hero-copy">
                  <span className="tag">● FIRING RANGE ONLINE</span>
                  <h2>
                    FOCUS.
                    <br />
                    AIM.
                    <br />
                    <em>REPEAT.</em>
                  </h2>
                  <p>
                    静止・移動ターゲットで、3種の武器をマスター。
                    <br />
                    時間制限なし。何度でも、納得のいくまで。
                  </p>
                  <button
                    className="primary"
                    disabled={!desktop || !configResult.ok}
                    onClick={() => setPlaying(true)}
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
              <div className="feature-grid">
                <article className="metric-card">
                  <span className="metric-icon">⌖</span>
                  <div>
                    <span>TARGETS</span>
                    <h3>
                      4 <small>ターゲット</small>
                    </h3>
                    <p>静止 × 3 / 移動 × 1</p>
                  </div>
                </article>
                <article className="metric-card">
                  <span className="metric-icon">▱</span>
                  <div>
                    <span>LOADOUT</span>
                    <h3>
                      3 <small>ウェポン</small>
                    </h3>
                    <p>AR / SMG / DMR</p>
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
                  <span className="eyebrow">NEXT OPERATION</span>
                  <h2>LAST SIGNAL</h2>
                  <span className="outline-tag">今後の実装予定</span>
                  <p>
                    CPU 7体とのバトルロイヤル。
                    <br />
                    縮小する安全地帯と物資を駆使して、
                    <br />
                    最後の一人を目指す。
                  </p>
                  <div className="next-bottom">
                    <span>SOLO BATTLE ROYALE</span>
                    <span>未実装</span>
                  </div>
                </section>
              </div>
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
                <span>▥</span>
                <h2>まだ戦績はありません</h2>
                <p>
                  このビルドでは射撃練習を利用できます。
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
            <span>DROPZONE: LAST SIGNAL</span>
            <span>NO ACCOUNTS. JUST PRACTICE.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
