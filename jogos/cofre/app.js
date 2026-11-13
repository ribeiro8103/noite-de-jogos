/* O Cofre de São Segredo — Edição Longa: TV (anfitrião) + comando no telemóvel */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const L = window.LAYOUT, BLD = CG.BLD;
  const G = 3;
  const app = { db: null, user: null, sample: null, myUid: null, isOwner: false, capsReady: false, mode: null, demo: false };
  window.__cofre = app;
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } } };
  function toast(msg, kind = '') { const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3800); }
  function show(html) { const s = $('#screen'); s.innerHTML = html; s.classList.remove('hidden'); }
  function hideScreen() { $('#screen').classList.add('hidden'); }
  function setMode(m) { app.mode = m; $('#cut').classList.toggle('hidden', m === 'player'); $('#tv').classList.toggle('hidden', m !== 'board'); $('#hud').classList.toggle('hidden', m !== 'board'); $('#phone').classList.toggle('hidden', m !== 'player'); }
  const slug = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  function newCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let c = ''; for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)]; return c; }
  const ICON = { praca: '🔐', igreja: '⛪', cartorio: '📜', cafe: '☕', farmacia: '💊', biblioteca: '📚', pensao: '🛏️', correios: '📮', barbearia: '💈', taberna: '🍷', mercado: '🧺', lota: '🐟', estaleiro: '⚓', armazem: '📦', farol: '🗼', solar: '🏰', estacao: '🚂', cemiterio: '✝️', hotel: '🏨', adega: '🍇', gnr: '🚓', padaria: '🥖' };
  const SERVICE = { taberna: 'Informador (50): tiras um rumor de qualquer edifício sem lá ires. Calar um rumor (40).', biblioteca: 'Arquivo (40): uma pista dos documentos antigos da vila.', cartorio: 'Cartório (70): vês um testemunho de um jogador à sorte.', gnr: 'Mandado (100): um jogador vai para o Posto e perde o próximo movimento.', correios: 'Interrogar à distância (20). Comprar o próximo Jornal (60).', estacao: 'Comboio (20): saltas para a paragem de outro bairro.', praca: 'Acusação final: só uma por jogador. Errar é sair do jogo.' };

  /* =================================================================== BASE DE DADOS DE TESTE (#demo) */
  function mockDb() {
    const data = new Map(), subs = [];
    const fire = (path) => subs.forEach((s) => { if (s.doc ? s.path === path : path.startsWith(s.path + '/') && path.split('/').length === s.path.split('/').length + 1) s.fn(); });
    const snapDoc = (path) => ({ exists: data.has(path), id: path.split('/').pop(), data: () => data.get(path) });
    const snapCol = (path) => ({ docs: [...data.keys()].filter((k) => k.startsWith(path + '/') && k.split('/').length === path.split('/').length + 1).map(snapDoc) });
    const db = {
      doc: (path) => ({ get: async () => snapDoc(path), set: async (v) => { data.set(path, JSON.parse(JSON.stringify(v))); setTimeout(() => fire(path), 0); }, onSnapshot: (fn) => { const s = { doc: true, path, fn: () => fn(snapDoc(path)) }; subs.push(s); setTimeout(s.fn, 0); return () => subs.splice(subs.indexOf(s), 1); } }),
      collection: (path) => { const q = { orderBy: () => q, limit: () => q, get: async () => snapCol(path), onSnapshot: (fn) => { const s = { doc: false, path, fn: () => fn(snapCol(path)) }; subs.push(s); setTimeout(s.fn, 0); return () => subs.splice(subs.indexOf(s), 1); } }; return q; },
    };
    return db;
  }

  async function initCaps() {
    if (location.hash === '#demo') { app.demo = true; app.db = mockDb(); app.myUid = 'u-host'; app.isOwner = true; app.capsReady = true; window.READY = true; renderHome(); return; }
    for (let i = 0; i < 40 && !(window.claude && window.claude.use); i++) await sleep(100);
    if (window.claude && window.claude.use) {
      const [db, user, sample] = await Promise.all(['db', 'user', 'sample'].map((n) => window.claude.use(n).catch(() => null)));
      app.db = db; app.user = user; app.sample = sample;
      if (user) { try { app.myUid = await user.id(); } catch (e) { /* */ } try { app.isOwner = !!user.isOwner(); } catch (e) { /* */ } }
    }
    app.capsReady = true; if (!app.mode) renderHome();
  }

  /* =================================================================== INÍCIO */
  function renderHome() {
    setMode(null); const ok = !!app.db;
    show(`<div class="wrap"><div class="logo"><div class="vault">🔐</div><div class="ed">Edição Longa</div><h1>O Cofre de<br>São Segredo</h1>
      <p>Na noite do testamento, o Comendador Albano apareceu morto. O cofre da praça só abre com a verdade: <b>quem</b>, <b>onde</b>, <b>com quê</b> e <b>a que horas</b>.</p></div>
      <div class="stack"><button class="btn big primary" id="hBoard" ${ok && app.isOwner ? '' : 'disabled'}>📺 Abrir o Tabuleiro<small>na TV ou no computador, à vista de todos</small></button>
      <button class="btn big" id="hPlayer" ${ok ? '' : 'disabled'}>📱 Entrar como Jogador<small>o teu telemóvel é o teu comando</small></button>
      <button class="btn ghost" id="hRules">📖 Como se joga</button></div>
      <p class="small center muted" style="margin-top:18px">${!app.capsReady ? 'A ligar…' : !ok ? 'Entra pela página da Noite de Jogos com o código da sala.' : app.isOwner ? 'Abre o Tabuleiro na TV. Cada amigo abre esta página no telemóvel e entra como jogador.' : 'Só o dono da página abre o Tabuleiro. Tu entras como jogador.'}</p></div>`);
    $('#hBoard').onclick = boardHome; $('#hPlayer').onclick = playerJoin; $('#hRules').onclick = () => sheet(`<h3>Como se joga</h3>${rulesHTML()}`);
  }
  function rulesHTML() {
    return `<details open><summary>🎯 Objetivo</summary><p>Descobrir <b>Quem</b> (8 suspeitos), <b>Onde</b> (10 locais), <b>Com quê</b> (8 objetos) e <b>A que horas</b> (20h à 1h). Ganha quem abrir o cofre na Praça com as 4 respostas certas.</p></details>
      <details><summary>🎲 O teu turno</summary><p>1) Lanças o dado e escolhes no mapa para onde vais (ou ficas). 2) Fazes <b>uma ação principal</b> no sítio onde paraste. 3) Ações livres: suspeita, fechar um negócio teu, negociar. 4) Terminas.</p></details>
      <details><summary>🔍 As pistas</summary><p>Nenhuma pista diz a resposta diretamente: falam de características (canhoto, usa óculos, vista para o mar…), horários e ligações. Junta-as no caderno.</p><p><b>Testemunhos</b> (as tuas cartas), <b>rumores</b> dos edifícios, <b>declarações</b> dos suspeitos (em casa deles), <b>Arquivo</b>, <b>Jornal da Vila</b> (1 por ronda). O que encontras passa a ser carta tua: os outros podem pedir-ta.</p><p>Todas as pistas são verdadeiras. As mais úteis estão escondidas ou custam caro: escolhe bem onde gastas as tuas ações e o teu dinheiro.</p></details>
      <details><summary>🃏 Cartas mistério e desafio</summary><p>Em cada ronda há 6 <b>cartas mistério</b> e 3 <b>cartas desafio</b> escondidas em edifícios ao acaso. Ao entrares num edifício com carta, apanha-la.</p><p><b>Mistério</b>: sorte (dinheiro, uma pista, mover outra vez…) ou azar (multa, pé torcido, GNR…).</p><p><b>Desafio</b>: escolhes um prémio (ver uma carta, ficar com um negócio, dinheiro, uma pista) e jogas contra alguém (pedra-papel-tesoura, par ou ímpar, dados) ou contra a vila (votação ou cultura geral). Se perderes, passas a vez, sem mais castigo.</p></details>
      <details><summary>❓ Interrogar e suspeitar</summary><p><b>Interrogar</b> (ação principal): na mesma casa que outro jogador, ou pelos Correios. Escolhes uma categoria e ele tem de te mostrar 1 carta dessa categoria, se tiver.</p><p><b>Suspeita</b> (1 por ronda, livre, depois de passares pela Partida): dizes uma teoria completa e o primeiro jogador à tua esquerda que a puder contradizer mostra-te uma carta.</p></details>
      <details><summary>💰 Dinheiro e negócios</summary><p>Começas com 200 escudos e recebes 30 por ronda. Negócios dão renda (10, ou 20 melhorado). Compras informação, que é cara (Informador 80, Arquivo 70, Cartório 100, Correios 30) e bloqueias os outros (Mandado, fechar a porta, comprar o Jornal, calar um rumor).</p></details>
      <details><summary>🔐 Acusação final</summary><p>Só uma, na Praça. Se errares, perdes e sais do jogo (as tuas cartas continuam a responder sozinhas).</p></details>`;
  }

  function listGames(elSel, onPick, empty) {
    const timer = setTimeout(() => { if ($(elSel)) $(elSel).textContent = 'Sem resposta. Usa o código.'; }, 10000);
    app.db.collection('pub').orderBy('updated', 'desc').limit(15).get().then((snap) => {
      clearTimeout(timer); const el = $(elSel); if (!el) return; const docs = snap.docs.filter((d) => (d.data() || {}).g === G).slice(0, 6);
      if (!docs.length) { el.textContent = empty; return; }
      el.innerHTML = docs.map((d) => { const x = d.data(); return `<button class="game-row" data-code="${esc(d.id)}"><b>${esc(d.id)}</b><span class="small muted">${esc(x.names || '')}</span><small>${x.phase === 'end' ? '🏁 terminada' : x.phase === 'lobby' ? 'à espera' : 'ronda ' + esc(x.round)}</small></button>`; }).join('');
      $$('.game-row', el).forEach((b) => (b.onclick = () => onPick(b.dataset.code)));
    }).catch(() => { clearTimeout(timer); if ($(elSel)) $(elSel).textContent = 'Não consegui listar as partidas.'; });
  }

  /* =================================================================== TABULEIRO: preparação */
  const H = { S: null, unsubI: null, writes: {}, handCache: {}, timer: null, gen: 0, setup: null, q: [], last: 0, playing: false, skip: false, paused: false, started: false };
  app.H = H;
  function writeDoc(path, body) { const p = (H.writes[path] || Promise.resolve()).then(() => app.db.doc(path).set(body)); H.writes[path] = p.catch((e) => console.error('write', path, e)); return p; }
  function persist() {
    const S = H.S, P = CG.pubView(S); P.anim = !!H.playing;
    writeDoc('sec/' + S.code, { json: JSON.stringify(S), updated: Date.now() });
    writeDoc('pub/' + S.code, { json: JSON.stringify(P), g: G, v: S.v, updated: Date.now(), names: S.players.map((p) => p.name).join(', '), phase: S.phase, round: S.round });
    S.players.forEach((p, i) => { if (!p.uid) return; const hv = CG.handView(S, i); if (S.errors && S.errors[p.uid]) hv.err = S.errors[p.uid]; const h = JSON.stringify(hv); if (H.handCache[p.uid] !== h) { H.handCache[p.uid] = h; writeDoc('hands/' + p.uid, { json: h, code: S.code, g: G, updated: Date.now() }); } });
    return P;
  }
  function boardHome() {
    setMode(null);
    show(`<div class="wrap"><div class="head"><button class="btn ghost small" id="bBack">←</button><h2>📺 Tabuleiro</h2></div>
      <button class="btn big primary" id="bNew">✨ Nova partida</button>
      <div class="card"><h3 style="margin-top:0">Continuar uma partida</h3><div id="gList" class="muted">A procurar…</div></div></div>`);
    $('#bBack').onclick = renderHome; $('#bNew').onclick = setupStart;
    listGames('#gList', async (code) => { try { const s = await app.db.doc('sec/' + code).get(); if (!s.exists) return toast('Não encontrei essa partida.', 'err'); startBoard(JSON.parse(s.data().json)); } catch (e) { toast('Erro a carregar.', 'err'); } }, 'Ainda não há partidas.');
  }
  const blank = (i) => ({ name: '', desc: '', color: CG.COLORS[i], character: null });
  function setupStart() {
    H.setup = { step: 1, pace: 'calmo', lastNight: false, players: [0, 1, 2, 3, 4].map(blank), roster: LS.get('cofre3_roster', []) }; renderSetup();
    app.db.collection('roster').limit(60).get().then((snap) => { const by = {}; H.setup.roster.concat(snap.docs.map((d) => d.data()).filter((x) => x && x.name)).forEach((r) => (by[r.name.toLowerCase()] = r)); H.setup.roster = Object.values(by); if (H.setup.step === 1) renderRoster(); }).catch(() => {});
  }
  function readForms() { $$('.pform').forEach((f) => { const p = H.setup.players[+f.dataset.i]; if (!p) return; const n = $('.p-name', f).value.trim(), d = $('.p-desc', f).value.trim(); if (d !== p.desc) p.character = null; p.name = n; p.desc = d; }); }
  function renderSetup() {
    const S = H.setup; if (S.step === 2) return renderRoles();
    show(`<div class="wrap"><div class="head"><button class="btn ghost small" id="sBack">←</button><h2>Nova partida</h2></div>
      <section class="card"><h3 style="margin-top:0">Ritmo</h3><div class="seg"><button data-p="calmo" class="${S.pace === 'calmo' ? 'on' : ''}">🐢 Calmo<small>cenas longas, mais tempo para pensar</small></button><button data-p="normal" class="${S.pace === 'normal' ? 'on' : ''}">🚶 Normal<small>cenas mais curtas</small></button></div>
      <label class="seg" style="margin-top:10px"><button id="sLast" class="${S.lastNight ? 'on' : ''}">🌙 A Última Noite<small>a partir da ronda 14, o Jornal revela pistas fortes</small></button></label></section>
      <section class="card"><div class="head" style="justify-content:space-between"><h3 style="margin:0">Jogadores (${S.players.length})</h3><div><button class="btn small" id="sMinus" ${S.players.length <= 3 ? 'disabled' : ''}>−</button> <button class="btn small" id="sPlus" ${S.players.length >= 6 ? 'disabled' : ''}>＋</button></div></div>
      <div id="roster"></div>
      <p class="small muted">Escreve 2 ou 3 frases sobre cada amigo (trabalho, manias, piadas internas). O Claude cria-lhe uma <b>vida nova em São Segredo</b> e um <b>poder</b> à medida. Lugares sem telemóvel ficam com um 🤖 bot.</p>
      ${S.players.map((p, i) => `<div class="pform" data-i="${i}"><span class="dot" style="background:${p.color}"></span><div><input class="p-name" maxlength="18" placeholder="Nome" value="${esc(p.name)}"><textarea class="p-desc" rows="2" placeholder="Ex: engenheiro, sempre atrasado, sabe tudo sobre futebol…">${esc(p.desc)}</textarea>${p.character ? `<div class="small muted">Guardado: ${esc(p.character.emoji)} ${esc(p.character.role)}</div>` : ''}</div></div>`).join('')}</section>
      <div class="sticky"><button class="btn big primary" id="sGo">✨ Dar vidas novas</button></div></div>`);
    $('#sBack').onclick = boardHome;
    $$('[data-p]').forEach((b) => (b.onclick = () => { readForms(); S.pace = b.dataset.p; renderSetup(); }));
    $('#sLast').onclick = () => { readForms(); S.lastNight = !S.lastNight; renderSetup(); };
    $('#sMinus').onclick = () => { readForms(); S.players.pop(); renderSetup(); }; $('#sPlus').onclick = () => { readForms(); S.players.push(blank(S.players.length)); renderSetup(); };
    $('#sGo').onclick = () => { readForms(); genRoles(); }; renderRoster();
  }
  function renderRoster() {
    const el = $('#roster'); if (!el) return; const S = H.setup; const used = new Set(S.players.map((p) => p.name.toLowerCase()));
    const list = S.roster.filter((r) => !used.has(r.name.toLowerCase())).slice(0, 12);
    el.innerHTML = list.length ? `<div class="small muted" style="margin:6px 0">Amigos guardados:</div><div class="seg">${list.map((r, k) => `<button data-r="${k}" style="flex:0 0 auto;min-width:0">${esc((r.character && r.character.emoji) || '🙂')} ${esc(r.name)}</button>`).join('')}</div>` : '';
    $$('[data-r]', el).forEach((b) => (b.onclick = () => { readForms(); const r = list[+b.dataset.r]; let slot = S.players.find((p) => !p.name); if (!slot) { if (S.players.length >= 6) return toast('Máximo 6 jogadores.'); slot = blank(S.players.length); S.players.push(slot); } slot.name = r.name; slot.desc = r.desc || ''; slot.character = r.character && r.character.power && CG.POWERS[r.character.power.id] ? r.character : null; renderSetup(); }));
  }
  function rolePrompt(list, avoid) {
    return `Estás a criar personagens para "O Cofre de São Segredo", um jogo de mistério passado numa vila piscatória portuguesa. Cada jogador chega à vila e começa uma vida nova, inspirada na descrição da pessoa real.
Para cada jogador devolve:
- "role": profissão/papel na vila, divertido e ligado à pessoa (máx 30 caracteres)
- "title": nome com alcunha (ex: "Zé, o Carteiro que Sabe Tudo"), máx 44 caracteres
- "nick": alcunha curta usada na vila (máx 22 caracteres)
- "emoji": 1 emoji
- "motto": frase curta dita pela personagem (máx 12 palavras)
- "bio": 2 frases sobre a vida nova dela em São Segredo (máx 200 caracteres)
- "power": {"id": um id da lista PODERES, "name": nome criativo (máx 26 caracteres), "flavor": 1 frase que liga o poder à pessoa real}
Humor de amigos, carinhoso, nunca ofensivo. Português de Portugal. Escolhe o poder que mais combina com a pessoa e não repitas ids${avoid.length ? ` (já usados: ${avoid.join(', ')})` : ''}.
PODERES:
${Object.keys(CG.POWERS).map((k) => `- ${k}: ${CG.POWERS[k].regra}`).join('\n')}
JOGADORES:
${list.map((p, i) => `${i + 1}. Nome: ${p.name}\n   Descrição: ${p.desc || '(sem descrição — inventa algo simpático)'}`).join('\n')}
Responde APENAS com JSON: {"players":[{"role":"","title":"","nick":"","emoji":"","motto":"","bio":"","power":{"id":"","name":"","flavor":""}}]} pela mesma ordem.`;
  }
  async function askClaude(prompt) {
    if (!app.sample) throw new Error('no sample'); let val = null;
    try { if (app.sample.json) val = await app.sample.json(prompt, { modelTier: 'default' }); } catch (e) { if (e && (e.code === 'not_granted' || e.code === 'rate_limited')) throw e; }
    if (!val) { const r = await app.sample(prompt, { modelTier: 'default' }); const m = ((r && r.text) || '').match(/\{[\s\S]*\}/); if (!m) throw new Error('json'); val = JSON.parse(m[0]); }
    if (typeof val === 'string') val = JSON.parse(val); const arr = Array.isArray(val) ? val : val.players; if (!Array.isArray(arr)) throw new Error('fmt'); return arr;
  }
  async function genRoles() {
    const S = H.setup; S.players.forEach((p, i) => { if (!p.name) p.name = 'Jogador ' + (i + 1); });
    if (new Set(S.players.map((p) => p.name.toLowerCase())).size !== S.players.length) return toast('Há nomes repetidos.', 'err');
    S.step = 2; S.generating = true; renderRoles();
    const todo = S.players.map((p, i) => (p.character ? null : i)).filter((x) => x !== null);
    if (todo.length) {
      let arr = null; const avoid = S.players.filter((p) => p.character).map((p) => p.character.power.id);
      try { arr = await askClaude(rolePrompt(todo.map((i) => S.players[i]), avoid)); S.source = 'claude'; } catch (e) { S.source = 'local'; }
      const used = avoid.slice(); todo.forEach((pi, k) => { const p = S.players[pi]; p.character = arr && arr[k] ? CG.normalizeCharacter(arr[k], p.name, used) : CG.genCharacterLocal(p.name, p.desc, used); used.push(p.character.power.id); });
    }
    S.generating = false; if (H.setup === S && S.step === 2) renderRoles();
  }
  function roleCard(p, ctl) {
    const c = p.character; if (!c) return `<div class="role" style="--c:${p.color}"><div class="top"><div class="emo spin">🎭</div><div><div class="rn">${esc(p.name)}</div><div class="rt">A arranjar-lhe uma vida nova…</div></div></div></div>`;
    const pw = CG.POWERS[c.power.id];
    return `<div class="role" style="--c:${p.color}"><div class="top"><div class="emo">${esc(c.emoji)}</div><div><div class="rn">${esc(c.title || p.name)}</div><div class="rt">${esc(c.role)}${c.nick ? ' · «' + esc(c.nick) + '»' : ''}</div>${c.motto ? `<div class="motto">“${esc(c.motto)}”</div>` : ''}</div></div>
      ${c.bio ? `<div class="bio">${esc(c.bio)}</div>` : ''}<div class="pw"><span class="tag gold">Poder</span> <b>${esc(c.power.name)}</b><div class="small" style="margin-top:4px">${esc(pw.regra)}</div>${c.power.flavor ? `<div class="small muted" style="margin-top:4px">${esc(c.power.flavor)}</div>` : ''}</div>
      ${ctl !== undefined ? `<div style="margin-top:10px"><button class="btn small" data-regen="${ctl}">🔄 Outra vida</button></div>` : ''}</div>`;
  }
  function renderRoles() {
    const S = H.setup;
    show(`<div class="wrap"><div class="head"><button class="btn ghost small" id="rBack">←</button><h2>As vidas novas</h2></div>
      ${S.generating ? '<p class="center muted">🎭 A distribuir as vidas novas…</p>' : S.source === 'local' ? '<p class="center small muted">Vidas novas criadas pelo gerador do jogo.</p>' : '<p class="center small muted">Mostra na TV e confirmem todos. Qualquer um pode pedir outra vida.</p>'}
      <div class="rgrid">${S.players.map((p, i) => roleCard(p, S.generating ? undefined : i)).join('')}</div>
      <div class="sticky"><button class="btn big primary" id="rGo" ${S.generating ? 'disabled' : ''}>🏘️ Criar a vila e o mistério</button></div></div>`);
    $('#rBack').onclick = () => { S.step = 1; renderSetup(); };
    $$('[data-regen]').forEach((b) => (b.onclick = async () => {
      const i = +b.dataset.regen, p = S.players[i]; b.disabled = true; b.textContent = '⏳';
      const avoid = S.players.filter((x, j) => j !== i && x.character).map((x) => x.character.power.id);
      try { const arr = await askClaude(rolePrompt([p], avoid) + `\nDá uma vida diferente de: ${p.character.role}.`); p.character = CG.normalizeCharacter(arr[0], p.name, avoid); } catch (e) { p.character = CG.genCharacterLocal(p.name, p.desc + Math.random(), avoid.concat([p.character.power.id])); }
      renderRoles();
    }));
    $('#rGo').onclick = async () => {
      $('#rGo').disabled = true; $('#rGo').innerHTML = '<span class="spin">🔐</span> A criar um caso difícil…'; await sleep(60);
      const list = LS.get('cofre3_roster', []); S.players.forEach((p) => { const e = { name: p.name, desc: p.desc, character: p.character }; const k = list.findIndex((r) => r.name.toLowerCase() === p.name.toLowerCase()); if (k >= 0) list[k] = e; else list.push(e); app.db.doc('roster/' + (slug(p.name) || 'x')).set(e).catch(() => {}); }); LS.set('cofre3_roster', list.slice(-40));
      const st = CG.createGame({ players: S.players.map((p) => ({ name: p.name, color: p.color, character: p.character })), pace: S.pace, lastNight: S.lastNight, code: newCode() });
      st.phase = 'lobby'; startBoard(st);
    };
  }

  /* =================================================================== TABULEIRO: partida */
  async function startBoard(S) {
    if (S.phase !== 'lobby') setTimeout(() => SND.startMusic(), 500);
    H.S = S; H.handCache = {}; H.gen++; H.q = []; H.last = S.phase === 'lobby' ? 0 : S.fxN; H.playing = false;
    setMode('board'); hideScreen();
    if (!VScene.ready) { show(`<div class="wrap"><div class="logo"><div class="vault spin">🔐</div><h2>A construir São Segredo…</h2></div></div>`); try { await VScene.init($('#tvc'), ''); } catch (e) { console.error(e); toast('Não consegui carregar a vila 3D.', 'err'); } hideScreen(); }
    VScene.setPace(CG.PACE[S.pace] || 1); VScene.setPlayers(S.players); VScene.placeAll(S.players); VScene.overview(10);
    persist(); renderHUD();
    if (H.unsubI) H.unsubI();
    H.unsubI = app.db.collection('intents').onSnapshot(onIntents, (e) => toast('Ligação aos telemóveis perdida (' + (e && e.code) + ')', 'err'));
    if (S.phase === 'lobby') renderLobby(); else schedule();
  }
  function renderLobby() {
    const S = H.S; if (!S || S.phase !== 'lobby') return;
    show(`<div class="wrap"><div class="head"><button class="btn ghost small" id="lBack">←</button><h2>Sala de espera</h2></div>
      <div class="card center"><div class="muted">Código da partida</div><div class="lobby-code">${esc(S.code)}</div><div class="small muted">Cada um abre esta página no telemóvel → <b>Entrar como Jogador</b> → escolhe o código e a sua personagem.</div></div>
      <div class="card">${S.players.map((p) => `<div class="seat ${p.uid ? '' : 'taken'}" style="cursor:default"><span class="e">${esc(p.character.emoji)}</span><div style="flex:1"><b>${esc(p.name)}</b><div class="small muted">${esc(p.character.role)}</div></div><span class="pill"><span class="dotc" style="background:${p.color}"></span>${p.uid ? '📱 ligado' : '🤖 bot'}</span></div>`).join('')}</div>
      <div class="sticky"><button class="btn big primary" id="lGo">▶️ Começar a partida</button></div></div>`);
    $('#lBack').onclick = exitBoard;
    $('#lGo').onclick = () => { SND.unlock(); SND.startMusic(); const S2 = CG.clone(H.S); S2.phase = 'play'; S2.v++; hideScreen(); H.last = 0; intro().then(() => commit(S2)); };
  }
  async function intro() {
    const S = H.S; VScene.overview(2000);
    await cut({ kind: 'intro', title: 'O Cofre de São Segredo', kicker: 'Edição Longa', sub: 'Na noite em que leu o testamento, o Comendador Albano apareceu morto. O cofre da praça só abre com a verdade sobre essa noite.' }, 9000);
    for (const p of S.players) { const c = p.character; await cut({ kind: 'intro', kicker: 'Uma vida nova em São Segredo', title: `${c.emoji} ${c.title || p.name}`, sub: `${c.role}. ${c.bio || ''}`, actors: [] , color: p.color}, 5200); }
  }
  function exitBoard() { clearTimeout(H.timer); H.gen++; if (H.unsubI) H.unsubI(); H.S = null; setMode(null); renderHome(); }
  function onIntents(snap) {
    const S0 = H.S; if (!S0) return; let S = S0, changed = false;
    snap.docs.forEach((d) => {
      const uid = d.id, x = d.data() || {}; if (x.code !== S.code || !Array.isArray(x.list)) return; const last = S.seqs[uid] || 0;
      x.list.filter((it) => it && it.seq > last).sort((a, b) => a.seq - b.seq).forEach((it) => {
        const a = it.a || {}; if (S === S0) S = CG.clone(S0);
        if (a.type === 'claim') { const seat = Math.floor(+a.seat); if (S.players[seat] && (!S.players[seat].uid || S.players[seat].uid === uid)) { S.players.forEach((p) => { if (p.uid === uid) p.uid = null; }); S.players[seat].uid = uid; } }
        else if (H.playing && !['mark', 'ack', 'respond', 'chal'].includes(a.type)) { S.errors = Object.assign({}, S.errors, { [uid]: { msg: 'Espera: a TV ainda está a mostrar uma cena.', seq: it.seq } }); }
        else { const seat = S.players.findIndex((p) => p.uid === uid); if (seat >= 0) { const r = CG.act(S, seat, a); if (r.state) { const sq = S.seqs; S = r.state; S.seqs = sq; } else if (r.error) S.errors = Object.assign({}, S.errors, { [uid]: { msg: r.error, seq: it.seq } }); } }
        S.seqs[uid] = it.seq; changed = true;
      });
    });
    if (changed) { S.v++; commit(S); }
  }
  function commit(S) { H.S = S; H.gen++; const P = persist(); renderHUD(); if (S.phase === 'lobby') { renderLobby(); return; } enqueue(P); schedule(); }
  function enqueue(P) { P.fx.filter((f) => f.id > H.last).forEach((f) => { H.q.push(f); H.last = f.id; }); if (!H.playing) playQueue(); }
  async function playQueue() {
    H.playing = true; persist();
    while (H.q.length) { const f = H.q.shift(); try { await playFx(f); } catch (e) { console.error('fx', e); } }
    H.playing = false; settle(); persist(); schedule();
    const S = H.S; if (S && S.phase === 'play' && !S.gate && !S.chal) { const cp = S.players[S.turn]; if (H.lastTurnSnd !== S.round + ':' + S.turn) { H.lastTurnSnd = S.round + ':' + S.turn; SND.play('turn'); setTimeout(() => SND.play('voice', S.turn), 400); } }
  }
  function idle() { return new Promise((res) => { const chk = () => (!H.playing && !H.paused ? res() : setTimeout(chk, 200)); chk(); }); }
  function settle() {
    const S = H.S; if (!S) return; VScene.placeAll(S.players);
    const P = S.ts; const me = S.players[S.turn];
    if (S.phase === 'play' && P && P.rolled && !P.moved && P.reach) { VScene.setMarkers(P.reach, me.color); VScene.focus(posOfPlayer(me), { dist: 26, h: 22, dur: 1400 }); }
    else { VScene.setMarkers(null); if (S.phase === 'play') VScene.focus(posOfPlayer(me), { dist: 22, h: 17, dur: 2000 }); else VScene.overview(); }
    renderHUD();
  }
  function posOfPlayer(p) { if (p.pos.b) { const b = BLD[p.pos.b]; return { x: b.x, z: b.z }; } const n = L.nodes[p.pos.n]; return { x: n.x, z: n.z }; }
  function schedule() {
    clearTimeout(H.timer); const gen = H.gen, S = H.S; if (!S || S.phase !== 'play') { if (S && S.phase === 'end') setTimeout(endScreen, 600); return; }
    idle().then(() => {
      if (gen !== H.gen || !H.S) return; const S2 = H.S;
      H.timer = setTimeout(() => { if (gen !== H.gen || H.playing) return; const nx = CG.botStep(H.S); if (nx) { nx.v++; commit(nx); } }, 1300 * (CG.PACE[S2.pace] || 1));
    });
  }
  function forceStep() { const S = H.S; if (!S) return; if (S.gate) { const S2 = CG.clone(S); S2.gate = null; S2.v++; return commit(S2); } if (S.chal) { const S2 = CG.clone(S); S2.chal.needs = null; const need = CG.pubView(S2).chal.needs; need.forEach((j) => { S2.players[j]._uid = S2.players[j].uid; S2.players[j].uid = null; }); let nx = S2; for (let k = 0; k < 8 && nx && nx.chal; k++) { const t = CG.botStep(nx); if (!t) break; nx = t; } nx.players.forEach((p) => { if (p._uid !== undefined) { p.uid = p._uid; delete p._uid; } }); nx.v++; return commit(nx); } const S2 = CG.clone(S); const P = S2.pending; const who = P ? P.who : S2.turn; const uid = S2.players[who].uid; S2.players[who].uid = null; let nx = CG.botStep(S2); if (nx) { nx.players[who].uid = uid; nx.v++; commit(nx); } }

  /* ----------------------------------------------------------- HUD da TV */
  function whereTxt(S, p) { if (p.pos.b) { const b = BLD[p.pos.b]; if (b.type === 'house') { const sus = Object.keys(S.homes).find((k) => S.homes[k] === b.id); if (sus != null) return 'em casa de ' + CG.SUS[sus].name; const o = S.players.find((q) => q.home === b.id); return o ? 'em casa de ' + o.name : 'numa casa'; } return CG.em(b.id); } const n = L.nodes[p.pos.n]; return n.name ? 'na ' + n.name : 'a caminho (' + CG.BAIRRO[n.bairro] + ')'; }
  function renderHUD() {
    const S = H.S, hud = $('#hud'); if (!S || app.mode !== 'board') return;
    const cur = S.players[S.turn]; const ts = S.ts || {}; const P = S.pending;
    let what = '';
    if (S.phase === 'lobby') what = 'à espera dos jogadores';
    else if (S.phase === 'end') what = 'fim da partida';
    else if (P) what = P.kind === 'show' ? `à espera que ${S.players[P.who].name} escolha a carta a mostrar` : P.kind === 'offer' ? `${S.players[P.who].name} está a pensar na proposta` : `${S.players[P.who].name} está a escolher`;
    else if (!ts.rolled) what = 'a decidir: lançar o dado ou ficar';
    else if (!ts.moved) what = `tirou ${ts.roll} — a escolher o caminho no mapa`;
    else if (!ts.acted) what = 'a escolher o que fazer aqui';
    else what = 'a pensar… (ações livres ou terminar)';
    const clock = ['☀️ Manhã', '🌤️ Tarde', '🌙 Noite'][(S.round - 1) % 3];
    hud.innerHTML = `<div class="tl"><div class="chip serif">🔐 São Segredo</div><div class="chip">Ronda ${S.round} · ${clock}</div><div class="chip code">${esc(S.code)}</div><div class="chip">🃏 ${S.cards ? Object.keys(S.cards).length : 0} cartas escondidas</div></div>
      <div class="players">${S.players.map((p, i) => `<div class="pc ${i === S.turn && S.phase === 'play' ? 'cur' : ''} ${p.out ? 'out' : ''}" style="--c:${p.color}"><div class="e">${esc(p.character.emoji)}</div><div style="min-width:0"><div class="n">${esc(p.name)} ${p.uid ? '' : '<span class="small muted">🤖</span>'}</div><div class="s">${p.out ? 'fora do jogo' : esc(whereTxt(S, p))}</div><div class="s">🃏 ${p.cards.length} · 🏪 ${p.biz.length}${p.passedStart ? ' · 🏁' : ''}</div></div><div class="m">${p.money}<small>escudos</small></div></div>`).join('')}</div>
      <div class="logbox"><h4>Registo da vila</h4>${S.log.slice(-11).reverse().map((l) => `<div class="l ${l.kind}">${esc(l.txt)}</div>`).join('')}</div>
      ${S.phase === 'play' ? `<div class="turn"><div class="who" style="color:${cur.color}">${esc(cur.character.emoji)} Vez de ${esc(cur.name)}</div><div class="what">${esc(what)}</div></div>` : ''}
      <div class="ctrl"><button id="cMus" title="Música">${SND.musicOn ? '🎵' : '🔇'}</button><button id="cSnd" title="Som">${SND.on ? '🔊' : '🔈'}</button><button id="cSkip" title="Saltar cena">⏭️</button><button id="cBot" title="Jogar por quem está à vez">🤖</button><button id="cExit" title="Sair">✕</button></div>`;
    $('#cSkip').onclick = () => { H.skip = true; }; $('#cBot').onclick = forceStep; $('#cExit').onclick = exitBoard;
    $('#cSnd').onclick = () => { SND.setOn(!SND.on); renderHUD(); }; $('#cMus').onclick = () => { SND.setMusic(!SND.musicOn); if (SND.musicOn) SND.startMusic(); renderHUD(); };
    renderChalTV();
  }
  /* ----------------------------------------------------------- desafio na TV (painel ao vivo) */
  function renderChalTV() {
    const el = $('#chalTV'); const S = H.S; if (!el) return; const X = S && S.chal; document.body.classList.toggle('chal', !!X && app.mode === 'board'); if (!X || app.mode !== 'board') { el.classList.remove('on'); return; }
    const by = S.players[X.by]; const P = CG.pubView(S).chal; const opp = X.opp != null ? S.players[X.opp] : null;
    const chip = (p, done) => `<span class="actor" style="--c:${p.color}"><span class="e">${esc(p.character.emoji)}</span>${esc(p.name)} ${done == null ? '' : done ? '✅' : '⏳'}</span>`;
    const G = X.mode === 'duel' ? CG.DUEL_GAMES : CG.GROUP_GAMES; let body = '';
    if (X.step === 'setup') body = `<div class="cq">${esc(by.name)} está a escolher ${X.mode === 'duel' ? 'o adversário e ' : ''}o prémio no telemóvel…</div>`;
    else if (X.step === 'tiebreak') body = `<div class="cq">Desempate: ${esc(by.name)} lança 2 dados e precisa de 8 ou mais.</div>${X.tally ? `<div class="cs">${esc(X.tally)}</div>` : ''}`;
    else if (X.game === 'votacao') body = `<div class="cq">«${esc(X.q.t)}»</div><div class="cs">Todos votam no telemóvel. ${esc(by.name)} tenta adivinhar quem a maioria escolhe.</div><div class="crow">${S.players.filter((p) => !p.out).map((p) => chip(p, P.done.includes(String(S.players.indexOf(p))))).join('')}</div>`;
    else if (X.game === 'trivia') body = `<div class="cq">${esc(X.q.t)}</div><div class="copts">${X.q.o.map((o, k) => `<div>${'ABCD'[k]}. ${esc(o)}</div>`).join('')}</div><div class="cs">${esc(by.name)} responde no telemóvel…</div>`;
    else body = `<div class="crow">${chip(by, P.done.includes(String(X.by)))}<span class="vs">VS</span>${chip(opp, P.done.includes(String(X.opp)))}</div><div class="cs">${X.game === 'ppt' ? 'Escolham em segredo: pedra, papel ou tesoura.' : X.game === 'parimpar' ? esc(by.name) + ' escolhe par ou ímpar; os dois escolhem um número de 0 a 5.' : 'Cada um lança 2 dados no telemóvel. Ganha o maior.'}${X.round > 1 ? ` (tentativa ${X.round})` : ''}</div>`;
    el.innerHTML = `<div class="ck">⚔️ Carta Desafio · ${X.mode === 'duel' ? 'frente a frente' : 'contra a vila'}</div><div class="ct">${esc(X.game ? G[X.game] : (X.mode === 'duel' ? 'Duelo' : 'Desafio ao grupo'))}</div>${X.reward ? `<div class="cs">Prémio: ${esc(CG.REWARDS[X.reward])}${X.target != null ? ' (' + esc(S.players[X.target].name) + ')' : ''}</div>` : ''}${body}`;
    el.classList.add('on');
  }

  /* ----------------------------------------------------------- cut-scenes */
  const HOLD = { mystery: 4800, challenge: 3600, chalres: 5600, chaltie: 3200, interrogate: 4500, suspeita: 5200, show: 3200, investigate: 3600, ask: 4200, buy: 3800, upgrade: 3200, rent: 3000, mandado: 4200, close: 3200, silenciar: 3200, informador: 3600, arquivo: 3400, jornal: 5600, power: 3400, station: 3000, sell: 3400, round: 2400, accuse: 6500 };
  const KICK = { mystery: 'Carta Mistério', challenge: 'Carta Desafio', chalres: 'Resultado do desafio', chaltie: 'Carta Desafio', interrogate: 'Interrogatório', suspeita: 'Suspeita', show: 'Carta mostrada em segredo', investigate: 'Investigação', ask: 'Visita a um suspeito', buy: 'Negócio', upgrade: 'Negócio', rent: 'Renda', mandado: 'Bloqueio', close: 'Bloqueio', silenciar: 'Bloqueio', informador: 'Informação comprada', arquivo: 'Informação comprada', jornal: 'Jornal da Vila', power: 'Poder especial', station: 'Viagem', sell: 'Negociação', round: 'São Segredo', accuse: 'Acusação final' };
  async function cut(ev, hold) {
    const S = H.S, el = $('#cut'); const pace = CG.PACE[S && S.pace] || 1; const ms = (hold || 4000) * pace;
    const actors = [ev.actor, ev.target].filter((x) => x != null && x >= 0 && S.players[x]).map((i) => S.players[i]);
    const ach = actors.map((p) => `<div class="actor" style="--c:${p.color}"><span class="e">${esc(p.character.emoji)}</span>${esc(p.name)}</div>`);
    $('.box', el).innerHTML = `${ach.length ? `<div class="actors">${ach.join(ev.kind === 'interrogate' || ev.kind === 'mandado' || ev.kind === 'suspeita' ? '<span class="vs">→</span>' : '')}</div>` : ''}
      ${ev.kind === 'mystery' ? `<div class="mcard ${ev.good ? 'good' : 'bad'}"><div class="mi">${ev.good ? '🍀' : '💀'}</div><div class="ml">${ev.good ? 'Sorte' : 'Azar'}</div></div>` : ''}
      <div class="kicker">${esc(ev.kicker || KICK[ev.kind] || '')}</div><div class="title">${esc(ev.title || '')}</div>${ev.sub ? `<div class="sub">${esc(ev.sub)}</div>` : ''}${ev.lines ? `<ul class="lines">${ev.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}`;
    document.body.classList.add('cutting'); el.classList.add('on'); const tm = $('.timer', el); tm.style.transition = 'none'; tm.style.width = '0'; void tm.offsetWidth; tm.style.transition = `width ${ms}ms linear`; tm.style.width = '100%';
    H.skip = false; const t0 = performance.now(); while (performance.now() - t0 < ms && !H.skip) await sleep(100);
    el.classList.remove('on'); document.body.classList.remove('cutting'); await sleep(700);
  }
  function fxSound(f) {
    const v = () => f.actor != null && setTimeout(() => SND.play('voice', f.actor), 500);
    const m = { interrogate: ['sting'], suspeita: ['suspense'], show: ['paper'], investigate: ['knock'], ask: ['knock'], buy: ['coins'], upgrade: ['coins'], rent: ['coin'], mandado: ['siren'], close: ['lock'], silenciar: ['lock'], informador: ['coin'], arquivo: ['paper'], power: ['magic'], station: ['train'], sell: ['coin'], challenge: ['challenge'], chaltie: ['tick'] };
    if (f.kind === 'mystery') SND.play(f.good ? 'magic' : 'bad'); else if (f.kind === 'chalres') SND.play(f.good ? 'fanfare' : 'lose'); else (m[f.kind] || ['whoosh']).forEach((n) => SND.play(n));
    v();
  }
  async function newspaper(f) {
    const S = H.S, el = $('#news'); const pace = CG.PACE[S.pace] || 1;
    const SIDE = ['Feira do peixe adiada por causa do temporal', 'Padaria Farinha esgota o pão de ló', 'Gaivotas roubam sardinhas na Lota', 'Comboio das 21h30 chegou a horas, pela primeira vez', 'Missa de sétimo dia do Comendador marcada', 'Herdeiros discutem à porta do Cartório', 'Farol volta a piscar depois de avaria', 'Taberna promete vinho novo para sábado'];
    const sides = [SIDE[(f.ed || 0) % SIDE.length], SIDE[((f.ed || 0) + 3) % SIDE.length]];
    el.innerHTML = `<div class="paper"><div class="mast"><span>N.º ${100 + (f.ed || 1)}</span><h1>Jornal da Vila</h1><span>Ronda ${f.ed || S.round} · 1 escudo</span></div><div class="sub-mast">São Segredo · Edição especial sobre a morte do Comendador Albano</div>
      <div class="kick">ÚLTIMA HORA</div><div class="head">${esc(f.sub)}</div>
      <div class="cols"><div><b>${esc(sides[0])}</b><p>Os habitantes de São Segredo continuam a falar da noite do testamento. Fontes próximas da investigação garantem que a verdade está mais perto do que parece.</p></div><div class="pic">🔐<small>O cofre continua fechado na praça</small></div><div><b>${esc(sides[1])}</b><p>A redação pede a quem souber de alguma coisa que fale com a GNR. O Jornal da Vila promete novas revelações na próxima edição.</p></div></div>
      <div class="acks" id="newsAcks"></div></div>`;
    el.classList.add('on'); document.body.classList.add('cutting'); SND.play('newsboy'); setTimeout(() => SND.play('paper'), 600);
    const t0 = performance.now(); H.skip = false;
    while (true) {
      const g = H.S && H.S.gate; const acks = $('#newsAcks');
      if (acks) acks.innerHTML = g ? `Confirmem no telemóvel que já leram: ${g.need.map((j) => { const p = H.S.players[j]; return `<span class="ack ${g.ack.includes(j) ? 'ok' : ''}" style="--c:${p.color}">${g.ack.includes(j) ? '✓' : '…'} ${esc(p.name)}</span>`; }).join('')}` : 'Todos leram. Começa a ronda seguinte!';
      const minDone = performance.now() - t0 > 5000 * pace;
      if ((!g && minDone) || H.skip || !H.S) break;
      await sleep(250);
    }
    await sleep(900); el.classList.remove('on'); document.body.classList.remove('cutting'); SND.play('paper'); await sleep(800);
  }
  async function dice(ev) {
    const S = H.S, el = $('#dice'), p = S.players[ev.actor]; const pace = CG.PACE[S.pace] || 1;
    $('.who', el).innerHTML = `<span style="color:${p.color}">${esc(p.character.emoji)} ${esc(p.name)}</span>`; el.classList.add('on', 'roll'); SND.play('dice');
    const d = $('.d', el); const t0 = performance.now(); while (performance.now() - t0 < 1500 * pace) { d.textContent = 1 + Math.floor(Math.random() * 6); await sleep(90); }
    el.classList.remove('roll'); d.textContent = ev.roll; SND.play('diceLand'); await sleep(1400 * pace); el.classList.remove('on'); await sleep(300);
  }
  async function playFx(f) {
    const S = H.S; if (!S) return;
    VScene.setMarkers(null);
    switch (f.kind) {
      case 'roll': return dice(f);
      case 'move': { await VScene.walk(f.actor, f.path, f.toB); await sleep(300); VScene.placeAll(S.players); return; }
      case 'summary': { SND.play('whoosh'); VScene.overview(1400); return cut({ kind: 'summary', kicker: 'Resumo da jogada', title: f.title, lines: f.lines.slice(-4), sub: f.next ? `A seguir: ${f.next}` : '', actor: f.actor }, 3000); }
      case 'round': { SND.play('bell'); VScene.overview(1400); return cut(f, HOLD.round); }
      case 'jornal': { if (f.pub) return newspaper(f); SND.play('paper'); const restore = await VScene.stage(f); await cut(f, HOLD.jornal); restore(); return; }
      case 'accuse': { SND.play('drumroll', 1.6); const restore = await VScene.stage(f); setTimeout(() => SND.play(f.ok ? 'vaultOpen' : 'vaultLocked'), 4200); const pv = VScene.vault(f.ok); await cut(f, HOLD.accuse); await pv; restore(); return; }
      default: { fxSound(f); const restore = await VScene.stage(f); await cut(f, HOLD[f.kind] || 3600); restore(); VScene.clearFx(); }
    }
  }
  function endScreen() {
    const S = H.S; if (!S || app.mode !== 'board') return; const sol = S.sol; const w = S.winner;
    show(`<div class="wrap"><div class="logo"><div class="vault">${w != null ? '🏆' : '🔐'}</div><div class="ed">Fim da partida</div><h1>${w != null ? esc(S.players[w].name) + ' abriu o cofre!' : 'O cofre ficou fechado'}</h1>
      <p>Foi <b>${esc(CG.SUS[sol.s].full)}</b> (${esc(CG.SUS[sol.s].role)}), ${esc(CG.em(CG.LOC[sol.l].b))}, com <b>${esc(CG.OBJ[sol.o].name.toLowerCase())}</b>, às <b>${CG.HOR[sol.h]}</b>.</p></div>
      <div class="card"><h3 style="margin-top:0">Como foi a noite</h3><p class="muted">Este caso precisava de pelo menos ${S.steps} pistas bem escolhidas para ser resolvido. Foram jogadas ${S.round} rondas.</p></div>
      <div class="stack"><button class="btn big primary" id="eNew">✨ Nova partida</button><button class="btn" id="eHome">Voltar ao início</button></div></div>`);
    $('#eNew').onclick = () => { exitBoard(); setupStart(); }; $('#eHome').onclick = exitBoard;
  }

  /* =================================================================== TELEMÓVEL */
  const C = { code: null, pub: null, hand: null, seq: 0, list: [], sending: Promise.resolve(), tab: 'map', sel: null, filter: 'all', view: null, busyV: -1, lastErr: 0, notesT: null, seenKnown: 0, theory: null };
  app.C = C;
  function playerJoin() {
    setMode(null);
    show(`<div class="wrap"><div class="head"><button class="btn ghost small" id="pBack">←</button><h2>📱 Entrar</h2></div><div class="card"><h3 style="margin-top:0">Partidas</h3><div id="pList" class="muted">A procurar…</div><div class="join-row"><input id="pCode" maxlength="6" placeholder="CÓDIGO" autocapitalize="characters"><button class="btn primary" id="pGo">Entrar</button></div></div></div>`);
    $('#pBack').onclick = renderHome; $('#pGo').onclick = () => { const c = $('#pCode').value.trim().toUpperCase(); if (c) openGame(c); };
    listGames('#pList', openGame, 'Não há partidas. Pede ao anfitrião para abrir o Tabuleiro.');
  }
  async function openGame(code) {
    Object.assign(C, { code, pub: null, hand: null, sel: null, tab: 'map', view: null, seenKnown: 0 });
    show(`<div class="wrap"><div class="logo"><div class="vault spin">🔐</div><h2>A entrar em ${esc(code)}…</h2></div></div>`);
    try { const d = await app.db.doc('intents/' + app.myUid).get(); const x = d.exists ? d.data() : null; const old = x && Array.isArray(x.list) ? x.list : []; C.seq = old.reduce((m, it) => Math.max(m, it.seq || 0), 0); C.list = x && x.code === code ? old : []; } catch (e) { C.list = []; C.seq = 0; }
    if (C.unsubP) C.unsubP(); if (C.unsubH) C.unsubH();
    const timer = setTimeout(() => { if (!C.pub) { toast('Não encontrei essa partida.', 'err'); playerJoin(); } }, 10000);
    C.unsubP = app.db.doc('pub/' + code).onSnapshot((s) => { if (!s.exists) return; let P; try { P = JSON.parse(s.data().json); } catch (e) { return; } if (P.g !== G) return; clearTimeout(timer); if (C.pub && C.pub.created !== P.created) { C.hand = null; } C.pub = P; renderPlayer(); }, () => {});
    C.unsubH = app.db.doc('hands/' + app.myUid).onSnapshot((s) => { if (!s.exists) return; let h; try { h = JSON.parse(s.data().json); } catch (e) { return; } if (h.code !== C.code || h.g !== G) return; const fresh = !C.hand; C.hand = h; if (fresh) C.seenKnown = h.known.length; if (h.err && h.err.seq !== C.lastErr) { C.lastErr = h.err.seq; if (!fresh) toast(h.err.msg, 'err'); C.busyV = -1; } renderPlayer(); }, () => {});
  }
  function send(a, busy = true) {
    C.seq++; C.list.push({ seq: C.seq, a }); if (C.list.length > 14) C.list = C.list.slice(-14);
    const body = { code: C.code, list: C.list.slice(), updated: Date.now() };
    if (busy && C.pub) { C.busyV = C.pub.v; clearTimeout(C.busyT); C.busyT = setTimeout(() => { C.busyV = -1; renderPlayer(); }, 7000); }
    closeSheet();
    C.sending = C.sending.then(() => app.db.doc('intents/' + app.myUid).set(body)).catch((e) => { C.busyV = -1; toast(e && e.code === 'invalid_argument' ? 'Sem permissão: pede ao anfitrião para te partilhar a página.' : 'Falha a enviar. Tenta outra vez.', 'err'); renderPlayer(); });
    if (busy) renderPlayer();
  }
  app.send = send;
  const mySeat = () => (C.pub ? C.pub.players.findIndex((p) => p.uid && p.uid === app.myUid) : -1);
  function leavePlayer() { if (C.unsubP) C.unsubP(); if (C.unsubH) C.unsubH(); C.pub = null; setMode(null); playerJoin(); }

  function renderSeats() {
    const P = C.pub; setMode(null);
    show(`<div class="wrap"><div class="head"><button class="btn ghost small" id="sBack">←</button><h2>Quem és tu?</h2></div><p class="muted">Partida ${esc(P.code)}. Escolhe a tua personagem.</p>
      ${P.players.map((p, i) => `<button class="seat ${p.uid ? 'taken' : ''}" data-seat="${i}" ${p.uid ? 'disabled' : ''} style="border-left:6px solid ${p.color}"><span class="e">${esc(p.character.emoji)}</span><div style="flex:1"><b>${esc(p.name)}</b><div class="small muted">${esc(p.character.role)}</div></div>${p.uid ? '📱' : ''}</button>`).join('')}</div>`);
    $('#sBack').onclick = leavePlayer;
    $$('[data-seat]').forEach((b) => (b.onclick = () => { send({ type: 'claim', seat: +b.dataset.seat }); b.innerHTML = '<span class="spin">⏳</span> A entrar…'; }));
  }

  function renderPlayer() {
    const P = C.pub; if (!P || (app.mode !== 'player' && app.mode !== null)) return;
    const seat = mySeat(); if (seat < 0) return renderSeats();
    if (!C.hand || C.hand.seat !== seat) { setMode('player'); hideScreen(); $('#phone').innerHTML = '<div class="empty" style="margin-top:40vh"><span class="spin">🔐</span> A receber as tuas cartas…</div>'; return; }
    if (app.mode !== 'player') { setMode('player'); hideScreen(); }
    const me = P.players[seat], h = C.hand, mine = P.turn === seat && P.phase === 'play' && !me.out && !P.anim && !P.gate && !P.chal;
    if (mine && !C.wasMine) { SND.play('turn'); if (navigator.vibrate) try { navigator.vibrate([80, 60, 80]); } catch (e) { /* */ } } C.wasMine = mine;
    if (h.known.length > (C.lastKnownN || 0) && C.lastKnownN != null) SND.play('paper'); C.lastKnownN = h.known.length;
    if (C.busyV >= 0 && P.v > C.busyV) C.busyV = -1;
    const newClues = Math.max(0, h.known.length - C.seenKnown);
    const keepScroll = $('.ph-body') ? $('.ph-body').scrollTop : 0;
    let turnTxt = P.phase === 'lobby' ? 'À espera que o anfitrião comece a partida' : P.phase === 'end' ? (P.winner != null ? `🏆 ${P.players[P.winner].name} abriu o cofre!` : 'O cofre ficou fechado') : me.out ? 'Saíste do jogo. As tuas cartas respondem sozinhas.' : mine ? '⭐ É A TUA VEZ' : `Vez de ${P.players[P.turn].character.emoji} ${P.players[P.turn].name}`;
    if (P.phase === 'play' && !me.out) { if (P.gate) turnTxt = '📰 Jornal da Vila: lê e confirma'; else if (P.chal) turnTxt = '⚔️ Desafio a decorrer'; else if (P.anim) turnTxt = P.turn === seat ? '📺 Olha para a TV… a seguir é a tua vez' : '📺 Olha para a TV…'; }
    if (P.pending && P.pending.who !== seat && P.phase === 'play') turnTxt += ` · à espera de ${P.players[P.pending.who].name}`;
    $('#phone').innerHTML = `<div class="ph-top"><div class="me"><div class="av" style="--c:${me.color}">${esc(me.character.emoji)}</div><div style="min-width:0"><div class="nm">${esc(me.name)}</div><div class="rl">${esc(me.character.role)}</div></div></div><div class="money">💰 ${me.money}</div></div>
      <div class="turnbar ${mine ? 'mine' : ''}">${esc(turnTxt)}</div>
      <div class="ph-body">${C.tab === 'map' ? '' : `<div class="ph-pad">${C.tab === 'clues' ? cluesHTML() : C.tab === 'nb' ? notebookHTML() : meHTML()}</div>`}</div>
      ${actionsHTML(seat)}
      <nav class="nav">${[['map', '🗺️', 'Mapa'], ['clues', '🃏', 'Pistas'], ['nb', '📒', 'Caderno'], ['me', '👤', 'Eu']].map(([k, i, n]) => `<button data-tab="${k}" class="${C.tab === k ? 'on' : ''}"><span class="i">${i}</span><span>${n}${k === 'clues' && newClues ? `<span class="badge">${newClues}</span>` : ''}</span></button>`).join('')}</nav>`;
    if (C.tab === 'map') { $('.ph-body').innerHTML = `<div class="map-wrap" id="mapw">${mapSVG(seat)}<div class="map-zoom"><button id="zIn">+</button><button id="zOut">−</button><button id="zFit" style="font-size:15px">⤢</button></div>${mapLegend(seat)}</div>`; bindMap(seat); }
    else $('.ph-body').scrollTop = keepScroll;
    if (C.tab === 'clues') C.seenKnown = h.known.length;
    $$('[data-tab]').forEach((b) => (b.onclick = () => { SND.play('click'); C.tab = b.dataset.tab; renderPlayer(); }));
    bindActions(seat); bindTabs();
    renderAsk(seat); renderGate(seat); renderChalPhone(seat);
    if (P.errors && P.errors[app.myUid]) { /* (erros vêm no estado privado do anfitrião) */ }
  }

  /* ----------------------------------------------------------- mapa 2D */
  const VB0 = { x: -33, y: -25.5, w: 66, h: 49 };
  function bldLabel(P, b) {
    if (b.type !== 'house') return { icon: ICON[b.id] || '🏠', name: b.name };
    const sus = Object.keys(P.homes).find((k) => P.homes[k] === b.id); if (sus != null) return { icon: CG.SUS[sus].emoji, name: 'Casa de ' + CG.SUS[sus].name };
    const pl = P.players.find((q) => q.home === b.id); if (pl) return { icon: pl.character.emoji, name: 'Casa de ' + pl.name }; return { icon: '🏠', name: 'Casa' };
  }
  function mapSVG(seat) {
    const P = C.pub, h = C.hand; if (!C.view) { const pp = posOfPlayer(P.players[seat]); C.view = { x: Math.max(-33, Math.min(33 - 38, pp.x - 19)), y: Math.max(-25.5, Math.min(23.5 - 30, pp.z - 15)), w: 38, h: 30 }; } const v = C.view; const reach = new Set(((h.opts.find((o) => o.type === 'move') || {}).reach) || []);
    const N = L.nodes; let s = `<svg id="map" viewBox="${v.x} ${v.y} ${v.w} ${v.h}" xmlns="http://www.w3.org/2000/svg" font-family="Nunito Sans,sans-serif">`;
    s += `<rect x="-60" y="-60" width="120" height="81.4" fill="#93b86e"/><rect x="-60" y="21.4" width="120" height="50" fill="#2a7aa0"/><rect x="-60" y="20.6" width="120" height="0.8" fill="#d9cfb6"/>`;
    s += `<line x1="-60" y1="-21.6" x2="60" y2="-21.6" stroke="#6b5b4a" stroke-width="0.9" stroke-dasharray="0.3 0.5"/>`;
    s += `<circle cx="0" cy="0" r="6.2" fill="#e8e2d2"/>`;
    L.edges.forEach(([a, b]) => { s += `<line x1="${N[a].x}" y1="${N[a].z}" x2="${N[b].x}" y2="${N[b].z}" stroke="#efe9da" stroke-width="1.5" stroke-linecap="round"/>`; });
    N.forEach((n) => { const k = 'n' + n.id, r = reach.has(k); s += `<g data-node="${n.id}">${r ? `<circle class="reach-ring" cx="${n.x}" cy="${n.z}" r="1.25" fill="none" stroke="${P.players[seat].color}" stroke-width="0.45"/>` : ''}<circle cx="${n.x}" cy="${n.z}" r="${r ? 0.85 : 0.62}" fill="${n.id === L.PARTIDA ? '#c0392b' : C.sel === k ? '#f6d58c' : '#f7f1e3'}" stroke="#a08a63" stroke-width="0.15"/>${n.id === L.PARTIDA ? `<text x="${n.x}" y="${n.z + 0.35}" font-size="0.9" text-anchor="middle" fill="#fff" font-weight="800">P</text>` : ''}</g>`; });
    L.buildings.forEach((b) => {
      const k = 'b:' + b.id, r = reach.has(k), B = P.bld[b.id], lab = bldLabel(P, b); const own = B.owner != null ? P.players[B.owner].color : null;
      const isP = b.id === 'praca'; const w = isP ? 0 : 3.4, hh = isP ? 0 : 3.0;
      const fill = b.type === 'public' ? '#e6dcc4' : b.type === 'biz' ? '#f6e7bd' : '#efe8dc';
      s += `<g data-bld="${b.id}" style="cursor:pointer">`;
      if (r) s += isP ? `<circle class="reach-ring" cx="0" cy="0" r="6.9" fill="none" stroke="${P.players[seat].color}" stroke-width="0.6"/>` : `<rect class="reach-ring" x="${b.x - w / 2 - 0.7}" y="${b.z - hh / 2 - 0.7}" width="${w + 1.4}" height="${hh + 1.4}" rx="1.1" fill="none" stroke="${P.players[seat].color}" stroke-width="0.5"/>`;
      if (isP) s += `<circle cx="0" cy="0" r="2.3" fill="#3a3f48" stroke="${C.sel === k ? '#f6d58c' : '#e7b04a'}" stroke-width="0.35"/>`;
      else s += `<rect x="${b.x - w / 2}" y="${b.z - hh / 2}" width="${w}" height="${hh}" rx="0.6" fill="${C.sel === k ? '#fff3c4' : fill}" stroke="${own || '#9c8a69'}" stroke-width="${own ? 0.55 : 0.15}"/>`;
      s += `<text x="${b.x}" y="${b.z + (isP ? 0.6 : 0.5)}" font-size="${isP ? 2 : 1.7}" text-anchor="middle">${lab.icon}</text>`;
      if (!isP && b.type !== 'house') s += `<text x="${b.x}" y="${b.z + hh / 2 + 1.05}" font-size="0.95" text-anchor="middle" fill="#2b2418" font-weight="800">${esc(b.name.replace('Solar do Comendador', 'Solar').replace('Posto da GNR', 'GNR'))}</text>`;
      if (B.rumors) s += `<circle cx="${b.x + w / 2 - 0.2}" cy="${b.z - hh / 2 + 0.2}" r="0.62" fill="#2b2418"/><text x="${b.x + w / 2 - 0.2}" y="${b.z - hh / 2 + 0.52}" font-size="0.85" text-anchor="middle" fill="#f6d58c" font-weight="800">${B.rumors}</text>`;
      if (B.closed) s += `<text x="${b.x - w / 2 + 0.3}" y="${b.z - hh / 2 + 0.7}" font-size="1.2">🔒</text>`;
      if (B.up) s += `<text x="${b.x - w / 2 + 0.3}" y="${b.z + hh / 2 - 0.2}" font-size="1">⭐</text>`;
      s += `</g>`;
    });
    // peões
    const groups = {}; P.players.forEach((p, i) => { if (p.out) return; const k = p.pos.b ? 'b' + p.pos.b : 'n' + p.pos.n; (groups[k] = groups[k] || []).push(i); });
    Object.values(groups).forEach((ids) => ids.forEach((i, k) => {
      const p = P.players[i]; let x, z; if (p.pos.b) { const b = BLD[p.pos.b]; x = b.x; z = b.z + (b.id === 'praca' ? 3.6 : 0); } else { x = L.nodes[p.pos.n].x; z = L.nodes[p.pos.n].z; }
      const a = (k / ids.length) * Math.PI * 2, rr = ids.length > 1 ? 1.1 : 0; x += Math.cos(a) * rr; z += Math.sin(a) * rr - (p.pos.b ? 1.6 : 0);
      s += `<g pointer-events="none"><circle cx="${x}" cy="${z}" r="${i === seat ? 1.15 : 0.95}" fill="${p.color}" stroke="${i === seat ? '#fff' : '#1a1a1a'}" stroke-width="${i === seat ? 0.35 : 0.15}"/><text x="${x}" y="${z + 0.42}" font-size="1.15" text-anchor="middle">${p.character.emoji}</text></g>`;
    }));
    return s + '</svg>';
  }
  function mapLegend(seat) {
    const h = C.hand, P = C.pub; const mv = h.opts.find((o) => o.type === 'move');
    if (mv && P.turn === seat) return `<div class="map-legend">🎲 Tiraste <b>${P.ts.roll}</b>. Toca num sítio a <b>brilhar</b> e confirma em baixo.</div>`;
    const me = P.players[seat]; return `<div class="map-legend">Estás <b>${esc(whereTxtP(P, me))}</b> · Os teus negócios têm contorno <span style="color:${me.color};font-weight:900">■</span> · Toca num edifício para saber mais.</div>`;
  }
  function whereTxtP(P, p) { if (p.pos.b) { const b = BLD[p.pos.b]; return b.type === 'house' ? bldLabel(P, b).name.replace('Casa de', 'em casa de') : CG.em(b.id); } const n = L.nodes[p.pos.n]; return n.name ? 'na ' + n.name : 'a caminho (' + CG.BAIRRO[n.bairro] + ')'; }
  function bindMap(seat) {
    const wrap = $('#mapw'), svg = $('#map'); if (!svg) return;
    const setV = (v) => { C.view = v; svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`); };
    const zoom = (f, cx, cy) => { const v = Object.assign({}, C.view || VB0); const nw = Math.max(14, Math.min(80, v.w * f)), nh = nw * (v.h / v.w); cx = cx == null ? v.x + v.w / 2 : cx; cy = cy == null ? v.y + v.h / 2 : cy; setV({ x: cx - (cx - v.x) * (nw / v.w), y: cy - (cy - v.y) * (nh / v.h), w: nw, h: nh }); };
    $('#zIn').onclick = () => zoom(0.7); $('#zOut').onclick = () => zoom(1.4); $('#zFit').onclick = () => setV(Object.assign({}, VB0));
    const pts = new Map(); let moved = 0, pinch0 = null;
    const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(), v = C.view || VB0; const s = Math.max(v.w / r.width, v.h / r.height); const ox = (r.width * s - v.w) / 2, oy = (r.height * s - v.h) / 2; return { x: v.x + (cx - r.left) * s - ox, y: v.y + (cy - r.top) * s - oy, s }; };
    wrap.addEventListener('pointerdown', (e) => { if (e.target.closest('.map-zoom,.map-legend')) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), v: Object.assign({}, C.view || VB0) }; } });
    wrap.addEventListener('pointermove', (e) => { const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size === 1 && moved > 6) { const s = toSvg(0, 0).s; const v = Object.assign({}, C.view || VB0); setV({ x: v.x - dx * s, y: v.y - dy * s, w: v.w, h: v.h }); }
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2 && pinch0) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const f = pinch0.d / d; const c = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2); C.view = pinch0.v; zoom(f, c.x, c.y); } });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = null; };
    wrap.addEventListener('pointerup', (e) => { const wasTap = moved < 8 && pts.size === 1; up(e); if (!wasTap) return; const t = e.target.closest('[data-bld],[data-node]'); if (!t) return; onMapTap(seat, t.dataset.bld ? 'b:' + t.dataset.bld : 'n' + t.dataset.node); });
    wrap.addEventListener('pointercancel', up);
  }
  function onMapTap(seat, key) {
    const mv = C.hand.opts.find((o) => o.type === 'move');
    if (mv && mv.reach.includes(key)) { C.sel = key; renderPlayer(); return; }
    if (key.startsWith('b:')) bldSheet(key.slice(2));
  }
  function bldSheet(id) {
    const P = C.pub, b = BLD[id], B = P.bld[id], lab = bldLabel(P, b);
    const sus = Object.keys(P.homes).find((k) => P.homes[k] === id); const here = P.players.filter((p) => p.pos.b === id && !p.out);
    sheet(`<h3>${lab.icon} ${esc(lab.name)}</h3><div class="small muted">${CG.BAIRRO[b.bairro]} · ${b.type === 'biz' ? 'Negócio' : b.type === 'public' ? 'Edifício público' : b.type === 'praca' ? 'Praça' : 'Habitação'}</div>
      ${b.type === 'biz' ? `<p>${B.owner != null ? `Dono: <b style="color:${P.players[B.owner].color}">${esc(P.players[B.owner].name)}</b> · renda ${B.up ? 20 : 10}` : `Sem dono · preço ${b.price} escudos`}${B.closed ? ' · 🔒 fechado nesta ronda' : ''}</p>` : ''}
      ${sus != null ? `<p>Aqui mora <b>${esc(CG.SUS[sus].full)}</b>, ${esc(CG.SUS[sus].role)}. Vem cá falar com ${CG.SUS[sus].name.endsWith('a') || ['Amélia', 'Rosa', 'Celeste', 'Mariana'].includes(CG.SUS[sus].name) ? 'ela' : 'ele'} para ouvires a sua versão.</p>` : ''}
      ${B.rumors ? `<p>🗞️ Ainda há <b>${B.rumors}</b> rumor${B.rumors > 1 ? 'es' : ''} aqui.</p>` : b.type !== 'house' && id !== 'praca' ? '<p class="muted">Já não há rumores aqui.</p>' : ''}
      ${SERVICE[id] ? `<p class="small">${esc(SERVICE[id])}</p>` : ''}
      ${here.length ? `<p class="small">Aqui estão: ${here.map((p) => `${p.character.emoji} ${esc(p.name)}`).join(', ')}</p>` : ''}`);
  }

  /* ----------------------------------------------------------- separadores */
  const CATS = [['all', 'Todas'], ['quem', 'Quem'], ['onde', 'Onde'], ['comque', 'Com quê'], ['quando', 'Quando']];
  function clueHTML(c, extra = '') { return `<div class="clue ${extra}" data-cid="${c.id}"><div class="meta"><span>${esc(c.tn || '')} · ${c.cats.map((k) => CG.CATNAME[k]).join(' + ')}</span><span class="${c.mine ? 'mine' : ''}">${c.mine ? '🃏 carta tua' : ''}</span></div><div class="t">${esc(c.txt)}</div>${c.src ? `<div class="small" style="color:#7d6a45;margin-top:6px">${esc(c.src)}</div>` : ''}</div>`; }
  function cluesHTML() {
    const h = C.hand; const list = h.known.filter((c) => C.filter === 'all' || c.cats.includes(C.filter)).slice().reverse();
    return `<div class="filters">${CATS.map(([k, n]) => `<button data-f="${k}" class="${C.filter === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="small muted">${h.known.length} pistas · 🃏 = carta tua (podem pedir-ta em interrogatórios)</div>
      ${list.length ? list.map((c) => clueHTML(c)).join('') : '<div class="empty">Ainda não tens pistas nesta categoria.</div>'}`;
  }
  const traitS = (s) => `${s.mao} · ${s.altura} · mora no ${CG.BAIRRO[s.mora].replace('Porto de Pesca', 'Porto')} · ${s.oculos ? 'usa óculos' : 'sem óculos'} · ${s.fuma ? 'fuma' : 'não fuma'}`;
  const traitL = (l) => `${CG.BAIRRO[l.bairro]} · ${l.luz ? 'iluminado à noite' : 'às escuras'} · ${l.mar ? 'vista para o mar' : 'sem vista de mar'} · ${l.cave ? 'tem cave' : 'sem cave'}`;
  const traitO = (o) => `${o.material} · ${o.peso} · vende-se no ${CG.BAIRRO[o.vende].replace('Porto de Pesca', 'Porto')}`;
  const traitH = (i) => ['antes do comboio', 'antes do comboio', 'depois do comboio, antes do temporal', 'durante o temporal, antes do sino', 'à meia-noite (sino), temporal', 'depois do sino, temporal'][i];
  function notebookHTML() {
    const m = C.hand.marks || {};
    const row = (key, name, tr, emoji) => { const v = m[key] || ''; return `<div class="row ${v}"><div><div class="nm">${emoji ? emoji + ' ' : ''}${esc(name)}</div><div class="tr">${esc(tr)}</div></div><div class="tri" data-k="${key}"><button data-v="x" class="${v === 'x' ? 'on x' : ''}">✗</button><button data-v="q" class="${v === 'q' ? 'on q' : ''}">?</button><button data-v="v" class="${v === 'v' ? 'on v' : ''}">✓</button></div></div>`; };
    const left = (pre, n) => n - Object.keys(m).filter((k) => k.startsWith(pre) && m[k] === 'x').length;
    return `<div class="nb"><p class="small muted">O caderno não deduz nada sozinho. Marca ✗ o que já excluíste, ✓ o que tens a certeza e ? o que suspeitas.</p>
      <h3>Quem <small>${left('s', 8)} de 8 possíveis</small></h3>${CG.SUS.map((s) => row('s' + s.id, s.full + ' — ' + s.role, traitS(s), s.emoji)).join('')}
      <h3>Onde <small>${left('l', 10)} de 10</small></h3>${CG.LOC.map((l) => row('l' + l.id, l.name, traitL(l), ICON[l.b])).join('')}
      <h3>Com quê <small>${left('o', 8)} de 8</small></h3>${CG.OBJ.map((o) => row('o' + o.id, o.name, traitO(o), o.emoji)).join('')}
      <h3>Quando <small>${left('h', 6)} de 6</small></h3>${CG.HOR.map((x, i) => row('h' + i, x, traitH(i), '🕰️')).join('')}
      <p class="small muted">Comboio: 21h30 · Temporal: desde as 22h30 · Sino: meia-noite.</p>
      <h3>Notas</h3><textarea id="notes" rows="6" placeholder="As tuas deduções…">${esc(C.hand.notes || '')}</textarea></div>`;
  }
  function meHTML() {
    const P = C.pub, seat = mySeat(), me = P.players[seat], c = me.character, pw = C.hand.power;
    return `<div class="card me-card" style="--c:${me.color}"><div style="display:flex;gap:12px;align-items:center"><div style="font-size:44px">${esc(c.emoji)}</div><div><div class="serif" style="font-size:21px;font-weight:700">${esc(c.title || me.name)}</div><div class="muted small">${esc(c.role)}${c.nick ? ' · «' + esc(c.nick) + '»' : ''}</div></div></div>${c.bio ? `<p class="muted">${esc(c.bio)}</p>` : ''}${c.motto ? `<p style="font-style:italic;color:var(--gold2)">“${esc(c.motto)}”</p>` : ''}</div>
      <div class="card"><span class="tag gold">Poder</span> <b>${esc(c.power.name)}</b> ${pw.used ? '<span class="tag">usado</span>' : ''}<p class="small" style="margin-bottom:0">${esc(pw.regra)}</p></div>
      <div class="card"><h3 style="margin-top:0">Os teus negócios</h3>${me.biz.map((b) => `<div class="biz"><span>${ICON[b]} <b>${esc(BLD[b].name)}</b>${P.bld[b].up ? ' ⭐' : ''}</span><span class="small muted">renda ${P.bld[b].up ? 20 : 10}${P.bld[b].closed ? ' · 🔒' : ''}</span></div>`).join('') || '<p class="muted">Nenhum.</p>'}
      <p class="small muted">Casa: ${esc(bldLabel(P, BLD[me.home]).name)} (${CG.BAIRRO[BLD[me.home].bairro]}) · ${me.passedStart ? '🏁 já passaste pela Partida' : '🏁 ainda não passaste pela Partida (precisas para fazer suspeitas)'}</p></div>
      <h3>Regras</h3>${rulesHTML()}
      <button class="btn ghost" id="pLeave" style="width:100%;margin-top:10px">Sair da partida</button>`;
  }
  function bindTabs() {
    $$('[data-f]').forEach((b) => (b.onclick = () => { C.filter = b.dataset.f; renderPlayer(); }));
    $$('.tri').forEach((t) => $$('button', t).forEach((b) => (b.onclick = () => { const k = t.dataset.k; const v = C.hand.marks[k] === b.dataset.v ? '' : b.dataset.v; if (v) C.hand.marks[k] = v; else delete C.hand.marks[k]; send({ type: 'mark', key: k, val: v }, false); renderPlayer(); })));
    const n = $('#notes'); if (n) n.oninput = () => { clearTimeout(C.notesT); C.notesT = setTimeout(() => { C.hand.notes = n.value; send({ type: 'mark', notes: n.value }, false); }, 1200); };
    const lv = $('#pLeave'); if (lv) lv.onclick = leavePlayer;
  }

  /* ----------------------------------------------------------- ações */
  const ABTN = {
    roll: ['🎲 Lançar o dado', 'primary full'], stay: ['Ficar aqui', ''], travel: ['🚂 Comboio', ''], investigate: ['🔍 Investigar', 'primary'], interrogate: ['❓ Interrogar', 'primary'], ask: ['🚪 Falar com o suspeito', 'primary'],
    informador: ['🕵️ Informador', ''], silenciar: ['🤫 Calar um rumor', ''], arquivo: ['📚 Arquivo', ''], cartorio: ['📜 Cartório', ''], mandado: ['🚨 Mandado', 'danger'], jornal: ['📰 Comprar o Jornal', ''],
    buy: ['💰 Comprar negócio', 'primary'], upgrade: ['⭐ Melhorar', ''], accuse: ['🔐 Acusação final', 'danger full'], suspeita: ['🤔 Suspeita', ''], close: ['🔒 Fechar negócio', ''], testamento: ['⚖️ Testamento', ''], offer: ['🤝 Negociar', ''], end: ['✅ Terminar a vez', 'green full'],
  };
  const ORDER = ['roll', 'stay', 'travel', 'investigate', 'interrogate', 'ask', 'buy', 'upgrade', 'informador', 'silenciar', 'arquivo', 'cartorio', 'mandado', 'jornal', 'accuse', 'suspeita', 'testamento', 'close', 'offer', 'end'];
  function actionsHTML(seat) {
    const P = C.pub, h = C.hand; if (P.phase !== 'play' || P.turn !== seat || P.pending || P.anim || P.gate || P.chal) return '';
    if (C.busyV >= 0) return `<div class="actions"><div class="hint full"><span class="spin">⏳</span> A enviar…</div></div>`;
    const ops = h.opts.filter((o) => ABTN[o.type]); const by = Object.fromEntries(ops.map((o) => [o.type, o]));
    let out = '';
    const mv = h.opts.find((o) => o.type === 'move');
    if (mv) { out += C.sel && mv.reach.includes(C.sel) ? `<button class="btn primary full" data-a="go">➡️ Ir para ${esc(keyName(C.sel))}</button>` : C.tab !== 'map' ? `<button class="btn primary full" data-a="tomap">🗺️ Escolher destino no mapa (tiraste ${P.ts.roll})</button>` : ''; }
    const MORE = ['close', 'offer', 'testamento']; const more = MORE.filter((t) => by[t]);
    ORDER.forEach((t) => { const o = by[t]; if (!o || MORE.includes(t)) return; if (t === 'end' && more.length) out += `<button class="btn" data-a="more">⋯ Mais ações</button>`; const [label, cls] = ABTN[t]; const price = o.price ? `<span class="p">${o.price} escudos</span>` : t === 'travel' ? '<span class="p">20 escudos</span>' : t === 'interrogate' && o.remote ? '<span class="p">pelos Correios</span>' : t === 'ask' ? `<span class="p">${esc(CG.SUS[o.sus].name)}</span>` : ''; out += `<button class="btn ${cls}" data-a="${t}">${label}${price}</button>`; });
    if (P.ts && P.ts.acted && !mv) out = `<div class="hint">Já fizeste a ação principal. Podes fazer ações livres ou terminar.</div>` + out;
    return `<div class="actions">${out}</div>`;
  }
  function keyName(k) { if (k.startsWith('b:')) return bldLabel(C.pub, BLD[k.slice(2)]).name; const n = L.nodes[+k.slice(1)]; return n.name || 'esta casa do caminho'; }
  function bindActions(seat) { $$('[data-a]').forEach((b) => bindActionsOne(b, seat)); }
  function bindActionsOne(b, seat) {
    {(b.onclick = () => {
      const t = b.dataset.a, o = C.hand.opts.find((x) => x.type === t);
      switch (t) {
        case 'go': { const k = C.sel; C.sel = null; return send({ type: 'move', dest: k }); }
        case 'tomap': C.tab = 'map'; return renderPlayer();
        case 'more': { const items = ['close', 'offer', 'testamento'].filter((x) => C.hand.opts.some((o) => o.type === x)).map((x) => ({ v: x, l: ABTN[x][0], s: x === 'close' ? '30 escudos · ninguém investiga lá nesta ronda' : x === 'offer' ? 'comprar ou vender uma pista' : 'confirmar uma categoria (1 vez)' })); return pickSheet('Mais ações', items, (x) => { closeSheet(); const fake = document.createElement('button'); fake.dataset.a = x; document.body.appendChild(fake); bindActionsOne(fake, seat); fake.click(); fake.remove(); }); }
        case 'roll': C.tab = 'map'; C.sel = null; return send({ type: 'roll' });
        case 'stay': case 'investigate': case 'ask': case 'arquivo': case 'jornal': case 'upgrade': return send({ type: t });
        case 'buy': return confirmSheet(`Comprar ${BLD[C.pub.players[seat].pos.b].name} por ${o.price} escudos?`, () => send({ type: 'buy' }));
        case 'end': return send({ type: 'end' });
        case 'travel': return pickSheet('Para onde vais de comboio?', Object.entries(L.PARAGENS).filter(([, k]) => k !== locKeyP(C.pub.players[seat])).map(([n, k]) => ({ v: k, l: { estacao: '🚂 Estação (Alto)', porto: '⚓ Paragem do Porto', centro: '🏁 Partida (Centro)' }[n] })), (k) => send({ type: 'travel', to: k }));
        case 'interrogate': return interrogateSheet(seat, o);
        case 'informador': case 'silenciar': return pickSheet(t === 'informador' ? 'De que edifício queres um rumor?' : 'Que rumor queres calar?', Object.keys(C.pub.bld).filter((k) => C.pub.bld[k].rumors).map((k) => ({ v: k, l: `${ICON[k] || '🏠'} ${BLD[k].name}`, s: `${C.pub.bld[k].rumors} rumor(es)` })), (k) => send({ type: t, bld: k }));
        case 'cartorio': case 'mandado': return pickSheet(t === 'cartorio' ? 'De quem queres ver um testemunho?' : 'Contra quem é o Mandado?', playersExcept(seat, t === 'cartorio'), (k) => send({ type: t, target: k }));
        case 'close': return pickSheet('Que negócio fechas nesta ronda? (30 escudos)', C.pub.players[seat].biz.filter((x) => !C.pub.bld[x].closed).map((x) => ({ v: x, l: `${ICON[x]} ${BLD[x].name}` })), (k) => send({ type: 'close', bld: k }));
        case 'suspeita': return theorySheet('🤔 Suspeita', 'Diz uma teoria completa. O primeiro jogador à tua esquerda que a puder contradizer mostra-te uma carta.', 'Fazer suspeita', (th) => send(Object.assign({ type: 'suspeita' }, th)));
        case 'accuse': return theorySheet('🔐 Acusação final', 'Só tens uma. Se errares, sais do jogo.', 'Acusar', (th) => confirmSheet(`Tens a certeza? ${CG.SUS[th.s].name} · ${CG.LOC[th.l].name} · ${CG.OBJ[th.o].name} · ${CG.HOR[th.h]}`, () => send(Object.assign({ type: 'accuse' }, th)), 'Sim, acusar'));
        case 'testamento': return theorySheet('⚖️ O Testamento', 'Escolhe a tua teoria; a seguir escolhes uma categoria para confirmar.', 'Continuar', (th) => pickSheet('Que categoria queres confirmar?', [['s', 'Quem'], ['l', 'Onde'], ['o', 'Com quê'], ['h', 'Quando']].map(([v, l]) => ({ v, l })), (c) => send(Object.assign({ type: 'testamento', cat: c }, th))));
        case 'offer': return offerSheet(seat);
      }
    });}
  }
  const locKeyP = (p) => (p.pos.b ? 'b:' + p.pos.b : 'n' + p.pos.n);
  function playersExcept(seat, needCards) { return C.pub.players.map((p, i) => ({ p, i })).filter(({ p, i }) => i !== seat && (!needCards || p.cardsN) && (needCards || !p.out)).map(({ p, i }) => ({ v: i, l: `${p.character.emoji} ${p.name}`, s: `${whereTxtP(C.pub, p)} · 🃏 ${p.cardsN}` })); }

  /* ----------------------------------------------------------- folhas */
  function sheet(html) { const s = $('#sheet'); $('.shb', s).innerHTML = html; s.classList.add('open'); s.onclick = (e) => { if (e.target === s) closeSheet(); }; return s; }
  function closeSheet() { $('#sheet').classList.remove('open'); }
  function pickSheet(title, items, onPick) {
    const s = sheet(`<h3>${esc(title)}</h3>${items.length ? `<div class="opt-grid">${items.map((it, k) => `<button class="opt" data-k="${k}">${esc(it.l)}${it.s ? `<small>${esc(it.s)}</small>` : ''}</button>`).join('')}</div>` : '<p class="muted">Não há opções.</p>'}<button class="btn ghost" style="width:100%;margin-top:12px" id="shX">Cancelar</button>`);
    $$('[data-k]', s).forEach((b) => (b.onclick = () => onPick(items[+b.dataset.k].v))); $('#shX', s).onclick = closeSheet;
  }
  function confirmSheet(q, ok, label = 'Confirmar') { const s = sheet(`<h3>${esc(q)}</h3><div class="opt-grid"><button class="btn" id="cN">Cancelar</button><button class="btn primary" id="cY">${esc(label)}</button></div>`); $('#cN', s).onclick = closeSheet; $('#cY', s).onclick = () => { closeSheet(); ok(); }; }
  function interrogateSheet(seat, o) {
    const st = { t: o.targets.length === 1 ? o.targets[0] : null, c: null, confess: false }; const pw = C.hand.power;
    const draw = () => {
      const s = sheet(`<h3>❓ Interrogar</h3>${o.remote ? '<p class="small muted">À distância, pelos Correios.</p>' : ''}
        <div class="small muted" style="margin:6px 0">Quem?</div><div class="opt-grid">${o.targets.map((i) => { const p = C.pub.players[i]; return `<button class="opt ${st.t === i ? 'sel' : ''}" data-t="${i}">${p.character.emoji} ${esc(p.name)}<small>🃏 ${p.cardsN} cartas</small></button>`; }).join('')}</div>
        <div class="small muted" style="margin:12px 0 6px">Sobre o quê?</div><div class="opt-grid">${['quem', 'onde', 'comque', 'quando'].map((c) => `<button class="opt ${st.c === c ? 'sel' : ''}" data-c="${c}">${CG.CATNAME[c]}</button>`).join('')}</div>
        ${pw.id === 'padre' && !pw.used ? `<label class="opt ${st.confess ? 'sel' : ''}" id="iConf" style="display:block;margin-top:12px">⛪ Usar Confissão (2 cartas)</label>` : ''}
        <button class="btn primary" style="width:100%;margin-top:14px" id="iGo" ${st.t == null || !st.c ? 'disabled' : ''}>Interrogar</button>`);
      $$('[data-t]', s).forEach((b) => (b.onclick = () => { st.t = +b.dataset.t; draw(); })); $$('[data-c]', s).forEach((b) => (b.onclick = () => { st.c = b.dataset.c; draw(); }));
      const cf = $('#iConf', s); if (cf) cf.onclick = () => { st.confess = !st.confess; draw(); };
      $('#iGo', s).onclick = () => send({ type: 'interrogate', target: st.t, cat: st.c, confess: st.confess });
    };
    draw();
  }
  function theorySheet(title, help, label, onOk) {
    const m = C.hand.marks || {}; const th = C.theory || { s: null, l: null, o: null, h: null };
    const draw = () => {
      const chips = (key, arr, nm) => `<div class="cat"><h4>${nm}</h4><div class="chips">${arr.map((x, i) => `<button data-th="${key}${i}" class="${th[key] === i ? 'on' : ''} ${m[key + i] === 'x' ? 'x' : ''}">${esc(x)}</button>`).join('')}</div></div>`;
      const s = sheet(`<h3>${esc(title)}</h3><p class="small muted">${esc(help)}</p><div class="theory">${chips('s', CG.SUS.map((x) => x.emoji + ' ' + x.name), 'Quem')}${chips('l', CG.LOC.map((x) => x.name), 'Onde')}${chips('o', CG.OBJ.map((x) => x.emoji + ' ' + x.name), 'Com quê')}${chips('h', CG.HOR, 'Quando')}</div>
        <button class="btn primary" style="width:100%;margin-top:14px" id="thGo" ${[th.s, th.l, th.o, th.h].some((x) => x == null) ? 'disabled' : ''}>${esc(label)}</button>`);
      $$('[data-th]', s).forEach((b) => (b.onclick = () => { const k = b.dataset.th[0], i = +b.dataset.th.slice(1); th[k] = i; C.theory = th; draw(); }));
      $('#thGo', s).onclick = () => onOk(Object.assign({}, th));
    };
    draw();
  }
  function offerSheet(seat) {
    const st = { t: null, mode: 'buy', price: 40, clue: null };
    const draw = () => {
      const mineK = C.hand.known;
      const s = sheet(`<h3>🤝 Negociar</h3><div class="small muted">Com quem?</div><div class="opt-grid">${playersExcept(seat, false).map((it) => `<button class="opt ${st.t === it.v ? 'sel' : ''}" data-t="${it.v}">${esc(it.l)}</button>`).join('')}</div>
        <div class="seg" style="margin-top:12px"><button data-m="buy" class="${st.mode === 'buy' ? 'on' : ''}">Comprar uma pista<small>ele escolhe qual</small></button><button data-m="sell" class="${st.mode === 'sell' ? 'on' : ''}">Vender uma pista<small>tu escolhes qual</small></button></div>
        <div style="display:flex;align-items:center;gap:10px;justify-content:center;margin:14px 0"><button class="btn small" id="pm">−10</button><b style="font-size:22px">${st.price} escudos</b><button class="btn small" id="pp">+10</button></div>
        ${st.mode === 'sell' ? `<div class="small muted">Que pista vendes?</div>${mineK.slice().reverse().map((c) => clueHTML(c, 'pick ' + (st.clue === c.id ? 'sel' : ''))).join('')}` : ''}
        <button class="btn primary" style="width:100%;margin-top:12px" id="oGo" ${st.t == null || (st.mode === 'sell' && !st.clue) ? 'disabled' : ''}>Fazer proposta</button>`);
      $$('[data-t]', s).forEach((b) => (b.onclick = () => { st.t = +b.dataset.t; draw(); })); $$('[data-m]', s).forEach((b) => (b.onclick = () => { st.mode = b.dataset.m; draw(); }));
      $('#pm', s).onclick = () => { st.price = Math.max(0, st.price - 10); draw(); }; $('#pp', s).onclick = () => { st.price = Math.min(500, st.price + 10); draw(); };
      $$('.clue.pick', s).forEach((b) => (b.onclick = () => { st.clue = b.dataset.cid; draw(); }));
      $('#oGo', s).onclick = () => send({ type: 'offer', target: st.t, mode: st.mode, price: st.price, clue: st.clue });
    };
    draw();
  }

  /* ----------------------------------------------------------- pedido de resposta (cartas) */
  function renderAsk(seat) {
    const old = $('.ask'); if (old) old.remove(); const a = C.hand.ask; if (!a || C.busyV >= 0) return;
    const P = C.pub; const who = P.players[a.to != null ? a.to : a.from]; const el = document.createElement('div'); el.className = 'ask'; const sel = new Set();
    let head = '';
    if (a.kind === 'show' && a.reason === 'interrogate') head = `<span class="tag gold">Interrogatório</span><h2>${esc(who.character.emoji)} ${esc(who.name)} quer saber sobre ${esc(CG.CATNAME[a.cat].toUpperCase())}</h2><p class="muted">Tens de mostrar ${a.n === 1 ? '1 carta' : a.n + ' cartas'}. Escolhe a que revela menos.</p>`;
    else if (a.kind === 'show') { const f = (P.fx || []).slice().reverse().find((x) => x.kind === 'suspeita'); head = `<span class="tag gold">Suspeita</span><h2>${esc(who.name)} desconfia: ${f ? esc(f.sub.split('.')[0]) : ''}</h2><p class="muted">Tens cartas que contradizem esta teoria. Mostra uma.</p>`; }
    else if (a.kind === 'pick') head = `<span class="tag gold">Ouvido de Balcão</span><h2>Escolhe o rumor com que ficas</h2>`;
    else if (a.kind === 'offer' && a.mode === 'sell') head = `<span class="tag gold">Proposta</span><h2>${esc(P.players[a.from].name)} vende-te uma pista por ${a.price} escudos</h2><p class="muted">Só vês o que diz depois de pagares.</p>`;
    else head = `<span class="tag gold">Proposta</span><h2>${esc(P.players[a.from].name)} paga-te ${a.price} escudos por uma pista</h2><p class="muted">Se aceitares, escolhe qual mostras.</p>`;
    const offerSell = a.kind === 'offer' && a.mode === 'sell'; const need = a.kind === 'offer' ? (a.mode === 'buy' ? 1 : 0) : a.n || 1;
    el.innerHTML = `${head}${a.options.map((c) => clueHTML(c, offerSell ? '' : 'pick')).join('')}<div class="sticky" style="display:flex;gap:8px">${a.kind === 'offer' ? '<button class="btn danger" id="aNo" style="flex:1">Recusar</button>' : ''}<button class="btn primary" id="aYes" style="flex:2" ${need ? 'disabled' : ''}>${a.kind === 'offer' ? 'Aceitar' : 'Mostrar'}</button></div>`;
    document.body.appendChild(el);
    $$('.clue.pick', el).forEach((c) => (c.onclick = () => { const id = c.dataset.cid; if (sel.has(id)) sel.delete(id); else { if (sel.size >= Math.max(1, need)) sel.delete([...sel][0]); sel.add(id); } $$('.clue.pick', el).forEach((x) => x.classList.toggle('sel', sel.has(x.dataset.cid))); $('#aYes', el).disabled = sel.size < need; }));
    $('#aYes', el).onclick = () => { el.remove(); send({ type: 'respond', pick: [...sel], accept: true }); };
    const no = $('#aNo', el); if (no) no.onclick = () => { el.remove(); send({ type: 'respond', accept: false }); };
  }

  /* ----------------------------------------------------------- jornal no telemóvel */
  function renderGate(seat) {
    const old = $('.gate'); if (old) old.remove(); const P = C.pub, g = P.gate; if (!g || !g.need.includes(seat)) return;
    const done = g.ack.includes(seat) || C.ackSent === g.txt; const el = document.createElement('div'); el.className = 'gate';
    el.innerHTML = `<div class="paper sm"><div class="mast"><h1>Jornal da Vila</h1></div><div class="kick">ÚLTIMA HORA</div><div class="head">${esc(g.txt)}</div><div class="small" style="margin-top:8px;color:#6b5a3a">${g.cats.map((c) => CG.CATNAME[c]).join(' + ')} · pista pública</div></div>
      <div class="sticky">${done ? `<div class="hint center muted" style="padding:14px">✓ Leste. À espera dos outros (${g.ack.length}/${g.need.length})…</div>` : '<button class="btn big primary" id="gOk">✓ Li o jornal</button>'}</div>`;
    document.body.appendChild(el); const b = $('#gOk', el); if (b) b.onclick = () => { C.ackSent = g.txt; SND.play('tap'); send({ type: 'ack' }, false); renderGate(seat); };
  }
  /* ----------------------------------------------------------- desafio no telemóvel */
  function renderChalPhone(seat) {
    const old = $('.chalp'); if (old) old.remove(); const P = C.pub, X = P.chal; if (!X) return;
    const need = X.needs.includes(seat) && C.chalSent !== JSON.stringify([X.step, X.round, X.game]); const by = P.players[X.by]; const involved = seat === X.by || seat === X.opp || X.game === 'votacao';
    if (!involved && !need) return;
    const el = document.createElement('div'); el.className = 'chalp ask'; const G = X.mode === 'duel' ? CG.DUEL_GAMES : CG.GROUP_GAMES;
    const head = `<span class="tag gold">⚔️ Carta Desafio · ${X.mode === 'duel' ? 'frente a frente' : 'contra a vila'}</span><h2>${esc(X.game ? G[X.game] : seat === X.by ? 'Encontraste uma carta desafio!' : by.name + ' encontrou uma carta desafio')}</h2>`;
    const sendMove = (a) => { C.chalSent = JSON.stringify([X.step, X.round, X.game]); SND.play('tap'); send(Object.assign({ type: 'chal' }, a), false); renderChalPhone(seat); };
    let body = '';
    if (!need) body = `<p class="muted">À espera ${X.step === 'setup' ? 'que ' + esc(by.name) + ' escolha o prémio' : 'dos outros'}… Vê a TV.</p>`;
    else if (X.step === 'setup') {
      const st = C.chalSetup || (C.chalSetup = { reward: null, who: null });
      const others = P.players.map((p, i) => ({ p, i })).filter(({ p, i }) => i !== seat && !p.out);
      const needWho = X.mode === 'duel' || st.reward === 'carta' || st.reward === 'negocio';
      body = `<p class="muted">${X.mode === 'duel' ? 'Escolhe o prémio e o adversário. O jogo é sorteado. Se perderes, não ganhas nada e passas a vez.' : 'Tu contra o resto da vila. Escolhe o prémio. Se perderes, não ganhas nada e passas a vez.'}</p>
        <div class="small muted">Prémio</div><div class="opt-grid">${Object.entries(CG.REWARDS).map(([k, t]) => `<button class="opt ${st.reward === k ? 'sel' : ''}" data-rw="${k}">${{ carta: '🃏', negocio: '🏪', dinheiro: '💰', pista: '🔍' }[k]} ${esc(X.mode === 'duel' ? t : t.replace(' dele', ' de alguém'))}<small>${k === 'dinheiro' ? (X.mode === 'duel' ? 'ele paga-te 60' : 'cada um paga-te 20') : ''}</small></button>`).join('')}</div>
        ${needWho ? `<div class="small muted" style="margin-top:12px">${X.mode === 'duel' ? 'Adversário' : 'De quem?'}</div><div class="opt-grid">${others.map(({ p, i }) => `<button class="opt ${st.who === i ? 'sel' : ''}" data-who="${i}">${esc(p.character.emoji)} ${esc(p.name)}<small>🃏 ${p.cardsN} · 🏪 ${p.biz.length}</small></button>`).join('')}</div>` : ''}
        <button class="btn primary big" id="chGo" style="margin-top:14px" ${!st.reward || (needWho && st.who == null) ? 'disabled' : ''}>⚔️ Desafiar!</button>`;
    } else if (X.step === 'tiebreak') body = `<p>Precisas de <b>8 ou mais</b> com 2 dados.</p><button class="btn primary big" id="chRoll">🎲 Lançar os dados</button>`;
    else if (X.game === 'ppt') body = `<p class="muted">Escolhe em segredo.</p><div class="opt-grid" style="grid-template-columns:1fr 1fr 1fr">${[['pedra', '🪨'], ['papel', '📄'], ['tesoura', '✂️']].map(([k, e]) => `<button class="opt center" data-mv="${k}" style="font-size:40px;text-align:center">${e}<small>${k}</small></button>`).join('')}</div>`;
    else if (X.game === 'parimpar') { const st = C.pi || (C.pi = { pick: null, n: null }); body = `${seat === X.by ? `<div class="seg"><button data-pk="par" class="${st.pick === 'par' ? 'on' : ''}">Par</button><button data-pk="impar" class="${st.pick === 'impar' ? 'on' : ''}">Ímpar</button></div>` : '<p class="muted">Escolhe um número.</p>'}<div class="opt-grid" style="grid-template-columns:repeat(3,1fr);margin-top:10px">${[0, 1, 2, 3, 4, 5].map((n) => `<button class="opt ${st.n === n ? 'sel' : ''}" data-n="${n}" style="font-size:26px;text-align:center">${n}</button>`).join('')}</div><button class="btn primary big" id="piGo" style="margin-top:12px" ${st.n == null || (seat === X.by && !st.pick) ? 'disabled' : ''}>Confirmar</button>`; }
    else if (X.game === 'dados') body = `<p class="muted">Ganha quem tiver a soma maior.</p><button class="btn primary big" id="chRoll">🎲 Lançar 2 dados</button>`;
    else if (X.game === 'trivia') body = `<div class="card"><b style="font-size:20px">${esc(X.q.t)}</b></div><div class="stack">${X.q.o.map((o, k) => `<button class="opt" data-mv="${k}">${'ABCD'[k]}. ${esc(o)}</button>`).join('')}</div>`;
    else if (X.game === 'votacao') body = `<div class="card"><b style="font-size:20px">«${esc(X.q.t)}»</b></div><p class="muted">${seat === X.by ? 'Quem achas que a MAIORIA vai escolher?' : 'Vota com sinceridade (é secreto).'}</p><div class="opt-grid">${P.players.map((p, i) => `<button class="opt" data-mv="${i}">${esc(p.character.emoji)} ${esc(p.name)}</button>`).join('')}</div>`;
    el.innerHTML = head + body; document.body.appendChild(el);
    $$('[data-rw]', el).forEach((b) => (b.onclick = () => { C.chalSetup.reward = b.dataset.rw; renderChalPhone(seat); }));
    $$('[data-who]', el).forEach((b) => (b.onclick = () => { C.chalSetup.who = +b.dataset.who; renderChalPhone(seat); }));
    const go = $('#chGo', el); if (go) go.onclick = () => { const st = C.chalSetup; C.chalSetup = null; sendMove({ reward: st.reward, who: st.who }); };
    const rl = $('#chRoll', el); if (rl) rl.onclick = () => { SND.play('dice'); sendMove({}); };
    $$('[data-mv]', el).forEach((b) => (b.onclick = () => sendMove({ move: X.game === 'ppt' ? b.dataset.mv : +b.dataset.mv })));
    $$('[data-pk]', el).forEach((b) => (b.onclick = () => { C.pi.pick = b.dataset.pk; renderChalPhone(seat); }));
    $$('[data-n]', el).forEach((b) => (b.onclick = () => { C.pi.n = +b.dataset.n; renderChalPhone(seat); }));
    const pg = $('#piGo', el); if (pg) pg.onclick = () => { const st = C.pi; C.pi = null; sendMove({ move: { pick: st.pick, n: st.n } }); };
  }

  /* =================================================================== modo de teste: ver o telemóvel de um lugar */
  app.commit = (S) => commit(S); app.playFx = (f) => playFx(f); app.cut = (f, ms) => cut(f, ms);
  app.demoPhone = (seat) => { const S = H.S; S.players[seat].uid = app.myUid; H.handCache = {}; persist(); setMode('player'); C.tab = 'map'; openGame(S.code); };
  app.demoStart = async (n = 5) => {
    H.setup = { pace: 'normal', players: [] };
    const names = ['António', 'Rita', 'Tomás', 'Inês', 'Duarte', 'Marta'];
    const used = []; const players = names.slice(0, n).map((nm, i) => { const c = CG.genCharacterLocal(nm, '', used); used.push(c.power.id); return { name: nm, color: CG.COLORS[i], character: c }; });
    const st = CG.createGame({ players, pace: 'normal', code: 'DEMO', seed: 4242 }); st.phase = 'lobby'; await startBoard(st); return st;
  };

  initCaps();
})();
