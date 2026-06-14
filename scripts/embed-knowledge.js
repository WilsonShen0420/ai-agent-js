// 知識庫初始化程式：讀取 JSON 知識、做 embedding、寫入 Qdrant 向量資料庫。
import { readFile } from "node:fs/promises";
import { client } from "../lib/openai.js";
import {
  qdrant,
  COLLECTION,
  EMBEDDING_DIM,
  EMBEDDING_MODEL,
  entryToText,
} from "../lib/qdrant.js";

const DATA_PATH = "data/landmarks.json";

async function recreateCollection() {
  const exists = await qdrant.collectionExists(COLLECTION);
  if (exists.exists) {
    await qdrant.deleteCollection(COLLECTION);
  }
  await qdrant.createCollection(COLLECTION, {
    vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
  });
}

async function embedBatch(texts) {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

async function main() {
  const items = JSON.parse(await readFile(DATA_PATH, "utf8"));
  console.log(`讀到 ${items.length} 筆知識`);

  await recreateCollection();
  console.log(`已建立 collection: ${COLLECTION}`);

  const vectors = await embedBatch(items.map(entryToText));

  const points = items.map((item, idx) => ({
    id: item.id ?? idx,
    vector: vectors[idx],
    payload: item,
  }));

  await qdrant.upsert(COLLECTION, { wait: true, points });
  console.log(`完成！已加入 ${points.length} 筆知識到向量資料庫。`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
