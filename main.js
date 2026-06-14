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

// 載入並註冊所有工具（時間工具、YouBike 區域查詢工具）。
const toolList = Object.values(allTools);
const tools = toolList.map(toOpenAITool);
const AVAILABLE_TOOLS = Object.fromEntries(toolList.map((t) => [t.name, t.fn]));

await initMessage(
  [
    "你是一位生活助手，可以協助使用者查詢「現在的時間」以及「台北市各行政區目前可借的 YouBike 站點」。",
    "請依使用者的問題選擇正確的工具：",
    "1. 詢問現在幾點、現在時間時，呼叫 get_current_time。",
    "2. 詢問某個行政區的 YouBike 時，呼叫 get_youbike_by_area，並帶入行政區名稱。",
    "3. 一次同時問時間與 YouBike 時，請呼叫兩個工具，再把結果整合成一段回答。",
    "YouBike 只支援台北市的行政區名稱（例如 大安區、信義區）；若使用者只給「台北市」，請提醒他提供具體的行政區。",
    "請用繁體中文清楚回答。",
  ].join("\n"),
);

console.log("生活助手已啟動，可以問我現在時間或台北市各區的 YouBike。輸入 exit 結束。\n");

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
      const spin = spinner("思考中...").start();
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
