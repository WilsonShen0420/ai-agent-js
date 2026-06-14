import { QdrantClient } from "@qdrant/js-client-rest";
import { QDRANT_URL, QDRANT_API_KEY } from "../config.js";
import { client } from "./openai.js";
import { entryToText } from "./landmark-text.js";

export { entryToText };

export const qdrant = new QdrantClient({
  url: QDRANT_URL,
  ...(QDRANT_API_KEY && { apiKey: QDRANT_API_KEY }),
});

export const COLLECTION = "taiwan_landmarks";
export const EMBEDDING_DIM = 1536;
export const EMBEDDING_MODEL = "text-embedding-3-small";

export async function embed(text) {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

export async function searchKnowledge(query, limit = 3) {
  const vector = await embed(query);

  const results = await qdrant.search(COLLECTION, {
    vector,
    limit,
    with_payload: true,
  });

  return results.map((r) => ({
    score: r.score,
    name: r.payload.name,
    region: r.payload.region,
    category: r.payload.category,
    features: r.payload.features,
    description: r.payload.description,
  }));
}
