import { useEffect } from "react";
import "../styles.css";

export default function NotFound() {
  useEffect(() => {
    document.title = "Page not found | Privé by Luchi";
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex, follow";
    document.head.appendChild(m);
    return () => { document.head.removeChild(m); };
  }, []);

  return (
    <main className="notfound">
      <div className="bloom" aria-hidden="true">✿</div>
      <h1>This page took a wrong turn</h1>
      <p>The page you're looking for doesn't exist, but your next flawless braid style is just a tap away.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <a className="pill pill--pink" href="/">Back to home</a>
        <a className="pill pill--ghost" href="/#book">Book an appointment</a>
      </div>
    </main>
  );
}
