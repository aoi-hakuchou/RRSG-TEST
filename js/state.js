export const appState = {
  player: null,
  autoMode: false,
  videoQueue: [],
  playerReady: false,
  maintainingQueue: false,

  ytApiReady: false,
  appScriptReady: false,

  currentLang: "en",
  translations: null
};

export const musicState = {
  synth: null,
  audioStarted: false,

  activeChord: null,
  activeNotes: [],

  musicLogData: [],

  generateMode: false
};