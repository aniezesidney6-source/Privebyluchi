import { CEO } from "../data";
import { IconUser, IconInstagram, IconTiktok, IconWhatsapp } from "../Icons";
import { whatsappLink } from "../theme";

export default function Ceo() {
  return (
    <section className="section" id="about">
      <div className="rose" style={{ left: "-30px", width: "185px", opacity: 0.92 }}>
        <img src="/roses/bouquet-vintage.png" alt="" />
      </div>
      <div className="wrap">
        <div className="ceo">
          <div className="ceo__photo">
            {CEO.photo ? <img src={CEO.photo} alt={CEO.name} loading="lazy" decoding="async" /> : (
              <div className="ceo__photo-ph"><IconUser style={{ margin: "0 auto" }} /><div>Portrait of {CEO.name.split(" ")[0]}</div></div>
            )}
            <div className="ceo__badge">
              <b>{CEO.name}</b>
              <span>{CEO.title}</span>
            </div>
          </div>

          <div>
            <div className="eyebrow">Meet the CEO</div>
            <h2>{CEO.name}</h2>
            <div className="ceo__bio">
              {CEO.bio.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="ceo__socials">
              <a className="pill pill--green" href={CEO.instagram} target="_blank" rel="noreferrer"><IconInstagram style={{ width: 18, height: 18 }} /> Instagram</a>
              <a className="pill pill--ghost" href={CEO.tiktok} target="_blank" rel="noreferrer"><IconTiktok style={{ width: 18, height: 18 }} /> TikTok</a>
              <a className="pill pill--ghost" href={whatsappLink()} target="_blank" rel="noreferrer"><IconWhatsapp style={{ width: 18, height: 18 }} /> WhatsApp</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
