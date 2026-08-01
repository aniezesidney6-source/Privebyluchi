// ─────────────────────────────────────────────────────────────
// Privé by Luchi — content data
// Prices: old list +₦15,000 per size. Add-ons: old +₦8,000.
// Home Service add-on removed (mobile studio — logistics covered by client).
// ─────────────────────────────────────────────────────────────

export const SERVICES = [
  {
    id: "knotless_box",
    name: "Knotless / Box Braids",
    duration: "5–8 hrs",
    desc: "Clean knotless finish or classic box sections.",
    sizes: { "X-Small": 80000, "Small": 60000, "Medium": 50000, "Large": 45000 },
  },
  {
    id: "fulani_cornrows",
    name: "Fulani / Cornrows",
    duration: "3–5 hrs",
    desc: "Centre-part cornrows or fulani with beaded details.",
    sizes: { "Small": 55000, "Medium": 50000, "Large": 45000 },
  },
  {
    id: "stitch",
    name: "Stitch Braids",
    duration: "4–6 hrs",
    desc: "Precise feed-in stitching for a bold, clean look.",
    sizes: { "Small": 55000, "Medium": 50000, "Large": 45000 },
  },
  {
    id: "faux_locs",
    name: "Faux Locs",
    duration: "3–5 hrs",
    desc: "Textured, boho-distressed or neat finish.",
    sizes: { "Small": 50000, "Medium": 45000, "Large": 40000 },
  },
  {
    id: "butterfly_locs",
    name: "Butterfly Locs",
    duration: "4–6 hrs",
    desc: "Soft, wispy butterfly-textured locs.",
    variants: {
      "12–20 inches": { "Medium": 50000, "Large": 45000 },
      "22–30 inches": { "Medium": 55000, "Large": 50000 },
    },
  },
  {
    id: "frontal_install",
    name: "Frontal Install",
    duration: "1–2 hrs",
    desc: "Professional frontal, ponytail or closure install.",
    sizes: { "Frontal Install": 45000, "Ponytail Install": 50000, "Closure Install": 35000 },
  },
];

export const EXTRAS = [
  { key: "extraLength", label: "Extra Length", price: 13000 },
  { key: "boho", label: "Boho Add-on", price: 13000 },
  { key: "beads", label: "Beads & Accessories", price: 10000 },
];

export const TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

// ── Our Work carousel. Real photos first; `img` null = placeholder tile.
// Add more: drop the file in public/work as work-03.jpg, work-04.jpg… then
// add a line here { name: "Style (alt text)", img: "/work/work-03.jpg" }.
export const WORKS = [
  { name: "Feed-in Cornrows to a side ponytail", img: "/work/work-01.jpg" },
  { name: "Boho Knotless Braids with stitch design", img: "/work/work-02.jpg" },
  { name: "Lemonade feed-in braids with boho curls", img: "/work/work-03.jpg" },
  { name: "Small Knotless Braids", img: "/work/work-04.jpg" },
  { name: "Honey-blonde small knotless braids", img: "/work/work-05.jpg" },
  { name: "Small knotless braids, mid-install", img: "/work/work-06.jpg" },
  { name: "Sleek braided ponytail with wavy ends", img: "/work/work-07.png" },
  { name: "Cornrow ponytail with bantu-knot detail", img: "/work/work-08.png" },
  { name: "Coloured knotless braids, mid-install", img: "/work/work-09.png" },
  { name: "Blonde cornrow ponytail with heart design", img: "/work/work-10.png" },
  { name: "Blonde curly bob braids", img: "/work/work-11.png" },
  { name: "Blonde curly crochet bob", img: "/work/work-12.jpg" },
  { name: "Lemonade cornrows, side profile", img: "/work/work-13.jpg" },
  { name: "Boho knotless braids with curls", img: "/work/work-14.jpg" },
];

// ── Videos — drop .mp4 files in public/videos and set `src`.
// While `src` is null a styled placeholder shows.
export const VIDEOS = [
  { title: "Braiding in Motion", src: "/videos/video-01.mp4", poster: null },
  { title: "Fresh From the Chair", src: "/videos/video-02.mp4", poster: null },
  { title: "The Finished Look", src: "/videos/video-03.mp4", poster: null },
  { title: "Behind the Braids", src: "/videos/video-04.mp4", poster: null },
  { title: "In the Studio Chair", src: "/videos/video-05.mp4", poster: null },
  { title: "The Reveal", src: "/videos/video-06.mp4", poster: null },
];

// ── Reviews — real WhatsApp chat screenshots (cropped). Each card shows the shot.
export const REVIEWS = [
  { name: "Mira Oma", shot: "/reviews/review-01.jpg" },
  { name: "Tega of Lagos", shot: "/reviews/review-02.jpg" },
  { name: "Verified Client", shot: "/reviews/review-03.jpg" },
];

// ── Celebrities braided. Add { name, img, ig? } — ig optional (links the card).
export const CELEBS = [
  { name: "The Media Girl", img: "/celebs/celeb-01.png" },
  { name: "Victoire Mahounou", img: "/celebs/celeb-02.png" },
  { name: "Tega Clifford", img: "/celebs/celeb-03.png" },
  { name: "Maryann Official", img: "/celebs/celeb-04.png" },
];

// ── Meet the CEO
export const CEO = {
  name: "Chioma Christine Cletus",
  title: "Founder & Lead Stylist",
  photo: "/ceo.jpg",
  // Chioma's personal accounts (the business accounts are in theme.js CONTACT)
  instagram: "https://www.instagram.com/luchihairs_?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  tiktok: "https://www.tiktok.com/@luchihairs?is_from_webapp=1&sender_device=pc",
  bio: [
    "Privé by Luchi was born from Chioma's obsession with braids that are as healthy as they are beautiful, protective styles that turn heads without pulling edges.",
    "As a mobile studio, she brings the full salon experience to your door: premium hair, a gentle hand, and finishes clean enough for the red carpet.",
    "From everyday queens to household names, every head that sits in her chair leaves feeling like the main character.",
  ],
};

// ── Hair Care advice
export const HAIRCARE = [
  { title: "Wrap It Up Nightly", body: "Sleep with a satin or silk scarf/bonnet. It stops frizz, protects your edges and doubles how long your style stays fresh." },
  { title: "Keep The Scalp Clean", body: "Cleanse every 1–2 weeks with a diluted shampoo in an applicator bottle, then a light oil on the scalp only, never soak the length." },
  { title: "Moisture Is Everything", body: "A light leave-in or braid spray keeps hair supple. Dry braids snap; hydrated braids last and shine." },
  { title: "Don't Overstay", body: "Take braids down at 6–8 weeks max. Leaving them longer risks matting, breakage and tension damage." },
  { title: "Mind The Tension", body: "If a style feels too tight, tell your stylist. Beauty should never come with headaches or bumps along the hairline." },
  { title: "Prep & Recover", body: "Deep-condition before your appointment and give your hair a nourishing wash-day after take-down before re-installing." },
];
