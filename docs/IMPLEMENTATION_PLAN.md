# DROPZONE — Claude Code 実装計画と品質ゲート

## 最初に実行すること
1. `CLAUDE.md`、`docs/FPS_MASTER_SPEC.md`、`docs/GAME_RULES_AND_AI.md`、`docs/UI_UX_SPEC.md`、`contracts/types.ts`、`data/game-config.json`、`docs/ACCEPTANCE_MATRIX.md`を全文読む。
2. `python3 scripts/verify_package.py` で支給ファイルを検査。
3. ワークツリーの既存状態を確認。新規なら `npm create vite@latest . -- --template react-ts --no-interactive` を基点として生成。存在するコードがあれば無断上書きしない。
4. 必須/任意を分けてTODO化する。GitリポジトリならPhaseごとに小さくコミット可能な変更単位にする。
5. `data/game-config.json`がvalidか確認してからコードを使う。変更が必要なら `docs/DECISIONS.md` に記録。

## Phase 0: プロジェクト基盤
- React/TS/Vite/Three.js, Vitest のみでセットアップ。`npm run dev/build/typecheck/test` をpackage.jsonで定義。
- 型定義コピー、JSON read/validation、テスト用RNG。`npm run typecheck` PASSが必須。
- 完了条件：起動するとホームの骨組みが表示され、テストが実行可能。

## Phase 1: 3D・移動・Pointer Lock
- Canvas / カメラ / マップ障害物 / 視点 / WASD / 走行 / しゃがみ / ジャンプ / 衝突 / ミニマップを実装。
- 完了条件：障害物をすり抜けず、Escで操作が停止する。

## Phase 2: 訓練場
- 3静止＋1移動ターゲット、3武器を切替、射撃・着弾、命中数カウント。
- 完了条件：動くターゲットが撃てる、訓練がBR戦績を変更しない。

## Phase 3: 武器・物資・回復
- WeaponStateのFSM、Hitscan, HP/Shield、残弾/再装填、アイテム拾得、HUD。
- 完了条件：武器3種の全値がJSON一致、遮蔽物への射撃が敵に当たらない。

## Phase 4: CPU・安全地帯・試合結果
- CPU7体、LOS、記憶、FSM、難易度、弾数、遮蔽、経路・ゾーン/縮小/勝敗。
- 完了条件：最後の1人決定、ゾーン外ダメージ、壁越しの照準不可。

## Phase 5: 保存・UI・戦績
- メニュー、結果、設定、戦績、resume、保存/復元、安全なJSON検証、セッション失効。
- 完了条件：ポーズ保存→再読み込み→同じ時間/武器/敵/zoneで復帰し試合が続行。

## Phase 6: 音・アニメーション・負荷
- WebAudio / 音量 / 演出 / reduced-motion / low〜high描画。コンテキストロスト。
- 完了条件：音量OFF・低負荷でもプレイ成立、重複RAF/イベントなし。

## Phase 7: 受け入れテスト・納品
- `npm run typecheck && npm test && npm run build` 実行、失敗したら修正。
- `ACCEPTANCE_MATRIX.md`のテストを順次PASS/FAIL/SKIPに変更。実画面で未試行のものは `NOT_RUN`を維持。
- 開発者が勝手にテストをPASSにしたことにしない。ブラウザ自動操作ツールが利用できない場合、手動確認手順を残す。
- ZIPでフルソースと仕様書を納品する。機密情報を同梱しない。package-lock.jsonも収録、node_modulesは除外。

## 必須の最終報告フォーマット
```text
実装：完了/一部完了/未完了
作成・変更ファイル：<パス>
起動：npm install → npm run dev
typecheck：実行結果 / 未実施
unit tests：件数とPASS/FAIL / 未実施
build：実行結果 / 未実施
受け入れ：PASS xx / FAIL yy / SKIP zz / NOT_RUN nn
未実装：<項目と理由>
既知の制限：<項目と影響>
```
