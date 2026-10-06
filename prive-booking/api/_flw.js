// Shared Flutterwave logic for /api/flw-verify (browser callback) and
// /api/flw-webhook (Flutterwave's server-to-server backup). The underscore
// prefix keeps Vercel from exposing this file as its own route.
//
// Env: FLW_SECRET_KEY (verify API), RESEND_API_KEY (confirmation emails).

import { SERVICES, EXTRAS } from "../src/data.js";
import { peakFor, depositRateFor } from "../src/season.js";
import { REFERRAL_DISCOUNT } from "../src/theme.js";

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";
const SB = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

const FROM = "Privé by Luchi <bookings@privebyluchi.com>";
const REPLY_TO = "luxuriousluchihairs@gmail.com";
const ADMIN = "luxuriousluchihairs@gmail.com";
const PINK = "#E85A8A", GREEN = "#1E4D3E", INK = "#26201F", MUTED = "#7A6E70", CREAM = "#FFFBF9";

const PAID = ["deposit_paid", "confirmed", "completed"];
const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const firstName = (n) => (String(n || "").trim().split(/\s+/)[0] || "love");

// "prive_<base64url(date|time)>_<nonce>" → { date, time }
export function decodeRef(ref) {
  const m = /^prive_([A-Za-z0-9_-]+)_[a-z0-9]+$/.exec(String(ref || ""));
  if (!m) return null;
  try {
    const [date, time] = Buffer.from(m[1], "base64url").toString("utf8").split("|");
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && time ? { date, time } : null;
  } catch { return null; }
}

// Recompute the deposit from the price list rather than trusting the stored
// row (the browser writes it). Returns null if the style can't be matched.
export function expectedDeposit(b) {
  const style = String(b.style || "");
  const svc = SERVICES.find((s) => style === s.name || style.startsWith(`${s.name} (`));
  if (!svc) return null;
  const sizes = svc.variants
    ? svc.variants[(/\((.+)\)$/.exec(style) || [])[1]]
    : svc.sizes;
  const base = sizes && sizes[b.size];
  if (!base) return null;
  const chosen = String(b.addons || "").split(",").map((s) => s.trim()).filter(Boolean);
  const extras = EXTRAS.filter((e) => chosen.includes(e.label)).reduce((a, e) => a + e.price, 0);
  const peak = peakFor(b.date)?.fee || 0;
  // Without a referred_by column we can't tell if a referral was used, so
  // allow for the discount rather than flag every referred client.
  const discount = b.referred_by || !("referred_by" in b) ? REFERRAL_DISCOUNT : 0;
  const total = Math.max(0, base + extras + peak - discount);
  return Math.round(total * depositRateFor(b.date));
}

async function sendResend(payload) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch { /* non-fatal */ }
}

function clientHtml(b, amount) {
  const balance = Math.max(0, Number(b.total || 0) - amount);
  return `<!doctype html><html><body style="margin:0;background:${CREAM};">
  <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px 18px;color:${INK};">
    <div style="text-align:center;font-family:Georgia,serif;font-size:24px;color:${GREEN};font-weight:700;">Privé <span style="color:${PINK};">✿</span> by Luchi</div>
    <div style="text-align:center;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${PINK};font-weight:700;margin-top:6px;">Deposit received · Your date is locked</div>
    <p style="font-size:16px;line-height:1.65;margin-top:22px;">Hi ${esc(firstName(b.name))}, we've received your <b>${naira(amount)}</b> deposit. Your ${esc(b.style || "appointment")} on <b>${esc(b.date)}</b> at <b>${esc(b.time)}</b> is officially yours 🌸</p>
    <p style="font-size:16px;line-height:1.65;">Balance on the day: <b>${naira(balance)}</b> plus logistics, which we'll confirm with you on WhatsApp.</p>
    <p style="color:${MUTED};font-size:12.5px;margin-top:24px;text-align:center;">Privé by Luchi · Luxury Mobile Braiding Studio · Lagos, Nigeria</p>
  </div></body></html>`;
}

// Verify a Flutterwave transaction and, if it covers the deposit, mark the
// booking paid. Idempotent: a booking already paid is not re-emailed.
export async function settle(transactionId) {
  const secret = process.env.FLW_SECRET_KEY;
  if (!secret) return { paid: false, reason: "not_configured" };
  if (!/^\d+$/.test(String(transactionId || ""))) return { paid: false, reason: "bad_id" };

  const r = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const tx = (await r.json().catch(() => ({}))).data;
  if (!tx || tx.status !== "successful" || tx.currency !== "NGN") return { paid: false, reason: "not_successful" };

  const key = decodeRef(tx.tx_ref);
  if (!key) return { paid: false, reason: "unknown_ref" };

  const q = `date=eq.${encodeURIComponent(key.date)}&time=eq.${encodeURIComponent(key.time)}`;
  const rows = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*&${q}&order=created_at.desc&limit=1`, { headers: SB })
    .then((x) => x.json()).catch(() => []);
  const b = Array.isArray(rows) ? rows[0] : null;
  if (!b) return { paid: false, reason: "no_booking" };
  if (PAID.includes(b.status)) return { paid: true, already: true };

  const amount = Number(tx.amount);
  const expected = expectedDeposit(b);
  const covers = expected != null && amount >= expected;

  if (covers) {
    // Conditional update so the browser callback and the webhook can race
    // safely: only the call that actually flips the status sends emails.
    const upd = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${b.id}&status=not.in.(${PAID.join(",")})`, {
      method: "PATCH", headers: { ...SB, Prefer: "return=representation" },
      body: JSON.stringify({ status: "deposit_paid" }),
    }).then((x) => x.json()).catch(() => []);
    if (!Array.isArray(upd) || upd.length === 0) return { paid: true, already: true };
    if (b.email) {
      await sendResend({
        from: FROM, to: [b.email], reply_to: REPLY_TO,
        subject: `Deposit received, your ${b.date} appointment is locked ✿`,
        html: clientHtml(b, amount),
      });
    }
  }

  // Always tell Luchi, so a short or unmatched payment is never silent.
  await sendResend({
    from: FROM, to: [ADMIN],
    subject: covers
      ? `💸 Deposit paid online: ${naira(amount)} · ${b.name || "Client"} · ${b.date}`
      : `⚠️ Check payment: ${naira(amount)} from ${b.name || "a client"} · ${b.date}`,
    text: [
      covers ? "Deposit paid via Flutterwave, booking marked Deposit paid." : "A Flutterwave payment came in but did NOT cover the expected deposit, so the booking was left as is. Please check it.",
      "",
      `Client: ${b.name} · ${b.phone}`,
      `Style: ${b.style}${b.size ? " · " + b.size : ""}`,
      `Date: ${b.date} at ${b.time}`,
      `Paid: ${naira(amount)} · Expected deposit: ${expected == null ? "couldn't calculate" : naira(expected)}`,
      `Flutterwave ref: ${tx.flw_ref} (transaction ${tx.id})`,
    ].join("\n"),
  });

  return { paid: covers, reason: covers ? undefined : "amount_mismatch" };
}
