/* O Cofre de São Segredo — Edição Longa: motor do jogo (puro, sem DOM). Funciona no browser (window.CG) e no Node. */
(function (root) {
  const L = typeof module !== 'undefined' && module.exports ? require('./layout.js') : root.LAYOUT;

  /* =========================================================== DADOS DO MISTÉRIO */
  const SUS = [
    { id: 0, name: 'Amélia', full: 'Dona Amélia Prates', role: 'governanta do Solar', emoji: '👵', mao: 'destro', altura: 'baixo', mora: 'alto', oculos: true, fuma: false, work: 'solar' },
    { id: 1, name: 'Hélder', full: 'Hélder Albano', role: 'sobrinho do Comendador', emoji: '🤵', mao: 'canhoto', altura: 'alto', mora: 'alto', oculos: false, fuma: true, work: 'hotel' },
    { id: 2, name: 'Rosa', full: 'Rosa Farinha', role: 'padeira', emoji: '👩‍🍳', mao: 'canhoto', altura: 'baixo', mora: 'porto', oculos: true, fuma: true, work: 'padaria' },
    { id: 3, name: 'Venâncio', full: 'Capitão Venâncio', role: 'pescador', emoji: '🧔', mao: 'destro', altura: 'alto', mora: 'porto', oculos: false, fuma: true, work: 'lota' },
    { id: 4, name: 'Celeste', full: 'Irmã Celeste', role: 'sacristã', emoji: '👩‍🦳', mao: 'canhoto', altura: 'baixo', mora: 'centro', oculos: true, fuma: false, work: 'igreja' },
    { id: 5, name: 'Ilídio', full: 'Dr. Ilídio Vaz', role: 'notário', emoji: '👨‍💼', mao: 'destro', altura: 'alto', mora: 'centro', oculos: true, fuma: true, work: 'cartorio' },
    { id: 6, name: 'Joaquim', full: 'Joaquim Bota', role: 'chefe da estação', emoji: '👨‍✈️', mao: 'canhoto', altura: 'baixo', mora: 'alto', oculos: false, fuma: false, work: 'estacao' },
    { id: 7, name: 'Mariana', full: 'Mariana Seixas', role: 'bibliotecária', emoji: '👩‍🏫', mao: 'destro', altura: 'alto', mora: 'centro', oculos: false, fuma: false, work: 'biblioteca' },
  ];
  const LOC = [
    { id: 0, b: 'solar', name: 'Solar do Comendador', bairro: 'alto', luz: true, mar: false, cave: true },
    { id: 1, b: 'igreja', name: 'Igreja', bairro: 'centro', luz: true, mar: false, cave: true },
    { id: 2, b: 'farol', name: 'Farol', bairro: 'porto', luz: true, mar: true, cave: false },
    { id: 3, b: 'biblioteca', name: 'Biblioteca', bairro: 'centro', luz: false, mar: false, cave: true },
    { id: 4, b: 'estacao', name: 'Estação', bairro: 'alto', luz: true, mar: false, cave: false },
    { id: 5, b: 'cemiterio', name: 'Cemitério', bairro: 'alto', luz: false, mar: false, cave: false },
    { id: 6, b: 'taberna', name: 'Taberna', bairro: 'porto', luz: true, mar: true, cave: true },
    { id: 7, b: 'armazem', name: 'Armazém', bairro: 'porto', luz: false, mar: true, cave: true },
    { id: 8, b: 'cafe', name: 'Café Central', bairro: 'centro', luz: true, mar: false, cave: false },
    { id: 9, b: 'adega', name: 'Adega', bairro: 'alto', luz: false, mar: false, cave: true },
  ];
  const OBJ = [
    { id: 0, name: 'Castiçal', art: 'o', emoji: '🕯️', material: 'metal', peso: 'pesado', vende: 'centro' },
    { id: 1, name: 'Corda', art: 'a', emoji: '🪢', material: 'fibra', peso: 'leve', vende: 'porto' },
    { id: 2, name: 'Veneno de rato', art: 'o', emoji: '🧪', material: 'químico', peso: 'leve', vende: 'centro' },
    { id: 3, name: 'Faca de peixe', art: 'a', emoji: '🔪', material: 'metal', peso: 'leve', vende: 'porto' },
    { id: 4, name: 'Bengala', art: 'a', emoji: '🦯', material: 'madeira', peso: 'pesado', vende: 'alto' },
    { id: 5, name: 'Garrafa', art: 'a', emoji: '🍾', material: 'vidro', peso: 'pesado', vende: 'alto' },
    { id: 6, name: 'Chave inglesa', art: 'a', emoji: '🔧', material: 'metal', peso: 'pesado', vende: 'porto' },
    { id: 7, name: 'Tesoura', art: 'a', emoji: '✂️', material: 'metal', peso: 'leve', vende: 'centro' },
  ];
  const HOR = ['20h', '21h', '22h', '23h', '0h', '1h'];
  const HATTR = [
    { comboio: 'antes', temporal: 'antes', sino: 'antes' }, { comboio: 'antes', temporal: 'antes', sino: 'antes' },
    { comboio: 'depois', temporal: 'antes', sino: 'antes' }, { comboio: 'depois', temporal: 'depois', sino: 'antes' },
    { comboio: 'depois', temporal: 'depois', sino: 'depois' }, { comboio: 'depois', temporal: 'depois', sino: 'depois' },
  ];
  const NS = 8, NL = 10, NO = 8, NH = 6, N = NS * NL * NO * NH;
  const CAT = { s: 'quem', l: 'onde', o: 'comque', h: 'quando' };
  const CATNAME = { quem: 'Quem', onde: 'Onde', comque: 'Com quê', quando: 'Quando' };
  const BAIRRO = { centro: 'Centro', porto: 'Porto de Pesca', alto: 'Alto' };

  const BLD = Object.fromEntries(L.buildings.map((b) => [b.id, b]));
  const FEM = new Set(['praca', 'igreja', 'farmacia', 'biblioteca', 'pensao', 'barbearia', 'taberna', 'lota', 'estacao', 'adega', 'padaria']);
  const placeName = (id) => (id.startsWith('h_') ? 'Casa' : BLD[id] ? BLD[id].name : id);
  const em = (id) => (id.startsWith('h_') ? 'em casa' : (FEM.has(id) ? 'na ' : 'no ') + placeName(id));

  /* =========================================================== ÁTOMOS E PISTAS */
  const ATOMS = [];
  [['mao', ['canhoto', 'destro']], ['altura', ['alto', 'baixo']], ['mora', ['centro', 'porto', 'alto']], ['oculos', [true, false]], ['fuma', [true, false]]].forEach(([k, vs]) => vs.forEach((v) => ATOMS.push({ c: 's', k, v })));
  [['bairro', ['centro', 'porto', 'alto']], ['luz', [true, false]], ['mar', [true, false]], ['cave', [true, false]]].forEach(([k, vs]) => vs.forEach((v) => ATOMS.push({ c: 'l', k, v })));
  [['material', ['metal', 'madeira', 'vidro', 'fibra', 'químico']], ['peso', ['pesado', 'leve']], ['vende', ['centro', 'porto', 'alto']]].forEach(([k, vs]) => vs.forEach((v) => ATOMS.push({ c: 'o', k, v })));
  [['comboio', ['depois']], ['temporal', ['depois']], ['sino', ['depois']]].forEach(([k, vs]) => vs.forEach((v) => ATOMS.push({ c: 'h', k, v })));

  const PRIOR = {};
  function prior(a) { const key = a.c + a.k + a.v; if (PRIOR[key] == null) { const n = a.c === 's' ? NS : a.c === 'l' ? NL : a.c === 'o' ? NO : NH; let t = 0; for (let i = 0; i < n; i++) if (attr(a.c, i, a.k) === a.v) t++; PRIOR[key] = t / n; } return a.n ? 1 - PRIOR[key] : PRIOR[key]; }
  /** Um átomo é indireto se for verdadeiro para 2+ itens e falso para 2+ itens da sua categoria. */
  function indirectAtom(a) { const n = a.c === 's' ? NS : a.c === 'l' ? NL : a.c === 'o' ? NO : NH; let t = 0; for (let i = 0; i < n; i++) if ((attr(a.c, i, a.k) === a.v) !== !!a.n) t++; return t >= 2 && n - t >= 2; }
  const okPrior = (...as) => as.every((a) => { const p = prior(a); return p >= 0.2 && p <= 0.8; });
  function attr(c, i, k) { return c === 's' ? SUS[i][k] : c === 'l' ? LOC[i][k] : c === 'o' ? OBJ[i][k] : HATTR[i][k]; }
  function atomTrue(a, s, l, o, h) { const i = a.c === 's' ? s : a.c === 'l' ? l : a.c === 'o' ? o : h; const r = attr(a.c, i, a.k) === a.v; return a.n ? !r : r; }

  const BIN = { mao: ['canhoto', 'destro'], altura: ['alto', 'baixo'], peso: ['pesado', 'leve'] };
  function phrase(a) {
    if (a.n && BIN[a.k]) a = { c: a.c, k: a.k, v: BIN[a.k][0] === a.v ? BIN[a.k][1] : BIN[a.k][0] };
    const n = !!a.n, v = a.v;
    switch (a.c + '.' + a.k) {
      case 's.mao': return `o culpado ${n ? 'não ' : ''}é ${v}`;
      case 's.altura': return `o culpado ${n ? 'não ' : ''}é ${v}`;
      case 's.mora': return `o culpado ${n ? 'não ' : ''}mora ${v === 'porto' ? 'no Porto de Pesca' : v === 'alto' ? 'no Alto' : 'no Centro'}`;
      case 's.oculos': return `o culpado ${(v ? !n : n) ? '' : 'não '}usa óculos`;
      case 's.fuma': return `o culpado ${(v ? !n : n) ? '' : 'não '}fuma`;
      case 'l.bairro': return `o crime ${n ? 'não ' : ''}foi ${v === 'porto' ? 'no Porto de Pesca' : v === 'alto' ? 'no Alto' : 'no Centro'}`;
      case 'l.luz': return `o local do crime ${(v ? !n : n) ? '' : 'não '}fica iluminado à noite`;
      case 'l.mar': return `o local do crime ${(v ? !n : n) ? '' : 'não '}tem vista para o mar`;
      case 'l.cave': return `o local do crime ${(v ? !n : n) ? '' : 'não '}tem cave`;
      case 'o.material': return `a arma ${n ? 'não ' : ''}é ${v === 'químico' ? 'um produto químico' : 'de ' + v}`;
      case 'o.peso': return `a arma ${n ? 'não ' : ''}é ${v === 'pesado' ? 'pesada' : 'leve'}`;
      case 'o.vende': return `a arma ${n ? 'não ' : ''}se vende ${v === 'porto' ? 'no Porto de Pesca' : v === 'alto' ? 'no Alto' : 'no Centro'}`;
      case 'h.comboio': return `o crime foi ${(v === 'depois') !== n ? 'depois' : 'antes'} do último comboio (21h30)`;
      case 'h.temporal': return (v === 'depois') !== n ? 'o crime foi durante o temporal (depois das 22h30)' : 'o crime foi antes do temporal (22h30)';
      case 'h.sino': return (v === 'depois') !== n ? 'o crime foi à meia-noite ou depois' : 'o crime foi antes da meia-noite';
    }
    return '?';
  }
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const LINKS = {
    oS: { cats: ['comque', 'quem'], f: (s, l, o) => OBJ[o].vende === SUS[s].mora, t: (n) => `A arma ${n ? 'não ' : ''}se vende no bairro onde mora o culpado.` },
    lS: { cats: ['onde', 'quem'], f: (s, l) => LOC[l].bairro === SUS[s].mora, t: (n) => `O crime ${n ? 'não ' : ''}foi no bairro onde mora o culpado.` },
    oL: { cats: ['comque', 'onde'], f: (s, l, o) => OBJ[o].vende === LOC[l].bairro, t: (n) => `A arma ${n ? 'não ' : ''}se vende no mesmo bairro onde foi o crime.` },
  };

  /** Avalia uma especificação de pista para a combinação (s, l, o, h). */
  function ev(p, s, l, o, h) {
    switch (p.k) {
      case 'atom': return atomTrue(p.a, s, l, o, h);
      case 'alibi': return !(s === p.s && h >= p.h1 && h <= p.h2 && LOC[l].b !== p.place);
      case 'imp': return !atomTrue(p.a, s, l, o, h) || atomTrue(p.b, s, l, o, h);
      case 'link': { const r = LINKS[p.t].f(s, l, o, h); return p.n ? !r : r; }
      case 'xor': return atomTrue(p.a, s, l, o, h) !== atomTrue(p.b, s, l, o, h);
      case 'or': return atomTrue(p.a, s, l, o, h) || atomTrue(p.b, s, l, o, h);
      case 'imp2': return !(atomTrue(p.a, s, l, o, h) && atomTrue(p.b, s, l, o, h)) || atomTrue(p.c, s, l, o, h);
      case 'count': return p.as.reduce((m, a) => m + (atomTrue(a, s, l, o, h) ? 1 : 0), 0) === p.n;
      case 'decl': return (s !== p.sp) === ev(p.p, s, l, o, h);
      case 'say': return ev(p.p, s, l, o, h);
      case 'is': { const i = p.c === 's' ? s : p.c === 'l' ? l : p.c === 'o' ? o : h; return (i === p.i) !== !!p.n; }
    }
    return true;
  }
  function textOf(p) {
    switch (p.k) {
      case 'atom': return cap(phrase(p.a)) + '.';
      case 'alibi': return `Álibi: ${SUS[p.s].full} esteve ${p.place.startsWith('h_') ? 'em casa' : em(p.place)} ${p.h1 === p.h2 ? 'às ' + HOR[p.h1] : 'das ' + HOR[p.h1] + ' às ' + HOR[p.h2]}, com testemunhas.`;
      case 'imp': return `Se ${phrase(p.a)}, então ${phrase(p.b)}.`;
      case 'link': return LINKS[p.t].t(p.n);
      case 'xor': return `Ou ${phrase(p.a)}, ou ${phrase(p.b)} — mas não as duas coisas.`;
      case 'or': return `Pelo menos uma destas é verdade: ${phrase(p.a)}; ${phrase(p.b)}.`;
      case 'imp2': return `Se ${phrase(p.a)} e ${phrase(p.b)}, então ${phrase(p.c)}.`;
      case 'count': return `Destas três, ${p.n === 1 ? 'só uma é verdade' : 'exatamente duas são verdade'}: ${p.as.map(phrase).join('; ')}.`;
      case 'decl': return `«${textOf(p.p).replace(/\.$/, '')}» — diz ${SUS[p.sp].full}.`;
      case 'say': return `«${textOf(p.p).replace(/\.$/, '')}» — conta ${SUS[p.sp].full}.`;
      case 'is': {
        const hr = (i) => (i === 4 ? 'à meia-noite' : i === 5 ? 'à 1h' : 'às ' + HOR[i]);
        if (p.n) { if (p.c === 's') return [`${SUS[p.i].full} está inocente.`, `${SUS[p.i].full} não é o culpado.`][p.i % 2]; if (p.c === 'l') return `O crime não foi ${em(LOC[p.i].b)}.`; if (p.c === 'o') return `A arma não foi ${OBJ[p.i].art} ${OBJ[p.i].name.toLowerCase()}.`; return `O crime não foi ${hr(p.i)}.`; }
        if (p.c === 's') return `O culpado é ${SUS[p.i].full}.`; if (p.c === 'l') return `O crime foi ${em(LOC[p.i].b)}.`; if (p.c === 'o') return `A arma foi ${OBJ[p.i].art} ${OBJ[p.i].name.toLowerCase()}.`; return `O crime foi ${hr(p.i)}.`;
      }
    }
    return '';
  }
  function catsOf(p) {
    switch (p.k) {
      case 'atom': return [CAT[p.a.c]];
      case 'alibi': return ['quem', 'quando'];
      case 'imp': case 'xor': case 'or': return [...new Set([CAT[p.a.c], CAT[p.b.c]])];
      case 'imp2': return [...new Set([CAT[p.a.c], CAT[p.b.c], CAT[p.c.c]])];
      case 'link': return LINKS[p.t].cats.slice();
      case 'count': return [...new Set(p.as.map((a) => CAT[a.c]))];
      case 'decl': return [...new Set(['quem', ...catsOf(p.p)])];
      case 'say': return catsOf(p.p);
      case 'is': return [CAT[p.c]];
    }
    return [];
  }
  const TYPE_NAME = { say: 'Declaração', atom: 'Característica', alibi: 'Álibi', imp: 'Condicional', imp2: 'Dupla condição', or: 'Ou', link: 'Ligação', xor: 'Ou-ou', count: 'Contagem', decl: 'Declaração', is: 'Certeza' };

  /* =========================================================== GERADOR DE CASOS */
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const idx = (s, l, o, h) => ((s * NL + l) * NO + o) * NH + h;
  function maskOf(p) { const m = new Uint8Array(N); let i = 0; for (let s = 0; s < NS; s++) for (let l = 0; l < NL; l++) for (let o = 0; o < NO; o++) for (let h = 0; h < NH; h++) m[i++] = ev(p, s, l, o, h) ? 1 : 0; return m; }
  function count1(m) { let c = 0; for (let i = 0; i < N; i++) c += m[i]; return c; }
  function andInto(a, b) { for (let i = 0; i < N; i++) a[i] &= b[i]; return a; }
  function solveFrom(specs) { const m = new Uint8Array(N).fill(1); specs.forEach((p) => andInto(m, maskOf(p))); return m; }
  function decode(i) { const h = i % NH; i = (i - h) / NH; const o = i % NO; i = (i - o) / NO; const l = i % NL; const s = (i - l) / NL; return { s, l, o, h }; }

  function timeline(R, sol, homes) {
    const SOC = ['taberna', 'cafe', 'pensao', 'adega', 'igreja', 'mercado', 'farol', 'cemiterio', 'biblioteca', 'estacao', 'barbearia', 'hotel'];
    return SUS.map((x) => {
      for (let tries = 0; tries < 50; tries++) {
        const seq = []; let h = 0;
        const pool = [x.work, SOC[Math.floor(R() * SOC.length)], SOC[Math.floor(R() * SOC.length)], homes[x.id]];
        let k = 0;
        while (h < NH) { const len = 1 + Math.floor(R() * 2.4); const pl = h >= 4 ? homes[x.id] : pool[Math.min(k++, pool.length - 1)]; for (let j = 0; j < len && h < NH; j++) seq[h++] = pl; }
        if (x.id === sol.s) seq[sol.h] = LOC[sol.l].b;
        else if (seq[sol.h] === LOC[sol.l].b) continue;
        return seq;
      }
      const seq = Array(NH).fill(homes[x.id]); if (x.id === sol.s) seq[sol.h] = LOC[sol.l].b; return seq;
    });
  }

  /** Gera um caso completo. opts.players = número de jogadores. Devolve {sol, specs[], decl[], tl}. */
  function generateCase(seed, nPlayers) {
    const np = Math.max(nPlayers, 3);
    for (let attempt = 0; attempt < 60; attempt++) {
      const R = rng(seed + attempt * 7919);
      const pick = (arr) => arr[Math.floor(R() * arr.length)];
      const sol = { s: Math.floor(R() * NS), l: Math.floor(R() * NL), o: Math.floor(R() * NO), h: Math.floor(R() * NH) };
      const houseIds = L.buildings.filter((b) => b.type === 'house');
      const homes = {}; const used = new Set();
      SUS.forEach((x) => { const hb = houseIds.find((b) => b.bairro === x.mora && !used.has(b.id)); used.add(hb.id); homes[x.id] = hb.id; });
      const tl = timeline(R, sol, homes);
      const truth = (p) => ev(p, sol.s, sol.l, sol.o, sol.h);
      const pool = []; const seen = new Set();
      const tryAdd = (p, w) => {
        if (!truth(p)) return false; const t = textOf(p); if (seen.has(t)) return false;
        const m = maskOf(p); const elim = 1 - count1(m) / N; if (elim < 0.04 || elim > 0.6) return false;
        seen.add(t); pool.push({ p, m, elim, w: w * (0.5 + R()) }); return true;
      };
      // 1) exclusões diretas: «Não foi X»
      ['s', 'l', 'o', 'h'].forEach((c) => { const n = c === 's' ? NS : c === 'l' ? NL : c === 'o' ? NO : NH; for (let i = 0; i < n; i++) if (i !== sol[c]) tryAdd({ k: 'is', c, i, n: true }, 1.0); });
      // 2) características simples
      ATOMS.forEach((a0) => [false, true].forEach((neg) => { const a = Object.assign({}, a0, { n: neg }); if (indirectAtom(a)) tryAdd({ k: 'atom', a }, 1.2); }));
      // 3) álibis (2+ horas)
      for (let s2 = 0; s2 < NS; s2++) { const seq = tl[s2]; for (let h1 = 0; h1 < NH; h1++) { let h2 = h1; while (h2 + 1 < NH && seq[h2 + 1] === seq[h1]) h2++; if (h2 > h1 && (h1 === 0 || seq[h1 - 1] !== seq[h1])) tryAdd({ k: 'alibi', s: s2, place: seq[h1], h1, h2 }, 0.8); } }
      // 4) algumas condições simples, para quem gosta de deduzir
      for (let k = 0; k < 200; k++) { const a = Object.assign({}, pick(ATOMS)), b = Object.assign({}, pick(ATOMS)); if (a.c === b.c || !okPrior(a, b)) continue; if (R() < 0.5) a.n = true; if (!atomTrue(b, sol.s, sol.l, sol.o, sol.h)) b.n = true; tryAdd({ k: 'imp', a, b }, 0.35); }
      Object.keys(LINKS).forEach((t) => { const p = { k: 'link', t, n: false }; if (!truth(p)) p.n = true; tryAdd(p, 0.4); });
      // ordenar por peso aleatório
      pool.sort((x, y) => y.w - x.w);
      // declarações: 1 por suspeito, sempre verdadeiras
      const decl = [];
      for (let s2 = 0; s2 < NS; s2++) { const c = pool.find((x) => !x.used && (x.p.k === 'atom' || x.p.k === 'is') && !(x.p.k === 'is' && x.p.c === 's' && x.p.i === s2)); if (!c) break; c.used = true; decl.push({ p: { k: 'say', sp: s2, p: c.p }, m: c.m }); }
      if (decl.length < NS) continue;
      const rest = pool.filter((x) => !x.used);
      // escolher até haver solução única
      const alive = new Uint8Array(N).fill(1); decl.forEach((d) => andInto(alive, d.m));
      const chosen = [];
      for (const c of rest) { if (count1(alive) === 1) break; let gain = 0; for (let i = 0; i < N; i++) if (alive[i] && !c.m[i]) gain++; if (gain === 0) continue; andInto(alive, c.m); chosen.push(c); }
      if (count1(alive) !== 1) continue;
      const target = 3 * np + 1 + 4 + 12 + 14;
      for (const c of rest) { if (chosen.length >= target) break; if (!chosen.includes(c)) chosen.push(c); }
      for (let i = chosen.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [chosen[i], chosen[j]] = [chosen[j], chosen[i]]; }
      // dificuldade: com a melhor escolha possível, quantas pistas são precisas?
      const all = chosen.concat(decl); const g = new Uint8Array(N).fill(1); const left = all.slice(); let steps = 0;
      while (count1(g) > 1 && left.length) { let best = -1, bg = -1; left.forEach((c, k) => { let gn = 0; for (let i = 0; i < N; i++) if (g[i] && !c.m[i]) gn++; if (gn > bg) { bg = gn; best = k; } }); andInto(g, left[best].m); left.splice(best, 1); steps++; }
      if (steps < 8) continue;
      // os testemunhos iniciais sozinhos não podem resolver
      const t0 = new Uint8Array(N).fill(1); chosen.slice(0, 3 * np).forEach((c) => andInto(t0, c.m)); if (count1(t0) < 12) continue;
      return { sol, specs: chosen.map((c) => c.p), decl: decl.map((d) => d.p), tl, homes, steps, seed: seed + attempt * 7919 };
    }
    throw new Error('Não consegui gerar um caso');
  }

  /* =========================================================== MAPA: distâncias e caminhos */
  const ADJ = L.nodes.map(() => []); L.edges.forEach(([a, b]) => { ADJ[a].push(b); ADJ[b].push(a); });
  const doorsOf = (bid) => (BLD[bid].doors || [BLD[bid].door]);
  function bfs(starts) { const dist = new Array(L.nodes.length).fill(Infinity), prev = new Array(L.nodes.length).fill(-1); const q = []; starts.forEach((s) => { dist[s] = 0; q.push(s); }); while (q.length) { const u = q.shift(); ADJ[u].forEach((v) => { if (dist[v] === Infinity) { dist[v] = dist[u] + 1; prev[v] = u; q.push(v); } }); } return { dist, prev }; }
  function startNodes(pos) { return pos.b ? doorsOf(pos.b) : [pos.n]; }
  /** Destinos possíveis com um lançamento: chaves 'n<id>' ou 'b:<id>'. */
  function reach(pos, roll) {
    const exit = pos.b ? 1 : 0; const { dist } = bfs(startNodes(pos)); const out = [];
    L.nodes.forEach((n) => { const d = dist[n.id] + exit; if (d >= 1 && d <= roll) out.push('n' + n.id); });
    L.buildings.forEach((b) => { if (pos.b === b.id) return; const d = Math.min(...doorsOf(b.id).map((x) => dist[x])) + exit + 1; if (d <= roll) out.push('b:' + b.id); });
    return out;
  }
  function pathTo(pos, key) {
    const { dist, prev } = bfs(startNodes(pos)); let end;
    if (key.startsWith('b:')) { const ds = doorsOf(key.slice(2)); end = ds.reduce((m, x) => (dist[x] < dist[m] ? x : m), ds[0]); } else end = +key.slice(1);
    const path = []; for (let u = end; u !== -1; u = prev[u]) path.unshift(u); return path;
  }
  function distTo(pos, bid) { const { dist } = bfs(startNodes(pos)); return Math.min(...doorsOf(bid).map((x) => dist[x])); }

  /* =========================================================== PAPÉIS */
  const POWERS = {
    padre: { nome: 'Confissão', regra: '1 vez por partida, num interrogatório, o outro jogador tem de te mostrar 2 cartas em vez de 1.' },
    carteiro: { nome: 'Correio Expresso', regra: 'Interrogas jogadores em qualquer lado da vila, sem pagar os Correios.' },
    jornalista: { nome: 'Fonte na Redação', regra: 'Vês a notícia do Jornal da Vila uma ronda antes de toda a gente.' },
    taberneiro: { nome: 'Ouvido de Balcão', regra: 'Ao investigar, vês 2 rumores e ficas com o que quiseres.' },
    guarda: { nome: 'Amigos na GNR', regra: 'Os Mandados custam-te metade (50 escudos).' },
    comerciante: { nome: 'Olho para o Negócio', regra: 'Compras negócios com 20% de desconto.' },
    medica: { nome: 'Autópsia', regra: 'Começas a partida com 1 pista extra sobre a hora do crime.' },
    advogado: { nome: 'O Testamento', regra: '1 vez por partida, escolhes uma categoria da tua teoria e ficas a saber se está certa.' },
  };
  const START_BIZ = ['farmacia', 'correios', 'barbearia', 'pensao', 'mercado', 'estaleiro', 'padaria', 'hotel'];
  const POWER_BIZ = { carteiro: 'correios', medica: 'farmacia', comerciante: 'mercado', taberneiro: 'pensao', padre: 'barbearia', guarda: 'hotel', jornalista: 'padaria', advogado: 'estaleiro' };
  const COLORS = ['#e63946', '#2a9d8f', '#e9c46a', '#457b9d', '#9b5de5', '#f4a261'];
  const HATS = ['🎣', '⛪', '📮', '🍷', '💊', '📰', '⚖️', '🛒', '👮', '🎩'];

  function genCharacterLocal(name, desc, avoid = []) {
    const ids = Object.keys(POWERS).filter((k) => !avoid.includes(k)); const d = (desc || '').toLowerCase();
    const hint = [['padre', /igreja|calm|conselh|ouv/], ['carteiro', /corre|cusc|fala|social|telem/], ['jornalista', /notíc|escrev|curios|instagram|redes/], ['taberneiro', /cervej|vinho|festa|bar|noite/], ['guarda', /polícia|regra|séri|desport|forte/], ['comerciante', /negóc|dinheiro|banco|vend|poup/], ['medica', /médic|saúde|enferm|ciênc|engenh/], ['advogado', /direito|discut|argument|lógic/]];
    let id = (hint.find(([k, re]) => ids.includes(k) && re.test(d)) || [])[0] || ids[Math.floor(Math.random() * ids.length)] || 'padre';
    const roles = { padre: 'Padre da Paróquia', carteiro: 'Carteiro Cusco', jornalista: 'Jornalista do Jornal da Vila', taberneiro: 'Dono da Pensão', guarda: 'Guarda da GNR', comerciante: 'Comerciante do Mercado', medica: 'Médica de Família', advogado: 'Advogado da Praça' };
    const emo = { padre: '⛪', carteiro: '📮', jornalista: '📰', taberneiro: '🍷', guarda: '👮', comerciante: '🛒', medica: '💊', advogado: '⚖️' };
    return { role: roles[id], title: `${name}, ${roles[id].toLowerCase()}`, nick: '', emoji: emo[id], motto: 'Em São Segredo, nada é o que parece.', bio: `${name} chegou a São Segredo para começar de novo.`, power: { id, name: POWERS[id].nome, flavor: '' } };
  }
  function normalizeCharacter(c, name, avoid = []) {
    const pid = c && c.power && POWERS[c.power.id] && !avoid.includes(c.power.id) ? c.power.id : genCharacterLocal(name, '', avoid).power.id;
    const s = (x, n) => String(x || '').slice(0, n);
    return { role: s(c && c.role, 32) || 'Habitante', title: s(c && c.title, 48) || name, nick: s(c && c.nick, 28), emoji: s(c && c.emoji, 4) || '🙂', motto: s(c && c.motto, 80), bio: s(c && c.bio, 220), power: { id: pid, name: s(c && c.power && c.power.name, 28) || POWERS[pid].nome, flavor: s(c && c.power && c.power.flavor, 120) } };
  }

  /* =========================================================== CARTAS MISTÉRIO E DESAFIO */
  const MYSTERY = [
    { id: 'tesouro', good: true, t: 'Moedas debaixo do soalho', d: 'Encontras 60 escudos esquecidos.' },
    { id: 'pista', good: true, t: 'Uma carta perdida', d: 'Ganhas uma pista nova (passa a ser carta tua).' },
    { id: 'atalho', good: true, t: 'Atalho secreto', d: 'Podes lançar o dado e mover-te outra vez.' },
    { id: 'correio', good: true, t: 'Telefone do vizinho', d: 'Neste turno interrogas à distância sem pagar.' },
    { id: 'heranca', good: true, t: 'Herança de uma tia', d: 'Cada jogador paga-te 10 escudos.' },
    { id: 'imunidade', good: true, t: 'Amigo na GNR', d: 'Ficas protegido do próximo Mandado.' },
    { id: 'multa', good: false, t: 'Multa da Câmara', d: 'Pagas 50 escudos.' },
    { id: 'entorse', good: false, t: 'Torceste o pé', d: 'Perdes o próximo movimento.' },
    { id: 'boato', good: false, t: 'A vila fala de ti', d: 'Uma carta tua, à sorte, fica a ser conhecida por todos.' },
    { id: 'roubo', good: false, t: 'Rodada para todos', d: 'Pagas 15 escudos a cada jogador.' },
    { id: 'gnr', good: false, t: 'Confusão na rua', d: 'A GNR leva-te para o Posto.' },
    { id: 'tempestade', good: false, t: 'Aguaceiro repentino', d: 'Perdes a ação principal deste turno.' },
  ];
  const DUEL_GAMES = { ppt: 'Pedra, papel ou tesoura', parimpar: 'Par ou ímpar', dados: 'Dois dados: ganha o maior' };
  const GROUP_GAMES = { votacao: 'Votação do grupo', trivia: 'Pergunta de cultura geral' };
  const REWARDS = { carta: 'Ver uma carta dele, de graça', negocio: 'Ficar com um negócio dele', dinheiro: 'Receber dinheiro', pista: 'Uma pista nova' };
  const VOTES = [
    'Quem é o mais provável de chegar atrasado a um jantar?', 'Quem é o mais bêbado do grupo?', 'Quem adormece primeiro no sofá?', 'Quem gastaria tudo num casino?',
    'Quem sobreviveria mais tempo numa ilha deserta?', 'Quem é o pior a guardar segredos?', 'Quem canta mais alto no carro?', 'Quem demora mais a responder a mensagens?',
    'Quem seria o primeiro suspeito num crime a sério?', 'Quem tem o pior sentido de orientação?', 'Quem come mais num jantar de grupo?', 'Quem é o mais competitivo nos jogos?',
    'Quem se perderia numa vila como São Segredo?', 'Quem mentiria melhor num interrogatório?', 'Quem conta as piores piadas?', 'Quem é mais provável de ficar famoso?',
    'Quem perde mais vezes as chaves?', 'Quem é o mais dramático?', 'Quem passava a noite a dançar?', 'Quem seria o melhor detetive?',
  ];
  const TRIVIA = [
    ['Qual é o rio que passa no Porto?', ['Douro', 'Tejo', 'Mondego', 'Minho'], 0], ['Em que ano foi o 25 de Abril?', ['1974', '1975', '1968', '1980'], 0],
    ['Qual é a capital dos Açores?', ['Ponta Delgada', 'Angra do Heroísmo', 'Horta', 'Funchal'], 0], ['Quantos jogadores tem uma equipa de futebol em campo?', ['11', '10', '12', '9'], 0],
    ['Qual é o ponto mais alto de Portugal?', ['Montanha do Pico', 'Serra da Estrela', 'Gerês', 'Marão'], 0], ['Quem escreveu «Os Lusíadas»?', ['Luís de Camões', 'Fernando Pessoa', 'Eça de Queirós', 'Saramago'], 0],
    ['Qual destes doces é típico de Aveiro?', ['Ovos moles', 'Pastel de Belém', 'Queijada', 'Bola de Berlim'], 0], ['Qual é o maior planeta do Sistema Solar?', ['Júpiter', 'Saturno', 'Terra', 'Neptuno'], 0],
    ['Quantos lados tem um hexágono?', ['6', '5', '7', '8'], 0], ['Qual é o símbolo químico do ouro?', ['Au', 'Ag', 'Go', 'Or'], 0],
    ['Em que cidade fica a Torre de Belém?', ['Lisboa', 'Porto', 'Coimbra', 'Faro'], 0], ['Qual é o oceano mais profundo?', ['Pacífico', 'Atlântico', 'Índico', 'Ártico'], 0],
    ['Quantos minutos tem um dia?', ['1440', '1200', '1600', '1000'], 0], ['Qual é a moeda do Reino Unido?', ['Libra', 'Euro', 'Franco', 'Dólar'], 0],
    ['Qual destes é um mamífero?', ['Golfinho', 'Tubarão', 'Atum', 'Polvo'], 0], ['Quem pintou a Mona Lisa?', ['Leonardo da Vinci', 'Picasso', 'Van Gogh', 'Miguel Ângelo'], 0],
    ['Qual é o país com mais habitantes do mundo?', ['Índia', 'China', 'EUA', 'Brasil'], 0], ['Em que continente fica o Egito?', ['África', 'Ásia', 'Europa', 'Oceânia'], 0],
    ['Qual é a velocidade da luz, aproximadamente?', ['300 000 km/s', '30 000 km/s', '3 000 km/s', '3 milhões km/s'], 0], ['Quantos ossos tem o corpo humano adulto?', ['206', '180', '250', '300'], 0],
    ['Qual destes é o fado mais famoso de Amália?', ['Estranha Forma de Vida', 'Grândola', 'Canção do Mar', 'Lisboa Menina e Moça'], 0], ['Que gás as plantas libertam na fotossíntese?', ['Oxigénio', 'Hidrogénio', 'Azoto', 'Hélio'], 0],
    ['Qual é a cidade conhecida como «Cidade dos Estudantes»?', ['Coimbra', 'Braga', 'Évora', 'Viseu'], 0], ['Quantas casas tem um tabuleiro de xadrez?', ['64', '81', '49', '100'], 0],
    ['Qual destes navegadores chegou à Índia por mar em 1498?', ['Vasco da Gama', 'Pedro Álvares Cabral', 'Fernão de Magalhães', 'Bartolomeu Dias'], 0], ['Qual é o metal mais condutor de eletricidade?', ['Prata', 'Cobre', 'Ouro', 'Alumínio'], 0],
    ['Qual é a língua mais falada do mundo como língua materna?', ['Mandarim', 'Inglês', 'Espanhol', 'Hindi'], 0], ['Em que ano Portugal ganhou o Euro de futebol?', ['2016', '2004', '2012', '2020'], 0],
    ['Qual é o animal terrestre mais rápido?', ['Chita', 'Leão', 'Cavalo', 'Gazela'], 0], ['Qual é a capital da Austrália?', ['Camberra', 'Sydney', 'Melbourne', 'Perth'], 0],
  ];

  /* =========================================================== ESTADO */
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const PACE = { calmo: 1.35, normal: 1 };

  function createGame(opts) {
    const seed = opts.seed || Math.floor(Math.random() * 1e9);
    const np = opts.players.length; const C = generateCase(seed, np);
    const R = rng(C.seed + 1);
    const clues = {}; let cid = 0;
    const mk = (p, src) => { const id = 'c' + cid++; clues[id] = { id, p, t: p.k, txt: textOf(p), cats: catsOf(p), src }; return id; };
    const specs = C.specs.slice();
    // casas dos jogadores
    const houseFree = L.buildings.filter((b) => b.type === 'house' && !Object.values(C.homes).includes(b.id)).map((b) => b.id);
    const players = opts.players.map((pl, i) => ({
      name: pl.name, color: pl.color || COLORS[i], character: pl.character, uid: pl.uid || null,
      home: houseFree[i % houseFree.length], pos: { b: houseFree[i % houseFree.length] }, money: 200, biz: [], cards: [], known: [], marks: {}, notes: '',
      passedStart: false, suspRound: -1, powerUsed: false, out: false, skipMove: false, confessUsed: false,
    }));
    // negócios iniciais
    const takenBiz = new Set();
    players.forEach((p) => { let b = POWER_BIZ[p.character.power.id]; if (!b || takenBiz.has(b)) b = START_BIZ.find((x) => !takenBiz.has(x)); takenBiz.add(b); p.biz.push(b); });
    // testemunhos
    players.forEach((p) => { for (let k = 0; k < 3; k++) { const id = mk(specs.shift(), 'Testemunho'); p.cards.push(id); p.known.push(id); } });
    // médica: pista extra de hora
    players.forEach((p) => { if (p.character.power.id === 'medica') { const j = specs.findIndex((s) => catsOf(s).includes('quando')); if (j >= 0) { const id = mk(specs.splice(j, 1)[0], 'Autópsia'); p.known.push(id); } } });
    const arquivo = []; for (let k = 0; k < 4 && specs.length; k++) arquivo.push(mk(specs.shift(), 'Arquivo da Biblioteca'));
    const jornal = []; for (let k = 0; k < 12 && specs.length; k++) jornal.push(mk(specs.shift(), 'Jornal da Vila'));
    const bld = {};
    L.buildings.forEach((b) => { bld[b.id] = { owner: null, up: false, closed: -1, rumors: [] }; });
    players.forEach((p, i) => p.biz.forEach((b) => (bld[b].owner = i)));
    const rumorB = L.buildings.filter((b) => b.type === 'public' || b.type === 'biz').map((b) => b.id);
    const crimeB = new Set(LOC.map((x) => x.b));
    for (let i = rumorB.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [rumorB[i], rumorB[j]] = [rumorB[j], rumorB[i]]; }
    rumorB.sort((a, b) => (crimeB.has(b) ? 1 : 0) - (crimeB.has(a) ? 1 : 0));
    for (const b of rumorB) { if (!specs.length) break; bld[b].rumors.push(mk(specs.shift(), 'Rumor — ' + BLD[b].name)); }
    specs.forEach((s) => jornal.push(mk(s, 'Jornal da Vila')));
    const decl = {}; C.decl.forEach((p) => { (decl[p.sp] = decl[p.sp] || []).push(mk(p, 'Conversa com ' + SUS[p.sp].full)); });
    const S = {
      g: 3, v: 1, code: opts.code || 'TEST', created: Date.now(), seed: C.seed, steps: C.steps,
      pace: opts.pace || 'calmo', lastNight: opts.lastNight ? 14 : 0,
      phase: 'play', round: 1, turn: 0, players, sol: C.sol, homes: C.homes, clues, bld, decl, arquivo, jornal, jornalPos: 0, jornalBuyer: null,
      ts: null, pending: null, log: [], fx: [], fxN: 0, events: { storm: -1, fair: -1 }, winner: null, seqs: {},
      cards: {}, gate: null, chal: null, rng: C.seed % 100000,
    };
    placeCards(S);
    startTurn(S);
    pushFx(S, { kind: 'round', title: 'Ronda 1', sub: 'O cofre espera na praça. Quem descobrir a verdade, fica com a fortuna.' });
    return S;
  }

  /* =========================================================== AUXILIARES DE REGRAS */
  const cur = (S) => S.players[S.turn];
  function log(S, txt, kind) { S.log.push({ r: S.round, txt, kind: kind || 'info' }); if (S.log.length > 80) S.log = S.log.slice(-80); if (S.turnLog && kind !== 'turn') S.turnLog.push(txt); }
  function pushFx(S, f) { S.fxN++; S.fx.push(Object.assign({ id: S.fxN }, f)); if (S.fx.length > 30) S.fx = S.fx.slice(-30); }
  function locKey(pos) { return pos.b ? 'b:' + pos.b : 'n' + pos.n; }
  function sameSpot(a, b) { return locKey(a.pos) === locKey(b.pos); }
  const inB = (p) => p.pos.b || null;
  function payTo(S, from, amount, toIdx) { const p = S.players[from]; const a = Math.min(p.money, amount); p.money -= a; if (toIdx != null && toIdx >= 0 && toIdx !== from) S.players[toIdx].money += a; return a; }
  function discover(S, i, id) { const p = S.players[i]; if (!p.known.includes(id)) p.known.push(id); }
  /** Pista encontrada passa a ser carta do jogador (pode ser-lhe pedida em interrogatórios e suspeitas). */
  function gain(S, i, id) { discover(S, i, id); const p = S.players[i]; if (!p.cards.includes(id)) p.cards.push(id); }
  function servicePrice(S, base) { return S.events.fair === S.round ? Math.ceil(base / 2) : base; }
  function startTurn(S) {
    const p = cur(S); S.ts = { rolled: false, roll: 0, moved: false, acted: false, reach: null }; S.turnLog = [];
    if (p.skipMove) { S.ts.moved = true; p.skipMove = false; log(S, `${p.name} está retido no Posto da GNR e não se move nesta vez.`, 'block'); }
  }
  function alive(S) { return S.players.map((p, i) => i).filter((i) => !S.players[i].out); }
  function nextTurn(S) {
    if (S.phase === 'end') return;
    const n = S.players.length; let t = S.turn, wrapped = false;
    for (let k = 0; k < n; k++) { t = (t + 1) % n; if (t === 0) wrapped = true; if (!S.players[t].out) break; }
    S.turn = t; if (wrapped) endRound(S);
    if (S.phase !== 'end') startTurn(S);
  }
  function endRound(S) {
    S.round++;
    S.players.forEach((p) => { if (!p.out) p.money += 30; });
    // Jornal da Vila
    let id = null;
    if (S.lastNight && S.round > S.lastNight) {
      const cands = [];
      ['s', 'l', 'o', 'h'].forEach((c) => { const n = c === 's' ? NS : c === 'l' ? NL : c === 'o' ? NO : NH; for (let i = 0; i < n; i++) if (i !== S.sol[c]) cands.push({ k: 'is', c, i, n: true }); });
      const pub = Object.values(S.clues).filter((c) => c.p.k === 'is').map((c) => c.txt);
      const p = cands.find((x) => !pub.includes(textOf(x)));
      if (p) { id = 'c' + Object.keys(S.clues).length; S.clues[id] = { id, p, t: 'is', txt: textOf(p), cats: catsOf(p), src: 'Jornal — A Última Noite' }; }
    } else if (S.jornalPos < S.jornal.length) id = S.jornal[S.jornalPos++];
    if (id) {
      if (S.jornalBuyer != null) { gain(S, S.jornalBuyer, id); const b = S.players[S.jornalBuyer]; pushFx(S, { kind: 'jornal', title: 'Jornal da Vila', sub: `${b.name} comprou a edição: a notícia saiu só para ele.`, actor: S.jornalBuyer }); log(S, `O Jornal saiu só para ${b.name}.`, 'jornal'); }
      else {
        S.players.forEach((p, i) => discover(S, i, id)); S.clues[id].pub = true;
        const need = S.players.map((p, i) => i).filter((i) => S.players[i].uid && !S.players[i].out);
        if (need.length) S.gate = { kind: 'jornal', id, need, ack: [] };
        pushFx(S, { kind: 'jornal', title: 'Jornal da Vila', sub: S.clues[id].txt, pub: id, ed: S.round }); log(S, `📰 Jornal: ${S.clues[id].txt}`, 'jornal');
      }
      S.jornalBuyer = null;
      const jn = S.players.findIndex((p) => !p.out && p.character.power.id === 'jornalista'); const nx = S.jornal[S.jornalPos]; if (jn >= 0 && nx) discover(S, jn, nx);
    }
    // eventos
    if (S.round % 4 === 0) {
      if ((S.round / 4) % 2 === 1) { S.events.storm = S.round; pushFx(S, { kind: 'round', title: 'Temporal no Porto', sub: 'Nesta ronda ninguém consegue investigar no Porto de Pesca.' }); log(S, '🌧️ Temporal: não se investiga no Porto nesta ronda.', 'event'); }
      else { S.events.fair = S.round; pushFx(S, { kind: 'round', title: 'Dia de Feira', sub: 'Nesta ronda, os serviços custam metade.' }); log(S, '🎪 Feira: serviços a metade do preço nesta ronda.', 'event'); }
    }
    placeCards(S);
    pushFx(S, { kind: 'round', title: 'Ronda ' + S.round, sub: ['Manhã', 'Tarde', 'Noite'][(S.round - 1) % 3] + ' em São Segredo. Cada um recebe 30 escudos. Há novas cartas escondidas na vila.' });
  }

  function rnd(S) { S.rng = (S.rng * 9301 + 49297) % 233280; return S.rng / 233280; }
  function placeCards(S) {
    const bs = L.buildings.filter((b) => b.id !== 'praca').map((b) => b.id);
    for (let i = bs.length - 1; i > 0; i--) { const j = Math.floor(rnd(S) * (i + 1)); [bs[i], bs[j]] = [bs[j], bs[i]]; }
    S.cards = {}; bs.slice(0, 6).forEach((b) => (S.cards[b] = 'm')); bs.slice(6, 9).forEach((b) => (S.cards[b] = 'd'));
  }
  function freeClue(S, i) {
    if (S.arquivo.length) { const id = S.arquivo.shift(); gain(S, i, id); return true; }
    const b = Object.keys(S.bld).find((k) => S.bld[k].rumors.length); if (b) { gain(S, i, S.bld[b].rumors.shift()); return true; }
    if (S.jornalPos < S.jornal.length) { const id = S.jornal.splice(S.jornal.length - 1, 1)[0]; gain(S, i, id); return true; }
    return false;
  }
  function drawCard(S, i, b) {
    const kind = S.cards[b]; if (!kind) return; delete S.cards[b]; const p = S.players[i];
    if (kind === 'd') return startChallenge(S, i, b);
    const m = MYSTERY[Math.floor(rnd(S) * MYSTERY.length)]; let extra = '';
    switch (m.id) {
      case 'tesouro': p.money += 60; break;
      case 'pista': if (!freeClue(S, i)) { p.money += 40; extra = ' Não havia pistas: recebes 40 escudos.'; } break;
      case 'atalho': S.ts.rolled = false; S.ts.moved = false; S.ts.reach = null; break;
      case 'correio': S.ts.freeRemote = true; break;
      case 'heranca': S.players.forEach((q, j) => { if (j !== i && !q.out) payTo(S, j, 10, i); }); break;
      case 'imunidade': p.immune = true; break;
      case 'multa': payTo(S, i, 50, null); break;
      case 'entorse': p.skipMove = true; break;
      case 'boato': { const c = p.cards[Math.floor(rnd(S) * p.cards.length)]; if (c) { S.players.forEach((q, j) => discover(S, j, c)); S.clues[c].pub = true; extra = ' A pista: «' + S.clues[c].txt + '»'; } break; }
      case 'roubo': S.players.forEach((q, j) => { if (j !== i && !q.out) payTo(S, i, 15, j); }); break;
      case 'gnr': p.pos = { b: 'gnr' }; break;
      case 'tempestade': S.ts.acted = true; break;
    }
    pushFx(S, { kind: 'mystery', actor: i, bld: b, good: m.good, card: m.id, title: m.t, sub: m.d + extra });
    log(S, `${m.good ? '🍀' : '💀'} ${p.name} encontrou uma carta mistério: ${m.t}.`, m.good ? 'money' : 'block');
  }
  function alivePlayers(S, except) { return S.players.map((q, j) => j).filter((j) => j !== except && !S.players[j].out); }
  function startChallenge(S, i, b) {
    const others = alivePlayers(S, i); const p = S.players[i];
    if (!others.length) { p.money += 40; pushFx(S, { kind: 'mystery', actor: i, bld: b, good: true, title: 'Desafio sem adversários', sub: 'Não há ninguém para desafiar: recebes 40 escudos.' }); return; }
    const mode = rnd(S) < 0.6 ? 'duel' : 'group';
    S.chal = { mode, by: i, bld: b, step: 'setup', game: null, opp: null, target: null, reward: null, q: null, moves: {}, round: 1 };
    pushFx(S, { kind: 'challenge', actor: i, bld: b, title: mode === 'duel' ? 'Carta Desafio: frente a frente!' : 'Carta Desafio: contra a vila!', sub: mode === 'duel' ? `${p.name} escolhe um adversário e o prémio.` : `${p.name} contra todos. Escolhe o prémio.` });
    log(S, `⚔️ ${p.name} encontrou uma carta desafio.`, 'action');
  }
  function chalNeeds(S) {
    const X = S.chal; if (!X) return [];
    if (X.step === 'setup' || X.step === 'tiebreak') return [X.by];
    if (X.mode === 'duel') return [X.by, X.opp].filter((j) => X.moves[j] == null);
    if (X.game === 'trivia') return X.moves[X.by] == null ? [X.by] : [];
    return alivePlayers(S, -1).filter((j) => X.moves[j] == null);
  }
  function endTurn(S, i) {
    const A = S.players[i].name; const lines = (S.turnLog || []).slice(-6); log(S, `${A} terminou a vez.`, 'turn');
    const n0 = S.fxN; nextTurn(S); const nx = S.players[S.turn];
    const sum = { id: n0 + 1, kind: 'summary', actor: i, title: `Fim da vez de ${A}`, lines: lines.length ? lines : [`${A} não fez nada de especial.`], next: nx ? nx.name : '' };
    S.fx.forEach((f) => { if (f.id > n0) f.id++; }); S.fxN++;
    const at = S.fx.findIndex((f) => f.id > n0 + 1); if (at < 0) S.fx.push(sum); else S.fx.splice(at, 0, sum);
    if (S.fx.length > 30) S.fx = S.fx.slice(-30);
  }
  function applyReward(S) {
    const X = S.chal, p = S.players[X.by]; const who = X.mode === 'duel' ? X.opp : X.target; const q = who != null ? S.players[who] : null;
    switch (X.reward) {
      case 'carta': { const pool = q.cards.filter((c) => !p.known.includes(c)); const c = (pool.length ? pool : q.cards)[Math.floor(rnd(S) * (pool.length || q.cards.length))]; if (c) discover(S, X.by, c); return `${p.name} viu uma carta de ${q.name}.`; }
      case 'negocio': { const b = q.biz.slice().sort((a, b2) => (BLD[a].price || 0) - (BLD[b2].price || 0))[0]; if (!b || p.biz.length >= 4) { p.money += 60; return `${p.name} recebeu 60 escudos (não havia negócio para ficar).`; } q.biz = q.biz.filter((x) => x !== b); p.biz.push(b); S.bld[b].owner = X.by; return `${p.name} ficou com ${BLD[b].name}, que era de ${q.name}.`; }
      case 'dinheiro': { if (X.mode === 'duel') { const r = payTo(S, X.opp, 60, X.by); return `${q.name} pagou ${r} escudos a ${p.name}.`; } let t = 0; alivePlayers(S, X.by).forEach((j) => { t += payTo(S, j, 20, X.by); }); return `Cada um pagou 20 escudos a ${p.name} (${t} no total).`; }
      case 'pista': return freeClue(S, X.by) ? `${p.name} ganhou uma pista nova.` : (p.money += 40, `${p.name} recebeu 40 escudos.`);
    }
    return '';
  }
  function resolveChallenge(S) {
    const X = S.chal, p = S.players[X.by]; const m = X.moves; let win = null, detail = '';
    const ICON = { pedra: '🪨', papel: '📄', tesoura: '✂️' };
    if (X.step === 'tiebreak') { const r = m.tb; win = r[0] + r[1] >= 8; detail = `Desempate: ${p.name} lançou ${r[0]} + ${r[1]} = ${r[0] + r[1]} (precisava de 8).`; }
    else if (X.game === 'ppt') { const a = m[X.by], b = m[X.opp]; detail = `${ICON[a]} ${a} contra ${ICON[b]} ${b}`; if (a === b) { X.moves = {}; X.round++; pushFx(S, { kind: 'chaltie', actor: X.by, target: X.opp, title: 'Empate!', sub: detail + '. Joguem outra vez.' }); return; } win = (a === 'pedra' && b === 'tesoura') || (a === 'papel' && b === 'pedra') || (a === 'tesoura' && b === 'papel'); }
    else if (X.game === 'parimpar') { const a = m[X.by], b = m[X.opp]; const sum = a.n + b.n; win = (sum % 2 === 0) === (a.pick === 'par'); detail = `${p.name} escolheu ${a.pick}: ${a.n} + ${b.n} = ${sum} (${sum % 2 === 0 ? 'par' : 'ímpar'})`; }
    else if (X.game === 'dados') { const a = m[X.by], b = m[X.opp]; const sa = a[0] + a[1], sb = b[0] + b[1]; detail = `${p.name}: ${a[0]}+${a[1]}=${sa} · ${S.players[X.opp].name}: ${b[0]}+${b[1]}=${sb}`; if (sa === sb) { X.moves = {}; X.round++; pushFx(S, { kind: 'chaltie', actor: X.by, target: X.opp, title: 'Empate!', sub: detail + '. Lancem outra vez.' }); return; } win = sa > sb; }
    else if (X.game === 'trivia') { win = m[X.by] === X.q.a; detail = `Resposta certa: ${X.q.o[X.q.a]}.`; }
    else if (X.game === 'votacao') {
      const cnt = {}; Object.keys(m).forEach((j) => { if (+j !== X.by) cnt[m[j]] = (cnt[m[j]] || 0) + 1; });
      const max = Math.max(0, ...Object.values(cnt)); const tops = Object.keys(cnt).filter((k) => cnt[k] === max).map(Number);
      const tally = Object.keys(cnt).map((k) => `${S.players[k] ? S.players[k].name : '?'}: ${cnt[k]}`).join(' · ');
      if (tops.length !== 1) { X.step = 'tiebreak'; X.tally = tally; pushFx(S, { kind: 'chaltie', actor: X.by, title: 'Sem vencedor na votação', sub: `${tally}. Desempate: ${p.name} lança 2 dados e precisa de 8 ou mais.` }); return; }
      win = m[X.by] === tops[0]; detail = `A maioria votou em ${S.players[tops[0]].name} (${tally}). ${p.name} apostou em ${S.players[m[X.by]].name}.`;
    }
    let rtxt = ''; if (win) rtxt = applyReward(S);
    pushFx(S, { kind: 'chalres', actor: X.by, target: X.mode === 'duel' ? X.opp : null, good: win, title: win ? `${p.name} ganhou o desafio!` : `${p.name} perdeu o desafio`, sub: `${detail}${win ? ' ' + rtxt : ' Não ganha nada e passa a vez.'}` });
    log(S, win ? `🏅 ${p.name} ganhou o desafio. ${rtxt}` : `😬 ${p.name} perdeu o desafio e passou a vez.`, win ? 'money' : 'block');
    const by = X.by; S.chal = null; if (!win) endTurn(S, by);
  }
  function chalAct(S, i, a) {
    const X = S.chal; if (!X) return { error: 'Não há desafio.' };
    if (!chalNeeds(S).includes(i)) return { error: 'Agora não é contigo.' };
    if (X.step === 'setup') {
      const others = alivePlayers(S, X.by); const rw = a.reward; if (!REWARDS[rw]) return { error: 'Escolhe o prémio.' };
      const who = +a.who; const needsWho = X.mode === 'duel' || rw === 'carta' || rw === 'negocio';
      if (needsWho && !others.includes(who)) return { error: X.mode === 'duel' ? 'Escolhe o adversário.' : 'Escolhe o jogador.' };
      if (rw === 'carta' && !S.players[who].cards.length) return { error: 'Esse jogador não tem cartas.' };
      if (rw === 'negocio' && !S.players[who].biz.length) return { error: 'Esse jogador não tem negócios.' };
      X.reward = rw; if (X.mode === 'duel') X.opp = who; else if (needsWho) X.target = who;
      const gk = X.mode === 'duel' ? Object.keys(DUEL_GAMES) : Object.keys(GROUP_GAMES); X.game = gk[Math.floor(rnd(S) * gk.length)];
      if (X.game === 'votacao' && alivePlayers(S, X.by).length < 2) X.game = 'trivia';
      if (X.game === 'votacao') X.q = { t: VOTES[Math.floor(rnd(S) * VOTES.length)] };
      if (X.game === 'trivia') { const t = TRIVIA[Math.floor(rnd(S) * TRIVIA.length)]; const order = [0, 1, 2, 3].sort(() => rnd(S) - 0.5); X.q = { t: t[0], o: order.map((k) => t[1][k]), a: order.indexOf(t[2]) }; }
      X.step = 'play';
      const G = X.mode === 'duel' ? DUEL_GAMES : GROUP_GAMES;
      pushFx(S, { kind: 'challenge', actor: X.by, target: X.opp, title: G[X.game], sub: X.mode === 'duel' ? `${S.players[X.by].name} desafia ${S.players[X.opp].name}. Prémio: ${REWARDS[rw].toLowerCase()}.` : X.game === 'votacao' ? `«${X.q.t}» Todos votam; ${S.players[X.by].name} tem de adivinhar quem a maioria escolhe.` : `${S.players[X.by].name} responde à pergunta. Prémio: ${REWARDS[rw].toLowerCase()}.` });
      return { state: S };
    }
    if (X.step === 'tiebreak') { X.moves.tb = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]; resolveChallenge(S); return { state: S }; }
    const mv = a.move;
    if (X.game === 'ppt') { if (!['pedra', 'papel', 'tesoura'].includes(mv)) return { error: 'Escolhe pedra, papel ou tesoura.' }; X.moves[i] = mv; }
    else if (X.game === 'parimpar') { const n = Math.floor(+(mv && mv.n)); if (!(n >= 0 && n <= 5)) return { error: 'Escolhe de 0 a 5.' }; if (i === X.by && !['par', 'impar'].includes(mv.pick)) return { error: 'Escolhe par ou ímpar.' }; X.moves[i] = i === X.by ? { pick: mv.pick, n } : { n }; }
    else if (X.game === 'dados') X.moves[i] = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    else if (X.game === 'trivia') { const k = Math.floor(+mv); if (!(k >= 0 && k < 4)) return { error: 'Escolhe uma resposta.' }; X.moves[i] = k; }
    else if (X.game === 'votacao') { const k = Math.floor(+mv); if (!S.players[k]) return { error: 'Escolhe uma pessoa.' }; X.moves[i] = k; }
    if (!chalNeeds(S).length) resolveChallenge(S);
    return { state: S };
  }

  function passStart(S, i) { const p = S.players[i]; if (!p.passedStart) { p.passedStart = true; log(S, `${p.name} passou pela Partida: já pode fazer suspeitas.`, 'info'); } }

  /* =========================================================== OPÇÕES (o que o jogador pode fazer agora) */
  function options(S, i) {
    const o = { mine: false, list: [] }; if (S.phase !== 'play') return o;
    const p = S.players[i]; const add = (type, extra) => o.list.push(Object.assign({ type }, extra || {}));
    add('mark');
    if (S.gate) { if (S.gate.need.includes(i) && !S.gate.ack.includes(i)) add('ack'); return o; }
    if (S.chal) { if (chalNeeds(S).includes(i)) add('chal'); return o; }
    if (S.pending) { if (S.pending.who === i) add('respond'); return o; }
    if (S.turn !== i || p.out) return o;
    o.mine = true; const ts = S.ts, b = inB(p), B = b ? S.bld[b] : null, BD = b ? BLD[b] : null;
    if (!ts.moved) {
      if (!ts.rolled) { add('roll'); add('stay'); }
      else add('move', { reach: ts.reach });
      const atStop = (b === 'estacao') || (!b && (p.pos.n === L.PARTIDA || 'n' + p.pos.n === L.PARAGENS.porto));
      if (atStop && !ts.rolled && p.money >= 20) add('travel');
    }
    if (!ts.acted) {
      if (b && B.rumors.length && b !== 'praca' && !(B.closed === S.round && B.owner !== i) && !(S.events.storm === S.round && BD.bairro === 'porto')) add('investigate');
      const others = S.players.map((q, j) => j).filter((j) => j !== i && S.players[j].cards.length);
      const here = others.filter((j) => sameSpot(S.players[j], p) && !S.players[j].out);
      const remote = p.character.power.id === 'carteiro' || ts.freeRemote || (b === 'correios' && p.money >= servicePrice(S, 30));
      if (here.length || remote) add('interrogate', { targets: remote ? others : here, remote: remote && !here.length });
      const sus = Object.keys(S.homes).find((k) => S.homes[k] === b); if (sus != null) add('ask', { sus: +sus });
      if (b === 'taberna') { add('informador', { price: servicePrice(S, 80) }); add('silenciar', { price: servicePrice(S, 50) }); }
      if (b === 'biblioteca' && S.arquivo.length) add('arquivo', { price: servicePrice(S, 70) });
      if (b === 'cartorio') add('cartorio', { price: servicePrice(S, 100) });
      if (b === 'gnr') add('mandado', { price: servicePrice(S, p.character.power.id === 'guarda' ? 50 : 100) });
      if (b === 'correios' && S.jornalBuyer == null) add('jornal', { price: servicePrice(S, 60) });
      if (BD && BD.type === 'biz' && B.owner == null && p.biz.length < 4) add('buy', { price: bizPrice(p, b) });
      if (BD && BD.type === 'biz' && B.owner === i && !B.up) add('upgrade', { price: 60 });
      if (b === 'praca') add('accuse');
    }
    if (p.passedStart && p.suspRound !== S.round) add('suspeita');
    if (p.biz.some((x) => S.bld[x].closed !== S.round)) add('close', { price: 30 });
    if (p.character.power.id === 'advogado' && !p.powerUsed) add('testamento');
    add('offer'); add('end');
    return o;
  }
  const bizPrice = (p, b) => Math.round((BLD[b].price || 100) * (p.character.power.id === 'comerciante' ? 0.8 : 1));
  const can = (S, i, type) => options(S, i).list.some((x) => x.type === type);

  /* =========================================================== AÇÕES */
  function act(S0, i, a) {
    const S = clone(S0); const p = S.players[i]; const err = (m) => ({ error: m });
    if (!a || !a.type) return err('Ação inválida');
    if (a.type === 'mark') { if (typeof a.key === 'string' && a.key.length < 12) { if (a.val) p.marks[a.key] = String(a.val).slice(0, 2); else delete p.marks[a.key]; } if (typeof a.notes === 'string') p.notes = a.notes.slice(0, 600); return { state: S }; }
    if (a.type === 'respond') return respond(S, i, a);
    if (a.type === 'ack') { if (!S.gate || !S.gate.need.includes(i)) return err('Nada para confirmar.'); if (!S.gate.ack.includes(i)) S.gate.ack.push(i); if (S.gate.need.every((j) => S.gate.ack.includes(j) || S.players[j].out || !S.players[j].uid)) S.gate = null; return { state: S }; }
    if (a.type === 'chal') return chalAct(S, i, a);
    if (!can(S, i, a.type)) return err('Agora não podes fazer isso.');
    const b = inB(p), ts = S.ts, A = p.name;
    switch (a.type) {
      case 'roll': { ts.roll = a.roll || 1 + Math.floor(Math.random() * 6); ts.rolled = true; ts.reach = reach(p.pos, ts.roll); pushFx(S, { kind: 'roll', actor: i, roll: ts.roll, title: `${A} lançou o dado`, sub: `Saiu ${ts.roll}` }); break; }
      case 'stay': ts.moved = true; ts.rolled = true; log(S, `${A} ficou onde estava.`); break;
      case 'move': {
        if (!ts.reach.includes(a.dest)) return err('Destino fora de alcance.');
        const path = pathTo(p.pos, a.dest); const from = locKey(p.pos);
        p.pos = a.dest.startsWith('b:') ? { b: a.dest.slice(2) } : { n: +a.dest.slice(1) };
        ts.moved = true; ts.reach = null;
        if (path.includes(L.PARTIDA) || p.pos.b === 'praca') passStart(S, i);
        pushFx(S, { kind: 'move', actor: i, path, toB: p.pos.b || null, from, quiet: true });
        if (p.pos.b) {
          const B = S.bld[p.pos.b];
          if (B.owner != null && B.owner !== i && BLD[p.pos.b].type === 'biz') { const r = payTo(S, i, B.up ? 20 : 10, B.owner); pushFx(S, { kind: 'rent', actor: i, target: B.owner, bld: p.pos.b, title: 'Renda paga', sub: `${A} pagou ${r} escudos a ${S.players[B.owner].name} por entrar ${em(p.pos.b)}.` }); log(S, `${A} pagou ${r} escudos de renda a ${S.players[B.owner].name}.`, 'money'); }
          log(S, `${A} entrou ${em(p.pos.b)}.`, 'move');
          drawCard(S, i, p.pos.b);
        }
        break;
      }
      case 'travel': {
        const stops = Object.values(L.PARAGENS).filter((k) => k !== locKey(p.pos)); if (!stops.includes(a.to)) return err('Paragem inválida.');
        payTo(S, i, 20, null); p.pos = a.to.startsWith('b:') ? { b: a.to.slice(2) } : { n: +a.to.slice(1) }; ts.moved = true; ts.rolled = true;
        if (p.pos.n === L.PARTIDA) passStart(S, i);
        pushFx(S, { kind: 'station', actor: i, bld: 'estacao', title: 'Viagem de comboio', sub: `${A} pagou 20 escudos e apanhou o comboio.` }); log(S, `${A} viajou de comboio.`, 'move'); break;
      }
      case 'investigate': {
        const B = S.bld[b]; ts.acted = true;
        if (p.character.power.id === 'taberneiro' && B.rumors.length >= 2) { S.pending = { kind: 'pick', who: i, options: B.rumors.slice(0, 2), bld: b }; pushFx(S, { kind: 'investigate', actor: i, bld: b, title: `${A} investiga ${em(b)}`, sub: 'Ouvido de Balcão: escolhe 1 de 2 rumores.' }); break; }
        const id = B.rumors.shift(); gain(S, i, id);
        pushFx(S, { kind: 'investigate', actor: i, bld: b, title: `${A} investiga ${em(b)}`, sub: 'Encontrou um rumor. Só ele sabe o que diz.' }); log(S, `🔍 ${A} investigou ${em(b)}.`, 'action'); break;
      }
      case 'interrogate': {
        const opt = options(S, i).list.find((x) => x.type === 'interrogate'); const t = +a.target; if (!opt.targets.includes(t)) return err('Não podes interrogar essa pessoa daqui.');
        const cat = a.cat; if (!CATNAME[cat]) return err('Categoria inválida.');
        ts.acted = true; const q = S.players[t];
        const here = sameSpot(q, p);
        if (!here && p.character.power.id !== 'carteiro' && !ts.freeRemote) { const c = servicePrice(S, 30); payTo(S, i, c, S.bld.correios.owner); }
        const confess = a.confess && p.character.power.id === 'padre' && !p.confessUsed; if (confess) p.confessUsed = true;
        const opts2 = q.cards.filter((c) => S.clues[c].cats.includes(cat));
        const where = here ? (b || null) : 'correios';
        if (!opts2.length) { pushFx(S, { kind: 'interrogate', actor: i, target: t, bld: where, title: `${A} interroga ${q.name}`, sub: `Sobre ${CATNAME[cat].toUpperCase()}: «Não sei nada sobre isso.»` }); log(S, `❓ ${A} interrogou ${q.name} sobre ${CATNAME[cat]}: não sabe nada.`, 'action'); break; }
        S.pending = { kind: 'show', who: t, to: i, options: opts2, n: Math.min(confess ? 2 : 1, opts2.length), reason: 'interrogate', cat };
        pushFx(S, { kind: 'interrogate', actor: i, target: t, bld: where, title: `${A} interroga ${q.name}`, sub: `Sobre ${CATNAME[cat].toUpperCase()}${confess ? ' — em confissão: 2 cartas' : ''}. ${q.name} escolhe o que mostrar…` });
        log(S, `❓ ${A} interrogou ${q.name} sobre ${CATNAME[cat]}.`, 'action'); break;
      }
      case 'ask': {
        const sus = +Object.keys(S.homes).find((k) => S.homes[k] === b); ts.acted = true;
        const list = S.decl[sus] || []; const id = list.find((x) => !p.known.includes(x)) || list[0]; if (id) discover(S, i, id);
        pushFx(S, { kind: 'ask', actor: i, bld: b, sus, title: `${A} bate à porta de ${SUS[sus].full}`, sub: `${SUS[sus].emoji} ${SUS[sus].role} — conta a sua versão da noite.` }); log(S, `🚪 ${A} falou com ${SUS[sus].full}.`, 'action'); break;
      }
      case 'informador': {
        const tb = a.bld; if (!S.bld[tb] || !S.bld[tb].rumors.length) return err('Esse edifício não tem rumores.');
        const price = servicePrice(S, 80); if (p.money < price) return err('Não tens dinheiro.');
        payTo(S, i, price, S.bld.taberna.owner); const id = S.bld[tb].rumors.shift(); gain(S, i, id); ts.acted = true;
        pushFx(S, { kind: 'informador', actor: i, bld: 'taberna', title: 'O Informador', sub: `${A} pagou ${price} escudos por um rumor ${em(tb).replace(/^em /, 'de ')}.` }); log(S, `🕵️ ${A} comprou um rumor ao Informador.`, 'money'); break;
      }
      case 'silenciar': {
        const tb = a.bld; if (!S.bld[tb] || !S.bld[tb].rumors.length) return err('Esse edifício não tem rumores.');
        const price = servicePrice(S, 50); if (p.money < price) return err('Não tens dinheiro.');
        payTo(S, i, price, S.bld.taberna.owner); S.bld[tb].rumors.shift(); ts.acted = true;
        pushFx(S, { kind: 'silenciar', actor: i, bld: tb, title: 'Um rumor desaparece', sub: `${A} pagou para calar um rumor ${em(tb)}.` }); log(S, `🤫 ${A} silenciou um rumor ${em(tb)}.`, 'block'); break;
      }
      case 'arquivo': {
        const price = servicePrice(S, 70); if (p.money < price) return err('Não tens dinheiro.');
        payTo(S, i, price, null); const id = S.arquivo.shift(); gain(S, i, id); ts.acted = true;
        pushFx(S, { kind: 'arquivo', actor: i, bld: 'biblioteca', title: 'O Arquivo', sub: `${A} consultou os documentos antigos da vila.` }); log(S, `📚 ${A} consultou o Arquivo.`, 'money'); break;
      }
      case 'cartorio': {
        const t = +a.target, q = S.players[t]; if (!q || t === i || !q.cards.length) return err('Escolhe outro jogador.');
        const price = servicePrice(S, 100); if (p.money < price) return err('Não tens dinheiro.');
        payTo(S, i, price, null); const pool = q.cards.filter((c) => !p.known.includes(c)); const pickc = (pool.length ? pool : q.cards)[Math.floor(Math.random() * (pool.length || q.cards.length))]; discover(S, i, pickc); ts.acted = true;
        pushFx(S, { kind: 'show', actor: i, target: t, bld: 'cartorio', title: 'No Cartório', sub: `${A} pagou ${price} escudos para ver um papel de ${q.name}.` }); log(S, `📜 ${A} viu no Cartório um testemunho de ${q.name}.`, 'money'); break;
      }
      case 'mandado': {
        const t = +a.target, q = S.players[t]; if (!q || t === i || q.out) return err('Escolhe outro jogador.');
        if (q.mandRound === S.round) return err('Esse jogador já levou um Mandado nesta ronda.');
        const price = servicePrice(S, p.character.power.id === 'guarda' ? 50 : 100); if (p.money < price) return err('Não tens dinheiro.');
        payTo(S, i, price, null); ts.acted = true; q.mandRound = S.round;
        if (q.immune) { q.immune = false; pushFx(S, { kind: 'mandado', actor: i, target: t, bld: 'gnr', title: 'Mandado anulado!', sub: `${q.name} tinha um amigo na GNR. O Mandado não teve efeito.` }); log(S, `🛡️ ${q.name} escapou a um Mandado.`, 'block'); break; }
        q.pos = { b: 'gnr' }; q.skipMove = true;
        pushFx(S, { kind: 'mandado', actor: i, target: t, bld: 'gnr', title: 'Mandado da GNR!', sub: `${q.name} vai para o Posto e perde o próximo movimento.` }); log(S, `🚨 ${A} pediu um Mandado contra ${q.name}.`, 'block'); break;
      }
      case 'jornal': {
        const price = servicePrice(S, 60); if (p.money < price) return err('Não tens dinheiro.');
        payTo(S, i, price, S.bld.correios.owner); S.jornalBuyer = i; ts.acted = true;
        pushFx(S, { kind: 'jornal', actor: i, bld: 'correios', title: 'Edição comprada', sub: `${A} comprou o próximo Jornal da Vila. A notícia sai só para ele.` }); log(S, `📰 ${A} comprou o próximo Jornal.`, 'block'); break;
      }
      case 'buy': {
        const price = bizPrice(p, b); if (p.money < price) return err('Não tens dinheiro suficiente.');
        payTo(S, i, price, null); S.bld[b].owner = i; p.biz.push(b); ts.acted = true;
        const first = S.bld[b].rumors.shift(); if (first) gain(S, i, first);
        pushFx(S, { kind: 'buy', actor: i, bld: b, title: `${BLD[b].name}: vendido!`, sub: `${A} comprou o negócio por ${price} escudos${first ? ' e espreitou o primeiro rumor lá guardado' : ''}.` }); log(S, `💰 ${A} comprou ${BLD[b].name}.`, 'money'); break;
      }
      case 'upgrade': {
        if (p.money < 60) return err('Não tens dinheiro.'); payTo(S, i, 60, null); S.bld[b].up = true; ts.acted = true;
        pushFx(S, { kind: 'upgrade', actor: i, bld: b, title: 'Balcão novo', sub: `${A} melhorou ${BLD[b].name}: renda a dobrar e ouvidos atentos.` }); log(S, `⭐ ${A} melhorou ${BLD[b].name}.`, 'money'); break;
      }
      case 'close': {
        const tb = a.bld; if (!p.biz.includes(tb) || S.bld[tb].closed === S.round) return err('Escolhe um negócio teu.'); if (p.money < 30) return err('Não tens dinheiro.');
        payTo(S, i, 30, null); S.bld[tb].closed = S.round;
        pushFx(S, { kind: 'close', actor: i, bld: tb, title: 'Porta fechada', sub: `${A} fechou ${BLD[tb].name} nesta ronda. Ninguém investiga lá.` }); log(S, `🔒 ${A} fechou ${BLD[tb].name}.`, 'block'); break;
      }
      case 'suspeita': {
        const th = normTheory(a); if (!th) return err('Teoria incompleta.');
        p.suspRound = S.round; const n = S.players.length; let found = -1, opts2 = [];
        for (let k = 1; k < n; k++) { const j = (i + k) % n; const q = S.players[j]; const c = q.cards.filter((id) => !ev(S.clues[id].p, th.s, th.l, th.o, th.h)); if (c.length) { found = j; opts2 = c; break; } }
        const txt = `${SUS[th.s].name} · ${LOC[th.l].name} · ${OBJ[th.o].name} · ${HOR[th.h]}`;
        if (found < 0) { pushFx(S, { kind: 'suspeita', actor: i, title: `${A} tem uma suspeita`, sub: `${txt}. Ninguém consegue contradizer.`, theory: th }); log(S, `🤔 Suspeita de ${A}: ${txt} — ninguém contradiz.`, 'action'); break; }
        S.pending = { kind: 'show', who: found, to: i, options: opts2, n: 1, reason: 'suspeita' };
        pushFx(S, { kind: 'suspeita', actor: i, target: found, title: `${A} tem uma suspeita`, sub: `${txt}. ${S.players[found].name} pode contradizer e vai mostrar uma carta em segredo.`, theory: th });
        log(S, `🤔 Suspeita de ${A}: ${txt} — ${S.players[found].name} contradiz.`, 'action'); break;
      }
      case 'testamento': {
        const th = normTheory(a); const c = a.cat; if (!th || !['s', 'l', 'o', 'h'].includes(c)) return err('Escolhe a teoria e a categoria.');
        p.powerUsed = true; const ok = th[c] === S.sol[c];
        const id = 'c' + Object.keys(S.clues).length; const pp = { k: 'is', c, i: th[c], n: !ok }; S.clues[id] = { id, p: pp, t: 'is', txt: ok ? `O testamento confirma: ${nameOf(c, th[c])} está certo.` : textOf(pp), cats: catsOf(pp), src: 'O Testamento' }; discover(S, i, id);
        pushFx(S, { kind: 'power', actor: i, bld: 'cartorio', title: 'O Testamento', sub: `${A} leu uma linha do testamento do Comendador.` }); log(S, `⚖️ ${A} usou O Testamento.`, 'action'); break;
      }
      case 'accuse': {
        const th = normTheory(a); if (!th) return err('Teoria incompleta.'); ts.acted = true;
        const ok = ['s', 'l', 'o', 'h'].every((c) => th[c] === S.sol[c]);
        const txt = `${SUS[th.s].full}, ${em(LOC[th.l].b)}, com ${OBJ[th.o].name.toLowerCase()}, às ${HOR[th.h]}`;
        if (ok) { S.phase = 'end'; S.winner = i; pushFx(S, { kind: 'accuse', actor: i, bld: 'praca', title: 'O cofre abriu!', sub: `${A} acertou: ${txt}.`, ok: true, theory: th }); log(S, `🏆 ${A} abriu o cofre: ${txt}!`, 'win'); return { state: S }; }
        p.out = true; pushFx(S, { kind: 'accuse', actor: i, bld: 'praca', title: 'O cofre trancou', sub: `${A} acusou ${txt}… e errou. Sai do jogo.`, ok: false, theory: th }); log(S, `🔐 ${A} errou a acusação e saiu do jogo.`, 'out');
        if (!alive(S).length) { S.phase = 'end'; S.winner = null; log(S, 'Ninguém conseguiu abrir o cofre.', 'out'); return { state: S }; }
        nextTurn(S); break;
      }
      case 'offer': {
        const t = +a.target, q = S.players[t]; const price = Math.max(0, Math.min(500, Math.floor(+a.price || 0)));
        if (!q || t === i || q.out && a.mode !== 'buy') return err('Escolhe outro jogador.');
        if (a.mode === 'sell') { if (!p.known.includes(a.clue)) return err('Escolhe uma pista tua.'); S.pending = { kind: 'offer', who: t, from: i, mode: 'sell', price, clue: a.clue }; pushFx(S, { kind: 'sell', actor: i, target: t, title: 'Proposta de negócio', sub: `${A} oferece uma pista a ${q.name} por ${price} escudos.` }); }
        else { if (p.money < price) return err('Não tens esse dinheiro.'); if (!q.known.length) return err('Esse jogador não tem pistas.'); S.pending = { kind: 'offer', who: t, from: i, mode: 'buy', price }; pushFx(S, { kind: 'sell', actor: i, target: t, title: 'Proposta de negócio', sub: `${A} quer comprar uma pista a ${q.name} por ${price} escudos.` }); }
        log(S, `🤝 ${A} fez uma proposta a ${q.name} (${price} escudos).`, 'money'); break;
      }
      case 'end': endTurn(S, i); break;
      default: return err('Ação desconhecida.');
    }
    return { state: S };
  }
  function normTheory(a) { const t = { s: +a.s, l: +a.l, o: +a.o, h: +a.h }; return t.s >= 0 && t.s < NS && t.l >= 0 && t.l < NL && t.o >= 0 && t.o < NO && t.h >= 0 && t.h < NH ? t : null; }
  function nameOf(c, i) { return c === 's' ? SUS[i].full : c === 'l' ? LOC[i].name : c === 'o' ? OBJ[i].name : HOR[i]; }

  function respond(S, i, a) {
    const P = S.pending; if (!P || P.who !== i) return { error: 'Não há nada para responderes.' };
    const me = S.players[i];
    if (P.kind === 'show') {
      let pick = Array.isArray(a.pick) ? a.pick.filter((x) => P.options.includes(x)) : [];
      pick = [...new Set(pick)].slice(0, P.n); if (pick.length < P.n) return { error: `Escolhe ${P.n === 1 ? 'uma carta' : P.n + ' cartas'}.` };
      pick.forEach((id) => discover(S, P.to, id)); S.pending = null;
      pushFx(S, { kind: 'show', actor: i, target: P.to, title: `${me.name} mostra ${P.n === 1 ? 'uma carta' : P.n + ' cartas'}`, sub: `Só ${S.players[P.to].name} vê o que diz.` });
      log(S, `🃏 ${me.name} mostrou ${P.n === 1 ? 'uma carta' : P.n + ' cartas'} a ${S.players[P.to].name}.`, 'action');
    } else if (P.kind === 'pick') {
      const id = a.pick && a.pick[0]; if (!P.options.includes(id)) return { error: 'Escolhe um rumor.' };
      const B = S.bld[P.bld]; B.rumors = B.rumors.filter((x) => x !== id); gain(S, i, id); const other = P.options.find((x) => x !== id); B.rumors = B.rumors.filter((x) => x !== other); B.rumors.push(other);
      S.pending = null; log(S, `🔍 ${me.name} investigou ${em(P.bld)}.`, 'action');
    } else if (P.kind === 'offer') {
      const from = S.players[P.from];
      if (!a.accept) { S.pending = null; pushFx(S, { kind: 'sell', actor: i, target: P.from, title: 'Negócio recusado', sub: `${me.name} recusou a proposta de ${from.name}.` }); log(S, `✋ ${me.name} recusou a proposta.`, 'money'); return { state: S }; }
      if (P.mode === 'sell') { if (me.money < P.price) return { error: 'Não tens dinheiro para aceitar.' }; payTo(S, i, P.price, P.from); discover(S, i, P.clue); S.pending = null; pushFx(S, { kind: 'sell', actor: P.from, target: i, title: 'Negócio fechado', sub: `${me.name} pagou ${P.price} escudos por uma pista.` }); }
      else { const id = a.pick && a.pick[0]; if (!me.known.includes(id)) return { error: 'Escolhe a pista que vendes.' }; payTo(S, P.from, P.price, i); discover(S, P.from, id); S.pending = null; pushFx(S, { kind: 'sell', actor: P.from, target: i, title: 'Negócio fechado', sub: `${from.name} pagou ${P.price} escudos a ${me.name} por uma pista.` }); }
      log(S, `🤝 Negócio fechado entre ${from.name} e ${me.name}.`, 'money');
    }
    return { state: S };
  }

  /* =========================================================== VISTAS */
  function pubView(S) {
    return {
      g: 3, v: S.v, code: S.code, created: S.created, pace: S.pace, phase: S.phase, round: S.round, turn: S.turn, steps: S.steps,
      players: S.players.map((p) => ({ name: p.name, color: p.color, character: p.character, uid: p.uid, pos: p.pos, home: p.home, money: p.money, biz: p.biz, cardsN: p.cards.length, knownN: p.known.length, out: p.out, passedStart: p.passedStart, suspUsed: p.suspRound === S.round, skipMove: p.skipMove })),
      bld: Object.fromEntries(Object.entries(S.bld).map(([k, b]) => [k, { owner: b.owner, up: b.up, closed: b.closed === S.round, rumors: b.rumors.length }])),
      ts: S.ts ? { rolled: S.ts.rolled, roll: S.ts.roll, moved: S.ts.moved, acted: S.ts.acted, reach: S.ts.reach } : null,
      pending: S.pending ? { kind: S.pending.kind, who: S.pending.who, to: S.pending.to, from: S.pending.from, reason: S.pending.reason, cat: S.pending.cat, mode: S.pending.mode, price: S.pending.price } : null,
      log: S.log.slice(-30), fx: S.fx, events: S.events, homes: S.homes, arquivoN: S.arquivo.length, jornalBought: S.jornalBuyer != null,
      pubClues: Object.values(S.clues).filter((c) => c.pub).map((c) => ({ id: c.id, txt: c.txt, cats: c.cats, t: c.t })),
      winner: S.winner, sol: S.phase === 'end' ? S.sol : null,
      gate: S.gate ? { kind: S.gate.kind, need: S.gate.need, ack: S.gate.ack, txt: S.clues[S.gate.id].txt, cats: S.clues[S.gate.id].cats } : null,
      chal: S.chal ? { mode: S.chal.mode, by: S.chal.by, bld: S.chal.bld, step: S.chal.step, game: S.chal.game, opp: S.chal.opp, target: S.chal.target, reward: S.chal.reward, round: S.chal.round, q: S.chal.q ? { t: S.chal.q.t, o: S.chal.q.o } : null, done: Object.keys(S.chal.moves), needs: chalNeeds(S), tally: S.chal.tally || null } : null,
      cardsHidden: Object.keys(S.cards || {}).length,
    };
  }
  function handView(S, i) {
    const p = S.players[i]; const P = S.pending;
    const cl = (id) => { const c = S.clues[id]; return { id, txt: c.txt, cats: c.cats, t: c.t, tn: TYPE_NAME[c.t], src: c.src, mine: p.cards.includes(id) }; };
    const h = { g: 3, code: S.code, seat: i, cards: p.cards.slice(), known: p.known.map(cl), marks: p.marks, notes: p.notes, opts: options(S, i).list, power: Object.assign({ id: p.character.power.id, used: p.powerUsed || p.confessUsed }, POWERS[p.character.power.id]) };
    if (P && P.who === i) {
      h.ask = { kind: P.kind, to: P.to, from: P.from, n: P.n, reason: P.reason, cat: P.cat, mode: P.mode, price: P.price, options: (P.kind === 'offer' ? (P.mode === 'buy' ? p.known : [P.clue]) : P.options).map(cl) };
      if (P.kind === 'offer' && P.mode === 'sell') h.ask.options = [{ id: P.clue, txt: '(pista escondida até pagares)', cats: S.clues[P.clue].cats, tn: TYPE_NAME[S.clues[P.clue].t], src: '' }];
    }
    return h;
  }

  /* =========================================================== BOTS */
  function knowledge(S, i) { return solveFrom(S.players[i].known.map((id) => S.clues[id].p)); }
  function candidates(S, i, max = 6) { const m = knowledge(S, i); const out = []; for (let k = 0; k < N && out.length < max; k++) if (m[k]) out.push(decode(k)); return { n: count1(m), list: out }; }
  /** Um passo de bot (ou resposta automática). Devolve o novo estado, ou null se não houver nada a fazer. */
  function botStep(S) {
    if (S.phase !== 'play') return null;
    if (S.gate) return null;
    if (S.chal) {
      const j = chalNeeds(S).find((k) => !S.players[k].uid || S.players[k].out); if (j == null) return null; const X = S.chal;
      const others = alivePlayers(S, X.by);
      if (X.step === 'setup') { const who = others[Math.floor(Math.random() * others.length)]; return act(S, j, { type: 'chal', reward: 'dinheiro', who }).state; }
      if (X.step === 'tiebreak') return act(S, j, { type: 'chal' }).state;
      const mv = X.game === 'ppt' ? ['pedra', 'papel', 'tesoura'][Math.floor(Math.random() * 3)] : X.game === 'parimpar' ? { pick: Math.random() < 0.5 ? 'par' : 'impar', n: Math.floor(Math.random() * 6) } : X.game === 'trivia' ? (Math.random() < 0.55 ? X.q.a : Math.floor(Math.random() * 4)) : X.game === 'votacao' ? Math.floor(Math.random() * S.players.length) : 0;
      return act(S, j, { type: 'chal', move: mv }).state;
    }
    if (S.pending) {
      const P = S.pending, w = S.players[P.who]; if (w.uid && !w.out) return null;
      if (P.kind === 'show') return act(S, P.who, { type: 'respond', pick: P.options.slice(0, P.n) }).state;
      if (P.kind === 'pick') return act(S, P.who, { type: 'respond', pick: [P.options[0]] }).state;
      if (P.kind === 'offer') return act(S, P.who, { type: 'respond', accept: P.mode === 'sell' ? w.money >= P.price + 60 && P.price <= 50 : P.price >= 40, pick: [w.known[0]] }).state;
    }
    const i = S.turn, p = S.players[i]; if (p.uid && !p.out) return null;
    const o = options(S, i).list.map((x) => x.type); const ts = S.ts; const C = candidates(S, i, 30);
    const doo = (a) => { const r = act(S, i, a); return r.state || act(S, i, { type: 'end' }).state; };
    if (o.includes('suspeita') && C.n > 1 && Math.random() < 0.7) { const t = C.list[Math.floor(Math.random() * C.list.length)]; return doo(Object.assign({ type: 'suspeita' }, t)); }
    if (!ts.moved) {
      if (!ts.rolled) return doo({ type: 'roll' });
      let target = 'praca';
      if (!(C.n === 1 || (C.n <= 2 && S.round >= 18))) {
        const bs = Object.keys(S.bld).filter((b) => S.bld[b].rumors.length && b !== inB(p) && !(S.bld[b].closed === S.round && S.bld[b].owner !== i));
        Object.keys(S.homes).forEach((k) => { if ((S.decl[k] || []).some((id) => !p.known.includes(id)) && S.homes[k] !== inB(p)) bs.push(S.homes[k]); });
        if (S.arquivo.length && p.money >= 60 && inB(p) !== 'biblioteca') bs.push('biblioteca');
        if (p.money >= 50 && inB(p) !== 'correios' && S.players.some((q, j) => j !== i && q.cards.some((id) => !p.known.includes(id)))) bs.push('correios');
        target = bs.sort((a, b2) => distTo(p.pos, a) - distTo(p.pos, b2))[Math.floor(Math.random() * Math.min(3, bs.length))] || 'praca';
      }
      const best = ts.reach.slice().sort((a, b2) => score(a) - score(b2))[0];
      function score(k) { if (k === 'b:' + target) return -1; const pos = k.startsWith('b:') ? { b: k.slice(2) } : { n: +k.slice(1) }; return distTo(pos, target); }
      return doo({ type: 'move', dest: best });
    }
    if (!ts.acted) {
      if (o.includes('accuse') && (C.n === 1 || (C.n <= 2 && S.round >= 18))) return doo(Object.assign({ type: 'accuse' }, C.list[0]));
      if (o.includes('investigate')) return doo({ type: 'investigate' });
      const io = options(S, i).list.find((x) => x.type === 'interrogate');
      if (io && (!io.remote || p.money >= 40) && io.targets.length) { const tg = io.targets.filter((j) => S.players[j].cards.some((id) => !p.known.includes(id))); if (tg.length) { const t = tg[Math.floor(Math.random() * tg.length)]; const cats = ['quem', 'onde', 'comque', 'quando'].filter((c) => S.players[t].cards.some((id) => !p.known.includes(id) && S.clues[id].cats.includes(c))); return doo({ type: 'interrogate', target: t, cat: cats[Math.floor(Math.random() * cats.length)] || 'quem', confess: true }); } }
      if (o.includes('ask')) return doo({ type: 'ask' });
      if (o.includes('arquivo') && p.money > 100) return doo({ type: 'arquivo' });
      if (o.includes('buy') && p.money > bizPrice(p, inB(p)) + 90) return doo({ type: 'buy' });
    }
    return doo({ type: 'end' });
  }

  const API = { MYSTERY, DUEL_GAMES, GROUP_GAMES, REWARDS, SUS, LOC, OBJ, HOR, CATNAME, BAIRRO, POWERS, COLORS, HATS, TYPE_NAME, PACE, N, generateCase, createGame, act, options, pubView, handView, botStep, reach, pathTo, clone, ev, textOf, catsOf, solveFrom, count1, decode, candidates, knowledge, genCharacterLocal, normalizeCharacter, placeName, em, BLD };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.CG = API;
})(typeof window !== 'undefined' ? window : globalThis);
