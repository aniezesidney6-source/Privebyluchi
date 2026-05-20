import { useState, useEffect } from "react";

const GOLD = "#C9956C";
const GOLD_DIM = "#8A5E3C";
const BG = "#080808";
const SURFACE = "#111010";
const SURFACE2 = "#1A1818";
const BORDER = "#2A2626";
const TEXT = "#F0EAE0";
const TEXT_MUTED = "#9A8E84";

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";
const SUPA_HEADERS = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

const ADMIN_PASSWORD = "Chigozie100500";

const fmt = d => new Date(d).toLocaleDateString("en-NG", { weekday: "short", year: "numeric", month: "short", day: "numeric" });

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [cancelledIds, setCancelledIds] = useState([]);

  const login = () => {
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true);
      fetchBookings();
    } else {
      setPwError(true);
      setTimeout(() => setPwError(false), 2000);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?select=*&order=date.asc,time.asc`,
        { headers: SUPA_HEADERS }
      );
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (id) => {
    setCancelling(id);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`, {
        method: "DELETE",
        headers: SUPA_HEADERS,
      });
      setCancelledIds(prev => [...prev, id]);
      setTimeout(() => {
        setBookings(prev => prev.filter(b => b.id !== id));
        setCancelledIds(prev => prev.filter(i => i !== id));
      }, 800);
    } catch {
      alert("Failed to cancel. Please try again.");
    } finally {
      setCancelling(null);
    }
  };

  const inputStyle = {
    width: "100%", background: SURFACE2, border: `1px solid ${BORDER}`,
    borderRadius: 2, padding: "13px 16px", color: TEXT,
    fontSize: 13, fontFamily: "Cormorant Garamond, Georgia, serif",
    outline: "none", boxSizing: "border-box",
  };

  // Login screen
  if (!authed) {
    return (
      <div style={{
        minHeight: "100vh", background: BG,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Cormorant Garamond, Georgia, serif", padding: 20,
      }}>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ color: GOLD, fontSize: 10, letterSpacing: 6, marginBottom: 12 }}>
            ✦ ADMIN ACCESS ✦
          </div>
          <h1 style={{ color: TEXT, fontSize: 28, fontWeight: 400, letterSpacing: 4, marginBottom: 6 }}>
            Privé by Luchi
          </h1>
          <p style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: 3, marginBottom: 40 }}>
            BOOKING DASHBOARD
          </p>

          <div style={{ marginBottom: 16 }}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              style={{
                ...inputStyle,
                textAlign: "center", letterSpacing: 4,
                border: `1px solid ${pwError ? "#E05555" : BORDER}`,
                transition: "border-color 0.2s",
              }}
            />
            {pwError && (
              <p style={{ color: "#E05555", fontSize: 12, marginTop: 8 }}>
                Incorrect password. Try again.
              </p>
            )}
          </div>

          <button onClick={login} style={{
            width: "100%", padding: "15px",
            background: GOLD, border: `1px solid ${GOLD}`,
            borderRadius: 2, color: BG,
            fontSize: 11, letterSpacing: 4, textTransform: "uppercase",
            cursor: "pointer", fontFamily: "Cormorant Garamond, Georgia, serif",
            fontWeight: 700,
          }}>
            Sign In ✦
          </button>
        </div>
      </div>
    );
  }

  // Dashboard
  const upcoming = bookings.filter(b => new Date(b.date) >= new Date(new Date().toDateString()));
  const past = bookings.filter(b => new Date(b.date) < new Date(new Date().toDateString()));

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "Cormorant Garamond, Georgia, serif" }}>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${BORDER}`, padding: "24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: `linear-gradient(to bottom, #0f0c0c, ${BG})`,
      }}>
        <div>
          <div style={{ color: GOLD, fontSize: 10, letterSpacing: 5, marginBottom: 4 }}>ADMIN DASHBOARD</div>
          <h1 style={{ color: TEXT, fontSize: 24, fontWeight: 400, letterSpacing: 4 }}>Privé by Luchi</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 4 }}>Total bookings</div>
          <div style={{ color: GOLD, fontSize: 28, fontWeight: 700 }}>{bookings.length}</div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px 60px" }}>

        {/* Refresh */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ color: TEXT, fontSize: 18, fontWeight: 400, letterSpacing: 2 }}>
            Upcoming Bookings
            <span style={{
              marginLeft: 10, background: GOLD, color: BG,
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            }}>{upcoming.length}</span>
          </div>
          <button onClick={fetchBookings} style={{
            background: "transparent", border: `1px solid ${BORDER}`,
            borderRadius: 2, padding: "8px 16px", color: TEXT_MUTED,
            fontSize: 11, letterSpacing: 2, cursor: "pointer",
            fontFamily: "Cormorant Garamond, Georgia, serif",
          }}>↻ Refresh</button>
        </div>

        {loading ? (
          <p style={{ color: TEXT_MUTED, textAlign: "center", padding: 40 }}>Loading bookings...</p>
        ) : upcoming.length === 0 ? (
          <div style={{
            background: SURFACE, border: `1px solid ${BORDER}`,
            borderRadius: 3, padding: "40px 20px", textAlign: "center",
          }}>
            <div style={{ color: GOLD, fontSize: 24, marginBottom: 12 }}>✦</div>
            <p style={{ color: TEXT_MUTED, fontSize: 14 }}>No upcoming bookings</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map(b => (
              <div key={b.id} style={{
                background: cancelledIds.includes(b.id) ? "#1A0A0A" : SURFACE,
                border: `1px solid ${cancelledIds.includes(b.id) ? "#5A1A1A" : BORDER}`,
                borderRadius: 3, padding: "16px 20px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                transition: "all 0.3s", opacity: cancelledIds.includes(b.id) ? 0.5 : 1,
              }}>
                <div>
                  <div style={{ color: GOLD, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                    {fmt(b.date)}
                  </div>
                  <div style={{ color: TEXT_MUTED, fontSize: 13 }}>
                    ⏱ {b.time}
                  </div>
                </div>
                <button
                  onClick={() => cancelBooking(b.id)}
                  disabled={cancelling === b.id || cancelledIds.includes(b.id)}
                  style={{
                    padding: "9px 20px",
                    background: "transparent",
                    border: `1px solid ${cancelledIds.includes(b.id) ? "#5A1A1A" : "#5A1A1A"}`,
                    borderRadius: 2, cursor: "pointer",
                    color: cancelledIds.includes(b.id) ? "#5A1A1A" : "#E08080",
                    fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
                    fontFamily: "Cormorant Garamond, Georgia, serif",
                    fontWeight: 600, transition: "all 0.2s",
                  }}>
                  {cancelling === b.id ? "Cancelling..." : cancelledIds.includes(b.id) ? "Cancelled ✓" : "Cancel Slot"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Past bookings */}
        {past.length > 0 && (
          <>
            <div style={{ color: TEXT_MUTED, fontSize: 14, letterSpacing: 2, margin: "36px 0 16px" }}>
              Past Bookings
              <span style={{
                marginLeft: 10, background: SURFACE2, color: TEXT_MUTED,
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
              }}>{past.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {past.map(b => (
                <div key={b.id} style={{
                  background: SURFACE2, border: `1px solid ${BORDER}`,
                  borderRadius: 3, padding: "14px 20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  opacity: 0.6,
                }}>
                  <div style={{ color: TEXT_MUTED, fontSize: 14 }}>{fmt(b.date)}</div>
                  <div style={{ color: TEXT_MUTED, fontSize: 12 }}>{b.time}</div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "20px 24px", textAlign: "center" }}>
        <p style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: 2 }}>
          PRIVÉ BY LUCHI · ADMIN · 🖤
        </p>
      </div>

      <style>{`
        input::placeholder { color: #3A3330; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
