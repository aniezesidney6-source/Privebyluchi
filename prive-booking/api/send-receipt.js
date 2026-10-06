// Vercel serverless function: emails the customer a branded booking receipt
// via Resend. Fired by the booking flow after a booking is saved.
//
// Env: RESEND_API_KEY (set in the Vercel project).
// Sends from the verified domain luxuriousluchihairs.com; replies go to the
// owner's inbox. To avoid being an open spam relay, it only sends when a
// matching booking row (same date + time) actually exists in Supabase.

const FROM = "Privé by Luchi <bookings@privebyluchi.com>";
const REPLY_TO = "luxuriousluchihairs@gmail.com";
const ADMIN = "luxuriousluchihairs@gmail.com"; // where booking + calendar invites go

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";

const BANK = { bank: "Access Bank", number: "1666059382", name: "Luxurious Luchihairs" };
const WHATSAPP = "2348156973807";
const IG = "https://www.instagram.com/priveby_luchi";
const TIKTOK = "https://www.tiktok.com/@priveby_luchi";

const PINK = "#E85A8A", PINK_DEEP = "#C63E6C", GREEN = "#1E4D3E", INK = "#26201F", MUTED = "#7A6E70", CREAM = "#FFFBF9", LINE = "#EFE3E8";

const REFERRAL_DISCOUNT = 3000, REFERRAL_REWARD = 3000;
function refCode(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length < 7) return "";
  let h = 2166136261;
  for (let i = 0; i < d.length; i++) { h ^= d.charCodeAt(i); h = Math.imul(h, 16777619); }
  return "PRV-" + (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 5);
}
const normCode = (c) => String(c || "").trim().toUpperCase().replace(/\s+/g, "");
// Find the client whose referral code matches `code` (recompute each client's code).
async function findReferrer(code) {
  const want = normCode(code);
  if (!/^PRV-[A-Z0-9]{5}$/.test(want)) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=name,phone,email&phone=not.is.null`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  const rows = await r.json();
  if (!Array.isArray(rows)) return null;
  const seen = new Set();
  for (const b of rows) {
    const d = String(b.phone || "").replace(/\D/g, "");
    if (!d || seen.has(d)) continue;
    seen.add(d);
    if (refCode(d) === want && b.email) return { name: b.name, email: b.email };
  }
  return null;
}

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");
const firstName = (n) => (String(n || "").trim().split(/\s+/)[0] || "love");
// Deposit share as a whole percent (30% normally, more on peak-season dates).
const depPct = (b) => (Number(b.total) > 0 ? Math.round((Number(b.deposit) / Number(b.total)) * 100) : 30);

function prettyDate(d) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return d; }
}

function waLink(msg) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

function buildHtml(b) {
  const balance = Math.max(0, Number(b.total || 0) - Number(b.deposit || 0));
  const style = `${b.style || ""}${b.variant ? ` (${b.variant})` : ""}`.trim();
  const waProof = waLink(`Hi Privé by Luchi! I've paid the ${naira(b.deposit)} deposit for my ${style} booking on ${b.date} at ${b.time}. Here's my proof of payment.`);
  const waChat = waLink(`Hi Privé by Luchi! I just booked ${style} for ${b.date} at ${b.time}. A quick question about my appointment:`);

  const row = (label, value, hi) =>
    `<tr>
      <td style="padding:9px 0;color:${MUTED};font-size:14px;border-bottom:1px solid ${LINE};">${esc(label)}</td>
      <td style="padding:9px 0;color:${hi ? PINK_DEEP : INK};font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid ${LINE};">${value}</td>
    </tr>`;

  const card = (title, inner) =>
    `<div style="background:#ffffff;border:1px solid ${LINE};border-radius:16px;padding:20px 22px;margin:0 0 16px;">
      <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${PINK};font-weight:700;margin:0 0 12px;">${title}</div>
      ${inner}
    </div>`;

  const appt = card("Your appointment", `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${row("Style", esc(style))}
      ${b.size ? row("Size / Type", esc(b.size)) : ""}
      ${b.addons && b.addons !== "None" ? row("Add-ons", esc(b.addons)) : ""}
      ${row("Date", esc(prettyDate(b.date)))}
      ${row("Time", esc(b.time))}
      ${row("Where", "We come to you 🌸<br><span style='font-weight:400;color:" + MUTED + "'>" + esc(b.address) + "</span>")}
    </table>`);

  const receipt = card("Receipt", `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${b.peak_fee ? row(`${b.peak_label || "Peak"} date fee (incl.)`, naira(b.peak_fee)) : ""}
      ${row("Service total", naira(b.total))}
      ${row(`Deposit to secure (${depPct(b)}%)`, naira(b.deposit), true)}
      ${row("Balance on the day", naira(balance) + " <span style='font-weight:400;color:" + MUTED + ";font-size:12px;'>+ logistics</span>")}
    </table>`);

  const logistics =
    `<div style="background:#FFF4E5;border:1px solid #F6D9A8;border-radius:14px;padding:16px 18px;margin:0 0 16px;">
      <div style="font-size:14px;color:#8a5a00;line-height:1.55;">
        🚗 <b>Logistics / transport fee:</b> this depends on your location and is <b>not included above</b>. We'll confirm it with you on WhatsApp shortly, before your appointment.
      </div>
    </div>`;

  const next = card("What happens next", `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr><td style="padding:4px 0;color:${INK};font-size:14px;line-height:1.5;">1. We'll reach out on WhatsApp to confirm your slot and your logistics fee.</td></tr>
      <tr><td style="padding:4px 0;color:${INK};font-size:14px;line-height:1.5;">2. Pay the <b>${naira(b.deposit)}</b> deposit to the account below to lock in your appointment.</td></tr>
      <tr><td style="padding:4px 0;color:${INK};font-size:14px;line-height:1.5;">3. Settle the balance (plus logistics) on the day, once your braids are done.</td></tr>
    </table>`);

  const deposit = card("Pay your deposit to secure the slot", `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${row("Amount", naira(b.deposit), true)}
      ${row("Bank", esc(BANK.bank))}
      ${row("Account number", esc(BANK.number))}
      ${row("Account name", esc(BANK.name))}
    </table>
    <a href="${waProof}" style="display:block;text-align:center;margin-top:16px;background:${GREEN};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 20px;border-radius:999px;">Send proof of payment on WhatsApp</a>`);

  const prep = card("How to prep", `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr><td style="padding:4px 0;color:${INK};font-size:14px;line-height:1.5;">• Come with hair washed, blow-dried and detangled.</td></tr>
      <tr><td style="padding:4px 0;color:${INK};font-size:14px;line-height:1.5;">• Have a power outlet, a comfy chair and good lighting ready.</td></tr>
      <tr><td style="padding:4px 0;color:${INK};font-size:14px;line-height:1.5;">• Need to reschedule? Please give at least 48 hours notice on WhatsApp.</td></tr>
    </table>`);

  const myCode = refCode(b.phone);
  const refer = myCode ? `<div style="background:${GREEN};border-radius:16px;padding:20px 22px;margin:0 0 16px;text-align:center;">
      <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#CFE4D8;font-weight:700;margin:0 0 8px;">Refer a friend</div>
      <div style="color:#fff;font-size:14px;line-height:1.55;margin-bottom:12px;">Share your code, your friend gets <b>${naira(REFERRAL_DISCOUNT)} off</b> their first booking, and you get <b>${naira(REFERRAL_REWARD)} off</b> your next one.</div>
      <div style="display:inline-block;background:#fff;color:${GREEN};font-family:Georgia,serif;font-weight:700;font-size:22px;letter-spacing:2px;padding:10px 22px;border-radius:999px;">${esc(myCode)}</div>
    </div>` : "";

  return `<!doctype html><html><body style="margin:0;padding:0;background:${CREAM};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Privé by Luchi booking for ${esc(style)} on ${esc(prettyDate(b.date))} is received.</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:28px 14px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
        <tr><td style="text-align:center;padding:4px 0 22px;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${GREEN};font-weight:700;">Privé <span style="color:${PINK};">✿</span> by Luchi</div>
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${PINK};font-weight:700;margin-top:6px;">Booking received</div>
        </td></tr>
        <tr><td style="padding:0 2px 18px;">
          <div style="font-size:16px;color:${INK};line-height:1.6;">
            Hi ${esc(firstName(b.name))},<br>
            Thank you for booking with Privé by Luchi. Here's a summary of your appointment, we can't wait to have you in the chair. 🌸
          </div>
        </td></tr>
        <tr><td>${appt}${receipt}${logistics}${next}${deposit}${prep}${refer}</td></tr>
        <tr><td style="padding:10px 2px 0;">
          <a href="${waChat}" style="display:block;text-align:center;background:${PINK};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 20px;border-radius:999px;">Message us on WhatsApp</a>
        </td></tr>
        <tr><td style="padding:26px 2px 6px;text-align:center;">
          <div style="font-size:13px;color:${MUTED};line-height:1.7;">
            Privé by Luchi · Luxury Mobile Braiding Studio<br>
            Lagos, Nigeria · we come to you, anywhere in Nigeria<br>
            <a href="${IG}" style="color:${PINK_DEEP};text-decoration:none;">Instagram</a> ·
            <a href="${TIKTOK}" style="color:${PINK_DEEP};text-decoration:none;">TikTok</a> ·
            <a href="https://privebyluchi.com" style="color:${PINK_DEEP};text-decoration:none;">privebyluchi.com</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`;
}

function buildText(b) {
  const balance = Math.max(0, Number(b.total || 0) - Number(b.deposit || 0));
  const style = `${b.style || ""}${b.variant ? ` (${b.variant})` : ""}`.trim();
  return [
    `Hi ${firstName(b.name)},`,
    ``,
    `Thank you for booking with Privé by Luchi. Here is your appointment summary.`,
    ``,
    `YOUR APPOINTMENT`,
    `Style: ${style}`,
    b.size ? `Size / Type: ${b.size}` : null,
    b.addons && b.addons !== "None" ? `Add-ons: ${b.addons}` : null,
    `Date: ${prettyDate(b.date)}`,
    `Time: ${b.time}`,
    `Where: We come to you — ${b.address}`,
    ``,
    `RECEIPT`,
    `Service total: ${naira(b.total)}`,
    ...(b.peak_fee ? [`${b.peak_label || "Peak"} date fee (incl.): ${naira(b.peak_fee)}`] : []),
    `Deposit to secure (${depPct(b)}%): ${naira(b.deposit)}`,
    `Balance on the day: ${naira(balance)} + logistics`,
    ``,
    `LOGISTICS / TRANSPORT FEE`,
    `This depends on your location and is not included above. We'll confirm it with you on WhatsApp shortly.`,
    ``,
    `WHAT HAPPENS NEXT`,
    `1. We'll reach out on WhatsApp to confirm your slot and logistics fee.`,
    `2. Pay the ${naira(b.deposit)} deposit to lock in your appointment:`,
    `   ${BANK.bank} — ${BANK.number} — ${BANK.name}`,
    `3. Settle the balance (plus logistics) on the day.`,
    ``,
    `HOW TO PREP`,
    `- Come with hair washed, blow-dried and detangled.`,
    `- Have a power outlet, a comfy chair and good lighting ready.`,
    `- To reschedule, give at least 48 hours notice on WhatsApp.`,
    ``,
    `WhatsApp us: https://wa.me/${WHATSAPP}`,
    `Privé by Luchi · Luxury Mobile Braiding Studio · Lagos, Nigeria`,
    `privebyluchi.com`,
  ].filter(Boolean).join("\n");
}

/* ---------- admin calendar invite (.ics) ---------- */
// Convert "9:00 AM" -> "0900"; default to 09:00 if unparseable.
function to24h(t) {
  const m = String(t || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return { h: 9, min: 0 };
  let h = parseInt(m[1], 10); const min = parseInt(m[2], 10);
  const ap = (m[3] || "").toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return { h, min };
}
const pad = (n) => String(n).padStart(2, "0");
function icsEscape(s) {
  return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
// Build an importable VCALENDAR with a 1-day-before alarm. DTSTART is written
// as floating local time (no Z) so it shows at the booked clock time in the
// admin's calendar (Lagos). Duration defaults to 4h.
function buildICS(b) {
  const style = `${b.style || "Appointment"}${b.variant ? ` (${b.variant})` : ""}`.trim();
  const { h, min } = to24h(b.time);
  const ymd = String(b.date).replace(/-/g, "");
  const start = `${ymd}T${pad(h)}${pad(min)}00`;
  const endH = (h + 4) % 24;
  const end = `${ymd}T${pad(endH)}${pad(min)}00`;
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const uid = `${ymd}-${pad(h)}${pad(min)}-${String(b.phone || "").replace(/\D/g, "") || Math.random().toString(36).slice(2)}@privebyluchi.com`;
  const desc = [
    `Client: ${b.name || "Unknown"}`,
    `Phone: ${b.phone || "—"}`,
    `Style: ${style}${b.size ? ` · ${b.size}` : ""}`,
    b.addons && b.addons !== "None" ? `Add-ons: ${b.addons}` : "",
    `Total: ${naira(b.total)} · Deposit: ${naira(b.deposit)}`,
    `Address: ${b.address || "—"}`,
    `WhatsApp: https://wa.me/${String(b.phone || "").replace(/\D/g, "").replace(/^0/, "234")}`,
  ].filter(Boolean).join("\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Prive by Luchi//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(`Privé: ${style} — ${b.name || "Client"}`)}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${icsEscape(b.address || "Client address (mobile)")}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`Tomorrow: ${style} for ${b.name || "a client"}`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function buildAdminHtml(b) {
  const style = `${b.style || "Appointment"}${b.variant ? ` (${b.variant})` : ""}`.trim();
  const waClient = `https://wa.me/${String(b.phone || "").replace(/\D/g, "").replace(/^0/, "234")}`;
  const row = (l, v) =>
    `<tr><td style="padding:8px 0;color:${MUTED};font-size:14px;border-bottom:1px solid ${LINE};">${esc(l)}</td><td style="padding:8px 0;color:${INK};font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid ${LINE};">${v}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:${CREAM};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:26px 14px;"><tr><td align="center">
    <table width="100%" style="max-width:560px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
      <tr><td style="text-align:center;padding-bottom:18px;">
        <div style="font-family:Georgia,serif;font-size:22px;color:${GREEN};font-weight:700;">Privé <span style="color:${PINK};">✿</span> by Luchi</div>
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${PINK};font-weight:700;margin-top:6px;">New booking</div>
      </td></tr>
      <tr><td><div style="background:#fff;border:1px solid ${LINE};border-radius:16px;padding:18px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${row("Client", esc(b.name || "Unknown"))}
          ${row("Phone", esc(b.phone || "—"))}
          ${row("Style", esc(style) + (b.size ? ` · ${esc(b.size)}` : ""))}
          ${b.addons && b.addons !== "None" ? row("Add-ons", esc(b.addons)) : ""}
          ${row("Date", esc(prettyDate(b.date)))}
          ${row("Time", esc(b.time))}
          ${row("Address", esc(b.address || "—"))}
          ${row("Total · Deposit", `${naira(b.total)} · ${naira(b.deposit)}`)}
        </table>
        <a href="${waClient}" style="display:block;text-align:center;margin-top:16px;background:${GREEN};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:999px;">Message ${esc(firstName(b.name))} on WhatsApp</a>
      </div></td></tr>
      <tr><td style="padding:16px 4px 0;text-align:center;color:${MUTED};font-size:13px;line-height:1.6;">
        📅 The calendar invite is attached, add it and you'll get a reminder <b>a day before</b>.<br>
        You'll also get an automatic email reminder the morning before each appointment.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

// Send one email through Resend. Returns {ok, id|error}.
async function sendResend(key, payload) {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return { ok: false, error: (await r.text()).slice(0, 300) };
    const d = await r.json();
    return { ok: true, id: d.id };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}

export { buildHtml, buildText, buildICS, buildAdminHtml }; // named exports for local preview/tests; Vercel uses the default

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: "Email not configured" });

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};

  const email = String(b.email || "").trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk || !b.date || !b.time) {
    return res.status(400).json({ error: "Missing or invalid booking details" });
  }

  // Anti-abuse: only send if a booking actually exists for this date + time.
  try {
    const q = `${SUPABASE_URL}/rest/v1/bookings?select=date,time&date=eq.${encodeURIComponent(b.date)}&time=eq.${encodeURIComponent(b.time)}&limit=1`;
    const check = await fetch(q, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    const rows = await check.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(409).json({ error: "No matching booking found" });
    }
  } catch {
    // If the check itself fails, don't block the receipt — the booking flow
    // only calls this right after a successful insert.
  }

  const style = `${b.style || "appointment"}${b.variant ? ` (${b.variant})` : ""}`.trim();

  // 1) Customer receipt (this is the response status the booking flow cares about).
  const cust = await sendResend(key, {
    from: FROM,
    to: [email],
    reply_to: REPLY_TO,
    subject: `Your Privé by Luchi booking — ${style} on ${prettyDate(b.date)} 🌸`,
    html: buildHtml(b),
    text: buildText(b),
  });

  // 2) Admin notification + calendar invite (.ics with a 1-day-before alarm).
  //    Non-fatal: a failure here must not fail the customer receipt.
  let adminOk = false;
  try {
    const ics = buildICS(b);
    const admin = await sendResend(key, {
      from: FROM,
      to: [ADMIN],
      subject: `📅 New booking — ${b.name || "Client"} · ${style} · ${prettyDate(b.date)}`,
      html: buildAdminHtml(b),
      text: `New booking\n\nClient: ${b.name}\nPhone: ${b.phone}\nStyle: ${style}${b.size ? " · " + b.size : ""}\nDate: ${prettyDate(b.date)}\nTime: ${b.time}\nAddress: ${b.address}\nTotal: ${naira(b.total)} · Deposit: ${naira(b.deposit)}\n\nAdd the attached calendar invite to be reminded a day before.`,
      attachments: [{
        filename: `prive-booking-${b.date}.ics`,
        content: Buffer.from(ics, "utf-8").toString("base64"),
        content_type: "text/calendar; method=PUBLISH",
      }],
    });
    adminOk = admin.ok;
  } catch { /* ignore */ }

  // 3) If this booking used a referral code, reward the referrer by email.
  //    Non-fatal and can't reward self.
  let referrerNotified = false;
  try {
    if (b.referred_by && refCode(b.phone) !== normCode(b.referred_by)) {
      const ref = await findReferrer(b.referred_by);
      if (ref) {
        const rr = await sendResend(key, {
          from: FROM,
          to: [ref.email],
          reply_to: REPLY_TO,
          subject: `🎉 Someone booked with your Privé referral code`,
          html: `<div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:26px 18px;color:${INK};">
            <div style="text-align:center;font-family:Georgia,serif;font-size:22px;color:${GREEN};font-weight:700;">Privé <span style="color:${PINK};">✿</span> by Luchi</div>
            <p style="font-size:16px;line-height:1.6;margin-top:18px;">Hi ${esc(firstName(ref.name))}, great news, someone just booked using your referral code. 💖</p>
            <p style="font-size:16px;line-height:1.6;">That means <b>${naira(REFERRAL_REWARD)} off your next appointment</b>. Just mention it when you book and we'll apply it.</p>
            <p style="margin-top:20px;"><a href="https://privebyluchi.com/#book" style="background:${PINK};color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px;">Book your next style</a></p>
            <p style="color:${MUTED};font-size:12.5px;margin-top:24px;">Keep sharing your code, the rewards keep coming. Privé by Luchi · Lagos, Nigeria</p>
          </div>`,
          text: `Hi ${firstName(ref.name)}, someone booked with your Privé referral code! That's ${naira(REFERRAL_REWARD)} off your next appointment, just mention it when you book. https://privebyluchi.com/#book`,
        });
        referrerNotified = rr.ok;
      }
    }
  } catch { /* ignore */ }

  if (!cust.ok) {
    return res.status(502).json({ error: "Email provider error", detail: cust.error, adminOk });
  }
  return res.status(200).json({ ok: true, id: cust.id, adminOk, referrerNotified });
}
