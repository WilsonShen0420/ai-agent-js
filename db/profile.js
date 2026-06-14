// 使用者檔案：記住使用者的星座，跨對話自動帶入。
// 與對話歷史分開存放，使用 lowdb 持久化到 .history/profile.json。

import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const HISTORY_DIR = ".history";

if (!existsSync(HISTORY_DIR)) {
  mkdirSync(HISTORY_DIR, { recursive: true });
}

const filepath = join(HISTORY_DIR, "profile.json");
const adapter = new JSONFile(filepath);
const db = new Low(adapter, { zodiac: null, element: null });

await db.read();

export async function rememberZodiac(zodiac, element = null) {
  db.data.zodiac = zodiac;
  db.data.element = element;
  await db.write();
}

export function getZodiac() {
  return db.data.zodiac;
}

export function getProfile() {
  return db.data;
}
