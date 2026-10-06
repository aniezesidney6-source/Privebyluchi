// Flutterwave webhook: the backup path for when a client pays and closes the
// tab before the browser callback reaches /api/flw-verify.
//
// Setup (Flutterwave dashboard → Settings → Webhooks):
//   URL: https://privebyluchi.com/api/flw-webhook
//   Secret hash: any long random string, also saved in Vercel as FLW_SECRET_HASH.

import { settle } from "./_flw.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const hash = process.env.FLW_SECRET_HASH;
  if (!hash || req.headers["verif-hash"] !== hash) return res.status(401).end();

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const data = (body && body.data) || {};
  if (body && body.event === "charge.completed" && data.status === "successful") {
    try { await settle(data.id); } catch { /* Flutterwave retries on non-200 only; settle is idempotent */ }
  }
  return res.status(200).end();
}
