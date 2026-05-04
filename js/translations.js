// js/translations.js

import { appState } from "./state.js";
import { dom } from "./dom.js";

export async function loadTranslations() {
  try {
    const res = await fetch("translations.json", {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(
        `Translation load failed: ${res.status}`
      );
    }

    appState.translations = await res.json();

  } catch (err) {
    console.error(
      "Failed to load translations:",
      err
    );

    appState.translations = {
      en: {},
      ja: {}
    };
  }
}

export function applyTranslations(lang) {
  if (!appState.translations) return;

  document
    .querySelectorAll("[data-i18n]")
    .forEach(element => {

      const key = element.dataset.i18n;

      element.textContent =
        appState.translations?.[lang]?.[key] ??
        appState.translations?.en?.[key] ??
        key;
    });

  if (dom.langToggle) {
    dom.langToggle.textContent =
      lang === "en"
        ? "日本語"
        : "English";
  }

  document.documentElement.lang = lang;

  appState.currentLang = lang;

  localStorage.setItem(
    "language",
    lang
  );
}

export function toggleLanguage() {
  const nextLang =
    appState.currentLang === "en"
      ? "ja"
      : "en";

  applyTranslations(nextLang);
}