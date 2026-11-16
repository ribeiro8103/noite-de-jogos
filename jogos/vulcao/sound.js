// ILHA DO VULCÃO — sons sintetizados (sem ficheiros)
(function (G) {
  let ac = null, master = null, on = true, sea = null;
  try { on = localStorage.getItem('vulcao-snd') !== '0'; } catch (e) { }
  function ctx() { if (!ac) { try { ac = new (G.AudioContext || G.webkitAudioContext)(); master = ac.createGain(); master.gain.value = on ? .9 : 0; master.connect(ac.destination); } catch (e) { ac = null; } } return ac; }
  function tone(f, d, type, vol, t0, f2) { if (!ctx()) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + (t0 || 0); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || .1, t + .012); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .05); }
  function noise(d, vol, t0, freq, q, type) { if (!ctx()) return; const n = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, n, ac.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq || 900; f.Q.value = q || .7; const g = ac.createGain(), t = ac.currentTime + (t0 || 0); g.gain.setValueAtTime(vol || .1, t); g.gain.exponentialRampToValueAtTime(.0008, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t); }
  function startSea() { if (!ctx() || sea) return; const n = ac.sampleRate * 4, b = ac.createBuffer(1, n, ac.sampleRate), ch = b.getChannelData(0); let last = 0; for (let i = 0; i < n; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; ch[i] = last * 3.2; } const s = ac.createBufferSource(); s.buffer = b; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; const g = ac.createGain(); g.gain.value = .12; const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .11; lg.gain.value = .07; lfo.connect(lg); lg.connect(g.gain); lfo.start(); s.connect(f); f.connect(g); g.connect(master); s.start(); sea = g; }
  const F = {
    unlock() { if (ctx() && ac.state === 'suspended') ac.resume(); },
    sea() { startSea(); },
    toggle() { on = !on; try { localStorage.setItem('vulcao-snd', on ? '1' : '0'); } catch (e) { } if (master) master.gain.value = on ? .9 : 0; return on; },
    isOn: () => on,
    hop() { tone(420, .09, 'triangle', .07, 0, 620); noise(.05, .04, .06, 600); },
    dice() { for (let k = 0; k < 7; k++) noise(.04, .12, k * .07 + Math.random() * .03, 2400, 2, 'bandpass'); tone(880, .12, 'triangle', .06, .62); },
    turn() { tone(523, .14, 'triangle', .08); tone(784, .22, 'triangle', .08, .12); },
    good() { [523, 659, 784].forEach((f, k) => tone(f, .16, 'triangle', .09, k * .09)); },
    bad() { [330, 262, 196].forEach((f, k) => tone(f, .24, 'sawtooth', .05, k * .14)); },
    win() { [523, 659, 784, 1046].forEach((f, k) => tone(f, .26, 'triangle', .09, k * .11)); },
    fanfare() { [523, 523, 659, 784, 659, 784, 1046].forEach((f, k) => tone(f, .34, 'triangle', .1, k * .16)); [262, 330, 392].forEach(f => tone(f, 1.6, 'sawtooth', .03, 1.1)); },
    fall() { tone(900, 1.1, 'sine', .12, 0, 90); noise(.5, .15, 1, 300); },
    prova() { [392, 523, 392, 523, 659].forEach((f, k) => tone(f, .13, 'square', .05, k * .1)); },
    go() { tone(660, .12, 'square', .06); tone(990, .3, 'square', .07, .14); },
    tick() { tone(1200, .04, 'square', .03); },
    time() { [880, 880, 880].forEach((f, k) => tone(f, .16, 'square', .07, k * .22)); },
    storm() { noise(3.2, .22, 0, 500, 3, 'bandpass'); tone(160, 3, 'sawtooth', .03, 0, 320); },
    swap() { tone(500, .5, 'sine', .08, 0, 1500); tone(1500, .5, 'sine', .08, .35, 500); },
    card() { noise(.14, .12, 0, 1800); tone(700, .12, 'sine', .06, .08, 1100); },
    rumble() { noise(1.6, .35, 0, 120); tone(55, 1.5, 'sawtooth', .12); },
    erupt() { noise(4, .5, 0, 180); noise(2.4, .3, .4, 900); tone(48, 3.6, 'sawtooth', .16); tone(70, 2, 'square', .06, .5); },
    gate() { tone(196, .5, 'sawtooth', .07); tone(147, .7, 'sawtooth', .07, .25); },
    gong() { [110, 164.8, 220, 277].forEach(f => tone(f, 3.2, 'sine', .14)); noise(.4, .12, 0, 2000); },
    geyser() { noise(1.8, .3, 0, 3000, 1, 'highpass'); tone(200, 1.2, 'sine', .06, .3, 1400); },
    bell() { tone(880, .6, 'sine', .1); tone(1320, .5, 'sine', .05, .02); },
  };
  G.Sound = F;
})(window);
