// 餘弦相似度（cosine similarity）。純函式，不依賴外部服務，可離線測試。
// 兩向量越相似，值越接近 1；無關接近 0；方向相反接近 -1。
export function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error(`向量維度不一致：${a.length} vs ${b.length}`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
