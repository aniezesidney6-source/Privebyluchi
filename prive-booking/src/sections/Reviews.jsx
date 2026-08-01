import { REVIEWS } from "../data";
import { IconWhatsapp } from "../Icons";

export default function Reviews() {
  return (
    <section className="section" id="reviews">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Reviews</div>
          <h2>Loved by every client</h2>
          <p>Real messages from real clients, straight from WhatsApp.</p>
        </div>

        <div className="review-grid">
          {REVIEWS.map((r, i) => (
            <figure className="review-shot" key={i}>
              <img src={r.shot} alt={`WhatsApp review from ${r.name}`} loading="lazy" />
              <figcaption><IconWhatsapp /> {r.name} · via WhatsApp</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
