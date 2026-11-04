/* Date/time formatting: en-JM, same style in the app and the PDF. */

const dayFmt = new Intl.DateTimeFormat("en-JM", { weekday: "long" });
const dateFmt = new Intl.DateTimeFormat("en-JM", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-JM", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const fmtDay = (iso: string) => dayFmt.format(isoToDate(iso));
export const fmtDate = (iso: string) => dateFmt.format(isoToDate(iso));
export const fmtFull = (iso: string) => `${fmtDay(iso)}, ${fmtDate(iso)}`;
export const fmtTime = (d: number | Date) => timeFmt.format(d);
export const nowTime = () => timeFmt.format(new Date());

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "3.5 h" style, no float garbage. */
export function fmtHours(h: number) {
  return `${Number(h.toFixed(2))} h`;
}

export function fmtBytes(n: number) {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}
