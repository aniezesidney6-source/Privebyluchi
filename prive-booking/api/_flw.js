// Shared Flutterwave v4 logic for /api/flw-charge (create a pay-with-transfer
// charge), /api/flw-verify (the page polling for payment) and /api/flw-sweep
// (catch-up for transfers the page missed). The underscore prefix keeps Vercel
// from exposing this file as its own route.
//
// Env: FLW_CLIENT_ID, FLW_CLIENT_SECRET (v4 API keys), RESEND_API_KEY.
// Optional: FLW_ENV=sandbox for test keys, or FLW_BASE_URL to override.

import { randomUUID } from "crypto";
import { SERVICES, EXTRAS, TIMES } from "../src/data.js";
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

// ── v4 API access ─────────────────────────────────────
const BASE = process.env.FLW_BASE_URL ||
  (process.env.FLW_ENV === "sandbox" ? "https://developersandbox-api.flutterwave.com" : "https://f4bexperience.flutterwave.com");
export const configured = () => Boolean(process.env.FLW_CLIENT_ID && process.env.FLW_CLIENT_SECRET);

let token = { value: "", expires: 0 }; // reused across warm invocations
async function accessToken() {
  if (token.value && Date.now() < token.expires) return token.value;
  const r = await fetch("https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.FLW_CLIENT_ID,
      client_secret: process.env.FLW_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!d.access_token) throw new Error("Flutterwave auth failed");
  token = { value: d.access_token, expires: Date.now() + Math.max(30, (d.expires_in || 600) - 60) * 1000 };
  return token.value;
}

async function flw(path, init = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      "X-Trace-Id": randomUUID(),
      ...(init.method === "POST" ? { "X-Idempotency-Key": randomUUID() } : {}),
    },
  });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, data: d.data, raw: d };
}

async function bookingAt(date, time) {
  const q = `date=eq.${encodeURIComponent(date)}&time=eq.${encodeURIComponent(time)}`;
  const rows = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*&${q}&order=created_at.desc&limit=1`, { headers: SB })
    .then((x) => x.json()).catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}

// Create a pay-with-transfer charge for a booking's deposit. The amount is
// computed here from the price list; the browser only says which booking.
export async function createTransferCharge(date, time) {
  if (!configured()) return { error: "not_configured" };
  const b = await bookingAt(date, time);
  if (!b) return { error: "no_booking" };
  if (PAID.includes(b.status)) return { error: "already_paid" };
  const amount = expectedDeposit(b);
  const reference = makeRef(date, time);
  if (!amount || !reference || !b.email) return { error: "cannot_price" };

  const [first, ...rest] = String(b.name || "Privé client").trim().split(/\s+/);
  const digits = String(b.phone || "").replace(/\D/g, "").replace(/^234/, "").replace(/^0/, "");
  const { ok, data, raw } = await flw("/orchestration/direct-charges", {
    method: "POST",
    body: JSON.stringify({
      amount, currency: "NGN", reference,
      customer: {
        email: b.email,
        name: { first: first || "Privé", last: rest.join(" ") || "Client" },
        ...(digits.length >= 10 ? { phone: { country_code: "234", number: digits } } : {}),
      },
      payment_method: { type: "bank_transfer", bank_transfer: { account_expires_in: 3600 } },
      meta: { booking_date: date, booking_time: time },
    }),
  });
  if (!ok || !data) return { error: "flutterwave_error", detail: raw && (raw.message || raw.error) };

  // Account details come back in next_action (and, on some responses, in
  // payment_method_details); read whichever is present.
  const na = data.next_action || {};
  const acct = na.requires_bank_transfer || data.payment_method_details?.bank_transfer || data.payment_method_details?.transfer || {};
  return {
    charge_id: data.id,
    amount,
    account_number: acct.account_number,
    bank_name: acct.account_bank_name || acct.bank_name,
    account_name: acct.account_display_name || "Privé by Luchi (Flutterwave)",
    expires_at: acct.account_expiration_datetime,
    note: acct.note || na.payment_instruction?.note || "",
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

// Re-fetch a charge from Flutterwave and, if it succeeded and covers the
// deposit, mark the booking paid. Idempotent: a paid booking isn't re-emailed.
export async function settle(chargeId) {
  if (!configured()) return { paid: false, reason: "not_configured" };
  if (!/^[A-Za-z0-9_-]{4,80}$/.test(String(chargeId || ""))) return { paid: false, reason: "bad_id" };

  const { data: tx } = await flw(`/charges/${chargeId}`);
  if (!tx || tx.currency !== "NGN") return { paid: false, reason: "not_found" };
  if (tx.status !== "succeeded") return { paid: false, pending: tx.status === "pending", reason: tx.status };

  const key = decodeRef(tx.reference);
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
      `Flutterwave charge: ${tx.id} · ref ${tx.reference}`,
    ].join("\n"),
  });

  return { paid: covers, reason: covers ? undefined : "amount_mismatch" };
}

// Catch-up for transfers the page didn't see land (tab closed early). Lists
// recent successful charges and settles any Privé booking references.
// settle() re-fetches each charge, so this only ever acts on verified data.
export async function sweep(days = 7) {
  if (!configured()) return { checked: 0, settled: 0, reason: "not_configured" };
  const from = new Date(Date.now() - days * 864e5).toISOString();
  let checked = 0, settled = 0;
  for (let page = 1; page <= 10; page++) {
    const { data } = await flw(`/charges?status=succeeded&from=${encodeURIComponent(from)}&page=${page}&size=50`);
    const list = Array.isArray(data) ? data : [];
    for (const c of list) {
      if (!decodeRef(c.reference)) continue; // another business's payment
      checked++;
      const out = await settle(c.id);
      if (out.paid && !out.already) settled++;
    }
    if (list.length < 50) break;
  }
  return { checked, settled };
}
