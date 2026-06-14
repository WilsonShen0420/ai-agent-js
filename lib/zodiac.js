// 星座推算模組
// 依生日（月/日）推算星座，並提供星座的四象元素資料。
// 純本地計算，不依賴外部 API。

// 十二星座標準順序（以春分牡羊座為起點），含四象元素與日期區間。
// 元素：fire 火、earth 土、air 風、water 水
export const ZODIACS = [
  { name: "牡羊座", element: "fire", start: [3, 21], end: [4, 19] },
  { name: "金牛座", element: "earth", start: [4, 20], end: [5, 20] },
  { name: "雙子座", element: "air", start: [5, 21], end: [6, 21] },
  { name: "巨蟹座", element: "water", start: [6, 22], end: [7, 22] },
  { name: "獅子座", element: "fire", start: [7, 23], end: [8, 22] },
  { name: "處女座", element: "earth", start: [8, 23], end: [9, 22] },
  { name: "天秤座", element: "air", start: [9, 23], end: [10, 23] },
  { name: "天蠍座", element: "water", start: [10, 24], end: [11, 22] },
  { name: "射手座", element: "fire", start: [11, 23], end: [12, 21] },
  { name: "摩羯座", element: "earth", start: [12, 22], end: [1, 19] },
  { name: "水瓶座", element: "air", start: [1, 20], end: [2, 18] },
  { name: "雙魚座", element: "water", start: [2, 19], end: [3, 20] },
];

export const ELEMENT_LABELS = {
  fire: "火象",
  earth: "土象",
  air: "風象",
  water: "水象",
};

/**
 * 依生日推算星座。
 * @param {number} month 月份 1-12
 * @param {number} day 日期 1-31
 * @returns {{name: string, element: string, elementLabel: string}}
 */
export function getZodiacByDate(month, day) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`月份不合法：${month}`);
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error(`日期不合法：${day}`);
  }

  const z = ZODIACS.find((zodiac) => {
    const [sm, sd] = zodiac.start;
    const [em, ed] = zodiac.end;
    if (sm <= em) {
      // 一般區間（同一年內，如 3/21 ~ 4/19）
      return (
        (month === sm && day >= sd) ||
        (month === em && day <= ed) ||
        (month > sm && month < em)
      );
    }
    // 跨年區間（摩羯座 12/22 ~ 1/19）
    return (month === sm && day >= sd) || (month === em && day <= ed);
  });

  if (!z) throw new Error(`找不到對應星座：${month}/${day}`);
  return {
    name: z.name,
    element: z.element,
    elementLabel: ELEMENT_LABELS[z.element],
  };
}

/**
 * 依名稱取得星座資料（容錯：可給「天蠍」或「天蠍座」）。
 * @param {string} name
 * @returns {{name: string, element: string, elementLabel: string, index: number}|null}
 */
export function getZodiacByName(name) {
  if (!name) return null;
  const cleaned = name.trim().replace(/座$/, "");
  const index = ZODIACS.findIndex((z) => z.name.replace(/座$/, "") === cleaned);
  if (index === -1) return null;
  const z = ZODIACS[index];
  return {
    name: z.name,
    element: z.element,
    elementLabel: ELEMENT_LABELS[z.element],
    index,
  };
}
