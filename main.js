import { input } from "@inquirer/prompts";
import { client, DEFAULT_MODEL } from "./lib/openai.js";
import { spinner } from "./utils/spinner.js";
import { toOpenAITool } from "./utils/func-tool.js";
import * as allTools from "./tools/index.js";
import {
  initMessage,
  addMessage,
  addRawMessage,
  addToolResult,
  getMessages,
} from "./db/messages.js";

// 載入並註冊所有工具。
const toolList = Object.values(allTools);
const tools = toolList.map(toOpenAITool);
const AVAILABLE_TOOLS = Object.fromEntries(toolList.map((t) => [t.name, t.fn]));

await initMessage(
  [
    "你是一位單位換算助手，只能透過 convert_unit 工具進行單位換算。",
    "請務必遵守以下規則：",
    "1. 只要使用者要求任何單位換算，一律呼叫 convert_unit 工具，不可自行心算或用自己的知識計算數字。",
    "2. 本助手僅支援三類換算：攝氏↔華氏、公里↔英里、公斤↔磅。",
    "3. 當工具回傳的結果包含 error（例如不支援的單位、時間、坪數、面積等），請如實告知使用者「無法換算」以及原因，並且絕對不要自行提供換算後的數字或替代算法。",
    "4. 換算成功時，請用繁體中文清楚說明換算結果。",
    "全程使用繁體中文回答。",
  ].join("\n"),
);

console.log("單位換算助手已啟動，可以問我換算問題。輸入 exit 結束。\n");

try {
  while (true) {
    const userQuestion = (await input({ message: "請輸入：" })).trim();

    if (userQuestion === "") continue;
    if (userQuestion.toLowerCase() === "exit") {
      console.log("再會~");
      break;
    }

    await addMessage(userQuestion);

    // 對話迴圈：LLM 若要求呼叫工具，就執行後回傳結果，直到產生最終回覆。
    while (true) {
      const spin = spinner("換算中...").start();
      let message;
      try {
        const response = await client.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: getMessages(),
          tools,
          tool_choice: "auto",
        });
        message = response.choices[0].message;
      } finally {
        spin.stop();
      }

      if (message.tool_calls?.length) {
        await addRawMessage(message);
        for (const toolCall of message.tool_calls) {
          const fnName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments || "{}");
          console.log(`\n[呼叫 tool] ${fnName}(${JSON.stringify(args)})`);

          const fn = AVAILABLE_TOOLS[fnName];
          const result = await fn(args);
          await addToolResult(toolCall.id, JSON.stringify(result));
        }
        continue; // 帶著工具結果再問一次
      }

      console.log(`\n${message.content}\n`);
      await addMessage(message.content, "assistant");
      break;
    }
  }
} catch (err) {
  if (err.name === "ExitPromptError") {
    console.log("\n再會~");
  } else {
    throw err;
  }
}
