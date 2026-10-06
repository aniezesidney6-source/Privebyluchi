// ── Flutterwave v3 deposit checkout ────────────────────
// /api/flw-init prices the deposit server-side and returns the checkout
// details; Flutterwave's pop-up takes card, bank transfer or USSD; then
// /api/flw-verify re-checks the payment with Flutterwave before the booking
// is marked paid. /api/flw-sweep catches any payment the page didn't see.

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

async function post(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}

// Resolves "paid" | "unverified" | "closed" | "manual" (online payment not
// set up) | "already_paid"; rejects if the checkout can't start.
export async function payDeposit(date, time) {
  const [init] = await Promise.all([post("/api/flw-init", { date, time }), loadScript()]);
  if (init.error === "not_configured") return "manual";
  if (init.error === "already_paid") return "already_paid";
  if (init.error) throw new Error(init.error);

  return new Promise((resolve) => {
    let settled = false, verifying = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    const modal = window.FlutterwaveCheckout({
      public_key: init.public_key,
      tx_ref: init.tx_ref,
      amount: init.amount,
      currency: init.currency,
      payment_options: "card, banktransfer, ussd",
      customer: init.customer,
      customizations: {
        title: "Privé by Luchi",
        description: init.description,
        logo: "https://privebyluchi.com/favicon-192.png",
      },
      callback: async (data) => {
        verifying = true; // closing the modal below fires onclose — ignore it
        try { modal?.close?.(); } catch { /* ignore */ }
        try {
          const r = await post("/api/flw-verify", { transaction_id: data.transaction_id });
          done(r.paid ? "paid" : "unverified");
        } catch { done("unverified"); }
      },
      onclose: () => { if (!verifying) done("closed"); },
    });
  });
}
