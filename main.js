// 向量相似度實驗：把每組句子做 embedding，計算組內兩兩的餘弦相似度並輸出。
import { embedBatch } from "./lib/embeddings.js";
import { cosineSimilarity } from "./lib/similarity.js";
import { SENTENCE_GROUPS } from "./data/sentence-groups.js";
import { spinner } from "./utils/spinner.js";

// 產生一組句子的兩兩配對索引：(0,1) (0,2) (1,2) ...
function pairs(n) {
  const result = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      result.push([i, j]);
    }
  }
  return result;
}

async function main() {
  const spin = spinner("呼叫 Embeddings API 取得向量中...").start();
  let groupVectors;
  try {
    // 把所有句子攤平、一次批次 embedding，再依組別切回去。
    groupVectors = await Promise.all(
      SENTENCE_GROUPS.map((g) => embedBatch(g.sentences)),
    );
  } finally {
    spin.stop();
  }

  for (const [g, group] of SENTENCE_GROUPS.entries()) {
    const vectors = groupVectors[g];
    console.log(`\n${group.name}`);
    group.sentences.forEach((s, i) => console.log(`  (${i + 1}) ${s}`));
    console.log("  兩兩相似度：");
    for (const [i, j] of pairs(group.sentences.length)) {
      const score = cosineSimilarity(vectors[i], vectors[j]);
      console.log(`    (${i + 1}) × (${j + 1}) = ${score.toFixed(4)}`);
    }
  }
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
