// Vercel Cron: runs daily and emails the admin a reminder of TOMORROW's
// appointments (a guaranteed day-before reminder, independent of any calendar).
//
// Scheduled in vercel.json ("crons"). Env: RESEND_API_KEY (required),
// CRON_SECRET (optional — if set, the request must carry it; Vercel sends it
// automatically on cron runs).

const FROM = "Privé by Luchi <bookings@luxuriousluchihairs.com>";
const ADMIN = "luxuriousluchihairs@gmail.com";

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";

const WHATSAPP = "2348156973807";
const PINK = "#E85A8A", GREEN = "#1E4D3E", INK = "#26201F", MUTED = "#7A6E70", CREAM = "#FFFBF9", LINE = "#EFE3E8", PINK_TINT = "#FFF4F8";

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const naira = (n) => (n == null || n === "" ? "—" : "₦" + Number(n).toLocaleString("en-NG"));
const waDigits = (p) => { let d = String(p || "").replace(/\D/g, ""); if (d.startsWith("0")) d = "234" + d.slice(1); else if (!d.startsWith("234")) d = "234" + d; return d; };

function lagosTomorrow() {
  const t = new Date(Date.now() + 24 * 3600 * 1000);
  return t.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }); // YYYY-MM-DD
}
function pretty(d) {
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  catch { return d; }
}

function card(b) {
  const wa = `https://wa.me/${waDigits(b.phone)}?text=${encodeURIComponent(`Hi ${(b.name || "love").split(" ")[0]}! 🌸 A friendly reminder of your ${b.style || "appointment"} with Privé by Luchi tomorrow at ${b.time}. See you soon!`)}`;
  const tel = `tel:${String(b.phone || "").replace(/\s+/g, "")}`;
  return `<div style="background:#fff;border:1px solid ${LINE};border-radius:14px;padding:16px 18px;margin-bottom:12px;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;">
      <span style="font-family:Georgia,serif;font-size:17px;color:${GREEN};font-weight:700;">${esc(b.time || "")}</span>
      <span style="font-size:13px;color:${MUTED};">${esc(b.name || "Unknown")}</span>
    </div>
    <div style="margin-top:6px;color:${INK};font-size:14px;">${esc(b.style || "—")}${b.size ? " · " + esc(b.size) : ""}</div>
    <div style="margin-top:2px;color:${MUTED};font-size:13px;">📍 ${esc(b.address || "—")}</div>
    <div style="margin-top:2px;color:${MUTED};font-size:13px;">${esc(b.phone || "no number")} · total ${naira(b.total)}, deposit ${naira(b.deposit)}</div>
    ${b.phone ? `<div style="margin-top:10px;">
      <a href="${wa}" style="display:inline-block;background:#E7F3EC;color:${GREEN};text-decoration:none;font-weight:600;font-size:13px;padding:7px 14px;border-radius:999px;margin-right:6px;">Remind on WhatsApp</a>
      <a href="${tel}" style="display:inline-block;background:#F2ECEE;color:${INK};text-decoration:none;font-weight:600;font-size:13px;padding:7px 14px;border-radius:999px;">Call</a>
    </div>` : ""}
  </div>`;
}

function buildHtml(dateStr, rows) {
  return `<!doctype html><html><body style="margin:0;background:${CREAM};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:26px 14px;"><tr><td align="center">
    <table width="100%" style="max-width:560px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
      <tr><td style="text-align:center;padding-bottom:16px;">
        <div style="font-family:Georgia,serif;font-size:22px;color:${GREEN};font-weight:700;">Privé <span style="color:${PINK};">✿</span> by Luchi</div>
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${PINK};font-weight:700;margin-top:6px;">Tomorrow's appointments</div>
      </td></tr>
      <tr><td style="padding:0 2px 14px;color:${INK};font-size:15px;line-height:1.6;">
        You have <b>${rows.length}</b> appointment${rows.length > 1 ? "s" : ""} tomorrow, <b>${esc(pretty(dateStr))}</b>. Here's your run-of-day:
      </td></tr>
      <tr><td>${rows.map(card).join("")}</td></tr>
      <tr><td style="padding:12px 4px 0;text-align:center;color:${MUTED};font-size:12.5px;">Automatic day-before reminder · Privé by Luchi</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

async function getTomorrowBookings(dateStr) {
  const url = `${SUPABASE_URL}/rest/v1/bookings?select=*&date=eq.${encodeURIComponent(dateStr)}&order=time.asc`;
  const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  const d = await r.json();
  if (!Array.isArray(d)) return [];
  // Skip anything already resolved as a no-show or completed.
  return d.filter((b) => !["no_show", "completed"].includes(b.status));
}

export default async function handler(req, res) {
  // Optional shared-secret guard (Vercel adds this header automatically on cron runs).
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: "Email not configured" });

  const dateStr = lagosTomorrow();
  let rows = [];
  try { rows = await getTomorrowBookings(dateStr); }
  catch (e) { return res.status(502).json({ error: "DB query failed", detail: String(e).slice(0, 200) }); }

  if (rows.length === 0) {
    return res.status(200).json({ ok: true, date: dateStr, count: 0, sent: false });
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [ADMIN],
        subject: `⏰ ${rows.length} appointment${rows.length > 1 ? "s" : ""} tomorrow — ${pretty(dateStr)}`,
        html: buildHtml(dateStr, rows),
        text: `You have ${rows.length} appointment(s) tomorrow (${pretty(dateStr)}):\n\n` +
          rows.map((b) => `• ${b.time} — ${b.name || "Unknown"} — ${b.style || "—"}${b.size ? " (" + b.size + ")" : ""} — ${b.phone || "no number"} — ${b.address || "—"}`).join("\n"),
      }),
    });
    if (!r.ok) {
      return res.status(502).json({ error: "Email provider error", detail: (await r.text()).slice(0, 300) });
    }
    const data = await r.json();
    return res.status(200).json({ ok: true, date: dateStr, count: rows.length, sent: true, id: data.id });
  } catch (e) {
    return res.status(500).json({ error: "Failed to send", detail: String(e).slice(0, 200) });
  }
}
