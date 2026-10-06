// Shared Flutterwave v3 logic for /api/flw-init (start the pop-up checkout),
// /api/flw-verify (confirm after paying) and /api/flw-sweep (catch-up for
// payments the page missed). The underscore prefix keeps Vercel from
// exposing this file as its own route.
//
// Env: FLW_PUBLIC_KEY (FLWPUBK-…), FLW_SECRET_KEY or FLUTTERWAVE_SECRET_KEY
// (FLWSECK-…), RESEND_API_KEY.
// FLW_CLIENT_SECRET is accepted in place of FLW_SECRET_KEY when it holds a v3 key.

import { SERVICES, EXTRAS, TIMES } from "../src/data.js";
import { seasonFor, earlyDiscountFor, depositRateFor } from "../src/season.js";
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

// The booking is identified by its date + time slot (one appointment a day),
// packed into a short alphanumeric reference: PRV + yyyymmdd + T + slot + nonce.
export function makeRef(date, time) {
  const slot = TIMES.indexOf(time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || slot < 0) return null;
  return `PRV${date.replace(/-/g, "")}T${slot}${Date.now().toString(36).toUpperCase()}`;
}
export function decodeRef(ref) {
  const m = /^PRV(\d{4})(\d{2})(\d{2})T(\d)[A-Z0-9]+$/.exec(String(ref || ""));
  if (!m || !TIMES[+m[4]]) return null;
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: TIMES[+m[4]] };
}

// ── v3 API access ─────────────────────────────────────
// Pasted values often carry stray whitespace or quotes; strip them.
const clean = (v) => String(v || "").trim().replace(/^["']|["']$/g, "").trim();
const PUBLIC_KEY = () => clean(process.env.FLW_PUBLIC_KEY);
function SECRET_KEY() {
  const k = clean(process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY);
  if (k) return k;
  const legacy = clean(process.env.FLW_CLIENT_SECRET);
  return /^FLWSECK/.test(legacy) ? legacy : "";
}
export const configured = () => Boolean(PUBLIC_KEY() && SECRET_KEY());

async function flw(path) {
  const r = await fetch(`https://api.flutterwave.com/v3${path}`, {
    headers: { Authorization: `Bearer ${SECRET_KEY()}` },
  });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok && d.status === "success", status: r.status, data: d.data, meta: d.meta, raw: d };
}

async function bookingAt(date, time) {
  const q = `date=eq.${encodeURIComponent(date)}&time=eq.${encodeURIComponent(time)}`;
  const rows = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*&${q}&order=created_at.desc&limit=1`, { headers: SB })
    .then((x) => x.json()).catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}

// Everything the pop-up checkout needs for a booking's deposit. The amount is
// computed here from the price list; the browser only says which booking.
export async function checkoutFor(date, time) {
  if (!configured()) return { error: "not_configured" };
  const b = await bookingAt(date, time);
  if (!b) return { error: "no_booking" };
  if (PAID.includes(b.status)) return { error: "already_paid" };
  const amount = expectedDeposit(b);
  const tx_ref = makeRef(date, time);
  if (!amount || !tx_ref || !b.email) return { error: "cannot_price" };
  return {
    public_key: PUBLIC_KEY(),
    tx_ref, amount, currency: "NGN",
    customer: { email: b.email, name: b.name || "", phone_number: b.phone || "" },
    description: `Deposit · ${b.style || "Braids"} · ${date}`,
  };
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
  const peak = seasonFor(b.date)?.uplift || 0;
  // Early-booking discount is judged from when the booking was made; if that
  // isn't recorded, give the client the benefit of the doubt.
  const bookedOn = b.created_at ? new Date(b.created_at).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }) : "1970-01-01";
  const early = earlyDiscountFor(b.date, bookedOn);
  // Without a referred_by column we can't tell if a referral was used, so
  // allow for the discount rather than flag every referred client.
  const discount = b.referred_by || !("referred_by" in b) ? REFERRAL_DISCOUNT : 0;
  const total = Math.max(0, base + extras + peak - early - discount);
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

// Re-fetch a transaction from Flutterwave and, if it succeeded and covers the
// deposit, mark the booking paid. Idempotent: a paid booking isn't re-emailed.
export async function settle(transactionId) {
  if (!configured()) return { paid: false, reason: "not_configured" };
  if (!/^\d{1,20}$/.test(String(transactionId || ""))) return { paid: false, reason: "bad_id" };

  const { ok, status, data: tx, raw } = await flw(`/transactions/${transactionId}/verify`);
  if (!ok || !tx) {
    if (status === 401) console.error("flw: secret key rejected", JSON.stringify(raw).slice(0, 300));
    return { paid: false, reason: "not_found" };
  }
  if (tx.status !== "successful") return { paid: false, pending: tx.status === "pending", reason: tx.status };
  if (tx.currency !== "NGN") return { paid: false, reason: "currency" };

  const key = decodeRef(tx.tx_ref);
  if (!key) return { paid: false, reason: "unknown_ref" };

  const b = await bookingAt(key.date, key.time);
  if (!b) return { paid: false, reason: "no_booking" };
  if (PAID.includes(b.status)) return { paid: true, already: true };

  const amount = Number(tx.amount);
  const expected = expectedDeposit(b);
  const covers = expected != null && amount >= expected;

  if (covers) {
    // Conditional update so the page poll and the sweep can race
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
      `Flutterwave transaction ${tx.id} · ref ${tx.tx_ref} · ${tx.payment_type || ""}`,
    ].join("\n"),
  });

  return { paid: covers, reason: covers ? undefined : "amount_mismatch" };
}

// Catch-up for payments the page didn't see complete (tab closed early).
// Lists recent successful transactions and settles any Privé booking
// references; the account's other business's payments are skipped. settle()
// re-verifies each one, so this only ever acts on verified data.
export async function sweep(days = 7) {
  if (!configured()) return { checked: 0, settled: 0, reason: "not_configured" };
  const from = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  let checked = 0, settled = 0;
  for (let page = 1; page <= 10; page++) {
    const { ok, status, data, meta, raw } = await flw(`/transactions?status=successful&from=${from}&page=${page}`);
    if (!ok) {
      console.error("flw-sweep: listing transactions failed", status, JSON.stringify(raw).slice(0, 500));
      return { checked, settled, error: "list_failed", status, detail: raw && raw.message };
    }
    for (const t of Array.isArray(data) ? data : []) {
      if (!decodeRef(t.tx_ref)) continue;
      checked++;
      const out = await settle(t.id);
      if (out.paid && !out.already) settled++;
    }
    const pages = meta?.page_info?.total_pages || 1;
    if (page >= pages) break;
  }
  return { checked, settled };
}
