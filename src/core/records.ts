export interface BattleRecord {
  id: string;
  mode: "cpu" | "br";
  outcome: string;
  kills: number;
  place: number | null;
  seconds: number;
  at: string;
}
const KEY = "dropzone-battle-records-v1";
export function readRecords(): BattleRecord[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (
      !Array.isArray(data) ||
      !data.every(
        (r) =>
          r &&
          typeof r.id === "string" &&
          ["cpu", "br"].includes(r.mode) &&
          ["victory", "defeat", "draw"].includes(r.outcome) &&
          Number.isFinite(r.kills) &&
          Number.isFinite(r.seconds) &&
          typeof r.at === "string",
      )
    )
      return [];
    return data.slice(0, 50);
  } catch {
    return [];
  }
}
export function addRecord(record: BattleRecord) {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const value = JSON.parse(raw);
      if (
        !Array.isArray(value) ||
        (value.length > 0 && readRecords().length === 0)
      )
        return false;
    }
    const records = readRecords();
    if (!records.some((r) => r.id === record.id))
      localStorage.setItem(
        KEY,
        JSON.stringify([record, ...records].slice(0, 50)),
      );
    return true;
  } catch {
    return false;
  }
}
