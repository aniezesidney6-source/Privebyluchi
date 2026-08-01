import { useLayoutEffect } from "react";
import "./styles.css";
import Nav from "./sections/Nav";
import Hero from "./sections/Hero";
import Strip from "./sections/Strip";
import Booking from "./Booking";
import Work from "./sections/Work";
import Videos from "./sections/Videos";
import Reviews from "./sections/Reviews";
import Celebrities from "./sections/Celebrities";
import Ceo from "./sections/CEO";
import HairCare from "./sections/HairCare";
import Footer from "./sections/Footer";

const REVEAL_SELECTOR =
  ".section-head, .work-card, .video-card, .review-shot, .celeb, .care-card, .ceo__photo, .ceo__bio";

export default function App() {
  // Reveal-on-scroll: gently fade/rise elements as they enter the viewport.
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = [...document.querySelectorAll(REVEAL_SELECTOR)];
    const perParent = new Map();
    els.forEach((el) => {
      el.classList.add("reveal");
      const seen = perParent.get(el.parentNode) || 0;      // subtle stagger within a group
      el.style.transitionDelay = Math.min(seen * 70, 280) + "ms";
      perParent.set(el.parentNode, seen + 1);
    });
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <Nav />
      <Hero />
      <Strip />
      <Booking />
      <Work />
      <Videos />
      <Reviews />
      <Celebrities />
      <Ceo />
      <HairCare />
      <Footer />
    </>
  );
}
