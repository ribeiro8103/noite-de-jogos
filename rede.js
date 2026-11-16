/* Noite de Jogos — rede entre a TV e os telemóveis, sem contas.
   Imita a API window.claude.use('room' | 'db' | 'user' | 'sample') dos jogos, ligando a TV (anfitrião)
   aos telemóveis por WebRTC (PeerJS). A TV guarda os dados; os telemóveis espelham-nos. */
(function(){
  const qs = new URLSearchParams(location.search);
  if(qs.get('peerhost')) try{ sessionStorage.setItem('nj-ph', qs.get('peerhost')); }catch(e){}
  const IS_PORTAL = !/\/jogos\/[a-z]+\//.test(location.pathname);
  let SALA = (qs.get('sala') || (IS_PORTAL ? '' : sessionStorage.getItem('nj-sala')) || '').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
  const IS_HUB = qs.get('tv') === '1' || sessionStorage.getItem('nj-tv-'+SALA) === '1';
  const GAME = (location.pathname.match(/\/jogos\/([a-z]+)\//)||[])[1] || 'portal';
  const BASE = new URL(GAME==='portal' ? './' : '../../', location.href).href;
  if(!SALA && GAME!=='portal'){ location.replace(BASE + '?jogo=' + GAME); return; }
  if(SALA){ sessionStorage.setItem('nj-sala', SALA); if(IS_HUB) sessionStorage.setItem('nj-tv-'+SALA, '1'); try{ localStorage.setItem('nj-last', JSON.stringify({ s:SALA, t:Date.now(), tv:IS_HUB?1:0 })); }catch(e){} }
  window.__SALA = SALA; window.__SALA_HUB = IS_HUB; window.__NJ_GAME = GAME;
  // o QR mostrado dentro de um jogo leva o telemóvel diretamente a esse jogo
  window.__SALA_URL = BASE + (GAME==='portal' ? '' : 'jogos/' + GAME + '/') + '?sala=' + SALA;
  const HUB_ID = 'noitejogos-v1-' + SALA.toLowerCase();
  const LSget = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const LSset = (k,v) => { try{ localStorage.setItem(k,v); }catch(e){} };
  let UID = LSget('nj-uid'); if(!UID){ UID = 'u' + Math.random().toString(36).slice(2,12); LSset('nj-uid', UID); }
  const peerOpts = () => {
    const o = { debug: 0, config: { iceServers: [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' } ] } };
    let ph = qs.get('peerhost'); if(ph) sessionStorage.setItem('nj-ph', ph); else ph = sessionStorage.getItem('nj-ph'); if(ph){ const [h,p] = ph.split(':'); Object.assign(o, { host:h, port:+(p||9000), path:'/', secure:false }); }
    return o;
  };
  const listeners = new Set(); // estado da ligação para a interface
  const status = { ok:false, phones:0, text:'A ligar…' };
  function setStatus(o){ Object.assign(status, o); listeners.forEach(f=>{ try{ f(status); }catch(e){} }); }
  window.__NJ = { status, onStatus(f){ listeners.add(f); f(status); }, SALA, IS_HUB, GAME, BASE };

  // ====================== BASE DE DADOS (espelho) ======================
  const store = new Map();
  const dbKey = 'nj-db-' + GAME;
  if(IS_HUB){ try{ const raw = LSget(dbKey); if(raw) JSON.parse(raw).forEach(([k,v])=>store.set(k,v)); }catch(e){} }
  let saveT = null;
  function persist(){ if(!IS_HUB) return; clearTimeout(saveT); saveT = setTimeout(()=>{ try{ LSset(dbKey, JSON.stringify([...store.entries()])); }catch(e){} }, 400); }
  const subs = [];
  const clone = v => v==null ? v : JSON.parse(JSON.stringify(v));
  const meta = { fromCache:false, hasPendingWrites:false };
  const snapDoc = path => { const has = store.has(path); const v = store.get(path); return { id: path.split('/').pop(), exists: has, data: () => has ? clone(v) : undefined, metadata: meta, ref: { path } }; };
  function snapCol(path, q){
    const depth = path.split('/').length + 1;
    let docs = [...store.keys()].filter(k=>k.startsWith(path+'/') && k.split('/').length===depth).map(snapDoc);
    (q.where||[]).forEach(([f,op,val])=>{ docs = docs.filter(d=>{ const x = (d.data()||{})[f];
      switch(op){ case '==': return x===val; case '!=': return x!==val; case '<': return x<val; case '<=': return x<=val; case '>': return x>val; case '>=': return x>=val;
        case 'in': return Array.isArray(val)&&val.includes(x); case 'not-in': return Array.isArray(val)&&!val.includes(x); case 'array-contains': return Array.isArray(x)&&x.includes(val); } return true; }); });
    if(q.order){ const [f,dir] = q.order; docs.sort((a,b)=>{ const x=(a.data()||{})[f], y=(b.data()||{})[f]; if(x===y) return 0; if(x===undefined) return 1; if(y===undefined) return -1; return (x<y?-1:1)*(dir==='desc'?-1:1); }); }
    else docs.sort((a,b)=>a.id<b.id?-1:1);
    if(q.limit) docs = docs.slice(0, q.limit);
    return { docs, size: docs.length, empty: !docs.length, metadata: meta, docChanges: () => docs.map((d,i)=>({type:'added', doc:d, oldIndex:-1, newIndex:i})) };
  }
  function fire(path){
    subs.slice().forEach(s=>{
      if(s.doc ? s.path===path : (path.startsWith(s.path+'/') && path.split('/').length===s.path.split('/').length+1)) { try{ s.fn(); }catch(e){ console.error(e); } }
    });
  }
  function applyLocal(path, v){ if(v===null) store.delete(path); else store.set(path, clone(v)); persist(); fire(path); }
  function dbWrite(path, v){
    applyLocal(path, v);
    if(IS_HUB) broadcast({ t:'dbset', path, v, q: ++Q });
    else send({ t:'dbw', path, v });
    return Promise.resolve();
  }
  function makeQuery(path, q){
    return {
      where(f,op,val){ return makeQuery(path, {...q, where:[...(q.where||[]), [f,op,val]]}); },
      orderBy(f,dir){ return makeQuery(path, {...q, order:[f,dir||'asc']}); },
      limit(n){ return makeQuery(path, {...q, limit:n}); },
      get(){ return Promise.resolve(snapCol(path, q)); },
      onSnapshot(fn, err){ const s = { doc:false, path, fn: () => fn(snapCol(path, q)) }; subs.push(s); setTimeout(s.fn, 0); return () => { const i = subs.indexOf(s); if(i>=0) subs.splice(i,1); }; },
    };
  }
  function docRef(path){
    return { id: path.split('/').pop(), path,
      get(){ return Promise.resolve(snapDoc(path)); },
      set(v){ return dbWrite(path, v); },
      update(v){ if(!store.has(path)) return Promise.reject({ code:'invalid_argument', message:'documento não existe' }); const cur = clone(store.get(path)); const merge=(a,b)=>{ Object.keys(b).forEach(k=>{ if(b[k] && typeof b[k]==='object' && !Array.isArray(b[k]) && a[k] && typeof a[k]==='object' && !Array.isArray(a[k])) merge(a[k], b[k]); else a[k]=b[k]; }); }; merge(cur, v); return dbWrite(path, cur); },
      delete(){ return dbWrite(path, null); },
      onSnapshot(fn, err){ const s = { doc:true, path, fn: () => fn(snapDoc(path)) }; subs.push(s); setTimeout(s.fn, 0); return () => { const i = subs.indexOf(s); if(i>=0) subs.splice(i,1); }; },
      collection(sub){ return colRef(path + '/' + sub); },
      acquire(o){ return Promise.resolve({ acquired:true, holder: o && o.holder }); },
    };
  }
  function colRef(path){ const q = makeQuery(path, {}); return Object.assign(q, { path, doc(id){ return docRef(path + '/' + (id || Math.random().toString(36).slice(2,12))); }, add(v){ const r = this.doc(); return r.set(v).then(()=>r); } }); }
  const DB = { doc: docRef, collection: colRef };

  // ====================== SALAS (room) ======================
  // anfitrião: rooms[name] = Map(memberId -> presence); 'hub' é a própria TV
  const rooms = new Map();
  const localRooms = new Map(); // nome -> { handlers:Set, peers:[] }
  const newId = () => 'p' + Math.random().toString(36).slice(2,10);
  const MY_ID = IS_HUB ? 'hub' : newId(); // identidade estável deste separador, seja qual for o caminho da ligação
  function localRoom(name){
    if(!localRooms.has(name)){
      const st = { handlers:new Set(), peers:[], presence:{} };
      st.api = {
        name,
        presence(patch){ Object.keys(patch||{}).forEach(k=>{ if(patch[k]===null) delete st.presence[k]; else st.presence[k]=patch[k]; });
          if(IS_HUB){ hubSetPresence(name, 'hub', clone(st.presence)); } else send({ t:'pres', room:name, p: st.presence });
          return Promise.resolve(); },
        onPeers(fn){ st.handlers.add(fn); setTimeout(()=>{ try{ fn({ peers: st.peers, joined: st.peers, left:[], updated:[] }); }catch(e){} }, 0); return () => st.handlers.delete(fn); },
        peers(){ return st.peers; },
        emit(){ return Promise.resolve(); }, on(){ return () => {}; },
        connected(){ return linked(); }, onConnection(fn){ setTimeout(()=>fn(linked()),0); return ()=>{}; },
        leave(){ if(IS_HUB){ const r = rooms.get(name); if(r){ r.delete('hub'); hubBroadcastRoom(name); } } else send({ t:'leave', room:name }); localRooms.delete(name); return Promise.resolve(); },
      };
      localRooms.set(name, st);
      if(IS_HUB){ if(!rooms.has(name)) rooms.set(name, new Map()); rooms.get(name).set('hub', {}); hubBroadcastRoom(name); noteGameCode(name); }
      else send({ t:'join', room:name });
    }
    return localRooms.get(name).api;
  }
  function deliverPeers(name, list){
    const st = localRooms.get(name); if(!st) return;
    const now = Date.now();
    st.peers = Object.freeze(list.map(x=>Object.freeze({ peer:x.id, presence:Object.freeze(x.p||{}), isMe: x.id===MY_ID, sameTab: x.id===MY_ID, kind:'viewer', guest:false, by:null, updatedAt: now })));
    st.handlers.forEach(fn=>{ try{ fn({ peers: st.peers, joined:[], left:[], updated:[] }); }catch(e){ console.error(e); } });
  }
  const ROOM = {
    join(name){ return Promise.resolve(localRoom(String(name))); },
    presence(patch){ return localRoom('__lobby').presence(patch); },
    onPeers(fn){ return localRoom('__lobby').onPeers(fn); },
    peers(){ return localRoom('__lobby').peers(); },
    emit(){ return Promise.resolve(); }, on(){ return () => {}; },
    connected(){ return linked(); }, onConnection(fn){ setTimeout(()=>fn(linked()),0); return ()=>{}; },
    canSendToClaudeSession(){ return Promise.resolve('off'); }, sendToClaudeSession(){ return Promise.reject({ code:'claude_unavailable' }); },
  };

  // ====================== LIGAÇÃO ======================
  // Dois caminhos em paralelo entre a TV e cada telemóvel:
  //  1) WebRTC direto (PeerJS)   2) retransmissão por servidores MQTT públicos (WebSocket).
  // Basta um deles funcionar. Todas as mensagens são idempotentes, por isso podem chegar repetidas.
  let peer = null, conn = null, rtcOpen = false, queue = [], hubInfo = {}, lastData = 0, lastRtc = 0, everLinked = false;
  const clients = new Map(); // id -> { id, conn, rooms:Set, seen, rtcSeen }
  let gameCode = '', Q = Date.now();
  const linked = () => IS_HUB || ((rtcOpen || MQ.up()) && Date.now() - lastData < 9000);
  function noteGameCode(name){ const m = name.match(/-(\d{4})(?:-|$)/); if(m && !gameCode){ gameCode = m[1]; broadcast({ t:'info', info: info() }); } }
  function info(){ return { game: GAME, code: gameCode, base: BASE }; }

  // ---------- retransmissão MQTT ----------
  const MQ = (() => {
    const TOP = 'noitejogos/v1/' + SALA.toLowerCase() + '/';
    let list = [['broker.emqx.io', 8084, '/mqtt', true], ['broker.hivemq.com', 8884, '/mqtt', true], ['mqtt.eclipseprojects.io', 443, '/mqtt', true]];
    let ov = qs.get('mqtt'); if(ov) try{ sessionStorage.setItem('nj-mq', ov); }catch(e){} else try{ ov = sessionStorage.getItem('nj-mq'); }catch(e){}
    if(ov === 'off') list = []; else if(ov){ const [h,p] = ov.split(':'); list = [[h, +(p||1884), '/', false]]; }
    const cl = list.map(b => ({ b, c:null, up:false })); let seq = Date.now(), sub = '', onMsg = null, onUp = null, started = false;
    const seen = new Set(), seenQ = [];
    function open(x){
      if(!window.Paho || !started) return;
      try{ if(x.c){ x.c.onConnectionLost = () => {}; x.c.onMessageArrived = () => {}; try{ x.c.disconnect(); }catch(e){} } }catch(e){}
      x.up = false; clearTimeout(x.t);
      const P = window.Paho, C = P.Client || (P.MQTT && P.MQTT.Client); if(!C) return;
      const c = x.c = new C(x.b[0], x.b[1], x.b[2], 'nj' + MY_ID + Math.random().toString(36).slice(2,8));
      const again = ms => { if(x.c !== c) return; x.up = false; clearTimeout(x.t); x.t = setTimeout(() => open(x), ms); if(onUp) onUp(); };
      c.onConnectionLost = () => again(2500);
      c.onMessageArrived = m => {
        if(x.c !== c) return; let o; try{ o = JSON.parse(m.payloadString); }catch(e){ return; }
        if(!o || typeof o.i !== 'string') return; const k = o.i + ':' + o.n; if(seen.has(k)) return; seen.add(k); seenQ.push(k); if(seenQ.length > 800) seen.delete(seenQ.shift());
        try{ onMsg(o.i, o.m); }catch(e){ console.error(e); }
      };
      try{ c.connect({ useSSL: x.b[3], timeout: 8, keepAliveInterval: 20, cleanSession: true, mqttVersion: 4,
        onSuccess: () => { if(x.c !== c) return; try{ c.subscribe(TOP + sub, { qos: 0 }); }catch(e){ again(2500); return; } x.up = true; if(onUp) onUp(true); },
        onFailure: () => again(6000) }); }catch(e){ again(6000); }
    }
    return {
      start(s, fn, up){ sub = s; onMsg = fn; onUp = up; if(!cl.length) return; started = true;
        const go = () => cl.forEach(open);
        if(window.Paho) go(); else { const sc = document.createElement('script'); sc.src = BASE + 'paho-mqtt-min.js'; sc.onload = go; document.head.appendChild(sc); } },
      pub(t, m){ const payload = JSON.stringify({ i: MY_ID, n: ++seq, m }); cl.forEach(x => { if(x.up){ try{ x.c.send(TOP + t, payload, 0, false); }catch(e){ x.up = false; clearTimeout(x.t); x.t = setTimeout(() => open(x), 1500); } } }); },
      up(){ return cl.some(x => x.up); },
      kick(){ cl.forEach(x => { if(!x.up) open(x); }); },
      _n(){ return cl.filter(x => x.up).length; },
    };
  })();

  // telemóvel -> TV (pelos dois caminhos, quando existem)
  function send(msg){
    if(IS_HUB) return; let ok = false;
    if(rtcOpen && conn){ try{ conn.send(msg); ok = true; }catch(e){} }
    if(MQ.up()){ MQ.pub('up', msg); ok = true; }
    if(!ok || (msg.t === 'dbw' && !linked())){ queue.push(msg); if(queue.length > 200) queue = queue.slice(-200); }
  }
  // TV -> telemóvel (direto se estiver vivo; senão pela retransmissão)
  function sendTo(rec, msg){
    if(rec.conn && rec.conn.open && Date.now() - (rec.rtcSeen||0) < 8000){ try{ rec.conn.send(msg); return; }catch(e){} }
    MQ.pub('dn/' + rec.id, msg);
  }
  function broadcast(msg){ clients.forEach(rec => sendTo(rec, msg)); }
  const pendingRoom = new Set(); let roomT = null;
  function hubBroadcastRoom(name){ pendingRoom.add(name); if(roomT) return; roomT = setTimeout(flushRooms, 30); }
  function flushRooms(){
    roomT = null;
    pendingRoom.forEach(name=>{
      const r = rooms.get(name); if(!r) return;
      const list = [...r.entries()].map(([id,p])=>({ id, p }));
      deliverPeers(name, list);
      const q = ++Q;
      clients.forEach(rec=>{ if(rec.rooms.has(name)) sendTo(rec, { t:'peers', room:name, list, q }); });
    });
    pendingRoom.clear();
  }
  function hubSetPresence(name, id, p){ if(!rooms.has(name)) rooms.set(name, new Map()); rooms.get(name).set(id, p); hubBroadcastRoom(name); }
  let hubNote = '';
  function updatePhones(){
    const net = (peer && peer.open) || MQ.up();
    setStatus({ phones: clients.size, ok: !!net, text: net ? `Sala ${SALA} · ${clients.size} telemóve${clients.size===1?'l':'is'} ligado${clients.size===1?'':'s'}` : (hubNote || 'Sem ligação à internet. A tentar outra vez…') });
  }

  function loadPeer(cb){
    if(window.Peer) return cb();
    const s = document.createElement('script'); s.src = BASE + 'peerjs.min.js'; s.onload = cb; s.onerror = () => { hubNote = 'Não consegui carregar a rede. Verifica a internet.'; if(IS_HUB) updatePhones(); }; document.head.appendChild(s);
  }
  function hubClient(id){ let rec = clients.get(id); const isNew = !rec; if(isNew){ rec = { id, conn:null, rooms:new Set(), seen:Date.now(), rtcSeen:0 }; clients.set(id, rec); updatePhones(); } return [rec, isNew]; }
  function hello(rec){ sendTo(rec, { t:'hello', info: info(), db: [...store.entries()] }); }
  function startHub(){
    MQ.start('up', (id, m) => { if(id === 'hub' || !m) return; const [rec, isNew] = hubClient(id); if(isNew || m.t === 'hi') hello(rec); hubData(id, m, false); }, () => updatePhones());
    loadPeer(()=>{
      const make = () => {
        peer = new Peer(HUB_ID, peerOpts());
        peer.on('open', () => { hubNote = ''; updatePhones(); });
        peer.on('connection', c => {
          const id = String((c.metadata && c.metadata.id) || c.peer).slice(0, 24);
          c.on('open', () => {
            const [rec] = hubClient(id);
            if(rec.conn && rec.conn !== c){ try{ rec.conn.close(); }catch(e){} }
            rec.conn = c; rec.seen = rec.rtcSeen = Date.now(); updatePhones();
            try{ c.send({ t:'hello', info: info(), db: [...store.entries()] }); }catch(e){}
          });
          c.on('data', m => hubData(id, m, true));
          const bye = () => { const rec = clients.get(id); if(!rec || rec.conn !== c) return; rec.conn = null; rec.seen = Math.min(rec.seen, Date.now() - 12000); };
          c.on('close', bye); c.on('error', bye);
        });
        peer.on('disconnected', () => { hubNote = 'A religar ao servidor…'; updatePhones(); try{ peer.reconnect(); }catch(e){} });
        peer.on('error', e => {
          if(e && e.type==='unavailable-id'){ hubNote = 'A sala ainda está ocupada por outra TV… a tentar outra vez.'; updatePhones(); try{ peer.destroy(); }catch(x){} setTimeout(make, 4000); }
          else if(e && (e.type==='network' || e.type==='server-error' || e.type==='socket-error' || e.type==='socket-closed')){ hubNote = 'Sem ligação ao servidor de salas. A tentar outra vez…'; updatePhones(); const p0 = peer; setTimeout(()=>{ if(peer !== p0) return; if(p0.open && !p0.disconnected) return; try{ p0.destroy(); }catch(x){} make(); }, 5000); }
        });
      };
      make();
    });
  }
  function dropClient(id){ const rec = clients.get(id); if(!rec) return; clients.delete(id); try{ if(rec.conn) rec.conn.close(); }catch(e){} rec.rooms.forEach(name=>{ const r = rooms.get(name); if(r){ r.delete(id); hubBroadcastRoom(name); } }); updatePhones(); }
  if(IS_HUB) setInterval(()=>{ const now = Date.now(); clients.forEach((c,id)=>{ if(now - (c.seen||0) > 20000) dropClient(id); else sendTo(c, { t:'ping' }); }); if(peer && peer.disconnected && !peer.destroyed){ try{ peer.reconnect(); }catch(e){} } updatePhones(); }, 3000);
  function hubData(id, m, viaRtc){
    const rec = clients.get(id); if(!rec || !m || typeof m!=='object') return;
    rec.seen = Date.now(); if(viaRtc) rec.rtcSeen = rec.seen;
    if(m.t==='pong' || m.t==='ping' || m.t==='hi') return;
    if(m.t==='join'){ rec.rooms.add(m.room); if(!rooms.has(m.room)) rooms.set(m.room, new Map()); if(!rooms.get(m.room).has(id)) rooms.get(m.room).set(id, {}); hubBroadcastRoom(m.room); }
    else if(m.t==='pres'){ rec.rooms.add(m.room); const r = rooms.get(m.room); if(r && JSON.stringify(r.get(id)) === JSON.stringify(m.p||{})) return; hubSetPresence(m.room, id, m.p||{}); }
    else if(m.t==='leave'){ rec.rooms.delete(m.room); const r = rooms.get(m.room); if(r){ r.delete(id); hubBroadcastRoom(m.room); } }
    else if(m.t==='dbw'){ if(typeof m.path==='string'){ const v = m.v===undefined?null:m.v; if(JSON.stringify(store.has(m.path)?store.get(m.path):null) === JSON.stringify(v)) return; applyLocal(m.path, v); broadcast({ t:'dbset', path:m.path, v, q: ++Q }); } }
  }
  let dbReady = IS_HUB, dbWaiters = [], reconnT = null, lastHi = 0;
  let notOpenSince = Date.now(), peerGen = 0;
  function paintLink(){ const ok = linked(); if(ok) everLinked = true; setStatus({ ok, text: ok ? `Ligado à sala ${SALA}` : everLinked ? 'Ligação à TV perdida. A religar…' : (rtcOpen || MQ.up() || (peer && peer.open)) ? `À espera da TV da sala ${SALA}…` : 'Sem ligação. A tentar outra vez…' }); }
  function clientIn(m, viaRtc){ lastData = Date.now(); if(viaRtc) lastRtc = lastData; if(m && m.t !== 'ping') clientData(m); if(!status.ok) paintLink(); }
  function startClient(){
    MQ.start('dn/' + MY_ID, (id, m) => { if(id === 'hub') clientIn(m, false); }, up => { if(up){ lastHi = Date.now(); MQ.pub('up', { t:'hi' }); } paintLink(); });
    loadPeer(()=>{ makeClientPeer(); });
    setInterval(clientWatch, 2000); document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) clientWatch(true); }); window.addEventListener('online', ()=>clientWatch(true)); window.addEventListener('pageshow', ()=>clientWatch(true));
  }
  function makeClientPeer(){
    if(!window.Peer) return;
    const gen = ++peerGen;
    try{ if(conn) conn.close(); }catch(e){} try{ if(peer) peer.destroy(); }catch(e){}
    conn = null; rtcOpen = false;
    peer = new Peer(MY_ID + 'r' + gen + Math.random().toString(36).slice(2,5), peerOpts());
    peer.on('open', () => { if(gen===peerGen) connect(); });
    peer.on('error', e => {
      if(gen!==peerGen) return;
      const t = e && e.type;
      if(t==='unavailable-id' || t==='invalid-id' || t==='browser-incompatible'){ setTimeout(()=>{ if(gen===peerGen) makeClientPeer(); }, 1000); }
      else retry();
      paintLink();
    });
    peer.on('disconnected', () => { if(gen!==peerGen) return; try{ peer.reconnect(); }catch(e){} });
    peer.on('close', () => { if(gen===peerGen) setTimeout(()=>{ if(gen===peerGen) makeClientPeer(); }, 1500); });
  }
  // vigia: liga-se de novo sozinho se a ligação morrer (ecrã bloqueado, rede que caiu, etc.)
  function clientWatch(now){
    const t = Date.now();
    if(now) MQ.kick();
    if(rtcOpen && t - lastRtc > 9000){ rtcOpen = false; try{ conn.close(); }catch(e){} connect(); }
    if(rtcOpen) notOpenSince = t;
    else if(window.Peer && (!peer || peer.destroyed || t - notOpenSince > 12000)){ notOpenSince = t; makeClientPeer(); }
    else if(now) connect();
    if(rtcOpen || MQ.up()){
      if(rtcOpen){ try{ conn.send({ t:'pong' }); }catch(e){} }
      if(MQ.up()){ if(t - lastData > 5000 && t - lastHi > 4000){ lastHi = t; MQ.pub('up', { t:'hi' }); } else MQ.pub('up', { t:'pong' }); }
    }
    paintLink();
  }
  function retry(){ clearTimeout(reconnT); reconnT = setTimeout(connect, 2500); }
  window.__NJ._dbg = () => ({ linked: linked(), rtc: rtcOpen, mq: MQ._n(), age: Date.now()-lastData, id: MY_ID, peerOpen: !!(peer&&peer.open), clients: clients.size });
  window.__NJ._kill = (what) => { if(what==='rtc'){ window.Peer = null; try{ if(conn) conn.close(); }catch(e){} try{ peer.destroy(); }catch(e){} rtcOpen = false; return; } try{ peer.destroy(); }catch(e){} };
  function connect(){
    if(!window.Peer) return;
    if(!peer || peer.destroyed){ makeClientPeer(); return; }
    if(peer.disconnected){ try{ peer.reconnect(); }catch(e){} retry(); return; }
    if(!peer.open) { retry(); return; }
    try{ if(conn) conn.close(); }catch(e){}
    const c = peer.connect(HUB_ID, { reliable:true, metadata:{ id: MY_ID } });
    conn = c; rtcOpen = false;
    const timeout = setTimeout(()=>{ if(conn===c && !rtcOpen) retry(); }, 8000);
    c.on('open', () => {
      if(conn!==c) return;
      clearTimeout(timeout); rtcOpen = true; lastData = lastRtc = Date.now(); notOpenSince = Date.now();
      resync(); paintLink();
    });
    c.on('data', m => { if(conn!==c) return; clientIn(m, true); });
    c.on('close', () => { if(conn!==c) return; rtcOpen = false; paintLink(); retry(); });
    c.on('error', () => { if(conn!==c) return; rtcOpen = false; retry(); });
  }
  // volta a dizer à TV em que salas estou e o que tenho pendente
  function resync(){
    localRooms.forEach((st,name)=>{ send({ t:'join', room:name }); if(Object.keys(st.presence).length) send({ t:'pres', room:name, p:st.presence }); });
    const q = queue; queue = []; q.forEach(m=>{ if(m.t==='dbw') send(m); });
  }
  const lastQ = {};
  function clientData(m){
    if(!m || typeof m!=='object') return;
    if(m.t==='hello'){ Object.keys(lastQ).forEach(k=>delete lastQ[k]); hubInfo = m.info||{}; store.clear(); (m.db||[]).forEach(([k,v])=>store.set(k,v)); [...new Set(subs.map(s=>s.path))].forEach(p=>{ subs.filter(s=>s.path===p).forEach(s=>{ try{ s.fn(); }catch(e){} }); }); dbReady = true; dbWaiters.splice(0).forEach(f=>f()); lastData = Date.now(); resync(); onInfo(); }
    else if(m.t==='info'){ hubInfo = m.info||{}; onInfo(); }
    else if(m.t==='peers'){ if(m.q){ const k = 'r:' + m.room; if(m.q <= (lastQ[k]||0)) return; lastQ[k] = m.q; } deliverPeers(m.room, m.list||[]); }
    else if(m.t==='dbset'){ if(m.q){ const k = 'd:' + m.path; if(m.q <= (lastQ[k]||0)) return; lastQ[k] = m.q; } applyLocal(m.path, m.v); }
  }
  // o telemóvel segue o jogo escolhido na TV
  function onInfo(){
    if(GAME==='portal'){ if(window.__NJ_onInfo) window.__NJ_onInfo(hubInfo); return; }
    if(hubInfo.game && hubInfo.game!==GAME){ location.href = BASE + 'jogos/' + hubInfo.game + '/?sala=' + SALA; return; }
    window.__SALA_CODE = hubInfo.code || '';
    autofill();
  }

  // ====================== preenchimento automático ======================
  function autofill(){
    if(IS_HUB) return;
    const code = window.__SALA_CODE;
    const tryIt = () => {
      ['#goPad','#hPlayer'].forEach(sel=>{ const b = document.querySelector(sel); if(b && !b.dataset.njAuto && b.offsetParent!==null && !b.disabled){ b.dataset.njAuto = 1; b.click(); } });
      const inp = document.querySelector('#jcode');
      if(inp && code && !inp.dataset.njAuto){ inp.dataset.njAuto = 1; inp.value = code; const go = document.querySelector('#jconn'); if(go) setTimeout(()=>go.click(), 150); }
    };
    tryIt();
    if(!autofill.mo){ autofill.mo = new MutationObserver(tryIt); autofill.mo.observe(document.documentElement, { childList:true, subtree:true }); }
  }

  // ====================== window.claude ======================
  const USER = { id: () => Promise.resolve(UID), isOwner: () => IS_HUB, canEdit: () => IS_HUB, can: () => Promise.resolve(true), profiles: () => Promise.resolve([]), name: () => Promise.resolve(null) };
  window.claude = { use: async (name) => {
    if(name==='room') return ROOM;
    if(name==='db'){ if(!dbReady) await new Promise(r=>{ dbWaiters.push(r); setTimeout(r, 8000); }); return DB; }
    if(name==='user') return USER;
    return null; // 'sample' e outros: indisponíveis fora do claude.ai
  } };
  if(SALA && !(GAME==='portal' && IS_HUB)){ if(IS_HUB) startHub(); else startClient(); }

  // ====================== dados 3D partilhados ======================
  function loadDados(cb){ if(window.Dados3D) return cb(true); const sc = document.createElement('script'); sc.src = BASE + 'dados3d.bundle.js'; sc.onload = () => cb(!!window.Dados3D); sc.onerror = () => cb(false); document.head.appendChild(sc); }
  window.__NJ.dados = (vals, opts) => new Promise(res => loadDados(ok => { if(!ok) return res(false); window.Dados3D.show(vals, opts).then(res, () => res(false)); }));
  if(IS_HUB && GAME!=='portal') setTimeout(() => loadDados(() => {}), 2500);

  // ====================== barra da sala ======================
  if(GAME!=='portal' && SALA){
    const css = `#njbar{position:fixed;left:8px;bottom:8px;z-index:9999;font:600 12px/1.2 system-ui,sans-serif;color:#f3ead6;background:rgba(8,14,11,.82);border:1px solid rgba(216,178,90,.45);border-radius:999px;padding:6px 10px;display:flex;gap:8px;align-items:center;backdrop-filter:blur(6px);max-width:calc(100vw - 16px)}
      #njbar .d{width:8px;height:8px;border-radius:50%;background:#d9534f;flex:none} #njbar.ok .d{background:#4cc38a}
      #njbar a{color:#f3d68c;text-decoration:none;white-space:nowrap} #njbar span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #njbar.min span,#njbar.min a{display:none}`;
    const st = document.createElement('style'); st.textContent = css;
    const bar = document.createElement('div'); bar.id = 'njbar';
    bar.innerHTML = `<i class="d"></i><span>A ligar…</span>${IS_HUB ? `<a href="#" data-njqr>📱 Entrar</a><a href="${BASE}?sala=${SALA}&tv=1&escolher=1">⇄ Trocar de jogo</a>` : `<b style="color:#f3d68c;letter-spacing:.1em">${SALA}</b><a href="#" data-njre>↻</a>`}`;
    bar.addEventListener('click', e => {
      if(e.target.closest('[data-njre]')){ e.preventDefault(); location.reload(); }
      if(e.target.closest('[data-njqr]')){ e.preventDefault(); showQR(); }
    });
    const mount = () => { document.head.appendChild(st); document.body.appendChild(bar); bar.addEventListener('dblclick', ()=>bar.classList.toggle('min')); };
    if(document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
    const paint = () => { let el = document.getElementById('njbar'); if(!el && document.body){ document.body.appendChild(bar); el = bar; } if(!el) return; const sp = el.querySelector('span'); if(sp && sp.textContent!==status.text) sp.textContent = status.text; el.classList.toggle('ok', !!status.ok); };
    window.__NJ.onStatus(paint); setInterval(paint, 1500);
    function showQR(){
      let ov = document.getElementById('njqr'); if(ov){ ov.remove(); return; }
      ov = document.createElement('div'); ov.id='njqr';
      ov.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;color:#f3ead6;font:600 18px system-ui,sans-serif;text-align:center';
      ov.innerHTML = `<div style="background:#fff;padding:12px;border-radius:16px" id="njqrc"></div><div style="font:400 64px Georgia,serif;letter-spacing:.2em;color:#f3d68c">${SALA}</div><div>Lê o QR ou abre <b>${BASE.replace(/^https?:\/\//,'')}</b> e escreve o código da sala.<br>Quem saiu a meio volta a entrar e escolhe o seu nome.</div><div style="opacity:.7;font-size:14px">(toca para fechar)</div>`;
      ov.onclick = () => ov.remove(); document.body.appendChild(ov);
      const draw = () => { if(window.QRCode){ try{ new QRCode(document.getElementById('njqrc'), { text: window.__SALA_URL, width: 240, height: 240 }); }catch(e){} } };
      if(window.QRCode) draw(); else { const sc = document.createElement('script'); sc.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; sc.onload = draw; document.head.appendChild(sc); }
    }
  }
})();
