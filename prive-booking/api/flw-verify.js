// Polled by the booking page while the client makes their transfer. settle()
// re-fetches the charge from Flutterwave and checks the amount before marking
// the booking paid, so nothing the browser sends is trusted.

import { settle } from "./_flw.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  try {
    return res.status(200).json(await settle(body && body.charge_id));
  } catch {
    return res.status(200).json({ paid: false, reason: "error" });
  }
}
