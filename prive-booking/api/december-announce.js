// One-off: emails every past client their 48-hour early access to December
// dates, with their referral code. Not scheduled; trigger it by hand.
//
// Env: RESEND_API_KEY, CRON_SECRET (required here, it's a mass send).
//
//   Preview the email:   GET  /api/december-announce?preview=1   (opens HTML)
//   Send a test to Luchi: POST /api/december-announce?test=1
//   Send to everyone:     POST /api/december-announce?send=1
// All three need the header  Authorization: Bearer <CRON_SECRET>.

import { SEASON, seasonDays } from "../src/season.js";

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
  const tiers = SEASON.tiers.map((t) =>
    `<tr><td style="padding:8px 0;color:${MUTED};font-size:14px;border-bottom:1px solid #EFE3E8;">${t.from}–${t.to} December</td>
     <td style="padding:8px 0;color:${INK};font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #EFE3E8;">+${naira(t.fee)}</td></tr>`).join("");
  return `<!doctype html><html><body style="margin:0;background:${CREAM};">
  <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:540px;margin:0 auto;color:${INK};">
    <div style="background:${GREEN_DEEP};padding:34px 26px 30px;">
      <div style="font-family:Georgia,serif;font-size:20px;color:#F3EEE9;font-weight:700;">Privé <span style="color:${PINK};">✿</span> by Luchi</div>
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${PINK};font-weight:700;margin-top:28px;">Early access · 48 hours · clients only</div>
      <div style="font-family:Georgia,serif;font-size:38px;line-height:1.05;color:#F3EEE9;margin-top:12px;">One chair.<br><i style="color:#F2A9C0;">${left}</i> December dates.</div>
    </div>
    <div style="padding:28px 26px 8px;">
      <p style="font-size:16px;line-height:1.7;margin:0 0 14px;">Hi ${esc(firstName(name))},</p>
      <p style="font-size:16px;line-height:1.7;margin:0 0 14px;">December bookings open to everyone in 48 hours. Because you've sat in the Privé chair before, you get first pick, today.</p>
      <p style="font-size:16px;line-height:1.7;margin:0 0 20px;">We braid one client a day, so there are only <b>${left}</b> December dates in total. Weddings, owambes, Christmas, flights home: once a date goes, it's gone.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:8px;">${tiers}
        <tr><td style="padding:8px 0;color:${MUTED};font-size:14px;">Deposit to secure</td><td style="padding:8px 0;color:${PINK_DEEP};font-size:14px;font-weight:600;text-align:right;">${pct}%, by bank transfer</td></tr>
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

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
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
  if (req.method !== "POST" || !(q.test || q.send)) {
    return res.status(400).json({ error: "Use ?preview=1 (GET), or POST with ?test=1 or ?send=1" });
  }
  if (!key) return res.status(500).json({ error: "RESEND_API_KEY not set" });

  const subject = `First pick of December, before it opens to everyone ✿`;

  let recipients;
  if (q.test) {
    recipients = [{ name: "Luchi", email: ADMIN, phone: "" }];
  } else {
    // Unique past clients by email, most recent booking first.
    const rows = await sb("bookings?select=name,email,phone,created_at&email=not.is.null&order=created_at.desc");
    const seen = new Set();
    recipients = rows.filter((b) => {
      const e = String(b.email || "").trim().toLowerCase();
      if (!emailOk(e) || seen.has(e)) return false;
      seen.add(e);
      return true;
    });
  }

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
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    });
    if (r.ok) sent += chunk.length;
    else errors.push((await r.text()).slice(0, 200));
  }
  return res.status(200).json({ recipients: recipients.length, sent, left, errors });
}
