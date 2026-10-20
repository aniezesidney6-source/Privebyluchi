// ── Seasonal pricing (festive window) ──────────────────
// The festive window (23 December to the second week of January) carries
// +₦30,000 on every style. Dates outside it are priced normally. December
// dates inside the window take a 50% deposit. The early-booking discount is
// OFF (earlyDiscount: 0). The booking flow, the /december page, emails and the
// server-side payment check all read from this file.

export const SEASON = {
  // Festive uplift applies ONLY within this date window (inclusive):
  // 23 December through the second week of January. Dates outside it (e.g.
  // early December or late January) are priced normally.
  start: "2026-12-23",
  end: "2027-01-14",
  uplift: 30000,
  // Early-booking discount is OFF for now (set back to 10000 to re-enable it
  // everywhere — booking total, payment, receipts and the /december copy all
  // read from here). With 0, no discount is applied or shown.
  earlyDiscount: 0,
  earlyDays: 14, // book at least this many days ahead to get the discount
  // The /december page and its early-access email.
  year: 2026,
  month: 12,
  depositRate: 0.5, // December only; January keeps the usual 30%
  // Past clients get 48h early access by email; the homepage banner only
  // appears from this date, which is when to post on IG/TikTok too.
  publicFrom: "2026-10-09",
};

export const BASE_DEPOSIT_RATE = 0.3;

const lagosToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
export const isPublic = () => lagosToday() >= SEASON.publicFrom;

const MONTH_NAMES = { "01": "January", "12": "December" };

// "2026-12-21" → { uplift, label } or null outside the season.
export function seasonFor(date) {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(date || "");
  // YYYY-MM-DD compares lexicographically = chronologically.
  if (!m || date < SEASON.start || date > SEASON.end) return null;
  return { uplift: SEASON.uplift, label: MONTH_NAMES[m[2]] || "Seasonal" };
}

// ₦10,000 off a seasonal date booked at least two weeks ahead of `bookedOn`
// (YYYY-MM-DD, defaults to today in Lagos).
export function earlyDiscountFor(date, bookedOn = lagosToday()) {
  if (!seasonFor(date) || !/^\d{4}-\d{2}-\d{2}$/.test(bookedOn || "")) return 0;
  const days = (Date.parse(date) - Date.parse(bookedOn)) / 864e5;
  return days >= SEASON.earlyDays ? SEASON.earlyDiscount : 0;
}

const isDecember = (date) => /^\d{4}-12-/.test(date || "") && Boolean(seasonFor(date));
export const depositRateFor = (date) => (isDecember(date) ? SEASON.depositRate : BASE_DEPOSIT_RATE);

const pad = (n) => String(n).padStart(2, "0");

// Every bookable day of the /december page's month (Mon–Sat), as YYYY-MM-DD.
export function seasonDays() {
  const out = [];
  const last = new Date(SEASON.year, SEASON.month, 0).getDate();
  for (let d = 1; d <= last; d++) {
    if (new Date(SEASON.year, SEASON.month - 1, d).getDay() === 0) continue; // Sundays off
    out.push(`${SEASON.year}-${pad(SEASON.month)}-${pad(d)}`);
  }
  return out;
}

// Largest early-booking discount as a whole percent of a seasonal price, for
// "up to X% off" headlines (the cheapest style gets the biggest share).
export function maxEarlyPct(services) {
  let best = 0;
  for (const s of services) {
    const prices = s.sizes ? Object.values(s.sizes) : Object.values(s.variants || {}).flatMap(Object.values);
    for (const p of prices) best = Math.max(best, SEASON.earlyDiscount / (p + SEASON.uplift));
  }
  return Math.floor(best * 100);
}
