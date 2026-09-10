import { CELEBS } from "../data";
import { IconUser } from "../Icons";
import { useContent } from "../content";

export default function Celebrities() {
  const celebs = useContent("celeb", CELEBS, (r) => ({ name: r.title, img: r.media_url }));
  return (
    <section className="section section--green" id="celebs">
      <div className="wrap">
        <div className="section-head" style={{ maxWidth: 720 }}>
          <div className="eyebrow">As Seen On</div>
          <h2 style={{ color: "#fff" }}>We've braided celebrities</h2>
          <p>From music to movies to the timeline, some familiar faces have sat in the Privé chair.</p>
        </div>

        <div className="celeb-grid">
          {celebs.map((c, i) => (
            <div className="celeb" key={i}>
              <div className="celeb__pic">
                {c.img ? <img src={c.img} alt={c.name} loading="lazy" decoding="async" /> : <IconUser />}
              </div>
              <b>{c.name}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
