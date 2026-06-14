import { input } from "@inquirer/prompts";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "./config.js";
import {
  initMessage,
  addMessage,
  addRawMessage,
  addToolResult,
  getMessages,
} from "./db/messages.js";
import { rememberZodiac, getZodiac } from "./db/profile.js";
import { getZodiacByDate, getZodiacByName } from "./lib/zodiac.js";
import { calcCompatibility } from "./lib/compatibility.js";
import { buildSystemPrompt } from "./prompts/system.js";

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

const today = new Date().toISOString().slice(0, 10);

// 提供給 LLM 的本地工具（function calling）。
const tools = [
  {
    type: "function",
    function: {
      name: "get_zodiac_by_birthday",
      description:
        "根據聽眾提供的生日（月、日）推算星座。當聽眾提到自己的生日時呼叫，呼叫後會自動記住該星座。",
      parameters: {
        type: "object",
        properties: {
          month: { type: "integer", description: "月份 1-12" },
          day: { type: "integer", description: "日期 1-31" },
        },
        required: ["month", "day"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remember_user_zodiac",
      description:
        "記住聽眾的星座，之後對話會自動帶入。當聽眾直接說出自己的星座（未給生日）時呼叫。",
      parameters: {
        type: "object",
        properties: {
          zodiac: { type: "string", description: "星座中文名稱，例如 天蠍座" },
        },
        required: ["zodiac"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calc_compatibility",
      description:
        "用四象元素演算法計算兩個星座的契合度（本地、可重現）。當聽眾想知道兩個星座合不合時呼叫，並以回傳數字為準。",
      parameters: {
        type: "object",
        properties: {
          zodiac_a: { type: "string", description: "第一個星座，例如 牡羊座" },
          zodiac_b: { type: "string", description: "第二個星座，例如 天蠍座" },
        },
        required: ["zodiac_a", "zodiac_b"],
      },
    },
  },
];

// 本地工具的實際執行：回傳值會以 JSON 字串送回給 LLM。
async function runTool(name, args) {
  switch (name) {
    case "get_zodiac_by_birthday": {
      const z = getZodiacByDate(args.month, args.day);
      await rememberZodiac(z.name, z.element);
      return { zodiac: z.name, element: z.elementLabel, remembered: true };
    }
    case "remember_user_zodiac": {
      const z = getZodiacByName(args.zodiac);
      if (!z) return { error: `無法辨識星座：${args.zodiac}` };
      await rememberZodiac(z.name, z.element);
      return { zodiac: z.name, element: z.elementLabel, remembered: true };
    }
    case "calc_compatibility":
      return calcCompatibility(args.zodiac_a, args.zodiac_b);
    default:
      return { error: `未知的工具：${name}` };
  }
}

await initMessage(buildSystemPrompt(today, getZodiac()));

console.log("✦ 星語 ✦ 深夜星空電台為你開台。輸入 exit 結束。\n");

try {
  while (true) {
    const userQuestion = (await input({ message: "你想說：" })).trim();

    if (userQuestion === "") continue;
    if (userQuestion.toLowerCase() === "exit") {
      console.log("願星光指引你回家，再會~");
      break;
    }

    await addMessage(userQuestion);

    // 對話迴圈：若 LLM 要求呼叫工具，就執行後把結果回傳，直到產生最終回覆。
    while (true) {
      const response = await client.chat.completions.create({
        model: "gpt-5-mini",
        messages: getMessages(),
        tools,
      });

      const message = response.choices[0].message;

      if (message.tool_calls?.length) {
        await addRawMessage(message);
        for (const call of message.tool_calls) {
          const args = JSON.parse(call.function.arguments || "{}");
          const result = await runTool(call.function.name, args);
          await addToolResult(call.id, JSON.stringify(result));
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
    console.log("\n願星光指引你回家，再會~");
  } else {
    throw err;
  }
}
