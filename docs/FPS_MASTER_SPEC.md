# DROPZONE: LAST SIGNAL — Claude Code用 正本実装仕様書

- 仕様書ID：DZ-MASTER-1.0 / 2026-11-04
- 状態：**実装指示の正本**。ゲーム本体の実装コードではない。
- 対象：**新規構築**、ブラウザ3D FPS、ソロ・ミニバトルロイヤル、オフラインCPU戦
- 本書の規範語：**MUST＝必須**、**SHOULD＝原則実施**、**MAY＝任意**。
- 優先順位：ユーザーの最新明示要件 ＞ 本書 ＞ `GAME_RULES_AND_AI.md` ＞ `game-config.json` ＞ `UI_UX_SPEC.md` ＞ その他参考資料。**ただし定数値は `game-config.json` を唯一の正本**とする。矛盾を見つけた場合は実装前に `docs/DECISIONS.md` に理由と変更後の単一定義を記録する。

## 1. 概要と目的

### 1.1 目的
Apex Legends、Fortnite、PUBG等を参考とした「探索・射撃・敵AI・安全地帯・最後の1人を目指す」体験を、**著作物や既存ゲーム固有の名称・マップ・キャラクターを複製せず**にブラウザ向けに実装する。画面デザインは **Dark Tactical × Modern Gaming**。完成とは「プレイヤーが実際に移動・照準・射撃・アイテム取得・被弾・回復・勝利／敗北でき、試合再開と戦績保存が動く」こと。ダミーの射撃ボタンやモック勝利演出だけでは完成としない。

### 1.2 確定機能範囲

| ID | 機能 | 詳細 / 合格条件 |
| --- | --- | --- |
| G-01 | 3Dマップ | 192m×192m、建物・遮蔽物・地面・物資地点が存在。移動と遮蔽が機能 |
| G-02 | 一人称操作 | WASD、マウス視点、照準、走行、しゃがみ、ジャンプ、マウスロック |
| G-03 | 武器 | AR / SMG / DMRの3種、2スロット、射撃・弾数・反動・再装填・距離判定 |
| G-04 | 戦闘 | CPU7体、シールド／HP、ヘッドショット、遮蔽、撃破、キルログ |
| G-05 | 生存 | 物資の回収、回復・シールド補充、縮小安全地帯、場外ダメージ |
| G-06 | 試合 | 1人＋CPU7人のソロ戦、最後の生存者が勝利、最大600秒 |
| G-07 | 射撃場 | 静止3＋移動1ターゲット、任意武器、リロード練習、戦績加算なし |
| G-08 | 難易度 | easy/normal/hard、見えていない敵をAIが不正に追跡しない |
| G-09 | UI | ホーム、モード選択、3D戦闘HUD、ポーズ、結果、戦績、設定、ヘルプ |
| G-10 | ローカル保存 | 設定・戦績・中断スナップショット保存、復元と破損時の安全な破棄 |
| G-11 | 演出 | 銃声・被弾・物資取得・勝敗の効果音、HUD反応、軽量アニメーション |
| G-12 | 品質 | 型チェック、ユニットテスト、ブラウザ手動試験、WebGL未対応時案内 |

### 1.3 初版に含めない機能
オンライン通信、チーム対戦、他人とのランキング同期、アカウント、DB、外部API、実課金、スキン購入、ボイスチャット、建築、乗り物、空中降下、キャラクタースキル、リアルな銃器モデル、プレイヤー同士のマッチメイキング、スマホでのタッチ操作による本格プレイ。**スマートフォンではホーム／説明画面は表示するが、試合開始は「PCとマウス操作が必要です」と案内**する。後付け機能を未実装のままメニューに表示してはならない。

### 1.4 技術前提
- TypeScript `strict`、React、Vite、Three.js。ReactはメニューとDOM HUD、Three.jsは3Dシーン・カメラ・マテリアル・レイ判定に限定。Reactの状態更新を60fpsごとに行わない。Three.jsの `PointerLockControls` を一人称視点に使う。Vite公式 `react-ts` テンプレートを起点とする。
- Node.jsはViteの実行要件を満たす版を使用。公式: https://vite.dev/guide/ / Three.js公式: https://threejs.org/docs/pages/PointerLockControls.html
- **追加必須依存を最小化**：`three`・`react`・`react-dom`、開発用`vite`・`typescript`・`vitest`・`@types/three`・React型、必要なReact Viteプラグインのみ。物理／状態／音声に別ライブラリを追加しない。
- サーバー認証・DB不要。初期データはローカル、保存は`localStorage`、3D素材はThree.jsのジオメトリで生成。外部の3Dモデル・有料音源を前提にしない。
- JavaScript有効なデスクトップブラウザ（現行Chrome/Edge/Firefox）をサポート。WebGLコンテキストとPointer Lock APIがない場合はプレイ不可と明示する。

### 1.5 MVP固定値（単位付き）
数値の正本は `data/game-config.json`。ワールド中心(0,0,0)、y=0が地面、水平x/z、プレイヤー初期HP100・シールド50、CPU7体、最大10分、武器スロット2、回復アイテム初期1個、50個の物資出現地点、safe zone中心固定(0,0)。レベル上げ・アンロック要素は本版に含めない。

### 1.6 ユーザーストーリーと操作フロー
1. ホームで `バトル開始` → モード選択で難易度を設定 → マップを読み込み → クリックでマウスロック → 開始。
2. プレイヤーは索敵・移動・射撃・拾得・回復・安全地帯内への移動を行う。HUDは現HP、残弾、残存人数、区域縮小までを表示する。
3. Esc／タブ非表示は即時ポーズ。再開ボタン押下→ユーザー操作でマウスロックを再取得してから動作再開。
4. 最後の1人になると勝利、HP0なら敗北、制限時間到達で引き分け、明示的な試合破棄は中止扱い。
5. 結果画面に順位・撃破数・命中率・生存時間を表示し、一度だけ戦績に計上。再挑戦かホームを選択できる。
6. ホームの `続きから` は有効な未終了スナップショットがある場合にだけ表示。
7. `射撃練習` は練習場開始→静止／移動ターゲットを撃つ→練習終了。実戦成績に影響しない。

### 1.7 優先順
1) プレイ成立、2) 正しい戦闘・AI・生存判定、3) 安全な中断・保存、4) 快適なUI、5) 視覚・音声演出。作業量を理由に1)〜3)を省略して見た目のみ作ってはならない。

## 2. ファイル・ディレクトリ構成

**このパッケージは実装仕様書であり、以下の `src/` はClaude Codeが実際に作成するファイル一覧である。** 事前にアプリが実装済みと誤認しないこと。

```text
DROPZONE/
├── CLAUDE.md                        # 実装ルールと正本優先順位
├── START_PROMPT.md                  # Claude Code初回入力
├── README.md                        # 環境・セットアップ
├── package.json                     # 実装時生成（dev/build/test/typecheck）
├── index.html                       # ルートHTML
├── tsconfig.json                    # strict、noUncheckedIndexedAccess
├── vite.config.ts                   # React/Vite設定
├── docs/
│   ├── FPS_MASTER_SPEC.md           # この6章正本
│   ├── GAME_RULES_AND_AI.md         # 敵AI・武器・ゾーン計算の詳細
│   ├── UI_UX_SPEC.md                # 画面構成・操作・色・HUD
│   ├── IMPLEMENTATION_PLAN.md       # Phase 0～7、報告様式
│   ├── ACCEPTANCE_MATRIX.md         # テストケース（NOT_RUNが初期値）
│   └── DECISIONS.md                 # 仕様競合の記録（実装時に作成）
├── contracts/
│   └── types.ts                     # コピー可能な完全TypeScript型定義
├── data/
│   └── game-config.json             # 固定値の正本
├── design/
│   └── tokens.css                   # CSS変数とダークテーマ
├── src/
│   ├── main.tsx                     # DOMマウント
│   ├── App.tsx                      # 画面ルーティング・ライフサイクル
│   ├── styles/app.css               # HUD/メニュー/設定のスタイル
│   ├── core/
│   │   ├── types.ts                 # contracts/types.tsをコピー/再エクスポート
│   │   ├── config.ts                # JSONのバリデーション/凍結
│   │   ├── rng.ts                   # シード付きPRNG (xorshift32)
│   │   ├── session.ts               # createSession / transitionPhase
│   │   ├── loop.ts                  # 固定60Hzロジック + RAFドライバー
│   │   ├── input.ts                 # 入力収集・Pointer Lockと切離し
│   │   ├── movement.ts              # 移動/ジャンプ/遮蔽衝突
│   │   ├── combat.ts                # 射撃、命中、ダメージ、リロード
│   │   ├── inventory.ts             # 2スロット、拾得・回復
│   │   ├── zone.ts                  # 縮小円、ダメージ
│   │   ├── rules.ts                 # 勝敗、集計、冪等化
│   │   └── ai.ts                    # Bot AI/FSM/視認記憶/遮蔽
│   ├── world/
│   │   ├── arena.ts                 # シードから決定的に地形/遮蔽物生成
│   │   ├── spawn.ts                 # プレイヤー/CPU/物資の重複回避
│   │   └── collision.ts             # AABB, capsule/円柱, 射線判定
│   ├── render/
│   │   ├── GameCanvas.tsx           # Canvasのライフサイクル
│   │   ├── SceneRenderer.ts         # 3Dジオメトリ/シーン、dispose
│   │   ├── PlayerCamera.ts          # PointerLockControls、FOV
│   │   ├── ActorVisuals.ts          # CPU・エフェクトの表示
│   │   └── MinimapRenderer.ts       # UI用2D俯瞰表示
│   ├── services/
│   │   ├── SaveRepository.ts        # schemaV1検証とsafe-parse
│   │   ├── AudioService.ts          # WebAudioとミュート
│   │   └── StatsService.ts          # 重複計上防止、集計
│   ├── ui/
│   │   ├── HomePage.tsx
│   │   ├── ModeSelectPage.tsx
│   │   ├── BattlePage.tsx
│   │   ├── TrainingPage.tsx
│   │   ├── GameHUD.tsx
│   │   ├── PauseOverlay.tsx
│   │   ├── ResultPage.tsx
│   │   ├── StatsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── HelpPage.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── ToastRegion.tsx
│   └── tests/
│       ├── combat.test.ts
│       ├── ai.test.ts
│       ├── collision.test.ts
│       ├── zone.test.ts
│       ├── save.test.ts
│       ├── rules.test.ts
│       ├── inventory.test.ts
│       └── session.test.ts
└── scripts/verify_package.py       # 納品ZIP・仕様書・定数検査
```

- 各コア機能はDOM/Three.jsをimportしない純粋ロジックとして構築する（テスト容易性）。Three.js描画クラスはGameSessionを読み取り、表示のみに影響を限定する。
- React UIは `UIPage` を使用して `App` で切り替える。React Routerなどルーターライブラリは入れない。
- `src/core/types.ts` では契約ファイルと同じ定義を1件だけ保持する。別々の型を二重作成しない。
- コードが増えても `src/core/rules.ts` だけにゲーム全処理を詰め込まない。毎フレームの計算をReactのre-renderに結びつけない。

## 3. データ構造・型定義

### 3.1 型定義正本
`contracts/types.ts` を全文実装へコピーすること。すべてのインターフェース／判別可能なUnion／必須属性が記載される。`any`禁止。`unknown`はparse時の境界値としてのみ許可、ランタイムバリデーション後に型を確定する。

| 型 | 意図 |
| --- | --- |
| `Vec2`/`Vec3`/`Aabb` | ワールド座標と遮蔽物の判定 |
| `GameSession`/`MatchPhase` | セッション・試合状態の唯一の真実 |
| `TrainingState`/`TrainingTargetState` | 射撃場の4ターゲットと命中数（BRとは別） |
| `PlayerState`/`BotState` | HP、シールド、移動、所持武器、死亡、AI記憶 |
| `WeaponDefinition`/`WeaponState`/`InventoryState` | 装填数・予備弾・連射間隔・回復 |
| `LootState`/`ZoneState`/`ArenaLayout` | アイテム、区域縮小、シード生成マップ |
| `PlayerInput`/`HitScanResult`/`GameEvent` | 毎tickの入力・命中・発生イベント |
| `MatchResult`/`LifetimeStats` | 勝敗集計と履歴 |
| `MatchSnapshotV1`/`SaveDataV1`/`SettingsV1` | ローカル保存／復帰と設定 |
| `DomainError`/`Result<T>` | UIへ伝搬する安全な失敗形式 |

### 3.2 固定値・バリデーション
`data/game-config.json` は定数正本。起動時 `validateGameConfig(value: unknown): Result<GameConfig>` を実装し、構造・整数/有限数・範囲・武器IDの一意性・フェーズ継続性・開始/終了・最大10分・半径の非増加・各フェーズのダメージ0以上を検証する。invalidならゲーム開始を無効化しユーザー向けエラー表示（黙って部分使用しない）。「計算上の秒」「保存時のミリ秒」「Unix秒」は混在させない。座標はメートル、角度はThree.js内部でラジアン、設定値は度、経過は秒。

### 3.3 武器初期装備
プレイヤーはARのマガジン30発・予備弾90発、2スロット中もう1つは空。CPUはシードPRNGからAR / SMG / DMRを均等に選び、各武器のマガジン満タン・予備弾は`defaultReserve`。武器を拾う際、空スロットがあればそこへ入れる。2つ埋まっていれば現在装備のスロットだけを交換。交換前武器はマガジン残量と予備弾を保持した武器ピックアップとしてその場所にドロップ（取り戻せる）。装備中と同種の武器は武器拾得を不可とし、「既に所持しています」と表示する。弾薬の予備上限は`maxReserve`。

### 3.4 ローカル保存
- 保存キー：`dropzone-save-v1`、JSON文字列。認証情報・個人識別子・実IPは含めない。
- `SaveDataV1` 初期状態：defaults設定、統計0、`results=[]`、`currentMatch=null`。
- `results` は直近100件（古い結果から削除）。同一`matchId`は1度だけ保存、生涯統計は`LifetimeStats`を累積更新する（直近100件の`results`だけから過去の全結果を再計算しない）。同一`matchId`の二重適用を避けるため、結果追加と統計更新は1回の`SaveDataV1`書き込みで行う。
- `currentMatch` は5秒ごと、明示的ポーズ時、タブ非表示時、画面から離れる直前（可能なとき）に保存。全処理成功の保証がない `beforeunload` だけには依存しない。
- 保存するセッションにReactの関数・DOM/Three.js object・AudioContext・RAF IDを含めない。セッションの`accumulatorSeconds`は再開時0へ戻す。
- ロード後の状態は `phase:'paused'` とし、ユーザーが再開を押してPointer Lockが成立するまで進行しない。`elapsedSeconds` と zone/CPU記憶／弾数／seed/rngStateは維持。
- 古い／未知のスキーマは自動上書きしない。設定・戦績と試合をそれぞれバリデーションし、壊れた試合のみ破棄できる。保存エラー時はセッションを動作させ続け、再試行と手動エクスポート案内を表示。
- 更新は `Result<T>` として返す。`localStorage` 不可でもメモリ上でプレイできるが、画面上部に「保存できません」と常時通知する。

### 3.5 シリアライズと外部ファイル
初版のJSONインポート／エクスポートは範囲外。ブラウザを閉じたときの復元を保証するのは `localStorage` が正常な場合のみ。端末内ランキングは `MatchResult` と同端末の統計から計算し、サーバーの順位を装ってはならない。

## 4. 関数・コンポーネント詳細

### 4.1 起動とセッション

| 関数 | 引数→戻り値 | 処理と副作用 |
| --- | --- | --- |
| `createSession(mode, difficulty, seed)` | `GameMode, Difficulty, number → Result<GameSession>` | seedと定数からマップ／出現／初期武器／CPUを決定。BRはプレイヤー1+CPU7、trainingはCPU0。初期 phase=`ready`。 |
| `transitionPhase(session, next)` | `GameSession, MatchPhase → Result<GameSession>` | `idle→loading→ready→playing↔paused→finished` の正規遷移のみ。errorは終了またはメニュー。finishedからplayingは拒否。 |
| `stepGame(session, input, fixedDt)` | `GameSession, PlayerInput, number → TickResult` | 純粋な1tick更新。移動→物資/回復→照準と射撃→CPU→Zoneダメージ→死亡→勝敗→イベント出力。固定dt=1/60秒。 |
| `runFrame(time)` | `DOMHighResTimeStamp → void` | RAFで前回との差を最大0.05秒へclamp、最大5tick実行、レンダリングを1回。中断中はシミュレーション禁止。 |
| `getHudState(session)` | `GameSession → VisibleHudState` | UIに必要な値を抽出（参照は読み取り専用）。 |
| `completeMatch(session, outcome)` | `GameSession, MatchOutcome → MatchResult` | place、勝敗、命中率用のshot数、時刻を確定。二重呼び出し時は同一結果を返す。 |

**状態遷移正本**：`idle`（UI初期）→`loading`（マップ/Renderer）→`ready`（クリック待ち）→`playing`→`paused`→`playing` または `finished`。`playing` 以外は入力によるゲーム更新停止。`training` の終了は勝敗結果を生成せず、戦績へ加算しない。実装では `training` を結果画面に入れずホームへ戻す。`GameSession.training` はtraining時のみ非null、BR時はnull。

### 4.2 入力とFPS操作

| 操作 | 入力 | 必須処理 |
| --- | --- | --- |
| 移動 | W/A/S/D | forward, strafeを -1〜1、斜め入力は正規化 |
| 視点 | マウス | Pointer Lock移動量を yaw/pitchへ変換。上下±85° |
| 射撃 / ADS | 左クリック / 右長押し | 左は現在武器トリガー、右はFOV75→60・散布抑制 |
| 走る | 左Shift | 接地中速度7m/s、走行中は射撃・ADS・回復禁止 |
| しゃがみ | 左Ctrl/C | 速度2.8m/s、当たり判定高さ1.15m。立ち上がりに天井が当たる時は立たない |
| ジャンプ | Space | 接地時のみ速度5.1m/s上昇、重力9.81m/s² |
| リロード | R | マガジン満タン/予備0/既にreload中は無効。時間終了で弾移動 |
| 取得 | E | 2.2m以内の最も近い使用可能物資を1件取得 |
| 回復 | Q | HP<100、所持>0、行動可能時に開始。2秒完了でHP+35（上限100） |
| 武器 | 1 / 2 | 存在するスロットのみ選択、リロード中は切替可だが旧武器のリロードはキャンセル |
| メニュー | Esc | Pointer Lock解除→ポーズ、Escポーズ中は勝手にゲーム再開しない |
| ミニマップ拡大 | M | DOMオーバーレイを切替、試合時計は進める（入力操作は可能） |

`collectInput(heldKeys: ReadonlySet<string>, mouseDeltas: Vec2, flags: InputFlags): PlayerInput` は毎tickの入力スナップショットを返し、deltaは消費後にリセット。`window.blur`、`visibilitychange:hidden`、`pointerlockchange:unlocked` で heldInputs をクリアし、BRなら `pauseGame` と保存を呼ぶ。Pointer Lock取得失敗時、射撃処理へ進んではならない。

### 4.3 3Dマップ・衝突
- `generateArena(seed:number):ArenaLayout`：x,z∈[-96,96]、シード固定で同一地形、外周境界、通路、8個以上の建物＋12個以上の遮蔽物を配置。建物壁は箱（AABB）とし、内部侵入可能なドアは空隙として構成する。床高さ0、空中床は初版なし。
- Spawnは最も近い別アクターと12m以上、遮蔽物内部でない、開始安全地帯内、カメラが壁にめり込まないよう検証。7ボットと1人に対し無効なら既定の8座標へフォールバック。物資50点もAABBと重ならない座標へ。`seed` とid順で決定して復元時に再生成できる。
- `integrateMovement(actor, input, dt, arena): ActorState`：X軸とZ軸の衝突を個別に解き、壁際でスライド可能とする。地面接地判定と建物の天井判定、世界端でclamp。壁抜け禁止。衝突は「中心＋半径0.35m」の円柱とAABB、縦高さは1.75m/1.15m。
- `hasLineOfSight(start,end,colliders):boolean`：Raycasterと同一衝突AABBで、線分中に遮蔽物があればfalse。表示メッシュの有無に依存しない。
- 3D視覚のマップ・建物・装備はThree.jsプリミティブ中心。現実銃器の精密モデリング不要、敵は低ポリゴンの非実在キャラクター。

### 4.4 武器・ダメージ

| 関数 | 引数→戻り値 | 詳細 |
| --- | --- | --- |
| `attemptFire(session, shooterId, aimRay)` | `GameSession, EntityId, Ray → {state,events}` | phase/play判定、マガジン、fireCooldown、sprint/heal、発射速度、セミ/フルautoを判定し1発消費 |
| `resolveHitscan(ray, shooterId, actors, colliders, maxRange)` | `Ray, id, Actor[], Aabb[],number → HitScanResult` | レイと遮蔽物・各生存アクターの頭部/胴体の最短交差を比較、遮蔽を優先、本人は除外 |
| `applyDamage(target, amount, source)` | `ActorState, number, DamageSource → ActorState` | シールドから先に減算し残りをHPへ。HP0で死亡、負数不可 |
| `beginReload(weapon)` | `WeaponState → Result<WeaponState>` | reserveがあればreloadRemainingSecondsを設定 |
| `tickReload(weapon, dt)` | `WeaponState,number → WeaponState` | 完了時にmin(空マガジン,予備)を移し替える |
| `selectWeapon(inventory, slot)` | `InventoryState,0|1 → Result<InventoryState>` | 存在しない武器スロット選択はエラー |
| `tryPickup(actor, loot, arena)` | `ActorState,LootState,ArenaLayout → Result<{actor,loot}>` | 距離・上限・所持武器に応じて1個取得、無効なら両者変更なし |
| `tryHeal(actor)` | `ActorState → Result<ActorState>` | スプリント/攻撃/再装填/HP満タン/個数を検証、2秒行動を開始 |

- 武器性能と範囲は `game-config.json`。AR / SMGは押しっぱなしの自動射撃、DMRは押下エッジ（離して再押下で次弾）。発射間隔は `1/shotsPerSecond` 秒。残弾が0になっても**自動リロードしない**（HUDでR案内）。
- Rayは射手目の位置から前方へ。乱数はセッション内 `rngState` で再現可能な決定的PRNG。spreadは角度単位でyaw/pitchを独立に `[-spread, spread]` の均一分布で摂動。ADSで設定値へ切替。距離は命中レイ長でmaxRange判定。投射物・重力による弾道落下・貫通はなし。
- headshotは1.5倍、胴体1.0倍。同点距離は遮蔽を優先。ヘッド／胴体形状はボットの高さ上部0.3mを頭領域、残りは胴。ヘッド/胴体両方にレイが当たれば、最短の交差点を採用。
- 命中の際、ダメージは小数も内部扱い可、HUDは整数に丸めて表示。相手死亡時は`eliminationCount++`およびキルログ1件。自傷射撃はなし。撃破者不明（ゾーン）はnull。
- プレイヤーの`combatMetrics.shotsFired`は弾消費時に加算、プレイヤーの`shotsHit`は生存敵にダメージを与えた弾のみ加算、遮蔽命中は加算しない。プレイヤーの`damageDealt`は敵のシールド+HPを減らした実量であり、オーバーキル分を含めない。
- 回復は開始時ではなく完了時にメディキットを1消費する。被弾／射撃／移動操作（移動量>0）／武器切替でキャンセル。回復途中保存→復帰した場合も残り時間を保持。

### 4.5 CPU（状態マシン）
`tickBotAI(bot, sensed, dt, config, rng): {bot:BotState, command:BotCommand, rngState:number}`。
- **感知**：視界42m、角度120°（前方±60°）、障害物LOSが通る時のみ発見。銃声は30m以内、音発生地点を2秒記憶。最後に視認した位置は3秒記憶。現在隠れたプレイヤー位置を直接参照してはならない。
- **行動**：`move-to-zone`（外側にいる）＞`heal`（HP<40かつ安全でメディキットあり）＞`retreat`（HP<30かつ敵視認かつ遮蔽ある）＞`engage`（視認対象あり）＞`seek-loot`（武器補充必要）＞`patrol`。ゾーン外からの生存移動優先。AI決定間隔0.2秒。
- CPU移動は最大5m/s、斜め移動は正規化。障害物に3秒引っかかったら既知の経路点へ再ルートし、それでも不能なら視認しない位置で瞬間移動はしない（別の経路点へ移動）。
- 遮蔽がない対象への弾は発射しない。easy/normal/hardで初見の反応時間600/350/180ms、散布角6/4/2.5°。本体HP・射撃威力・射程は難易度間で固定。CPUの命中率に関わる乱数もシード管理。ショット実行には武器の発射間隔・残弾・リロード制限を遵守。
- 詳細なFSM遷移、優先順位、LOSテストは `GAME_RULES_AND_AI.md` を参照。

### 4.6 安全地帯と勝敗
`computeZone(elapsedSeconds:number):ZoneState` はJSONの9区間で半径を線形補間。`applyZoneDamage` は actor位置と中心の2D距離 `>radius` のときに `damagePerSecond * dt` をHPへ直接適用（シールドを消費しない）。ゾーン外だからと言って即死ではない。ゾーン境界上は安全。`timeToNextZoneSeconds` は現在フェーズ終了-経過。600秒で締切。

`evaluateOutcome(session): MatchOutcome | null`：BRでプレイヤーHP0→defeat（同tickで全員死亡でも敗北優先）、プレイヤー生存かつbots alive0→victory、経過>=600かつ他生存→draw。順位は敗北時に生存人数＋1、勝利時1位、引分時はnull。破棄はabandoned・戦績勝敗にはカウントしない。練習は勝敗集計しない。

### 4.7 UIコンポーネント契約

| 名前 | props / inputs | 挙動・出力 |
| --- | --- | --- |
| `App` | なし | `UIPage`画面切替、SaveRepositoryを初期化、終了時cleanup |
| `HomePage` | `{hasResume,stats,onPlay,onResume,onTraining,onStats,onSettings,onHelp}` | 操作可能なメニュー。resumeは有効な場合のみ |
| `ModeSelectPage` | `{difficulty,onStart,onBack}` | 3難易度の選択、難易度説明、開始時だけロード |
| `GameCanvas` | `{sessionRef,onLockChange,onWebGLError}` | Canvas生成/解放、Three.js更新、PointerLock時イベント接続 |
| `GameHUD` | `{hud:VisibleHudState,events:readonly GameEvent[],onPause}` | 生存人数、HP/盾、武器/弾数、安全地帯、キルログ、ミニマップ、縮小警告 |
| `PauseOverlay` | `{onResume,onQuit,onSettings}` | マウスロック解除。resumeはユーザーの明示クリックのみ |
| `ResultPage` | `{result,onRematch,onHome}` | 勝敗、順位、時間、ダメージ、命中率 |
| `StatsPage` | `{stats,results,onBack}` | 総戦績と端末内ベスト記録、0件時は空状態 |
| `SettingsPage` | `{settings,onChange,onReset,onBack}` | 感度、グラフィックス、音量、効果音、色補助、動作軽減 |
| `HelpPage` | `{onBack}` | 操作表、ルール、非対応機能、保存仕様 |
| `ErrorBoundary` | React children | JS描画クラッシュの代替画面、リロード/戻る導線 |

注：props型は実装時に明示的に定義。イベントハンドラの引数、戻り値、エラー挙動まで型で固定。説明用UIのみで実際にクリックできないものを実装しない。

### 4.8 保存・ランキング・オーディオ
- `SaveRepository.load():Result<SaveDataV1>`：`JSON.parse`→`unknown`→逐次検証、失敗時は安全な初期値に戻すが元の不正データは即上書きしない。ユーザーへ「保存データを読み込めません。新規開始または破棄」を表示。
- `SaveRepository.save(value:SaveDataV1):Result<void>`：ストレージ容量不足/無効化を捕捉して返す。戦績とスナップショットは1キー内の1回のsetItemで書き込む。
- `StatsService.record(result):Result<LifetimeStats>`：`matchId`重複判定。BRのvictory/defeat/drawのみ`matches`へ、abandonedとtrainingは除外。`wins/losses/draws`を矛盾なく集計。勝率は wins/matches*100。順位・撃破・命中率の端末内自己記録を表示する（全国順位とは呼ばない）。
- `AudioService.play(cue:AudioCue):void`：ユーザー操作でWebAudioをresume、できなければ無音プレイを継続。音量0/無効時は再生不可。短い原音をWebAudioで合成し、音量上限を厳守。音源ファイルを外部取得しない。
- 3D負荷軽減：影OFF（low）、ジオメトリ共有、描画内のオブジェクト生成を抑制、deltaベースで描画、画面解像度に応じたpixelRatio制限（low1/medium1.5/high2）。60fpsを目標とするが機器により保証しない。UIアニメーションは`prefers-reduced-motion`優先。

## 5. エラーハンドリング・例外処理

| コード | 発生条件 | 表示とフォールバック |
| --- | --- | --- |
| `UNSUPPORTED_WEBGL` | WebGLコンテキスト生成不可 | 「このブラウザでは3D描画を利用できません。対応ブラウザでお試しください。」試合開始無効、設定/ヘルプは可 |
| `POINTER_LOCK_DENIED` | ロック拒否、Escで解除 | 「クリックして照準操作を開始してください。」paused維持、明示クリックでのみ再試行 |
| `SAVE_CORRUPTED` | 不正JSON/欠損属性/非有限数 | 「保存データを読み込めません。破棄するか新しいゲームを始めてください。」復元不能な試合のみクリア可 |
| `SAVE_QUOTA` | localStorage無効/容量不足 | 「保存できません。この試合は終了後に失われる可能性があります。」メモリ上で継続 |
| `UNSUPPORTED_SCHEMA` | 未知のversion | 過去データを勝手に解釈・上書きしない。非対応バージョン表示、消去は確認必須 |
| `INVALID_INPUT` | 難易度・感度・設定の不正値 | 項目のエラーと許容範囲を明示、変更を適用しない |
| `INVALID_ACTION` | 不正距離、無弾、不可回復等 | シミュレーションを更新せず、必要な場合だけ短いHUD通知 |
| `SESSION_NOT_FOUND` | 不正な再開操作 | `続きから`を非表示にし、新規開始へ誘導 |
| `MATCH_ALREADY_FINISHED` | 重複クリック/イベント | 結果・統計を二重追加しない |
| `AUDIO_UNAVAILABLE` | WebAudioが拒否/非対応 | 音なしでプレイ、設定に「音声を利用できません」 |
| `UNKNOWN` | 予期しないランタイム例外 | ログへ技術情報（個人情報なし）、画面には簡潔な再起動/ホーム導線 |

- `requestAnimationFrame`停止・再開時は積み残しdeltaをクリア。隠れたタブのCPU/区域を進めない。焦点喪失時に発射ボタン保持のまま再開しない。
- WebGLコンテキスト喪失時は即ポーズ→保存→復元処理。復元不可なら警告し、プレイヤーが選択するまで現在試合を破棄しない。
- エラーBoundaryはReact描画エラーを捕捉するが、メインゲームループ内は独立したtry/catchで回復処理へ伝搬。無限リトライは禁止。
- CPUの経路計算失敗でNaN座標を保存しない。有限数チェックし、移動だけ停止して再探索、連続不正ならCPUを非戦闘状態にして試合進行を阻害しない。敵が突然ワープしてはならない。
- localStorageには競合更新の可能性がある。同一タブでは単一writer、複数タブで同時に試合開始した際はBroadcastChannel（対応環境のみ）で警告。外部同期は行わず、先着1セッションを推奨。未対応ブラウザでは再開時に保存日時の差を表示。
- 右クリックメニューは戦闘Canvas上のみ抑制。フォーム操作中はブラウザ操作を邪魔しない。画面外クリックで不必要な射撃はしない。

## 6. 特記事項・制約

### 6.1 実装上の禁止事項
- Apex Legends/フォートナイト/PUBGの名称・キャラクター・UI画像・BGM・マップ・ロゴをそのままコピーしない。オリジナルの低ポリゴンSFアリーナとする。
- 外部課金API、Google OAuth、Firebase、Supabase、Prisma、外部DB、サーバーランキングを追加しない。
- 完成していないオンラインマッチをプレイ可能と表示しない。課金・広告等も追加しない。
- Three.jsレンダリング/当たり判定の都合で純粋なゲームロジックを切り捨てない。障害物を見た目だけにせず必ず遮蔽・衝突処理へ反映。
- ゲームやスコアが実際に動かないのに完成と報告しない。
- 勝敗・全滅・保存の数値を推測で処理しない。全型を使用し、`any`・`@ts-ignore`による問題隠し禁止。

### 6.2 操作性・アクセシビリティ
- メニューとポーズUIはマウス/Tab/Enterで操作可、focus-visible明示、フォーム要素に日本語ラベル。HUDはコントラスト不足にしない。
- `prefers-reduced-motion`で画面揺れ・UI遷移を減らす。画面フラッシュは短時間・明度を抑える。効果音は初期ONだが設定で即OFF可。
- マウスロックはユーザーの開始操作でのみ取得。ポーズメニューとゲーム結果では必ず解除。カメラの極端な上下回転や入力の過敏さは制限。
- スマホは説明・設定・戦績の閲覧のみ。viewport<768px またはtouch-only入力では「PC＋マウスでのプレイ推奨」の表示、試合開始不可とする（Hybrid PCはポインター利用時のみ許可）。

### 6.3 セキュリティ・プライバシー
- ユーザー名／メール／認証を収集しない。localStorageデータに通信トークン・秘密情報を入れない。
- 受信JSONは必ずvalidate。DOMへユーザーデータを `innerHTML` で直接挿入しない。Reactテキスト表示を使う。
- ライブラリのバージョンは導入時にnpm registryと公式ドキュメントで確認し、`package-lock.json`をコミットする。バージョンを思い込みで固定しない。

### 6.4 必須受け入れ条件
- `docs/ACCEPTANCE_MATRIX.md` のすべての MUST テストが PASS。SKIPの場合は理由、影響、次の検証手順を明記し「完全完成」とは言わない。
- `npm run typecheck` / `npm test` / `npm run build` が成功したログを記録する（実行環境がない場合は未実施と正確に報告）。
- Chrome/Edgeでホーム→訓練→BR→ゲームオーバー→戦績更新→中断復帰の一連操作を検証。実端末テスト結果がなければ未確認。
- セッション保存に機密情報を含まず、試合中断/再開後にHP、残弾、敵数、ゾーン時間、AI記憶が変わらない。
- bot7体がゲームをプレイし、遮蔽越しにプレイヤーを追尾・攻撃しないことを検証。

### 6.5 実装フェーズ
`docs/IMPLEMENTATION_PLAN.md` に従う。Phase 0：基盤確認 → 1：3D/操作 → 2：射撃場 → 3：武器/ダメージ/インベントリ → 4：AI/ゾーン → 5：UI/保存 → 6：演出/最適化 → 7：試験・納品。各フェーズで `npm run typecheck` ほか必要なテストを実施。

### 6.6 納品物
最終的に動くフルソース（`npm install && npm run dev`）、`README.md`、テスト結果、実装/未実装の明細を提出する。ユーザーへ複数ファイルを渡す場合は**1回で取得できるZIP**を最優先する。原本の仕様書もZIPに同梱する。
