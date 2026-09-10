import { useState, useEffect, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const PINK = "#E85A8A", PINK_DEEP = "#C63E6C", PINK_TINT = "#FFF4F8";
const GREEN = "#1E4D3E", CREAM = "#FFFBF9", INK = "#26201F", MUTED = "#7A6E70", LINE = "#EFE3E8";
const HEAD = '"General Sans","Inter",system-ui,sans-serif';
const BODY = '"Inter",system-ui,sans-serif';

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";
const SUPA_HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };
const ADMIN_PASSWORD = "Chigozie100500";

const fmt = (d) => new Date(d).toLocaleDateString("en-NG", { weekday: "short", year: "numeric", month: "short", day: "numeric" });

/* ---------- visitor analytics helpers ---------- */
const PERIODS = [
  { id: "hour", label: "Hour", n: 24, unit: "hour" },
  { id: "day", label: "Day", n: 30, unit: "day" },
  { id: "week", label: "Week", n: 12, unit: "week" },
  { id: "month", label: "Month", n: 12, unit: "month" },
  { id: "year", label: "Year", n: 6, unit: "year" },
];

function startOf(date, unit) {
  const x = new Date(date);
  x.setMilliseconds(0); x.setSeconds(0); x.setMinutes(0);
  if (unit === "hour") return x;
  x.setHours(0);
  if (unit === "day") return x;
  if (unit === "week") { const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x; } // Mon start
  if (unit === "month") { x.setDate(1); return x; }
  x.setMonth(0, 1); return x; // year
}
function shift(date, unit, k) {
  const x = new Date(date);
  if (unit === "hour") x.setHours(x.getHours() + k);
  else if (unit === "day") x.setDate(x.getDate() + k);
  else if (unit === "week") x.setDate(x.getDate() + 7 * k);
  else if (unit === "month") x.setMonth(x.getMonth() + k);
  else x.setFullYear(x.getFullYear() + k);
  return x;
}
function labelFor(date, unit) {
  if (unit === "hour") { const h = date.getHours(); return `${((h + 11) % 12) + 1}${h < 12 ? "a" : "p"}`; }
  if (unit === "day" || unit === "week") return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
  if (unit === "month") return date.toLocaleDateString("en-NG", { month: "short" });
  return String(date.getFullYear());
}
function buildSeries(visits, period) {
  const { n, unit } = period;
  const now = startOf(new Date(), unit);
  const buckets = [], index = {};
  for (let i = n - 1; i >= 0; i--) {
    const start = shift(now, unit, -i);
    index[start.getTime()] = buckets.length;
    buckets.push({ label: labelFor(start, unit), visits: 0 });
  }
  for (const v of visits) {
    const t = new Date(v.created_at);
    if (isNaN(t)) continue;
    const key = startOf(t, unit).getTime();
    if (key in index) buckets[index[key]].visits++;
  }
  return buckets;
}
function countSince(visits, unit) {
  const cutoff = startOf(new Date(), unit).getTime();
  return visits.reduce((a, v) => a + (new Date(v.created_at).getTime() >= cutoff ? 1 : 0), 0);
}
function topBy(visits, pick, n = 5) {
  const m = {};
  for (const v of visits) { const k = pick(v) || "Unknown"; m[k] = (m[k] || 0) + 1; }
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));
}

function StatTile({ label, value }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "14px 16px", flex: 1, minWidth: 120 }}>
      <div style={{ color: MUTED, fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: PINK_DEEP, fontSize: 24, fontWeight: 600, fontFamily: HEAD }}>{value}</div>
    </div>
  );
}
function TopList({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "18px 20px", flex: 1, minWidth: 240 }}>
      <div style={{ fontFamily: HEAD, fontSize: 15, fontWeight: 600, color: GREEN, marginBottom: 14 }}>{title}</div>
      {rows.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 13 }}>No data yet.</p>
      ) : rows.map((r) => (
        <div key={r.name} style={{ marginBottom: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{r.name}</span>
            <span style={{ color: MUTED, fontWeight: 600 }}>{r.count}</span>
          </div>
          <div style={{ height: 6, background: PINK_TINT, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(r.count / max) * 100}%`, background: PINK, borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function VisitorAnalytics({ visits, loading }) {
  const [period, setPeriod] = useState(PERIODS[1]); // Day
  const series = useMemo(() => buildSeries(visits, period), [visits, period]);
  const locations = useMemo(() => topBy(visits, (v) => [v.city, v.country].filter(Boolean).join(", ")), [visits]);
  const sources = useMemo(() => topBy(visits, (v) => v.source), [visits]);

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontFamily: HEAD, fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Website Visitors</div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <StatTile label="Total visits" value={visits.length} />
        <StatTile label="Today" value={countSince(visits, "day")} />
        <StatTile label="This week" value={countSince(visits, "week")} />
        <StatTile label="This month" value={countSince(visits, "month")} />
      </div>

      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 18, padding: "18px 16px 8px" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, padding: "0 6px" }}>
          {PERIODS.map((p) => {
            const active = p.id === period.id;
            return (
              <button key={p.id} onClick={() => setPeriod(p)}
                style={{ padding: "7px 14px", borderRadius: 999, border: `1.5px solid ${active ? PINK : LINE}`, background: active ? PINK : "#fff", color: active ? "#fff" : MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: BODY }}>
                {p.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p style={{ color: MUTED, textAlign: "center", padding: 40 }}>Loading visits…</p>
        ) : visits.length === 0 ? (
          <div style={{ textAlign: "center", padding: "44px 20px" }}>
            <div style={{ color: PINK, fontSize: 26, marginBottom: 10 }}>✿</div>
            <p style={{ color: MUTED, fontSize: 14 }}>No visits recorded yet. They'll appear here in real time.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={LINE} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} interval="preserveStartEnd" tickLine={false} axisLine={{ stroke: LINE }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: MUTED }} width={34} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: PINK_TINT }}
                contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontFamily: BODY, fontSize: 13 }}
                labelStyle={{ color: GREEN, fontWeight: 600 }}
              />
              <Bar dataKey="visits" fill={PINK} radius={[6, 6, 0, 0]} maxBarSize={46} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <TopList title="Where they came from" rows={sources} />
        <TopList title="Top locations" rows={locations} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [cancelledIds, setCancelledIds] = useState([]);
  const [visits, setVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(false);

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); fetchBookings(); fetchVisits(); }
    else { setPwError(true); setTimeout(() => setPwError(false), 2000); }
  };

  const refreshAll = () => { fetchBookings(); fetchVisits(); };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*&order=date.asc,time.asc`, { headers: SUPA_HEADERS });
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch { setBookings([]); } finally { setLoading(false); }
  };

  const fetchVisits = async () => {
    setVisitsLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/visits?select=created_at,source,country,region,city,device&order=created_at.desc&limit=10000`, { headers: SUPA_HEADERS });
      const data = await res.json();
      setVisits(Array.isArray(data) ? data : []);
    } catch { setVisits([]); } finally { setVisitsLoading(false); }
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
        <VisitorAnalytics visits={visits} loading={visitsLoading} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontFamily: HEAD, fontSize: 20, fontWeight: 600 }}>
            Upcoming Bookings<span style={badge(upcoming.length, PINK, "#fff")}>{upcoming.length}</span>
          </div>
          <button onClick={refreshAll} style={{ background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 999, padding: "9px 18px", color: MUTED, fontSize: 14, cursor: "pointer", fontFamily: BODY, fontWeight: 500 }}>↻ Refresh</button>
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
