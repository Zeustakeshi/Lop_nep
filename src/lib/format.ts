export function formatMoney(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(amount);
}

export const appTimeZone = "Asia/Ho_Chi_Minh";

export function dateInputKey(date: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(date));

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: appTimeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(date));
}

export function currentMonthKey() {
  return dateInputKey(new Date()).slice(0, 7);
}
