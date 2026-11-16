// ILHA DO VULCÃO — interface: TV (painéis sobre o 3D), comando do telemóvel, lobby e rede
(function () {
  const D = window.DATA, ENG = window.ENG, S = ENG.S, Sound = window.Sound;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  const GAME_URL = window.__SALA_URL || location.href.split('?')[0];
  const hatE = k => D.HATS[k] ? D.HATS[k][0] : '🙂';
  const tok = (p, cls) => `<span class="tok ${cls || ''}" style="background:${D.PCOLORS[p.col]}">${hatE(p.hat)}</span>`;
  const KIND = { all: 'Todos contra todos', '1vN': '1 contra o resto', team: 'Equipas', duel: 'Duelo 1 contra 1', gate: 'Desafio do Guardião', tel: 'Prova de telemóvel' };
  const MGN = { stop: ['⏱️', 'Relógio Cego'], reflex: ['⚡', 'Reflexos'], taps: ['🔨', 'Martelada'], min01: ['🔢', '0 ou 1'], ppt: ['✊', 'Pedra, Papel, Tesoura'], parimpar: ['🎲', 'Par ou Ímpar'], unico: ['🎯', 'Número Único'] };
  const ELO = { min01: [['0', '0'], ['1', '1']], ppt: [['✊', 'Pedra'], ['✋', 'Papel'], ['✌️', 'Tesoura']], parimpar: [['2️⃣', 'Par'], ['1️⃣', 'Ímpar']] };
  const MGD = { stop: t => `Carrega em Começar e pára o relógio o mais perto possível dos ${t} segundos. O relógio esconde-se ao fim de 2 segundos!`, reflex: () => 'Quando o ecrã ficar VERDE, toca o mais depressa que conseguires. Quem tocar antes do tempo fica em último.', taps: () => 'Tens 6 segundos para dar o maior número de toques no botão.', min01: () => 'Todos escolhem 0 ou 1 em segredo. Quem ficar na minoria continua; a maioria sai. Os 2 últimos decidem a pedra, papel, tesoura.', ppt: () => 'Todos escolhem ao mesmo tempo. Se só houver dois gestos em jogo, quem perde sai. Ganha o último.', parimpar: () => 'A soma dos dois dados vai ser par ou ímpar? Quem falhar sai. Ganha o último.', unico: () => 'Escolhe um número de 1 a 9. Ganha o número mais alto que mais ninguém escolheu.' };
  const WHY = { move: 'É a tua vez! Lança os dados.', volc: 'Estás dentro do vulcão. Lança para subir.', again: 'Trampolim! Lança outra vez.', duel: 'Duelo de dados: ganha o número mais alto.' };
  const nameOf = (V, i) => V.players[i] ? V.players[i].name : '?';
  const diceIcons = p => `<i class="di n"></i>${p.dn > 1 ? '<i class="di g"></i>' : ''}${p.ds ? '<i class="di s"></i>' : ''}${p.db ? '<i class="di b"></i>' : ''}${p.extra ? '<i class="di b"></i>' : ''}`;
  const remaining = (V, x) => x.s * 1000 - ((V.now - x.t0) + (Date.now() - V.at));
  const where = p => p.zone === 'v' ? `🌋 vulcão ${p.vpos + 1}/${D.M}` : p.pos === D.GOAL ? '⛩️ Cume' : `casa ${p.pos}/${D.GOAL}`;
  const acted = (V, i) => { const x = V.x; if (!x) return false; if (V.step === 'vote') return x.votes && x.votes[i] !== undefined; if (V.step === 'mg' || V.step === 'mgwait') return x.res && x.res[i] !== undefined; if (V.step === 'el') return x.picks && x.picks[i] !== undefined; return false; };
  const mustAct = (V, i) => !!(V.ph === 'play' && V.x && V.x.who && V.x.who.includes(i) && !acted(V, i));
  const voteLabel = (V, x, v) => {
    if (x.k === 'all' || x.k === 'duel') return `${hatE(V.players[v].hat)} ${esc(nameOf(V, v))}`;
    if (x.k === '1vN') return v === 1 ? `${hatE(V.players[x.solo].hat)} ${esc(nameOf(V, x.solo))} (sozinho)` : '👥 O resto do grupo';
    if (x.k === 'team') return `Equipa ${v === 0 ? 'A' : 'B'}: ${(v === 0 ? x.A : x.B).map(i => esc(nameOf(V, i))).join(', ')}`;
    return v === 1 ? '👍 Passou' : '👎 Falhou';
  };
  const whoLine = (V, x, cls) => {
    const ch = (i, extra) => `<span class="pch ${extra || ''}" style="--c:${D.PCOLORS[V.players[i].col]}">${tok(V.players[i], 's')}${esc(nameOf(V, i))}</span>`;
    if (x.k === 'duel') return `${ch(x.a)}<span class="vs">VS</span>${ch(x.b)}`;
    if (x.k === '1vN') return `${ch(x.solo)}<span class="vs">VS</span>${x.P.filter(i => i !== x.solo).map(i => ch(i)).join('')}`;
    if (x.k === 'team') return `<b>A</b>${x.A.map(i => ch(i)).join('')}<span class="vs">VS</span><b>B</b>${x.B.map(i => ch(i)).join('')}`;
    if (x.k === 'gate') return ch(x.solo);
    return (x.P || []).map(i => ch(i)).join('');
  };

  // ===================== MAPA 2D =====================
  function mapSvg(V, me, zone, sel) {
    const P = V.players; let o = '';
    const stack = {}; const tokens = (list, pts, r) => list.map(i => {
      const p = P[i], idx = zone === 'v' ? p.vpos : p.pos, k = stack[idx] = (stack[idx] || 0) + 1, n = list.filter(j => (zone === 'v' ? P[j].vpos : P[j].pos) === idx).length;
      const a = k / n * 6.283 + idx, off = n > 1 ? r * .75 : 0, x = pts[idx].x + Math.cos(a) * off, y = pts[idx].z + Math.sin(a) * off;
      return `<g>${i === me ? `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r * 1.2}" fill="none" stroke="#fff" stroke-width="${r * .22}"><animate attributeName="r" values="${r};${r * 1.9};${r}" dur="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0;1" dur="1.4s" repeatCount="indefinite"/></circle>` : ''}<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}" fill="${D.PCOLORS[p.col]}" stroke="#fff" stroke-width="${r * .2}"/><text x="${x.toFixed(2)}" y="${(y + r * .42).toFixed(2)}" font-size="${r * 1.15}" text-anchor="middle">${hatE(p.hat)}</text></g>`;
    }).join('');
    const tile = (p, sp, i, r, lava) => {
      const t = lava ? 'lava' : sp.t, em = sp.t === '+' ? '+' + sp.v : sp.t === '-' ? '−' + sp.v : D.SPACE[t][0];
      const num = sp.t === '+' || sp.t === '-';
      return `<g data-a="sel" data-v="${i}"><circle cx="${p.x.toFixed(2)}" cy="${p.z.toFixed(2)}" r="${r}" fill="${t === 'warp' ? D.WARPCOL[sp.v] : D.SPCOL[t]}" stroke="${sel === i ? '#fff' : 'rgba(0,0,0,.35)'}" stroke-width="${sel === i ? r * .32 : r * .12}"/>${lava ? `<text x="${p.x.toFixed(2)}" y="${(p.z + r * .4).toFixed(2)}" font-size="${r * 1.1}" text-anchor="middle">🔥</text>` : em ? `<text x="${p.x.toFixed(2)}" y="${(p.z + r * .4).toFixed(2)}" font-size="${num ? r * 1.05 : r * 1.1}" text-anchor="middle" ${num ? 'fill="#fff" font-weight="900" font-family="Nunito,sans-serif"' : ''}>${em}</text>` : ''}</g>`;
    };
    if (zone === 'v') {
      const pts = D.VPATH;
      o += `<svg viewBox="-16 -16 32 32" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="lv"><stop offset="0" stop-color="#ffd35a"/><stop offset=".6" stop-color="#ff5a1a"/><stop offset="1" stop-color="#5a1404"/></radialGradient></defs>
        <circle r="15.5" fill="#2a1712"/><circle r="13.6" fill="#3a221a"/><circle r="7.4" fill="url(#lv)"><animate attributeName="r" values="7.2;7.7;7.2" dur="3s" repeatCount="indefinite"/></circle>
        <polyline points="${pts.map(p => p.x.toFixed(2) + ',' + p.z.toFixed(2)).join(' ')}" fill="none" stroke="#8a6a5a" stroke-width="1.6" stroke-linecap="round" stroke-dasharray=".4 1.2"/>`;
      pts.forEach((p, i) => { o += tile(p, D.VOLC[i], i, 1.75, false); });
      o += `<text x="${pts[0].x.toFixed(1)}" y="${(pts[0].z + 3.6).toFixed(1)}" font-size="1.3" fill="#ffd9b0" text-anchor="middle" font-weight="800" font-family="Nunito,sans-serif">FUNDO</text>`;
      o += tokens(P.map((p, i) => p.zone === 'v' ? i : -1).filter(i => i >= 0), pts, 1.25) + '</svg>';
      return o;
    }
    const pts = D.PATH, coast = [], grass = [];
    for (let k = 0; k < 90; k++) { const th = k / 90 * 6.283, r = D.coastR(th, 52.7), g = Math.min(48.6, D.coastR(th, 49.6)); coast.push((Math.cos(th) * r).toFixed(1) + ',' + (Math.sin(th) * r).toFixed(1)); grass.push((Math.cos(th) * g).toFixed(1) + ',' + (Math.sin(th) * g).toFixed(1)); }
    o += `<svg viewBox="-66 -62 132 124" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="lv"><stop offset="0" stop-color="#ffd35a"/><stop offset=".7" stop-color="#ff5a1a"/><stop offset="1" stop-color="#7a1c06"/></radialGradient></defs>
      <polygon points="${coast.join(' ')}" fill="#7fe0d6" opacity=".55" transform="scale(1.09)"/><polygon points="${coast.join(' ')}" fill="#f0deb0"/><polygon points="${grass.join(' ')}" fill="#86c46a"/>
      <circle r="38" fill="#6cb257"/><circle r="29" fill="#5a9b4e"/><circle r="24" fill="#9a8168"/><circle r="17.5" fill="#806853"/><circle r="11.5" fill="#5e4a3e"/><circle r="8" fill="url(#lv)"/>
      ${V.erupt > 0 ? '<circle r="10.5" fill="none" stroke="#ff5a1a" stroke-width="2" opacity=".8"><animate attributeName="r" values="9;15;9" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;0;.9" dur="1.6s" repeatCount="indefinite"/></circle>' : ''}
      ${(() => { const a = pts[D.RIVER], b = pts[D.RIVER + 1], th = Math.atan2((a.z + b.z) / 2, (a.x + b.x) / 2), c = Math.cos(th), s = Math.sin(th); return `<line x1="${(c * 27).toFixed(1)}" y1="${(s * 27).toFixed(1)}" x2="${(c * 57).toFixed(1)}" y2="${(s * 57).toFixed(1)}" stroke="#3aa9dc" stroke-width="3.4" stroke-linecap="round"/>`; })()}
      <polyline points="${pts.map(p => p.x.toFixed(1) + ',' + p.z.toFixed(1)).join(' ')}" fill="none" stroke="#fff6da" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`;
    pts.forEach((p, i) => { o += tile(p, D.ISLAND[i], i, 2.55, V.erupt > 0 && D.LAVA_TYPES[D.ISLAND[i].t]); });
    o += tokens(P.map((p, i) => p.zone === 'i' ? i : -1).filter(i => i >= 0), pts, 2.2) + '</svg>';
    return o;
  }

  // ===================== COMANDO =====================
  function makePad(root, opts) {
    const P = { tab: 'play', sel: null, zone: null, mg: null, words: false, pending: 0, pendT: 0, lastHtml: '' };
    root.innerHTML = `<div class="pad"><header class="pad-h"></header><main class="pad-m"></main>
      <nav class="pad-n">${[['play', '🎲', 'Jogar'], ['map', '🗺️', 'Mapa'], ['all', '👥', 'Todos'], ['rules', '📖', 'Regras']].map(([k, e, l]) => `<button data-tab="${k}"><span>${e}</span>${l}</button>`).join('')}</nav></div>`;
    const H = $('.pad-h', root), M = $('.pad-m', root), N = $('.pad-n', root), box = $('.pad', root);
    N.onclick = e => { const b = e.target.closest('button'); if (!b) return; P.tab = b.dataset.tab; P.lastHtml = ''; render(); M.scrollTop = 0; };
    function send(a, x) { P.pending = Date.now(); clearTimeout(P.pendT); P.pendT = setTimeout(() => { P.pending = 0; render(); }, 2500); opts.send(a, x || {}); render(); }
    M.addEventListener('pointerdown', e => {
      const t = e.target.closest('[data-tap]'); if (!t || !P.mg) return; e.preventDefault();
      const g = P.mg, V = opts.getView();
      if (t.dataset.tap === 'taps' && g.phase === 1) { g.n++; const c = $('#tapn', M); if (c) c.textContent = g.n; }
      else if (t.dataset.tap === 'stop' && g.phase === 1) { g.val = Math.round(performance.now() - g.t0); g.phase = 2; send('mg', { v: g.val }); }
      else if (t.dataset.tap === 'early' && g.phase < 2) { g.phase = 2; g.early = true; send('mg', { v: -1 }); }
      else if (t.dataset.tap === 'go' && g.phase < 2 && V && V.step === 'mg') { g.val = Math.round(performance.now() - g.t0); g.phase = 2; send('mg', { v: g.val }); }
    });
    M.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      const a = b.dataset.a, v = b.dataset.v;
      if (a === 'tab') { P.tab = v; render(); return; }
      if (a === 'sel') { P.sel = P.sel === +v ? null : +v; render(); return; }
      if (a === 'zone') { P.zone = v; P.sel = null; render(); return; }
      if (a === 'words') { P.words = !P.words; render(); return; }
      if (a === 'mgstart') { const g = P.mg; if (!g || g.phase !== 0) return; g.phase = 1; g.t0 = performance.now(); g.n = 0; if (g.k === 'taps') { g.tm = setTimeout(() => { if (g.phase === 1) { g.phase = 2; g.val = g.n; send('mg', { v: g.n }); } }, 6000); } render(); return; }
      const x = {}; if (v !== undefined) x.v = +v;
      send(a, x);
    };
    setInterval(() => {
      const g = P.mg; if (!g || g.phase !== 1) return; const el = $('#mgclock', M); if (!el) return; const t = (performance.now() - g.t0) / 1000;
      if (g.k === 'stop') el.textContent = t < 2 ? t.toFixed(1) + ' s' : '?? s'; else if (g.k === 'taps') el.textContent = Math.max(0, 6 - t).toFixed(1) + ' s';
    }, 80);
    setInterval(() => { const V = opts.getView(); if (V && (V.step === 'pvrun' || V.step === 'roll') && P.tab === 'play') render(); }, 500);

    function render() {
      const V = opts.getView(); if (!V) return; const me = opts.me(), p = V.players[me];
      if (!p) { H.innerHTML = ''; M.innerHTML = '<div class="wait"><span class="ic">🏝️</span>À espera…</div>'; return; }
      const mine = mustAct(V, me), lastAck = V.acks && p.cid ? (V.acks[p.cid] || 0) : 0;
      const busy = !opts.local && P.pending && P.pending > lastAck && Date.now() - P.pending < 2500;
      const st = V.ph === 'over' ? 'Fim do jogo' : mine ? 'É contigo!' : V.ph === 'play' ? `Ronda ${V.round} · vez de ${esc(nameOf(V, V.turn))}` : '';
      H.innerHTML = `${tok(p)}<div class="ph-n"><b>${esc(p.name)}</b><span>${st}</span></div><div class="ph-m">${where(p)}<br>${diceIcons(p)}${p.amulet ? ' 🧿' : ''}</div>`;
      box.classList.toggle('myturn', mine); box.classList.toggle('isbusy', !!busy);
      N.querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.tab === P.tab); b.classList.toggle('badge', b.dataset.tab === 'play' && mine && P.tab !== 'play'); });
      // estado local das provas de telemóvel
      if (V.step === 'mg' || V.step === 'mgwait') { const key = V.round + ':' + V.x.k; if (!P.mg || P.mg.key !== key) P.mg = { key, k: V.x.k, phase: 0, n: 0 }; if (V.step === 'mg' && V.x.k === 'reflex' && !P.mg.t0 && P.mg.phase < 2) { P.mg.t0 = performance.now(); } }
      else if (P.mg) { clearTimeout(P.mg.tm); P.mg = null; }
      if (V.step !== 'pv' && V.step !== 'pvrun') P.words = false;
      const html = ({ play: tabPlay, map: tabMap, all: tabAll, rules: tabRules })[P.tab](V, me, p);
      if (html !== P.lastHtml) { P.lastHtml = html; const sc = M.scrollTop; M.innerHTML = html; M.scrollTop = sc; }
    }
    const waitBox = (ic, t, s) => `<div class="wait"><span class="ic">${ic}</span><b style="font-size:19px;color:var(--ink)">${t}</b>${s ? `<div style="margin-top:6px">${s}</div>` : ''}</div>`;
    function provaCard(V, me, x, run) {
      const c = ENG.chText(x, V.players); let out = `<div class="card hot"><span class="kind">${KIND[x.k]}</span><h2>${esc(c.t)}</h2><div class="who" style="display:flex;flex-wrap:wrap;gap:5px;margin:6px 0">${whoLine(V, x)}</div><p style="font-size:17px">${esc(c.d)}</p>${c.c ? '<p class="muted">🃏 Precisa de um baralho de cartas.</p>' : ''}`;
      if (x.w) { const team = x.A && x.A.includes(me) ? 'a' : x.B && x.B.includes(me) ? 'b' : null; if (team) out += `<button class="btn sm ghost" data-a="words">${P.words ? '🙈 Esconder' : '👁️ Ver as palavras (só quem vai fazer!)'}</button>${P.words ? `<div class="words">${x['w' + team].map(i => esc(D.WORDS[x.w][i])).join('<br>')}</div>` : ''}`; }
      if (!run) out += `<div class="btns"><button class="btn big good" data-a="go">▶ Começar</button></div><div class="btns"><button class="btn sm ghost" data-a="skip" ${x.skips >= 3 ? 'disabled' : ''}>🔄 Outra prova (${3 - x.skips})</button></div>`;
      else {
        if (x.s) { const r = remaining(V, x); out += `<div class="ptimer ${r < 6000 ? 'low' : ''}">${r > 0 ? Math.ceil(r / 1000) + ' s' : '⏰ Tempo!'}</div>`; }
        out += `<div class="btns"><button class="btn big sun" data-a="fim">🏁 Acabou — votar</button></div>${x.s ? '<div class="btns"><button class="btn sm ghost" data-a="rst">⏱ Recomeçar o relógio</button></div>' : ''}`;
      }
      return out + '</div>';
    }
    function mgCard(V, me, x) {
      const g = P.mg, n = MGN[x.k], done = x.res && x.res[me] !== undefined, isP = x.who.includes(me);
      let out = `<div class="card hot"><span class="kind">Prova de telemóvel</span><h2>${n[0]} ${n[1]}</h2>`;
      if (!isP) return out + `<p>Só para quem tem comando.</p></div>`;
      if (x.k === 'reflex') {
        if (g.early || (done && x.res[me] >= 9999)) out += `<p style="font-size:19px">🚫 Queimaste a partida!</p>`;
        else if (done || g.phase === 2) out += `<p style="font-size:19px">⚡ ${g.val || x.res[me]} ms. À espera dos outros…</p>`;
        else if (V.step === 'mgwait') out += `<p>${MGD.reflex()}</p><button class="tapbtn red" data-tap="early">ESPERA…</button>`;
        else out += `<button class="tapbtn green" data-tap="go">TOCA!</button>`;
      } else if (x.k === 'unico') {
        if (done) out += `<p style="font-size:19px">Escolheste o <b>${x.res[me]}</b>. À espera dos outros…</p>`;
        else out += `<p>${MGD.unico()}</p><div class="numgrid">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="btn sun" data-a="mg" data-v="${n}">${n}</button>`).join('')}</div>`;
      } else if (x.k === 'stop') {
        if (g.phase === 0 && !done) out += `<p>${MGD.stop(x.target)}</p><button class="tapbtn" data-a="mgstart">▶ Começar</button>`;
        else if (g.phase === 1) out += `<p class="center" style="font-size:20px">Pára aos <b>${x.target} segundos</b></p><div class="ptimer" id="mgclock">0.0 s</div><button class="tapbtn sun" data-tap="stop" style="height:32vh;margin-top:10px">✋ PARAR</button>`;
        else out += `<p style="font-size:19px">Paraste aos <b>${((g.val !== undefined ? g.val : x.res[me]) / 1000).toFixed(2)} s</b> (alvo: ${x.target} s). À espera dos outros…</p>`;
      } else {
        if (g.phase === 0 && !done) out += `<p>${MGD.taps()}</p><button class="tapbtn" data-a="mgstart">▶ Começar</button>`;
        else if (g.phase === 1) out += `<div class="ptimer" id="mgclock">6.0 s</div><button class="tapbtn sun" data-tap="taps" style="margin-top:10px">🔨 <span id="tapn">0</span></button>`;
        else out += `<p style="font-size:19px">🔨 <b>${g.val !== undefined ? g.val : x.res[me]}</b> toques. À espera dos outros…</p>`;
      }
      return out + '</div>';
    }
    function tabPlay(V, me, p) {
      const x = V.x || {}, mine = mustAct(V, me), who = x.who && x.who.length === 1 ? x.who[0] : -1, wn = who >= 0 ? esc(nameOf(V, who)) : '';
      let out = '';
      if (V.ph === 'over') {
        const r = x.rank || []; out = `<div class="card"><h2>🏆 ${esc(nameOf(V, V.winner))} conquistou a ilha!</h2>${r.map((i, k) => `<div class="prow">${tok(V.players[i], 's')}<div class="gr"><b>${k + 1}.º ${esc(nameOf(V, i))}</b><small>${where(V.players[i])}</small></div></div>`).join('')}<p class="muted">Nova partida: na TV.</p></div>`;
      } else switch (V.step) {
        case 'roll': {
          if (!mine) { out = waitBox('🎲', `${wn} vai lançar os dados`, x.need === 6 ? 'Precisa de um 6.' : x.need ? `Precisa de ${x.need} ou mais.` : ''); break; }
          const txt = x.why === 'gate' ? `Guardião: só o dado normal. Precisas de <b>${x.need} ou mais</b>.` : x.why === 'final' ? `Gongo do Cume: só um <b>6</b> o faz soar!` : WHY[x.why] || WHY.move;
          const left = Math.max(0, Math.ceil((x.ms - ((V.now - x.t0) + (Date.now() - V.at))) / 1000));
          out = `<div class="card hot center"><h2>${x.why === 'final' ? '⛩️ O gongo!' : x.why === 'gate' ? '🗿 Guardião' : '🎲 A tua vez'}</h2><p>${txt}</p><div class="dicerow">${'<div class="dbig n">?</div>'.repeat(Math.min(1, x.n))}${x.n > 1 ? '<div class="dbig g">?</div>' : ''}${x.s ? '<div class="dbig s">?</div>' : ''}${'<div class="dbig b">?</div>'.repeat(x.b)}</div><button class="btn huge sun" data-a="roll">🎲 Lançar</button><p class="muted" style="font-size:13px">${left <= 30 ? `A TV lança por ti daqui a ${left} s.` : ''}</p></div>`; break;
        }
        case 'rolling': out = waitBox('🎲', `${wn} tirou ${x.sum}`, V.dice.map(d => `<span class="dbig ${d.t}" style="display:inline-flex;width:44px;height:44px;font-size:22px;margin:3px">${d.v}</span>`).join('')); break;
        case 'pick': {
          const T = { duel: ['⚔️ Duelo', 'Quem desafias? Quem ganhar avança 3, quem perder recua 3.'], swap: ['🦜 Papagaio', 'Com quem trocas de lugar?'], push: ['👉 Empurrão', 'Quem recua 3 casas?'] }[x.k];
          if (!mine) { out = waitBox(T[0].split(' ')[0], `${wn} está a escolher…`, T[0].slice(2)); break; }
          out = `<div class="card hot"><h2>${T[0]}</h2><p>${T[1]}</p><div class="opts">${x.opts.map(i => `<button class="btn" data-a="pick" data-v="${i}">${tok(V.players[i], 's')} ${esc(nameOf(V, i))} <small style="margin-left:auto;opacity:.85">${where(V.players[i])}</small></button>`).join('')}</div></div>`; break;
        }
        case 'card': case 'dare': {
          const c = D.LUCK[x.c], dare = c.a === 'dare';
          out = `<div class="card ${mine ? 'hot' : ''} center"><span class="kind">Carta da Sorte · ${wn}</span><h2>${dare ? '🎭 Prenda' : '🃏 ' + esc(c.t)}</h2><p style="font-size:18px">${esc(dare ? D.DARE[x.di] : c.d)}</p>${dare ? `<p class="muted">Fazes e avanças 3. Recusas e recuas 3.</p>` : ''}${dare && mine && V.step === 'dare' ? `<div class="btns"><button class="btn big good" data-a="dare" data-v="1">✅ Fiz!</button><button class="btn big bad" data-a="dare" data-v="0">❌ Recuso</button></div>` : ''}</div>`; break;
        }
        case 'pv': out = provaCard(V, me, x, false); break;
        case 'pvrun': out = provaCard(V, me, x, true); break;
        case 'vote': {
          const q = x.k === 'gate' ? `${esc(nameOf(V, x.solo))} passou o desafio?` : 'Quem ganhou?';
          if (!x.who.includes(me)) { out = waitBox('🗳️', 'Os outros estão a votar', x.k === 'gate' ? 'Faz olhinhos ao júri.' : ''); break; }
          if (acted(V, me)) { out = waitBox('✅', 'Voto registado', `${Object.keys(x.votes).length} de ${x.who.length} já votaram.`); break; }
          out = `<div class="card hot"><span class="kind">Votação</span><h2>🗳️ ${q}</h2><div class="opts">${x.opts.map(v => `<button class="btn ${x.k === 'gate' ? (v ? 'good' : 'bad') : ''}" data-a="vote" data-v="${v}">${voteLabel(V, x, v)}</button>`).join('')}</div><p class="muted" style="font-size:13px">Ganha a maioria. Empate: ${x.k === 'gate' ? 'passa' : 'decide o dado'}.</p></div>`; break;
        }
        case 'mgwait': case 'mg': out = mgCard(V, me, x); break;
        case 'el': {
          const n = MGN[x.k], inn = x.act.includes(me), mp = x.picks[me];
          out = `<div class="card ${mine ? 'hot' : ''}"><span class="kind">Prova de telemóvel · ronda ${x.rd}</span><h2>${n[0]} ${n[1]}</h2>`;
          if (!inn) out += `<p style="font-size:18px">👀 Estás fora desta prova. Ainda jogam: ${x.act.map(i => esc(nameOf(V, i))).join(', ')}.</p>`;
          else if (mp !== undefined) out += `<p style="font-size:19px">Escolheste <b>${ELO[x.k][mp][0]} ${ELO[x.k][mp][1]}</b>. À espera dos outros…</p>`;
          else out += `<p>${MGD[x.k]()}</p><div class="elrow">${ELO[x.k].map((o, v) => `<button class="tapbtn ${['', 'sun', 'green'][v]}" data-a="el" data-v="${v}"><span>${o[0]}</span><small>${o[1]}</small></button>`).join('')}</div>`;
          out += '</div>'; break;
        }
        case 'elres': {
          const n = MGN[x.k], inn = x.act.includes(me), ok = x.surv.includes(me), all = x.surv.length === x.act.length;
          out = `<div class="card center"><span class="kind">${n[1]} · ronda ${x.rd}</span><h2>${!inn ? '👀' : all ? '🤝 Ninguém sai' : ok ? '✅ Continuas!' : '❌ Estás fora'}</h2>${x.sum ? `<p>Saiu <b>${x.sum}</b> (${x.sum % 2 ? 'ímpar' : 'par'}).</p>` : ''}${x.c0 !== undefined ? `<p><b>${x.c0}</b> escolheram 0 · <b>${x.c1}</b> escolheram 1</p>` : ''}${x.act.map(i => `<div class="prow">${tok(V.players[i], 's')}<div class="gr" style="text-align:left"><b>${esc(nameOf(V, i))}</b></div><span style="font-size:20px">${ELO[x.k][x.picks[i]][0]} ${x.surv.includes(i) ? '✅' : '❌'}</span></div>`).join('')}</div>`; break;
        }
        case 'mgres': out = `<div class="card"><span class="kind">Resultado</span><h2>${MGN[x.k][0]} ${MGN[x.k][1]}</h2>${x.rank.map(([i, v], k) => `<div class="prow">${tok(V.players[i], 's')}<div class="gr"><b>${k + 1}.º ${esc(nameOf(V, i))}</b></div><span>${mgVal(x, v)} ${k === 0 ? '<i class="di g"></i>' : k === 1 && x.rank.length >= 3 ? '<i class="di s"></i>' : k === 2 && x.rank.length >= 4 ? '<i class="di b"></i>' : ''}</span></div>`).join('')}</div>`; break;
        case 'pvres': out = `<div class="card center"><span class="kind">Prémios da prova</span><h2>🎲 Dados desta ronda</h2>${V.players.map(q => `<div class="prow">${tok(q, 's')}<div class="gr" style="text-align:left"><b>${esc(q.name)}</b></div><span>${diceIcons(q)}</span></div>`).join('')}</div>`; break;
        case 'storm': out = waitBox('🌪️', 'Tufão!', 'A roleta escolhe quem ele leva…'); break;
        case 'river': {
          if (!mine) { out = waitBox('🌊', `${wn} está à beira do rio`, 'Pedras vermelhas ou azuis? Só um caminho aguenta.'); break; }
          out = `<div class="card hot center"><span class="kind">Paragem obrigatória</span><h2>🌊 O Rio</h2><p>Há dois caminhos de 3 pedras. Um leva-te à outra margem. O outro afunda-se e a corrente arrasta-te para o vulcão.</p><div class="elrow"><button class="tapbtn red" data-a="river" data-v="0"><span>🔴</span><small>Pedras vermelhas</small></button><button class="tapbtn" style="background:#2f6fe0" data-a="river" data-v="1"><span>🔵</span><small>Pedras azuis</small></button></div>${p.amulet ? '<p class="muted">🧿 O teu amuleto salva-te se caíres.</p>' : ''}</div>`; break;
        }
        default: out = waitBox(V.erupt > 0 ? '🌋' : '🏝️', V.round ? `Vez de ${esc(nameOf(V, V.turn))}` : 'A começar…', 'Olha para a TV.');
      }
      if (V.ph === 'play') {
        out += `<div class="card"><h4>Os teus dados nesta ronda</h4><div class="dicerow" style="justify-content:flex-start;margin:4px 0"><div class="dbig n" style="width:44px;height:44px;font-size:15px">1–6</div>${p.dn > 1 ? '<div class="dbig g" style="width:44px;height:44px;font-size:15px">1–6</div>' : ''}${p.ds ? '<div class="dbig s" style="width:44px;height:44px;font-size:15px">1–4</div>' : ''}${'<div class="dbig b" style="width:44px;height:44px;font-size:15px">1–2</div>'.repeat((p.db ? 1 : 0) + (p.extra ? 1 : 0) + (V.opts.len === 'r' ? 1 : 0))}</div>${p.amulet ? '<p>🧿 Tens um Amuleto de Pedra.</p>' : ''}${V.erupt > 0 ? `<p style="color:var(--coral)">🔥 Lava nas casas especiais por mais ${V.erupt} ronda${V.erupt > 1 ? 's' : ''}.</p>` : ''}</div>`;
        out += `<div class="card"><h4>Últimas jogadas</h4><div class="mini-log">${(V.log || []).slice().reverse().map(l => `<div>${esc(l)}</div>`).join('') || '<div class="muted">Ainda nada.</div>'}</div></div>`;
      }
      return out;
    }
    function tabMap(V, me, p) {
      const zone = P.zone || p.zone, inV = V.players.some(q => q.zone === 'v');
      let info;
      if (P.sel !== null) { const sp = (zone === 'v' ? D.VOLC : D.ISLAND)[P.sel]; if (sp) { const lava = zone === 'i' && V.erupt > 0 && D.LAVA_TYPES[sp.t], s = D.SPACE[lava ? 'lava' : sp.t]; const here = V.players.filter(q => q.zone === zone && (zone === 'v' ? q.vpos : q.pos) === P.sel).map(q => esc(q.name)).join(', '); info = `<div class="card"><h3>${s[0]} ${s[1]}${sp.t === 'warp' ? ' → casa ' + D.WARP[P.sel] : sp.v ? ' ' + sp.v : ''} <small class="muted" style="font:700 13px Nunito">· casa ${zone === 'v' ? P.sel + 1 : P.sel}</small></h3><p>${s[2]}</p>${here ? `<p class="muted">Aqui: ${here}</p>` : ''}</div>`; } }
      if (!info) {
        if (p.zone === 'v') info = `<div class="card"><h3>🌋 Estás dentro do vulcão</h3><p>Casa ${p.vpos + 1} de ${D.M}. Um <b>géiser</b> devolve-te à casa ${p.fell} da ilha. A <b>saída</b> leva-te à casa ${ENG.checkpoint(p)}${ENG.checkpoint(p) ? ' (último Guardião)' : ' (Praia)'}.</p></div>`;
        else { const ng = D.GATES[p.gates]; info = `<div class="card"><h3>🏝️ Casa ${p.pos} de ${D.GOAL}</h3><p>${p.pos === D.GOAL ? 'Estás no Cume! Na tua vez tocas o gongo.' : ng !== undefined ? (ng === p.pos ? `Estás no <b>${D.GATE_NAMES[p.gates]}</b>: na tua vez fazes o desafio.` : `Próximo Guardião: casa ${ng} (faltam ${ng - p.pos}).`) : `Já venceste os 3 Guardiões. Faltam ${D.GOAL - p.pos} casas para o Cume.`}</p><p class="muted" style="font-size:13px">Toca numa casa para ver o que faz.</p></div>`; }
      }
      const sw = (inV || p.zone === 'v') ? `<div class="btns" style="margin:0 0 10px"><button class="btn sm ${zone === 'i' ? '' : 'ghost'}" data-a="zone" data-v="i">🏝️ Ilha</button><button class="btn sm ${zone === 'v' ? '' : 'ghost'}" data-a="zone" data-v="v">🌋 Vulcão${inV ? ' (' + V.players.filter(q => q.zone === 'v').length + ')' : ''}</button></div>` : '';
      const leg = (zone === 'v' ? ['geyser', 'vback', 'exit'] : ['+', '-', 'again', 'warp', 'luck', 'duel', 'storm', 'swap', 'volc', 'skull', 'river', 'gate', 'goal']).map(k => `<span><i class="sq" style="background:${D.SPCOL[k]}">${D.SPACE[k][0]}</i>${D.SPACE[k][1]}</span>`).join('');
      return `${sw}<div class="mapwrap ${zone === 'v' ? 'volc' : ''}">${mapSvg(V, me, zone, P.sel)}</div><div style="height:10px"></div>${info}<div class="card"><h4>Legenda</h4><div class="legend">${leg}</div></div>`;
    }
    function tabAll(V, me) {
      const order = V.players.map((q, i) => i).sort((a, b) => prog(V.players[b]) - prog(V.players[a]));
      return `<div class="card"><h4>Classificação · ronda ${V.round}</h4>${order.map((i, k) => { const q = V.players[i]; return `<div class="prow ${V.turn === i ? 'turn' : ''}">${tok(q, 's')}<div class="gr"><b>${k + 1}.º ${q.bot ? '🤖 ' : ''}${esc(q.name)}${i === me ? ' (tu)' : ''}</b><small>${where(q)} · 🗿 ${q.gates}/3${q.amulet ? ' · 🧿' : ''}</small><div class="bar"><i style="width:${Math.max(2, (q.zone === 'v' ? ENG.checkpoint(q) : q.pos) / D.GOAL * 100)}%;${q.zone === 'v' ? 'background:var(--coral)' : ''}"></i></div></div><span>${diceIcons(q)}</span></div>`; }).join('')}</div>
        <div class="card"><h4>Últimas jogadas</h4><div class="mini-log">${(V.log || []).slice().reverse().map(l => `<div>${esc(l)}</div>`).join('')}</div></div>`;
    }
    function tabRules() { return `<h3 style="margin:2px 0 4px;color:var(--sea2)">📖 Regras da Ilha do Vulcão</h3><p class="muted" style="font-size:13px;margin:0 0 8px">Toca num tema para o abrir.</p>${D.rulesHtml()}`; }
    return { render, P };
  }
  const prog = p => p.zone === 'i' ? p.pos : ENG.checkpoint(p) - .5 + p.vpos / 100;
  const mgVal = (x, v) => v === null || v === undefined ? '' : x.k === 'unico' ? 'n.º ' + v + (x.rank.filter(r => r[1] === v).length > 1 ? ' (repetido)' : '') : x.k === 'stop' ? (v >= 99999 ? '—' : (v / 1000).toFixed(2) + ' s') : x.k === 'reflex' ? (v >= 9999 ? '🚫' : v + ' ms') : v + ' toques';

  // ===================== REDE =====================
  const Net = {
    room: null, r: null, ok: false,
    async connect(code) {
      if (!window.claude || !window.claude.use) return false;
      try { this.room = await window.claude.use('room'); } catch (e) { this.room = null; }
      if (!this.room) return false;
      try { this.r = await this.room.join('vulcao-' + code); } catch (e) { this.r = this.room; }
      this.ok = true; return true;
    },
    async rejoin(code) {
      if (!this.room) return false;
      try { if (this.r && this.r !== this.room && this.r.leave) await this.r.leave(); } catch (e) { }
      try { this.r = await this.room.join('vulcao-' + code); } catch (e) { this.r = this.room; }
      return true;
    },
  };

  let mode = null;
  function start() {
    const small = innerWidth < 760, hub = !!window.__SALA_HUB;
    $('#start').classList.add('show');
    $('#start').innerHTML = `<div class="st-box"><div class="logo">Ilha do<br>Vulcão<small>sobe · desafia · não caias</small></div><p class="tag">Corrida até ao cume com provas da vida real, duelos, tufões e um vulcão com mau feitio. 2 a 8 jogadores, com bots.</p>
      <button class="btn huge ${small && !hub ? 'ghost' : 'sun'}" id="goTV">📺 Este ecrã é a TV<small>ilha em 3D, provas e animações</small></button>
      <button class="btn huge ${small && !hub ? 'sun' : 'ghost'}" id="goPad">📱 Este é o meu comando<small>dados, mapa, votos e regras</small></button>
      <p class="muted">Abre esta página na TV (ou no portátil ligado à TV) e no telemóvel de cada jogador.</p></div>`;
    $('#goTV').onclick = () => { Sound.unlock(); startTV(); };
    $('#goPad').onclick = () => { Sound.unlock(); startPad(); };
  }

  // ===================== TV =====================
  const lastN = {}, acks = {}, padSeen = {}, askedClaim = {}, discAt = {};
  let pushQ = false, localPad = null, localSel = -1, hb = 0, lastSent = 0, sendT = null, flat = false;
  const T3 = () => (!flat && window.TV3D && window.TV3D.ready) ? window.TV3D : null;
  const sleep = ms => new Promise(r => setTimeout(r, ms * (S.opts.speed || 1)));
  const view = () => ENG.unsnap(ENG.snap(acks));
  let bannerTok = 0;
  function showBanner(t, s, kind) { const b = $('#banner'); bannerTok++; b.className = 'show ' + (kind || 'info'); $('h1', b).textContent = t; $('p', b).textContent = s || ''; $('p', b).style.display = s ? '' : 'none'; return bannerTok; }
  function hideBanner(tk) { if (tk === undefined || tk === bannerTok) $('#banner').classList.remove('show'); }
  async function banner(t, s, kind, ms) { const tk = showBanner(t, s, kind); await sleep(ms || 1600); hideBanner(tk); await sleep(180); }
  function cutov(html, on) { const c = $('#cutov'); if (html !== null) c.innerHTML = html; c.classList.toggle('show', on !== false); }
  const c3 = (name, o, ms) => T3() ? T3().cut(name, o) : sleep(ms || 900);
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

  const TVA = {
    syncAll() { if (T3()) T3().syncAll(); },
    async turnFx(pi) { const p = S.players[pi]; const tk = showBanner(`Vez de ${p.name}`, p.zone === 'v' ? 'Dentro do vulcão' : p.pos === D.GOAL ? 'No Cume: toca o gongo!' : '', 'info'); if (T3()) await T3().focus(pi); else await sleep(700); await sleep(500); hideBanner(tk); },
    banner,
    async focus(pi) { if (T3()) await T3().focus(pi); else await sleep(400); },
    async hop(pi, sp) { Sound.hop(); if (T3()) await T3().hop(pi, sp); else await sleep(260); },
    async rollDice(pi, out, sum, why, need) {
      if (T3()) await T3().rollDice(out); else await sleep(700);
      const el = $('#dicesum'); const pn = S.players[pi] ? esc(S.players[pi].name) : ''; el.innerHTML = `${sum}<small>${why === 'pi' ? (sum % 2 ? 'ÍMPAR' : 'PAR') : need ? `${pn} precisava de ${need === 6 ? 'um 6' : need + '+'} ${sum >= need ? '✅' : '❌'}` : out.length > 1 ? out.map(o => o.v).join(' + ') : pn}</small>`; el.classList.add('show');
      await sleep(need ? 1500 : 1000); el.classList.remove('show'); if (T3()) await T3().clearDice();
    },
    async cut(name, o) {
      const nm = i => S.players[i] ? S.players[i].name : '';
      switch (name) {
        case 'intro': $('#title').classList.add('show'); await c3('intro', o, 2500); $('#title').classList.remove('show'); return;
        case 'round': { const p = banner(`Ronda ${o.n}`, o.erupt > 0 ? `🔥 Lava nas casas especiais por mais ${o.erupt} ronda${o.erupt > 1 ? 's' : ''}` : '', o.erupt > 0 ? 'lava' : 'info', 1500); await c3('round', o, 300); await p; return; }
        case 'prova': if (T3()) T3().orbit(96, 40); cutov(`<div class="pbox"><div class="k">${o.duel ? 'Duelo no telemóvel' : 'Prova da ronda'}</div><h1>${o.k ? MGN[o.k][0] + ' ' : ''}${esc(o.t)}</h1><div class="d">${o.kind === 'tel' ? (o.k ? esc(MGD[o.k](4)) .replace('dos 4 segundos', 'do tempo pedido') : '') + '<br>📱 Peguem nos telemóveis!' : '🤹 Prova da vida real: larguem os telemóveis!'}</div></div>`); await sleep(o.kind === 'tel' ? 4200 : 2400); cutov(null, false); return;
        case 'prizes': {
          cutov(`<div class="pbox"><div class="k">Prémios da prova</div><h1>🎲 Dados desta ronda</h1><div class="ranklist">${S.players.map((p, i) => `<div class="r" style="${o.w.includes(i) ? '' : 'background:#eef6f7'}">${tok(p, 's')}<b>${p.bot ? '🤖 ' : ''}${esc(p.name)}</b><span>${p.dn > 1 ? '🥇 dado de ouro' : p.ds ? '🥈 dado de prata' : p.db ? '🥉 dado de bronze' : 'dado normal'} ${diceIcons(p)}</span></div>`).join('')}</div></div>`);
          await sleep(3400); cutov(null, false); return;
        }
        case 'rank': cutov(`<div class="pbox"><div class="k">${MGN[o.k][0]} ${MGN[o.k][1]}${o.k === 'stop' ? ` · alvo ${o.target} s` : ''}</div><h1>Classificação</h1><div class="ranklist">${o.rank.map(([i, v], k) => `<div class="r">${tok(S.players[i], 's')}<b>${k + 1}.º ${S.players[i].bot ? '🤖 ' : ''}${esc(nm(i))}</b><span>${mgVal(o, v)} ${k === 0 ? '🥇' : k === 1 && o.rank.length >= 3 ? '🥈' : k === 2 && o.rank.length >= 4 ? '🥉' : ''}</span></div>`).join('')}</div></div>`); await sleep(4600); cutov(null, false); return;
        case 'card': { const c = D.LUCK[o.c], dare = c.a === 'dare'; if (T3()) T3().focus(o.who[0]); cutov(`<div class="cardbig"><div class="e">${dare ? '🎭' : '🃏'}</div><h2>${dare ? 'Prenda!' : esc(c.t)}</h2><p>${esc(dare ? D.DARE[o.di] : c.d)}</p></div>`); await sleep(dare ? 1800 : 3000); cutov(null, false); return; }
        case 'wheel': {
          const n = o.list.length, seg = 360 / n, R = 100, idx = o.list.indexOf(o.v), rad = d => (d - 90) * Math.PI / 180;
          const segs = o.list.map((pi, k) => {
            const p = S.players[pi], a0 = rad(k * seg), a1 = rad((k + 1) * seg), mid = (k + .5) * seg - 90;
            const shape = n === 1 ? `<circle r="${R}" fill="${D.PCOLORS[p.col]}"/>` : `<path d="M0 0 L${(Math.cos(a0) * R).toFixed(2)} ${(Math.sin(a0) * R).toFixed(2)} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${(Math.cos(a1) * R).toFixed(2)} ${(Math.sin(a1) * R).toFixed(2)} Z" fill="${D.PCOLORS[p.col]}" stroke="#fff" stroke-width="1.6"/>`;
            return `${shape}<g transform="rotate(${mid.toFixed(2)})"><circle cx="78" r="${n > 6 ? 9 : 12}" fill="rgba(255,255,255,.92)"/><text x="78" y="${n > 6 ? 4 : 5.5}" font-size="${n > 6 ? 11 : 15}" text-anchor="middle">${hatE(p.hat)}</text><text x="40" y="3.5" font-size="${n > 6 ? 8 : 10.5}" font-weight="900" text-anchor="middle" fill="#fff" stroke="rgba(0,0,0,.55)" stroke-width="2.2" paint-order="stroke" font-family="Nunito,sans-serif">${esc(p.name)}</text></g>`;
          }).join('');
          cutov(`<div class="wheelbox"><div class="k">${esc(o.sub)}</div><h1>${o.t}</h1><div class="wheelwrap"><div class="wptr">▼</div><svg id="wheelsvg" viewBox="-106 -106 212 212"><circle r="105" fill="#fff"/><g>${segs}</g><circle r="13" fill="#ffc93c" stroke="#fff" stroke-width="3"/></svg></div><div class="wres" id="wres">&nbsp;</div></div>`);
          const sp = S.opts.speed || 1, dur = 4600 * sp, w = $('#wheelsvg');
          const rot = 360 * 6 - (idx + .5) * seg + (Math.random() - .5) * seg * .5;
          await new Promise(r => setTimeout(r, 350));
          w.style.transition = `transform ${dur}ms cubic-bezier(.12,.62,.1,1)`; w.style.transform = `rotate(${rot}deg)`;
          let tk = 0; const tick = () => { if (tk > dur * .92) return; Sound.tick(); const gap = 55 + Math.pow(tk / dur, 2.4) * 420; tk += gap; setTimeout(tick, gap); }; tick();
          await new Promise(r => setTimeout(r, dur + 250));
          Sound.bell(); const wr = $('#wres'); if (wr) { wr.innerHTML = `${tok(S.players[o.v], 's')} ${esc(nm(o.v))}`; wr.classList.add('show'); }
          await sleep(1700); cutov(null, false); return;
        }
        case 'elres': {
          const x = o, n = MGN[x.k], all = x.surv.length === x.act.length;
          cutov(`<div class="pbox"><div class="k">${n[0]} ${n[1]} · ronda ${x.rd}</div><h1>${x.sum ? `Saiu ${x.sum}: ${x.sum % 2 ? 'ímpar' : 'par'}` : x.c0 !== undefined ? `${x.c0} × “0” · ${x.c1} × “1”` : all ? 'Empate!' : 'Resultado'}</h1><div class="who">${x.act.map(i => `<span class="pch ${x.surv.includes(i) && !all ? 'done' : ''}" style="--c:${D.PCOLORS[S.players[i].col]};${x.surv.includes(i) ? '' : 'opacity:.45'}">${tok(S.players[i], 's')}${esc(nm(i))} <b style="font-size:1.3em">${ELO[x.k][x.picks[i]][0]}</b></span>`).join('')}</div><div class="foot">${x.draw ? 'Demasiados empates: a sorte cortou o grupo a meio.' : all ? 'Ninguém sai. Outra vez!' : x.surv.length === 1 ? `🏆 ${esc(nm(x.surv[0]))} ganha!` : `Continuam: ${x.surv.map(i => esc(nm(i))).join(', ')}`}</div></div>`);
          await sleep(3200); cutov(null, false); return;
        }
        case 'duel': if (T3()) T3().focus(o.b); await banner('⚔️ Duelo!', `${nm(o.a)} contra ${nm(o.b)}`, 'warn', 1900); return;
        case 'duelEnd': if (T3()) T3().focus(o.w); await banner(`${nm(o.w)} venceu!`, `Avança 3 · ${nm(o.l)} recua 3`, 'good', 1900); return;
        case 'space': { const s = D.SPACE[o.t]; await banner(`${s[0]} ${s[1]}`, '', o.t === '-' || o.t === 'skull' || o.t === 'vback' ? 'bad' : 'info', 1000); return; }
        case 'lava': { const p = banner('🔥 Lava!', `${nm(o.pi)} recua 4`, 'lava', 1400); await c3(name, o); await p; return; }
        case 'amulet': { const p = banner('🧿 Amuleto de Pedra!', `Salvou ${nm(o.pi)} da Caveira`, 'good', 1700); await c3(name, o); await p; return; }
        case 'erupt': { const tk = showBanner('🌋 ERUPÇÃO!', 'As casas especiais viram lava durante 3 rondas', 'lava'); await c3(name, o, 2500); hideBanner(tk); return; }
        case 'cool': { const p = banner('O vulcão adormeceu', 'A lava arrefeceu', 'good', 2200); await c3(name, o); await p; return; }
        case 'quake': { const p = banner('Sismo!', 'Os outros recuam 2', 'bad', 1500); await c3(name, o); await p; return; }
        case 'fall': { const tk = showBanner('💀 Caveira!', `${nm(o.pi)} cai dentro do vulcão`, 'bad'); await c3(name, o, 1500); hideBanner(tk); return; }
        case 'geyser': { const tk = showBanner('♨️ Géiser!', `${nm(o.pi)} volta à ilha`, 'good'); await c3(name, o, 1500); hideBanner(tk); return; }
        case 'exit': { const tk = showBanner('🚪 Saída da gruta', `${nm(o.pi)} escapou do vulcão`, 'good'); await c3(name, o, 1500); hideBanner(tk); return; }
        case 'swap': { const tk = showBanner('🦜 Troca!', `${nm(o.a)} ⇄ ${nm(o.b)}`, 'warn'); await c3(name, o, 1500); hideBanner(tk); return; }
        case 'riverIntro': { const p = banner('🌊 O Rio', `${nm(o.pi)} tem de escolher: pedras vermelhas ou azuis?`, 'warn', 2000); await c3(name, o, 600); await p; return; }
        case 'river': { await c3(name, o, 1200); if (!o.ok) await banner('Splash!', o.saved ? 'O amuleto puxa-o para a margem' : `A corrente leva ${nm(o.pi)} para o vulcão`, o.saved ? 'good' : 'bad', 1700); return; }
        case 'warp': { const tk = showBanner('🌀 Portal!', `${nm(o.pi)} ${o.to > o.from ? 'salta ' + (o.to - o.from) + ' casas para a frente' : 'recua ' + (o.from - o.to) + ' casas'}`, o.to > o.from ? 'good' : 'bad'); await c3(name, o, 1500); hideBanner(tk); return; }
        case 'gate': { const p = banner('🗿 ' + D.GATE_NAMES[o.gi], `${nm(o.pi)} precisa de ${o.need} ou mais para passar`, 'warn', 1900); await c3(name, o); await p; return; }
        case 'gateOpen': { const p = banner('Passou!', 'O Guardião abre caminho', 'good', 1600); await c3(name, o); await p; return; }
        case 'gateFail': { const p = banner('Não passou!', 'Perde a vez e tenta na próxima ronda', 'bad', 1800); await c3(name, o); await p; return; }
        case 'summit': { const p = banner('⛩️ O Cume!', `${nm(o.pi)} precisa de um 6 para tocar o gongo`, 'warn', 2000); await c3(name, o); await p; return; }
        case 'win': {
          $('#panel').classList.remove('show'); await c3('win', o, 600); await banner(`🏆 ${nm(o.rank[0])} ganhou!`, 'Conquistou a Ilha do Vulcão', 'good', 4200);
          if (S.ph !== 'over') return;
          cutov(`<div class="podium"><h1>🏆 ${esc(nm(o.rank[0]))}</h1><div class="ranklist">${o.rank.map((i, k) => `<div class="r">${tok(S.players[i], 's')}<b>${k + 1}.º ${esc(nm(i))}</b><span>${where(S.players[i])}</span></div>`).join('')}</div><div class="btns"><button class="btn big good" id="again">🔁 Nova partida</button></div></div>`);
          $('#again').onclick = () => { cutov(null, false); ENG.backToLobby(); if (T3()) T3().cut('overview'); renderLobby(); };
          return;
        }
        default: await c3(name, o);
      }
    },
  };

  async function startTV() {
    mode = 'tv'; $('#start').classList.remove('show'); $('#tv').classList.add('show');
    S.code = String(1000 + Math.floor(Math.random() * 9000));
    ENG.onPush = onPush; ENG.TV = TVA; ENG.snd = n => { try { if (Sound[n]) Sound[n](); } catch (e) { } };
    const sp = +LS.get('vulcao-speed'); if (sp) S.opts.speed = sp;
    renderLobby();
    try {
      if (/[?&]nogl=1/.test(location.search)) throw new Error('sem 3D (teste)');
      await loadScript('scene.bundle.js');
      await window.TV3D.init($('#three'), { players: () => S.players, quality: LS.get('vulcao-q') || 'alta', autoQ: LS.get('vulcao-qauto') !== '0', onQuality: (q, auto) => { LS.set('vulcao-q', q); const s = $('#oq'); if (s) s.value = q; if (auto) { const el = $('#notice'); el.innerHTML = '🎛️ Baixei a qualidade dos gráficos para o jogo correr fluido neste ecrã.'; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 5000); } } });
      window.TV3D.setSpeed(S.opts.speed);
    } catch (e) { console.error(e); flat = true; }
    $('#loading').classList.add('hide'); Sound.sea();
    const ok = await Net.connect(S.code);
    if (ok) Net.r.onPeers(ch => onPeers(ch.peers));
    $('#netstate').innerHTML = ok ? '📶 Telemóveis: leiam o QR' : '⚠️ Sem ligação aos telemóveis aqui: joguem todos neste ecrã';
    renderLobby(); onPush();
    setInterval(() => { hb++; if (Net.ok) sendState(true); checkDisconnected(); }, 2500);
    setInterval(() => { if (S.ph === 'play') { tvPanel(); tvTop(); } }, 250);
  }
  function onPush() {
    if (pushQ) return; pushQ = true;
    setTimeout(() => { pushQ = false; sendState(); tvHud(); renderLocalPad(); if (S.ph === 'lobby') renderLobby(); }, 16);
  }
  function sendState(force) {
    if (!Net.ok) return;
    const now = Date.now(); if (!force && now - lastSent < 80) { clearTimeout(sendT); sendT = setTimeout(() => sendState(), 90); return; }
    lastSent = now;
    const st = ENG.snap(acks);
    Net.r.presence({ role: 'tv', code: S.code, hb, st }).catch(() => { });
  }
  const freeColor = () => D.PCOLORS.findIndex((_, c) => !S.players.some(p => p.col === c));
  const freeHat = pref => (pref >= 0 && pref < D.HATS.length && !S.players.some(p => p.hat === pref)) ? pref : D.HATS.findIndex((_, h) => !S.players.some(p => p.hat === h));
  function structChanged() { if (T3()) T3().syncAll(); ENG.push(); }
  function onPeers(peers) {
    const seen = {};
    peers.forEach(peer => {
      const pr = peer.presence || {}; if (pr.role !== 'pad' || pr.code !== S.code || typeof pr.cid !== 'string') return;
      const cid = pr.cid.slice(0, 16); seen[cid] = true;
      let pi = S.players.findIndex(p => p.cid === cid);
      if (S.ph === 'lobby' && pr.join && typeof pr.join.nm === 'string') {
        const nm = pr.join.nm.trim().slice(0, 12) || 'Jogador'; const ht = pr.join.ht | 0;
        if (pi < 0 && S.players.length < D.MAXP) { S.players.push(ENG.newPlayer({ name: nm, hat: freeHat(ht), col: freeColor(), cid })); Sound.bell(); structChanged(); }
        else if (pi >= 0) { const p = S.players[pi]; const okHat = p.hat === ht || !S.players.some((q, k) => k !== pi && q.hat === ht); if (p.name !== nm || (p.hat !== ht && okHat)) { p.name = nm; if (okHat && ht >= 0 && ht < D.HATS.length) p.hat = ht; structChanged(); } }
        pi = S.players.findIndex(p => p.cid === cid);
      }
      if (S.ph !== 'lobby' && pi < 0 && typeof pr.claim === 'number') {
        const q = S.players[pr.claim];
        const grant = () => { const old = q.cid; q.cid = cid; q.local = false; q.bot = false; delete padSeen[old]; lastN[cid] = (pr.cmd && pr.cmd.n) || 0; ENG.log(`📱 ${q.name} voltou a ligar o comando.`); Sound.bell(); banner('Comando ligado', `${q.name} está de volta`, 'good', 1400); structChanged(); };
        if (q && q.bot && !q.wasHuman) { }
        else if (q && (q.local || q.bot || !padSeen[q.cid])) { grant(); pi = pr.claim; }
        else if (q && !askedClaim[cid + ':' + pr.claim]) { askedClaim[cid + ':' + pr.claim] = 1; showConfirm(`Um telemóvel quer retomar o lugar de ${q.name}. O comando antigo ainda parece ligado. Deixar trocar?`, grant); }
      }
      const c = pr.cmd;
      if (pi >= 0 && c && typeof c.n === 'number' && c.n > (lastN[cid] || 0)) { lastN[cid] = c.n; acks[cid] = c.n; ENG.handleCmd(pi, c); ENG.push(); }
    });
    Object.keys(padSeen).forEach(k => { if (!seen[k]) delete padSeen[k]; }); Object.assign(padSeen, seen);
    if (S.ph === 'lobby') { const before = S.players.length; S.players = S.players.filter(p => p.local || p.bot || seen[p.cid]); if (S.players.length !== before) structChanged(); }
    tvHud();
  }
  function renderLobby() {
    const L = $('#lobby'); if (S.ph !== 'lobby') { L.classList.remove('show'); return; } L.classList.add('show');
    if (!L.dataset.built) {
      L.dataset.built = 1;
      L.innerHTML = `<div class="lb-l"><div class="logo" style="font-size:44px">Ilha do<br>Vulcão</div><div class="code-l">Código da sala</div><div class="code" id="lbcode"></div>
        <div id="qr"></div><ol class="howto"><li>Lê o QR com o telemóvel</li><li>Toca em <b>“Este é o meu comando”</b></li><li>Escreve o código e escolhe o teu chapéu</li></ol><div id="netstate" style="color:#a9cbd3;font-size:13px;font-weight:700">A ligar…</div></div>
        <div class="lb-r"><h2>Náufragos</h2><div id="lbplayers"></div>
        <div class="addlocal"><input id="lname" maxlength="12" placeholder="Jogador sem telemóvel"><button class="btn sm" id="ladd">+ Jogar neste ecrã</button></div>
        <div class="addlocal"><button class="btn sm sun" id="badd" style="flex:1">🤖 + Adicionar bot</button><button class="btn sm ghost" id="bfill" style="flex:1;color:#fff;box-shadow:inset 0 0 0 2px rgba(255,255,255,.6)">Completar até 4 com bots</button></div>
        <h3>Regras da casa</h3>
        <label class="opt">Provas <select id="omode"><option value="mix">Vida real + telemóvel</option><option value="real">Só da vida real</option><option value="tel">Só de telemóvel</option></select></label>
        <label class="opt"><input type="checkbox" id="ocards" checked> Temos um baralho de cartas à mão</label>
        <label class="opt">Duração <select id="olen"><option value="n">Normal (cerca de 80 min)</option><option value="r">Rápida: todos levam +1 dado de bronze (45 min)</option></select></label>
        <label class="opt">Ritmo das animações <select id="ospeed"><option value="1.3">Calmo</option><option value="1" selected>Normal</option><option value="0.7">Rápido</option></select></label>
        <label class="opt">Gráficos <select id="oq"><option value="alta">Alta (sombras, reflexos, brilho)</option><option value="media">Média</option><option value="leve">Leve (ecrãs lentos)</option></select></label>
        <button class="btn huge good" id="gostart" style="margin-top:12px">🌋 Começar a subida</button><button class="btn sm ghost" id="lbrules" style="margin-top:8px;width:100%;color:#fff;box-shadow:inset 0 0 0 2px rgba(255,255,255,.6)">📖 Ler as regras</button><div id="lbhint"></div></div>`;
      $('#lbcode').textContent = S.code;
      if (window.QRCode) { try { new QRCode($('#qr'), { text: GAME_URL, width: 170, height: 170, colorDark: '#06222b', colorLight: '#ffffff' }); } catch (e) { } }
      const addBot = () => { if (S.players.length >= D.MAXP) return; const free = D.BOTNAMES.filter(n => !S.players.some(p => p.name === n)); S.players.push(ENG.newPlayer({ name: free[Math.floor(Math.random() * free.length)] || 'Bot ' + (S.players.length + 1), hat: freeHat(-1), col: freeColor(), cid: 'B' + Math.random().toString(36).slice(2, 8), bot: true })); };
      $('#ladd').onclick = () => { if (S.players.length >= D.MAXP) return; const nm = ($('#lname').value.trim() || ('Jogador ' + (S.players.length + 1))).slice(0, 12); S.players.push(ENG.newPlayer({ name: nm, hat: freeHat(-1), col: freeColor(), cid: 'L' + Math.random().toString(36).slice(2, 8), local: true })); $('#lname').value = ''; structChanged(); };
      $('#badd').onclick = () => { addBot(); Sound.bell(); structChanged(); };
      $('#bfill').onclick = () => { while (S.players.length < 4) addBot(); Sound.bell(); structChanged(); };
      $('#omode').onchange = e => { S.opts.mode = e.target.value; ENG.push(); };
      $('#ocards').onchange = e => { S.opts.cards = e.target.checked; ENG.push(); };
      $('#olen').onchange = e => { S.opts.len = e.target.value; ENG.push(); };
      $('#ospeed').value = String(S.opts.speed); $('#ospeed').onchange = e => { S.opts.speed = +e.target.value; LS.set('vulcao-speed', e.target.value); if (T3()) T3().setSpeed(S.opts.speed); };
      $('#oq').value = LS.get('vulcao-q') || 'alta'; $('#oq').onchange = e => { LS.set('vulcao-q', e.target.value); LS.set('vulcao-qauto', '0'); if (T3()) T3().setQuality(e.target.value); };
      $('#lbrules').onclick = showRulesTV;
      $('#gostart').onclick = () => { Sound.unlock(); if (S.players.length < 2) return; if (T3()) T3().setSpeed(S.opts.speed); $('#lobby').classList.remove('show'); try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => { }); } catch (e) { } ENG.startGame(); };
      L.addEventListener('click', e => {
        const b = e.target.closest('[data-rm]'); if (b) { S.players.splice(+b.dataset.rm, 1); structChanged(); }
        const t = e.target.closest('[data-ht]'); if (t) { const pi = +t.dataset.ht, p = S.players[pi]; if (!p || (!p.local && !p.bot)) return; let k = (p.hat + 1) % D.HATS.length; while (S.players.some((q, j) => j !== pi && q.hat === k)) k = (k + 1) % D.HATS.length; p.hat = k; structChanged(); }
      });
    }
    $('#lbplayers').innerHTML = S.players.length ? S.players.map((p, k) => `<div class="lbp"><span ${p.local || p.bot ? `data-ht="${k}" title="Mudar chapéu" style="cursor:pointer"` : ''}>${tok(p)}</span><b>${esc(p.name)}</b><span class="muted">${D.HATS[p.hat][1]} · ${p.bot ? '🤖 bot' : p.local ? '🖥️ neste ecrã' : '📱 ligado'}</span><button class="x" data-rm="${k}">✕</button></div>`).join('') : '<p style="color:#a9cbd3">Ainda ninguém deu à costa.</p>';
    $('#gostart').disabled = S.players.length < 2;
    const h = S.players.filter(p => !p.bot).length;
    $('#lbhint').textContent = S.players.length < 2 ? 'São precisos pelo menos 2 jogadores (podem ser bots).' : `${S.players.length} jogadores prontos.${h < 2 ? ' Com menos de 2 humanos só há provas de telemóvel.' : ''}`;
  }
  function tvTop() {
    const T = $('#tvtop'), w = ENG.waiting(), stuck = w && Date.now() - (w.since || 0) > 12000;
    const html = `<span class="chip">Sala <b>${S.code}</b></span>${S.ph === 'play' ? `<span class="chip">Ronda <b>${S.round}</b></span>` : ''}${S.erupt > 0 ? `<span class="chip hot">🔥 Lava: ${S.erupt} ronda${S.erupt > 1 ? 's' : ''}</span>` : ''}<span class="sp"></span>${S.ph === 'play' && w ? `<button class="chip btnc" data-t="force" style="${stuck ? 'background:var(--sun)' : ''}">⏭ Avançar</button>` : ''}<button class="chip btnc" data-t="rules">📖 Regras</button><button class="chip btnc" data-t="snd">${Sound.isOn() ? '🔊' : '🔇'}</button><button class="chip btnc" data-t="fs">⛶</button>${S.ph === 'play' ? '<button class="chip btnc" data-t="end">🏁 Terminar</button>' : ''}`;
    if (T.dataset.h !== html) { T.dataset.h = html; T.innerHTML = html; }
    if (!T.onclick) T.onclick = e => {
      const b = e.target.closest('[data-t]'); if (!b) return; const t = b.dataset.t;
      if (t === 'force') ENG.force();
      if (t === 'rules') showRulesTV();
      if (t === 'snd') { Sound.toggle(); T.dataset.h = ''; tvTop(); }
      if (t === 'fs') { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) { } }
      if (t === 'end') showConfirm('Terminar o jogo agora? Ganha quem estiver mais acima na ilha.', () => ENG.endGame());
    };
  }
  function tvHud() {
    if (mode !== 'tv') return;
    const H = $('#hud'); H.classList.toggle('many', S.players.length > 5);
    H.style.display = S.ph === 'lobby' ? 'none' : '';
    H.innerHTML = S.players.map((p, k) => {
      const conn = p.bot ? '🤖' : p.local ? '🖥️' : (padSeen[p.cid] ? '📱' : '<span class="off">📵</span>');
      return `<div class="hp ${S.turn === k && S.ph === 'play' ? 'turn' : ''}" data-hp="${k}">${tok(p)}<div><b>${esc(p.name)}</b> <small>${conn}${p.amulet ? ' 🧿' : ''}</small><div class="hm">${where(p)} ${diceIcons(p)}</div></div></div>`;
    }).join('');
    H.onclick = e => {
      const c = e.target.closest('[data-hp]'); if (!c || S.ph !== 'play') return; const k = +c.dataset.hp, p = S.players[k]; if (!p) return;
      if (p.bot && !p.wasHuman) return;
      showChoice(`O que fazer com ${p.name}?`, [
        ...(!p.local && !p.bot ? [['🖥️ Jogar por ele neste ecrã', () => { p.local = true; ENG.log(`🖥️ ${p.name} passa a jogar no ecrã da TV.`); ENG.push(); }]] : []),
        ...(!p.bot ? [['🤖 Pôr um bot a jogar por ele', () => { p.bot = true; p.wasHuman = true; p.local = false; ENG.log(`🤖 Um bot passa a jogar por ${p.name}.`); structChanged(); ENG.poke(); }]] : []),
        ...(p.local || p.bot ? [['📱 Devolver ao telemóvel', () => { p.local = false; p.bot = false; structChanged(); }]] : []),
      ]);
    };
    tvTop(); tvPanel();
    $('#tvlog').innerHTML = S.ph === 'play' ? S.log.slice(-3).map(l => `<div>${esc(l)}</div>`).join('') : '';
    if (flat) { const el = $('#three'); const h = `<div style="position:absolute;inset:6vh 20vw 6vh 4vw" class="mapwrap">${mapSvg(view(), -1, 'i', null)}</div>`; if (el.dataset.h !== h) { el.dataset.h = h; el.innerHTML = h; } }
  }
  let timeUp = '';
  function tvPanel() {
    const P = $('#panel'), pr = $('#prompt'); let html = '', prompt = '';
    if (S.ph === 'play' && S.x) {
      const V = view(), x = V.x;
      const chips = list => `<div class="who">${list.map(i => `<span class="pch ${acted(V, i) ? 'done' : ''}" style="--c:${D.PCOLORS[V.players[i].col]}">${tok(V.players[i], 's')}${esc(nameOf(V, i))}${acted(V, i) ? ' ✅' : ''}</span>`).join('')}</div>`;
      switch (S.step) {
        case 'pv': case 'pvrun': {
          const c = ENG.chText(x, V.players); let tm = '';
          if (S.step === 'pvrun' && x.s) { const r = remaining(V, x); tm = `<div class="timer ${r < 6000 ? 'low' : ''}">${r > 0 ? Math.ceil(r / 1000) : '⏰'}</div>`; const key = x.id + ':' + x.t0; if (r <= 0 && timeUp !== key) { timeUp = key; Sound.time(); } }
          html = `<div class="pbox"><div class="k">${KIND[x.k]}${x.k === 'gate' ? ' · ' + D.GATE_NAMES[x.gi] : ''}</div><h1>${esc(c.t)}</h1><div class="who">${whoLine(V, x)}</div><div class="d">${esc(c.d)}</div>${tm}<div class="foot">${S.step === 'pv' ? `📱 Qualquer jogador toca em <b>Começar</b>${c.c ? ' · 🃏 precisa de baralho' : ''} · não dá? <b>Outra prova</b>` : '📱 Quando acabar, toquem em <b>Acabou</b> para votar'}</div></div>`; break;
        }
        case 'vote': html = `<div class="pbox"><div class="k">Votação</div><h1>🗳️ ${x.k === 'gate' ? `${esc(nameOf(V, x.solo))} passou?` : 'Quem ganhou?'}</h1><div class="d">Votem no telemóvel</div>${chips(x.who)}<div class="foot">Ganha a maioria · empate: ${x.k === 'gate' ? 'passa' : 'decide o dado'}</div></div>`; break;
        case 'mgwait': html = `<div class="pbox"><div class="k">⚡ Reflexos</div><div class="mgbig red">ESPERA…</div><div class="foot">Toquem no telemóvel quando ficar verde</div></div>`; break;
        case 'mg': html = x.k === 'reflex' ? `<div class="pbox"><div class="k">⚡ Reflexos</div><div class="mgbig green">TOCA!</div>${chips(x.who)}</div>` : `<div class="pbox"><div class="k">Prova de telemóvel</div><h1>${MGN[x.k][0]} ${MGN[x.k][1]}</h1><div class="d">${esc(MGD[x.k](x.target))}</div>${chips(x.who)}</div>`; break;
        case 'el': html = `<div class="pbox"><div class="k">Prova de telemóvel · ronda ${x.rd}</div><h1>${MGN[x.k][0]} ${MGN[x.k][1]}</h1><div class="d">${esc(MGD[x.k]())}</div><div class="who">${x.act.map(i => `<span class="pch ${x.picks[i] !== undefined || V.players[i].bot ? 'done' : ''}" style="--c:${D.PCOLORS[V.players[i].col]}">${tok(V.players[i], 's')}${esc(nameOf(V, i))}${x.picks[i] !== undefined || V.players[i].bot ? ' ✅' : ''}</span>`).join('')}</div><div class="foot">Escolham no telemóvel, em segredo</div></div>`; break;
        case 'dare': html = `<div class="cardbig"><div class="e">🎭</div><h2>Prenda de ${esc(nameOf(V, x.who[0]))}</h2><p>${esc(D.DARE[x.di])}</p><p style="margin-top:10px;font-size:16px;opacity:.75">Faz e avança 3 · recusa e recua 3</p></div>`; break;
        case 'pick': prompt = `${{ duel: '⚔️', swap: '🦜', push: '👉' }[x.k]} ${esc(nameOf(V, x.who[0]))} está a escolher…`; break;
        case 'river': prompt = `🌊 ${esc(nameOf(V, x.who[0]))}: pedras 🔴 vermelhas ou 🔵 azuis?`; break;
        case 'roll': { const p = V.players[x.who[0]]; prompt = `🎲 ${esc(p.name)}, lança os dados ${p.bot ? '' : p.local ? 'no comando do ecrã' : 'no telemóvel'}${x.need === 6 ? ' · precisa de um 6' : x.need ? ` · precisa de ${x.need}+` : ''}`; break; }
      }
    }
    if (P.dataset.h !== html) { P.dataset.h = html; P.innerHTML = html; P.classList.toggle('show', !!html); }
    if (pr.dataset.h !== prompt) { pr.dataset.h = prompt; pr.innerHTML = prompt; pr.classList.toggle('show', !!prompt); }
  }
  function checkDisconnected() {
    const el = $('#notice'); if (!el || S.ph !== 'play') return;
    const now = Date.now(); let msg = '';
    S.players.forEach((p, k) => {
      if (p.local || p.bot) return; if (padSeen[p.cid]) { delete discAt[p.cid]; return; } discAt[p.cid] = discAt[p.cid] || now;
      if (S.x && S.x.who && S.x.who.includes(k) && now - discAt[p.cid] > 8000) msg = `📵 O comando de <b>${esc(p.name)}</b> desligou-se. Reabre o link no telemóvel (aparece “Retomar lugar”), ou toca no nome dele à direita para jogar por ele neste ecrã.`;
    });
    if (msg || el.dataset.d) { el.dataset.d = msg ? 1 : ''; el.innerHTML = msg; el.classList.toggle('show', !!msg); }
  }
  function showChoice(text, opts) { const ov = $('#confirm'); ov.innerHTML = `<div class="cbox"><p>${esc(text)}</p><div class="opts">${opts.map((o, k) => `<button class="btn" data-ch="${k}">${esc(o[0])}</button>`).join('')}<button class="btn ghost" data-ch="x">Cancelar</button></div></div>`; ov.classList.add('show'); ov.onclick = e => { const b = e.target.closest('[data-ch]'); if (!b) return; ov.classList.remove('show'); ov.onclick = null; if (b.dataset.ch !== 'x') opts[+b.dataset.ch][1](); }; }
  function showConfirm(text, yes) { const ov = $('#confirm'); ov.onclick = null; ov.innerHTML = `<div class="cbox"><p>${esc(text)}</p><div class="btns"><button class="btn bad" id="cy">Sim</button><button class="btn ghost" id="cn">Cancelar</button></div></div>`; ov.classList.add('show'); $('#cy').onclick = () => { ov.classList.remove('show'); yes(); }; $('#cn').onclick = () => ov.classList.remove('show'); }
  function showRulesTV() { const ov = $('#rulesov'); ov.innerHTML = `<div class="rulesbox"><div class="rh"><h2 style="color:var(--sea2)">📖 Regras da Ilha do Vulcão</h2><button class="btn" id="rclose">Fechar</button></div>${D.rulesHtml(['objetivo', 'ronda'])}</div>`; ov.classList.add('show'); $('#rclose').onclick = () => ov.classList.remove('show'); }
  function renderLocalPad() {
    const box = $('#localpad');
    const locals = S.players.map((p, k) => p.local && !p.bot ? k : -1).filter(k => k >= 0);
    if (S.ph === 'lobby' || !locals.length) { box.classList.remove('show'); return; }
    box.classList.add('show');
    const V = view(), need = locals.filter(k => mustAct(V, k));
    if (need.length && !need.includes(localSel)) localSel = need[0];
    if (!locals.includes(localSel)) localSel = locals.includes(S.turn) ? S.turn : locals[0];
    if (!localPad) {
      box.innerHTML = `<div class="lp-tabs"></div><div class="lp-body"></div>`;
      localPad = makePad($('.lp-body', box), { getView: view, me: () => localSel, send: (a, x) => { ENG.handleCmd(localSel, Object.assign({ a }, x)); }, local: true });
      box.querySelector('.lp-tabs').onclick = e => { const b = e.target.closest('[data-lp]'); if (b) { localSel = +b.dataset.lp; localPad.P.lastHtml = ''; localPad.render(); tabs(locals, V); } if (e.target.closest('[data-min]')) box.classList.toggle('min'); };
    }
    tabs(locals, V); localPad.render();
    function tabs(locals, V) { $('#localpad .lp-tabs').innerHTML = `<button data-min style="--c:#fff">▁</button><span class="muted">No ecrã:</span>` + locals.map(k => `<button data-lp="${k}" class="${k === localSel ? 'on' : ''}" style="--c:${D.PCOLORS[S.players[k].col]}">${hatE(S.players[k].hat)} ${esc(S.players[k].name)}${mustAct(V, k) ? ' ❗' : ''}</button>`).join(''); }
  }

  // ===================== COMANDO (telemóvel) =====================
  let padV = null, pad = null, cid = null, me = -1, padCode = '', join = null, tvSeen = 0, lastTvAt = 0, lastRejoin = 0, seq = 0, lastCmd = null, claim = null;
  function startPad() {
    mode = 'pad'; $('#start').classList.remove('show'); $('#padroot').classList.add('show'); document.body.classList.add('padmode');
    try { cid = sessionStorage.getItem('vulcao-cid'); } catch (e) { } if (!cid) cid = LS.get('vulcao-cid'); if (!cid) cid = 'p' + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('vulcao-cid', cid); } catch (e) { } LS.set('vulcao-cid', cid);
    $('#padroot').innerHTML = `<div class="join"><div class="logo sm">Ilha do Vulcão</div>
      <label>Código da sala (está na TV)<input id="jcode" inputmode="numeric" maxlength="4" value="${esc(LS.get('vulcao-code') || '')}" placeholder="0000"></label>
      <button class="btn big" id="jconn">Ligar à TV</button><div id="jmsg" class="muted"></div><details class="rule"><summary>📖 Regras do jogo</summary><div>${D.rulesHtml()}</div></details></div>`;
    $('#jconn').onclick = connectPad;
  }
  let padTimers = false;
  async function connectPad() {
    padCode = $('#jcode').value.trim(); if (!/^\d{4}$/.test(padCode)) { $('#jmsg').textContent = 'O código tem 4 números.'; return; }
    LS.set('vulcao-code', padCode);
    $('#jmsg').textContent = 'A ligar…';
    const ok = await Net.connect(padCode);
    if (!ok) { $('#jmsg').textContent = 'Não foi possível ligar daqui. Abre o link do site Noite de Jogos, ou joga no ecrã da TV.'; return; }
    listen(); presence();
    if (!padTimers) { padTimers = true; setInterval(watchdog, 3000); document.addEventListener('visibilitychange', () => { if (!document.hidden) { presence(); watchdog(); } }); }
    setTimeout(() => { if (!padV && $('#jmsg')) $('#jmsg').textContent = 'Não encontro a TV com o código ' + padCode + '. Confirma o código no ecrã.'; }, 9000);
  }
  function listen() {
    Net.r.onPeers(ch => {
      const tv = ch.peers.find(p => p.presence && p.presence.role === 'tv' && p.presence.code === padCode && p.presence.st);
      if (!tv) { if (!padV && $('#jmsg')) $('#jmsg').textContent = 'Ligado. À espera da TV com o código ' + padCode + '…'; return; }
      lastTvAt = Date.now(); connBar(false);
      const sig = tv.presence.st.v + ':' + tv.presence.hb;
      if (sig === tvSeen) return; tvSeen = sig;
      onState(tv.presence.st);
    });
  }
  async function watchdog() {
    if (!padV || document.hidden) return;
    const stale = Date.now() - lastTvAt > 9000;
    connBar(stale);
    if (stale && Date.now() - lastRejoin > 10000) { lastRejoin = Date.now(); await Net.rejoin(padCode); listen(); presence(); }
  }
  function connBar(on) { let b = $('#connbar'); if (!b) { b = document.createElement('div'); b.id = 'connbar'; b.innerHTML = '📡 Sem sinal da TV. A religar… <button onclick="location.reload()">Recarregar</button>'; document.body.appendChild(b); } b.classList.toggle('show', !!on && mode === 'pad'); }
  function presence() { if (!Net.ok) return; const o = { role: 'pad', code: padCode, cid }; if (join) o.join = join; if (lastCmd) o.cmd = lastCmd; if (claim !== null) o.claim = claim; Net.r.presence(o).catch(() => { }); }
  function padSend(a, x) { seq = Math.max(Date.now(), seq + 1); lastCmd = Object.assign({ n: seq, a }, x || {}); presence(); }
  function onState(st) {
    const V = ENG.unsnap(st); padV = V;
    me = V.players.findIndex(p => p.cid === cid);
    if (V.ph === 'lobby') { renderJoin(V); return; }
    if (me < 0) { renderReclaim(V); return; }
    if (claim !== null) { claim = null; presence(); }
    if (!pad) { $('#padroot').onclick = null; $('#padroot').innerHTML = '<div id="padwrap" style="position:absolute;inset:0"></div>'; pad = makePad($('#padwrap'), { getView: () => padV, me: () => me, send: padSend, local: false }); }
    const was = pad._mine; pad._mine = mustAct(V, me);
    if (pad._mine && !was) { try { navigator.vibrate && navigator.vibrate(90); } catch (e) { } if (pad.P.tab !== 'play' && ['pv', 'vote', 'mg', 'mgwait', 'el', 'roll', 'pick', 'dare', 'river'].includes(V.step)) { pad.P.tab = 'play'; } }
    pad.render();
  }
  let lastRecl = '';
  function renderReclaim(V) {
    pad = null; const sig = JSON.stringify(V.players.map(p => [p.name, p.bot, p.cid, p.pos])) + claim; if (sig === lastRecl && $('#padroot .reclaim')) return; lastRecl = sig;
    $('#padroot').innerHTML = `<div class="join"><div class="logo sm">Ilha do Vulcão</div><h2 style="color:var(--sea2)">O jogo já começou</h2><p style="font-weight:700">Se saíste a meio, escolhe quem és para retomar o teu lugar:</p>
      ${V.players.map((p, k) => `<button class="btn big ghost reclaim" data-k="${k}" ${p.bot && !String(p.cid).startsWith('p') ? 'disabled' : ''} style="display:flex;align-items:center;gap:10px">${tok(p, 's')} ${esc(p.name)} <small style="margin-left:auto">${where(p)}</small></button>`).join('')}
      <p class="muted">${claim !== null ? 'A pedir à TV…' : 'Só podes retomar o lugar de alguém cujo comando esteja desligado.'}</p></div>`;
    $('#padroot').onclick = e => { const b = e.target.closest('.reclaim'); if (!b || b.disabled) return; claim = +b.dataset.k; presence(); lastRecl = ''; renderReclaim(V); };
  }
  let joinEdit = false, draft = null, lastJoinHtml = '';
  function renderJoin(V) {
    pad = null;
    const meP = V.players.find(p => p.cid === cid);
    const taken = V.players.filter(p => p.cid !== cid).map(p => p.hat);
    if (!draft) draft = { nm: join ? join.nm : (LS.get('vulcao-name') || ''), ht: join ? join.ht : +(LS.get('vulcao-hat') || 0) };
    if (meP && !joinEdit) { draft.nm = meP.name; draft.ht = meP.hat; }
    if (taken.includes(draft.ht)) draft.ht = D.HATS.findIndex((_, k) => !taken.includes(k));
    const html = `<div class="join"><div class="logo sm">Ilha do Vulcão</div><div class="muted">Sala ${esc(padCode)} · ${V.players.length}/${D.MAXP} jogadores</div>
      ${meP && !joinEdit ? `<div class="card center">${tok(meP, 'l')}<h2 style="margin-top:8px">${esc(meP.name)}</h2><p><b>Estás dentro!</b> Espera que a TV comece o jogo.</p><button class="btn sm ghost" id="jedit">Mudar nome ou chapéu</button></div>` : `
      <label>O teu nome<input id="jname" maxlength="12" placeholder="Nome" autocomplete="off"></label>
      <label>O teu chapéu</label><div class="hats">${D.HATS.map((t, k) => `<button class="hatb ${k === draft.ht ? 'on' : ''}" data-ht="${k}" ${taken.includes(k) ? 'disabled' : ''}><span>${t[0]}</span>${t[1]}</button>`).join('')}</div>
      <button class="btn big good" id="jgo">${meP ? 'Guardar' : 'Entrar no jogo'}</button>`}
      <div id="lbmini">${miniList(V)}</div><details class="rule"><summary>📖 Regras do jogo</summary><div>${D.rulesHtml()}</div></details></div>`;
    if (html === lastJoinHtml && $('#padroot .join')) return; lastJoinHtml = html;
    const open = $('#padroot details.rule') && $('#padroot details.rule').open, hadFocus = $('#jname') && document.activeElement === $('#jname');
    $('#padroot').onclick = null; $('#padroot').innerHTML = html;
    if (open) $('#padroot details.rule').open = true;
    if ($('#jname')) { $('#jname').value = draft.nm; $('#jname').oninput = e => { draft.nm = e.target.value; }; if (hadFocus) $('#jname').focus(); }
    if ($('#jedit')) $('#jedit').onclick = () => { joinEdit = true; renderJoin(V); };
    const hats = $('#padroot .hats'); if (hats) hats.onclick = e => { const b = e.target.closest('[data-ht]'); if (!b || b.disabled) return; draft.ht = +b.dataset.ht; const on = $('#padroot .hats .on'); if (on) on.classList.remove('on'); b.classList.add('on'); lastJoinHtml = ''; };
    if ($('#jgo')) $('#jgo').onclick = () => { const n = draft.nm.trim().slice(0, 12) || 'Jogador'; LS.set('vulcao-name', n); LS.set('vulcao-hat', draft.ht); join = { nm: n, ht: draft.ht }; joinEdit = false; lastJoinHtml = ''; presence(); $('#jgo').textContent = 'A entrar…'; };
  }
  const miniList = V => V.players.map(p => `<span class="chip">${hatE(p.hat)} ${esc(p.name)}</span>`).join('');

  window.UI = { start, mapSvg, makePad, view };
  addEventListener('DOMContentLoaded', start);
})();
