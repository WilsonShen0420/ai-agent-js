# 作業 4：整合 YouBike 與時間工具

> AI Agent 實作工作坊（JavaScript 版）
> 基底分支：`2.5-tool-calling-current-time`

整合「YouBike 站點查詢工具（區域查詢版）」與「時間工具」，建立一個能回答「現在時間」和「哪裡有 YouBike 可以借」的助手。

## 一、工具說明

| 工具 | name | 功能 |
|---|---|---|
| 時間工具 | `get_current_time` | 取得現在的台灣時間 |
| YouBike 工具 | `get_youbike_by_area` | 查詢台北市指定**行政區**目前可借的 YouBike 站點 |

`get_youbike_by_area` 參數：

- `area`（字串，必填）：台北市行政區名稱，如 `大安區`、`信義區`。
- `available_amount`（數字，預設 0）：至少可借車輛數。
- `limit`（數字，預設 5）：回傳站點數上限。

說明：

- 採**區域查詢版**，以行政區名稱比對（`sarea` 欄位），**不做經緯度或距離計算**。
- 資料來源為台北市開放資料（YouBike 2.0 即時資訊），**不需 API Key**。
- 只接受台北市行政區名稱；傳「台北市」這類市名會查不到資料，會回傳錯誤物件 `{ error: "..." }`。

## 二、檔案結構

```
main.js                主程式（註冊兩個工具的 Function Calling 聊天迴圈）
tools/youbike.js       YouBike 區域查詢工具
tools/current_time.js  時間工具
tools/index.js         工具註冊中心
utils/func-tool.js     工具定義與轉成 OpenAI tool
lib/openai.js          OpenAI client 與預設模型
db/messages.js         對話記憶（支援 tool 訊息）
test/youbike.test.js   區域篩選邏輯測試（離線可跑）
```

對應作業繳交內容：

| 繳交項目 | 檔案 |
|---|---|
| YouBike 工具 | `tools/youbike.js` |
| 時間工具 | `tools/current_time.js` |
| 工具註冊程式（聊天管理） | `tools/index.js`、`db/messages.js` |
| 主程式 | `main.js` |

## 三、執行方式

```bash
npm install
cp .env.example .env      # 填入你的 OPENAI_API_KEY
npm start
```

輸入 `exit` 結束。

離線驗證 YouBike 篩選邏輯（不需金鑰／網路）：

```bash
npm test
```

測試涵蓋：行政區篩選、排除停用站、站名去前綴、依可借數排序、`available_amount` 與 `limit`、查無資料回傳錯誤物件。

## 四、三個測試問題的執行結果

> ⚠️ 以下需在本機填入 `OPENAI_API_KEY` 後執行 `npm start` 產生，請以實際輸出／截圖替換。
> 行政區請使用台北市的（如大安區、信義區），即時可借數會隨時間變動。

```
請輸入：現在幾點？

[呼叫 tool] get_current_time({})

現在是台灣時間 ...。

請輸入：信義區有 YouBike 可以借嗎？

[呼叫 tool] get_youbike_by_area({"area":"信義區"})

信義區目前這些站點有車可借：...

請輸入：現在幾點？大安區還有 YouBike 可以借嗎？

[呼叫 tool] get_current_time({})
[呼叫 tool] get_youbike_by_area({"area":"大安區"})

現在是台灣時間 ...；另外大安區目前可借的站點有 ...
```

```
（在此貼上三個測試問題的實際執行結果或截圖）
```
