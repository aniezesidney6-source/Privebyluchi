// Called by the browser after Flutterwave checkout completes. The callback
// data is only a hint: settle() re-verifies the transaction with Flutterwave
// and checks the amount before marking the booking paid.

import { settle } from "./_flw.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  try {
    const out = await settle(body && body.transaction_id);
    return res.status(200).json(out);
  } catch {
    return res.status(200).json({ paid: false, reason: "error" });
  }
}
