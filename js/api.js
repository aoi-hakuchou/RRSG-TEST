/* ------------------- API & QUEUE ------------------- */

import { API_URL, QUEUE_SIZE } from "./config.js";
import { isRecentlyPlayed } from "./history.js";

// videoNote is passed in from player.js to avoid a circular dependency
let _videoNote;
export function setVideoNote(el) { _videoNote = el; }

async function fetchRandomVideo() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`${API_URL}?t=${Date.now()}`, {
      signal: controller.signal,
      cache: "no-store"
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    if (!data || !data.video) throw new Error("Invalid API response");
    return data;
  } catch (err) {
    clearTimeout(timeout);
    console.error("Failed to fetch video:", err);
    return null;
  }
}

export async function fetchWithRetry(retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const video = await fetchRandomVideo();
    if (video) return video;
    console.warn(`Fetch attempt ${i + 1} failed`);
  }
  console.error("All fetch attempts failed");
  return null;
}

// Fetches a single video as fast as possible for the initial load,
// without waiting for the full queue to fill.
export async function fetchFirstVideo() {
  const video = await fetchWithRetry();
  if (video && !isRecentlyPlayed(video.video)) return video;
  // If recently played, use it anyway — better than showing nothing.
  return video;
}

/* ------------------- QUEUE MAINTENANCE ------------------- */

export let videoQueue = [];
let maintainingQueue = false;

export async function maintainQueue() {
  if (maintainingQueue) return;
  maintainingQueue = true;

  const needed = QUEUE_SIZE - videoQueue.length;
  const results = await Promise.all(
    Array.from({ length: needed }, () => fetchWithRetry())
  );

  for (const video of results) {
    if (!video) continue;
    if (!isRecentlyPlayed(video.video)) {
      videoQueue.push(video);
    }
    // Skip recently-played videos so the history block stays meaningful
  }

  maintainingQueue = false;

  if (videoQueue.length === 0 && _videoNote) {
    _videoNote.textContent = "⚠ Unable to reach the server. Try again later.";
  }
}
