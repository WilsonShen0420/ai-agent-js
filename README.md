# 作業 3：建立迷你知識庫（台灣風景名勝）

> AI Agent 實作工作坊（JavaScript 版）
> 基底分支：`3.2-rag-search-text`

使用 OpenAI Embeddings 與 Qdrant 向量資料庫，建立一個台灣風景名勝的小型知識庫並測試搜尋功能。

## 一、知識庫內容

`data/landmarks.json`，共 5 筆景點，每筆包含 `name`、`region`、`category`、`features`、`description`：

| 景點 | 縣市 | 類型 |
|---|---|---|
| 阿里山 | 嘉義縣 | 高山森林遊樂區 |
| 日月潭 | 南投縣 | 高山湖泊 |
| 太魯閣 | 花蓮縣 | 峽谷國家公園 |
| 墾丁 | 屏東縣 | 海濱國家公園 |
| 陽明山 | 臺北市 | 火山國家公園 |

## 二、檔案結構

```
data/landmarks.json        知識庫資料（5 筆景點）
lib/landmark-text.js       將一筆知識組成 embedding 文字
lib/qdrant.js              向量資料庫操作：embed() 與 searchKnowledge()
lib/openai.js              OpenAI client
scripts/embed-knowledge.js 知識庫初始化程式（embedding + 寫入 Qdrant）
main.js                    搜尋測試程式（互動輸入查詢）
test/knowledge.test.js     資料與組字邏輯測試（離線可跑）
```

對應作業繳交內容：

| 繳交項目 | 檔案 |
|---|---|
| Embeddings 相關程式 | `lib/qdrant.js` 的 `embed()`、`scripts/embed-knowledge.js` |
| 向量資料庫操作程式（知識庫初始化） | `scripts/embed-knowledge.js`、`lib/qdrant.js` |
| 搜尋測試程式 | `main.js`（呼叫 `searchKnowledge()`） |

## 三、執行方式

### 1. 準備環境

```bash
npm install
cp .env.example .env
```

`.env` 需填入：

```
OPENAI_API_KEY=你的金鑰
QDRANT_URL=你的 Qdrant 位址      # 本機 Docker 預設 http://localhost:6333
QDRANT_API_KEY=                  # Qdrant Cloud 才需要
```

> 本機可用 Docker 啟動 Qdrant：`docker run -p 6333:6333 qdrant/qdrant`

### 2. 建立知識庫（灌資料）

```bash
npm run embed
```

會建立 collection 並把 5 筆景點做 embedding 後寫入 Qdrant。

### 3. 搜尋測試

```bash
npm start
```

輸入問題即可搜尋，會列出最相關的前 3 筆與相似度分數。輸入 `exit` 結束。

### 離線驗證資料（不需金鑰 / Qdrant）

```bash
npm test
```

驗證：知識庫筆數、欄位完整性、id 不重複、`entryToText` 組字正確。

## 四、三個查詢的實際搜尋結果

> ⚠️ 以下需在本機完成步驟 2、3 後產生，請以實際輸出／截圖替換。
> 建議用三種「不直接出現景點名稱」的問法，驗證語意搜尋的相關性。

範例問法（可自行替換）：

1. 「我想看日出和雲海」（預期最相關：阿里山）
2. 「適合騎腳踏車環湖的地方」（預期最相關：日月潭）
3. 「夏天想去海邊玩水衝浪」（預期最相關：墾丁）

```
請輸入要搜尋的內容：我想看日出和雲海

1. 阿里山（嘉義縣・高山森林遊樂區）
   相似度：0.xxx
   特色：日出、雲海、晚霞、森林鐵道、神木
   介紹：...

（在此貼上三個查詢的實際搜尋結果與相似度分數）
```
