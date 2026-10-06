// One-off: emails every past client their 48-hour early access to December
// dates, with their referral code. Not scheduled; trigger it by hand.
//
// Env: RESEND_API_KEY, CRON_SECRET.
//
//   Preview the email:    GET  /api/december-announce?preview=1   (opens HTML)
//   Count recipients:     GET  /api/december-announce?dry=1
//   Send a test:          POST /api/december-announce?test=1[&to=you@example.com]
//   Send to everyone:     POST /api/december-announce?send=1
// All need  Authorization: Bearer <token>, where the token is CRON_SECRET or a
// signed-in admin session: Supabase email login or quick-password token.

import { SEASON, seasonDays, maxEarlyPct } from "../src/season.js";
import { SERVICES } from "../src/data.js";
import { tokenOk } from "./_admin.js";

const FROM = "Privé by Luchi <bookings@privebyluchi.com>";
const REPLY_TO = "luxuriousluchihairs@gmail.com";
const ADMIN = "luxuriousluchihairs@gmail.com";
const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";

const PINK = "#E85A8A", PINK_DEEP = "#C63E6C", GREEN = "#1E4D3E", GREEN_DEEP = "#153A2E", INK = "#26201F", MUTED = "#7A6E70", CREAM = "#FFFBF9";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const firstName = (n) => (String(n || "").trim().split(/\s+/)[0] || "love");
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");

function refCode(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length < 7) return "";
  let h = 2166136261;
  for (let i = 0; i < d.length; i++) { h ^= d.charCodeAt(i); h = Math.imul(h, 16777619); }
  return "PRV-" + (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 5);
}

function buildHtml(name, phone, left) {
  const code = refCode(phone);
  const pct = Math.round(SEASON.depositRate * 100);
  const off = maxEarlyPct(SERVICES);
  const rowS = (l, v, hi) => `<tr><td style="padding:8px 0;color:${MUTED};font-size:14px;border-bottom:1px solid #EFE3E8;">${l}</td>
     <td style="padding:8px 0;color:${hi ? PINK_DEEP : INK};font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #EFE3E8;">${v}</td></tr>`;
  const tiers = rowS("Early-booking discount", `${naira(SEASON.earlyDiscount)} off (up to ${off}%)`, true)
    + rowS("To qualify", "Book 2+ weeks ahead")
    + rowS("December &amp; January pricing", `+${naira(SEASON.uplift)} before discount`);
  return `<!doctype html><html><body style="margin:0;background:${CREAM};">
  <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:540px;margin:0 auto;color:${INK};">
    <div style="background:${GREEN_DEEP};padding:34px 26px 30px;">
      <div style="line-height:0;"><img src="https://privebyluchi.com/email/logo-cream.png" width="170" height="33" alt="Privé by Luchi" style="display:inline-block;border:0;outline:none;width:170px;height:auto;"></div>
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${PINK};font-weight:700;margin-top:28px;">Early access · 48 hours · clients only</div>
      <div style="font-family:Georgia,serif;font-size:38px;line-height:1.05;color:#F3EEE9;margin-top:12px;">One chair.<br><i style="color:#F2A9C0;">${left}</i> December dates.</div>
    </div>
    <div style="padding:28px 26px 8px;">
      <p style="font-size:16px;line-height:1.7;margin:0 0 14px;">Hi ${esc(firstName(name))},</p>
      <p style="font-size:16px;line-height:1.7;margin:0 0 14px;">December bookings open to everyone in 48 hours. Because you've sat in the Privé chair before, you get first pick, today.</p>
      <p style="font-size:16px;line-height:1.7;margin:0 0 14px;">We braid one client a day, so there are only <b>${left}</b> December dates in total. Weddings, owambes, Christmas, flights home: once a date goes, it's gone.</p>
      <div style="background:${PINK};color:#fff;border-radius:14px;padding:16px 18px;text-align:center;margin:0 0 20px;">
        <div style="font-family:Georgia,serif;font-size:30px;font-weight:700;line-height:1.1;">Up to ${off}% off</div>
        <div style="font-size:14px;margin-top:6px;">Our December discount: ${naira(SEASON.earlyDiscount)} off when you book two weeks or more ahead.</div>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:8px;">${tiers}
        <tr><td style="padding:8px 0;color:${MUTED};font-size:14px;">Deposit to secure</td><td style="padding:8px 0;color:${PINK_DEEP};font-size:14px;font-weight:600;text-align:right;">${pct}%, by card, transfer or USSD</td></tr>
      </table>
      <p style="text-align:center;margin:28px 0;"><a href="https://privebyluchi.com/december" style="background:${PINK};color:#fff;text-decoration:none;font-weight:600;font-size:16px;padding:15px 30px;border-radius:999px;display:inline-block;">See the open dates</a></p>
    </div>
    ${code ? `<div style="margin:0 26px 26px;background:${GREEN};border-radius:14px;padding:18px;text-align:center;">
      <div style="color:#CFE4D8;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Bringing a sister or a bestie home for December?</div>
      <div style="display:inline-block;margin-top:10px;background:#fff;color:${GREEN};font-family:Georgia,serif;font-weight:700;font-size:20px;letter-spacing:2px;padding:8px 20px;border-radius:999px;">${esc(code)}</div>
      <div style="color:#fff;font-size:13px;line-height:1.5;margin-top:10px;">Share your code. They get ₦3,000 off their first booking, you get ₦3,000 off your next.</div>
    </div>` : ""}
    <p style="color:${MUTED};font-size:12.5px;padding:0 26px 30px;text-align:center;line-height:1.6;">Privé by Luchi · Luxury Mobile Braiding Studio · Lagos, Nigeria<br>You're receiving this because you've booked with us before. Just reply if you'd rather not hear about seasonal dates.</p>
  </div></body></html>`;
}

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  const d = await r.json().catch(() => []);
  return Array.isArray(d) ? d : [];
}

// CRON_SECRET, or the session of someone signed in to the admin dashboard:
// a Supabase Auth user (the anon key is not a user) or a quick-password token.
async function authorized(req) {
  const auth = String(req.headers.authorization || "");
  const secret = process.env.CRON_SECRET;
  if (secret && auth === `Bearer ${secret}`) return true;
  const token = auth.replace(/^Bearer\s+/, "");
  if (!token || token === SUPABASE_KEY) return false;
  if (token.startsWith("adm.")) return tokenOk(token); // quick-password session
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } });
    const u = await r.json().catch(() => ({}));
    return r.ok && Boolean(u && u.id);
  } catch { return false; }
}

async function pastClients() {
  // Unique past clients by email, most recent booking first.
  const rows = await sb("bookings?select=name,email,phone,created_at&email=not.is.null&order=created_at.desc");
  const seen = new Set();
  return rows.filter((b) => {
    const e = String(b.email || "").trim().toLowerCase();
    if (!emailOk(e) || seen.has(e)) return false;
    seen.add(e);
    return true;
  });
}

export default async function handler(req, res) {
  if (!(await authorized(req))) return res.status(401).json({ error: "Unauthorized" });
  const key = process.env.RESEND_API_KEY;
  const q = req.query || {};

  // Live count of open December dates, same rule as the /december page.
  const days = seasonDays();
  const from = days[0], to = days[days.length - 1];
  const [booked, blocked] = await Promise.all([
    sb(`bookings?select=date&date=gte.${from}&date=lte.${to}`),
    sb(`blocked_dates?select=date&date=gte.${from}&date=lte.${to}`),
  ]);
  const gone = new Set([...booked, ...blocked].map((r) => r.date));
  const left = days.filter((d) => !gone.has(d)).length;

  if (q.preview) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(buildHtml("Adaeze", "08012345678", left));
  }
  if (q.dry) return res.status(200).json({ recipients: (await pastClients()).length, left });
  if (req.method !== "POST" || !(q.test || q.send)) {
    return res.status(400).json({ error: "Use ?preview=1 (GET), or POST with ?test=1 or ?send=1" });
  }
  if (!key) return res.status(500).json({ error: "RESEND_API_KEY not set" });

  const subject = `Up to ${maxEarlyPct(SERVICES)}% off December, and you get first pick ✿`;

  // A test goes to ?to= when given (any address the admin types), else Luchi's inbox.
  const testTo = emailOk(q.to) ? String(q.to).trim() : ADMIN;
  const recipients = q.test ? [{ name: "Luchi", email: testTo, phone: "" }] : await pastClients();

  // Resend's batch endpoint takes up to 100 emails per call.
  let sent = 0;
  const errors = [];
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100).map((c) => ({
      from: FROM, to: [String(c.email).trim()], reply_to: REPLY_TO, subject,
      html: buildHtml(c.name, c.phone, left),
    }));
    const r = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`, "Content-Type": "application/json",
        // A second click within 24h re-sends nothing (Resend dedupes by key).
        ...(q.send ? { "Idempotency-Key": `december-${SEASON.year}-early-${i}` } : {}),
      },
      body: JSON.stringify(chunk),
    });
    if (r.ok) sent += chunk.length;
    else errors.push((await r.text()).slice(0, 200));
  }
  return res.status(200).json({ recipients: recipients.length, sent, left, errors });
}
