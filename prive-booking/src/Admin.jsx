import { useState } from "react";

const PINK = "#E85A8A", PINK_DEEP = "#C63E6C", PINK_TINT = "#FFF4F8";
const GREEN = "#1E4D3E", CREAM = "#FFFBF9", INK = "#26201F", MUTED = "#7A6E70", LINE = "#EFE3E8";
const HEAD = '"General Sans","Inter",system-ui,sans-serif';
const BODY = '"Inter",system-ui,sans-serif';

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";
const SUPA_HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };
const ADMIN_PASSWORD = "Chigozie100500";

const fmt = (d) => new Date(d).toLocaleDateString("en-NG", { weekday: "short", year: "numeric", month: "short", day: "numeric" });

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [cancelledIds, setCancelledIds] = useState([]);

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); fetchBookings(); }
    else { setPwError(true); setTimeout(() => setPwError(false), 2000); }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*&order=date.asc,time.asc`, { headers: SUPA_HEADERS });
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch { setBookings([]); } finally { setLoading(false); }
  };

  const cancelBooking = async (id) => {
    setCancelling(id);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`, { method: "DELETE", headers: SUPA_HEADERS });
      setCancelledIds((p) => [...p, id]);
      setTimeout(() => {
        setBookings((p) => p.filter((b) => b.id !== id));
        setCancelledIds((p) => p.filter((i) => i !== id));
      }, 800);
    } catch { alert("Failed to cancel. Please try again."); } finally { setCancelling(null); }
  };

  const shell = { minHeight: "100vh", background: CREAM, fontFamily: BODY, color: INK };

  if (!authed) {
    return (
      <div style={{ ...shell, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 22, padding: 34, boxShadow: "0 18px 50px -24px rgba(30,77,62,.28)" }}>
          <div style={{ color: PINK, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>Admin Access</div>
          <h1 style={{ fontFamily: HEAD, fontSize: 26, fontWeight: 600, marginBottom: 4, color: GREEN }}>Privé by Luchi</h1>
          <p style={{ color: MUTED, fontSize: 13, marginBottom: 30 }}>Booking Dashboard</p>
          <input
            type="password" placeholder="Enter admin password" value={pw}
            onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()}
            style={{ width: "100%", background: "#fff", border: `1.5px solid ${pwError ? "#E05555" : LINE}`, borderRadius: 12, padding: "13px 16px", fontSize: 15, fontFamily: BODY, textAlign: "center", outline: "none", boxSizing: "border-box" }}
          />
          {pwError && <p style={{ color: "#C0392B", fontSize: 13, marginTop: 8 }}>Incorrect password. Try again.</p>}
          <button onClick={login} style={{ width: "100%", marginTop: 16, padding: "14px", background: PINK, border: "none", borderRadius: 999, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: BODY }}>Sign In ✿</button>
        </div>
      </div>
    );
  }

  const today = new Date(new Date().toDateString());
  const upcoming = bookings.filter((b) => new Date(b.date) >= today);
  const past = bookings.filter((b) => new Date(b.date) < today);

  const badge = (n, bg, col) => ({ marginLeft: 10, background: bg, color: col, fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 20, fontFamily: BODY });

  return (
    <div style={shell}>
      <div style={{ borderBottom: `1px solid ${LINE}`, padding: "22px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" }}>
        <div>
          <div style={{ color: PINK, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Admin Dashboard</div>
          <h1 style={{ fontFamily: HEAD, fontSize: 24, fontWeight: 600, color: GREEN }}>Privé by Luchi</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 2 }}>Total bookings</div>
          <div style={{ color: PINK_DEEP, fontSize: 28, fontWeight: 600, fontFamily: HEAD }}>{bookings.length}</div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontFamily: HEAD, fontSize: 20, fontWeight: 600 }}>
            Upcoming Bookings<span style={badge(upcoming.length, PINK, "#fff")}>{upcoming.length}</span>
          </div>
          <button onClick={fetchBookings} style={{ background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 999, padding: "9px 18px", color: MUTED, fontSize: 14, cursor: "pointer", fontFamily: BODY, fontWeight: 500 }}>↻ Refresh</button>
        </div>

        {loading ? (
          <p style={{ color: MUTED, textAlign: "center", padding: 40 }}>Loading bookings…</p>
        ) : upcoming.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 18, padding: "40px 20px", textAlign: "center" }}>
            <div style={{ color: PINK, fontSize: 26, marginBottom: 10 }}>✿</div>
            <p style={{ color: MUTED, fontSize: 15 }}>No upcoming bookings</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map((b) => {
              const cancelled = cancelledIds.includes(b.id);
              return (
                <div key={b.id} style={{ background: cancelled ? "#FDECEC" : "#fff", border: `1px solid ${cancelled ? "#F4B8B8" : LINE}`, borderRadius: 16, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all .3s", opacity: cancelled ? 0.6 : 1, boxShadow: "0 10px 30px -22px rgba(38,32,31,.35)" }}>
                  <div>
                    <div style={{ color: GREEN, fontSize: 17, fontWeight: 600, fontFamily: HEAD, marginBottom: 3 }}>{fmt(b.date)}</div>
                    <div style={{ color: MUTED, fontSize: 14 }}>⏱ {b.time}</div>
                  </div>
                  <button onClick={() => cancelBooking(b.id)} disabled={cancelling === b.id || cancelled}
                    style={{ padding: "9px 18px", background: cancelled ? "transparent" : PINK_TINT, border: `1.5px solid ${cancelled ? "#F4B8B8" : "#F4C4D4"}`, borderRadius: 999, cursor: cancelled ? "default" : "pointer", color: cancelled ? "#C0392B" : PINK_DEEP, fontSize: 14, fontWeight: 600, fontFamily: BODY }}>
                    {cancelling === b.id ? "Cancelling…" : cancelled ? "Cancelled ✓" : "Cancel Slot"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {past.length > 0 && (
          <>
            <div style={{ fontFamily: HEAD, fontSize: 18, fontWeight: 600, margin: "36px 0 16px", color: MUTED }}>
              Past Bookings<span style={badge(past.length, "#EFE3E8", MUTED)}>{past.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {past.map((b) => (
                <div key={b.id} style={{ background: "#F7F0F3", border: `1px solid ${LINE}`, borderRadius: 14, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.7 }}>
                  <div style={{ color: MUTED, fontSize: 14 }}>{fmt(b.date)}</div>
                  <div style={{ color: MUTED, fontSize: 13 }}>{b.time}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${LINE}`, padding: "20px 24px", textAlign: "center" }}>
        <p style={{ color: MUTED, fontSize: 13 }}>Privé by Luchi · Admin ✿</p>
      </div>
    </div>
  );
}
