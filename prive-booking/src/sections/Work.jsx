import { WORKS } from "../data";
import { IconBloom } from "../Icons";

export default function Work() {
  return (
    <section className="section" id="work">
      <div className="rose" style={{ left: "-24px", width: "150px", opacity: 0.9 }}>
        <img src="/roses/rose-pink-top.png" alt="" />
      </div>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Our Work</div>
          <h2>A gallery of finished looks</h2>
          <p>A look at some of the braids from the Privé chair. Swipe through, there's plenty more where these came from.</p>
        </div>

        <div className="work__rail">
          {WORKS.map((w, i) => (
            <figure className="work-card" key={i}>
              {w.img ? <img src={w.img} alt={w.name} /> : (
                <div className="work-card__ph"><IconBloom /></div>
              )}
            </figure>
          ))}
        </div>
        <div className="rail-hint">Scroll / swipe to see all {WORKS.length} looks</div>
      </div>
    </section>
  );
}
