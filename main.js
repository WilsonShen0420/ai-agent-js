// 搜尋測試程式：輸入問題，對台灣風景名勝知識庫做向量搜尋，印出最相關的結果與相似度分數。
import { input } from "@inquirer/prompts";
import { searchKnowledge } from "./lib/qdrant.js";
import { spinner } from "./utils/spinner.js";

console.log("台灣風景名勝知識庫搜尋。輸入問題即可搜尋，輸入 exit 結束。\n");

try {
  while (true) {
    const query = (
      await input({ message: "請輸入要搜尋的內容：" })
    ).trim();

    if (query === "") continue;
    if (query.toLowerCase() === "exit") {
      console.log("再會~");
      break;
    }

    const spin = spinner("搜尋中...").start();
    let results;
    try {
      results = await searchKnowledge(query, 3);
    } finally {
      spin.stop();
    }

    for (const [i, r] of results.entries()) {
      console.log(`\n${i + 1}. ${r.name}（${r.region}・${r.category}）`);
      console.log(`   相似度：${r.score.toFixed(3)}`);
      console.log(`   特色：${r.features}`);
      console.log(`   介紹：${r.description}`);
    }
    console.log();
  }
} catch (err) {
  if (err.name === "ExitPromptError") {
    console.log("\n再會~");
  } else {
    throw err;
  }
}
