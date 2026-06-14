// 知識庫資料與組字邏輯測試。不需要 OPENAI_API_KEY / Qdrant，可離線執行：npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { entryToText } from "../lib/landmark-text.js";

const items = JSON.parse(await readFile("data/landmarks.json", "utf8"));

test("知識庫至少 5 筆資料", () => {
  assert.ok(items.length >= 5, `目前只有 ${items.length} 筆`);
});

test("每筆資料欄位完整", () => {
  for (const item of items) {
    for (const field of ["id", "name", "region", "category", "features", "description"]) {
      assert.ok(item[field], `${item.name ?? "(未命名)"} 缺少欄位：${field}`);
    }
  }
});

test("id 不重複", () => {
  const ids = items.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("entryToText 串接所有重要欄位", () => {
  const text = entryToText(items[0]);
  assert.ok(text.includes(items[0].name));
  assert.ok(text.includes(items[0].region));
  assert.ok(text.includes(items[0].description));
  assert.ok(text.includes(" | "));
});
