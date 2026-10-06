// ── Flutterwave v4 deposit by transfer ─────────────────
// /api/flw-charge asks Flutterwave for a one-off account number for this
// booking's exact deposit; the page then polls /api/flw-verify until the
// transfer lands (the webhook confirms it too, if the tab is closed). Only
// the server decides the amount and marks a booking paid.

async function post(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}

// → { charge_id, amount, account_number, bank_name, account_name, expires_at, note } or { error }
export const createTransfer = (date, time) => post("/api/flw-charge", { date, time });

// → { paid, pending?, reason? }
export const checkTransfer = (chargeId) => post("/api/flw-verify", { charge_id: chargeId });
