import { z } from "zod";
import { defineTool } from "../utils/func-tool.js";

// 單位別名 → 標準代號。容錯：接受中文、英文、縮寫、大小寫。
const UNIT_ALIASES = {
  // 溫度
  攝氏: "C", 攝氏度: "C", celsius: "C", c: "C", "°c": "C",
  華氏: "F", 華氏度: "F", fahrenheit: "F", f: "F", "°f": "F",
  // 距離
  公里: "km", 千米: "km", km: "km", kilometer: "km", kilometers: "km",
  英里: "mile", 哩: "mile", mile: "mile", miles: "mile", mi: "mile",
  // 重量
  公斤: "kg", 千克: "kg", kg: "kg", kilogram: "kg", kilograms: "kg",
  磅: "lb", lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
};

// 標準代號 → 所屬類別。只有同類別的單位才能互換。
const CATEGORY = {
  C: "temperature", F: "temperature",
  km: "distance", mile: "distance",
  kg: "weight", lb: "weight",
};

// 距離／重量以「比值」換算（題目給定的換算常數）。
const KM_PER_MILE = 0.621371; // 1 km = 0.621371 mile
const LB_PER_KG = 2.20462; // 1 kg = 2.20462 lb

function normalizeUnit(unit) {
  if (typeof unit !== "string") return null;
  const key = unit.trim().toLowerCase();
  return UNIT_ALIASES[key] ?? UNIT_ALIASES[unit.trim()] ?? null;
}

function round(n) {
  // 保留至多 4 位小數，去掉多餘的尾數。
  return Number(n.toFixed(4));
}

// 各類別的換算邏輯（本地計算，可重現）。
function convert(value, from, to) {
  if (from === to) return value;

  switch (CATEGORY[from]) {
    case "temperature":
      // °F = °C × 9/5 + 32
      return from === "C" ? (value * 9) / 5 + 32 : ((value - 32) * 5) / 9;
    case "distance":
      // 1 km = 0.621371 mile
      return from === "km" ? value * KM_PER_MILE : value / KM_PER_MILE;
    case "weight":
      // 1 kg = 2.20462 lb
      return from === "kg" ? value * LB_PER_KG : value / LB_PER_KG;
    default:
      return null;
  }
}

function convertUnit({ value, from_unit, to_unit }) {
  const from = normalizeUnit(from_unit);
  const to = normalizeUnit(to_unit);

  if (!from) return { error: `不支援的單位：${from_unit}` };
  if (!to) return { error: `不支援的單位：${to_unit}` };
  if (CATEGORY[from] !== CATEGORY[to]) {
    return {
      error: `無法換算：${from_unit}（${CATEGORY[from]}）與 ${to_unit}（${CATEGORY[to]}）不是同一類別`,
    };
  }

  const result = round(convert(value, from, to));
  return {
    value,
    from_unit: from,
    to_unit: to,
    category: CATEGORY[from],
    result,
  };
}

export const convertUnitTool = defineTool({
  name: "convert_unit",
  description:
    "進行單位換算，支援攝氏↔華氏、公里↔英里、公斤↔磅三類的雙向換算。",
  fn: convertUnit,
  parameters: z.object({
    value: z.number().describe("要換算的數值，例如 25"),
    from_unit: z
      .string()
      .describe("原始單位，例如 攝氏、公里、公斤（也接受 C/km/kg）"),
    to_unit: z
      .string()
      .describe("目標單位，例如 華氏、英里、磅（也接受 F/mile/lb）"),
  }),
});

// 匯出純函式以利測試。
export { convertUnit };
