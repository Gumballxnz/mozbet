// Sistema de sons via Web Audio API (leve, sem arquivos externos)
// Gera sons sintetizados diretamente no navegador

const audioCtx = () => {
  if (typeof window === "undefined") return null;
  if (!(window as unknown as Record<string, unknown>).__audioCtx) {
    (window as unknown as Record<string, unknown>).__audioCtx = new (
      window.AudioContext ||
      (window as unknown as Record<string, unknown>).webkitAudioContext
    )();
  }
  return (window as unknown as Record<string, unknown>).__audioCtx as AudioContext;
};

export const playTone = (
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.15
) => {
  try {
    const ctx = audioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Silencioso se não suportado
  }
};

export const sounds = {
  bet: () => playTone(440, 0.1, "sine", 0.1),
  win: () => {
    playTone(523, 0.15, "sine", 0.12);
    setTimeout(() => playTone(659, 0.15, "sine", 0.12), 100);
    setTimeout(() => playTone(784, 0.2, "sine", 0.15), 200);
  },
  lose: () => playTone(200, 0.3, "sawtooth", 0.08),
  crash: () => {
    playTone(300, 0.15, "square", 0.1);
    setTimeout(() => playTone(150, 0.3, "sawtooth", 0.1), 100);
  },
  tick: () => playTone(800, 0.05, "sine", 0.05),
  cashout: () => {
    playTone(600, 0.1, "sine", 0.12);
    setTimeout(() => playTone(900, 0.15, "sine", 0.15), 80);
  },
  spin: () => playTone(350, 0.08, "triangle", 0.08),
  reveal: () => playTone(650, 0.08, "sine", 0.1),
  fly: () => playTone(500 + Math.random() * 200, 0.06, "sine", 0.04),
  countdown: () => playTone(440, 0.12, "square", 0.06),
  roll: () => playTone(300 + Math.random() * 300, 0.05, "triangle", 0.06),
};

// Música de fundo em loop (arpeggio)
export const startBgMusic = (
  notes: number[] = [220, 277, 330, 440, 330, 277],
  tempo = 280,
  volume = 0.04
) => {
  let stopped = false;
  let i = 0;
  const ctx = audioCtx();
  if (!ctx) return () => {};
  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.connect(ctx.destination);
  const tick = () => {
    if (stopped) return;
    try {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = notes[i % notes.length];
      noteGain.gain.value = 0;
      noteGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + tempo / 1000
      );
      osc.connect(noteGain);
      noteGain.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + tempo / 1000);
    } catch {
      // Silencioso
    }
    i++;
    setTimeout(tick, tempo);
  };
  tick();
  return () => {
    stopped = true;
    try {
      gain.disconnect();
    } catch {
      // Silencioso
    }
  };
};
