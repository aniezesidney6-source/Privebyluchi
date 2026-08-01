// Marquee of signature styles, just under the hero
const ITEMS = ["Knotless Braids", "Box Braids", "Faux Locs", "Butterfly Locs", "Fulani & Cornrows", "Stitch Braids", "Frontal Installs", "Home Service"];

export default function Strip() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="celebstrip" aria-hidden="true">
      <div className="celebstrip__track">
        {row.map((t, i) => <span key={i}>{t}</span>)}
      </div>
    </div>
  );
}
