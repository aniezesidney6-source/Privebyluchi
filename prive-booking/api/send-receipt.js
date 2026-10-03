// Vercel serverless function: emails the customer a branded booking receipt
// via Resend. Fired by the booking flow after a booking is saved.
//
// Env: RESEND_API_KEY (set in the Vercel project).
// Sends from the verified domain luxuriousluchihairs.com; replies go to the
// owner's inbox. To avoid being an open spam relay, it only sends when a
// matching booking row (same date + time) actually exists in Supabase.

const FROM = "Privé by Luchi <bookings@luxuriousluchihairs.com>";
const REPLY_TO = "luxuriousluchihairs@gmail.com";

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";

const BANK = { bank: "Access Bank", number: "1666059382", name: "Luxurious Luchihairs" };
const WHATSAPP = "2348156973807";
const IG = "https://www.instagram.com/priveby_luchi";
const TIKTOK = "https://www.tiktok.com/@priveby_luchi";

const PINK = "#E85A8A", PINK_DEEP = "#C63E6C", GREEN = "#1E4D3E", INK = "#26201F", MUTED = "#7A6E70", CREAM = "#FFFBF9", LINE = "#EFE3E8";

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");
const firstName = (n) => (String(n || "").trim().split(/\s+/)[0] || "love");

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
      ${row("Service total", naira(b.total))}
      ${row("Deposit to secure (30%)", naira(b.deposit), true)}
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
        <tr><td>${appt}${receipt}${logistics}${next}${deposit}${prep}</td></tr>
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
    `Deposit to secure (30%): ${naira(b.deposit)}`,
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

export { buildHtml, buildText }; // named exports for local preview/tests; Vercel uses the default

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

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        reply_to: REPLY_TO,
        subject: `Your Privé by Luchi booking — ${`${b.style || "appointment"}${b.variant ? ` (${b.variant})` : ""}`.trim()} on ${prettyDate(b.date)} 🌸`,
        html: buildHtml(b),
        text: buildText(b),
      }),
    });
    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: "Email provider error", detail: detail.slice(0, 300) });
    }
    const data = await r.json();
    return res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    return res.status(500).json({ error: "Failed to send", detail: String(e).slice(0, 200) });
  }
}
