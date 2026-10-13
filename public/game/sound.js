// A little "pop" for every cell that bursts, made on the fly with the Web
// Audio API (no sound files). Each pop in a chain is a note higher than the
// last, up a major scale, so a long chain sounds like it's building up.

const SCALE = [0, 2, 4, 5, 7, 9, 11]; // a major scale, in semitones

// The pitch, in Hz, of the `chain`th pop in a row (1 for the first),
// climbing up two octaves and staying at the top after that.
export function popPitch(chain) {
  const n = Math.min(Math.max(chain, 1), 15) - 1;
  const semitones = 12 * Math.floor(n / 7) + SCALE[n % 7];
  return 330 * 2 ** (semitones / 12);
}

let audio = null;

// Play the pop for the `chain`th burst in a row. Browsers only allow sound
// after you've touched the page, which you have by the time anything bursts.
export function pop(chain) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const now = audio.currentTime;
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(popPitch(chain) * 1.5, now);
    tone.frequency.exponentialRampToValueAtTime(popPitch(chain), now + 0.06);
    volume.gain.setValueAtTime(0.18, now);
    volume.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    tone.connect(volume).connect(audio.destination);
    tone.start(now);
    tone.stop(now + 0.16);
  } catch {
    // No sound in this browser: the game works fine without it.
  }
}

// Forget the audio context (for tests).
export function resetSound() {
  audio = null;
}
