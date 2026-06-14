import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const HISTORY_DIR = ".history";

if (!existsSync(HISTORY_DIR)) {
  mkdirSync(HISTORY_DIR, { recursive: true });
}

const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
const filepath = join(HISTORY_DIR, filename);

const adapter = new JSONFile(filepath);
const db = new Low(adapter, { messages: [] });

await db.read();

export async function initMessage(systemPrompt) {
  if (db.data.messages.length === 0) {
    db.data.messages.push({ role: "developer", content: systemPrompt });
    await db.write();
  }
}

export async function addMessage(content, role = "user") {
  db.data.messages.push({ role, content });
  await db.write();
}

// function calling 需要原樣存入帶有 tool_calls 的 assistant 訊息，
// 以及 role 為 "tool" 的工具回傳結果。
export async function addRawMessage(message) {
  db.data.messages.push(message);
  await db.write();
}

export async function addToolResult(toolCallId, content) {
  db.data.messages.push({
    role: "tool",
    tool_call_id: toolCallId,
    content,
  });
  await db.write();
}

export function getMessages() {
  return db.data.messages;
}
