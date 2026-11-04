# DROPZONE: LAST SIGNAL — Step 1

添付仕様をもとに作成した、ブラウザーで遊べる3D FPSの射撃練習版です。
React / TypeScript / Vite / Three.js。アカウント・APIキー・外部アセット不要。

## 起動

Node.js 22.12以上（Node 24で検証）を使用します。

```sh
cd /workspace/dropzone
npm ci
npm run dev
```

表示されたローカルURLを、PCのChrome / Edge等で開いてください。PC・マウス・キーボード・WebGL・Pointer Lockが必要です。幅900px未満またはタッチ主体の端末では、メニュー・設定・ガイドのみ利用できます。

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`dist/` が静的な完成物です。相対パスのため、GitHub Pagesのリポジトリ配下に配置できます。Step 2でローカルGitリポジトリ（main）を初期化し、初回コミットを作成しました。Push・公開はまだ行っていません。

## 構成

```text
index.html                 HTMLエントリー
src/
  main.tsx                 React起動
  style.css                レスポンシブなDark Tactical UI
  ui/App.tsx               ホーム・設定・ヘルプ・練習HUD
  render/Range.ts          Three.js・入力・固定tick・音・破棄処理
  core/
    config.ts              定数の検証
    types.ts               型の公開・練習状態
    training.ts            移動・射撃・再装填・ターゲット
    collision.ts           プレイヤー衝突・射線判定
    storage.ts             設定保存・既存データ保護
contracts/types.ts         添付の全体仕様の型（未実装分も含む）
data/game-config.json      添付の定数（未実装分も含む）
design/tokens.css          添付の配色トークン
docs/                      添付仕様・今回の検証記録・画面画像
tests/core.test.ts         ゲーム処理・保存の単体テスト
tests/browser.py           実ブラウザー検証
```

## この版で遊べること

- 40×50mの3D練習場。静止ターゲット3体・往復移動ターゲット1体。
- WASD移動、マウス照準、ジャンプ、しゃがみ、ダッシュ、ADS。
- 左クリック射撃、R再装填、1/2/3でAR・SMG・DMR切り替え。DMRはクリックごとのセミオート。
- 武器ごとの連射間隔・マガジン・再装填時間・射程・照準拡散。遮蔽物が射線を遮断。
- 予備弾薬は「練習用無制限」。マガジンは有限。切り替えても残弾数を維持。
- 発射数・命中数・命中率・残弾・経過時間を表示。練習は戦績へ保存しない。
- Esc / マウス解放 / タブ非表示 / フォーカス解除で停止。再開ボタン＋マウスロック成功後に再開。
- 感度・音量・効果音・描画解像度・UI倍率・FPS・発光抑制・高コントラスト設定。
- 設定を `dropzone-save-v1` に保存。破損・将来形式・既存試合データは上書きしない。
- 発射・命中時の簡易合成音。WebGL非対応時の案内。モバイル用メニュー表示。

## 次段階の範囲（未実装）

CPU7体とのバトルロイヤル、安全地帯縮小、物資・回復・被ダメージ・勝敗、試合スナップショット保存・再開、戦績集計、完全な武器反動・被弾演出・全効果音。これらは画面や型・定数が存在しても動作実装済みではありません。練習中のHP/シールドは固定です。

`docs/ACCEPTANCE_MATRIX.md` は添付の全体受け入れ基準です。全体仕様の合格を意味しません。今回確認した範囲は `docs/STEP1_VERIFICATION.md` を参照してください。

## 補足

静的サイトです。認証・パスワード保護はありません。外部公開・GitHub設定はStep 3/4で対応します。公開前のURLは発行していません。

描画品質は解像度を変更します。アンチエイリアスは練習場を起動した時の品質で決まります。効果音はブラウザーの音声機能が使用可能な場合に再生します。自動ブラウザーテストでは音の聞こえ方までは確認していません。

ブラウザーテストはPython PlaywrightとChromiumがある開発環境で、`npm run dev -- --port 3500` 起動後、`python3 tests/browser.py` を実行します。`DROPZONE_BASE_URL` で本番ビルドのプレビュー先も指定できます。通常利用にPythonは不要です。
