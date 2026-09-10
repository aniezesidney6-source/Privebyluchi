// Editable site content (managed from the admin dashboard).
// Public sections render their built-in defaults instantly, then swap in
// database content when the owner has added any — so the site never blanks.
import { useState, useEffect } from "react";

const SUPABASE_URL = "https://vsabwbuzwhxfwqjpiyvs.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzYWJ3YnV6d2h4ZndxanBpeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Nzk5MjQsImV4cCI6MjA5MjM1NTkyNH0.So0iq2E58JGBi7DLujGsFp6d_NV3doM0d_dxy7OgzFw";

export async function fetchContent(kind) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/site_content?select=*&kind=eq.${kind}&order=sort.asc,created_at.asc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const d = await res.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

export function useContent(kind, fallback, map) {
  const [items, setItems] = useState(fallback);
  useEffect(() => {
    let alive = true;
    fetchContent(kind).then((rows) => {
      if (!alive || !rows.length) return;
      try { setItems(rows.map(map)); } catch { /* keep the fallback on any mapping issue */ }
    });
    return () => { alive = false; };
  }, [kind]);
  return items;
}
