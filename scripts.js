const API_URL = "https://script.google.com/macros/s/AKfycbyQFukbr6quN6x9tG41TACLtydFHyrBcirul3DaYFc_RyV1XnhpiOUC1bJPbRz-H5Q/exec";
const QUEUE_SIZE = 5;

/* ------------------- VARIABLES ------------------- */

let player;
let autoMode = false;
let videoQueue = [];
let playerReady = false;
let maintainingQueue = false;

const rngBtn = document.getElementById("rngVideo");
const videoTitle = document.getElementById("videoTitle");
const videoNote = document.getElementById("videoNote");
const playerSpinner = document.getElementById("playerSpinner");
const autoToggleBtn = document.getElementById("autoToggle");

/* ------------------- LISTEN HISTORY ------------------- */

const HISTORY_LIMIT = 62;
const RECENT_BLOCK_COUNT = 47;

function getHistory(){
  try{
    return JSON.parse(sessionStorage.getItem("listenHistory")) || [];
  }
  catch(err){
    console.warn("Session storage unavailable:", err);
    return [];
  }
}

function saveToHistory(videoId, title){
  try{
    let history = getHistory();
    history.push({ id: videoId, title: title, timestamp: Date.now() });

    if(history.length > HISTORY_LIMIT){
      history = history.slice(-HISTORY_LIMIT);
    }

    sessionStorage.setItem("listenHistory", JSON.stringify(history));

    renderHistory(); // ✅ ADD THIS

  } catch(err){
    console.warn("Could not save to session storage:", err);
  }
}

function getRecentIds(){
  return getHistory()
    .slice(-RECENT_BLOCK_COUNT)
    .map(item => item.id);
}

function isRecentlyPlayed(videoId){
  return getRecentIds().includes(videoId);
}

function renderHistory() {
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

  // Apply translations after elements are added
  applyTranslations(currentLang);
}

/* ------------------- FETCH RANDOM VIDEO ------------------- */

async function fetchRandomVideo(){
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`${API_URL}?t=${Date.now()}`, {
      signal: controller.signal,
      cache: "no-store"
    });
    clearTimeout(timeout);
    if(!res.ok){
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    if(!data || !data.video){
      throw new Error("Invalid API response");
    }
    return data;

  } catch(err){
    clearTimeout(timeout);
    console.error("Failed to fetch video:", err);
    return null;
  }
}

/* ------------------- FETCH WITH RETRY ------------------- */

async function fetchWithRetry(retries = 2){
  for(let i = 0; i <= retries; i++){
    const video = await fetchRandomVideo();
    if(video) return video;
    console.warn(`Fetch attempt ${i + 1} failed`);
  }
  console.error("All fetch attempts failed");
  return null;
}

/* ------------------- QUEUE MAINTENANCE ------------------- */

async function maintainQueue(){
  if(maintainingQueue) return;
  maintainingQueue = true;

  const needed = QUEUE_SIZE - videoQueue.length;
  const results = await Promise.all(
    Array.from({ length: needed }, () => fetchWithRetry())
  );

  for(const video of results){
    if(!video) continue;

    if(!isRecentlyPlayed(video.video)){
      videoQueue.push(video);
    }
    // Skip recently-played videos; don't add them even as a fallback
    // so the history block stays meaningful
  }

  maintainingQueue = false;

  // If queue is still empty after filling attempts, warn the user
  if(videoQueue.length === 0){
    videoNote.textContent = "⚠ Unable to reach the server. Try again later.";
  }
}

/* ------------------- FETCH FIRST VIDEO ------------------- */

// Fetches a single video as fast as possible for the initial load,
// without waiting for the full queue to fill.
async function fetchFirstVideo(){
  const video = await fetchWithRetry();
  if(video && !isRecentlyPlayed(video.video)) return video;
  // If it happens to be recently played, just use it anyway for the
  // first load — better than showing nothing
  return video;
}

/* ------------------- LOAD VIDEO ------------------- */

function loadVideo(data){
  if(!player || typeof player.loadVideoById !== "function"){
    return;
  }

  videoTitle.textContent = data.title || "";
  videoNote.textContent = data.note || "";
  player.loadVideoById(data.video);
  saveToHistory(data.video, data.title);
}

/* ------------------- PLAY NEXT VIDEO ------------------- */

function playNextVideo(){
  if(videoQueue.length === 0){
    videoNote.textContent = "⚠ Failed to load video. Please try again.";
    rngBtn.disabled = false;
    return;
  }

  const data = videoQueue.shift();

  if(!data || !data.video){
    videoNote.textContent = "⚠ Invalid video data received.";
    rngBtn.disabled = false;
    return;
  }

  loadVideo(data);
  maintainQueue();
}

/* ------------------- YOUTUBE PLAYER READY ------------------- */

// Handles the race condition between the cached YT API script firing
// onYouTubeIframeAPIReady before this script has fully executed (normal refresh),
// vs. this script executing first and waiting for the API (hard refresh / first load).
//
// Solution: both sides set a flag when they're done. Whichever arrives second
// calls the actual init function. This way order doesn't matter.

let ytApiReady = false;
let appScriptReady = false;

function startPlayerInit(){
  // Only proceed once BOTH the YT API and this script are ready
  if(!ytApiReady || !appScriptReady) return;
  initPlayer();
}

window.onYouTubeIframeAPIReady = function(){
  ytApiReady = true;
  startPlayerInit();
};

async function initPlayer(){
  // Reset player DOM node in case this is a retry call
  const existingPlayer = document.getElementById("videoPlayer");
  if(existingPlayer){
    existingPlayer.innerHTML = "";
  }

  // Fetch just one video first so the player can start as fast as possible,
  // then fill the rest of the queue in the background once the player is ready.
  const firstVideo = await fetchFirstVideo();

  if(!firstVideo){
    videoNote.textContent = "⚠ Failed to load initial video.";
    playerSpinner.style.display = "none";
    rngBtn.textContent = "Retry";
    rngBtn.disabled = false;
    rngBtn.addEventListener("click", retryInit, { once: true });
    return;
  }

  // Create the player immediately — don't wait for the full queue
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

function retryInit(){
  videoQueue = [];
  initPlayer();
}

function onPlayerReady(firstVideo){
  playerReady = true;
  rngBtn.disabled = false;
  rngBtn.setAttribute("data-i18n", "randomButton");
  rngBtn.textContent =
    (translations?.[currentLang]?.["randomButton"]) || "Get a random song";
  playerSpinner.style.display = "none";
  videoTitle.textContent = firstVideo.title || "";
  videoNote.textContent = firstVideo.note || "";
  saveToHistory(firstVideo.video, firstVideo.title);

  // Start filling the queue in the background now that the player is ready
  maintainQueue();
}

/* ------------------- PLAYER STATE ------------------- */

function onPlayerStateChange(event){
  if(event.data === YT.PlayerState.PLAYING){
    rngBtn.disabled = false;
  }

  if(event.data === YT.PlayerState.ENDED && autoMode){
    playNextVideo();
  }
}

/* ------------------- YOUTUBE ERROR HANDLER ------------------- */

function onPlayerError(event){
  console.warn("YouTube error:", event.data);
  videoNote.textContent = "⚠ Video unavailable. Loading another one.";
  playNextVideo();
}

/* ------------------- AUTOPLAY TOGGLE ------------------- */

autoToggleBtn.addEventListener("click", toggleAutoPlay);
rngBtn.addEventListener("click", () => {
  if(!playerReady) return;
  rngBtn.disabled = true;
  playNextVideo();
});

function toggleAutoPlay(){
  autoMode = !autoMode;
  autoToggleBtn.dataset.i18n = autoMode ? "autoplayOn" : "autoplayOff";
  applyTranslations(currentLang);
}

/* ------------------- TRANSLATION SYSTEM ------------------- */

let currentLang = "en";
let translations;

async function loadTranslations(){
  try{
    const res = await fetch(`translations.json?t=${Date.now()}`, {
      cache: "no-store"
    });
    if(!res.ok) throw new Error(`HTTP error: ${res.status}`);
    translations = await res.json();
  }
  catch(err){
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

function applyTranslations(lang){
  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;
    if(translations?.[lang]?.[key]){
      element.textContent = translations[lang][key];
    }
  });

  document.querySelectorAll("[data-i18n-img]").forEach(img => {
    const key = img.dataset.i18nImg;
    if(translations?.[lang]?.[key]){
      img.src = translations[lang][key];
    }
  });

  document.getElementById("langToggle").textContent =
    currentLang === "en" ? "日本語" : "English";

  // Keep the <html> lang attribute in sync for accessibility
  document.documentElement.lang = lang;
}

/* ------------------- MUSIC PANEL ------------------- */

let activeChord = null;
let activeNotes = [];
let musicLogData = [];
let isPlaying = false;

/* 🎧 Start audio on first interaction */
async function ensureAudio() {
  if (!audioStarted) {
    await Tone.start();
    
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0.2,
        release: 1.5
      },
      portamento: 0,
      volume: -8,
      detune: 0
    }).toDestination();
    
    audioStarted = true;
    console.log("Audio started");
  }
}

/* 🎼 CHORD TOGGLE */
document.querySelectorAll(".chord-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.classList.contains("active")) {
      btn.classList.remove("active");
      activeChord = null;
      return;
    }

    document.querySelectorAll(".chord-btn").forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
    activeChord = btn.dataset.chord;
  });
});

/* 🎹 NOTE PRESS */
document.querySelectorAll(".note-btn").forEach(btn => {
  const base = btn.dataset.note;

  async function press() {
    await ensureAudio();
    if (generateMode) {
      generateMode = false;
      generateBtn.classList.remove("active");

      generateChordSequence(base);
      return; // ❗ stop normal note playback
    }
    const root = noteMap[base];

    if (!activeChord) {
      synth.triggerAttack(root);
      activeNotes = [root];

      logMusicInput(`${formatNoteDisplay(base)}`);

      // ✅ STORE STRUCTURED NOTE
      musicLogData.push({
        type: "note",
        notes: [root]
      });

    } else {
      const rootMidi = noteToMidi(root);
      const intervals = chordMap[activeChord];

      activeNotes = intervals.map(i => midiToNote(rootMidi + i));

      synth.triggerAttack(activeNotes);

      logMusicInput(`${formatNoteDisplay(base)}${activeChord}`);

      // ✅ STORE STRUCTURED CHORD
      musicLogData.push({
        type: "chord",
        notes: activeNotes
      });
    }
  }

  function release() {
    synth.triggerRelease(activeNotes);
    activeNotes = [];
  }

  btn.addEventListener("mousedown", press);
  btn.addEventListener("mouseup", release);
  btn.addEventListener("mouseleave", release);

  // mobile
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    press();
  });

  btn.addEventListener("touchend", release);
});

function logMusicInput(text) {
  const log = document.getElementById("musicLog");
  if (!log) return;

  const item = document.createElement("div");
  item.className = "log-item";
  item.textContent = text;

  log.appendChild(item);

  if (log.children.length > 30) {
    log.removeChild(log.firstChild);
  }
}

async function playMusicLog() {
  if (musicLogData.length === 0) return;

  await ensureAudio();

  // ✅ reset everything
  Tone.Transport.stop();
  Tone.Transport.cancel();
  synth.releaseAll();

  musicLogData.forEach((entry, index) => {
    Tone.Transport.schedule((time) => {
      synth.triggerAttackRelease(entry.notes, "4n", time);
    }, `0:${index}:0`); // ✅ quarter note steps
  });

  Tone.Transport.start();
}

document.getElementById("playLogBtn").addEventListener("click", playMusicLog);

document.getElementById("stopBtn").addEventListener("click", () => {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  synth.releaseAll();
});

document.getElementById("clearLogBtn").addEventListener("click", () => {
  const log = document.getElementById("musicLog");
  log.innerHTML = "";

  sessionStorage.removeItem("musicLog"); musicLogData = [];
});


/* ------------------- GENERATE CHORD ------------------- */
let generateMode = false;

const generateBtn = document.getElementById("generateBtn");

generateBtn.addEventListener("click", () => {
  generateMode = !generateMode;

  generateBtn.classList.toggle("active", generateMode);
});

function getMajorScale(rootMidi) {
  const intervals = [0, 2, 4, 5, 7, 9, 11]; // major scale
  return intervals.map(i => rootMidi + i);
}

function getNoteName(note) {
  return note.replace(/[0-9]/g, ""); // remove octave (C4 → C)
}

function formatNoteDisplay(note) {
  return note.replace("s", "#");
}

async function generateChordSequence(rootNote) {
  await ensureAudio();

  const root = noteMap[rootNote];
  const rootMidi = noteToMidi(root);

  const scale = getMajorScale(rootMidi);
  const progressionDegrees = [3, 4, 2, 5]; // IV, V, iii, vi

  Tone.Transport.stop();
  Tone.Transport.cancel();
  synth.releaseAll();

  progressionDegrees.forEach((degree, index) => {
    const chordRoot = scale[degree];

    let chordIntervals;
    let chordName;

    // chord quality
    if (degree === 2 || degree === 5) {
      // iii, vi → minor
      chordIntervals = [0, 3, 7];
      chordName = getNoteName(midiToNote(chordRoot)) + "m";
    } else {
      // IV, V → major
      chordIntervals = [0, 4, 7];
      chordName = getNoteName(midiToNote(chordRoot));
    }

    const notes = chordIntervals.map(i => midiToNote(chordRoot + i));
    
    Tone.Transport.schedule((time) => {
      synth.triggerAttackRelease(notes, "4n", time);
    }, `0:${index}:0`);
    
    musicLogData.push({
      type: "chord",
      notes: notes
    });
    logMusicInput(`${chordName}`);
  });
  
  Tone.Transport.start();
}

/* ------------------- TONE.JS SETUP ------------------- */

let synth;
let audioStarted = false;

// map simple letters → real notes
const noteMap = {
  A: "A3",
  Bb: "A#3",
  B: "B3",
  C: "C4",
  Cs: "C#4",
  D: "D4",
  Eb: "D#4",
  E: "E4",
  F: "F4",
  Fs: "F#4",
  G: "G4",
  Gs: "G#4"
};

// chord formulas (intervals)
const chordMap = {
  "M":  [0, 4, 7],
  "m":  [0, 3, 7],
  "m7": [0, 3, 7, 10],
  "7": [0, 4, 7, 10],
  "M7": [0, 4, 7, 11],
  "dim7": [0, 3, 6, 9]
};

// convert note like C4 → MIDI number
function noteToMidi(note) {
  return Tone.Frequency(note).toMidi();
}

// convert MIDI back to note
function midiToNote(midi) {
  return Tone.Frequency(midi, "midi").toNote();
}

/* ------------------- INIT ------------------- */

async function init(){
  await loadTranslations();

  const savedLang = localStorage.getItem("language");
  if(savedLang && translations[savedLang]){
    currentLang = savedLang;
  }

  applyTranslations(currentLang);
  renderHistory();

  const bpmSlider = document.getElementById("bpmSlider");
  const bpmValue = document.getElementById("bpmValue");

  if (bpmSlider && bpmValue) {
    bpmValue.textContent = bpmSlider.value;

    bpmSlider.addEventListener("input", () => {
      const bpm = parseInt(bpmSlider.value, 10);
      bpmValue.textContent = bpm;
      Tone.Transport.bpm.rampTo(bpm, 0.1);
    });
  }

  document.getElementById("langToggle").addEventListener("click", () => {
    currentLang = currentLang === "en" ? "ja" : "en";
    localStorage.setItem("language", currentLang);
    applyTranslations(currentLang);
  });
}

/* ------------------- BG COLLAGE ------------------- */

// Put your image filenames inside BG-Collage/ here.
// Add or remove entries freely — the grid always shows exactly 40 cells.

const total = 42;
const digits = String(total).length;

const BG_COLLAGE_IMAGES = Array.from(
  { length: total },
  (_, i) => `BG-Collage/CBG_${String(i + 1).padStart(digits, '0')}`
);

const COLLAGE_COLS = 5;
const COLLAGE_ROWS = 3;
const COLLAGE_TOTAL = COLLAGE_COLS * COLLAGE_ROWS; // 40

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildBgCollage() {
  // Create the overlay div
  const overlay = document.createElement("div");
  overlay.id = "bgOverlay";
  document.body.prepend(overlay);

  // Create the grid container
  const grid = document.createElement("div");
  grid.id = "bgCollage";
  document.body.prepend(grid);

  if (BG_COLLAGE_IMAGES.length === 0) return;

  // Shuffle and tile images to fill all 40 cells
  let pool = shuffleArray(BG_COLLAGE_IMAGES);

  // If fewer than 40 images, repeat until we have enough
  while (pool.length < COLLAGE_TOTAL) {
    pool = pool.concat(shuffleArray(BG_COLLAGE_IMAGES));
  }

  const chosen = pool.slice(0, COLLAGE_TOTAL);

  chosen.forEach(src => {
    const cell = document.createElement("div");
    cell.className = "collage-cell";

    const img = document.createElement("img");
    img.src = src + ".webp";
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.onerror = () => {
      img.onerror = null;
      img.src = src + ".jpg"; // fallback for very old browsers
    };

    cell.appendChild(img);
    grid.appendChild(cell);
  });
}

// Call it — runs before DOMContentLoaded so the grid is ready immediately.
// If you prefer it inside DOMContentLoaded, move the call there.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", buildBgCollage);
} else {
  buildBgCollage();
}

document.addEventListener("DOMContentLoaded", async () => {
sessionStorage.clear();

  await init();
  appScriptReady = true;
  if (window.YT && window.YT.Player) {
    ytApiReady = true;
  }
  startPlayerInit();
});


