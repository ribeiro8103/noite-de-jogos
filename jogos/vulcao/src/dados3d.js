// Noite de Jogos — dados 3D partilhados por todos os jogos (camada transparente por cima do ecrã da TV)
import { WebGLRenderer, Scene, PerspectiveCamera, Mesh, MeshStandardMaterial, CanvasTexture, SRGBColorSpace, AmbientLight, DirectionalLight, PointLight, Quaternion, Euler, Vector3, ACESFilmicToneMapping, PlaneGeometry, MeshBasicMaterial } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const COL = { n: ['#fbfbf6', '#20222a', .35, 0], g: ['#f3c545', '#4a2c00', .22, .85], b: ['#c9824a', '#3a1c08', .3, .8], r: ['#d3263a', '#ffffff', .3, .1], k: ['#22252e', '#ffffff', .3, .2] };
const FACE = [1, 6, 2, 5, 3, 4], FN = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(a => new Vector3(...a));
let wrap, labelEl, renderer, scene, camera, running = false, raf = 0, items = [], shadows = [], gen = 0;
const mats = {}, easeOut = t => 1 - Math.pow(1 - t, 3);
function tex(v, bg, fg) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 128, 128); g.fillStyle = fg;
  ({ 1: [[64, 64]], 2: [[36, 36], [92, 92]], 3: [[34, 34], [64, 64], [94, 94]], 4: [[36, 36], [92, 36], [36, 92], [92, 92]], 5: [[36, 36], [92, 36], [64, 64], [36, 92], [92, 92]], 6: [[36, 32], [92, 32], [36, 64], [92, 64], [36, 96], [92, 96]] })[v].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 12, 0, 6.3); g.fill(); });
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; return t;
}
let blobT = null; function blob() { if (!blobT) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); blobT = new CanvasTexture(c); } return blobT; }
function mat(t) { if (!mats[t]) { const c = COL[t] || COL.n; mats[t] = FACE.map(v => new MeshStandardMaterial({ map: tex(v, c[0], c[1]), roughness: c[2], metalness: c[3] })); } return mats[t]; }
function setup() {
  if (renderer) return true;
  try {
    wrap = document.createElement('div'); wrap.id = 'dados3d';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9000;pointer-events:none;opacity:0;transition:opacity .25s;background:radial-gradient(ellipse at 50% 46%,rgba(0,0,0,.5) 0%,rgba(0,0,0,.28) 34%,rgba(0,0,0,0) 62%)';
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); renderer.setClearColor(0, 0); renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    labelEl = document.createElement('div');
    labelEl.style.cssText = 'position:absolute;left:0;right:0;top:66%;text-align:center;font:900 clamp(34px,6vw,84px) "Lilita One","Arial Rounded MT Bold",system-ui,sans-serif;color:#fff;text-shadow:0 5px 0 rgba(0,0,0,.45),0 0 30px rgba(0,0,0,.6);opacity:0;transform:scale(.6);transition:all .25s cubic-bezier(.2,1.5,.4,1)';
    wrap.append(renderer.domElement, labelEl); document.body.appendChild(wrap);
    scene = new Scene(); camera = new PerspectiveCamera(36, 1, .1, 60); camera.position.set(0, 0, 11);
    const d = new DirectionalLight('#ffffff', 2.6); d.position.set(3, 6, 8); const p = new PointLight('#ffe2b0', 40, 30); p.position.set(-4, 3, 6);
    scene.add(new AmbientLight('#ffffff', 1.25), d, p);
    addEventListener('resize', size); size(); return true;
  } catch (e) { console.warn('Dados 3D indisponíveis', e); renderer = null; return false; }
}
function size() { if (!renderer) return; const w = innerWidth, h = innerHeight; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
function loop() { if (!running) return; raf = requestAnimationFrame(loop); const t = performance.now(); items.forEach(it => it.up && it.up(t)); renderer.render(scene, camera); }
function wipe() { items.forEach(it => scene.remove(it.m)); shadows.forEach(s => scene.remove(s)); items = []; shadows = []; }
const geo = new RoundedBoxGeometry(1, 1, 1, 4, .14);
const wait = ms => new Promise(r => setTimeout(r, ms));

// values: [3, 5] ou [{v:3,t:'n'},{v:5,t:'g'}] · opts: { label, speed, hold, size }
async function roll(values, opts) {
  opts = opts || {}; if (!setup()) return false;
  const my = ++gen, sp = opts.speed || 1, list = values.map(x => typeof x === 'object' ? x : { v: x, t: 'n' }).filter(x => x.v >= 1 && x.v <= 6);
  if (!list.length) return false;
  wipe(); labelEl.style.opacity = 0; labelEl.style.transform = 'scale(.6)';
  const S = (opts.size || 1.55) * (list.length > 3 ? .8 : 1), gap = S * 1.5, dur = 1250 * sp, t0 = performance.now();
  list.forEach((o, i) => {
    const m = new Mesh(geo, mat(o.t)); m.scale.setScalar(S); scene.add(m);
    const x = (i - (list.length - 1) / 2) * gap, q0 = new Quaternion().setFromEuler(new Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    const ax = new Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(), spin = 13 + Math.random() * 9, side = (Math.random() - .5) * 7;
    const q1 = new Quaternion().setFromUnitVectors(FN[FACE.indexOf(o.v)], new Vector3(0, 0, 1)).premultiply(new Quaternion().setFromEuler(new Euler(-.2, (i - (list.length - 1) / 2) * -.12, (Math.random() - .5) * .25)));
    const q = new Quaternion(), sh = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: blob(), transparent: true, opacity: 0, depthWrite: false })); sh.position.set(x, -S * .78, -.4); sh.scale.set(S * 1.9, S * .5, 1); scene.add(sh); shadows.push(sh);
    const it = { m, up(t) {
      const k = Math.min(1, (t - t0) / dur), e = easeOut(k);
      m.position.set(x + side * (1 - e), 5.2 * (1 - e) + Math.abs(Math.sin(k * 9.6)) * (1 - k) * 1.5, -5 * (1 - e));
      q.setFromAxisAngle(ax, (1 - k) * spin); m.quaternion.copy(q0).premultiply(q); if (k > .7) m.quaternion.slerp(q1, (k - .7) / .3);
      sh.material.opacity = .55 * e * (1 - Math.min(1, m.position.y / 3)); sh.position.x = m.position.x;
      if (k >= 1) { const b = Math.min(1, (t - t0 - dur) / 240); m.scale.setScalar(S * (1 + Math.sin(b * Math.PI) * .16)); }
    } };
    items.push(it);
  });
  wrap.style.opacity = 1; if (!running) { running = true; loop(); }
  await wait(dur + 260); if (my !== gen) return true;
  if (opts.label !== undefined && opts.label !== null && opts.label !== '') { labelEl.innerHTML = opts.label; labelEl.style.opacity = 1; labelEl.style.transform = 'scale(1)'; }
  await wait((opts.hold === undefined ? 1100 : opts.hold) * sp);
  return true;
}
async function clear() {
  if (!renderer) return; const my = ++gen;
  wrap.style.opacity = 0; labelEl.style.opacity = 0; await wait(280); if (my !== gen) return;
  wipe(); running = false; cancelAnimationFrame(raf); renderer.render(scene, camera);
}
window.Dados3D = { roll, clear, async show(values, opts) { const ok = await roll(values, opts); await clear(); return ok; } };
