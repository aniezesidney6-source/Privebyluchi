// Privé by Luchi — design tokens (shared with CSS variables in styles.css)
export const COLORS = {
  pink: "#E85A8A",
  pinkDeep: "#C63E6C",
  pinkSoft: "#FBE4EC",
  pinkTint: "#FFF4F8",
  green: "#1E4D3E",
  greenDeep: "#153A2E",
  greenSoft: "#E7F0EC",
  cream: "#FFFBF9",
  white: "#FFFFFF",
  ink: "#26201F",
  muted: "#7A6E70",
  line: "#EFE3E8",
};

// Contact / brand details
export const CONTACT = {
  name: "Privé by Luchi",
  tagline: "Luxury Mobile Braiding Studio",
  base: "Lagos Mainland",
  coverage: "Available anywhere in Nigeria, logistics covered by the client",
  instagram: "https://www.instagram.com/priveby_luchi?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  instagramHandle: "@priveby_luchi",
  tiktok: "https://www.tiktok.com/@priveby_luchi?is_from_webapp=1&sender_device=pc",
  tiktokHandle: "@priveby_luchi",
  whatsapp: "2348156973807", // +234 815 697 3807
  whatsappDisplay: "+234 815 697 3807",
  email: "luxuriousluchihairs@gmail.com",
  hours: "Appointments 9:00 AM – 4:00 PM · Mon – Sat",
};

// Deposit account
export const BANK = {
  bank: "Access Bank",
  number: "1666059382",
  name: "Luxurious Luchihairs",
};

export const whatsappLink = (msg = "Hi Privé by Luchi! I'd like to book a braiding appointment.") =>
  `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(msg)}`;

export const fmt = (n) => `₦${n.toLocaleString()}`;

// ── Referral program ───────────────────────────────────
// A client's referral code is derived deterministically from their phone, so
// the same code can be re-computed anywhere (client + serverless) without a
// lookup table. Share it, and both the referrer and the new client get money off.
export const REFERRAL_DISCOUNT = 3000; // ₦ off for the referred new client
export const REFERRAL_REWARD = 3000;   // ₦ off the referrer's next booking

export function refCode(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length < 7) return "";
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < d.length; i++) { h ^= d.charCodeAt(i); h = Math.imul(h, 16777619); }
  return "PRV-" + (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 5);
}
export const normCode = (c) => String(c || "").trim().toUpperCase().replace(/\s+/g, "");
