import { useEffect, useMemo, useState } from "react";
import "../styles.css";
import Logo from "../Logo";
import { SEASON, seasonDays, peakFor, isPublic } from "../season";
import { fmt, whatsappLink } from "../theme";
import { trackVisit } from "../track";

// /december — the Detty December pre-sale. Every number on this page comes
// from real bookings + blocked dates, so the scarcity it shows is true.

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";
const SUPA_HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
const WEB3FORMS_KEY = "9fc37df0-a3dd-4874-b8e4-711c80aaee35";

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "twenty-one", "twenty-two", "twenty-three", "twenty-four", "twenty-five", "twenty-six", "twenty-seven"];
const say = (n) => WORDS[n] || String(n);
const minDate = () => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split("T")[0]; };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function December() {
  const days = useMemo(seasonDays, []);
  const [taken, setTaken] = useState(null); // Set of unavailable dates, null while loading
  const [wl, setWl] = useState({ name: "", phone: "", email: "", dates: "", style: "" });
  const [wlState, setWlState] = useState(""); // "" | sending | sent | error

  useEffect(() => {
    document.title = "December dates · Privé by Luchi";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = `One chair a day, ${days.length} December dates. Book your Detty December braids with Privé by Luchi, the luxury mobile braiding studio in Lagos.`;
    trackVisit();
    // Instrument Serif carries the italic display moments on this page only.
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap";
    document.head.appendChild(l);

    const from = days[0], to = days[days.length - 1];
    Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/bookings?select=date&date=gte.${from}&date=lte.${to}`, { headers: SUPA_HEADERS }).then((r) => r.json()).catch(() => []),
      fetch(`${SUPABASE_URL}/rest/v1/blocked_dates?select=date&date=gte.${from}&date=lte.${to}`, { headers: SUPA_HEADERS }).then((r) => r.json()).catch(() => []),
    ]).then(([b, x]) => {
      const set = new Set();
      [b, x].forEach((rows) => Array.isArray(rows) && rows.forEach((r) => set.add(r.date)));
      setTaken(set);
    });
    return () => { document.head.removeChild(l); };
  }, [days]);

  const soon = minDate();
  const stateOf = (d) => (taken?.has(d) ? "taken" : d < soon ? "past" : "open");
  const left = taken ? days.filter((d) => stateOf(d) === "open").length : null;
  const soldOut = left === 0;

  // Lay the month out Mon–Sat with leading blanks so dates sit under their weekday.
  const lead = (new Date(SEASON.year, SEASON.month - 1, 1).getDay() + 6) % 7; // Mon = 0
  const cells = [...Array(lead === 6 ? 0 : lead).fill(null), ...days];

  const joinWaitlist = async (e) => {
    e.preventDefault();
    setWlState("sending");
    try {
      const r = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `✦ December waitlist — ${wl.name}`,
          from_name: "Privé by Luchi · December",
          message: `DECEMBER WAITLIST\n\nName: ${wl.name}\nPhone / WhatsApp: ${wl.phone}\nEmail: ${wl.email}\nDates wanted: ${wl.dates || "Any"}\nStyle: ${wl.style || "Not sure yet"}\n\nIf a December date frees up, offer it here first. Otherwise, offer first pick of January.`,
        }),
      });
      setWlState(r.ok ? "sent" : "error");
    } catch { setWlState("error"); }
  };

  return (
    <div className="dec">
      <header className="dec-top">
        <a href="/" aria-label="Privé by Luchi home"><Logo /></a>
        <a className="dec-top__link" href="#dates">{soldOut ? "Join the waitlist" : "Choose a date"} →</a>
      </header>

      {/* ── I. The premise ───────────────────────────── */}
      <section className="dec-hero">
        <div className="dec-hero__copy">
          <div className="dec-kicker">{isPublic() ? "Detty December" : "Early access · Privé clients first"} · {SEASON.year}</div>
          <h1>
            One chair.<br />
            <em>{say(days.length).replace(/^./, (c) => c.toUpperCase())}</em> days<br />
            of December.
          </h1>
          <p>
            Weddings, owambes, Christmas at home, flights in from London and Houston. Privé braids one client a day,
            at your door, so once a December date is gone, it's gone.
          </p>
          <a className="pill pill--pink" href="#dates">{soldOut ? "Join the waitlist" : "Claim your date"}</a>
        </div>

        <aside className="dec-count" aria-live="polite">
          <span className="dec-count__live"><i /> Live</span>
          <div className="dec-count__num">{left == null ? "—" : left}</div>
          <div className="dec-count__of">of {days.length} December dates<br />still open</div>
        </aside>
      </section>

      {/* ── II. The month, honestly ──────────────────── */}
      <section className="dec-cal" id="dates">
        <div className="dec-cal__head">
          <h2>December, <em>day by day</em></h2>
          <div className="dec-legend">
            {SEASON.tiers.map((t) => (
              <span key={t.label} className={t.fee === Math.max(...SEASON.tiers.map((x) => x.fee)) ? "hot" : ""}>
                <b>{t.label}</b> {t.from}–{t.to} Dec · +{fmt(t.fee)}
              </span>
            ))}
          </div>
        </div>

        <div className="dec-grid" role="list">
          {WEEKDAYS.map((w) => <div key={w} className="dec-grid__wd" aria-hidden="true">{w}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`b${i}`} className="dec-day dec-day--blank" aria-hidden="true" />;
            const st = taken ? stateOf(d) : "loading";
            const n = +d.slice(8);
            const hot = peakFor(d)?.fee === Math.max(...SEASON.tiers.map((x) => x.fee));
            const label = new Date(d + "T00:00:00").toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" });
            const inner = (
              <>
                <span className="dec-day__n">{n}</span>
                <span className="dec-day__s">{st === "open" ? "Open" : st === "taken" ? "Taken" : st === "past" ? "Closed" : ""}</span>
              </>
            );
            return st === "open" ? (
              <a key={d} role="listitem" className={`dec-day dec-day--open ${hot ? "hot" : ""}`} href={`/?date=${d}#book`} aria-label={`${label}, open, book this date`}>{inner}</a>
            ) : (
              <div key={d} role="listitem" className={`dec-day dec-day--${st} ${hot ? "hot" : ""}`} aria-label={`${label}, ${st}`}>{inner}</div>
            );
          })}
        </div>
        <p className="dec-cal__foot">Tap an open date to book it. Sundays are rest days. Bookings close 48 hours before each date.</p>
      </section>

      {/* ── III. The terms, plainly ──────────────────── */}
      <section className="dec-terms">
        <div className="dec-terms__lede">
          <h2>Why December <em>costs more</em></h2>
          <p>
            It's the one month every client wants the same three weeks. The peak fee keeps the calendar fair, and a
            {" "}{Math.round(SEASON.depositRate * 100)}% deposit means every date that's taken is a date that's kept.
          </p>
        </div>
        <ol className="dec-terms__list">
          {SEASON.tiers.map((t) => (
            <li key={t.label}>
              <span className="dec-terms__fig">+{fmt(t.fee)}</span>
              <span><b>{t.label}</b>{t.from}–{t.to} December, on top of your usual style price.</span>
            </li>
          ))}
          <li>
            <span className="dec-terms__fig">{Math.round(SEASON.depositRate * 100)}%</span>
            <span><b>Deposit secures it</b>Pay by bank transfer to your own one-off account number; it confirms instantly. Balance on the day.</span>
          </li>
          <li>
            <span className="dec-terms__fig dec-terms__fig--word">Abroad?</span>
            <span><b>Book before you fly</b>Lock your date from anywhere, and we'll be at your door the week you land.</span>
          </li>
        </ol>
      </section>

      {/* ── IV. The waitlist ─────────────────────────── */}
      <section className="dec-wait" id="waitlist">
        <div className="dec-wait__copy">
          <div className="dec-kicker">The waitlist</div>
          <h2>{soldOut ? <>December is <em>full.</em></> : <>Missed <em>your</em> date?</>}</h2>
          <p>
            Plans change and dates free up. Leave your details and you hear first if one opens. If none does,
            you get first pick of January, before anyone else.
          </p>
        </div>

        {wlState === "sent" ? (
          <div className="dec-wait__done">
            <b>You're on the list ✿</b>
            <span>We'll message you on WhatsApp the moment a date opens.</span>
          </div>
        ) : (
          <form className="dec-wait__form" onSubmit={joinWaitlist}>
            {[
              ["name", "Name", "text", true],
              ["phone", "WhatsApp number", "tel", true],
              ["email", "Email", "email", true],
              ["dates", "Dates you'd love", "text", false, "e.g. 22–24 Dec, or any weekend"],
              ["style", "Style", "text", false, "e.g. small knotless, waist length"],
            ].map(([k, label, type, req, ph]) => (
              <label key={k} className="dec-field">
                <span>{label}</span>
                <input type={type} required={req} placeholder={ph} value={wl[k]} onChange={(e) => setWl((w) => ({ ...w, [k]: e.target.value }))} />
              </label>
            ))}
            <button className="pill pill--green" type="submit" disabled={wlState === "sending"}>
              {wlState === "sending" ? "Adding you…" : "Put me on the list"}
            </button>
            {wlState === "error" && <div className="err">That didn't go through. Try again, or <a href={whatsappLink("Hi Privé! Please add me to the December waitlist.")} style={{ textDecoration: "underline" }}>message us on WhatsApp</a>.</div>}
          </form>
        )}
      </section>

      <footer className="dec-foot">
        <a href="/">Privé by Luchi</a> · Luxury mobile braiding · Lagos & nationwide
      </footer>
    </div>
  );
}
