/* ------------------- TONE.JS SETUP ------------------- */

let synth;
let audioStarted = false;

// Map simple letters → real notes
const noteMap = {
  A: "A3", Bb: "A#3", B: "B3",
  C: "C4", Cs: "C#4", D: "D4",
  Eb: "D#4", E: "E4", F: "F4",
  Fs: "F#4", G: "G4", Gs: "G#4"
};

// Chord formulas (intervals)
const chordMap = {
  "M":    [0, 4, 7],
  "m":    [0, 3, 7],
  "m7":   [0, 3, 7, 10],
  "7":    [0, 4, 7, 10],
  "M7":   [0, 4, 7, 11],
  "dim7": [0, 3, 6, 9]
};

function noteToMidi(note) { return Tone.Frequency(note).toMidi(); }
function midiToNote(midi) { return Tone.Frequency(midi, "midi").toNote(); }

/* 🎧 Start audio on first interaction */
async function ensureAudio() {
  if (!audioStarted) {
    await Tone.start();
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 1.5 },
      portamento: 0,
      volume: -8,
      detune: 0
    }).toDestination();
    audioStarted = true;
    console.log("Audio started");
  }
}

/* ------------------- MUSIC PANEL STATE ------------------- */

let activeChord = null;
let activeNotes = [];
let musicLogData = [];

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
      return;
    }

    const root = noteMap[base];

    if (!activeChord) {
      synth.triggerAttack(root);
      activeNotes = [root];
      logMusicInput(formatNoteDisplay(base));
      musicLogData.push({ type: "note", notes: [root] });
    } else {
      const rootMidi = noteToMidi(root);
      const intervals = chordMap[activeChord];
      activeNotes = intervals.map(i => midiToNote(rootMidi + i));
      synth.triggerAttack(activeNotes);
      logMusicInput(`${formatNoteDisplay(base)}${activeChord}`);
      musicLogData.push({ type: "chord", notes: activeNotes });
    }
  }

  function release() {
    if (!synth) return;
    synth.triggerRelease(activeNotes);
    activeNotes = [];
  }

  btn.addEventListener("mousedown", press);
  btn.addEventListener("mouseup", release);
  btn.addEventListener("mouseleave", release);
  btn.addEventListener("touchstart", (e) => { e.preventDefault(); press(); });
  btn.addEventListener("touchend", release);
});

/* ------------------- MUSIC LOG ------------------- */

function logMusicInput(text) {
  const log = document.getElementById("musicLog");
  if (!log) return;
  const item = document.createElement("div");
  item.className = "log-item";
  item.textContent = text;
  log.appendChild(item);
  if (log.children.length > 30) log.removeChild(log.firstChild);
}

async function playMusicLog() {
  if (musicLogData.length === 0) return;
  await ensureAudio();
  Tone.Transport.stop();
  Tone.Transport.cancel();
  synth.releaseAll();
  musicLogData.forEach((entry, index) => {
    Tone.Transport.schedule((time) => {
      synth.triggerAttackRelease(entry.notes, "4n", time);
    }, `0:${index}:0`);
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
  document.getElementById("musicLog").innerHTML = "";
  sessionStorage.removeItem("musicLog");
  musicLogData = [];
});

/* ------------------- GENERATE CHORD ------------------- */

let generateMode = false;
const generateBtn = document.getElementById("generateBtn");

generateBtn.addEventListener("click", () => {
  generateMode = !generateMode;
  generateBtn.classList.toggle("active", generateMode);
});

function getMajorScale(rootMidi) {
  return [0, 2, 4, 5, 7, 9, 11].map(i => rootMidi + i);
}

function getNoteName(note) { return note.replace(/[0-9]/g, ""); }
function formatNoteDisplay(note) { return note.replace("s", "#"); }

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
    let chordIntervals, chordName;

    if (degree === 2 || degree === 5) {
      chordIntervals = [0, 3, 7];
      chordName = getNoteName(midiToNote(chordRoot)) + "m";
    } else {
      chordIntervals = [0, 4, 7];
      chordName = getNoteName(midiToNote(chordRoot));
    }

    const notes = chordIntervals.map(i => midiToNote(chordRoot + i));
    Tone.Transport.schedule((time) => {
      synth.triggerAttackRelease(notes, "4n", time);
    }, `0:${index}:0`);
    musicLogData.push({ type: "chord", notes });
    logMusicInput(chordName);
  });

  Tone.Transport.start();
}
