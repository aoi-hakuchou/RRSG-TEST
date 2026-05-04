// js/music.js

import { musicState } from "./state.js";
import { dom } from "./dom.js";

const noteMap = {
  C: "C4",
  D: "D4",
  E: "E4",
  F: "F4",
  G: "G4",
  A: "A4",
  B: "B4"
};

const chordMap = {
  C: ["C4", "E4", "G4"],
  Dm: ["D4", "F4", "A4"],
  Em: ["E4", "G4", "B4"],
  F: ["F4", "A4", "C5"],
  G: ["G4", "B4", "D5"],
  Am: ["A4", "C5", "E5"]
};

const progressionDegrees = [
  "F",
  "G",
  "Em",
  "Am"
];

export function initMusic() {

  musicState.synth =
    new Tone.PolySynth(
      Tone.Synth
    ).toDestination();

  bindNoteButtons();

  bindChordButtons();

  bindMusicControls();

  setupTransport();
}

async function ensureAudioStarted() {

  if (
    musicState.audioStarted
  ) {
    return;
  }

  await Tone.start();

  musicState.audioStarted = true;
}

function bindNoteButtons() {

  document
    .querySelectorAll(".note-btn")
    .forEach(btn => {

      const note =
        btn.dataset.note;

      const attack = async () => {

        await ensureAudioStarted();

        const mapped =
          noteMap[note];

        if (!mapped) return;

        musicState.activeNotes.push(
          mapped
        );

        musicState.synth
          .triggerAttack(mapped);

        btn.classList.add(
          "pressed"
        );
      };

      const release = () => {

        const mapped =
          noteMap[note];

        if (!mapped) return;

        musicState.synth
          .triggerRelease(mapped);

        musicState.activeNotes =
          musicState.activeNotes
            .filter(n => n !== mapped);

        btn.classList.remove(
          "pressed"
        );
      };

      btn.addEventListener(
        "mousedown",
        attack
      );

      btn.addEventListener(
        "mouseup",
        release
      );

      btn.addEventListener(
        "mouseleave",
        release
      );

      btn.addEventListener(
        "touchstart",
        attack,
        { passive: true }
      );

      btn.addEventListener(
        "touchend",
        release
      );

      btn.addEventListener(
        "touchcancel",
        release
      );
    });
}

function bindChordButtons() {

  document
    .querySelectorAll(".chord-btn")
    .forEach(btn => {

      const chord =
        btn.dataset.chord;

      btn.addEventListener(
        "click",
        async () => {

          await ensureAudioStarted();

          playChord(chord);
        }
      );
    });
}

export function playChord(chordName) {

  const notes =
    chordMap[chordName];

  if (!notes) return;

  musicState.synth
    .triggerAttackRelease(
      notes,
      "2n"
    );

  musicState.activeChord =
    chordName;

  addChordToLog(chordName);
}

function addChordToLog(chordName) {

  musicState.musicLogData.push(
    chordName
  );

  renderMusicLog();
}

export function clearMusicLog() {

  musicState.musicLogData = [];

  renderMusicLog();
}

function renderMusicLog() {

  if (!dom.musicLog) return;

  dom.musicLog.innerHTML = "";

  musicState.musicLogData
    .forEach(chord => {

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "music-log-item";

      div.textContent = chord;

      dom.musicLog.appendChild(
        div
      );
    });
}

function bindMusicControls() {

  dom.generateBtn
    ?.addEventListener(
      "click",
      generateProgression
    );

  dom.clearLogBtn
    ?.addEventListener(
      "click",
      clearMusicLog
    );

  dom.bpmSlider
    ?.addEventListener(
      "input",
      updateBPM
    );
}

function updateBPM() {

  const bpm =
    Number(dom.bpmSlider.value);

  Tone.Transport.bpm.value =
    bpm;

  dom.bpmValue.textContent =
    bpm;
}

function generateProgression() {

  progressionDegrees
    .forEach((chord, i) => {

      Tone.Transport.scheduleOnce(
        time => {

          musicState.synth
            .triggerAttackRelease(
              chordMap[chord],
              "2n",
              time
            );

          addChordToLog(chord);

        },

        `+${i * 0.8}`
      );
    });

  Tone.Transport.start();
}

function setupTransport() {

  Tone.Transport.bpm.value =
    Number(
      dom.bpmSlider?.value || 120
    );
}