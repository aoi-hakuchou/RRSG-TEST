// js/main.js

import { appState } from "./state.js";

import { dom } from "./dom.js";

import {
  loadTranslations,
  applyTranslations,
  toggleLanguage
} from "./translations.js";

import {
  renderHistory
} from "./history.js";

import {
  maintainQueue
} from "./queue.js";

import {
  createPlayer,
  playNextVideo,
  toggleAutoMode,
  updateAutoButton
} from "./player.js";

import {
  initMusic
} from "./music.js";

import {
  buildBgCollage
} from "./collage.js";
console.log("MAIN LOADED");
window.onYouTubeIframeAPIReady =
  () => {

    console.log(
      "YT callback fired"
    );

    console.log(
      "YT object:",
      YT
    );

    createPlayer();
  };

async function init() {
    console.log(
        "init called"
    );

    await initializeTranslations();

    initializeLanguageToggle();

    initializeButtons();

    initializeMusic();

    initializeHistory();

    initializeCollage();

    initializeQueue();
}

async function initializeTranslations() {

  await loadTranslations();

  const savedLang =
    localStorage.getItem(
      "language"
    );

  if (
    savedLang &&
    appState.translations?.[
      savedLang
    ]
  ) {

    appState.currentLang =
      savedLang;
  }

  applyTranslations(
    appState.currentLang
  );
}

function initializeLanguageToggle() {

  dom.langToggle
    ?.addEventListener(
      "click",
      toggleLanguage
    );
}

function initializeButtons() {

  dom.rngBtn
    ?.addEventListener(
      "click",
      playNextVideo
    );

  dom.autoToggleBtn
    ?.addEventListener(
      "click",
      () => {

        toggleAutoMode();

        updateAutoButton();
      }
    );

  updateAutoButton();
}

function initializeMusic() {

  initMusic();
}

function initializeHistory() {

  renderHistory();
}

function initializeCollage() {

  buildBgCollage();
}

function initializeQueue() {

  maintainQueue();
}

window.addEventListener(
  "DOMContentLoaded",
  init
);