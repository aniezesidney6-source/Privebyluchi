// ── Peak season (Detty December) ───────────────────────
// One chair a day means December dates are genuinely scarce. Peak dates carry
// a surcharge and a larger deposit. Edit the tiers here; the booking flow, the
// /december page and the server-side payment check all read from this file.

export const SEASON = {
  year: 2026,
  month: 12,
  depositRate: 0.5, // vs the usual 30%
  // Past clients get 48h early access by email; the homepage banner only
  // appears from this date, which is when to post on IG/TikTok too.
  publicFrom: "2026-10-09",
  tiers: [
    { from: 1, to: 19, fee: 20000, label: "Early December" },
    { from: 20, to: 31, fee: 40000, label: "Festive peak" },
  ],
};

export const BASE_DEPOSIT_RATE = 0.3;

export const isPublic = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }) >= SEASON.publicFrom;

// "2026-12-21" → { fee, label } or null when the date isn't a peak date.
export function peakFor(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || "");
  if (!m || +m[1] !== SEASON.year || +m[2] !== SEASON.month) return null;
  const day = +m[3];
  return SEASON.tiers.find((t) => day >= t.from && day <= t.to) || null;
}

export const depositRateFor = (date) => (peakFor(date) ? SEASON.depositRate : BASE_DEPOSIT_RATE);

const pad = (n) => String(n).padStart(2, "0");

// Every bookable day of the season (Mon–Sat), as YYYY-MM-DD strings.
export function seasonDays() {
  const out = [];
  const last = new Date(SEASON.year, SEASON.month, 0).getDate();
  for (let d = 1; d <= last; d++) {
    if (new Date(SEASON.year, SEASON.month - 1, d).getDay() === 0) continue; // Sundays off
    out.push(`${SEASON.year}-${pad(SEASON.month)}-${pad(d)}`);
  }
  return out;
}
