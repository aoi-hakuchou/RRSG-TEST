import { dom } from "./dom.js";
import { appState } from "./state.js";

const HISTORY_LIMIT = 62;
const RECENT_BLOCK_COUNT = 47;

export function getHistory() {
  try {
    return JSON.parse(
      sessionStorage.getItem("listenHistory")
    ) || [];
  } catch (err) {
    console.warn(
      "Failed to load history:",
      err
    );

    return [];
  }
}

export function saveToHistory(videoId, title) {
  try {
    let history = getHistory();

    history.push({
      id: videoId,
      title,
      timestamp: Date.now()
    });

    if (history.length > HISTORY_LIMIT) {
      history = history.slice(-HISTORY_LIMIT);
    }

    sessionStorage.setItem(
      "listenHistory",
      JSON.stringify(history)
    );

    renderHistory();

  } catch (err) {
    console.warn(
      "Failed to save history:",
      err
    );
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

export function clearHistory() {
  sessionStorage.removeItem("listenHistory");

  renderHistory();
}

export function renderHistory() {
  const panel = dom.historyPanel;

  if (!panel) return;

  const history = getHistory()
    .slice(-5)
    .reverse();

  panel.innerHTML = "";

  if (history.length === 0) {
    panel.textContent = "No history yet.";
    return;
  }

  history.forEach(item => {
    const div = document.createElement("div");

    div.className = "history-item";

    div.textContent =
      item.title || item.id;

    panel.appendChild(div);
  });
}