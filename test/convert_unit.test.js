// 單位換算邏輯測試。不需要 OPENAI_API_KEY，可離線執行：npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { convertUnit } from "../tools/convert_unit.js";

test("攝氏 ↔ 華氏 雙向", () => {
  assert.equal(convertUnit({ value: 25, from_unit: "攝氏", to_unit: "華氏" }).result, 77);
  assert.equal(convertUnit({ value: 100, from_unit: "C", to_unit: "F" }).result, 212);
  assert.equal(convertUnit({ value: 32, from_unit: "華氏", to_unit: "攝氏" }).result, 0);
});

test("公里 ↔ 英里 雙向", () => {
  assert.equal(convertUnit({ value: 10, from_unit: "公里", to_unit: "英里" }).result, 6.2137);
  assert.equal(
    convertUnit({ value: 6.2137, from_unit: "mile", to_unit: "km" }).result,
    10, // 往返四捨五入後回到 10
  );
});

test("公斤 ↔ 磅 雙向", () => {
  assert.equal(convertUnit({ value: 70, from_unit: "公斤", to_unit: "磅" }).result, 154.3234);
  assert.equal(convertUnit({ value: 2.20462, from_unit: "lb", to_unit: "kg" }).result, 1);
});

test("回傳物件包含類別與標準單位代號", () => {
  const r = convertUnit({ value: 25, from_unit: "攝氏", to_unit: "華氏" });
  assert.equal(r.category, "temperature");
  assert.equal(r.from_unit, "C");
  assert.equal(r.to_unit, "F");
});

test("單位容錯：大小寫、縮寫、中文皆可", () => {
  assert.equal(convertUnit({ value: 1, from_unit: "KG", to_unit: "LB" }).result, 2.2046);
  assert.equal(convertUnit({ value: 1, from_unit: "千米", to_unit: "哩" }).category, "distance");
});

test("不支援的單位回傳錯誤物件", () => {
  const r = convertUnit({ value: 1, from_unit: "光年", to_unit: "公里" });
  assert.ok(r.error);
  assert.equal(r.result, undefined);
});

test("跨類別換算回傳錯誤物件", () => {
  const r = convertUnit({ value: 1, from_unit: "公斤", to_unit: "公里" });
  assert.ok(r.error);
});
