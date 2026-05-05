/* ------------------- LISTEN HISTORY ------------------- */

import { applyTranslations, currentLang } from "./translations.js";

const HISTORY_LIMIT = 62;
const RECENT_BLOCK_COUNT = 47;

export function getHistory() {
  try {
    return JSON.parse(sessionStorage.getItem("listenHistory")) || [];
  } catch (err) {
    console.warn("Session storage unavailable:", err);
    return [];
  }
}

export function saveToHistory(videoId, title) {
  try {
    let history = getHistory();
    history.push({ id: videoId, title: title, timestamp: Date.now() });

    if (history.length > HISTORY_LIMIT) {
      history = history.slice(-HISTORY_LIMIT);
    }

    sessionStorage.setItem("listenHistory", JSON.stringify(history));
    renderHistory();
  } catch (err) {
    console.warn("Could not save to session storage:", err);
  }
}

export function getRecentIds() {
  return getHistory()
    .slice(-RECENT_BLOCK_COUNT)
    .map(item => item.id);
}

export function isRecentlyPlayed(videoId) {
  return getRecentIds().includes(videoId);
}

export function renderHistory() {
  const panel = document.getElementById("historyPanel");
  if (!panel) return;

  const history = getHistory().slice(-5).reverse();

  panel.innerHTML = "";
  const title = document.createElement("h3");
  title.dataset.i18n = "historyTitle";
  panel.appendChild(title);

  if (history.length === 0) {
    const empty = document.createElement("p");
    empty.dataset.i18n = "noHistory";
    panel.appendChild(empty);
    applyTranslations(currentLang);
    return;
  }

  history.forEach(item => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.textContent = item.title || item.id;
    panel.appendChild(div);
  });

  applyTranslations(currentLang);
}
