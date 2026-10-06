// Flutterwave v4 webhook: confirms transfers even if the client has closed
// the booking page.
//
// Setup (Flutterwave dashboard → Settings → Webhooks):
//   URL: https://privebyluchi.com/api/flw-webhook
//   Secret hash: any long random string, also saved in Vercel as FLW_SECRET_HASH.
// v4 signs each delivery as base64(HMAC-SHA256(raw body, secret hash)) in the
// `flutterwave-signature` header; the older `verif-hash` header is accepted too.

import { createHmac, timingSafeEqual } from "crypto";
import { settle } from "./_flw.js";

const readRaw = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => resolve(Buffer.concat(chunks)));
  req.on("error", reject);
});

const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const hash = process.env.FLW_SECRET_HASH;
  if (!hash) return res.status(401).end();

  const raw = await readRaw(req);
  const sig = req.headers["flutterwave-signature"];
  const ok = sig
    ? same(sig, createHmac("sha256", hash).update(raw).digest("base64"))
    : same(req.headers["verif-hash"] || "", hash);
  if (!ok) return res.status(401).end();

  let body = {};
  try { body = JSON.parse(raw.toString("utf8")); } catch { /* ignore */ }
  const event = body.type || body.event;
  const data = body.data || {};
  if (event === "charge.completed" && data.id) {
    // settle() re-fetches the charge, so the payload itself is never trusted.
    try { await settle(data.id); } catch { /* idempotent; a retry is harmless */ }
  }
  return res.status(200).end();
}
