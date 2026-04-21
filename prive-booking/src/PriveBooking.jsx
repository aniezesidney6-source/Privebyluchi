import { useState } from "react";

const GOLD = "#C9956C";
const GOLD_LIGHT = "#E8C49A";
const GOLD_DIM = "#8A5E3C";
const BG = "#080808";
const SURFACE = "#111010";
const SURFACE2 = "#1A1818";
const BORDER = "#2A2626";
const TEXT = "#F0EAE0";
const TEXT_MUTED = "#9A8E84";

const SERVICES = [
  {
    id: "knotless_box",
    name: "Knotless / Box Braids",
    icon: "✦",
    duration: "5–8 hrs",
    desc: "Clean knotless finish or classic box sections",
    sizes: { "X-Small": 65000, "Small": 45000, "Medium": 35000, "Large": 30000 },
  },
  {
    id: "fulani_cornrows",
    name: "Fulani / Cornrows",
    icon: "⟡",
    duration: "3–5 hrs",
    desc: "Centre-part cornrows or fulani with beaded details",
    sizes: { "Small": 40000, "Medium": 35000, "Large": 30000 },
  },
  {
    id: "stitch",
    name: "Stitch Braids",
    icon: "◈",
    duration: "4–6 hrs",
    desc: "Precise feed-in stitching for a bold, clean look",
    sizes: { "Small": 40000, "Medium": 35000, "Large": 30000 },
  },
  {
    id: "faux_locs",
    name: "Faux Locs",
    icon: "◎",
    duration: "3–5 hrs",
    desc: "Textured, boho distressed or neat finish",
    sizes: { "Small": 35000, "Medium": 30000, "Large": 25000 },
  },
  {
    id: "butterfly_locs",
    name: "Butterfly Locs",
    icon: "❋",
    duration: "4–6 hrs",
    desc: "Soft, wispy butterfly-textured locs",
    variants: {
      "12–20 inches": { "Medium": 35000, "Large": 30000 },
      "22–30 inches": { "Medium": 40000, "Large": 35000 },
    },
  },
  {
    id: "frontal_install",
    name: "Frontal Install",
    icon: "◉",
    duration: "1–2 hrs",
    desc: "Professional frontal, ponytail or closure install",
    sizes: { "Frontal Install": 30000, "Ponytail Install": 35000, "Closure Install": 20000 },
  },
];

const EXTRAS = [
  { key: "extraLength", label: "Extra Length", price: 5000 },
  { key: "boho", label: "Boho Add-on", price: 5000 },
  { key: "beads", label: "Beads & Accessories", price: 2000 },
  { key: "homeService", label: "Home Service", price: 0, note: "Transport fee will be quoted separately" },
];

const TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";
const SUPA_HEADERS = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

// ← Replace with the real WhatsApp number (country code, no + or spaces e.g. 2348012345678)
const WHATSAPP_NUMBER = "2347067590348";

const fmt = (n) => `₦${n.toLocaleString()}`;

function GoldDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0" }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${GOLD_DIM})` }} />
      <span style={{ color: GOLD, fontSize: 10, letterSpacing: 4 }}>✦</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${GOLD_DIM})` }} />
    </div>
  );
}

function StepIndicator({ step }) {
  const steps = ["Service", "Schedule", "Details", "Confirm"];
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 0, marginBottom: 36 }}>
      {steps.map((s, i) => {
        const active = i + 1 === step;
        const done = i + 1 < step;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: done ? GOLD : "transparent",
                border: `1.5px solid ${done || active ? GOLD : BORDER}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: done ? BG : active ? GOLD : TEXT_MUTED,
                fontSize: 12,
                fontFamily: "Cormorant Garamond, Georgia, serif",
                fontWeight: 700,
                transition: "all 0.3s",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: 9, letterSpacing: 2, textTransform: "uppercase",
                color: active ? GOLD : done ? GOLD_DIM : TEXT_MUTED,
                fontFamily: "Cormorant Garamond, Georgia, serif",
              }}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 48, height: 1,
                background: done ? GOLD_DIM : BORDER,
                marginBottom: 20, marginLeft: -1, marginRight: -1,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PriveBooking() {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(null);
  const [variant, setVariant] = useState(null);
  const [size, setSize] = useState(null);
  const [extras, setExtras] = useState({ extraLength: false, boho: false, beads: false, homeService: false });
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookedDates, setBookedDates] = useState([]);
  const [dateError, setDateError] = useState(false);

  const fetchBookedDates = async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?select=date`,
        { headers: SUPA_HEADERS }
      );
      const data = await res.json();
      setBookedDates([...new Set(data.map(b => b.date))]);
    } catch {
      setBookedDates([]);
    }
  };

  const fetchBookedTimes = async (selectedDate) => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?select=time&date=eq.${selectedDate}`,
        { headers: SUPA_HEADERS }
      );
      const data = await res.json();
      setBookedTimes(data.map(b => b.time));
    } catch {
      setBookedTimes([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const service = SERVICES.find(s => s.id === selected);
  const isButterfly = selected === "butterfly_locs";
  const isFrontal = selected === "frontal_install";

  const availableSizes = isButterfly
    ? (variant ? service?.variants[variant] : null)
    : service?.sizes;

  const basePrice = availableSizes && size ? (availableSizes[size] || 0) : 0;
  const extraFees = EXTRAS.reduce((sum, e) => sum + (extras[e.key] ? e.price : 0), 0);
  const total = basePrice + extraFees;
  const deposit = Math.round(total * 0.3);

  const canNext1 = selected && size && (!isButterfly || variant);
  const canNext2 = date && time && !dateError;
  const canNext3 = form.name && form.phone && form.email && agreed;

  const handleSelectService = (id) => {
    setSelected(id);
    setVariant(null);
    setSize(null);
  };

  const inputStyle = {
    width: "100%", background: SURFACE2, border: `1px solid ${BORDER}`,
    borderRadius: 2, padding: "13px 16px", color: TEXT,
    fontSize: 13, fontFamily: "Cormorant Garamond, Georgia, serif",
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const extrasLabel = EXTRAS.filter(e => extras[e.key]).map(e => e.label).join(", ") || "None";

  if (submitted) {
    return (
      <div style={{
        minHeight: "100vh", background: BG, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "40px 20px",
        fontFamily: "Cormorant Garamond, Georgia, serif",
      }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ color: GOLD, fontSize: 40, marginBottom: 16 }}>✦</div>
          <h2 style={{ color: GOLD, fontSize: 32, fontWeight: 400, letterSpacing: 3, margin: "0 0 8px" }}>
            REQUEST RECEIVED
          </h2>
          <p style={{ color: TEXT_MUTED, fontSize: 14, letterSpacing: 1, marginBottom: 32 }}>
            PRIVÉ BY LUCHI
          </p>
          <GoldDivider />
          <p style={{ color: TEXT, fontSize: 16, lineHeight: 1.8, marginBottom: 16 }}>
            Your booking request for <span style={{ color: GOLD }}>{service?.name}</span>
            {isButterfly && variant && <span style={{ color: GOLD_DIM }}> ({variant})</span>}
            {" "}on <span style={{ color: GOLD }}>{date} at {time}</span> has been received.
          </p>
          <p style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.8 }}>
            A deposit of <span style={{ color: GOLD }}>{fmt(deposit)}</span> is required to confirm your appointment.
            We'll be in touch shortly with payment details.
          </p>
          <GoldDivider />
          <p style={{ color: TEXT_MUTED, fontSize: 12, letterSpacing: 1, lineHeight: 2 }}>
            We can't wait to serve you 🖤✨
          </p>
          <p style={{ color: GOLD_DIM, fontSize: 11, letterSpacing: 2, marginTop: 24, fontStyle: "italic" }}>
            — Signed, Privé by Luchi
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "Cormorant Garamond, Georgia, serif" }}>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${BORDER}`,
        padding: "28px 24px 24px", textAlign: "center",
        background: `linear-gradient(to bottom, #0f0c0c, ${BG})`,
      }}>
        <div style={{ color: GOLD, fontSize: 10, letterSpacing: 6, marginBottom: 10 }}>
          ✦ BOOK AN APPOINTMENT ✦
        </div>
        <h1 style={{
          margin: 0, fontSize: 36, fontWeight: 400, letterSpacing: 6,
          color: TEXT, textTransform: "uppercase",
          textShadow: `0 0 40px ${GOLD}22`,
        }}>Privé by Luchi</h1>
        <div style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: 4, marginTop: 8 }}>
          LUXURY HAIR STUDIO
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "36px 20px 60px" }}>
        <StepIndicator step={step} />

        {/* ── STEP 1 — Service ── */}
        {step === 1 && (
          <div>
            <h2 style={{ color: TEXT, fontSize: 22, fontWeight: 400, letterSpacing: 2, margin: "0 0 6px" }}>
              Select Your Service
            </h2>
            <p style={{ color: TEXT_MUTED, fontSize: 13, margin: "0 0 28px", letterSpacing: 1, fontWeight: 500 }}>
              Choose your style, size, and any extras
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
              {SERVICES.map(s => (
                <div key={s.id}
                  onClick={() => handleSelectService(s.id)}
                  style={{
                    border: `1px solid ${selected === s.id ? GOLD : BORDER}`,
                    borderRadius: 3, padding: "16px 14px", cursor: "pointer",
                    background: selected === s.id ? `${GOLD}10` : SURFACE,
                    transition: "all 0.2s", position: "relative",
                  }}>
                  {selected === s.id && (
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      width: 16, height: 16, borderRadius: "50%",
                      background: GOLD, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 8, color: BG,
                    }}>✓</div>
                  )}
                  <div style={{ color: GOLD, fontSize: 16, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ color: TEXT, fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{s.name}</div>
                  <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5, marginBottom: 8, fontWeight: 500 }}>{s.desc}</div>
                  <div style={{ color: GOLD, fontSize: 11, letterSpacing: 1, fontWeight: 600 }}>⏱ {s.duration}</div>
                </div>
              ))}
            </div>

            {selected && (
              <div>
                {/* Butterfly Locs — pick length range first */}
                {isButterfly && (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", display: "block", marginBottom: 12 }}>
                      Length Range
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {Object.keys(service.variants).map(v => (
                        <button key={v} onClick={() => { setVariant(v); setSize(null); }} style={{
                          flex: 1, padding: "12px 8px",
                          background: variant === v ? GOLD : "transparent",
                          border: `1px solid ${variant === v ? GOLD : BORDER}`,
                          borderRadius: 2, cursor: "pointer",
                          color: variant === v ? BG : TEXT_MUTED,
                          fontSize: 13,
                          fontFamily: "Cormorant Garamond, Georgia, serif",
                          fontWeight: variant === v ? 700 : 400,
                          transition: "all 0.2s",
                        }}>{v}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size / Type */}
                {(availableSizes || (!isButterfly)) && (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", display: "block", marginBottom: 12 }}>
                      {isFrontal ? "Type" : "Size"}
                    </label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {Object.entries(availableSizes || {}).map(([label, price]) => (
                        <button key={label} onClick={() => setSize(label)} style={{
                          flex: "1 1 auto", padding: "10px 8px",
                          background: size === label ? GOLD : "transparent",
                          border: `1px solid ${size === label ? GOLD : BORDER}`,
                          borderRadius: 2, cursor: "pointer",
                          color: size === label ? BG : TEXT_MUTED,
                          fontSize: 12,
                          fontFamily: "Cormorant Garamond, Georgia, serif",
                          fontWeight: size === label ? 700 : 400,
                          transition: "all 0.2s",
                          lineHeight: 1.4, textAlign: "center",
                        }}>
                          {label}
                          <div style={{ fontSize: 13, color: size === label ? `${BG}CC` : GOLD, marginTop: 3, fontWeight: 600 }}>
                            {fmt(price)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extras (not for frontal) */}
                {!isFrontal && (
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", display: "block", marginBottom: 12 }}>
                      Add-ons
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {EXTRAS.map(({ key, label, price, note }) => (
                        <div key={key}>
                          <div
                            onClick={() => setExtras(e => ({ ...e, [key]: !e[key] }))}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "12px 16px",
                              border: `1px solid ${extras[key] ? GOLD : BORDER}`,
                              borderRadius: 2, cursor: "pointer",
                              background: extras[key] ? `${GOLD}0D` : "transparent",
                              transition: "all 0.2s",
                            }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 16, height: 16, borderRadius: 2,
                                border: `1px solid ${extras[key] ? GOLD : BORDER}`,
                                background: extras[key] ? GOLD : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 9, color: BG,
                              }}>{extras[key] && "✓"}</div>
                              <span style={{ color: TEXT, fontSize: 13, fontWeight: 500 }}>{label}</span>
                            </div>
                            <span style={{ color: GOLD_DIM, fontSize: 12 }}>
                              {price > 0 ? `+${fmt(price)}` : ""}
                            </span>
                          </div>
                          {extras[key] && note && (
                            <div style={{
                              background: `${GOLD}0A`, border: `1px solid ${GOLD}25`,
                              borderTop: "none", borderRadius: "0 0 2px 2px",
                              padding: "10px 16px",
                              color: GOLD_LIGHT, fontSize: 12, fontWeight: 500,
                            }}>
                              ⚠ {note}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price summary */}
                {size && (
                  <div style={{
                    background: SURFACE2, border: `1px solid ${BORDER}`,
                    borderRadius: 3, padding: "16px 20px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 20,
                  }}>
                    <div>
                      <div style={{ color: TEXT_MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>ESTIMATED TOTAL</div>
                      <div style={{ color: GOLD, fontSize: 24, fontWeight: 700 }}>{fmt(total)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: TEXT_MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>DEPOSIT (30%)</div>
                      <div style={{ color: GOLD_LIGHT, fontSize: 18 }}>{fmt(deposit)}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              disabled={!canNext1}
              onClick={() => setStep(2)}
              style={{
                width: "100%", padding: "16px",
                background: canNext1 ? GOLD : SURFACE2,
                border: `1px solid ${canNext1 ? GOLD : BORDER}`,
                borderRadius: 2, color: canNext1 ? BG : TEXT_MUTED,
                fontSize: 12, letterSpacing: 4, textTransform: "uppercase",
                cursor: canNext1 ? "pointer" : "not-allowed",
                fontFamily: "Cormorant Garamond, Georgia, serif",
                fontWeight: 700, transition: "all 0.2s",
              }}>
              Continue to Schedule ✦
            </button>
          </div>
        )}

        {/* ── STEP 2 — Schedule ── */}
        {step === 2 && (() => { if (bookedDates.length === 0) fetchBookedDates(); return null; })()}
        {step === 2 && (
          <div>
            <h2 style={{ color: TEXT, fontSize: 22, fontWeight: 400, letterSpacing: 2, margin: "0 0 6px" }}>
              Choose Your Date & Time
            </h2>
            <p style={{ color: TEXT_MUTED, fontSize: 13, margin: "0 0 28px", letterSpacing: 1 }}>
              Appointments available Monday – Saturday
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", display: "block", marginBottom: 12 }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                min={new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]}
                onChange={e => {
                  const val = e.target.value;
                  setDate(val);
                  setTime("");
                  if (bookedDates.includes(val)) {
                    setDateError(true);
                  } else {
                    setDateError(false);
                    fetchBookedTimes(val);
                  }
                }}
                style={{ ...inputStyle, colorScheme: "dark" }}
              />
            </div>

              {dateError && (
                <div style={{
                  background: "#2A0A0A", border: "1px solid #5A1A1A",
                  borderRadius: 2, padding: "12px 16px", marginTop: 8,
                  color: "#E08080", fontSize: 13, fontWeight: 600,
                }}>
                  ✕ This date is fully booked — please choose another day.
                </div>
              )}

            <div style={{ marginBottom: 28 }}>
              <label style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", display: "block", marginBottom: 12 }}>
                Preferred Time
              </label>
              {loadingSlots ? (
                <p style={{ color: TEXT_MUTED, fontSize: 13 }}>Checking availability...</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {TIMES.map(t => {
                    const booked = bookedTimes.includes(t);
                    return (
                      <button key={t} onClick={() => !booked && setTime(t)} style={{
                        padding: "12px",
                        background: booked ? SURFACE2 : time === t ? GOLD : "transparent",
                        border: `1px solid ${booked ? BORDER : time === t ? GOLD : BORDER}`,
                        borderRadius: 2,
                        cursor: booked ? "not-allowed" : "pointer",
                        color: booked ? "#444" : time === t ? BG : TEXT_MUTED,
                        fontSize: 13, fontWeight: 500,
                        fontFamily: "Cormorant Garamond, Georgia, serif",
                        transition: "all 0.2s",
                        opacity: booked ? 0.5 : 1,
                      }}>
                        {t}
                        {booked && <div style={{ fontSize: 9, color: "#555", marginTop: 2, letterSpacing: 1 }}>TAKEN</div>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{
              background: `${GOLD}0A`, border: `1px solid ${GOLD}30`,
              borderRadius: 3, padding: "16px 20px", marginBottom: 28,
            }}>
              <div style={{ color: GOLD, fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>⚠ BOOKING POLICY</div>
              <p style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.8, margin: 0 }}>
                Please give us <strong style={{ color: TEXT }}>48 hours notice</strong> for cancellations or rescheduling.
                Late cancellations forfeit your deposit. For urgent bookings under 48 hours,{" "}
                <strong style={{ color: TEXT }}>DM us for availability</strong>.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{
                flex: 1, padding: "16px", background: "transparent",
                border: `1px solid ${BORDER}`, borderRadius: 2, color: TEXT_MUTED,
                fontSize: 12, letterSpacing: 3, cursor: "pointer",
                fontFamily: "Cormorant Garamond, Georgia, serif",
              }}>← Back</button>
              <button disabled={!canNext2} onClick={() => setStep(3)} style={{
                flex: 2, padding: "16px",
                background: canNext2 ? GOLD : SURFACE2,
                border: `1px solid ${canNext2 ? GOLD : BORDER}`,
                borderRadius: 2, color: canNext2 ? BG : TEXT_MUTED,
                fontSize: 12, letterSpacing: 4, textTransform: "uppercase",
                cursor: canNext2 ? "pointer" : "not-allowed",
                fontFamily: "Cormorant Garamond, Georgia, serif",
                fontWeight: 700, transition: "all 0.2s",
              }}>Your Details ✦</button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — Details ── */}
        {step === 3 && (
          <div>
            <h2 style={{ color: TEXT, fontSize: 22, fontWeight: 400, letterSpacing: 2, margin: "0 0 6px" }}>
              Your Details
            </h2>
            <p style={{ color: TEXT_MUTED, fontSize: 13, margin: "0 0 28px", letterSpacing: 1 }}>
              So we can get in touch with you
            </p>

            {[
              { key: "name", label: "Full Name", type: "text", placeholder: "Your full name" },
              { key: "phone", label: "Phone Number", type: "tel", placeholder: "+234 000 000 0000" },
              { key: "email", label: "Email Address", type: "email", placeholder: "your@email.com" },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key} style={{ marginBottom: 20 }}>
                <label style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                  {label}
                </label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}

            <div style={{ marginBottom: 28 }}>
              <label style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", display: "block", marginBottom: 10 }}>
                Special Requests (Optional)
              </label>
              <textarea
                placeholder="Any specific requests or hair concerns..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
            </div>

            <div onClick={() => setAgreed(!agreed)} style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              marginBottom: 28, cursor: "pointer",
            }}>
              <div style={{
                width: 18, height: 18, minWidth: 18, borderRadius: 2,
                border: `1px solid ${agreed ? GOLD : BORDER}`,
                background: agreed ? GOLD : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, color: BG, marginTop: 2,
              }}>{agreed && "✓"}</div>
              <p style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                I understand that a <strong style={{ color: GOLD }}>30% non-refundable deposit</strong> is required
                to confirm my booking, and that cancellations must be made at least{" "}
                <strong style={{ color: TEXT }}>48 hours in advance</strong> to avoid forfeiting my deposit.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={{
                flex: 1, padding: "16px", background: "transparent",
                border: `1px solid ${BORDER}`, borderRadius: 2, color: TEXT_MUTED,
                fontSize: 12, letterSpacing: 3, cursor: "pointer",
                fontFamily: "Cormorant Garamond, Georgia, serif",
              }}>← Back</button>
              <button disabled={!canNext3} onClick={() => setStep(4)} style={{
                flex: 2, padding: "16px",
                background: canNext3 ? GOLD : SURFACE2,
                border: `1px solid ${canNext3 ? GOLD : BORDER}`,
                borderRadius: 2, color: canNext3 ? BG : TEXT_MUTED,
                fontSize: 12, letterSpacing: 4, textTransform: "uppercase",
                cursor: canNext3 ? "pointer" : "not-allowed",
                fontFamily: "Cormorant Garamond, Georgia, serif",
                fontWeight: 700, transition: "all 0.2s",
              }}>Review & Confirm ✦</button>
            </div>
          </div>
        )}

        {/* ── STEP 4 — Confirm ── */}
        {step === 4 && (
          <div>
            <h2 style={{ color: TEXT, fontSize: 22, fontWeight: 400, letterSpacing: 2, margin: "0 0 6px" }}>
              Review Your Booking
            </h2>
            <p style={{ color: TEXT_MUTED, fontSize: 13, margin: "0 0 28px", letterSpacing: 1 }}>
              Please confirm all details before submitting
            </p>

            <div style={{
              background: SURFACE, border: `1px solid ${BORDER}`,
              borderRadius: 3, overflow: "hidden", marginBottom: 20,
            }}>
              <div style={{
                background: `${GOLD}15`, borderBottom: `1px solid ${BORDER}`,
                padding: "14px 20px", color: GOLD, fontSize: 11, letterSpacing: 3, textTransform: "uppercase",
              }}>✦ Service Summary</div>
              {[
                ["Style", service?.name],
                ...(isButterfly && variant ? [["Length Range", variant]] : []),
                ["Size / Type", size],
                ["Add-ons", extrasLabel],
                ["Total", fmt(total)],
                ["Deposit Due (30%)", fmt(deposit)],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "13px 20px", borderBottom: `1px solid ${BORDER}`,
                }}>
                  <span style={{ color: TEXT_MUTED, fontSize: 13, fontWeight: 600 }}>{label}</span>
                  <span style={{
                    color: String(label).startsWith("Deposit") ? GOLD : label === "Total" ? GOLD_LIGHT : TEXT,
                    fontSize: 14, fontWeight: String(label).startsWith("Deposit") ? 700 : 600,
                  }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{
              background: SURFACE, border: `1px solid ${BORDER}`,
              borderRadius: 3, overflow: "hidden", marginBottom: 28,
            }}>
              <div style={{
                background: `${GOLD}15`, borderBottom: `1px solid ${BORDER}`,
                padding: "14px 20px", color: GOLD, fontSize: 11, letterSpacing: 3, textTransform: "uppercase",
              }}>✦ Appointment Details</div>
              {[["Name", form.name], ["Phone", form.phone], ["Email", form.email], ["Date", date], ["Time", time]].map(([label, value]) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "13px 20px", borderBottom: `1px solid ${BORDER}`,
                }}>
                  <span style={{ color: TEXT_MUTED, fontSize: 13, fontWeight: 600 }}>{label}</span>
                  <span style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(3)} style={{
                flex: 1, padding: "16px", background: "transparent",
                border: `1px solid ${BORDER}`, borderRadius: 2, color: TEXT_MUTED,
                fontSize: 12, letterSpacing: 3, cursor: "pointer",
                fontFamily: "Cormorant Garamond, Georgia, serif",
              }}>← Back</button>
              <button onClick={async () => {
                setSending(true);
                setSendError(false);
                try {
                  const res = await fetch("https://api.web3forms.com/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      access_key: "9fc37df0-a3dd-4874-b8e4-711c80aaee35",
                      subject: `✦ New Booking — ${service?.name} | Privé by Luchi`,
                      from_name: "Privé by Luchi Booking",
                      message: `
NEW BOOKING REQUEST — PRIVÉ BY LUCHI

SERVICE DETAILS
───────────────
Service: ${service?.name}${isButterfly && variant ? ` (${variant})` : ""}
Size / Type: ${size}
Add-ons: ${extrasLabel}
Home Service: ${extras.homeService ? "Yes — transport fee to be quoted" : "No"}
Total: ${fmt(total)}
Deposit Due (30%): ${fmt(deposit)}

APPOINTMENT
───────────────
Date: ${date}
Time: ${time}

CLIENT INFO
───────────────
Name: ${form.name}
Phone: ${form.phone}
Email: ${form.email}
Notes: ${form.notes || "None"}
                      `.trim(),
                    }),
                  });
                  if (res.ok) {
                    await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
                      method: "POST",
                      headers: { ...SUPA_HEADERS, "Prefer": "return=minimal" },
                      body: JSON.stringify({ date, time }),
                    });
                    setSubmitted(true);
                  } else {
                    setSendError(true);
                  }
                } catch {
                  setSendError(true);
                } finally {
                  setSending(false);
                }
              }} style={{
                flex: 2, padding: "16px",
                background: GOLD, border: `1px solid ${GOLD}`,
                borderRadius: 2, color: BG,
                fontSize: 12, letterSpacing: 4, textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "Cormorant Garamond, Georgia, serif",
                fontWeight: 700,
              }}>{sending ? "Sending..." : "Request Appointment ✦"}</button>
            </div>

            {sendError && (
              <p style={{ color: "#e05555", fontSize: 12, textAlign: "center", marginTop: 12 }}>
                Something went wrong. Please try again or contact us directly.
              </p>
            )}

            <p style={{ color: TEXT_MUTED, fontSize: 11, textAlign: "center", marginTop: 20, lineHeight: 1.7 }}>
              Your appointment is only confirmed once your{" "}
              <span style={{ color: GOLD }}>{fmt(deposit)} deposit</span> is received.
            </p>
          </div>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "20px 24px", textAlign: "center" }}>
        <p style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: 2, margin: 0 }}>
          PRIVÉ BY LUCHI · LUXURY HAIR STUDIO · 🖤✨
        </p>
      </div>

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); }
        input::placeholder, textarea::placeholder { color: #3A3330; }
        input:focus, textarea:focus { border-color: ${GOLD_DIM} !important; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
