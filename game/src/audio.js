// MOTHLIGHT — every sound is synthesized with WebAudio: no audio files, no
// network, just oscillators and filtered noise. Created lazily on the first
// user gesture, so browsers never complain.
export function createAudio() {
  let ctx = null;
  let master = null;
  let padNodes = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.55;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone({ freq = 440, to = null, type = 'sine', dur = 0.15, vol = 0.2, when = 0, attack = 0.005 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.2, vol = 0.15, when = 0, freq = 1200, q = 1 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  // A quiet two-note night pad that loops under play. Started once, never loud.
  function startPad() {
    if (!ctx || padNodes) return;
    try {
      const gain = ctx.createGain();
      gain.gain.value = 0.045;
      gain.connect(master);
      const freqs = [110, 164.81, 220];
      const oscs = freqs.map((f, i) => {
        const o = ctx.createOscillator();
        o.type = i === 0 ? 'sine' : 'triangle';
        o.frequency.value = f;
        o.detune.value = i === 2 ? 4 : 0;
        o.connect(gain);
        o.start();
        return o;
      });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      padNodes = { gain, oscs, lfo };
    } catch {
      padNodes = null;
    }
  }

  return {
    // Call from any user gesture; also starts the pad.
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      startPad();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.55;
      return muted;
    },
    get muted() {
      return muted;
    },
    // Pickup blip: climbs a pentatonic ladder as the combo grows.
    pickup(combo) {
      if (!ensure()) return;
      const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
      const f = scale[Math.min(combo - 1, scale.length - 1)] || 523.25;
      tone({ freq: f, dur: 0.12, vol: 0.16 });
      tone({ freq: f * 2, dur: 0.09, vol: 0.05, when: 0.02 });
    },
    // A lantern lights: a warm three-note chime.
    lantern() {
      if (!ensure()) return;
      [523.25, 659.25, 783.99].forEach((f, i) => tone({ freq: f, dur: 0.5, vol: 0.14, when: i * 0.09 }));
      tone({ freq: 1046.5, dur: 0.7, vol: 0.08, when: 0.3 });
    },
    hit() {
      if (!ensure()) return;
      tone({ freq: 160, to: 55, type: 'sawtooth', dur: 0.28, vol: 0.22 });
      noise({ dur: 0.18, vol: 0.18, freq: 500, q: 0.7 });
    },
    dash() {
      if (!ensure()) return;
      noise({ dur: 0.16, vol: 0.12, freq: 2400, q: 2 });
    },
    channelTick() {
      if (!ensure()) return;
      tone({ freq: 880, dur: 0.05, vol: 0.05 });
    },
    boon() {
      if (!ensure()) return;
      [392, 523.25, 659.25].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.22, vol: 0.12, when: i * 0.07 }));
    },
    // Dawn breaks: a rising fanfare over the win screen.
    win() {
      if (!ensure()) return;
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
        tone({ freq: f, dur: 0.6, vol: 0.13, when: i * 0.11 });
        tone({ freq: f / 2, type: 'triangle', dur: 0.6, vol: 0.08, when: i * 0.11 });
      });
    },
    over() {
      if (!ensure()) return;
      [392, 311.13, 233.08].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.55, vol: 0.12, when: i * 0.16 }));
    },
  };
}
