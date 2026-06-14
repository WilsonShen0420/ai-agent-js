// YouBike 區域查詢篩選邏輯測試。使用 mock 資料，不需網路或金鑰：npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { filterStationsByArea } from "../tools/youbike.js";

const MOCK = [
  { act: "1", sna: "YouBike2.0_大安森林公園", sarea: "大安區", ar: "新生南路", available_rent_bikes: 10, available_return_bikes: 5, Quantity: 30, latitude: 0, longitude: 0 },
  { act: "1", sna: "YouBike2.0_科技大樓站", sarea: "大安區", ar: "復興南路", available_rent_bikes: 3, available_return_bikes: 12, Quantity: 20, latitude: 0, longitude: 0 },
  { act: "1", sna: "YouBike2.0_市政府站", sarea: "信義區", ar: "市府路", available_rent_bikes: 7, available_return_bikes: 8, Quantity: 25, latitude: 0, longitude: 0 },
  { act: "0", sna: "YouBike2.0_停用站", sarea: "大安區", ar: "停用路", available_rent_bikes: 99, available_return_bikes: 0, Quantity: 10, latitude: 0, longitude: 0 },
];

test("依行政區篩選，且排除停用站", () => {
  const r = filterStationsByArea(MOCK, { area: "大安區" });
  assert.equal(r.length, 2); // 停用站(act=0)被排除
  assert.ok(r.every((s) => s.area === "大安區"));
});

test("站名去除 YouBike2.0_ 前綴", () => {
  const r = filterStationsByArea(MOCK, { area: "信義區" });
  assert.equal(r[0].name, "市政府站");
});

test("依可借車輛數由多到少排序", () => {
  const r = filterStationsByArea(MOCK, { area: "大安區" });
  assert.equal(r[0].available_rent, 10);
  assert.equal(r[1].available_rent, 3);
});

test("available_amount 過濾可借數不足的站", () => {
  const r = filterStationsByArea(MOCK, { area: "大安區", available_amount: 5 });
  assert.equal(r.length, 1);
  assert.equal(r[0].name, "大安森林公園");
});

test("limit 限制回傳筆數", () => {
  const r = filterStationsByArea(MOCK, { area: "大安區", limit: 1 });
  assert.equal(r.length, 1);
});

test("查無資料（含市名）回傳錯誤物件", () => {
  const r = filterStationsByArea(MOCK, { area: "台北市" });
  assert.ok(r.error);
  assert.ok(!Array.isArray(r));
});
