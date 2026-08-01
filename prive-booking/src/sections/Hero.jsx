import { useRef } from "react";

export default function Hero() {
  const cardRef = useRef(null);

  const handleMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;   // -0.5 … 0.5
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `rotateY(${px * 16}deg) rotateX(${-py * 13}deg) translateZ(24px)`;
  };
  const handleLeave = () => {
    if (cardRef.current) cardRef.current.style.transform = "";
  };

  return (
    <header className="hero" id="top">
      {/* roses sitting on the floor of the hero */}
      <div className="rose" style={{ left: "-26px", width: "150px" }}>
        <img src="/roses/rose-red-stem.png" alt="" />
      </div>
      <div className="rose rose--flip" style={{ right: "-30px", width: "230px" }}>
        <img src="/roses/bouquet-vintage.png" alt="" />
      </div>

      <div className="wrap">
        <div className="hero__grid">
          <div>
            <span className="hero__badge">We come to you · Anywhere in Nigeria</span>
            <h1>Lagos' <span className="accent">No.1</span> mobile<br />braiding <span className="leaf">studio</span>.</h1>
            <p className="hero__sub">
              Knotless braids, box braids, faux locs, butterfly locs, cornrows and installs, done clean, gentle and flawless, brought right to your door in Lagos and across Nigeria. Book online and we'll come to you.
            </p>
            <div className="hero__cta">
              <a className="pill pill--pink" href="#book">Book an Appointment</a>
              <a className="pill pill--ghost" href="#work">See Our Work</a>
            </div>
          </div>

          <div className="hero__art" onMouseMove={handleMove} onMouseLeave={handleLeave}>
            <div className="hero__card" ref={cardRef}>
              <img src="/hero.jpg" alt="The Privé by Luchi braiding team in Lagos, Nigeria" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
