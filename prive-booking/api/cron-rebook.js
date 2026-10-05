// Vercel Cron: runs daily and nudges clients to rebook ~5 weeks after their
// last appointment (braids typically come down at 6-8 weeks). Sends once, to
// clients whose MOST RECENT booking was exactly REBOOK_DAYS ago, so nobody is
// spammed. Env: RESEND_API_KEY; optional CRON_SECRET.

const REBOOK_DAYS = 35;
const FROM = "Privé by Luchi <bookings@privebyluchi.com>";
const REPLY_TO = "luxuriousluchihairs@gmail.com";

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";

const PINK = "#E85A8A", GREEN = "#1E4D3E", INK = "#26201F", MUTED = "#7A6E70", CREAM = "#FFFBF9";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const firstName = (n) => (String(n || "").trim().split(/\s+/)[0] || "love");
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());

function refCode(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length < 7) return "";
  let h = 2166136261;
  for (let i = 0; i < d.length; i++) { h ^= d.charCodeAt(i); h = Math.imul(h, 16777619); }
  return "PRV-" + (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 5);
}

function daysAgoLagos(n) {
  const t = new Date(Date.now() - n * 24 * 3600 * 1000);
  return t.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

function buildHtml(name, phone, lastStyle) {
  const code = refCode(phone);
  return `<!doctype html><html><body style="margin:0;background:${CREAM};">
  <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px 18px;color:${INK};">
    <div style="text-align:center;font-family:Georgia,serif;font-size:24px;color:${GREEN};font-weight:700;">Privé <span style="color:${PINK};">✿</span> by Luchi</div>
    <div style="text-align:center;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${PINK};font-weight:700;margin-top:6px;">Time for a fresh style?</div>
    <p style="font-size:16px;line-height:1.65;margin-top:22px;">Hi ${esc(firstName(name))}, it's been about five weeks since your last appointment${lastStyle ? ` (${esc(lastStyle)})` : ""} 🌸</p>
    <p style="font-size:16px;line-height:1.65;">Braids are best taken down around 6 to 8 weeks to keep your natural hair healthy, so now is the perfect time to book your next look. We'll come right to your door.</p>
    <p style="text-align:center;margin:26px 0;"><a href="https://privebyluchi.com/#book" style="background:${PINK};color:#fff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 28px;border-radius:999px;">Book your next style</a></p>
    ${code ? `<div style="background:${GREEN};border-radius:14px;padding:16px 18px;text-align:center;">
      <div style="color:#CFE4D8;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Your referral code</div>
      <div style="display:inline-block;margin-top:8px;background:#fff;color:${GREEN};font-family:Georgia,serif;font-weight:700;font-size:20px;letter-spacing:2px;padding:8px 20px;border-radius:999px;">${esc(code)}</div>
      <div style="color:#fff;font-size:13px;line-height:1.5;margin-top:10px;">Share it, a friend gets ₦3,000 off their first booking and you get ₦3,000 off your next.</div>
    </div>` : ""}
    <p style="color:${MUTED};font-size:12.5px;margin-top:24px;text-align:center;">Privé by Luchi · Luxury Mobile Braiding Studio · Lagos, Nigeria<br>Not ready yet? No worries, we'll be here when you are.</p>
  </div></body></html>`;
}

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: "Email not configured" });

  const target = daysAgoLagos(REBOOK_DAYS);

  // One query: every booking from the target date onward. Clients on the target
  // date are candidates; anyone with a later booking has already returned.
  let rows;
  try { rows = await sb(`bookings?select=name,phone,email,date,style&date=gte.${target}&order=date.asc`); }
  catch (e) { return res.status(502).json({ error: "DB query failed", detail: String(e).slice(0, 200) }); }

  const bookedSince = new Set(); // phones with a booking AFTER the target date
  for (const b of rows) {
    if (b.date > target && b.phone) bookedSince.add(String(b.phone).replace(/\D/g, ""));
  }

  const sentTo = new Set();
  const candidates = [];
  for (const b of rows) {
    if (b.date !== target) continue;
    const pd = String(b.phone || "").replace(/\D/g, "");
    const dedupe = pd || String(b.email || "").toLowerCase();
    if (!dedupe || sentTo.has(dedupe)) continue;
    if (pd && bookedSince.has(pd)) continue; // already came back
    if (!emailOk(b.email)) continue;
    sentTo.add(dedupe);
    candidates.push(b);
  }

  if (candidates.length === 0) {
    return res.status(200).json({ ok: true, target, count: 0, sent: 0 });
  }

  let sent = 0;
  for (const c of candidates) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM, to: [c.email], reply_to: REPLY_TO,
          subject: `${firstName(c.name)}, ready for your next style? 🌸`,
          html: buildHtml(c.name, c.phone, c.style),
          text: `Hi ${firstName(c.name)}, it's been about five weeks since your last appointment. Braids are best refreshed around 6-8 weeks, so now's a great time to book your next look. We come to you: https://privebyluchi.com/#book\n\nYour referral code: ${refCode(c.phone)} — share it, a friend gets ₦3,000 off and so do you.`,
        }),
      });
      if (r.ok) sent++;
    } catch { /* continue */ }
  }

  return res.status(200).json({ ok: true, target, count: candidates.length, sent });
}
