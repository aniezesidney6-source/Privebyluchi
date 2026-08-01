import { VIDEOS } from "../data";
import { IconPlay } from "../Icons";

export default function Videos() {
  return (
    <section className="section section--pink" id="videos">
      <div className="rose rose--flip" style={{ right: "-28px", width: "175px", opacity: 0.92 }}>
        <img src="/roses/bouquet-watercolor.png" alt="" />
      </div>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">In Motion</div>
          <h2>Watch the magic happen</h2>
          <p>Timelapses, reveals and behind-the-scenes from the mobile chair.</p>
        </div>

        <div className="video-grid">
          {VIDEOS.map((v, i) => (
            <div className="video-card" key={i}>
              <div className="video-card__frame">
                {v.src ? (
                  <video src={`${v.src}?v=2`} poster={v.poster || undefined} controls preload="metadata" playsInline />
                ) : (
                  <div className="video-card__play"><IconPlay /></div>
                )}
              </div>
              <div className="video-card__meta">
                <b>{v.title}</b>
                <span>{v.src ? "Tap to play" : "Coming soon"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
