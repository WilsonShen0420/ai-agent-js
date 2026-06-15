// 用 OpenAI Embeddings API 把文字轉成向量。
import { client } from "./openai.js";

export const EMBEDDING_MODEL = "text-embedding-3-small";

// 取得單一文字的向量。
export async function embed(text) {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

// 一次取得多段文字的向量（批次，較省較快），回傳順序與輸入一致。
export async function embedBatch(texts) {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}
