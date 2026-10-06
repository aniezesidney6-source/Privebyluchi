// Creates a Flutterwave v4 pay-with-transfer charge for a booking's deposit and
// returns the one-off account number. The browser only names the booking
// (date + time); the amount is computed server-side from the price list.

import { createTransferCharge } from "./_flw.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  try {
    const out = await createTransferCharge(String(body?.date || ""), String(body?.time || ""));
    if (out.error) console.error("flw-charge:", out.error, out.detail || "");
    return res.status(out.error ? 400 : 200).json(out);
  } catch (e) {
    console.error("flw-charge:", e.message);
    return res.status(502).json({ error: "flutterwave_error", detail: e.message });
  }
}
