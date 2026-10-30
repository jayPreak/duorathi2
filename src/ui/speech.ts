// Browser TTS. Prefers a Marathi voice, falls back to Hindi (same script) and
// then whatever the platform offers for mr-IN.

let voices: SpeechSynthesisVoice[] = [];
const loadVoices = () => {
  voices = window.speechSynthesis?.getVoices() ?? [];
};
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

const pickVoice = () =>
  voices.find((v) => v.lang.toLowerCase().startsWith('mr')) ??
  voices.find((v) => v.lang.toLowerCase().startsWith('hi'));

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export const speak = (text: string, rate = 0.9) => {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  u.lang = voice?.lang ?? 'mr-IN';
  if (voice) u.voice = voice;
  u.rate = rate;
  window.speechSynthesis.speak(u);
};

/** tiny synthesized feedback blips — no audio assets needed */
export const blip = (kind: 'correct' | 'wrong' | 'done') => {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const notes = kind === 'correct' ? [660, 880] : kind === 'wrong' ? [220, 180] : [523, 659, 784];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = kind === 'wrong' ? 'sawtooth' : 'sine';
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.18);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    // no audio
  }
};
