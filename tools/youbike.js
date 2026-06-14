import { z } from "zod";
import { defineTool } from "../utils/func-tool.js";

// 台北市 YouBike 2.0 即時資訊（台北市開放資料，不需 API Key）。
const YOUBIKE_API =
  "https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json";

// 依「行政區名稱」篩選站點（區域查詢版，不做經緯度或距離計算）。
// 抽成純函式以利離線測試。
export function filterStationsByArea(data, { area, available_amount = 0, limit = 5 }) {
  const stations = data
    .filter((s) => s.act === "1") // 只取營運中的站點
    .filter((s) => s.sarea === area) // 比對行政區名稱
    .map((s) => ({
      name: s.sna.replace(/^YouBike2\.0_/, ""),
      area: s.sarea,
      address: s.ar,
      available_rent: s.available_rent_bikes,
      available_return: s.available_return_bikes,
      total: s.Quantity,
    }))
    .filter((s) => s.available_rent >= available_amount)
    .sort((a, b) => b.available_rent - a.available_rent)
    .slice(0, limit);

  if (stations.length === 0) {
    return {
      error: `在「${area}」找不到符合條件的 YouBike 站點。請確認是否為台北市的行政區名稱（例如 大安區、信義區），「台北市」這種市名查不到資料。`,
    };
  }

  return stations;
}

async function getYoubikeByArea(args) {
  const res = await fetch(YOUBIKE_API);
  if (!res.ok) {
    return { error: `YouBike API error: ${res.status}` };
  }
  const data = await res.json();
  return filterStationsByArea(data, args);
}

export const youbikeTool = defineTool({
  name: "get_youbike_by_area",
  description:
    "查詢台北市指定行政區目前可借的 YouBike 站點。只接受台北市的行政區名稱（如 大安區、信義區），不接受「台北市」這類市名。",
  fn: getYoubikeByArea,
  parameters: z.object({
    area: z
      .string()
      .describe("台北市行政區名稱，例如 大安區、信義區、中正區"),
    available_amount: z
      .number()
      .default(0)
      .describe("至少可借車輛數，預設 0"),
    limit: z.number().default(5).describe("回傳站點數上限，預設 5"),
  }),
});
