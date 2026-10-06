// ── Flutterwave deposit checkout ───────────────────────
// Opens Flutterwave's inline checkout (card, bank transfer, USSD) for a
// booking's deposit, then asks /api/flw-verify to confirm it server-side.
// The browser callback is never trusted on its own: only the verify endpoint
// marks a booking as paid.
//
// Env (Vercel, build-time): VITE_FLW_PUBLIC_KEY. Without it, the site falls
// back to the manual bank-transfer flow.

export const FLW_PUBLIC_KEY = import.meta.env.VITE_FLW_PUBLIC_KEY || "";
export const payOnline = Boolean(FLW_PUBLIC_KEY);

let scriptPromise;
function loadScript() {
  if (window.FlutterwaveCheckout) return Promise.resolve();
  scriptPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.flutterwave.com/v3.js";
    s.async = true;
    s.onload = resolve;
    s.onerror = () => { scriptPromise = null; reject(new Error("checkout failed to load")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// The booking is identified by its date + time (one appointment a day), which
// the server decodes back out of the reference.
const b64url = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const txRef = (date, time) => `prive_${b64url(`${date}|${time}`)}_${Date.now().toString(36)}`;

// Resolves "paid" | "unverified" | "closed". Rejects only if checkout can't load.
export async function payDeposit({ amount, date, time, name, email, phone, style }) {
  await loadScript();
  return new Promise((resolve) => {
    let settled = false, verifying = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    const modal = window.FlutterwaveCheckout({
      public_key: FLW_PUBLIC_KEY,
      tx_ref: txRef(date, time),
      amount,
      currency: "NGN",
      payment_options: "card, banktransfer, ussd",
      customer: { email, phone_number: phone, name },
      customizations: {
        title: "Privé by Luchi",
        description: `Deposit · ${style} · ${date}`,
        logo: "https://privebyluchi.com/favicon-192.png",
      },
      callback: async (data) => {
        verifying = true; // closing the modal below fires onclose — ignore it
        try { modal?.close?.(); } catch { /* ignore */ }
        try {
          const r = await fetch("/api/flw-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transaction_id: data.transaction_id }),
          });
          const d = await r.json();
          done(d.paid ? "paid" : "unverified");
        } catch { done("unverified"); }
      },
      onclose: () => { if (!verifying) done("closed"); },
    });
  });
}
