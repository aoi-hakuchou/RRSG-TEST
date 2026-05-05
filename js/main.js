/* ------------------- MAIN / INIT ------------------- */
// Single entry point — only this file is loaded via <script type="module">.
// All other modules are pulled in through imports.

import { loadTranslations, applyTranslations, currentLang, setLang, translations } from "./translations.js";
import { renderHistory } from "./history.js";
import { startPlayerInit, appScriptReady, ytApiReady } from "./player.js";
import "./music-panel.js";
import "./bg-collage.js";

async function init() {
  await loadTranslations();

  const savedLang = localStorage.getItem("language");
  if (savedLang && translations[savedLang]) {
    setLang(savedLang);
  }

  applyTranslations(currentLang);
  renderHistory();

  const bpmSlider = document.getElementById("bpmSlider");
  const bpmValue  = document.getElementById("bpmValue");

  if (bpmSlider && bpmValue) {
    bpmValue.textContent = bpmSlider.value;
    bpmSlider.addEventListener("input", () => {
      const bpm = parseInt(bpmSlider.value, 10);
      bpmValue.textContent = bpm;
      Tone.Transport.bpm.rampTo(bpm, 0.1);
    });
  }

  document.getElementById("langToggle").addEventListener("click", () => {
    const next = currentLang === "en" ? "ja" : "en";
    setLang(next);
    localStorage.setItem("language", next);
    applyTranslations(next);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  sessionStorage.clear();

  await init();

  // Signal that the app script is ready, then attempt player init
  // (the other half of the race condition is window.onYouTubeIframeAPIReady in player.js)
  startPlayerInit();
});
