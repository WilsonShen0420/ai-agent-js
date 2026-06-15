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

查詢範例：

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
實際查詢結果：
```
✔ 請輸入： 現在幾點？

[呼叫 tool] get_current_time({})

現在時間是 2026/6/15 上午 9:32:53。還需要我幫你查詢台北市哪個行政區的 YouBike 嗎？

✔ 請輸入： 現在幾點？大安區還有 YouBike 可以借嗎？

[呼叫 tool] get_current_time({})

[呼叫 tool] get_youbike_by_area({"area":"大安區","available_amount":0,"limit":5})

現在時間是 2026/6/15 上午 9:33:05。

大安區目前有可借的 YouBike，以下為（最多 5 筆）站點簡要資訊：

臺北市芳和實驗中學（臥龍街170號(前)）：可借 73 輛，可還 3 輛，總停放位 76。

臺灣科技大學側門（基隆路四段73巷與基隆路口）：可借 49 輛，可還 48 輛，總停放位 97。

建國和平路口西北側（建國南路二段與和平東路二段口西北側）：可借 49 輛，可還 1 輛，總停放位 50。

捷運大安站(2號出口)（信義路3段143號(前)）：可借 49 輛，可還 11 輛，總停放位 60。

捷運科技大樓站(台北教育大學)（和平東路二段134號前）：可借 46 輛，可還 8 輛，總停放位 54。

需要我查詢大安區更多站點（超過 5 筆）或其他行政區的站點嗎？

✔ 請輸入： 現在在中山區的捷運上,因為我們人數眾多須同時借大量的 youbike,請找出目前有提供 30 量的站點,且還車的站點也必須要有 30 輛以上的空位可以還,請提供借以及還的站點,兩個是不同站點

[呼叫 tool] get_youbike_by_area({"area":"中山區","available_amount":30,"limit":100})

[呼叫 tool] get_youbike_by_area({"area":"大安區","available_amount":0,"limit":100})

[呼叫 tool] get_youbike_by_area({"area":"信義區","available_amount":0,"limit":100})

[呼叫 tool] get_youbike_by_area({"area":"松山區","available_amount":0,"limit":100})

[呼叫 tool] get_youbike_by_area({"area":"中正區","available_amount":0,"limit":100})

[呼叫 tool] get_youbike_by_area({"area":"內湖區","available_amount":0,"limit":100})

[呼叫 tool] get_youbike_by_area({"area":"南港區","available_amount":0,"limit":100})

[呼叫 tool] get_youbike_by_area({"area":"士林區","available_amount":0,"limit":100})

[呼叫 tool] get_youbike_by_area({"area":"文山區","available_amount":0,"limit":100})

[呼叫 tool] get_youbike_by_area({"area":"大同區","available_amount":0,"limit":100})

[呼叫 tool] get_youbike_by_area({"area":"萬華區","available_amount":0,"limit":100})

我幫你配對了「借車站（可借 ≥30 輛）」與「還車站（可還位 ≥30 格）」，且兩站不同。即時數量會變動，建議儘快前往或告訴我你要採用哪一組，我再幫你規劃路線或更精準查找離你最近的站。

建議配對（皆為不同站）

配對 A（較近、可行性高）

借車：民生建國路口（中山區，民生東路三段 / 建國北路二段口） — 可借 43 輛

還車：臺北市立大學（博愛校區）（中正區，愛國西路1號前） — 可還 51 格

配對 B（還車格非常充足）

借車：復興市民路口（中山區，復興南路一段36-9號前） — 可借 43 輛

還車：市民金山路口（中正區，金山市民大道口南側） — 可還 90 格

配對 C（若往信義方向較方便）

借車：復興市民路口（中山區） — 可借 43 輛

還車：捷運市政府站(3號出口)（信義區，忠孝東路/松仁路） — 可還 87 格

注意事項

數據為即時快照，會隨使用者變動，建議儘快行動。

借車站的「可還位」通常較少，若你希望回程也能集中在少數站點還車，建議事先決定好 2 個還車站（分散還車），或選擇還車格特別多的站（例如上面配對中的還車站）。

若要我幫你：

依你目前所在的捷運站/出口找「離你最近」且符合上述條件的借／還配對（請提供捷運站與出口）；或

直接導航到你選定的借車站並標示附近幾個可分流還車站？

你想採用哪一組，或要我以你現在的捷運站幫你找最近的方案？
```
