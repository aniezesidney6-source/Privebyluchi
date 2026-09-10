import { useState, useEffect, useMemo, useRef } from "react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";

const PINK = "#E85A8A", PINK_DEEP = "#C63E6C", PINK_TINT = "#FFF4F8";
const GREEN = "#1E4D3E", CREAM = "#FFFBF9", INK = "#26201F", MUTED = "#7A6E70", LINE = "#EFE3E8";
const HEAD = '"General Sans","Inter",system-ui,sans-serif';
const BODY = '"Inter",system-ui,sans-serif';

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";
// Admin authenticates with Supabase Auth; its data calls use the signed-in
// user's token (see authHeaders in the component), so the public anon key
// never grants write/PII access once RLS is tightened.

const fmt = (d) => new Date(d).toLocaleDateString("en-NG", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
const naira = (n) => (n == null || n === "" ? "—" : "₦" + Number(n).toLocaleString());

/* ---------- booking helpers ---------- */
const STATUSES = [
  { id: "pending", label: "Pending", bg: "#FFF4E5", col: "#B8730A" },
  { id: "deposit_paid", label: "Deposit paid", bg: "#FDECF2", col: PINK_DEEP },
  { id: "confirmed", label: "Confirmed", bg: "#E7F3EC", col: GREEN },
  { id: "completed", label: "Completed", bg: "#EAF0FF", col: "#3A5BB0" },
  { id: "no_show", label: "No-show", bg: "#FBEAEA", col: "#B23B3B" },
];
const statusOf = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];
const digits = (p) => (p || "").replace(/[^\d]/g, "");
const waLink = (phone, msg) => { let d = digits(phone); if (d.startsWith("0")) d = "234" + d.slice(1); else if (!d.startsWith("234")) d = "234" + d; return `https://wa.me/${d}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`; };
const telLink = (phone) => `tel:${(phone || "").replace(/\s+/g, "")}`;

function downloadCSV(rows) {
  const cols = ["date", "time", "name", "phone", "email", "style", "size", "addons", "total", "deposit", "status", "address", "notes", "created_at"];
  const esc = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `prive-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function printSchedule(list) {
  const w = window.open("", "_blank");
  if (!w) return;
  const byDate = {};
  list.forEach((b) => { (byDate[b.date] = byDate[b.date] || []).push(b); });
  const blocks = Object.keys(byDate).sort().map((d) => {
    const rows = byDate[d].sort((a, b) => (a.time > b.time ? 1 : -1)).map((b) =>
      `<tr><td>${b.time || ""}</td><td>${b.name || "—"}</td><td>${(b.style || "—")}${b.size ? " (" + b.size + ")" : ""}</td><td>${b.phone || "—"}</td><td>${b.address || "—"}</td><td>${b.deposit != null ? "₦" + Number(b.deposit).toLocaleString() : "—"}</td></tr>`).join("");
    return `<h2>${new Date(d).toDateString()}</h2><table><thead><tr><th>Time</th><th>Client</th><th>Style</th><th>Phone</th><th>Address</th><th>Deposit</th></tr></thead><tbody>${rows}</tbody></table>`;
  }).join("");
  w.document.write(`<html><head><title>Privé by Luchi — Schedule</title><style>body{font-family:system-ui,sans-serif;padding:26px;color:#26201F}h1{color:#1E4D3E;font-size:22px;margin:0 0 4px}h2{color:#C63E6C;font-size:15px;margin:22px 0 6px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:7px 10px;border-bottom:1px solid #eee;font-size:13px}th{color:#7A6E70;text-transform:uppercase;font-size:10px;letter-spacing:.05em}</style></head><body><h1>Privé by Luchi</h1><div style="color:#7A6E70;font-size:12px">Upcoming schedule · printed ${new Date().toLocaleString()}</div>${blocks || "<p>No upcoming bookings.</p>"}</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 350);
}

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
function buildSeries(visits, bookings, period) {
  const { n, unit } = period;
  const now = startOf(new Date(), unit);
  const buckets = [], index = {};
  for (let i = n - 1; i >= 0; i--) {
    const start = shift(now, unit, -i);
    index[start.getTime()] = buckets.length;
    buckets.push({ label: labelFor(start, unit), visits: 0, bookings: 0 });
  }
  const tally = (items, getDate, field) => {
    for (const it of items) {
      const t = new Date(getDate(it));
      if (isNaN(t)) continue;
      const key = startOf(t, unit).getTime();
      if (key in index) buckets[index[key]][field]++;
    }
  };
  tally(visits, (v) => v.created_at, "visits");
  tally(bookings, (b) => b.created_at || b.date, "bookings"); // by when the booking was made
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
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function buildHeatmap(visits) {
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  let max = 0;
  for (const v of visits) {
    const t = new Date(v.created_at); if (isNaN(t)) continue;
    const wd = (t.getDay() + 6) % 7, h = t.getHours();
    grid[wd][h]++; if (grid[wd][h] > max) max = grid[wd][h];
  }
  return { grid, max };
}
function returningStats(visits) {
  const counts = {};
  for (const v of visits) { if (v.visitor_id) counts[v.visitor_id] = (counts[v.visitor_id] || 0) + 1; }
  const ids = Object.keys(counts);
  const returning = ids.filter((id) => counts[id] > 1).length;
  return { unique: ids.length, returning, newv: ids.length - returning, untracked: visits.filter((v) => !v.visitor_id).length };
}

function StatTile({ label, value }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "16px 18px", minWidth: 0 }}>
      <div style={{ color: MUTED, fontSize: 12, marginBottom: 6, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ color: PINK_DEEP, fontSize: 26, fontWeight: 600, fontFamily: HEAD, lineHeight: 1.1, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}
const statGrid = (min) => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 10 });
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

function DeviceDonut({ visits }) {
  const data = useMemo(() => {
    let mobile = 0, desktop = 0;
    for (const v of visits) (v.device === "Mobile" ? mobile++ : desktop++);
    return [
      { name: "Mobile", value: mobile, color: PINK },
      { name: "Desktop", value: desktop, color: GREEN },
    ];
  }, [visits]);
  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "18px 20px", flex: 1, minWidth: 240 }}>
      <div style={{ fontFamily: HEAD, fontSize: 15, fontWeight: 600, color: GREEN, marginBottom: 10 }}>Device</div>
      {total === 0 ? (
        <p style={{ color: MUTED, fontSize: 13 }}>No data yet.</p>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 116, height: 116, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={34} outerRadius={54} paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
                  {data.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ fontFamily: HEAD, fontSize: 20, fontWeight: 600, color: INK }}>{total}</div>
              <div style={{ fontSize: 10, color: MUTED }}>visits</div>
            </div>
          </div>
          <div>
            {data.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9, fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                <span style={{ color: INK, minWidth: 58 }}>{d.name}</span>
                <b style={{ color: INK }}>{d.value}</b>
                <span style={{ color: MUTED }}>{Math.round((d.value / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReturningNew({ visits }) {
  const s = useMemo(() => returningStats(visits), [visits]);
  const total = s.returning + s.newv || 1;
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "18px 20px", flex: 1, minWidth: 220 }}>
      <div style={{ fontFamily: HEAD, fontSize: 15, fontWeight: 600, color: GREEN, marginBottom: 12 }}>New vs returning</div>
      {s.unique === 0 ? (
        <p style={{ color: MUTED, fontSize: 13 }}>Building up… once the visitor-id update is applied, returning visitors show here.</p>
      ) : (
        <>
          <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ width: `${(s.newv / total) * 100}%`, background: PINK }} />
            <div style={{ width: `${(s.returning / total) * 100}%`, background: GREEN }} />
          </div>
          {[{ name: "New visitors", value: s.newv, color: PINK }, { name: "Returning", value: s.returning, color: GREEN }].map((r) => (
            <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, fontSize: 13 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: r.color }} />
              <span style={{ color: INK, minWidth: 96 }}>{r.name}</span><b style={{ color: INK }}>{r.value}</b>
            </div>
          ))}
          {s.untracked > 0 && <div style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>{s.untracked} earlier visits not yet tagged</div>}
        </>
      )}
    </div>
  );
}

function PeakHeatmap({ visits }) {
  const { grid, max } = useMemo(() => buildHeatmap(visits), [visits]);
  if (!visits.length) return null;
  const hours = [...Array(24).keys()];
  const cellBg = (n) => (n === 0 ? "#F5EEF1" : `rgba(232,90,138,${0.18 + (max ? n / max : 0) * 0.82})`);
  const children = [<div key="corner" />];
  hours.forEach((h) => children.push(<div key={"h" + h} style={{ fontSize: 8.5, color: MUTED, textAlign: "center" }}>{h % 3 === 0 ? h : ""}</div>));
  WEEKDAYS.forEach((d, wd) => {
    children.push(<div key={"l" + wd} style={{ fontSize: 11, color: MUTED }}>{d}</div>);
    hours.forEach((h) => children.push(<div key={wd + "-" + h} title={`${d} ${h}:00 — ${grid[wd][h]} visit(s)`} style={{ height: 15, borderRadius: 3, background: cellBg(grid[wd][h]) }} />));
  });
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 18, padding: "18px 20px", marginTop: 16 }}>
      <div style={{ fontFamily: HEAD, fontSize: 15, fontWeight: 600, color: GREEN, marginBottom: 4 }}>Peak times</div>
      <p style={{ color: MUTED, fontSize: 12.5, marginBottom: 14 }}>When people visit, by weekday and hour.</p>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 560, display: "grid", gridTemplateColumns: "34px repeat(24, 1fr)", gap: 3, alignItems: "center" }}>{children}</div>
      </div>
    </div>
  );
}

function VisitorAnalytics({ visits, bookings, loading }) {
  const [period, setPeriod] = useState(PERIODS[1]); // Day
  const series = useMemo(() => buildSeries(visits, bookings, period), [visits, bookings, period]);
  const locations = useMemo(() => topBy(visits, (v) => [v.city, v.country].filter(Boolean).join(", ")), [visits]);
  const sources = useMemo(() => topBy(visits, (v) => v.source), [visits]);
  const styles = useMemo(() => topBy(bookings.filter((b) => b.style && b.style.trim()), (b) => b.style), [bookings]);

  const startToday = startOf(new Date(), "day").getTime();
  const upcomingB = bookings.filter((b) => new Date(b.date).getTime() >= startToday);
  const expectedRevenue = upcomingB.reduce((a, b) => a + (Number(b.total) || 0), 0);
  const depositsCollected = bookings
    .filter((b) => ["deposit_paid", "confirmed", "completed"].includes(b.status))
    .reduce((a, b) => a + (Number(b.deposit) || 0), 0);
  const d30 = Date.now() - 30 * 864e5;
  const v30 = visits.filter((v) => new Date(v.created_at).getTime() >= d30).length;
  const b30 = bookings.filter((b) => new Date(b.created_at || b.date).getTime() >= d30).length;
  const conversion = v30 ? Math.round((b30 / v30) * 100) : 0;

  return (
    <div>
      <div style={{ ...statGrid(120), marginBottom: 10 }}>
        <StatTile label="Total visits" value={visits.length} />
        <StatTile label="Today" value={countSince(visits, "day")} />
        <StatTile label="This week" value={countSince(visits, "week")} />
        <StatTile label="This month" value={countSince(visits, "month")} />
        <StatTile label="Conversion (30d)" value={`${conversion}%`} />
      </div>

      <div style={{ ...statGrid(150), marginBottom: 16 }}>
        <StatTile label="Expected revenue (upcoming)" value={naira(expectedRevenue)} />
        <StatTile label="Deposits collected" value={naira(depositsCollected)} />
        <StatTile label="Upcoming bookings" value={upcomingB.length} />
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
          <ResponsiveContainer width="100%" height={270}>
            <ComposedChart data={series} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={LINE} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} interval="preserveStartEnd" tickLine={false} axisLine={{ stroke: LINE }} />
              <YAxis yAxisId="v" allowDecimals={false} tick={{ fontSize: 11, fill: MUTED }} width={34} tickLine={false} axisLine={false} />
              <YAxis yAxisId="b" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: GREEN }} width={28} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: PINK_TINT }}
                contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}`, fontFamily: BODY, fontSize: 13 }}
                labelStyle={{ color: GREEN, fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: BODY, paddingTop: 4 }} iconType="circle" iconSize={9} />
              <Bar yAxisId="v" name="Visits" dataKey="visits" fill={PINK} radius={[6, 6, 0, 0]} maxBarSize={46} />
              <Line yAxisId="b" name="Bookings" dataKey="bookings" stroke={GREEN} strokeWidth={2.5} dot={{ r: 3, fill: GREEN }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <PeakHeatmap visits={visits} />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <DeviceDonut visits={visits} />
        <ReturningNew visits={visits} />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <TopList title="Where they came from" rows={sources} />
        <TopList title="Top locations" rows={locations} />
        <TopList title="Popular styles" rows={styles} />
      </div>
    </div>
  );
}

const pill = (col, bg, border) => ({ padding: "8px 14px", borderRadius: 999, border: `1.5px solid ${border || bg}`, background: bg, color: col, fontSize: 13, fontWeight: 600, fontFamily: BODY, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", lineHeight: 1 });
const miniInput = { border: `1.5px solid ${LINE}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, fontFamily: BODY, color: INK, background: "#fff", boxSizing: "border-box" };

function BookingCard({ b, onCancel, onStatus, onReschedule, cancelling, cancelled }) {
  const [editing, setEditing] = useState(false);
  const [rDate, setRDate] = useState(b.date);
  const [rTime, setRTime] = useState(b.time);
  const [saving, setSaving] = useState(false);
  const st = statusOf(b.status);
  const save = async () => { setSaving(true); const ok = await onReschedule(b.id, rDate, rTime); setSaving(false); if (ok) setEditing(false); };

  return (
    <div style={{ background: cancelled ? "#FDECEC" : "#fff", border: `1px solid ${cancelled ? "#F4B8B8" : LINE}`, borderRadius: 16, padding: "16px 18px", opacity: cancelled ? 0.6 : 1, boxShadow: "0 10px 30px -22px rgba(38,32,31,.35)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: GREEN, fontSize: 16, fontWeight: 600, fontFamily: HEAD }}>{b.name || "Unknown client"}</div>
          <div style={{ color: INK, fontSize: 14, marginTop: 2 }}>{b.style || "—"}{b.size ? ` · ${b.size}` : ""}</div>
          {b.addons && <div style={{ color: MUTED, fontSize: 12.5, marginTop: 2 }}>Add-ons: {b.addons}</div>}
        </div>
        <span style={{ background: st.bg, color: st.col, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{st.label}</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 10, fontSize: 13, color: MUTED }}>
        <span>📅 <b style={{ color: INK }}>{fmt(b.date)}</b></span>
        <span>⏱ {b.time}</span>
        {b.total != null && <span>💰 {naira(b.total)} · dep {naira(b.deposit)}</span>}
      </div>
      {b.address && <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>📍 {b.address}</div>}
      {b.notes && <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4, fontStyle: "italic" }}>“{b.notes}”</div>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, alignItems: "center" }}>
        {b.phone && (
          <>
            <a href={waLink(b.phone, `Hi ${(b.name || "love").split(" ")[0]}! 🌸 This is Privé by Luchi — a reminder of your ${b.style || "appointment"} on ${fmt(b.date)} at ${b.time}.${b.deposit ? ` Your ${naira(b.deposit)} deposit secures the slot.` : ""} Can't wait to see you — please confirm you're still on!`)} target="_blank" rel="noreferrer" style={pill(GREEN, "#E7F3EC", "#CFE4D8")}>Remind</a>
            <a href={telLink(b.phone)} style={pill(INK, "#F2ECEE", LINE)}>Call</a>
          </>
        )}
        <select value={b.status || "pending"} onChange={(e) => onStatus(b.id, e.target.value)}
          style={{ marginLeft: "auto", border: `1.5px solid ${LINE}`, borderRadius: 10, padding: "8px 34px 8px 14px", fontSize: 13, fontFamily: BODY, color: INK, background: "#fff", cursor: "pointer", appearance: "none", WebkitAppearance: "none", MozAppearance: "none", backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A6E70' stroke-width='2.5' stroke-linecap='round'><path d='M6 9l6 6 6-6'/></svg>")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {editing ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, alignItems: "center" }}>
          <input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} style={miniInput} />
          <input type="text" value={rTime} onChange={(e) => setRTime(e.target.value)} placeholder="e.g. 11:00 AM" style={{ ...miniInput, width: 130 }} />
          <button onClick={save} disabled={saving} style={pill("#fff", PINK, PINK)}>{saving ? "Saving…" : "Save"}</button>
          <button onClick={() => setEditing(false)} style={pill(MUTED, "#fff", LINE)}>Discard</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={() => { setRDate(b.date); setRTime(b.time); setEditing(true); }} style={pill(GREEN, "#fff", "#CFE4D8")}>Reschedule</button>
          <button onClick={() => onCancel(b.id)} disabled={cancelling || cancelled} style={pill(cancelled ? "#C0392B" : PINK_DEEP, PINK_TINT, "#F4C4D4")}>
            {cancelling ? "Cancelling…" : cancelled ? "Cancelled ✓" : "Cancel"}
          </button>
        </div>
      )}
    </div>
  );
}

function BlockedDates({ blocked, onAdd, onRemove }) {
  const [d, setD] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const add = async () => { if (!d) return; setBusy(true); await onAdd(d, reason); setBusy(false); setD(""); setReason(""); };
  return (
    <div>
      <div style={{ fontFamily: HEAD, fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Blocked-out Dates</div>
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "16px 18px" }}>
        <p style={{ color: MUTED, fontSize: 13, marginBottom: 12 }}>Dates marked here can't be booked by clients (holidays, personal days).</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: blocked.length ? 16 : 0 }}>
          <input type="date" value={d} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setD(e.target.value)} style={miniInput} />
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" style={{ ...miniInput, flex: 1, minWidth: 140 }} />
          <button onClick={add} disabled={busy || !d} style={pill("#fff", PINK, PINK)}>{busy ? "Adding…" : "Block date"}</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {blocked.map((x) => (
            <span key={x.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: PINK_TINT, border: "1px solid #F4C4D4", borderRadius: 999, padding: "6px 12px", fontSize: 13 }}>
              <b style={{ color: GREEN }}>{fmt(x.date)}</b>{x.reason ? <span style={{ color: MUTED }}>· {x.reason}</span> : null}
              <button onClick={() => onRemove(x.id)} title="Unblock" style={{ border: "none", background: "none", color: PINK_DEEP, cursor: "pointer", fontWeight: 700, fontSize: 16, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function clientsFrom(bookings) {
  const map = {};
  for (const b of bookings) {
    if (!b.name && !b.phone) continue;
    const key = (b.phone && digits(b.phone)) || (b.name || "").trim().toLowerCase();
    if (!key) continue;
    const c = map[key] || { name: b.name || "Unknown", phone: b.phone || "", email: b.email || "", count: 0, last: b.date, styles: new Set() };
    c.count++;
    if ((!c.name || c.name === "Unknown") && b.name) c.name = b.name;
    if (!c.phone && b.phone) c.phone = b.phone;
    if (!c.email && b.email) c.email = b.email;
    if (b.style) c.styles.add(b.style);
    if (new Date(b.date) > new Date(c.last)) c.last = b.date;
    map[key] = c;
  }
  return Object.values(map).sort((a, b) => new Date(b.last) - new Date(a.last));
}

function Clients({ bookings }) {
  const all = useMemo(() => clientsFrom(bookings), [bookings]);
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter((c) => (c.name || "").toLowerCase().includes(s) || digits(c.phone).includes(digits(s)));
  }, [all, q]);
  const exportClients = () => {
    const cols = ["name", "phone", "email", "bookings", "last_booking", "styles"];
    const esc = (v) => { const x = v == null ? "" : String(v); return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
    const rows = all.map((c) => ({ name: c.name, phone: c.phone, email: c.email, bookings: c.count, last_booking: c.last, styles: [...c.styles].join(" | ") }));
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `prive-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ fontFamily: HEAD, fontSize: 20, fontWeight: 600 }}>
          Clients<span style={{ marginLeft: 10, background: "#EFE3E8", color: MUTED, fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>{all.length}</span>
        </div>
        {all.length > 0 && <button onClick={exportClients} style={pill(GREEN, "#fff", "#CFE4D8")}>⤓ Export clients</button>}
      </div>
      {all.length === 0 ? (
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "30px 20px", textAlign: "center", color: MUTED, fontSize: 14 }}>
          Client records build automatically from bookings (name + number). New bookings appear here for easy re-contact and retention.
        </div>
      ) : (
        <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or number…" style={{ ...miniInput, width: "100%", padding: "11px 14px", marginBottom: 12 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map((c, i) => (
              <div key={i} style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: INK, fontSize: 15, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ color: MUTED, fontSize: 12.5 }}>{c.phone || "no number"} · {c.count} booking{c.count > 1 ? "s" : ""} · last {fmt(c.last)}</div>
                </div>
                {c.phone && (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <a href={waLink(c.phone, `Hi ${(c.name || "love").split(" ")[0]}! 🌸 It's Privé by Luchi — we'd love to have you back. Ready for your next style? Book here: https://privebyluchi.com`)} target="_blank" rel="noreferrer" style={pill(GREEN, "#E7F3EC", "#CFE4D8")}>WhatsApp</a>
                    <a href={telLink(c.phone)} style={pill(INK, "#F2ECEE", LINE)}>Call</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const CONTENT_KINDS = [
  { id: "work", label: "Work photos", accept: "image/*", media: "image", ph: "Caption (optional)" },
  { id: "video", label: "Videos", accept: "video/*", media: "video", ph: "Title (optional)" },
  { id: "review", label: "Reviews", accept: "image/*", media: "image", ph: "Client name" },
  { id: "celeb", label: "Celebrities", accept: "image/*", media: "image", ph: "Celebrity name" },
];

function ContentManager({ token }) {
  const [tab, setTab] = useState("work");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const kind = CONTENT_KINDS.find((k) => k.id === tab);
  const H = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${token()}`, "Content-Type": "application/json" });

  const load = async (k) => {
    setLoading(true);
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/site_content?select=*&kind=eq.${k}&order=sort.asc,created_at.asc`, { headers: H() });
      const d = await r.json();
      setItems(Array.isArray(d) ? d : []);
    } catch { setItems([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(tab); setTitle(""); setFile(null); }, [tab]);

  const add = async () => {
    if (!file) { alert("Choose a file first."); return; }
    setBusy(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${tab}/${Date.now()}-${safe}`;
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/content/${path}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token()}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "true" },
        body: file,
      });
      if (!up.ok) { alert("Upload failed. Make sure the 'content' storage bucket + policies exist. " + (await up.text()).slice(0, 120)); return; }
      const media_url = `${SUPABASE_URL}/storage/v1/object/public/content/${path}`;
      const ins = await fetch(`${SUPABASE_URL}/rest/v1/site_content`, {
        method: "POST", headers: { ...H(), Prefer: "return=minimal" },
        body: JSON.stringify({ kind: tab, title: title || null, media_url, sort: items.length }),
      });
      if (!ins.ok) { alert("Uploaded, but couldn't save the item. Is the site_content table + policy applied?"); return; }
      setTitle(""); setFile(null); load(tab);
    } catch { alert("Something went wrong during upload."); } finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!window.confirm("Remove this item from the site?")) return;
    setItems((p) => p.filter((x) => x.id !== id));
    try { await fetch(`${SUPABASE_URL}/rest/v1/site_content?id=eq.${id}`, { method: "DELETE", headers: H() }); } catch { /* ignore */ }
  };

  return (
    <div>
      <div style={{ fontFamily: HEAD, fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Website Content</div>
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "16px 18px" }}>
        <p style={{ color: MUTED, fontSize: 13, marginBottom: 14 }}>Add or remove what shows on your site. As soon as you add items to a section, they replace the built-in defaults there.</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {CONTENT_KINDS.map((k) => (
            <button key={k.id} onClick={() => setTab(k.id)} style={{ padding: "7px 14px", borderRadius: 999, border: `1.5px solid ${tab === k.id ? PINK : LINE}`, background: tab === k.id ? PINK : "#fff", color: tab === k.id ? "#fff" : MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: BODY }}>{k.label}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${LINE}` }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind.ph} style={{ ...miniInput, flex: 1, minWidth: 160 }} />
          <input type="file" accept={kind.accept} onChange={(e) => setFile(e.target.files[0] || null)} style={{ fontSize: 12.5, fontFamily: BODY, maxWidth: 210 }} />
          <button onClick={add} disabled={busy || !file} style={pill("#fff", PINK, PINK)}>{busy ? "Uploading…" : "Add"}</button>
        </div>

        {loading ? (
          <p style={{ color: MUTED, fontSize: 13 }}>Loading…</p>
        ) : items.length === 0 ? (
          <p style={{ color: MUTED, fontSize: 13 }}>No custom {kind.label.toLowerCase()} yet — your site is showing its built-in defaults.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
            {items.map((it) => (
              <div key={it.id} style={{ border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden", background: "#fff", position: "relative" }}>
                <div style={{ aspectRatio: "1 / 1", background: "#F5EEF1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {kind.media === "video"
                    ? <video src={it.media_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                    : <img src={it.media_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ padding: "6px 8px", fontSize: 11, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title || "—"}</div>
                <button onClick={() => del(it.id)} title="Remove" style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 999, border: "none", background: "rgba(198,62,108,.92)", color: "#fff", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "bookings", label: "Bookings", icon: "📅" },
  { id: "clients", label: "Clients", icon: "💗" },
  { id: "content", label: "Content", icon: "🖼" },
  { id: "dates", label: "Blocked dates", icon: "🚫" },
];

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("overview");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [cancelledIds, setCancelledIds] = useState([]);
  const [visits, setVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [blocked, setBlocked] = useState([]);

  // Admin API calls use the signed-in user's token when available, otherwise
  // the anon key (master-password fallback). This guarantees no lock-out.
  const MASTER = "Chigozie100500";
  const tokenRef = useRef("");
  const authHeaders = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${tokenRef.current || SUPABASE_KEY}`, "Content-Type": "application/json" });

  const enter = () => { setAuthed(true); fetchBookings(); fetchVisits(); fetchBlocked(); };

  const login = async () => {
    setSigningIn(true); setPwError("");
    // Quick master-password access (leave email blank) — uses the anon key.
    if (!email.trim()) {
      if (pw === MASTER) { tokenRef.current = ""; enter(); } else { setPwError("Incorrect password."); }
      setSigningIn(false); return;
    }
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: pw }),
      });
      const data = await res.json();
      if (res.ok && data.access_token) { tokenRef.current = data.access_token; enter(); }
      else setPwError(data.error_description || data.msg || "Incorrect email or password.");
    } catch { setPwError("Network error. Please try again."); } finally { setSigningIn(false); }
  };

  const refreshAll = () => { fetchBookings(); fetchVisits(); fetchBlocked(); };

  const fetchBlocked = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/blocked_dates?select=*&order=date.asc`, { headers: authHeaders() });
      const d = await res.json();
      setBlocked(Array.isArray(d) ? d : []);
    } catch { setBlocked([]); }
  };
  const addBlocked = async (date, reason) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/blocked_dates`, { method: "POST", headers: { ...authHeaders(), Prefer: "return=minimal" }, body: JSON.stringify({ date, reason: reason || null }) });
      fetchBlocked();
    } catch { alert("Could not block that date."); }
  };
  const removeBlocked = async (id) => {
    setBlocked((p) => p.filter((x) => x.id !== id));
    try { await fetch(`${SUPABASE_URL}/rest/v1/blocked_dates?id=eq.${id}`, { method: "DELETE", headers: authHeaders() }); } catch { /* ignore */ }
  };
  const updateStatus = async (id, status) => {
    setBookings((p) => p.map((b) => (b.id === id ? { ...b, status } : b)));
    try { await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`, { method: "PATCH", headers: { ...authHeaders(), Prefer: "return=minimal" }, body: JSON.stringify({ status }) }); } catch { /* ignore */ }
  };
  const saveReschedule = async (id, date, time) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`, { method: "PATCH", headers: { ...authHeaders(), Prefer: "return=minimal" }, body: JSON.stringify({ date, time }) });
      if (!res.ok) { alert("Could not reschedule. Make sure the DB update is applied."); return false; }
      setBookings((p) => p.map((b) => (b.id === id ? { ...b, date, time } : b)));
      return true;
    } catch { alert("Could not reschedule."); return false; }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*&order=date.asc,time.asc`, { headers: authHeaders() });
      let data = await res.json();
      data = Array.isArray(data) ? data : [];
      // Past bookings default to "completed" (never leave them as pending).
      const startToday = new Date(new Date().toDateString()).getTime();
      const stale = data.filter((b) => new Date(b.date).getTime() < startToday && (!b.status || b.status === "pending"));
      if (stale.length) {
        const staleIds = new Set(stale.map((b) => b.id));
        data = data.map((b) => (staleIds.has(b.id) ? { ...b, status: "completed" } : b));
        stale.forEach((b) => {
          fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${b.id}`, { method: "PATCH", headers: { ...authHeaders(), Prefer: "return=minimal" }, body: JSON.stringify({ status: "completed" }) }).catch(() => {});
        });
      }
      setBookings(data);
    } catch { setBookings([]); } finally { setLoading(false); }
  };

  const fetchVisits = async () => {
    setVisitsLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/visits?select=created_at,source,country,region,city,device,visitor_id&order=created_at.desc&limit=10000`, { headers: authHeaders() });
      const data = await res.json();
      setVisits(Array.isArray(data) ? data : []);
    } catch { setVisits([]); } finally { setVisitsLoading(false); }
  };

  const cancelBooking = async (id) => {
    setCancelling(id);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`, { method: "DELETE", headers: authHeaders() });
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
          <p style={{ color: MUTED, fontSize: 13, marginBottom: 26 }}>Booking Dashboard</p>
          <input
            type="email" placeholder="Email (optional)" value={email} autoComplete="username"
            onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()}
            style={{ width: "100%", background: "#fff", border: `1.5px solid ${pwError ? "#E05555" : LINE}`, borderRadius: 12, padding: "13px 16px", fontSize: 15, fontFamily: BODY, outline: "none", boxSizing: "border-box", marginBottom: 10 }}
          />
          <input
            type="password" placeholder="Password" value={pw} autoComplete="current-password"
            onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()}
            style={{ width: "100%", background: "#fff", border: `1.5px solid ${pwError ? "#E05555" : LINE}`, borderRadius: 12, padding: "13px 16px", fontSize: 15, fontFamily: BODY, outline: "none", boxSizing: "border-box" }}
          />
          {pwError && <p style={{ color: "#C0392B", fontSize: 13, marginTop: 8 }}>{pwError}</p>}
          <button onClick={login} disabled={signingIn || !pw} style={{ width: "100%", marginTop: 16, padding: "14px", background: PINK, border: "none", borderRadius: 999, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: BODY, opacity: signingIn || !pw ? 0.6 : 1 }}>{signingIn ? "Signing in…" : "Sign In ✿"}</button>
          <p style={{ color: MUTED, fontSize: 11.5, marginTop: 12 }}>Sign in with your email + password, or just the master password.</p>
        </div>
      </div>
    );
  }

  const today = new Date(new Date().toDateString());
  const upcoming = bookings.filter((b) => new Date(b.date) >= today);
  const past = bookings.filter((b) => new Date(b.date) < today);
  const clientCount = clientsFrom(bookings).length;

  const badge = (n, bg, col) => ({ marginLeft: 10, background: bg, color: col, fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 20, fontFamily: BODY });
  const counts = { overview: null, bookings: upcoming.length, clients: clientCount, content: null, dates: blocked.length };
  const sectionTitle = { fontFamily: HEAD, fontSize: 20, fontWeight: 600, marginBottom: 16 };

  return (
    <div style={shell}>
      <style>{`
        .adm-wrap{max-width:860px;margin:0 auto;padding:26px 22px 72px;}
        .adm-tabs{position:sticky;top:0;z-index:20;background:rgba(255,251,249,.92);backdrop-filter:saturate(1.4) blur(8px);border-bottom:1px solid ${LINE};}
        .adm-tabs-inner{max-width:860px;margin:0 auto;display:flex;gap:6px;padding:10px 22px;overflow-x:auto;-ms-overflow-style:none;scrollbar-width:none;}
        .adm-tabs-inner::-webkit-scrollbar{display:none;}
        .adm-head{padding:20px 22px;background:#fff;border-bottom:1px solid ${LINE};}
        .adm-head-inner{max-width:860px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:14px;}
        @media(max-width:560px){
          .adm-wrap{padding:20px 14px 64px;}
          .adm-head{padding:16px 14px;}
          .adm-tabs-inner{padding:9px 14px;}
          .adm-head-h1{font-size:20px!important;}
          .adm-head-total{font-size:23px!important;}
        }
      `}</style>

      <div className="adm-head">
        <div className="adm-head-inner">
          <div>
            <div style={{ color: PINK, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Admin Dashboard</div>
            <h1 className="adm-head-h1" style={{ fontFamily: HEAD, fontSize: 24, fontWeight: 600, color: GREEN }}>Privé by Luchi</h1>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ color: MUTED, fontSize: 12, marginBottom: 2 }}>Total bookings</div>
            <div className="adm-head-total" style={{ color: PINK_DEEP, fontSize: 28, fontWeight: 600, fontFamily: HEAD }}>{bookings.length}</div>
          </div>
        </div>
      </div>

      <div className="adm-tabs">
        <div className="adm-tabs-inner">
          {TABS.map((t) => {
            const active = t.id === tab;
            const c = counts[t.id];
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: 999, border: `1.5px solid ${active ? PINK : LINE}`, background: active ? PINK : "#fff", color: active ? "#fff" : MUTED, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: BODY, whiteSpace: "nowrap", flexShrink: 0 }}>
                <span style={{ fontSize: 14 }}>{t.icon}</span>{t.label}
                {c != null && c > 0 && <span style={{ background: active ? "rgba(255,255,255,.28)" : PINK_TINT, color: active ? "#fff" : PINK_DEEP, fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>{c}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="adm-wrap">
        {tab === "overview" && (
          <>
            <div style={sectionTitle}>Website Visitors</div>
            <VisitorAnalytics visits={visits} bookings={bookings} loading={visitsLoading} />
          </>
        )}

        {tab === "bookings" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
              <div style={{ fontFamily: HEAD, fontSize: 20, fontWeight: 600 }}>
                Upcoming Bookings<span style={badge(upcoming.length, PINK, "#fff")}>{upcoming.length}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => printSchedule(upcoming)} style={pill(GREEN, "#fff", "#CFE4D8")}>🖨 Print schedule</button>
                <button onClick={() => downloadCSV(bookings)} style={pill(GREEN, "#fff", "#CFE4D8")}>⤓ Export CSV</button>
                <button onClick={refreshAll} style={pill(MUTED, "#fff", LINE)}>↻ Refresh</button>
              </div>
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
                {upcoming.map((b) => (
                  <BookingCard key={b.id} b={b}
                    cancelling={cancelling === b.id} cancelled={cancelledIds.includes(b.id)}
                    onCancel={cancelBooking} onStatus={updateStatus} onReschedule={saveReschedule} />
                ))}
              </div>
            )}

            {past.length > 0 && (
              <>
                <div style={{ fontFamily: HEAD, fontSize: 18, fontWeight: 600, margin: "36px 0 16px", color: MUTED }}>
                  Past Bookings<span style={badge(past.length, "#EFE3E8", MUTED)}>{past.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {past.map((b) => (
                    <div key={b.id} style={{ background: "#F7F0F3", border: `1px solid ${LINE}`, borderRadius: 14, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, opacity: 0.75 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: INK, fontSize: 14, fontWeight: 600 }}>{b.name || "Unknown"}<span style={{ color: MUTED, fontWeight: 400 }}>{b.style ? ` · ${b.style}` : ""}</span></div>
                        <div style={{ color: MUTED, fontSize: 12.5 }}>{fmt(b.date)} · {b.time}</div>
                      </div>
                      <span style={{ background: statusOf(b.status).bg, color: statusOf(b.status).col, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>{statusOf(b.status).label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === "clients" && <Clients bookings={bookings} />}

        {tab === "content" && <ContentManager token={() => tokenRef.current || SUPABASE_KEY} />}

        {tab === "dates" && <BlockedDates blocked={blocked} onAdd={addBlocked} onRemove={removeBlocked} />}
      </div>

      <div style={{ borderTop: `1px solid ${LINE}`, padding: "20px 24px", textAlign: "center" }}>
        <p style={{ color: MUTED, fontSize: 13 }}>Privé by Luchi · Admin ✿</p>
      </div>
    </div>
  );
}
