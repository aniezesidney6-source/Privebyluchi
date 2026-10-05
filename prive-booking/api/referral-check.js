// Validates a referral code against existing clients. Codes are derived
// deterministically from a client's phone (see refCode), so we recompute each
// client's code and look for a match. Read-only; returns only the referrer's
// first name (never their phone/email).

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";

function refCode(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length < 7) return "";
  let h = 2166136261;
  for (let i = 0; i < d.length; i++) { h ^= d.charCodeAt(i); h = Math.imul(h, 16777619); }
  return "PRV-" + (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 5);
}
const norm = (c) => String(c || "").trim().toUpperCase().replace(/\s+/g, "");

// Find the client (name/phone/email) whose referral code matches `code`.
async function findReferrer(code) {
  const want = norm(code);
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
    if (refCode(d) === want) return { name: b.name, phone: d, email: b.email };
  }
  return null;
}

export { refCode, norm, findReferrer };

export default async function handler(req, res) {
  const code = norm(req.query && req.query.code);
  if (!/^PRV-[A-Z0-9]{5}$/.test(code)) {
    return res.status(200).json({ valid: false, reason: "format" });
  }
  try {
    const ref = await findReferrer(code);
    if (!ref) return res.status(200).json({ valid: false });
    const firstName = String(ref.name || "a client").trim().split(/\s+/)[0] || "a client";
    return res.status(200).json({ valid: true, referrerFirstName: firstName });
  } catch (e) {
    return res.status(200).json({ valid: false, reason: "error" });
  }
}
