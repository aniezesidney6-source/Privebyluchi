// Checks the admin quick password server-side (it used to sit in the page's
// JavaScript where anyone could read it) and returns a 12h session token.

import { passwordOk, issueToken } from "./_admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({ error: "not_configured" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (passwordOk(String(body?.password || ""))) {
    return res.status(200).json({ token: issueToken() });
  }
  // Slow every wrong guess down.
  await new Promise((r) => setTimeout(r, 1200));
  return res.status(401).json({ error: "wrong_password" });
}
