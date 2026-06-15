// 餘弦相似度與測試資料的離線測試。不需 OPENAI_API_KEY：npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { cosineSimilarity } from "../lib/similarity.js";
import { SENTENCE_GROUPS } from "../data/sentence-groups.js";

test("相同向量相似度為 1", () => {
  assert.equal(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1);
});

test("正交向量相似度為 0", () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test("方向相反相似度為 -1", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 1], [-1, -1]) - -1) < 1e-12);
});

test("與長度成比例的向量仍相似度為 1（只看方向）", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 2, 3], [2, 4, 6]) - 1) < 1e-12);
});

test("維度不一致會丟出錯誤", () => {
  assert.throws(() => cosineSimilarity([1, 2], [1, 2, 3]));
});

test("共有 3 組，每組 3 句", () => {
  assert.equal(SENTENCE_GROUPS.length, 3);
  for (const group of SENTENCE_GROUPS) {
    assert.equal(group.sentences.length, 3);
    assert.ok(group.name);
  }
});
