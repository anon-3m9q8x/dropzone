import type { SettingsV1, SaveDataV1 } from "./types";
export const SAVE_KEY = "dropzone-save-v1";
export const defaults: SettingsV1 = {
  schemaVersion: 1,
  sensitivity: 1,
  masterVolume: 0.7,
  sfxEnabled: true,
  reducedMotion: false,
  showFps: false,
  uiScale: 1,
  graphicsQuality: "medium",
  colorAssistMode: false,
};
export function validSettings(v: unknown): v is SettingsV1 {
  if (!v || typeof v !== "object") return false;
  const s = v as SettingsV1;
  return (
    s.schemaVersion === 1 &&
    Number.isFinite(s.sensitivity) &&
    s.sensitivity >= 0.1 &&
    s.sensitivity <= 3 &&
    Number.isFinite(s.masterVolume) &&
    s.masterVolume >= 0 &&
    s.masterVolume <= 1 &&
    Number.isFinite(s.uiScale) &&
    s.uiScale >= 0.8 &&
    s.uiScale <= 1.4 &&
    ["low", "medium", "high"].includes(s.graphicsQuality) &&
    ["sfxEnabled", "reducedMotion", "showFps", "colorAssistMode"].every(
      (k) => typeof (s as unknown as Record<string, unknown>)[k] === "boolean",
    )
  );
}
export function emptySave(): SaveDataV1 {
  return {
    schemaVersion: 1,
    updatedAtIso: new Date().toISOString(),
    settings: { ...defaults },
    stats: {
      matches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      totalEliminations: 0,
      totalDamage: 0,
      totalShots: 0,
      totalHits: 0,
      totalPlaySeconds: 0,
      bestPlacement: null,
    },
    results: [],
    currentMatch: null,
  };
}
export function readSave(storage: Pick<Storage, "getItem">): {
  data: SaveDataV1;
  protected: boolean;
  message: string;
} {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return { data: emptySave(), protected: false, message: "" };
    const d = JSON.parse(raw) as SaveDataV1;
    const zero = emptySave();
    if (
      d.schemaVersion !== 1 ||
      !validSettings(d.settings) ||
      !d.stats ||
      !Array.isArray(d.results) ||
      d.results.length > 0 ||
      d.currentMatch !== null ||
      Object.keys(zero.stats).some(
        (k) =>
          d.stats[k as keyof typeof d.stats] !==
          zero.stats[k as keyof typeof zero.stats],
      )
    )
      return {
        data: zero,
        protected: true,
        message:
          "既存データはこの練習版で扱えないため保護しました。設定は今回のみ反映します。",
      };
    return { data: d, protected: false, message: "" };
  } catch {
    return {
      data: emptySave(),
      protected: true,
      message:
        "保存データを読み込めません。元のデータを保護し、設定は今回のみ反映します。",
    };
  }
}
export function writeSettings(
  storage: Pick<Storage, "setItem">,
  data: SaveDataV1,
  settings: SettingsV1,
  protect: boolean,
): string {
  if (protect) return "既存データを保護中：設定は今回のみ反映します。";
  if (!validSettings(settings)) return "設定の値を確認してください。";
  try {
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({
        ...data,
        settings,
        updatedAtIso: new Date().toISOString(),
      }),
    );
    return "このブラウザーに設定を保存しました。";
  } catch {
    return "保存できませんでした。設定は今回のみ反映します。";
  }
}
