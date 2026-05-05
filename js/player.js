/* ------------------- YOUTUBE PLAYER ------------------- */

import { translations, currentLang, applyTranslations } from "./translations.js";
import { saveToHistory } from "./history.js";
import { videoQueue, maintainQueue, fetchFirstVideo, setVideoNote } from "./api.js";

const rngBtn        = document.getElementById("rngVideo");
const videoTitle    = document.getElementById("videoTitle");
const videoNote     = document.getElementById("videoNote");
const playerSpinner = document.getElementById("playerSpinner");
const autoToggleBtn = document.getElementById("autoToggle");

// Give api.js a reference to videoNote so it can show server errors
setVideoNote(videoNote);

let player;
let playerReady = false;
let autoMode = false;

// Handles the race condition between the cached YT API script firing
// onYouTubeIframeAPIReady before this script has fully executed (normal refresh),
// vs. this script executing first and waiting for the API (hard refresh / first load).
//
// Solution: both sides set a flag when they're done. Whichever arrives second
// calls the actual init function. This way order doesn't matter.

let ytApiReady = false;
let appScriptReady = false;

export function setAppScriptReady() {
  appScriptReady = true;
  startPlayerInit();
}

export function startPlayerInit() {
  if (!ytApiReady || !appScriptReady) return;
  initPlayer();
}

window.onYouTubeIframeAPIReady = function () {
  ytApiReady = true;
  startPlayerInit();
};

async function initPlayer() {
  const existingPlayer = document.getElementById("videoPlayer");
  if (existingPlayer) existingPlayer.innerHTML = "";

  const firstVideo = await fetchFirstVideo();

  if (!firstVideo) {
    videoNote.textContent = "⚠ Failed to load initial video.";
    playerSpinner.style.display = "none";
    rngBtn.textContent = "Retry";
    rngBtn.disabled = false;
    rngBtn.addEventListener("click", retryInit, { once: true });
    return;
  }

  player = new YT.Player("videoPlayer", {
    height: "630",
    width: "1120",
    videoId: firstVideo.video,
    playerVars: { autoplay: 0, controls: 1, rel: 0 },
    events: {
      onReady: () => onPlayerReady(firstVideo),
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    }
  });
}

function retryInit() {
  videoQueue.length = 0;
  initPlayer();
}

function onPlayerReady(firstVideo) {
  playerReady = true;
  rngBtn.disabled = false;
  rngBtn.setAttribute("data-i18n", "randomButton");
  rngBtn.textContent = translations?.[currentLang]?.["randomButton"] || "Get a random song";
  playerSpinner.style.display = "none";
  videoTitle.textContent = firstVideo.title || "";
  videoNote.textContent  = firstVideo.note  || "";
  saveToHistory(firstVideo.video, firstVideo.title);
  maintainQueue();
}

function loadVideo(data) {
  if (!player || typeof player.loadVideoById !== "function") return;
  videoTitle.textContent = data.title || "";
  videoNote.textContent  = data.note  || "";
  player.loadVideoById(data.video);
  saveToHistory(data.video, data.title);
}

function playNextVideo() {
  if (videoQueue.length === 0) {
    videoNote.textContent = "⚠ Failed to load video. Please try again.";
    rngBtn.disabled = false;
    return;
  }

  const data = videoQueue.shift();

  if (!data || !data.video) {
    videoNote.textContent = "⚠ Invalid video data received.";
    rngBtn.disabled = false;
    return;
  }

  loadVideo(data);
  maintainQueue();
}

/* ------------------- PLAYER STATE ------------------- */

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) rngBtn.disabled = false;
  if (event.data === YT.PlayerState.ENDED && autoMode) playNextVideo();
}

function onPlayerError(event) {
  console.warn("YouTube error:", event.data);
  videoNote.textContent = "⚠ Video unavailable. Loading another one.";
  playNextVideo();
}

/* ------------------- AUTOPLAY TOGGLE ------------------- */

autoToggleBtn.addEventListener("click", toggleAutoPlay);

rngBtn.addEventListener("click", () => {
  if (!playerReady) return;
  rngBtn.disabled = true;
  playNextVideo();
});

function toggleAutoPlay() {
  autoMode = !autoMode;
  autoToggleBtn.dataset.i18n = autoMode ? "autoplayOn" : "autoplayOff";
  applyTranslations(currentLang);
}
