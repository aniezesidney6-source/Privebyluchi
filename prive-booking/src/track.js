// Lightweight first-party visit tracking for Privé by Luchi.
// Records one visit per browser session to Supabase (with approximate
// location + traffic source), and emails the owner at most once per day
// per device (throttled) so the inbox / Web3Forms quota isn't flooded.

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";
const WEB3FORMS_KEY = "9fc37df0-a3dd-4874-b8e4-711c80aaee35";

function readableSource(ref) {
  if (!ref) return "Direct / typed URL";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (host.includes(location.hostname)) return "Internal";
    const map = [
      ["instagram", "Instagram"], ["l.instagram", "Instagram"],
      ["tiktok", "TikTok"],
      ["wa.me", "WhatsApp"], ["whatsapp", "WhatsApp"],
      ["facebook", "Facebook"], ["fb.", "Facebook"], ["l.facebook", "Facebook"],
      ["google", "Google"], ["bing", "Bing"],
      ["t.co", "X / Twitter"], ["twitter", "X / Twitter"], ["x.com", "X / Twitter"],
      ["youtube", "YouTube"], ["linkedin", "LinkedIn"], ["snapchat", "Snapchat"],
    ];
    for (const [needle, name] of map) if (host.includes(needle)) return name;
    return host;
  } catch { return "Other"; }
}

// Stable per-browser id so the dashboard can tell returning vs new visitors.
function visitorId() {
  try {
    let id = localStorage.getItem("pv_vid");
    if (!id) {
      id = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("pv_vid", id);
    }
    return id;
  } catch { return null; }
}

export async function trackVisit() {
  // One visit per browser session (a refresh spree doesn't inflate the count).
  try {
    if (sessionStorage.getItem("pv_visit")) return;
    sessionStorage.setItem("pv_visit", "1");
  } catch { /* private mode: fall through and still record once */ }

  const referrer = document.referrer || "";
  const source = readableSource(referrer);
  const device = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "Mobile" : "Desktop";

  // Approximate location (free, no key). Never store the raw IP.
  let geo = {};
  try {
    const r = await fetch("https://get.geojs.io/v1/ip/geo.json");
    if (r.ok) {
      const g = await r.json();
      geo = { country: g.country || null, region: g.region || null, city: g.city || null };
    }
  } catch { /* geo is best-effort */ }

  const visit = {
    path: location.pathname || "/",
    referrer: referrer || null,
    source,
    device,
    country: geo.country || null,
    region: geo.region || null,
    city: geo.city || null,
    visitor_id: visitorId(),
  };

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/visits`, { method: "POST", headers, body: JSON.stringify(visit) });
    if (!res.ok) {
      // visitor_id column may not be migrated yet — record the visit without it
      const { visitor_id, ...rest } = visit;
      await fetch(`${SUPABASE_URL}/rest/v1/visits`, { method: "POST", headers, body: JSON.stringify(rest) });
    }
  } catch { /* offline / table missing: silently skip */ }

  notifyOwnerThrottled(visit);
}

// Email the owner at most once per calendar day per device.
async function notifyOwnerThrottled(visit) {
  try {
    const todayKey = "pv_email_" + new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(todayKey)) return;
    localStorage.setItem(todayKey, "1");
    // tidy up previous days' flags
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("pv_email_") && k !== todayKey) localStorage.removeItem(k);
    }

    const place = [visit.city, visit.region, visit.country].filter(Boolean).join(", ") || "Unknown location";
    await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: "👀 New visitor on Privé by Luchi",
        from_name: "Privé by Luchi Website",
        message:
          `Someone just visited your website.\n\n` +
          `Location: ${place}\n` +
          `Came from: ${visit.source}\n` +
          `Device: ${visit.device}\n` +
          `Time: ${new Date().toLocaleString()}\n\n` +
          `You'll get at most one visitor alert per day from each device. ` +
          `See the full live breakdown in your admin dashboard.`,
      }),
    });
  } catch { /* never let a notification failure affect the visitor */ }
}
