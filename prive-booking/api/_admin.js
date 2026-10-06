// Admin quick-password sessions. The password lives only in the Vercel env
// (ADMIN_PASSWORD), never in the site's code. A correct password gets a
// signed token, valid 12h, keyed to the password itself, so changing the
// password signs everyone out.

import { createHmac, timingSafeEqual } from "crypto";

const TTL = 12 * 3600 * 1000;
const password = () => String(process.env.ADMIN_PASSWORD || "");

const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};
const sign = (exp) => createHmac("sha256", `prive-admin|${password()}`).update(String(exp)).digest("base64url");

export const passwordOk = (pw) => password().length >= 8 && same(pw, password());

export function issueToken() {
  const exp = Date.now() + TTL;
  return `adm.${exp}.${sign(exp)}`;
}

export function tokenOk(token) {
  const m = /^adm\.(\d+)\.([A-Za-z0-9_-]+)$/.exec(String(token || ""));
  if (!m || !password() || Number(m[1]) < Date.now()) return false;
  return same(m[2], sign(m[1]));
}
