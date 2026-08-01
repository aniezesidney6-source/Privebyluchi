import Logo from "../Logo";
import { CONTACT, whatsappLink } from "../theme";
import { IconInstagram, IconTiktok, IconWhatsapp, IconMail, IconPin } from "../Icons";

export default function Footer() {
  return (
    <footer className="footer" id="contact">
      {/* roses resting on the footer floor */}
      <div className="rose" style={{ left: "-26px", width: "180px", opacity: 0.95, filter: "drop-shadow(0 10px 16px rgba(0,0,0,.35))" }}>
        <img src="/roses/bouquet-vintage.png" alt="" />
      </div>
      <div className="rose rose--flip" style={{ right: "-20px", width: "140px", opacity: 0.95, filter: "drop-shadow(0 10px 16px rgba(0,0,0,.35))" }}>
        <img src="/roses/rose-red-stem.png" alt="" />
      </div>

      <div className="wrap">
        <div className="footer__grid">
          <div className="footer__brandcol">
            <div className="footer__logo"><Logo style={{ height: 24 }} /></div>
            <p>{CONTACT.tagline}. Premium protective styling brought to your door, based in {CONTACT.base}, available anywhere in Nigeria.</p>
          </div>

          <div>
            <h4>Explore</h4>
            <div className="footer__links">
              <a href="#book">Book Now</a>
              <a href="#work">Our Work</a>
              <a href="#videos">Videos</a>
              <a href="#reviews">Reviews</a>
              <a href="#about">Meet the CEO</a>
              <a href="#care">Hair Care</a>
            </div>
          </div>

          <div>
            <h4>Get in touch</h4>
            <div className="footer__contact">
              <a href={whatsappLink()} target="_blank" rel="noreferrer"><IconWhatsapp /> {CONTACT.whatsappDisplay}</a>
              <a href={CONTACT.instagram} target="_blank" rel="noreferrer"><IconInstagram /> {CONTACT.instagramHandle}</a>
              <a href={CONTACT.tiktok} target="_blank" rel="noreferrer"><IconTiktok /> {CONTACT.tiktokHandle}</a>
              <a href={`mailto:${CONTACT.email}`}><IconMail /> {CONTACT.email}</a>
              <a href="#book" style={{ cursor: "default" }}><IconPin /> {CONTACT.base} · nationwide</a>
            </div>
          </div>
        </div>

        <div className="footer__bar">
          <small>© {new Date().getFullYear()} Privé by Luchi · {CONTACT.hours}</small>
        </div>

        <div className="footer__biglogo">
          <Logo />
        </div>
      </div>
    </footer>
  );
}
