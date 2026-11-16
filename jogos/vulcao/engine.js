// ILHA DO VULCÃO — motor do jogo (corre na TV; os comandos só enviam ordens)
(function (G) {
  const D = G.DATA || require('./data.js');
  const ENG = { FAST: false, TV: {}, AUTOH: null, onPush: null, snd: () => {} };
  const S = ENG.S = {
    ph: 'lobby', players: [], turn: 0, round: 0, step: 'lobby', x: null, erupt: 0, dice: [], log: [], v: 0, code: '', winner: -1,
    opts: { speed: 1, mode: 'mix', cards: true, len: 'n' }, deck: [], used: {},
  };
  let PEND = null, GEN = 0;
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const r6 = () => 1 + rnd(6);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const wait = ms => ENG.FAST ? Promise.resolve() : new Promise(r => setTimeout(r, ms * (S.opts.speed || 1)));
  const tv = (name, ...a) => { const f = ENG.TV[name]; if (!f) return Promise.resolve(); try { return Promise.resolve(f(...a)).catch(e => { console.error('TV.' + name, e); }); } catch (e) { console.error('TV.' + name, e); return Promise.resolve(); } };
  const cut = (name, o) => tv('cut', name, o || {});
  const banner = (t, s, k, ms) => tv('banner', t, s || '', k || 'info', ms || 1600);
  function log(m) { S.log.push(m); if (S.log.length > 40) S.log.shift(); }
  function push() { S.v++; if (ENG.onPush) ENG.onPush(); }
  const P = i => S.players[i];
  const nm = i => S.players[i].name;
  const humans = () => S.players.map((p, i) => p.bot ? -1 : i).filter(i => i >= 0);
  const islanders = ex => S.players.map((p, i) => p.zone === 'i' && i !== ex ? i : -1).filter(i => i >= 0);
  const nextGate = p => D.GATES[p.gates];
  const checkpoint = p => p.gates > 0 ? D.GATES[p.gates - 1] : 0;
  const normGates = p => { p.gates = Math.max(p.gates, D.GATES.filter(g => g < p.pos).length); };
  const dead = gen => gen !== GEN || S.ph !== 'play';

  function newPlayer(o) { return Object.assign({ name: 'Jogador', hat: 0, col: 0, cid: '', local: false, bot: false, pos: 0, zone: 'i', vpos: 0, fell: 0, gates: 0, amulet: 0, extra: 0, dn: 1, db: 0, tries: 0, solo: 0 }, o); }

  // ---------- pedir decisões ----------
  // cfg: who [índices], on(pi, cmd) -> valor para terminar (undefined = continua), ms, dflt(), bot(pi) -> cmd
  function gather(step, x, cfg) {
    if (S.ph !== 'play') return new Promise(() => { });
    return new Promise(res => {
      const gen = GEN;
      const ms = cfg.ms ? cfg.ms : 0;
      S.step = step; S.x = Object.assign({}, x, { who: cfg.who.slice(), ms, t0: Date.now() });
      const me = { step, who: cfg.who, done: false };
      const fin = v => { if (me.done || gen !== GEN) return; me.done = true; clearTimeout(me.t); if (PEND === me) PEND = null; S.step = 'busy'; push(); res(v); };
      me.on = (pi, c) => { if (me.done || !cfg.who.includes(pi)) return; const r = cfg.on(pi, c); if (r !== undefined) fin(r); else push(); };
      me.force = () => fin(cfg.dflt());
      me.auto = () => {
        cfg.who.forEach(pi => {
          const p = S.players[pi]; if (!p) return;
          let get = null;
          if (p.bot && cfg.bot) get = () => cfg.bot(pi);
          else if (!p.bot && ENG.AUTOH) get = () => ENG.AUTOH(step, S.x, pi);
          if (!get) return;
          const go = () => { if (me.done || PEND !== me) return; const c = get(); if (c) me.on(pi, c); };
          if (ENG.FAST) Promise.resolve().then(go); else setTimeout(go, (700 + Math.random() * 900) * (cfg.botSlow || 1));
        });
      };
      PEND = me;
      if (ms && !ENG.FAST) me.t = setTimeout(() => fin(cfg.dflt()), ms);
      push();
      if (!cfg.who.length || (ENG.FAST && !ENG.AUTOH && !cfg.who.some(pi => S.players[pi].bot))) { Promise.resolve().then(() => fin(cfg.dflt())); return; }
      me.auto();
      if (ENG.FAST) Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve()).then(() => fin(cfg.dflt()));
    });
  }
  function handleCmd(pi, c) {
    if (S.ph !== 'play' || !c || typeof c.a !== 'string' || !S.players[pi]) return;
    if (PEND) PEND.on(pi, c);
  }
  ENG.force = () => { if (PEND) PEND.force(); };
  ENG.poke = () => { if (PEND) PEND.auto(); };
  ENG.waiting = () => PEND ? { step: PEND.step, who: PEND.who, since: S.x && S.x.t0 } : null;

  // ---------- dados ----------
  async function askRoll(pi, why, forced, need) {
    const p = P(pi);
    const d = forced || { n: p.dn, b: (p.db ? 1 : 0) + (p.extra ? 1 : 0) + (S.opts.len === 'r' ? 1 : 0) };
    await gather('roll', { why, n: d.n, b: d.b, need: need || 0 }, { who: [pi], on: (k, c) => c.a === 'roll' ? 1 : undefined, ms: 60000, dflt: () => 1, bot: () => ({ a: 'roll' }) });
    const out = [];
    for (let i = 0; i < d.n; i++) out.push({ t: i === 0 ? 'n' : 'g', v: r6() });
    for (let i = 0; i < d.b; i++) out.push({ t: 'b', v: 1 + rnd(3) });
    if (!forced && p.extra) p.extra = 0;
    const sum = out.reduce((a, o) => a + o.v, 0);
    S.dice = out; S.step = 'rolling'; S.x = { who: [pi], why, sum, need: need || 0 }; push();
    ENG.snd('dice');
    await tv('rollDice', pi, out, sum, why, need || 0);
    return sum;
  }

  // ---------- movimento ----------
  async function moveIsland(pi, n, quick) {
    const p = P(pi); if (p.zone !== 'i' || !n) return 0;
    const dir = n > 0 ? 1 : -1; let k = Math.abs(n), moved = 0;
    while (k-- > 0) {
      const np = p.pos + dir; if (np < 0 || np > D.GOAL) break;
      p.pos = np; moved++; push();
      await tv('hop', pi, quick ? 0.6 : 1);
      if (dir > 0 && (np === nextGate(p) || np === D.GOAL)) break;
    }
    return moved;
  }
  async function moveVolc(pi, n) {
    const p = P(pi); const dir = n > 0 ? 1 : -1; let k = Math.abs(n);
    while (k-- > 0) { const np = p.vpos + dir; if (np < 0 || np > D.EXITV) break; p.vpos = np; push(); await tv('hop', pi, 1); }
  }
  async function fall(pi, why) {
    const p = P(pi);
    if (p.amulet) { p.amulet = 0; log(`🧿 O amuleto de ${p.name} partiu-se e salvou-o do vulcão.`); push(); ENG.snd('good'); await cut('amulet', { pi }); return false; }
    p.fell = p.pos; log(`💀 ${p.name} caiu dentro do vulcão${why ? ' (' + why + ')' : ''}.`);
    ENG.snd('fall'); await cut('fall', { pi });
    p.zone = 'v'; p.vpos = 0; push();
    await cut('fallIn', { pi });
    return true;
  }

  // ---------- provas da vida real ----------
  function pickCh(bank) {
    const all = D[bank].map((c, i) => Object.assign({ i }, c)).filter(c => !c.c || S.opts.cards);
    let used = S.used[bank] || (S.used[bank] = []);
    let free = all.filter(c => !used.includes(c.i));
    if (!free.length) { used.length = 0; free = all; }
    const ch = pick(free); used.push(ch.i); return ch;
  }
  ENG.chText = (x, players) => {
    const ch = D[x.bk] && D[x.bk][x.id]; if (!ch) return { t: 'Prova', d: '' };
    let d = ch.d; if (ch.v && x.vi >= 0) d = d.replace('{v}', ch.v[x.vi]);
    if (x.solo !== undefined && players[x.solo]) d = d.replace(/\{S\}/g, players[x.solo].name);
    return { t: ch.t, d, s: ch.s, c: !!ch.c, w: ch.w };
  };
  async function realProva(kind, bank, ctx, who) {
    let skips = 0;
    for (; ;) {
      const ch = pickCh(bank);
      const x = Object.assign({ k: kind, bk: bank, id: ch.i, vi: ch.v ? rnd(ch.v.length) : -1, s: ch.s, skips }, ctx);
      if (ch.w) { const w = shuffle(D.WORDS[ch.w].map((_, i) => i)); x.w = ch.w; x.wa = w.slice(0, 8); x.wb = w.slice(8, 16); }
      ENG.snd('prova');
      const r = await gather('pv', x, { who, ms: 240000, on: (pi, c) => c.a === 'go' ? 'go' : (c.a === 'skip' && skips < 3) ? 'skip' : undefined, dflt: () => 'go' });
      if (r === 'skip') { skips++; continue; }
      ENG.snd('go');
      await gather('pvrun', x, { who, ms: (ch.s + 300) * 1000, on: (pi, c) => { if (c.a === 'rst') { S.x.t0 = Date.now(); ENG.snd('go'); return; } return c.a === 'fim' ? 1 : undefined; }, dflt: () => 1 });
      return ch;
    }
  }
  async function vote(x, voters, opts) {
    const votes = {};
    const tally = () => { const c = {}; Object.values(votes).forEach(v => c[v] = (c[v] || 0) + 1); return c; };
    if (voters.length) {
      await gather('vote', Object.assign({ votes, opts }, x), {
        who: voters, ms: 120000, dflt: () => 1,
        on: (pi, c) => {
          if (c.a !== 'vote' || !opts.includes(c.v)) return;
          votes[pi] = c.v; ENG.snd('tick');
          const t = tally(), n = Object.keys(votes).length;
          if (Math.max(...Object.values(t)) > voters.length / 2 || n >= voters.length) return 1;
        },
      });
    }
    const c = tally(), max = Math.max(0, ...Object.values(c));
    const tied = Object.keys(c).filter(k => c[k] === max).map(Number);
    if (tied.length === 1) return { v: tied[0], tie: false, c };
    return { v: null, tie: true, tied: tied.length ? tied : opts.slice(), c };
  }
  async function tieBreak(list) { ENG.snd('dice'); await banner('Empate!', 'O dado decide…', 'warn', 1800); return pick(list); }

  // ---------- prova da ronda ----------
  async function roundProva(gen) {
    S.players.forEach(p => { p.dn = 1; p.db = 0; });
    const H = humans();
    let real = H.length >= 2 && S.opts.mode !== 'tel' && (S.opts.mode === 'real' || Math.random() < 0.7);
    if (!real) return digital(gen);
    const kinds = ['all', 'all']; if (H.length >= 3) kinds.push('1vN'); if (H.length >= 4) kinds.push('team');
    let kind = pick(kinds); if (kind === S.lastKind && kind !== 'all') kind = pick(kinds); S.lastKind = kind;
    const res = { k: kind, real: 1 };
    if (kind === 'all') {
      await cut('prova', { kind, t: 'Todos contra todos' });
      await realProva('all', 'ALL', { P: H }, H); if (dead(gen)) return;
      const r = await vote({ k: 'all' }, H, H); const w = r.tie ? await tieBreak(r.tied) : r.v;
      P(w).dn = 2; res.w = [w]; log(`🥇 ${nm(w)} ganhou a prova e leva o dado de ouro.`);
    } else if (kind === '1vN') {
      const min = Math.min(...H.map(i => P(i).solo)); const solo = pick(H.filter(i => P(i).solo === min)); P(solo).solo++;
      const rest = H.filter(i => i !== solo);
      await cut('prova', { kind, t: `${nm(solo)} contra o resto`, solo });
      await realProva('1vN', 'SOLO', { solo, P: H }, H); if (dead(gen)) return;
      const r = await vote({ k: '1vN', solo }, H, [1, 0]); const w = r.tie ? await tieBreak([1, 0]) : r.v;
      if (w === 1) { P(solo).dn = 2; res.w = [solo]; log(`🥇 ${nm(solo)} venceu sozinho e leva o dado de ouro.`); }
      else { rest.forEach(i => P(i).db = 1); res.w = rest; log(`🥉 O grupo venceu ${nm(solo)}: dado de bronze para cada um.`); }
    } else {
      const sh = shuffle(H), half = Math.floor(sh.length / 2); const A = sh.slice(0, half), B = sh.slice(half);
      await cut('prova', { kind, t: 'Equipas', A, B });
      await realProva('team', 'TEAM', { A, B }, H); if (dead(gen)) return;
      const r = await vote({ k: 'team', A, B }, H, [0, 1]); const w = r.tie ? await tieBreak([0, 1]) : r.v;
      const W = w === 0 ? A : B; W.forEach(i => P(i).db = 1); res.w = W;
      log(`🥉 Ganhou a equipa ${w === 0 ? 'A' : 'B'} (${W.map(nm).join(', ')}): dado de bronze para cada um.`);
    }
    res.bots = [];
    S.players.forEach((p, i) => { if (p.bot && Math.random() < 0.5) { p.db = 1; res.bots.push(i); } });
    S.step = 'pvres'; S.x = Object.assign(res, { who: [] }); push();
    ENG.snd('win'); await cut('prizes', res); await wait(200);
  }
  const MG = ['stop', 'reflex', 'taps'];
  async function digital(gen) {
    const H = humans();
    let k = pick(MG); if (k === S.lastMg) k = pick(MG); S.lastMg = k;
    const res = {}; const target = k === 'stop' ? 4 + rnd(5) : 0;
    const base = { k, target, res };
    await cut('prova', { kind: 'tel', t: { stop: 'Relógio Cego', reflex: 'Reflexos', taps: 'Martelada' }[k] });
    if (dead(gen)) return;
    if (H.length) {
      ENG.snd('prova');
      const all = () => H.every(i => res[i] !== undefined) ? 1 : undefined;
      if (k === 'reflex') {
        await gather('mgwait', base, { who: H, ms: 2600 + rnd(3600), dflt: () => 1, on: (pi, c) => { if (c.a === 'mg' && res[pi] === undefined) { res[pi] = 9999; return all(); } } });
        if (dead(gen)) return;
        ENG.snd('go');
        if (!all()) await gather('mg', base, { who: H, ms: 5000, dflt: () => 1, on: (pi, c) => { if (c.a === 'mg' && res[pi] === undefined && typeof c.v === 'number') { res[pi] = Math.max(60, Math.min(5000, Math.round(c.v))); return all(); } } });
      } else {
        await gather('mg', base, { who: H, ms: 45000, dflt: () => 1, on: (pi, c) => { if (c.a === 'mg' && res[pi] === undefined && typeof c.v === 'number') { res[pi] = Math.max(0, Math.min(60000, Math.round(c.v))); return all(); } } });
      }
      if (dead(gen)) return;
    }
    const worst = k === 'taps' ? 0 : 99999;
    S.players.forEach((p, i) => {
      if (p.bot) res[i] = k === 'stop' ? Math.round(target * 1000 + (Math.random() < .5 ? -1 : 1) * (150 + rnd(1300))) : k === 'reflex' ? 240 + rnd(380) : 22 + rnd(26);
      else if (res[i] === undefined) res[i] = worst;
    });
    const score = i => k === 'stop' ? Math.abs(res[i] - target * 1000) : k === 'reflex' ? res[i] : -res[i];
    const rank = shuffle(S.players.map((_, i) => i)).sort((a, b) => score(a) - score(b));
    P(rank[0]).dn = 2; if (rank.length >= 3) P(rank[1]).db = 1;
    log(`🥇 ${nm(rank[0])} ganhou a prova de telemóvel${rank.length >= 3 ? ` · 🥉 ${nm(rank[1])}` : ''}.`);
    S.step = 'mgres'; S.x = { k, target, rank: rank.map(i => [i, res[i]]), who: [] }; push();
    ENG.snd('win'); await cut('rank', S.x); await wait(200);
  }

  // ---------- casas ----------
  async function pickTarget(pi, kind, cands) {
    if (!cands.length) return -1;
    if (cands.length === 1) return cands[0];
    const best = cands.slice().sort((a, b) => P(b).pos - P(a).pos)[0];
    return gather('pick', { k: kind, opts: cands }, { who: [pi], ms: 45000, dflt: () => pick(cands), on: (k, c) => c.a === 'pick' && cands.includes(c.v) ? c.v : undefined, bot: () => ({ a: 'pick', v: Math.random() < .7 ? best : pick(cands) }) });
  }
  async function duel(pi, gen) {
    const cands = islanders(pi);
    if (!cands.length) { await banner('Duelo', 'Não há ninguém na ilha para desafiar.', 'info'); return; }
    const t = await pickTarget(pi, 'duel', cands); if (dead(gen)) return;
    await cut('duel', { a: pi, b: t });
    let w;
    const H = humans();
    if (!P(pi).bot && !P(t).bot) {
      let voters = H.filter(i => i !== pi && i !== t); if (!voters.length) voters = [pi, t];
      await realProva('duel', 'DUEL', { a: pi, b: t }, H); if (dead(gen)) return;
      const r = await vote({ k: 'duel', a: pi, b: t }, voters, [pi, t]); w = r.tie ? await tieBreak([pi, t]) : r.v;
    } else {
      for (let k = 0; k < 6; k++) {
        const a = await askRoll(pi, 'duel', { n: 1, b: 0 }); if (dead(gen)) return;
        const b = await askRoll(t, 'duel', { n: 1, b: 0 }); if (dead(gen)) return;
        if (a !== b) { w = a > b ? pi : t; break; }
        await banner('Empate!', 'Lançam outra vez', 'warn', 1200);
      }
      if (w === undefined) w = pick([pi, t]);
    }
    const l = w === pi ? t : pi;
    log(`⚔️ ${nm(w)} venceu o duelo contra ${nm(l)}.`);
    ENG.snd('win'); await cut('duelEnd', { w, l });
    await moveIsland(w, 3, true); await moveIsland(l, -3, true);
  }
  async function storm(pi) {
    const list = islanders(-1).filter(i => P(i).pos > 0);
    if (!list.length) { await banner('Tufão', 'Passou ao largo: ninguém na ilha.', 'info'); return; }
    const v = pick(list), p = P(v), to = Math.max(0, p.pos - 5);
    S.step = 'storm'; S.x = { list, v, who: [] }; push();
    ENG.snd('storm'); await cut('wheel', { list, v, t: '🌪️ Tufão', sub: 'Quem é que ele leva?' });
    log(`🌪️ O tufão levou ${p.name} ${p.pos - to} casas para trás.`);
    p.pos = to; push();
    await cut('storm', { pi: v });
  }
  async function swap(pi, gen) {
    const cands = islanders(pi);
    if (!cands.length) { await banner('Papagaio', 'Não há ninguém com quem trocar.', 'info'); return; }
    const t = await pickTarget(pi, 'swap', cands); if (dead(gen)) return;
    const a = P(pi), b = P(t); const x = a.pos; a.pos = b.pos; b.pos = x; normGates(a); normGates(b);
    log(`🦜 ${a.name} trocou de lugar com ${b.name}.`); push();
    ENG.snd('swap'); await cut('swap', { a: pi, b: t });
  }
  function drawCard(bot, alone) {
    for (let k = 0; k < 40; k++) {
      if (!S.deck.length) S.deck = shuffle(D.LUCK.map((_, i) => i));
      const c = S.deck.pop(); if (D.LUCK[c].a === 'dare' && (bot || alone)) continue; return c;
    }
    return 0;
  }
  async function luck(pi, gen) {
    const p = P(pi); const ci = drawCard(p.bot, humans().length < 2), c = D.LUCK[ci];
    const x = { c: ci, who: [pi] };
    if (c.a === 'dare') { let u = S.used.DARE || (S.used.DARE = []); if (u.length >= D.DARE.length) u.length = 0; let di; do { di = rnd(D.DARE.length); } while (u.includes(di)); u.push(di); x.di = di; }
    S.step = 'card'; S.x = x; push();
    ENG.snd('card'); await cut('card', x); await wait(200);
    const others = islanders(pi);
    switch (c.a) {
      case 'mv': log(`🃏 ${p.name}: ${c.t} (${c.v > 0 ? '+' : ''}${c.v}).`); await moveIsland(pi, c.v, true); break;
      case 'swaplast': {
        const last = others.slice().sort((a, b) => P(a).pos - P(b).pos)[0];
        if (last === undefined || P(last).pos >= p.pos) { log(`🃏 ${p.name}: Solidariedade, mas já é o último.`); await banner('Já és o último', 'Nada acontece', 'info'); break; }
        const b = P(last), t = p.pos; p.pos = b.pos; b.pos = t; normGates(p); normGates(b); log(`🃏 ${p.name} trocou de lugar com ${b.name}, o último.`); push(); ENG.snd('swap'); await cut('swap', { a: pi, b: last }); break;
      }
      case 'others': log(`🃏 ${p.name}: Sismo! Os outros recuam ${-c.v}.`); ENG.snd('rumble'); await cut('quake'); for (const k of others) await moveIsland(k, c.v, true); break;
      case 'all': log(`🃏 ${p.name}: Festa na Praia, todos avançam ${c.v}.`); for (const k of islanders(-1)) await moveIsland(k, c.v, true); break;
      case 'leader': { const l = islanders(-1).sort((a, b) => P(b).pos - P(a).pos)[0]; log(`🃏 ${p.name}: Inveja! ${nm(l)} recua ${-c.v}.`); await tv('focus', l); await moveIsland(l, c.v, true); break; }
      case 'pull': { const ahead = others.filter(k => P(k).pos > p.pos).sort((a, b) => P(a).pos - P(b).pos)[0]; if (ahead === undefined) { log(`🃏 ${p.name}: Corda, mas não há ninguém à frente.`); await banner('Ninguém à frente', 'A corda não agarra nada', 'info'); } else { log(`🃏 ${p.name} puxou-se até ${nm(ahead)}.`); await moveIsland(pi, P(ahead).pos - p.pos, true); } break; }
      case 'push': { const cands = others.filter(k => P(k).pos > 0); if (!cands.length) { await banner('Empurrão', 'Não há ninguém para empurrar', 'info'); break; } const t = await pickTarget(pi, 'push', cands); if (dead(gen)) return; log(`🃏 ${p.name} empurrou ${nm(t)} ${-c.v} casas.`); await tv('focus', t); await moveIsland(t, c.v, true); break; }
      case 'extra': p.extra = 1; log(`🃏 ${p.name} ganhou um dado de bronze para o próximo lançamento.`); push(); break;
      case 'amulet': p.amulet = 1; log(`🃏 ${p.name} ganhou um Amuleto de Pedra.`); push(); break;
      case 'dare': {
        const did = await gather('dare', x, { who: [pi], ms: 180000, dflt: () => 0, on: (k, cm) => cm.a === 'dare' ? (cm.v ? 1 : 0) : undefined });
        if (dead(gen)) return;
        if (did) { log(`🎭 ${p.name} pagou a prenda e avança 3.`); ENG.snd('good'); await banner('Prenda paga!', `${p.name} avança 3`, 'good', 1500); await moveIsland(pi, 3, true); }
        else { log(`🙅 ${p.name} recusou a prenda e recua 3.`); ENG.snd('bad'); await banner('Recusou!', `${p.name} recua 3`, 'bad', 1500); await moveIsland(pi, -3, true); }
      }
    }
  }
  async function land(pi, gen, depth) {
    const p = P(pi); if (p.zone !== 'i') return;
    const sp = D.ISLAND[p.pos], t = sp.t;
    if (t === 'n' || t === 'start' || t === 'gate' || t === 'goal') return;
    if (S.erupt > 0 && D.LAVA_TYPES[t]) {
      log(`🔥 ${p.name} parou numa casa de lava e recua 4.`); ENG.snd('bad');
      await cut('lava', { pi }); await moveIsland(pi, -4, true); return;
    }
    await cut('space', { pi, t });
    switch (t) {
      case '+': log(`⏩ ${p.name} apanhou vento a favor: +${sp.v}.`); ENG.snd('good'); await moveIsland(pi, sp.v, true); break;
      case '-': log(`⏪ ${p.name} atolou-se: −${sp.v}.`); ENG.snd('bad'); await moveIsland(pi, -sp.v, true); break;
      case 'again': {
        if (depth) break;
        log(`🤸 ${p.name} saltou no trampolim.`);
        const r = await askRoll(pi, 'again', { n: 1, b: 0 }); if (dead(gen)) return;
        await moveIsland(pi, r);
        if (p.pos === D.GOAL) { await finalTry(pi, gen); return; }
        if (p.pos === nextGate(p)) { await gateStop(pi); return; }
        await land(pi, gen, 1); break;
      }
      case 'luck': await luck(pi, gen); break;
      case 'duel': await duel(pi, gen); break;
      case 'storm': await storm(pi); break;
      case 'swap': await swap(pi, gen); break;
      case 'volc': S.erupt = 3; log(`🌋 ${p.name} acordou o vulcão! Lava durante 3 rondas.`); push(); ENG.snd('erupt'); await cut('erupt', { pi }); break;
      case 'skull': await fall(pi); break;
    }
  }
  async function gateStop(pi) { const p = P(pi); ENG.snd('gate'); await banner('🗿 ' + D.GATE_NAMES[p.gates], 'Paragem obrigatória. Desafio na próxima vez.', 'warn', 2000); log(`🗿 ${p.name} chegou ao ${D.GATE_NAMES[p.gates]}.`); }
  async function gateTry(pi, gen) {
    const p = P(pi), gi = p.gates, last = gi === D.GATES.length - 1;
    const judges = humans().filter(k => k !== pi);
    await cut('gate', { pi, gi });
    let ok;
    if (!p.bot && judges.length) {
      await realProva('gate', 'GATE', { solo: pi, gi }, [pi].concat(judges)); if (dead(gen)) return false;
      const r = await vote({ k: 'gate', solo: pi, gi }, judges, [1, 0]); ok = r.tie ? true : r.v === 1;
    } else {
      const need = last ? 4 : 3;
      const r = await askRoll(pi, 'gate', { n: 1, b: 0 }, need); if (dead(gen)) return false;
      ok = r >= need;
    }
    if (ok) { p.gates++; log(`🗿 ${p.name} venceu o ${D.GATE_NAMES[gi]}.`); push(); ENG.snd('good'); await cut('gateOpen', { pi, gi }); return true; }
    log(`🗿 ${p.name} falhou o desafio do ${D.GATE_NAMES[gi]}.`); ENG.snd('bad');
    await cut('gateFail', { pi, gi, last });
    if (last) await fall(pi, 'o Guardião da Cratera não perdoa');
    return false;
  }
  async function finalTry(pi, gen) {
    const p = P(pi); p.tries++;
    const need = Math.max(2, 4 - p.tries);
    await cut('summit', { pi, need });
    const r = await askRoll(pi, 'final', { n: 1, b: 0 }, need); if (dead(gen)) return;
    if (r >= need) { S.winner = pi; log(`🏆 ${p.name} tocou o gongo do Cume!`); push(); ENG.snd('gong'); }
    else { log(`⛩️ ${p.name} falhou o gongo (precisava de ${need}+).`); ENG.snd('bad'); await banner('Quase!', `Precisava de ${need} ou mais. Tenta na próxima vez.`, 'bad', 2000); }
  }
  async function volcTurn(pi, gen) {
    const p = P(pi);
    const r = await askRoll(pi, 'volc'); if (dead(gen)) return;
    await moveVolc(pi, r);
    const t = D.VOLC[p.vpos].t;
    if (t === 'geyser') {
      log(`♨️ Um géiser disparou ${p.name} de volta à ilha.`); ENG.snd('geyser'); await cut('geyser', { pi });
      p.zone = 'i'; p.pos = p.fell; push(); await cut('backOut', { pi, how: 'geyser' });
    } else if (t === 'vback') {
      log(`🪨 Desabamento! ${p.name} recua 2 no vulcão.`); ENG.snd('rumble'); await cut('space', { pi, t }); await moveVolc(pi, -2);
    } else if (t === 'exit') {
      const cp = checkpoint(p);
      log(`🚪 ${p.name} saiu do vulcão pela gruta${cp ? ' e voltou ao último Guardião' : ' e voltou à Praia'}.`); ENG.snd('good'); await cut('exit', { pi });
      p.zone = 'i'; p.pos = cp; push(); await cut('backOut', { pi, how: 'exit' });
    }
  }
  async function turn(pi, gen) {
    const p = P(pi); S.turn = pi; S.step = 'busy'; push();
    ENG.snd('turn'); await tv('turnFx', pi);
    if (p.zone === 'v') return volcTurn(pi, gen);
    if (p.pos === D.GOAL) return finalTry(pi, gen);
    if (p.pos === nextGate(p)) { const ok = await gateTry(pi, gen); if (!ok || dead(gen)) return; }
    const r = await askRoll(pi, 'move'); if (dead(gen)) return;
    await moveIsland(pi, r);
    if (p.pos === D.GOAL) return finalTry(pi, gen);
    if (p.pos === nextGate(p)) return gateStop(pi);
    await land(pi, gen, 0);
  }

  // ---------- ciclo ----------
  async function gameLoop(gen) {
    await cut('intro');
    while (!dead(gen)) {
      S.round++; push();
      await cut('round', { n: S.round, erupt: S.erupt });
      await roundProva(gen); if (dead(gen)) return;
      const n = S.players.length, first = (S.round - 1) % n;
      for (let k = 0; k < n; k++) {
        if (dead(gen)) return;
        await turn((first + k) % n, gen);
        if (dead(gen)) return;
        if (S.winner >= 0) { endGame(); return; }
        await wait(500);
      }
      if (S.erupt > 0) { S.erupt--; push(); if (S.erupt === 0) { log('🌋 O vulcão adormeceu. A lava arrefeceu.'); await cut('cool'); } }
    }
  }
  const progress = p => p.zone === 'i' ? p.pos : checkpoint(p) + p.vpos / 100 - 0.5;
  function ranking() {
    return S.players.map((p, i) => ({ i, s: i === S.winner ? 999 : progress(p) })).sort((a, b) => b.s - a.s).map(r => r.i);
  }
  function startGame() {
    if (S.players.length < 2) return false;
    GEN++; PEND = null;
    S.players.forEach(p => Object.assign(p, { pos: 0, zone: 'i', vpos: 0, fell: 0, gates: 0, amulet: 0, extra: 0, dn: 1, db: 0, tries: 0, solo: 0 }));
    Object.assign(S, { ph: 'play', round: 0, turn: 0, erupt: 0, winner: -1, log: [], deck: [], used: {}, dice: [], step: 'busy', x: null });
    log('🏝️ Começou a subida ao vulcão. Boa sorte!'); push();
    tv('syncAll');
    gameLoop(GEN);
    return true;
  }
  function endGame() {
    if (S.ph !== 'play') return;
    const rank = ranking(); if (S.winner < 0) S.winner = rank[0];
    S.ph = 'over'; S.step = 'over'; S.x = { rank, who: [] }; PEND = null; GEN++;
    log(`🏆 ${nm(S.winner)} conquistou a Ilha do Vulcão!`); push();
    ENG.snd('fanfare'); cut('win', { rank });
  }
  function backToLobby() { GEN++; PEND = null; S.ph = 'lobby'; S.step = 'lobby'; S.x = null; S.winner = -1; S.erupt = 0; S.round = 0; S.players.forEach(p => Object.assign(p, { pos: 0, zone: 'i', vpos: 0, gates: 0 })); push(); tv('syncAll'); }

  // ---------- estado compacto para os comandos ----------
  function snap(acks) {
    const st = {
      v: S.v, ph: S.ph, c: S.code, t: S.turn, r: S.round, s: S.step, x: S.x, e: S.erupt, d: S.dice.map(o => o.t + o.v).join(''), w: S.winner, now: Date.now(),
      P: S.players.map(p => [p.name, p.col, p.hat, p.pos, p.zone === 'v' ? 1 : 0, p.vpos, p.cid, p.local ? 1 : 0, p.bot ? 1 : 0, p.dn, p.db, p.gates, p.amulet, p.extra, p.tries, p.fell]),
      o: [S.opts.mode, S.opts.cards ? 1 : 0, S.opts.len], L: S.log.slice(-4), k: acks || {},
    };
    return st;
  }
  function unsnap(st) {
    return {
      v: st.v, ph: st.ph, code: st.c, turn: st.t, round: st.r, step: st.s, x: st.x, erupt: st.e, winner: st.w, now: st.now, at: Date.now(),
      dice: (st.d.match(/[ngb]\d/g) || []).map(s => ({ t: s[0], v: +s[1] })),
      players: st.P.map(a => ({ name: a[0], col: a[1], hat: a[2], pos: a[3], zone: a[4] ? 'v' : 'i', vpos: a[5], cid: a[6], local: !!a[7], bot: !!a[8], dn: a[9], db: a[10], gates: a[11], amulet: a[12], extra: a[13], tries: a[14], fell: a[15] })),
      opts: { mode: st.o[0], cards: !!st.o[1], len: st.o[2] }, log: st.L || [], acks: st.k || {},
    };
  }

  Object.assign(ENG, { D, newPlayer, handleCmd, startGame, endGame, backToLobby, snap, unsnap, ranking, humans, checkpoint, nextGate, push, log });
  G.ENG = ENG;
  if (typeof module !== 'undefined') module.exports = ENG;
})(typeof window !== 'undefined' ? window : globalThis);
