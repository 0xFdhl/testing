export const STORE_TIME_ZONE = "Asia/Jakarta";

function getStoreYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return { year, month };
}

export function getMonthKey(date: Date) {
  const { year, month } = getStoreYearMonth(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getSalesPeriodStart(now: Date, monthCount = 12) {
  const { year, month } = getStoreYearMonth(now);
  const firstMonthIndex = year * 12 + month - 1 - monthCount + 1;
  const firstYear = Math.floor(firstMonthIndex / 12);
  const firstMonth = (firstMonthIndex % 12) + 1;
  return new Date(
    `${firstYear}-${String(firstMonth).padStart(2, "0")}-01T00:00:00+07:00`,
  );
}

export function getStoreMonthDates(now: Date, monthCount = 12) {
  const { year, month } = getStoreYearMonth(now);
  const currentMonthIndex = year * 12 + month - 1;

  return Array.from({ length: monthCount }, (_, index) => {
    const target = currentMonthIndex - monthCount + 1 + index;
    return new Date(Date.UTC(Math.floor(target / 12), target % 12, 15, 12));
  });
}
