export function shuffleArray(arr) {
  const copy = [...arr];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [copy[i], copy[j]] =
      [copy[j], copy[i]];
  }

  return copy;
}

export function formatNoteDisplay(note) {
  return note.replace("s", "#");
}

export function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export function clamp(value, min, max) {
  return Math.min(
    Math.max(value, min),
    max
  );
}