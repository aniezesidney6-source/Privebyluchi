import { HAIRCARE } from "../data";

export default function HairCare() {
  return (
    <section className="section section--pink" id="care">
      <div className="rose rose--flip" style={{ right: "-22px", width: "150px", opacity: 0.9 }}>
        <img src="/roses/rose-pink-top.png" alt="" />
      </div>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Hair Care Advice</div>
          <h2>Keep your braids beautiful</h2>
          <p>A few simple habits make your style last longer and keep your natural hair healthy underneath.</p>
        </div>

        <div className="care-grid">
          {HAIRCARE.map((c, i) => (
            <div className="care-card" key={i}>
              <div className="care-card__num">{String(i + 1).padStart(2, "0")}</div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
