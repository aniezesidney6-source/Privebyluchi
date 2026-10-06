// ── Seasonal pricing (December + January) ──────────────
// December and January carry seasonal pricing: +₦30,000 on every style, with
// ₦10,000 off for anyone booking at least two weeks ahead (last-minute
// bookings pay the full price, so the discount is real). December also takes
// a 50% deposit. The booking flow, the /december page, emails and the
// server-side payment check all read from this file.

export const SEASON = {
  months: ["2026-12", "2027-01"],
  uplift: 30000,
  earlyDiscount: 10000,
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
  if (!m || !SEASON.months.includes(`${m[1]}-${m[2]}`)) return null;
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
