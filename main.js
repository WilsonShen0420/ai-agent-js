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
  "你是一位單位換算助手，可以協助使用者進行攝氏與華氏、公里與英里、公斤與磅之間的換算。" +
    "當使用者詢問換算時，請呼叫 convert_unit 工具取得精確結果，再用繁體中文清楚回答。" +
    "若換算無法進行，請友善地說明原因。",
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
