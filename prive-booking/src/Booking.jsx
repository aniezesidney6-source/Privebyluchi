import { useState, useEffect, useRef } from "react";
import { SERVICES, EXTRAS, TIMES } from "./data";
import { fmt, BANK, whatsappLink, refCode, normCode, REFERRAL_DISCOUNT } from "./theme";
import { IconCheck, IconBloom, IconWhatsapp } from "./Icons";
import { SEASON, seasonFor, earlyDiscountFor, depositRateFor } from "./season";

const SEASON_EARLY = SEASON.earlyDiscount;
import { payDeposit } from "./pay";

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";
const SUPA_HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };
const WEB3FORMS_KEY = "9fc37df0-a3dd-4874-b8e4-711c80aaee35";

const minDate = () => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split("T")[0]; };

// /?date=2026-12-21#book (from the /december page) pre-fills the date.
const urlDate = () => {
  try {
    const d = new URLSearchParams(window.location.search).get("date") || "";
    return /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= minDate() ? d : "";
  } catch { return ""; }
};

const STEPS = ["Service", "Schedule", "Details", "Confirm"];

function Steps({ step }) {
  return (
    <div className="steps">
      {STEPS.map((s, i) => {
        const n = i + 1, done = n < step, active = n === step;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div className={`steps__item ${active ? "on" : ""}`}>
              <div className={`steps__dot ${active ? "active" : ""} ${done ? "done" : ""}`}>
                {done ? <IconCheck style={{ width: 14, height: 14 }} /> : n}
              </div>
              <span>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`steps__bar ${done ? "done" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function Booking() {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(null);
  const [variant, setVariant] = useState(null);
  const [size, setSize] = useState(null);
  const [extras, setExtras] = useState({ extraLength: false, boho: false, beads: false });
  const [date, setDate] = useState(urlDate);
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookedDates, setBookedDates] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [datesLoaded, setDatesLoaded] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [payState, setPayState] = useState(""); // "" | opening | paid | unverified | error | manual
  const [refInput, setRefInput] = useState("");
  const [refStatus, setRefStatus] = useState(""); // "" | checking | valid | invalid | self
  const [refName, setRefName] = useState("");
  const refApplied = refStatus === "valid";

  const copyAcct = () => {
    navigator.clipboard?.writeText(BANK.number)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); })
      .catch(() => {});
  };

  // Keep the top of the booking panel in view when the step changes, so the
  // shorter step 2/3/4 don't leave the user staring at the section below it.
  // Compare the actual step value (not a "first render" flag) so React
  // StrictMode's double-invoked mount effect can't scroll the page on load.
  const panelRef = useRef(null);
  const prevStep = useRef(step);
  useEffect(() => {
    if (prevStep.current === step) return; // mount / no real change
    prevStep.current = step;
    const el = panelRef.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 90; // clear the sticky nav
    window.scrollTo({ top: y, behavior: "smooth" });
  }, [step]);

  const fetchBookedDates = async () => {
    setDatesLoaded(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=date`, { headers: SUPA_HEADERS });
      const data = await res.json();
      setBookedDates([...new Set(data.map((b) => b.date))]);
      if (date && data.some((b) => b.date === date)) setDateError(true);
    } catch { setBookedDates([]); }
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/blocked_dates?select=date`, { headers: SUPA_HEADERS });
      const data = await res.json();
      if (Array.isArray(data)) {
        setBlockedDates(data.map((b) => b.date));
        if (date && data.some((b) => b.date === date)) setDateError(true);
      }
    } catch { /* table may not exist yet */ }
    if (date) fetchBookedTimes(date);
  };

  const fetchBookedTimes = async (d) => {
    if (!d) return;
    setLoadingSlots(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=time&date=eq.${d}`, { headers: SUPA_HEADERS });
      const data = await res.json();
      setBookedTimes(data.map((b) => b.time));
    } catch { setBookedTimes([]); } finally { setLoadingSlots(false); }
  };

  const service = SERVICES.find((s) => s.id === selected);
  const isButterfly = selected === "butterfly_locs";
  const isFrontal = selected === "frontal_install";
  const availableSizes = isButterfly ? (variant ? service?.variants[variant] : null) : service?.sizes;
  const basePrice = availableSizes && size ? availableSizes[size] || 0 : 0;
  const extraFees = EXTRAS.reduce((sum, e) => sum + (extras[e.key] ? e.price : 0), 0);
  const season = seasonFor(date);
  const seasonFee = season && basePrice ? season.uplift : 0;
  const earlyOff = basePrice ? earlyDiscountFor(date) : 0;
  const subtotal = basePrice + extraFees + seasonFee;
  const discount = refApplied && subtotal > 0 ? REFERRAL_DISCOUNT : 0;
  const total = Math.max(0, subtotal - earlyOff - discount);
  const depositPct = Math.round(depositRateFor(date) * 100);
  const deposit = Math.round(total * depositRateFor(date));
  const extrasLabel = EXTRAS.filter((e) => extras[e.key]).map((e) => e.label).join(", ") || "None";

  // Validate a referral code against existing clients (can't refer yourself).
  const applyReferral = async () => {
    const code = normCode(refInput);
    if (!/^PRV-[A-Z0-9]{5}$/.test(code)) { setRefStatus("invalid"); setRefName(""); return; }
    if (form.phone && refCode(form.phone) === code) { setRefStatus("self"); setRefName(""); return; }
    setRefStatus("checking");
    try {
      const r = await fetch(`/api/referral-check?code=${encodeURIComponent(code)}`);
      const d = await r.json();
      if (d.valid) { setRefStatus("valid"); setRefName(d.referrerFirstName || ""); }
      else { setRefStatus("invalid"); setRefName(""); }
    } catch { setRefStatus("invalid"); setRefName(""); }
  };

  const canNext1 = selected && size && (!isButterfly || variant);
  const canNext2 = date && time && !dateError;
  const canNext3 = form.name && form.phone && form.email && form.address && agreed;

  const selectService = (id) => { setSelected(id); setVariant(null); setSize(null); };
  const goto2 = () => { setStep(2); if (!datesLoaded) fetchBookedDates(); };

  const submit = async () => {
    setSending(true); setSendError(false);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `✿ New Booking — ${service?.name} | Privé by Luchi`,
          from_name: "Privé by Luchi Booking",
          message: `
NEW BOOKING REQUEST — PRIVÉ BY LUCHI (Mobile Studio)

SERVICE DETAILS
───────────────
Service: ${service?.name}${isButterfly && variant ? ` (${variant})` : ""}
Size / Type: ${size}
Add-ons: ${extrasLabel}${season ? `\n${season.label} pricing: +${fmt(seasonFee)}` : ""}${earlyOff ? `\nEarly-booking discount: −${fmt(earlyOff)}` : ""}
Total: ${fmt(total)}${refApplied ? ` (referral −${fmt(discount)})` : ""}
Deposit Due (${depositPct}%): ${fmt(deposit)}${refApplied ? `\nReferred by code: ${normCode(refInput)}` : ""}

APPOINTMENT
───────────────
Date: ${date}
Time: ${time}
Location: Client's address (mobile service) — logistics/transport covered by client

CLIENT INFO
───────────────
Name: ${form.name}
Phone: ${form.phone}
Email: ${form.email}
Address / Area: ${form.address}
Notes: ${form.notes || "None"}
          `.trim(),
        }),
      });
      if (res.ok) {
        // Save the full record for the admin dashboard. If the richer columns
        // aren't in the DB yet, fall back to the minimal {date,time} insert so
        // the slot is still reserved and a booking is never lost.
        const fullRow = {
          date, time,
          name: form.name, phone: form.phone, email: form.email, address: form.address,
          notes: form.notes || null,
          style: `${service?.name || ""}${isButterfly && variant ? ` (${variant})` : ""}`.trim(),
          size: size || null,
          addons: extrasLabel === "None" ? null : extrasLabel,
          total, deposit,
          status: "pending",
        };
        try {
          const ins = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
            method: "POST",
            headers: { ...SUPA_HEADERS, Prefer: "return=minimal" },
            body: JSON.stringify(fullRow),
          });
          if (!ins.ok) {
            await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
              method: "POST",
              headers: { ...SUPA_HEADERS, Prefer: "return=minimal" },
              body: JSON.stringify({ date, time }),
            });
          } else if (refApplied) {
            // Persist the referral link if the optional column exists (non-fatal:
            // the booking is already saved, so a missing column just skips this).
            fetch(`${SUPABASE_URL}/rest/v1/bookings?date=eq.${date}&time=eq.${encodeURIComponent(time)}`, {
              method: "PATCH", headers: { ...SUPA_HEADERS, Prefer: "return=minimal" },
              body: JSON.stringify({ referred_by: normCode(refInput) }),
            }).catch(() => {});
          }
        } catch { /* non-blocking */ }

        // Email the customer a branded receipt (fire-and-forget — never block
        // or fail the booking if the email service hiccups).
        fetch("/api/send-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name, email: form.email, phone: form.phone, address: form.address,
            style: service?.name || "",
            variant: isButterfly && variant ? variant : null,
            size: size || null,
            addons: extrasLabel,
            total, deposit, date, time,
            season_fee: seasonFee || null, season_label: season ? season.label : null,
            early_discount: earlyOff || null,
            referred_by: refApplied ? normCode(refInput) : null,
          }),
        }).catch(() => {});

        setSubmitted(true);
      } else { setSendError(true); }
    } catch { setSendError(true); } finally { setSending(false); }
  };

  const startPayment = async () => {
    setPayState("opening");
    try {
      const out = await payDeposit(date, time);
      setPayState(out === "closed" ? "" : out === "already_paid" ? "paid" : out);
    } catch (e) { console.warn("Deposit checkout failed", e); setPayState("error"); }
  };

  if (submitted) {
    return (
      <section className="section booking" id="book">
        <div className="wrap">
          <div className="booking__panel">
            <div className="success">
              <div className="success__ring"><IconBloom style={{ width: 34, height: 34 }} /></div>
              <div className="eyebrow" style={{ justifyContent: "center", display: "flex" }}>Request Received</div>
              <h2 style={{ marginTop: 10 }}>See you soon, {form.name.split(" ")[0] || "love"} ✿</h2>
              <p>
                Your request for <b style={{ color: "var(--pink-deep)" }}>{service?.name}</b>
                {isButterfly && variant ? ` (${variant})` : ""} on <b style={{ color: "var(--green)" }}>{date} at {time}</b> has been received.
              </p>
              {payState === "paid" ? (
                <div className="paid">
                  <b>Deposit received ✓</b>
                  <span>Your {fmt(deposit)} deposit is confirmed and {date} is locked in. A confirmation is on its way to {form.email}.</span>
                </div>
              ) : payState !== "manual" ? (
                <>
                  <p>
                    Lock in your date now: pay your <b style={{ color: "var(--pink-deep)" }}>{fmt(deposit)}</b> deposit ({depositPct}%) by card, bank transfer or USSD, and it confirms automatically.
                  </p>
                  <button className="pill pill--pink" style={{ width: "100%" }} onClick={startPayment} disabled={payState === "opening"}>
                    {payState === "opening" ? "Opening secure checkout…" : `Pay ${fmt(deposit)} deposit`}
                  </button>
                  {payState === "unverified" && <div className="err" style={{ marginTop: 12 }}>We couldn't confirm that payment automatically. If you were charged, send us your receipt on WhatsApp and we'll sort it out.</div>}
                  {payState === "error" && <div className="err" style={{ marginTop: 12 }}>Secure checkout didn't open. Try again, or pay to the account below and send proof on WhatsApp.</div>}
                  <p style={{ fontSize: 13, marginTop: 18 }}>Or pay Luchi directly and send proof on WhatsApp:</p>
                </>
              ) : (
                <p>
                  To lock in your appointment, pay your <b style={{ color: "var(--pink-deep)" }}>{fmt(deposit)}</b> deposit ({depositPct}%) to the account below, then send us your proof of payment.
                </p>
              )}

              {payState !== "paid" && <>
              <div className="paycard">
                <div className="paycard__label">Deposit · {fmt(deposit)}</div>
                <div className="paycard__row"><span>Bank</span><b>{BANK.bank}</b></div>
                <div className="paycard__row">
                  <span>Account Number</span>
                  <button type="button" className="paycard__num" onClick={copyAcct} title="Tap to copy">
                    {BANK.number} <small>{copied ? "Copied ✓" : "Copy"}</small>
                  </button>
                </div>
                <div className="paycard__row"><span>Account Name</span><b>{BANK.name}</b></div>
              </div>

              <a
                className="pill pill--green"
                style={{ width: "100%" }}
                href={whatsappLink(`Hi Privé by Luchi! I've paid the ${fmt(deposit)} deposit for my ${service?.name} booking on ${date} at ${time}. Here's my proof of payment.`)}
                target="_blank" rel="noreferrer"
              >
                <IconWhatsapp style={{ width: 18, height: 18 }} /> Send Proof of Payment
              </a>
              </>}

              <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 14 }}>
                A confirmation and receipt is on its way to <b>{form.email}</b>. {payState === "paid" ? "We'll" : "Your slot is confirmed once we receive your deposit, and we'll"} confirm your travel logistics on WhatsApp.
              </p>
              {refCode(form.phone) && (
                <div style={{ marginTop: 18, background: "var(--green)", borderRadius: 16, padding: "18px 20px", textAlign: "center" }}>
                  <div style={{ color: "#CFE4D8", fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>Refer a friend, you both save</div>
                  <div style={{ display: "inline-block", marginTop: 10, background: "#fff", color: "var(--green)", fontFamily: "var(--head)", fontWeight: 700, fontSize: 22, letterSpacing: 2, padding: "8px 22px", borderRadius: 999 }}>{refCode(form.phone)}</div>
                  <div style={{ color: "#fff", fontSize: 13, lineHeight: 1.5, marginTop: 10 }}>
                    Your friend gets {fmt(REFERRAL_DISCOUNT)} off their first booking, and you get {fmt(REFERRAL_DISCOUNT)} off your next one.
                  </div>
                  <a
                    className="pill" style={{ marginTop: 12, background: "#fff", color: "var(--green)" }}
                    href={`https://wa.me/?text=${encodeURIComponent(`Hey! I book my braids with Privé by Luchi, they come to you anywhere in Lagos 🌸 Use my code ${refCode(form.phone)} and get ${fmt(REFERRAL_DISCOUNT)} off your first booking: https://privebyluchi.com`)}`}
                    target="_blank" rel="noreferrer"
                  >
                    Share on WhatsApp
                  </a>
                </div>
              )}
              <p className="sig">Thank you for choosing us 🤭💕 — Privé by Luchi</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section booking" id="book">
      <div className="wrap">
        <div className="section-head" style={{ textAlign: "center", margin: "0 auto 40px" }}>
          <div className="eyebrow" style={{ display: "inline-flex" }}>Book Your Appointment</div>
          <h2>Reserve your chair, we come to you</h2>
          <p style={{ margin: "0 auto" }}>A mobile studio serving Lagos and other states. Pick your style, choose a date, and we'll bring the salon to your door.</p>
        </div>

        <div className="booking__panel" ref={panelRef} style={{ scrollMarginTop: 90 }}>
          <Steps step={step} />

          {/* STEP 1 — SERVICE */}
          {step === 1 && (
            <div>
              <h3 className="b-h2">Select your style</h3>
              <p className="b-sub">Choose a service, size and any add-ons.</p>

              <div className="service-grid">
                {SERVICES.map((s) => (
                  <div key={s.id} className={`service-tile ${selected === s.id ? "sel" : ""}`} onClick={() => selectService(s.id)}>
                    {selected === s.id && <div className="tick"><IconCheck style={{ width: 11, height: 11 }} /></div>}
                    <b>{s.name}</b>
                    <p>{s.desc}</p>
                    <small>⏱ {s.duration}</small>
                  </div>
                ))}
              </div>

              {selected && isButterfly && (
                <div style={{ marginBottom: 20 }}>
                  <span className="b-label">Length Range</span>
                  <div className="chip-row">
                    {Object.keys(service.variants).map((v) => (
                      <button key={v} className={`chip ${variant === v ? "sel" : ""}`} onClick={() => { setVariant(v); setSize(null); }}>{v}</button>
                    ))}
                  </div>
                </div>
              )}

              {selected && (availableSizes || !isButterfly) && (
                <div style={{ marginBottom: 20 }}>
                  <span className="b-label">{isFrontal ? "Type" : "Size"}</span>
                  <div className="chip-row">
                    {Object.entries(availableSizes || {}).map(([label, price]) => (
                      <button key={label} className={`chip ${size === label ? "sel" : ""}`} onClick={() => setSize(label)}>
                        {label}<span className="price">{fmt(price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selected && !isFrontal && (
                <div style={{ marginBottom: 22 }}>
                  <span className="b-label">Add-ons</span>
                  {EXTRAS.map(({ key, label, price }) => (
                    <div key={key} className={`addon ${extras[key] ? "sel" : ""}`} onClick={() => setExtras((e) => ({ ...e, [key]: !e[key] }))}>
                      <div className="addon__l">
                        <div className="addon__box">{extras[key] && <IconCheck style={{ width: 12, height: 12 }} />}</div>
                        <span>{label}</span>
                      </div>
                      <span className="addon__price">+{fmt(price)}</span>
                    </div>
                  ))}
                </div>
              )}

              {size && (
                <div className="pricebar">
                  <div><small>Estimated Total</small><div className="total">{fmt(total)}</div></div>
                  <div className="r"><small>Deposit ({depositPct}%)</small><div className="dep">{fmt(deposit)}</div></div>
                </div>
              )}

              <button className={`pill ${canNext1 ? "pill--pink" : "pill--ghost"}`} style={{ width: "100%", opacity: canNext1 ? 1 : 0.5, pointerEvents: canNext1 ? "auto" : "none" }} onClick={goto2}>
                Continue to Schedule
              </button>
            </div>
          )}

          {/* STEP 2 — SCHEDULE */}
          {step === 2 && (
            <div>
              <h3 className="b-h2">Choose date & time</h3>
              <p className="b-sub">Appointments available Monday – Saturday.</p>

              <div className="field">
                <span className="b-label">Date</span>
                <input
                  type="date" className="datein" value={date} min={minDate()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val < minDate()) { setDate(""); setTime(""); setDateError(false); return; }
                    setDate(val); setTime("");
                    if (bookedDates.includes(val) || blockedDates.includes(val)) setDateError(true);
                    else { setDateError(false); fetchBookedTimes(val); }
                  }}
                />
                <div className="note" style={{ marginTop: 10 }}>
                  ⏱ <span>Bookings must be made at least <b>48 hours</b> in advance. Earlier dates are unavailable.</span>
                </div>
              </div>

              {dateError && <div className="err">✕ This date is fully booked, please choose another day.{season && <> {season.label} dates go fast: <a href="/december#waitlist" style={{ textDecoration: "underline" }}>join the waitlist</a>.</>}</div>}

              {season && !dateError && (
                <div className="note peak">
                  ✦ <span>{earlyOff
                    ? <><b>You're booking early, so you save {fmt(earlyOff)}.</b> {season.label} has seasonal pricing, and early bookings get {fmt(earlyOff)} off. Your total: <b>{fmt(total)}</b>{depositPct !== 30 ? `, and ${depositPct}% secures your date` : ""}.</>
                    : <><b>{season.label} pricing applies.</b> Your total: <b>{fmt(total)}</b>{depositPct !== 30 ? `, and ${depositPct}% secures your date` : ""}. Booking two weeks or more ahead saves {fmt(SEASON_EARLY)}.</>}</span>
                </div>
              )}

              <div className="field" style={{ marginTop: 8 }}>
                <span className="b-label">Preferred Time</span>
                {loadingSlots ? (
                  <p className="b-sub">Checking availability…</p>
                ) : (
                  <div className="time-grid">
                    {TIMES.map((t) => {
                      const taken = bookedTimes.includes(t);
                      return (
                        <button key={t} className={`time ${time === t ? "sel" : ""} ${taken ? "taken" : ""}`} onClick={() => !taken && setTime(t)}>
                          {t}{taken && <small>TAKEN</small>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="note green" style={{ marginTop: 8 }}>
                ✿ <span><b>Booking policy:</b> please give 48 hours notice for cancellations or rescheduling. Late cancellations forfeit your deposit. For urgent bookings, DM us for availability.</span>
              </div>

              <div className="b-actions" style={{ marginTop: 22 }}>
                <button className="pill pill--ghost back" onClick={() => setStep(1)}>Back</button>
                <button className={`pill ${canNext2 ? "pill--pink" : "pill--ghost"}`} style={{ opacity: canNext2 ? 1 : 0.5, pointerEvents: canNext2 ? "auto" : "none" }} onClick={() => setStep(3)}>
                  Your Details
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — DETAILS */}
          {step === 3 && (
            <div>
              <h3 className="b-h2">Your details</h3>
              <p className="b-sub">So we can reach you and plan the visit.</p>

              {[
                { key: "name", label: "Full Name", type: "text", ph: "Your full name" },
                { key: "phone", label: "Phone / WhatsApp", type: "tel", ph: "+234 000 000 0000" },
                { key: "email", label: "Email Address", type: "email", ph: "your@email.com" },
                { key: "address", label: "Address / Area (we come to you)", type: "text", ph: "e.g. Ikeja GRA, Lagos, street & landmark" },
              ].map(({ key, label, type, ph }) => (
                <div className="field" key={key}>
                  <span className="b-label">{label}</span>
                  <input className="input" type={type} placeholder={ph} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}

              <div className="field">
                <span className="b-label">Special Requests (optional)</span>
                <textarea className="textarea" rows={3} placeholder="Any specific requests, colours or hair concerns…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>

              <div className="field">
                <span className="b-label">Referral code (optional)</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input" style={{ flex: 1 }} placeholder="e.g. PRV-ABCDE"
                    value={refInput}
                    onChange={(e) => { setRefInput(e.target.value); if (refStatus) { setRefStatus(""); setRefName(""); } }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyReferral(); } }}
                  />
                  <button
                    type="button" onClick={applyReferral}
                    disabled={!refInput.trim() || refStatus === "checking"}
                    style={{ padding: "0 20px", borderRadius: 12, border: "1.5px solid var(--green)", background: refApplied ? "var(--green)" : "#fff", color: refApplied ? "#fff" : "var(--green)", fontWeight: 600, fontFamily: "var(--body)", cursor: "pointer", whiteSpace: "nowrap", opacity: !refInput.trim() ? 0.5 : 1 }}
                  >
                    {refStatus === "checking" ? "Checking…" : refApplied ? "Applied ✓" : "Apply"}
                  </button>
                </div>
                {refStatus === "valid" && <div style={{ color: "var(--green)", fontSize: 13, marginTop: 6 }}>🎉 {refName ? `${refName}'s code applied` : "Code applied"}, {fmt(REFERRAL_DISCOUNT)} off your booking!</div>}
                {refStatus === "invalid" && <div style={{ color: "#C0392B", fontSize: 13, marginTop: 6 }}>That code isn't valid. Double-check with the friend who shared it.</div>}
                {refStatus === "self" && <div style={{ color: "#C0392B", fontSize: 13, marginTop: 6 }}>You can't use your own referral code 🙂</div>}
              </div>

              <div className="note" style={{ marginBottom: 18 }}>
                <IconBloom style={{ width: 18, height: 18, color: "var(--pink)", flexShrink: 0 }} />
                <span>As a mobile studio we travel to your address anywhere in Nigeria, <b>transport / logistics is covered by the client</b> and confirmed by DM after booking.</span>
              </div>

              <div className={`checkrow ${agreed ? "on" : ""}`} onClick={() => setAgreed(!agreed)}>
                <div className="box">{agreed && <IconCheck style={{ width: 13, height: 13 }} />}</div>
                <p>I understand a <b>{depositPct}% non-refundable deposit</b> is required to confirm my booking, and cancellations must be made at least <b>48 hours in advance</b> to avoid forfeiting the deposit.</p>
              </div>

              <div className="b-actions">
                <button className="pill pill--ghost back" onClick={() => setStep(2)}>Back</button>
                <button className={`pill ${canNext3 ? "pill--pink" : "pill--ghost"}`} style={{ opacity: canNext3 ? 1 : 0.5, pointerEvents: canNext3 ? "auto" : "none" }} onClick={() => setStep(4)}>
                  Review & Confirm
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 — CONFIRM */}
          {step === 4 && (
            <div>
              <h3 className="b-h2">Review your booking</h3>
              <p className="b-sub">Please confirm everything before submitting.</p>

              <div className="summary">
                <div className="summary__head">Service Summary</div>
                {[
                  ["Style", service?.name],
                  ...(isButterfly && variant ? [["Length Range", variant]] : []),
                  ["Size / Type", size],
                  ["Add-ons", extrasLabel],
                  ...(season ? [[`${season.label} pricing`, `+ ${fmt(seasonFee)}`]] : []),
                  ...(earlyOff ? [["Early-booking discount 🎉", `− ${fmt(earlyOff)}`]] : []),
                  ...(refApplied ? [["Subtotal", fmt(subtotal)], [`Referral discount (${normCode(refInput)})`, `− ${fmt(discount)}`]] : []),
                  ["Total", fmt(total)],
                ].map(([l, v]) => (
                  <div className="summary__row" key={l}><span>{l}</span><b>{v}</b></div>
                ))}
                <div className="summary__row hi"><span>Deposit Due ({depositPct}%)</span><b>{fmt(deposit)}</b></div>
              </div>

              <div className="summary">
                <div className="summary__head">Appointment Details</div>
                {[["Name", form.name], ["Phone", form.phone], ["Email", form.email], ["Address", form.address], ["Date", date], ["Time", time]].map(([l, v]) => (
                  <div className="summary__row" key={l}><span>{l}</span><b>{v}</b></div>
                ))}
              </div>

              <div className="b-actions">
                <button className="pill pill--ghost back" onClick={() => setStep(3)}>Back</button>
                <button className="pill pill--pink" onClick={submit}>{sending ? "Sending…" : "Request Appointment ✿"}</button>
              </div>

              {sendError && <div className="err" style={{ marginTop: 12 }}>Something went wrong. Please try again or message us directly.</div>}

              <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginTop: 16 }}>
                Your appointment is confirmed once your <b style={{ color: "var(--pink-deep)" }}>{fmt(deposit)}</b> deposit is received.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
