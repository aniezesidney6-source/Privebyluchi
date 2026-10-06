// Settles Flutterwave transfers the booking page didn't see land. Runs daily
// (vercel.json) and whenever the admin dashboard loads. Replaces a webhook,
// since the Flutterwave account's single webhook URL is used elsewhere.
// Safe to call openly: it only marks bookings whose payment Flutterwave
// itself reports as succeeded and covering the deposit.

import { sweep } from "./_flw.js";

export default async function handler(req, res) {
  try {
    return res.status(200).json(await sweep());
  } catch {
    return res.status(200).json({ checked: 0, settled: 0, reason: "error" });
  }
}
