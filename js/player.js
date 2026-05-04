// js/player.js

import { appState } from "./state.js";
import { dom } from "./dom.js";

import {
  maintainQueue,
  dequeueVideo,
  getQueueLength
} from "./queue.js";

import {
  saveToHistory
} from "./history.js";

const REFILL_THRESHOLD = 2;

export function createPlayer() {
    
  console.log(
    "createPlayer called"
  );

  console.log(
    "player container:",
    document.getElementById("player")
  );

  appState.player =
    new YT.Player("player", {

      height: "360",
      width: "640",

      playerVars: {
        autoplay: 1,
        rel: 0,
        modestbranding: 1
      },

      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    });
}

function onPlayerReady() {

  appState.playerReady = true;

  dom.playerSpinner?.remove();

  playNextVideo();
}

function onPlayerStateChange(event) {

  if (
    event.data ===
    YT.PlayerState.ENDED
  ) {

    if (appState.autoMode) {
      playNextVideo();
    }
  }
}

function onPlayerError(event) {

  console.warn(
    "YouTube Player Error:",
    event.data
  );

  playNextVideo();
}

export function loadVideo(data) {

  if (
    !appState.player?.loadVideoById
  ) {

    console.warn(
      "Player not ready."
    );

    return false;
  }

  if (!data?.video) {

    console.warn(
      "Invalid video data."
    );

    return false;
  }

  dom.videoTitle.textContent =
    data.title || "";

  dom.videoNote.textContent =
    data.note || "";

  appState.player.loadVideoById(
    data.video
  );

  saveToHistory(
    data.video,
    data.title
  );

  return true;
}

export async function playNextVideo() {

  if (!appState.playerReady) {
    return;
  }

  if (getQueueLength() === 0) {

    await maintainQueue();
  }

  const data = dequeueVideo();

  if (!data) {

    dom.videoNote.textContent =
      "⚠ Failed to load video.";

    return;
  }

  loadVideo(data);

  if (
    getQueueLength() <
    REFILL_THRESHOLD
  ) {

    maintainQueue();
  }
}

export function toggleAutoMode() {

  appState.autoMode =
    !appState.autoMode;

  updateAutoButton();
}

export function updateAutoButton() {

  if (!dom.autoToggleBtn) {
    return;
  }

  dom.autoToggleBtn.textContent =
    appState.autoMode
      ? "Autoplay: ON"
      : "Autoplay: OFF";
}

export function retryInit() {

  if (
    appState.playerReady
  ) {
    return;
  }

  createPlayer();
}