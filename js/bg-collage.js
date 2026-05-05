/* ------------------- BG COLLAGE ------------------- */
// Put your image filenames inside BG-Collage/ here.
// Add or remove entries freely — the grid always shows exactly COLLAGE_TOTAL cells.

const total = 42;
const digits = String(total).length;

const BG_COLLAGE_IMAGES = Array.from(
  { length: total },
  (_, i) => `BG-Collage/CBG_${String(i + 1).padStart(digits, "0")}`
);

const COLLAGE_COLS  = 5;
const COLLAGE_ROWS  = 3;
const COLLAGE_TOTAL = COLLAGE_COLS * COLLAGE_ROWS;

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildBgCollage() {
  const overlay = document.createElement("div");
  overlay.id = "bgOverlay";
  document.body.prepend(overlay);

  const grid = document.createElement("div");
  grid.id = "bgCollage";
  document.body.prepend(grid);

  if (BG_COLLAGE_IMAGES.length === 0) return;

  let pool = shuffleArray(BG_COLLAGE_IMAGES);
  while (pool.length < COLLAGE_TOTAL) {
    pool = pool.concat(shuffleArray(BG_COLLAGE_IMAGES));
  }

  pool.slice(0, COLLAGE_TOTAL).forEach(src => {
    const cell = document.createElement("div");
    cell.className = "collage-cell";

    const img = document.createElement("img");
    img.src      = src + ".webp";
    img.alt      = "";
    img.loading  = "lazy";
    img.decoding = "async";
    img.onerror  = () => { img.onerror = null; img.src = src + ".jpg"; };

    cell.appendChild(img);
    grid.appendChild(cell);
  });
}

// Runs before DOMContentLoaded so the grid is ready immediately.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", buildBgCollage);
} else {
  buildBgCollage();
}
