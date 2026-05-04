// js/collage.js

import {
  shuffleArray
} from "./utils.js";

const TOTAL_IMAGES = 42;

const DIGITS =
  String(TOTAL_IMAGES).length;

const COLLAGE_COLS = 5;
const COLLAGE_ROWS = 3;

const COLLAGE_TOTAL =
  COLLAGE_COLS *
  COLLAGE_ROWS;

const BG_COLLAGE_IMAGES =
  Array.from(
    { length: TOTAL_IMAGES },
    (_, i) => {

      return (
        "BG-Collage/CBG_" +
        String(i + 1)
          .padStart(DIGITS, "0")
      );
    }
  );

export function buildBgCollage() {

  removeExistingCollage();

  createOverlay();

  const grid =
    document.createElement("div");

  grid.id = "bgCollage";

  document.body.prepend(grid);

  const selectedImages =
    getCollageSelection();

  selectedImages.forEach(src => {

    const cell =
      createCollageCell(src);

    grid.appendChild(cell);
  });
}

function removeExistingCollage() {

  document
    .getElementById("bgCollage")
    ?.remove();

  document
    .getElementById("bgOverlay")
    ?.remove();
}

function createOverlay() {

  const overlay =
    document.createElement("div");

  overlay.id = "bgOverlay";

  document.body.prepend(
    overlay
  );
}

function getCollageSelection() {

  let pool =
    shuffleArray(
      BG_COLLAGE_IMAGES
    );

  while (
    pool.length <
    COLLAGE_TOTAL
  ) {

    pool = pool.concat(
      shuffleArray(
        BG_COLLAGE_IMAGES
      )
    );
  }

  return pool.slice(
    0,
    COLLAGE_TOTAL
  );
}

function createCollageCell(src) {

  const cell =
    document.createElement("div");

  cell.className =
    "collage-cell";

  const img =
    document.createElement("img");

  img.loading = "lazy";

  img.decoding = "async";

  img.alt = "";

  img.setAttribute(
    "aria-hidden",
    "true"
  );

  loadImagePath(img, src);

  cell.appendChild(img);

  return cell;
}

async function loadImagePath(
  img,
  basePath
) {

  const formats = [
    ".webp",
    ".avif",
    ".jpg",
    ".png"
  ];

  for (const ext of formats) {

    const path =
      basePath + ext;

    try {

      const res =
        await fetch(path, {
          method: "HEAD"
        });

      if (res.ok) {

        img.src = path;

        return;
      }

    } catch {}
  }

  console.warn(
    "Failed to load collage image:",
    basePath
  );
}