import { useState, useEffect } from "react";
import Logo from "../Logo";
import { IconMenu, IconClose } from "../Icons";

const LINKS = [
  ["#book", "Book"],
  ["#work", "Our Work"],
  ["#videos", "Videos"],
  ["#reviews", "Reviews"],
  ["#about", "About"],
  ["#care", "Hair Care"],
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <nav className="nav">
        <div className="nav__inner">
          <a href="#top" className="nav__logo" aria-label="Privé by Luchi home"><Logo /></a>
          <div className="nav__links">
            {LINKS.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
          </div>
          <div className="nav__cta">
            <a className="pill pill--pink" href="#book">Book Appointment</a>
            <button
              className="nav__burger" aria-label="Menu" aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Slide-out drawer — sibling of <nav> so position:fixed anchors to the viewport
          (the nav's backdrop-filter would otherwise become its containing block). */}
      <div className={`nav__overlay ${open ? "show" : ""}`} onClick={close} aria-hidden="true" />
      <aside className={`nav__drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="nav__drawer-head">
          <Logo />
          <button className="nav__burger" aria-label="Close menu" onClick={close}><IconClose /></button>
        </div>
        <div className="nav__drawer-links">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} onClick={close}>{label}</a>
          ))}
        </div>
        <a className="pill pill--pink nav__drawer-cta" href="#book" onClick={close}>Book Appointment</a>
      </aside>
    </>
  );
}
