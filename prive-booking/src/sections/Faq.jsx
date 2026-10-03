import { FAQS } from "../data";

export default function Faq() {
  return (
    <section className="section" id="faq">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Good to Know</div>
          <h2>Frequently asked questions</h2>
          <p>Everything about booking a mobile braiding appointment with Privé by Luchi in Lagos and across Nigeria.</p>
        </div>

        <div className="faq-list">
          {FAQS.map((f, i) => (
            <details className="faq-item" key={i} name="faq">
              <summary>
                <span>{f.q}</span>
                <span className="faq-item__mark" aria-hidden="true">+</span>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>

        <p className="faq-foot">
          Still have a question? <a href="#book">Book your appointment</a> and we'll take care of the rest.
        </p>
      </div>
    </section>
  );
}
