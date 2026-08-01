import { useState } from "react";
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
  return (
    <nav className="nav">
      <div className="nav__inner">
        <a href="#top" className="nav__logo" aria-label="Privé by Luchi home"><Logo /></a>
        <div className="nav__links">
          {LINKS.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </div>
        <div className="nav__cta">
          <a className="pill pill--pink" href="#book">Book Appointment</a>
          <button className="nav__burger" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>
      {open && (
        <div className="nav__mobile">
          {LINKS.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
          <a className="pill pill--pink" href="#book" onClick={() => setOpen(false)}>Book Appointment</a>
        </div>
      )}
    </nav>
  );
}
