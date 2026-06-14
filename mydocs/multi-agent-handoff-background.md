# Multi-Agent Handoff 背景知識補充

本文件補充說明本 repo 在 `main.js` 中示範的四個 agent 分工合作架構，重點放在：為什麼只呼叫 `homeroom`，卻可以由 `homeroom` 判斷並交接給其他 agent 執行。

## 核心結論

本 repo 使用的是 OpenAI Agents SDK 的 **handoff** 架構，而不是自己手寫 `if/else` 去判斷要呼叫哪一個 agent。

在應用程式層，真正執行時只需要呼叫主控 agent：

```js
const result = await run(homeroom, userInput);
```

但 `homeroom` 這個 agent 在建立時，已經透過 `handoffs` 註冊了可以交接的 specialist agents：

```js
handoffs: [phpTeacher, vueTeacher, pythonTeacher],
```

因此，當 `run(homeroom, userInput)` 執行時，Agents SDK 會讓 `homeroom` 根據自己的 instructions、可用 tools、可 handoff agents，以及各 agent 的 `handoffDescription` 來判斷下一步要做什麼。

## 這不是「一個程序只能一個 agent」

這個 repo 的設計是：

```text
一個 Node.js process
  ├─ homeroom Agent 物件
  ├─ phpTeacher Agent 物件
  ├─ vueTeacher Agent 物件
  └─ pythonTeacher Agent 物件
```

Agent 在這裡不是作業系統層級的 process，而是 JavaScript 物件。也就是說，在同一個 Node.js 程序中，可以同時建立多個 `Agent` 物件，然後交給 Agents SDK 的 runtime 進行 orchestration。

## 本 repo 的四個 agents

### 1. PHP 老師

`phpTeacher` 是 specialist agent，專門處理 PHP / Laravel 相關問題：

```js
const phpTeacher = new Agent({
  name: "PHP 老師",
  model: MODEL,
  instructions:
    "你是 PHP 老師，專門回答 PHP、Laravel 相關問題。請用繁體中文回答。",
  handoffDescription: "PHP 或 Laravel 相關問題",
});
```

其中 `handoffDescription` 的用途是告訴主控 agent 與 SDK：這個 agent 適合處理什麼類型的任務。

### 2. Vue 老師

`vueTeacher` 專門處理 Vue.js / Nuxt 相關問題：

```js
const vueTeacher = new Agent({
  name: "Vue 老師",
  model: MODEL,
  instructions:
    "你是 Vue 老師，專門回答 Vue.js、Nuxt 相關問題。請用繁體中文回答。",
  handoffDescription: "Vue.js 或 Nuxt 相關問題",
});
```

### 3. Python 老師

`pythonTeacher` 專門處理 Python 相關問題，而且它自己還有一個 tool 可以查詢 Python 書籍內容：

```js
const pythonTeacher = new Agent({
  name: "Python 老師",
  model: MODEL,
  instructions:
    "你是 Python 老師，請用繁體中文回答 Python 相關問題。如果問題是關於《為你自己學 Python》這本書、或 Python 的入門背景（用途、特色、怎麼學），先用 search_learn_python 查書裡的內容再回答；其他 Python 問題用你自己的知識解釋即可。",
  handoffDescription: "Python 語法、函式庫，或《為你自己學 Python》這本書的相關問題",
  tools: [toAgentTool(pythonBookTool)],
});
```

這代表 handoff 之後，新的 agent 仍然可以擁有自己的工具使用能力。

流程可以是：

```text
homeroom
  ↓ handoff
pythonTeacher
  ↓ tool call
search_learn_python
```

### 4. 班導師 homeroom

`homeroom` 是主控 agent，也可以理解為 router / coordinator / triage agent：

```js
const homeroom = Agent.create({
  name: "班導師",
  model: MODEL,
  instructions: `你是班導師，協助學生回答各種問題。
- PHP / Laravel 問題請 handoff 給 PHP 老師
- Vue.js / Nuxt 問題請 handoff 給 Vue 老師
- Python 問題請 handoff 給 Python 老師
- 一般生活問題（天氣、時間、YouBike、Netflix 影片）可以直接用 tools 回答
請用繁體中文回答。`,
  tools: [
    toAgentTool(currentTimeTool),
    toAgentTool(weatherTool),
    toAgentTool(youbikeTool),
    toAgentTool(netflixTool),
  ],
  handoffs: [phpTeacher, vueTeacher, pythonTeacher],
});
```

這裡有兩個重要設定：

1. `instructions`：用自然語言描述 routing policy。
2. `handoffs`：把實際可以交接的 agent 物件註冊進來。

## 從 homeroom 判斷到執行其他 agent 的流程

應用程式真正呼叫的是：

```js
const result = await run(homeroom, userInput);
```

概念流程如下：

```text
1. 使用者輸入問題
2. 程式呼叫 run(homeroom, userInput)
3. Agents SDK 啟動 homeroom
4. homeroom 根據 instructions、tools、handoffs 判斷下一步
5. 如果問題可以自己回答，homeroom 直接回答
6. 如果需要 tool，homeroom 呼叫 tool 後再回答
7. 如果需要 specialist，homeroom handoff 給對應 agent
8. 被 handoff 的 agent 根據自己的 instructions 繼續處理
9. SDK 回傳 result.finalOutput 與 result.lastAgent
```

例如使用者問：

```text
Laravel migration 怎麼新增欄位？
```

概念流程會是：

```text
run(homeroom, "Laravel migration 怎麼新增欄位？")
  ↓
homeroom 判斷這是 Laravel 問題
  ↓
homeroom 從 handoffs 中選擇 phpTeacher
  ↓
SDK 將任務交給 phpTeacher
  ↓
phpTeacher 用自己的 instructions 回答
  ↓
result.lastAgent.name = "PHP 老師"
result.finalOutput = PHP 老師的回答
```

應用程式最後用下面這段印出最後實際回答的 agent：

```js
console.log(`\n[由 ${result.lastAgent?.name ?? "班導師"} 回答]`);
console.log(result.finalOutput);
```

## Tool calling 與 agent handoff 的差異

這個 repo 同時使用 tool calling 與 agent handoff，兩者概念不同。

| 類型 | 本質 | 例子 |
|---|---|---|
| Tool | 執行某個 JavaScript function | 查天氣、查時間、查 YouBike、查 Netflix |
| Handoff | 把任務控制權交給另一個 Agent | 交給 PHP 老師、Vue 老師、Python 老師 |

例如生活類問題，`homeroom` 可以直接使用 tools：

```js
tools: [
  toAgentTool(currentTimeTool),
  toAgentTool(weatherTool),
  toAgentTool(youbikeTool),
  toAgentTool(netflixTool),
],
```

而技術領域問題則可以交給 specialist agents：

```js
handoffs: [phpTeacher, vueTeacher, pythonTeacher],
```

## 如果不用 SDK，自己手寫會長什麼樣？

為了理解 Agents SDK 幫我們做了什麼，可以想像自己實作一個簡化版。

### 1. 定義 Agent 結構

```js
class MyAgent {
  constructor({ name, instructions, tools = [], handoffs = [] }) {
    this.name = name;
    this.instructions = instructions;
    this.tools = tools;
    this.handoffs = handoffs;
  }
}
```

### 2. 建立 specialist agents

```js
const phpTeacher = new MyAgent({
  name: "PHP 老師",
  instructions: "你是 PHP 老師，回答 PHP / Laravel 問題",
});

const vueTeacher = new MyAgent({
  name: "Vue 老師",
  instructions: "你是 Vue 老師，回答 Vue / Nuxt 問題",
});

const pythonTeacher = new MyAgent({
  name: "Python 老師",
  instructions: "你是 Python 老師，回答 Python 問題",
});
```

### 3. 建立主控 agent

```js
const homeroom = new MyAgent({
  name: "班導師",
  instructions: "你負責判斷問題要交給誰",
  handoffs: [phpTeacher, vueTeacher, pythonTeacher],
});
```

### 4. 寫一個簡化 runner

```js
async function runAgent(agent, userInput) {
  const decision = await askModelToDecide({
    instructions: agent.instructions,
    userInput,
    handoffs: agent.handoffs.map((a) => ({
      name: a.name,
      description: a.handoffDescription,
    })),
  });

  if (decision.type === "handoff") {
    const nextAgent = agent.handoffs.find(
      (a) => a.name === decision.agentName,
    );

    return runAgent(nextAgent, userInput);
  }

  if (decision.type === "answer") {
    return decision.output;
  }
}
```

這個簡化版 runner 的核心就是：

```text
執行目前 agent
  ↓
讓模型判斷下一步
  ↓
如果模型決定 handoff
  ↓
找到對應 agent
  ↓
執行下一個 agent
```

Agents SDK 的 `run(homeroom, userInput)` 幫我們封裝了類似的 orchestration 流程，因此應用程式不需要手動寫 dispatch 邏輯。

## 架構圖

```text
使用者輸入
  ↓
run(homeroom, userInput)
  ↓
homeroom：班導師 / router / coordinator
  ├─ 一般生活問題 → 使用 tools 回答
  │   ├─ get_current_time
  │   ├─ get_weather
  │   ├─ get_nearby_youbike
  │   └─ search_netflix
  │
  ├─ PHP / Laravel 問題 → handoff 給 phpTeacher
  ├─ Vue.js / Nuxt 問題 → handoff 給 vueTeacher
  └─ Python 問題 → handoff 給 pythonTeacher
                         └─ 必要時使用 search_learn_python
```

## 設計這類 multi-agent 架構時的重點

### 1. 主控 agent 的職責要清楚

主控 agent 不一定要回答所有問題，它的主要職責可以是：

- 判斷問題類型
- 決定是否自己回答
- 決定是否使用 tool
- 決定是否 handoff 給 specialist agent

### 2. Specialist agent 的職責要明確

例如：

- PHP 老師只處理 PHP / Laravel
- Vue 老師只處理 Vue / Nuxt
- Python 老師只處理 Python

職責越清楚，主控 agent 越容易選對 handoff 目標。

### 3. `handoffDescription` 要具體

好的描述：

```js
handoffDescription: "PHP 或 Laravel 相關問題"
```

不好的描述：

```js
handoffDescription: "程式問題"
```

後者太模糊，可能造成主控 agent 不知道該選 PHP、Vue 還是 Python。

### 4. 入口應該固定從主控 agent 開始

在這個 repo 中，所有使用者輸入都先送進 `homeroom`：

```js
const result = await run(homeroom, userInput);
```

這樣應用程式不需要知道最後應該由誰回答，只要信任主控 agent 與 SDK 的 orchestration。

## 總結

本 repo 的四 agent 分工合作架構可以用一句話理解：

> 在同一個 Node.js process 裡建立多個 `Agent` 物件，將 specialist agents 放進主控 agent 的 `handoffs` 陣列，然後永遠從 `run(homeroom, userInput)` 開始執行；Agents SDK 會根據主控 agent 的 instructions、handoff metadata 與可用 tools，自動完成 routing、tool calling 與 handoff orchestration。

這正是本 repo 可以在一個程序裡讓一個 agent 決定如何調用其他 agents 的關鍵。

## 用 C++ / 系統程式角度理解：不是 `fork()`，而是 runtime dispatch

對熟悉 C++ 或系統程式設計的讀者來說，「同一個 Node.js 程序中可以建立多個 Agent 物件」這句話容易被誤解成 SDK 會在背後建立新的程序。實際上，本 repo 的 handoff 比較接近同一個 process 裡的物件 dispatch / function call orchestration，而不是 `fork()`、thread、或 IPC。

比較像下面這種 C++ 心智模型：

```cpp
int main() {
    Agent phpTeacher(...);
    Agent vueTeacher(...);
    Agent pythonTeacher(...);

    Agent homeroom(...);
    homeroom.handoffs = { &phpTeacher, &vueTeacher, &pythonTeacher };

    Result result = run(homeroom, userInput);
}
```

也就是：

```text
同一個 process
  ├─ 建立多個 Agent object
  └─ 呼叫 SDK runtime 的 run()
       └─ runtime 根據模型決策 dispatch 到下一個 Agent object
```

不是：

```text
main process
  └─ fork()
       └─ child process 執行另一個 agent
```

更精準地說，Agents SDK 做的是 **LLM-driven runtime dispatch**：

1. 應用程式先建立多個 Agent object。
2. 主控 agent 透過 `handoffs` 註冊可以交接的 agents。
3. 應用程式呼叫 `run(homeroom, userInput)`。
4. SDK runtime 將主控 agent 的 instructions、tools、handoffs 等資訊提供給模型。
5. 模型決定下一步是回答、呼叫 tool，或 handoff。
6. 如果是 handoff，SDK runtime 會把控制流程轉到目標 agent 的設定上繼續執行。
7. 最後回傳 `finalOutput` 與 `lastAgent`。

因此，「同時建立多個 Agent 物件」指的是同一個 process 記憶體中有多個 agent object，不代表四個 agent 一開始就同時平行執行。如果真的要平行呼叫多個 agent，通常會另外使用 `Promise.all()`、worker threads、child processes，或其他併發機制；那是另一種架構。

## 如果改用 Python 與地端模型，如何實現類似功能？

如果不用 OpenAI Agents SDK，也不用：

```js
import { Agent, run } from "@openai/agents";
```

仍然可以實作同樣的 multi-agent handoff。關鍵不是特定 SDK，而是下面這個架構：

```text
1. 定義多個 agent
2. 定義主控 agent / router / supervisor
3. 主控 agent 根據使用者輸入做 routing decision
4. runtime 根據 decision 呼叫下一個 agent
5. 所有步驟共享 state、messages、tool results、step limit
```

在 Python + 地端模型的情境中，地端模型可以透過 Ollama、vLLM、llama.cpp server，或其他 OpenAI-compatible API server 提供推論能力；multi-agent orchestration 則可以使用現有框架，也可以自己寫簡化版 runtime。

### 常見可靠框架選擇

| 需求 | 建議框架 | 適合原因 |
|---|---|---|
| 最接近本 repo 的 `homeroom -> specialist agents` handoff / routing | LangGraph / LangChain | 適合明確描述 state、node、edge、supervisor、handoff |
| 大量文件、PDF、RAG、向量檢索 | LlamaIndex | 文件索引、query engine、RAG 與 agent workflow 整合成熟 |
| 快速建立角色型任務流程 | CrewAI | Agent / Task / Crew abstraction 上手快 |
| Microsoft 生態、event-driven、多 agent 對話、企業整合 | Microsoft Agent Framework / AutoGen 系列 | 偏 enterprise orchestration 與 event-driven multi-agent |
| 想完全掌控底層 | 自己實作 orchestrator | 最能理解 Agent、Router、Handoff、Tool、State 的本質 |

官方參考文件：

- LangChain multi-agent patterns: <https://docs.langchain.com/oss/python/langchain/multi-agent>
- LangGraph supervisor reference: <https://reference.langchain.com/python/langgraph-supervisor>
- LangChain Ollama integration: <https://docs.langchain.com/oss/python/integrations/providers/ollama>
- LlamaIndex multi-agent systems: <https://developers.llamaindex.ai/python/framework/understanding/agent/multi_agent/>
- LlamaIndex agents / AgentWorkflow: <https://developers.llamaindex.ai/python/framework/module_guides/deploying/agents/>
- LlamaIndex local models with Ollama: <https://developers.llamaindex.ai/python/framework/getting_started/starter_example_local/>
- CrewAI docs: <https://docs.crewai.com/>
- Microsoft Agent Framework overview: <https://learn.microsoft.com/en-us/agent-framework/overview/>
- AutoGen docs: <https://microsoft.github.io/autogen/stable/>

### 推薦實作路線

若目標是理解底層與建立自己的地端模型 multi-agent 系統，建議分成四個階段：

1. **先自己寫最小版 orchestrator**：實作 `Agent`、`run_agent()`、`decide_route()`、`handoffs`、`max_steps`。
2. **接地端模型**：先用 Ollama 最簡單；之後可改 vLLM 或 llama.cpp server。
3. **改成 LangGraph**：把手寫 state machine / router / handoff 正規化成 graph。
4. **如果有大量 RAG，再接 LlamaIndex**：例如讓 Python agent 查 Python 書籍、Laravel agent 查 Laravel 文件。

### 自己實作最小 Python 版 orchestrator

下面是不用任何 agent framework 的概念版。它展示 multi-agent handoff 的本質：主控 agent 先讓模型判斷 route，如果 route 對應到某個 handoff target，就遞迴執行下一個 agent。

```python
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class Agent:
    name: str
    instructions: str
    handoff_description: str = ""
    tools: dict[str, Callable] = field(default_factory=dict)
    handoffs: dict[str, "Agent"] = field(default_factory=dict)


def call_local_llm(prompt: str) -> str:
    """
    這裡可以接 Ollama / vLLM / llama.cpp。
    實作時可用 requests 呼叫本機 HTTP API，或使用框架提供的 client。
    """
    raise NotImplementedError


def decide_route(agent: Agent, user_input: str) -> str:
    handoff_list = "\n".join(
        f"- {name}: {child.handoff_description}"
        for name, child in agent.handoffs.items()
    )

    prompt = f"""
你是 {agent.name}。

你的指令：
{agent.instructions}

你可以 handoff 給：
{handoff_list}

使用者問題：
{user_input}

請只輸出下一步：
- answer
- 或 handoff target name，例如 php、vue、python
"""

    return call_local_llm(prompt).strip().lower()


def answer_with_agent(agent: Agent, user_input: str) -> str:
    prompt = f"""
你是 {agent.name}。

你的指令：
{agent.instructions}

請回答使用者問題：
{user_input}
"""
    return call_local_llm(prompt)


def run_agent(agent: Agent, user_input: str, max_steps: int = 5) -> str:
    current_agent = agent

    for _ in range(max_steps):
        route = decide_route(current_agent, user_input)

        if route in current_agent.handoffs:
            current_agent = current_agent.handoffs[route]
            continue

        return answer_with_agent(current_agent, user_input)

    return "已達到最大 handoff 次數，請縮小問題範圍後再試一次。"
```

定義 agents：

```python
php_teacher = Agent(
    name="PHP 老師",
    instructions="你專門回答 PHP / Laravel 問題，請用繁體中文回答。",
    handoff_description="PHP 或 Laravel 相關問題",
)

vue_teacher = Agent(
    name="Vue 老師",
    instructions="你專門回答 Vue.js / Nuxt 問題，請用繁體中文回答。",
    handoff_description="Vue.js 或 Nuxt 相關問題",
)

python_teacher = Agent(
    name="Python 老師",
    instructions="你專門回答 Python 問題，請用繁體中文回答。",
    handoff_description="Python 相關問題",
)

homeroom = Agent(
    name="班導師",
    instructions="""
你是班導師。
PHP / Laravel 問題請 handoff 給 php。
Vue.js / Nuxt 問題請 handoff 給 vue。
Python 問題請 handoff 給 python。
其他問題請自己回答。
""",
    handoffs={
        "php": php_teacher,
        "vue": vue_teacher,
        "python": python_teacher,
    },
)

print(run_agent(homeroom, "Laravel migration 怎麼新增欄位？"))
```

這個版本的架構是：

```text
main.py
  ↓
run_agent(homeroom, user_input)
  ↓
homeroom decides route by local LLM
  ├─ php      → run_agent(php_teacher, user_input)
  ├─ vue      → run_agent(vue_teacher, user_input)
  ├─ python   → run_agent(python_teacher, user_input)
  └─ answer   → answer_with_agent(homeroom, user_input)
```

### 用 LangGraph 實作 routing / handoff 的概念

如果不想自己維護 handoff runtime，可以用 LangGraph 把流程寫成 graph：

```python
from typing import Literal, TypedDict
from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, END


class AgentState(TypedDict):
    user_input: str
    route: str
    final_answer: str


llm = ChatOllama(
    model="llama3.1",
    base_url="http://localhost:11434",
)


def homeroom(state: AgentState) -> AgentState:
    prompt = f"""
你是班導師，請判斷使用者問題應該交給哪位老師。

規則：
- PHP / Laravel 問題：回答 php
- Vue.js / Nuxt 問題：回答 vue
- Python 問題：回答 python
- 其他問題：回答 general

使用者問題：
{state["user_input"]}

請只回答 php、vue、python、general 其中之一。
"""

    state["route"] = llm.invoke(prompt).content.strip().lower()
    return state


def route_from_homeroom(state: AgentState) -> Literal[
    "php_agent",
    "vue_agent",
    "python_agent",
    "general_agent",
]:
    if state["route"] == "php":
        return "php_agent"
    if state["route"] == "vue":
        return "vue_agent"
    if state["route"] == "python":
        return "python_agent"
    return "general_agent"


def php_agent(state: AgentState) -> AgentState:
    state["final_answer"] = llm.invoke(
        f"你是 PHP 老師，請用繁體中文回答：{state['user_input']}"
    ).content
    return state


def vue_agent(state: AgentState) -> AgentState:
    state["final_answer"] = llm.invoke(
        f"你是 Vue 老師，請用繁體中文回答：{state['user_input']}"
    ).content
    return state


def python_agent(state: AgentState) -> AgentState:
    state["final_answer"] = llm.invoke(
        f"你是 Python 老師，請用繁體中文回答：{state['user_input']}"
    ).content
    return state


def general_agent(state: AgentState) -> AgentState:
    state["final_answer"] = llm.invoke(
        f"你是一般助理，請用繁體中文回答：{state['user_input']}"
    ).content
    return state


graph = StateGraph(AgentState)

graph.add_node("homeroom", homeroom)
graph.add_node("php_agent", php_agent)
graph.add_node("vue_agent", vue_agent)
graph.add_node("python_agent", python_agent)
graph.add_node("general_agent", general_agent)

graph.set_entry_point("homeroom")

graph.add_conditional_edges(
    "homeroom",
    route_from_homeroom,
)

graph.add_edge("php_agent", END)
graph.add_edge("vue_agent", END)
graph.add_edge("python_agent", END)
graph.add_edge("general_agent", END)

app = graph.compile()

result = app.invoke({
    "user_input": "Laravel migration 怎麼新增欄位？",
    "route": "",
    "final_answer": "",
})

print(result["final_answer"])
```

這個版本把你手寫的 `if route == ...` orchestration 轉成 LangGraph 的 conditional edges；地端模型則由 `ChatOllama` 提供。

### 自己實作時要特別注意的坑

1. **模型輸出不穩定**：要求模型只輸出 `php`，它可能回答「我認為應該交給 PHP 老師」。建議使用 JSON schema 或嚴格 parser。
2. **地端小模型不一定擅長 tool calling**：必要時讓模型輸出固定 JSON，例如 `{"action":"handoff","target":"php"}`。
3. **避免無限 handoff**：runtime 應該設計 `max_steps`。
4. **需要共享 state**：不要只傳原始問題，也要保留 messages、tool results、handoff history。
5. **需要 tracing / logging**：至少記錄 current agent、route decision、tool calls、final answer，否則 multi-agent 很難 debug。

## 延伸總結

OpenAI Agents SDK 不是 multi-agent 的唯一實現方式。它提供的是一套現成的 `Agent`、`run()`、tools、handoffs runtime。若改成 Python + 地端模型，你仍然可以用相同架構，只是要自行選擇或實作 runtime：

```text
主控 agent / router
  ↓
LLM routing decision
  ↓
agent registry / handoff table
  ↓
specialist agent
  ↓
final answer 或 tool call
```

如果重點是學習底層，先自己寫最小 orchestrator；如果要正式專案且流程像本 repo，優先考慮 LangGraph；如果 RAG 比重很高，則評估 LlamaIndex。
