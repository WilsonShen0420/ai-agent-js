// 本地邏輯測試：星座推算與配對演算法。
// 不需要 OPENAI_API_KEY，可離線執行：npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { getZodiacByDate, getZodiacByName } from "../lib/zodiac.js";
import { calcCompatibility } from "../lib/compatibility.js";

test("生日推算星座：邊界與一般日期", () => {
  assert.equal(getZodiacByDate(3, 21).name, "牡羊座"); // 區間起點
  assert.equal(getZodiacByDate(4, 19).name, "牡羊座"); // 區間終點
  assert.equal(getZodiacByDate(4, 20).name, "金牛座"); // 下一個起點
  assert.equal(getZodiacByDate(10, 24).name, "天蠍座");
  assert.equal(getZodiacByDate(6, 14).name, "雙子座");
});

test("生日推算星座：跨年的摩羯座", () => {
  assert.equal(getZodiacByDate(12, 22).name, "摩羯座");
  assert.equal(getZodiacByDate(1, 19).name, "摩羯座");
  assert.equal(getZodiacByDate(1, 20).name, "水瓶座");
});

test("非法日期會丟出錯誤", () => {
  assert.throws(() => getZodiacByDate(13, 1));
  assert.throws(() => getZodiacByDate(2, 40));
});

test("名稱查詢容錯：可省略「座」字", () => {
  assert.equal(getZodiacByName("天蠍").name, "天蠍座");
  assert.equal(getZodiacByName("天蠍座").name, "天蠍座");
  assert.equal(getZodiacByName("不存在"), null);
});

test("配對演算法：對稱、可重現、範圍合理", () => {
  const ab = calcCompatibility("牡羊座", "獅子座");
  const ba = calcCompatibility("獅子座", "牡羊座");
  assert.equal(ab.score, ba.score); // 對稱
  assert.ok(ab.score >= 40 && ab.score <= 99); // 範圍

  // 同樣輸入永遠同樣結果（可重現）
  assert.equal(calcCompatibility("天蠍座", "巨蟹座").score, calcCompatibility("天蠍座", "巨蟹座").score);
});

test("配對演算法：水火相沖分數低於同象", () => {
  const clash = calcCompatibility("牡羊座", "巨蟹座"); // 火 × 水
  const harmony = calcCompatibility("牡羊座", "獅子座"); // 火 × 火（三分相）
  assert.ok(clash.score < harmony.score);
});

test("配對演算法：辨識不到星座會丟錯", () => {
  assert.throws(() => calcCompatibility("天蠍座", "火星座"));
});
