/* O Cofre de São Segredo — cena 3D da TV (three.js). Expõe window.VScene. */
(function () {
  const T = window.THREE, L = window.LAYOUT;
  const S = { ready: false, pace: 1, pawns: [], fxQ: Promise.resolve(), t0: performance.now() };
  let renderer, scene, camera, sun, sea, clock, root, glbScene;
  const objs = {}; // nome -> Object3D
  const cam = { pos: new T.Vector3(0, 38, 52), look: new T.Vector3(0, 0, 0), tw: null, idle: true, orbit: 0 };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const nodePos = (id) => { const n = L.nodes[id]; return new T.Vector3(n.x, 0.14, n.z); };
  const B = Object.fromEntries(L.buildings.map((b) => [b.id, b]));
  const bldPos = (id) => { const b = B[id]; return new T.Vector3(b.x, 0, b.z); };
  const doorPos = (id) => nodePos(B[id].door);

  function tween(dur, fn) { return new Promise((res) => { const t0 = performance.now(); const step = () => { const t = Math.min(1, (performance.now() - t0) / dur); fn(ease(t), t); if (t < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); }

  async function init(canvas, assetBase) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = T.SRGBColorSpace;
    scene = new T.Scene();
    scene.background = skyTexture(); scene.fog = new T.Fog(0xcfe3ee, 70, 150);
    camera = new T.PerspectiveCamera(40, 16 / 9, 0.5, 400);
    scene.add(new T.HemisphereLight(0xdfefff, 0x6b7a4a, 1.05));
    sun = new T.DirectionalLight(0xfff1d6, 2.4); sun.position.set(-30, 50, 25); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 40, bottom: -40, near: 1, far: 140 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    scene.add(sun); scene.add(sun.target);
    root = new T.Group(); scene.add(root);
    clock = new T.Clock();
    resize(); window.addEventListener('resize', resize);
    if (!window.ASSETS) await new Promise((res) => { const sc = document.createElement('script'); sc.src = assetBase + 'assets.js'; sc.onload = res; sc.onerror = res; document.head.appendChild(sc); });
    const loader = new T.GLTFLoader();
    const load = (name) => { const b64 = window.ASSETS && window.ASSETS[name]; if (!b64) return loader.loadAsync(assetBase + name + '.glb'); const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return loader.parseAsync(u.buffer, ''); };
    const [village, pawn] = await Promise.all([load('village'), load('pawn')]);
    glbScene = village.scene; root.add(glbScene);
    glbScene.traverse((o) => {
      if (o.name) objs[o.name] = o;
      if (o.isMesh) {
        o.castShadow = !/^(GROUND|ROADS|N_|GRASS|QUAY|SEA)/.test(o.name); o.receiveShadow = true;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => { m.side = T.DoubleSide; if (m.name === 'luz') { m.emissiveIntensity = 1.2; } });
      }
    });
    if (objs.SEA) objs.SEA.visible = false;
    makeSea();
    S.pawnProto = pawn.scene;
    S.markers = new T.Group(); scene.add(S.markers);
    S.fx = new T.Group(); scene.add(S.fx);
    S.ready = true; renderer.setAnimationLoop(frame);
  }

  function skyTexture() {
    const c = document.createElement('canvas'); c.width = 2; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#6fa9d8'); gr.addColorStop(0.55, '#bcd9ea'); gr.addColorStop(1, '#f2e6cf');
    g.fillStyle = gr; g.fillRect(0, 0, 2, 256); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }

  function makeSea() {
    const geo = new T.PlaneGeometry(240, 90, 120, 45); geo.rotateX(-Math.PI / 2); geo.translate(0, -0.32, 21.4 + 45);
    const m = new T.MeshStandardMaterial({ color: 0x1f6f93, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.93 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uT = { value: 0 }; m.userData.sh = sh;
      sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float w = sin(position.x * 0.35 + uT * 1.1) * 0.12 + cos(position.z * 0.42 + uT * 0.8) * 0.1;
        transformed.y += w * smoothstep(21.0, 26.0, position.z);`);
    };
    sea = new T.Mesh(geo, m); sea.receiveShadow = true; scene.add(sea);
    const beach = new T.Mesh(new T.PlaneGeometry(240, 1.2), new T.MeshStandardMaterial({ color: 0xe9dcc0, transparent: true, opacity: 0.6 }));
    beach.rotation.x = -Math.PI / 2; beach.position.set(0, -0.2, 21.7); scene.add(beach);
  }

  function resize() {
    if (!renderer) return; const w = renderer.domElement.clientWidth || window.innerWidth, h = renderer.domElement.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  /* --------------------------------------------------------------- câmara */
  function camTo(pos, look, dur) {
    const p0 = cam.pos.clone(), l0 = cam.look.clone(); cam.idle = false;
    return tween(dur, (k) => { cam.pos.lerpVectors(p0, pos, k); cam.look.lerpVectors(l0, look, k); });
  }
  function focus(target, opt = {}) {
    const d = opt.dist || 16, h = opt.h || 11, a = opt.angle == null ? 0.35 : opt.angle;
    const pos = new T.Vector3(target.x + Math.sin(a) * d, h, target.z + Math.cos(a) * d);
    return camTo(pos, new T.Vector3(target.x, opt.lookY || 0.8, target.z), opt.dur || 1600 * S.pace);
  }
  function overview(dur) { cam.orbitBase = performance.now(); return camTo(new T.Vector3(0, 40, 50), new T.Vector3(0, 0, 1), dur || 1800 * S.pace).then(() => { cam.idle = true; cam.orbit = 0; }); }

  /* --------------------------------------------------------------- peões */
  function labelSprite(text, color) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = color; g.beginPath(); g.arc(128, 64, 54, 0, Math.PI * 2); g.fill();
    g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
    g.font = '64px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 70);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    const s = new T.Sprite(new T.SpriteMaterial({ map: t, depthTest: false })); s.scale.set(1.6, 0.8, 1); s.renderOrder = 10; return s;
  }
  function setPlayers(players) {
    S.pawns.forEach((p) => scene.remove(p.g)); S.pawns = [];
    players.forEach((pl, i) => {
      const g = new T.Group(); const body = S.pawnProto.clone(true);
      body.traverse((o) => { if (o.isMesh) { o.castShadow = true; if (o.material && o.material.name === 'PAWN_BODY') { o.material = o.material.clone(); o.material.color.set(pl.color); } } });
      body.scale.setScalar(1.25); g.add(body);
      const ring = new T.Mesh(new T.RingGeometry(0.45, 0.6, 24), new T.MeshBasicMaterial({ color: pl.color, transparent: true, opacity: 0.85 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
      const lab = labelSprite((pl.character && pl.character.emoji) || '●', pl.color); lab.position.y = 2.15; g.add(lab);
      scene.add(g); S.pawns.push({ g, body, ring, lab, at: null, off: new T.Vector3() });
    });
  }
  function slotOffset(i, n) { if (n <= 1) return new T.Vector3(); const a = (i / n) * Math.PI * 2; return new T.Vector3(Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55); }
  function posOf(loc) { if (!loc) return new T.Vector3(); if (loc.b) { const b = B[loc.b]; if (b.id === 'praca') return new T.Vector3(0, 0.1, 3.2); const d = nodePos(b.door); const v = new T.Vector3(b.x, 0, b.z).lerp(d, 0.62); v.y = 0.08; return v; } return nodePos(loc.n); }
  /** Coloca todos os peões nas posições do estado (sem animação). */
  function placeAll(players) {
    const groups = {};
    players.forEach((p, i) => { const k = p.pos.b ? 'b' + p.pos.b : 'n' + p.pos.n; (groups[k] = groups[k] || []).push(i); });
    Object.values(groups).forEach((ids) => ids.forEach((i, k) => { const pw = S.pawns[i]; if (!pw) return; pw.off = slotOffset(k, ids.length); pw.g.position.copy(posOf(players[i].pos)).add(pw.off); pw.g.visible = !players[i].out; }));
  }
  /** Anima o peão ao longo do caminho (lista de ids de nós) e, se for o caso, até ao edifício. */
  async function walk(i, path, toB) {
    const pw = S.pawns[i]; if (!pw) return; const step = 620 * S.pace;
    const pts = path.map((n) => nodePos(n)); if (toB) pts.push(posOf({ b: toB }));
    focus(pts[Math.min(pts.length - 1, 1)] || pw.g.position, { dist: 20, h: 15, dur: 900 * S.pace });
    for (const p of pts) {
      const a = pw.g.position.clone(), b = p.clone();
      const ang = Math.atan2(b.x - a.x, b.z - a.z); pw.body.rotation.y = ang + Math.PI;
      cam.follow = b; if (window.SND) SND.play('step', i);
      await tween(step, (k, t) => { pw.g.position.lerpVectors(a, b, k); pw.g.position.y = b.y + Math.sin(t * Math.PI) * 0.55; });
    }
    cam.follow = null;
  }

  /* --------------------------------------------------------------- marcadores (alcance do dado) */
  function setMarkers(list, color) {
    S.markers.clear(); if (!list) return;
    list.forEach((k) => {
      const isB = k.startsWith('b:'); const p = isB ? bldPos(k.slice(2)) : nodePos(+k.slice(1));
      const r = isB ? (k === 'b:praca' ? 6.6 : 2.4) : 0.95;
      const m = new T.Mesh(new T.RingGeometry(r * 0.82, r, 40), new T.MeshBasicMaterial({ color: color || 0xffd34d, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.2, p.z); m.userData.pulse = Math.random() * 6; S.markers.add(m);
    });
  }

  /* --------------------------------------------------------------- efeitos para cut-scenes */
  function emojiSprite(e, size = 2.2) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.font = '190px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 128, 140);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; const s = new T.Sprite(new T.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    s.scale.set(size, size, 1); s.renderOrder = 20; return s;
  }
  function coins(center, n = 26) {
    const geo = new T.CylinderGeometry(0.16, 0.16, 0.05, 14), m = new T.MeshStandardMaterial({ color: 0xe8b33a, metalness: 1, roughness: 0.3 });
    for (let i = 0; i < n; i++) { const c = new T.Mesh(geo, m); c.position.copy(center).add(new T.Vector3(0, 1.5, 0)); c.userData.v = new T.Vector3((Math.random() - 0.5) * 4, 4 + Math.random() * 4, (Math.random() - 0.5) * 4); c.userData.spin = Math.random() * 10; c.userData.life = 2.6; S.fx.add(c); }
  }
  function sirens(center) {
    [0xff2a2a, 0x2a5bff].forEach((col, k) => { const l = new T.PointLight(col, 40, 14); l.position.copy(center).add(new T.Vector3(k ? 1 : -1, 2.4, 0)); l.userData.flash = k; l.userData.life = 4; S.fx.add(l); });
  }
  function floatSprite(e, at, life = 4, size = 2.2) { const s = emojiSprite(e, size); s.position.copy(at); s.userData.bob = at.y; s.userData.life = life; S.fx.add(s); return s; }
  function clearFx() { S.fx.clear(); }

  /** Põe os peões dos atores à porta do edifício, frente a frente, durante a cena. */
  function stageActors(bId, actors) {
    const d = bId ? (bId === 'praca' ? new T.Vector3(0, 0.1, 3.4) : posOf({ b: bId })) : new T.Vector3();
    const n = actors.length; const saved = [];
    actors.forEach((i, k) => {
      const pw = S.pawns[i]; if (!pw) return; saved.push([pw, pw.g.position.clone(), pw.body.rotation.y]); pw.lab.visible = false;
      const off = n === 1 ? new T.Vector3() : new T.Vector3((k - (n - 1) / 2) * 1.6, 0, 0);
      pw.g.position.copy(d).add(off); pw.g.visible = true;
      pw.body.rotation.y = n === 1 ? Math.PI * 0.15 : k === 0 ? -Math.PI / 2 + Math.PI : Math.PI / 2 + Math.PI;
    });
    return () => saved.forEach(([pw, p, r]) => { pw.g.position.copy(p); pw.body.rotation.y = r; pw.lab.visible = true; });
  }

  /** Cut-scene 3D. kind decide os adereços; devolve quando a câmara chega e os adereços estão em cena. */
  async function stage(ev) {
    clearFx();
    const bId = ev.bld || null; const center = bId ? (bId === 'praca' ? new T.Vector3(0, 0, 0) : bldPos(bId)) : new T.Vector3(0, 0, 0);
    const actors = [ev.actor, ev.target].filter((x) => x != null && x >= 0);
    const restore = actors.length ? stageActors(bId, actors) : () => {};
    const look = actors.length ? S.pawns[actors[0]].g.position.clone() : center.clone();
    if (actors.length > 1) look.lerp(S.pawns[actors[1]].g.position, 0.5);
    let ang = 0.25 + (Math.random() - 0.5) * 0.5;
    if (bId && bId !== 'praca') { const bb = B[bId], dn = L.nodes[bb.door]; ang = Math.atan2(dn.x - bb.x, dn.z - bb.z) + (Math.random() - 0.5) * 0.6; }
    const one = actors.length < 2; const close = { dist: one ? 10 : 9, h: one ? 5.2 : 3.3, lookY: one ? 0.4 : -0.15, angle: ang, dur: 1500 * S.pace };
    const above = look.clone().add(new T.Vector3(0, 1.9, 0));
    switch (ev.kind) {
      case 'interrogate': case 'suspeita': case 'ask': case 'show': floatSprite(ev.kind === 'show' ? '🃏' : '❓', above, 6, 1.2); break;
      case 'investigate': case 'arquivo': case 'informador': floatSprite('🔍', above, 6, 1.8); break;
      case 'buy': case 'upgrade': case 'rent': case 'sell': coins(look); floatSprite(ev.kind === 'upgrade' ? '⭐' : '💰', above, 6, 1.6); break;
      case 'mandado': sirens(look); floatSprite('🚨', above, 6, 1.8); break;
      case 'close': case 'silenciar': floatSprite(ev.kind === 'close' ? '🔒' : '🤫', above, 6, 1.8); break;
      case 'jornal': floatSprite('📰', new T.Vector3(0, 4.5, 0), 6, 3); break;
      case 'power': floatSprite('✨', above, 6, 1.8); break;
      case 'station': floatSprite('🚂', above, 6, 1.8); break;
      case 'mystery': floatSprite(ev.good ? '🍀' : '💀', above.clone().add(new T.Vector3(1.4, 0, 0)), 6, 0.9); break;
      case 'challenge': case 'chaltie': floatSprite('⚔️', above, 6, 1.6); break;
      case 'chalres': floatSprite(ev.good ? '🏅' : '😬', above, 6, 1.6); if (ev.good) coins(look); break;
      case 'accuse': break;
    }
    if (ev.kind === 'accuse') await focus(new T.Vector3(0, 0, 0), { dist: 7, h: 3.2, lookY: 1.6, angle: 0.0, dur: 1800 * S.pace });
    else if (ev.kind === 'jornal' || ev.kind === 'round') await focus(new T.Vector3(0, 0, 0), { dist: 26, h: 18, dur: 1600 * S.pace });
    else await focus(look, close);
    return restore;
  }

  /** Animação do cofre: roda os trincos e abre ou treme. */
  async function vault(open) {
    const dial = objs.COFRE_DIAL, door = objs.COFRE_DOOR;
    for (let k = 0; k < 4; k++) { if (window.SND) SND.play('vaultClick'); const r0 = dial ? dial.rotation.y : 0; await tween(900 * S.pace, (e) => { if (dial) dial.rotation.y = r0 + e * Math.PI * (k % 2 ? -1.3 : 1.7); }); await sleep(250 * S.pace); }
    if (open) { if (door) await tween(2200 * S.pace, (e) => { door.rotation.z = -e * 1.9; }); coins(new T.Vector3(0, 1.2, 0), 60); }
    else if (door) { const x0 = door.position.x; await tween(900, (e, t) => { door.position.x = x0 + Math.sin(t * 40) * 0.04 * (1 - t); }); }
  }

  /* --------------------------------------------------------------- ciclo */
  function frame() {
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
    if (sea && sea.material.userData.sh) sea.material.userData.sh.uniforms.uT.value = t;
    if (cam.idle) { cam.orbit += dt * 0.025; const r = 52, a = Math.sin(cam.orbit) * 0.5; cam.pos.set(Math.sin(a) * r, 40, Math.cos(a) * r); cam.look.set(0, 0, 1); }
    if (cam.follow) cam.look.lerp(cam.follow, 0.06);
    camera.position.copy(cam.pos); camera.lookAt(cam.look);
    if (objs.MOINHO_SAILS) objs.MOINHO_SAILS.rotation.z += dt * 0.6;
    if (objs.TRAIN) { objs.TRAIN.position.x = ((t * 3.2) % 120) - 60; }
    for (let i = 0; i < 7; i++) { const b = objs['BOAT_' + i]; if (b) { b.position.y = -0.45 * 0 + Math.sin(t * 1.3 + i) * 0.06 - 0.28; b.rotation.z = Math.sin(t + i) * 0.04; } }
    S.markers.children.forEach((m) => { m.material.opacity = 0.55 + 0.4 * Math.sin(t * 3 + m.userData.pulse); });
    S.pawns.forEach((p) => { p.ring.material.opacity = 0.6 + 0.3 * Math.sin(t * 2); });
    for (let i = S.fx.children.length - 1; i >= 0; i--) {
      const o = S.fx.children[i]; o.userData.life -= dt; if (o.userData.life <= 0) { S.fx.remove(o); continue; }
      if (o.userData.v) { o.userData.v.y -= 9.8 * dt; o.position.addScaledVector(o.userData.v, dt); if (o.position.y < 0.05) { o.position.y = 0.05; o.userData.v.multiplyScalar(0.4); o.userData.v.y *= -0.5; } o.rotation.x += o.userData.spin * dt; }
      if (o.userData.bob != null) { o.position.y = o.userData.bob + Math.sin(t * 2.5) * 0.18; o.material.rotation = Math.sin(t * 1.5) * 0.1; }
      if (o.isPointLight) o.intensity = (Math.sin(t * 14 + o.userData.flash * Math.PI) > 0 ? 60 : 0);
    }
    renderer.render(scene, camera);
  }

  window.VScene = { init, setPlayers, placeAll, walk, setMarkers, focus, overview, stage, vault, clearFx, setPace: (p) => (S.pace = p), get ready() { return S.ready; }, objs, camera: () => camera };
})();
