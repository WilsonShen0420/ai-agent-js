// 星座配對契合度演算法
// 以「四象元素關係」為主、「占星相位（角度距離）」為輔，
// 計算兩個星座的契合度百分比。同樣輸入永遠得到同樣結果。

import { getZodiacByName, ELEMENT_LABELS, ZODIACS } from "./zodiac.js";

// 四象元素之間的基礎契合度（占星傳統：火風相生、土水相生，水火相剋）。
// key 以兩元素字母排序後組合，確保 a×b 與 b×a 一致。
const ELEMENT_BASE = {
  "fire|fire": { score: 82, relation: "同為火象，熱情共鳴" },
  "earth|earth": { score: 82, relation: "同為土象，務實安穩" },
  "air|air": { score: 82, relation: "同為風象，心靈契合" },
  "water|water": { score: 82, relation: "同為水象，情感交融" },
  "air|fire": { score: 88, relation: "風助火勢，彼此點燃" },
  "earth|water": { score: 86, relation: "水潤土壤，互相滋養" },
  "earth|fire": { score: 64, relation: "火土各執，需要磨合" },
  "fire|water": { score: 56, relation: "水火相沖，最需包容" },
  "air|water": { score: 62, relation: "風水各異，節奏不同" },
  "air|earth": { score: 66, relation: "風土殊途，慢慢理解" },
};

// 占星相位調整：依兩星座在黃道上的「角度距離」微調分數。
// 距離以「相隔幾個星座」計（0~6），對應傳統相位。
const ASPECT_ADJUST = {
  0: { adj: -4, name: "合相（同星座，太相似）" },
  1: { adj: -2, name: "相鄰（半六分相）" },
  2: { adj: 6, name: "六分相（友好）" },
  3: { adj: -6, name: "四分相（張力）" },
  4: { adj: 8, name: "三分相（最和諧）" },
  5: { adj: -2, name: "梅花相（微妙）" },
  6: { adj: 3, name: "對分相（互補）" },
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * 計算兩個星座的契合度。
 * @param {string} nameA 星座名（可給「天蠍」或「天蠍座」）
 * @param {string} nameB 星座名
 * @returns {{
 *   zodiacA: string, zodiacB: string,
 *   score: number, elementA: string, elementB: string,
 *   elementRelation: string, aspect: string
 * }}
 */
export function calcCompatibility(nameA, nameB) {
  const a = getZodiacByName(nameA);
  const b = getZodiacByName(nameB);
  if (!a) throw new Error(`無法辨識星座：${nameA}`);
  if (!b) throw new Error(`無法辨識星座：${nameB}`);

  const elemKey = [a.element, b.element].sort().join("|");
  const base = ELEMENT_BASE[elemKey];

  // 角度距離：黃道上相隔幾個星座（取最短，0~6）。
  const raw = Math.abs(a.index - b.index);
  const distance = Math.min(raw, ZODIACS.length - raw);
  const aspect = ASPECT_ADJUST[distance];

  const score = clamp(base.score + aspect.adj, 40, 99);

  return {
    zodiacA: a.name,
    zodiacB: b.name,
    score,
    elementA: ELEMENT_LABELS[a.element],
    elementB: ELEMENT_LABELS[b.element],
    elementRelation: base.relation,
    aspect: aspect.name,
  };
}
