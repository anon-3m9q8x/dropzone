import { it, expect, vi, afterEach } from "vitest";
import { addRecord, readRecords } from "../src/core/records";
afterEach(() => vi.unstubAllGlobals());
it("records one result per match and preserves corrupt data", () => {
  let raw: string | null = null;
  vi.stubGlobal("localStorage", {
    getItem: () => raw,
    setItem: (_k: string, v: string) => {
      raw = v;
    },
  });
  const record = {
    id: "match-1",
    mode: "br" as const,
    outcome: "victory",
    kills: 2,
    place: 1,
    seconds: 90,
    at: "2026-11-04T00:00:00Z",
  };
  expect(addRecord(record)).toBe(true);
  expect(addRecord(record)).toBe(true);
  expect(readRecords()).toHaveLength(1);
  raw = "corrupt";
  expect(addRecord(record)).toBe(false);
  expect(raw).toBe("corrupt");
});
