// Returns what the Flutterwave pop-up checkout needs for a booking's deposit.
// The browser only names the booking (date + time); the amount and reference
// are set here, from the price list.

import { checkoutFor } from "./_flw.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  try {
    const out = await checkoutFor(String(body?.date || ""), String(body?.time || ""));
    if (out.error) console.error("flw-init:", out.error);
    return res.status(out.error ? 400 : 200).json(out);
  } catch (e) {
    console.error("flw-init:", e.message);
    return res.status(502).json({ error: "server_error" });
  }
}
