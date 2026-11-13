/* O Cofre de São Segredo — sons sintetizados com Web Audio (sem ficheiros). Expõe window.SND. */
(function () {
  const SND = { ctx: null, on: true, musicOn: true, master: null, sfxBus: null, musicBus: null, timer: null, step: 0 };
  let LS = null; try { LS = window.localStorage; } catch (e) { /* */ }
  try { const v = LS && LS.getItem('cofre3_sound'); if (v === 'off') SND.on = false; if (LS && LS.getItem('cofre3_music') === 'off') SND.musicOn = false; } catch (e) { /* */ }

  function ensure() {
    if (SND.ctx) { if (SND.ctx.state === 'suspended') SND.ctx.resume().catch(() => {}); return SND.ctx; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    const ctx = new AC(); SND.ctx = ctx;
    SND.master = ctx.createGain(); SND.master.gain.value = SND.on ? 0.8 : 0; SND.master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.connect(SND.master);
    SND.sfxBus = ctx.createGain(); SND.sfxBus.gain.value = 0.9; SND.sfxBus.connect(comp);
    SND.musicBus = ctx.createGain(); SND.musicBus.gain.value = SND.musicOn ? 0.32 : 0; SND.musicBus.connect(comp);
    return ctx;
  }
  /** Desbloqueia o áudio no primeiro toque/clique (regra dos browsers). */
  function unlock() { ensure(); }
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));

  function tone(f, dur, o = {}) {
    const ctx = ensure(); if (!ctx || !SND.on) return; const t = ctx.currentTime + (o.at || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const v = o.vol == null ? 0.25 : o.vol, a = o.attack || 0.008;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc; if (o.lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; osc.connect(fl); node = fl; }
    node.connect(g); g.connect(o.bus || SND.sfxBus); osc.start(t); osc.stop(t + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(dur, o = {}) {
    const ctx = ensure(); if (!ctx || !SND.on) return; const t = ctx.currentTime + (o.at || 0);
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; const fl = ctx.createBiquadFilter(); fl.type = o.ft || 'bandpass'; fl.frequency.setValueAtTime(o.f || 1200, t); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + dur); fl.Q.value = o.q || 1;
    const g = ctx.createGain(); const v = o.vol == null ? 0.3 : o.vol; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(o.bus || SND.sfxBus); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);

  /* ---------------------------------------------------------- efeitos */
  const FX = {
    click() { tone(1200, 0.05, { type: 'square', vol: 0.06 }); },
    tap() { tone(660, 0.07, { type: 'triangle', vol: 0.12 }); },
    dice() { for (let i = 0; i < 9; i++) noise(0.05, { at: i * 0.07 + Math.random() * 0.03, f: 2500 + Math.random() * 2000, q: 4, vol: 0.35 }); },
    diceLand() { noise(0.08, { f: 900, q: 2, vol: 0.4 }); tone(220, 0.15, { type: 'triangle', vol: 0.15 }); },
    step(seat = 0) { const base = [523, 587, 659, 698, 784, 880][seat % 6]; tone(base, 0.08, { type: 'triangle', vol: 0.12 }); noise(0.04, { f: 600, vol: 0.12 }); },
    coin() { tone(N(88), 0.12, { type: 'square', vol: 0.08 }); tone(N(93), 0.35, { type: 'square', vol: 0.08, at: 0.08 }); },
    coins() { for (let i = 0; i < 6; i++) tone(N(84 + (i % 3) * 4), 0.15, { type: 'square', vol: 0.05, at: i * 0.07 }); },
    knock() { [0, 0.18, 0.5].forEach((a) => { noise(0.09, { at: a, f: 180, q: 1, vol: 0.6 }); tone(90, 0.12, { at: a, vol: 0.25 }); }); },
    sting() { [57, 60, 64].forEach((n, i) => tone(N(n), 1.2, { type: 'sawtooth', vol: 0.06, lp: 1600, at: i * 0.02 })); tone(N(45), 1.4, { type: 'triangle', vol: 0.2 }); },
    suspense() { tone(N(50), 1.6, { type: 'sawtooth', vol: 0.05, lp: 700 }); tone(N(51), 1.6, { type: 'sawtooth', vol: 0.05, lp: 700, at: 0.4 }); },
    paper() { noise(0.35, { f: 3000, f2: 900, q: 0.7, vol: 0.25 }); noise(0.25, { at: 0.3, f: 2500, f2: 1200, q: 0.7, vol: 0.2 }); },
    bell() { [1, 2.76, 5.4].forEach((m, i) => tone(660 * m, 2.2 - i * 0.6, { vol: 0.12 / (i + 1) })); },
    newsboy() { FX.bell(); [72, 76, 79, 84].forEach((n, i) => tone(N(n), 0.18, { type: 'triangle', vol: 0.12, at: 0.25 + i * 0.12 })); },
    magic() { [72, 76, 79, 84, 88].forEach((n, i) => tone(N(n), 0.5, { type: 'sine', vol: 0.12, at: i * 0.07 })); noise(0.8, { f: 6000, q: 3, vol: 0.06 }); },
    bad() { [62, 61, 60, 59].forEach((n, i) => tone(N(n - 12), i === 3 ? 0.9 : 0.3, { type: 'sawtooth', vol: 0.09, lp: 1200, at: i * 0.32 })); },
    drumroll(d = 1.4) { for (let t = 0; t < d; t += 0.045) noise(0.05, { at: t, f: 300, q: 1, vol: 0.12 + 0.25 * (t / d) }); noise(0.4, { at: d, f: 200, q: 0.8, vol: 0.6 }); },
    fanfare() { [[60, 0], [64, 0.15], [67, 0.3], [72, 0.45], [67, 0.65], [72, 0.8]].forEach(([n, a]) => { tone(N(n), 0.3, { type: 'square', vol: 0.07, at: a, lp: 3000 }); tone(N(n - 12), 0.3, { type: 'triangle', vol: 0.1, at: a }); }); },
    lose() { tone(N(55), 0.4, { type: 'triangle', vol: 0.15 }); tone(N(50), 0.7, { type: 'triangle', vol: 0.15, at: 0.35 }); },
    vaultClick() { noise(0.05, { f: 4000, q: 6, vol: 0.4 }); tone(1800, 0.04, { type: 'square', vol: 0.05 }); },
    vaultOpen() { noise(1.2, { f: 400, f2: 120, q: 2, vol: 0.4 }); setTimeout(() => FX.fanfare(), 900); },
    vaultLocked() { noise(0.2, { f: 300, q: 2, vol: 0.6 }); tone(70, 0.6, { type: 'sawtooth', vol: 0.15, lp: 400 }); },
    siren() { for (let i = 0; i < 4; i++) { tone(700, 0.3, { type: 'square', vol: 0.05, at: i * 0.6, to: 950 }); tone(950, 0.3, { type: 'square', vol: 0.05, at: i * 0.6 + 0.3, to: 700 }); } },
    whoosh() { noise(0.5, { f: 400, f2: 3000, q: 0.8, vol: 0.12, attack: 0.15 }); },
    lock() { noise(0.06, { f: 2500, q: 5, vol: 0.4 }); noise(0.08, { at: 0.12, f: 1500, q: 5, vol: 0.4 }); },
    train() { [0, 0.25, 0.5, 0.75].forEach((a) => noise(0.12, { at: a, f: 500, q: 1, vol: 0.3 })); tone(N(76), 0.6, { type: 'square', vol: 0.06, at: 1, lp: 2000 }); tone(N(79), 0.8, { type: 'square', vol: 0.06, at: 1, lp: 2000 }); },
    turn() { tone(N(79), 0.25, { type: 'triangle', vol: 0.18 }); tone(N(84), 0.45, { type: 'triangle', vol: 0.18, at: 0.16 }); },
    challenge() { FX.drumroll(1.0); [55, 58, 62].forEach((n, i) => tone(N(n), 0.6, { type: 'sawtooth', vol: 0.06, lp: 2000, at: 1.05 + i * 0.03 })); },
    vote() { tone(N(84), 0.08, { type: 'square', vol: 0.06 }); },
    tick() { tone(1500, 0.03, { type: 'square', vol: 0.04 }); },
    /** "Voz" da personagem: 3 sílabas com timbre e tom próprios de cada lugar. */
    voice(seat = 0, mood = 0) {
      const base = [196, 247, 294, 165, 330, 220][seat % 6] * (mood ? 1.12 : 1); const wave = ['square', 'triangle', 'sawtooth', 'square', 'triangle', 'sawtooth'][seat % 6];
      [0, 0.11, 0.24].forEach((a, i) => tone(base * [1, 1.25, 1.12][i] * (0.96 + Math.random() * 0.08), 0.09, { type: wave, vol: 0.07, at: a, lp: 1800 }));
    },
  };

  /* ---------------------------------------------------------- música ambiente (vila piscatória, à noite) */
  const PROG = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]]; // Lá m, Fá, Sol, Mi m
  const ARP = [0, 1, 2, 1, 2, 0, 1, 2];
  function musicTick() {
    const ctx = SND.ctx; if (!ctx || !SND.musicOn || !SND.on) return;
    const s = SND.step++; const chord = PROG[Math.floor(s / 16) % PROG.length]; const beat = s % 16;
    const b = { bus: SND.musicBus };
    if (beat === 0) { chord.forEach((n) => tone(N(n - 12), 4.2, Object.assign({ type: 'triangle', vol: 0.05, attack: 0.8, lp: 900 }, b))); tone(N(chord[0] - 24), 4, Object.assign({ type: 'sine', vol: 0.12, attack: 0.3 }, b)); }
    if (beat % 2 === 0) { const n = chord[ARP[(beat / 2) % 8]] + (beat >= 8 ? 12 : 0); tone(N(n), 0.6, Object.assign({ type: 'triangle', vol: 0.045, lp: 2600 }, b)); }
    if (beat === 6 && Math.random() < 0.4) tone(N(chord[2] + 24), 0.8, Object.assign({ type: 'sine', vol: 0.02 }, b));
    if (beat === 0 && Math.random() < 0.5) noise(3.5, Object.assign({ f: 500, f2: 250, q: 0.5, vol: 0.05, attack: 1.4, ft: 'lowpass' }, b)); // ondas
    if (Math.random() < 0.006) { tone(1400, 0.35, Object.assign({ to: 1900, vol: 0.02 }, b)); tone(1900, 0.3, Object.assign({ to: 1300, vol: 0.02, at: 0.3 }, b)); } // gaivota
  }
  function startMusic() { ensure(); if (SND.timer) return; SND.timer = setInterval(musicTick, 280); }
  function stopMusic() { clearInterval(SND.timer); SND.timer = null; }
  function setOn(v) { SND.on = v; try { LS && LS.setItem('cofre3_sound', v ? 'on' : 'off'); } catch (e) { /* */ } if (SND.master) SND.master.gain.value = v ? 0.8 : 0; }
  function setMusic(v) { SND.musicOn = v; try { LS && LS.setItem('cofre3_music', v ? 'on' : 'off'); } catch (e) { /* */ } if (SND.musicBus) SND.musicBus.gain.value = v ? 0.32 : 0; }
  function play(name, ...args) { try { if (FX[name]) FX[name](...args); } catch (e) { /* */ } }

  window.SND = Object.assign(SND, { play, startMusic, stopMusic, setOn, setMusic, unlock });
})();
