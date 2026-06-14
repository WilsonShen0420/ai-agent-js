// 把一筆知識組成要做 embedding 的文字。
// 獨立成無相依的模組，方便離線測試（不會載入 OpenAI client）。
export function entryToText(item) {
  return [item.name, item.region, item.category, item.features, item.description]
    .filter(Boolean)
    .join(" | ");
}
