/* ------------------- TRANSLATION SYSTEM ------------------- */

export let currentLang = "en";
export let translations;

export async function loadTranslations() {
  try {
    const res = await fetch(`translations.json?t=${Date.now()}`, {
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    translations = await res.json();
  } catch (err) {
    console.error("Translation load error:", err);
    translations = {
      en: {
        randomButtonLoading: "Please wait for the player to load",
        randomButton: "Get a random song",
        autoplayOff: "⚪ Autoplay OFF",
        autoplayOn: "🟢 Autoplay ON"
      },
      ja: {}
    };
    currentLang = "en";
  }
}

export function applyTranslations(lang) {
  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    if (translations?.[lang]?.[key]) {
      element.textContent = translations[lang][key];
    }
  });

  document.querySelectorAll("[data-i18n-img]").forEach(img => {
    const key = img.dataset.i18nImg;
    if (translations?.[lang]?.[key]) {
      img.src = translations[lang][key];
    }
  });

  document.getElementById("langToggle").textContent =
    currentLang === "en" ? "日本語" : "English";

  // Keep the <html> lang attribute in sync for accessibility
  document.documentElement.lang = lang;
}

export function setLang(lang) {
  currentLang = lang;
}
