// ILHA DO VULCÃO — cena 3D da TV (three.js): ilha, mar, vulcão, interior, peões, dados e efeitos
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const D = window.DATA;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const lin = t => t;
// ruído determinístico
let seed = 7; const srand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v); };
const fbm = (x, y, o = 4) => { let a = .5, f = 1, s = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); a *= .5; f *= 2.03; } return s; };

const T = { ready: false };
let renderer, composer, renderPass, bloom, camera, scene, inScene, active, water, sky, sun, hemi, craterLight, lavaMat, lavaIn, envTex;
let players = () => [], speed = 1, quality = 'alta', container, simpleWater;
const pawns = [], tiles = [], vtiles = [], gates = [], updaters = new Set(), tweens = new Set();
const SUN = V3(0, 0, 0);
const Q = { alta: { pr: 2, sh: 4096, bloom: true, wt: 512 }, media: { pr: 1.25, sh: 2048, bloom: true, wt: 256 }, leve: { pr: 1, sh: 0, bloom: false, wt: 0 } };

// ---------- tempo e animação ----------
function tween(ms, fn, ease) { return new Promise(res => { const tw = { t0: performance.now(), ms: Math.max(1, ms * speed), fn, ease: ease || easeIO, res }; tweens.add(tw); try { fn(0); } catch (e) { console.error(e); } }); }
const sleep = ms => tween(ms, () => { });
let lastTick = 0;
function tick() {
  const t = performance.now(); lastTick = t;
  tweens.forEach(tw => { const k = (t - tw.t0) / tw.ms; try { if (k >= 1) { tw.fn(1); tweens.delete(tw); tw.res(); } else tw.fn(tw.ease(k)); } catch (e) { console.error(e); tweens.delete(tw); tw.res(); } });
}

// ---------- texturas geradas ----------
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function softDot() { return canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }); }
function puffTex() { return canvasTex(128, 128, (g) => { for (let i = 0; i < 14; i++) { const x = 34 + srand() * 60, y = 40 + srand() * 48, r = 16 + srand() * 22; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } }); }
function grainTex() { const t = canvasTex(256, 256, (g, w, h) => { const im = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0; const n = 205 + 50 * (fbm(x / 9, y / 9, 3) - .5) + 26 * (srand() - .5); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = n; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(34, 34); return t; }
function waterNormals() {
  const N = 256, W = []; for (let i = 0; i < 26; i++) W.push([Math.round((srand() - .5) * 18) || 1, Math.round((srand() - .5) * 18) || 2, srand() * 6.28, .3 + srand()]);
  const hgt = (x, y) => { let s = 0; for (const w of W) s += Math.sin((x * w[0] + y * w[1]) * 6.2832 / N + w[2]) * w[3] / (Math.abs(w[0]) + Math.abs(w[1])); return s; };
  const t = canvasTex(N, N, (g) => { const im = g.createImageData(N, N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = (hgt(x + 1, y) - hgt(x - 1, y)) * 2.6, dy = (hgt(x, y + 1) - hgt(x, y - 1)) * 2.6; const l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4; im.data[i] = (-dx / l * .5 + .5) * 255; im.data[i + 1] = (-dy / l * .5 + .5) * 255; im.data[i + 2] = (1 / l * .5 + .5) * 255; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); });
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function iconTex(emoji, col, dark) {
  return canvasTex(160, 160, (g) => {
    g.fillStyle = col; g.beginPath(); g.arc(80, 80, 80, 0, 6.3); g.fill();
    g.strokeStyle = dark ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.7)'; g.lineWidth = 9; g.beginPath(); g.arc(80, 80, 66, 0, 6.3); g.stroke();
    if (emoji) { g.font = '82px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, 80, 86); }
  });
}
function labelSprite(text, col) {
  const tex = canvasTex(384, 96, (g) => {
    g.font = '700 50px Inter,system-ui,sans-serif'; const w = Math.min(360, g.measureText(text).width + 56), x = (384 - w) / 2;
    g.fillStyle = 'rgba(12,18,24,.82)'; g.beginPath(); g.roundRect(x, 12, w, 72, 36); g.fill();
    g.strokeStyle = col; g.lineWidth = 7; g.stroke();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 192, 50, 330);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); s.renderOrder = 20; s.scale.set(4.4, 1.1, 1); return s;
}

// ---------- terreno ----------
const GN = 220, SPAN = 164, HG = new Float32Array((GN + 1) * (GN + 1)), DG = new Float32Array((GN + 1) * (GN + 1));
const coastK = th => 1 + .35 * Math.sin(3 * th + 1) + .2 * Math.sin(5 * th + 2.1);
const coastR = (th, re) => 48 + (re - 48) / coastK(th);
function baseH(x, z) {
  let r = Math.hypot(x, z); const th = Math.atan2(z, x);
  if (r > 48) r = 48 + (r - 48) * coastK(th);
  let h = D.profile(r);
  const low = ss(49, 44, r) * ss(11, 16, r);
  h += (fbm(x * .06 + 3, z * .06 + 7) - .5) * 3.2 * low * ss(30, 40, r) + (fbm(x * .06 + 3, z * .06 + 7) - .5) * 1.2 * low;
  const cone = ss(31, 24, r) * ss(11.5, 14, r);
  h += (Math.sin(th * 11 + fbm(x * .1, z * .1) * 5) * .9 + (fbm(x * .22, z * .22) - .5) * 2.2) * cone;
  if (r < 12.5 && r > 7) h += (fbm(x * .5, z * .5) - .5) * 1.6;
  if (r > 52) h += (fbm(x * .08, z * .08) - .5) * .8;
  return h;
}
const RIV = (() => { const a = D.PATH[D.RIVER], b = D.PATH[D.RIVER + 1], mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, th = Math.atan2(mz, mx); return { dx: Math.cos(th), dz: Math.sin(th), r0: 27, r1: 62, rm: Math.hypot(mx, mz) }; })();
const rivOff = al => Math.sin(al * .27 + 1.3) * 1.5 * clamp((Math.abs(al - RIV.rm) - 3.5) / 6, 0, 1);
function riverDist(x, z) { const al = x * RIV.dx + z * RIV.dz; if (al < RIV.r0 - 3 || al > RIV.r1) return 99; const pr = -x * RIV.dz + z * RIV.dx; return Math.abs(pr - rivOff(al)) + Math.max(0, RIV.r0 - al) * 1.1; }
const rivPoint = (al, side) => { const o = rivOff(al) + (side || 0); return V3(RIV.dx * al - RIV.dz * o, 0, RIV.dz * al + RIV.dx * o); };
function buildTerrain() {
  const geo = new THREE.PlaneGeometry(SPAN, SPAN, GN, GN); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, n = pos.count, col = new Float32Array(n * 3), F = D.FINE;
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), z = pos.getZ(i); let h = baseH(x, z), dm = 1e9, py = 0;
    const r = Math.hypot(x, z);
    if (r < 52 && r > 10) for (let k = 0; k < F.length; k++) { const d = (F[k].x - x) * (F[k].x - x) + (F[k].z - z) * (F[k].z - z); if (d < dm) { dm = d; py = F[k].y; } }
    dm = Math.sqrt(dm); const w = 1 - ss(2.4, 5.6, dm); h = lerp(h, py, w);
    const rd = riverDist(x, z); if (rd < 3) h -= 1.7 * (1 - ss(.9, 2.5, rd));
    pos.setY(i, h);
    const ix = Math.round((x + SPAN / 2) / SPAN * GN), iz = Math.round((z + SPAN / 2) / SPAN * GN); HG[iz * (GN + 1) + ix] = h; DG[iz * (GN + 1) + ix] = dm;
  }
  geo.computeVertexNormals();
  const nor = geo.attributes.normal, c = new THREE.Color(), c2 = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(x, z), slope = 1 - nor.getY(i);
    const ix = Math.round((x + SPAN / 2) / SPAN * GN), iz = Math.round((z + SPAN / 2) / SPAN * GN), dm = DG[iz * (GN + 1) + ix];
    const nz = fbm(x * .13, z * .13, 3);
    c.set('#e9d6a2'); if (y < 0) c.lerp(c2.set('#9fb89a'), ss(0, -2.5, y));
    const g = ss(1.25, 2.3, y + (nz - .5) * .8); c.lerp(c2.set(nz > .52 ? '#4f9a3c' : '#3f8233').lerp(new THREE.Color('#6aa84a'), fbm(x * .4, z * .4, 2) * .6), g);
    const vol = ss(10.5, 19, y + (nz - .5) * 5); c.lerp(c2.set('#86705d').lerp(new THREE.Color('#5a463c'), ss(17, 27, y)).multiplyScalar(.8 + fbm(x * .5, z * .5, 3) * .45), vol);
    c.lerp(c2.set('#7d6c5c'), ss(.16, .42, slope) * (1 - vol * .5) * g);
    if (r < 11.6) c.lerp(c2.set('#2a1d1a'), ss(11.6, 9.5, r)).lerp(c2.set('#ff5a1a'), ss(9, 7.4, r) * .5);
    c.lerp(c2.set(y > 12 ? '#8a735f' : '#cfae7c'), (1 - ss(1.7, 3.4, dm)) * .9);
    { const rd = riverDist(x, z); if (rd < 3.2 && y > .2) c.lerp(c2.set('#7d8a72'), (1 - ss(1.2, 3.2, rd)) * .85); }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const grain = grainTex();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, bumpMap: grain, bumpScale: 1.4, roughness: .96, metalness: 0 }));
  m.receiveShadow = true; m.castShadow = true; scene.add(m);
}
function heightAt(x, z) {
  const fx = clamp((x + SPAN / 2) / SPAN * GN, 0, GN - 1e-3), fz = clamp((z + SPAN / 2) / SPAN * GN, 0, GN - 1e-3), ix = fx | 0, iz = fz | 0, u = fx - ix, v = fz - iz, W = GN + 1;
  return lerp(lerp(HG[iz * W + ix], HG[iz * W + ix + 1], u), lerp(HG[(iz + 1) * W + ix], HG[(iz + 1) * W + ix + 1], u), v);
}
const pathDist = (x, z) => { const ix = Math.round(clamp((x + SPAN / 2) / SPAN * GN, 0, GN)), iz = Math.round(clamp((z + SPAN / 2) / SPAN * GN, 0, GN)); return DG[iz * (GN + 1) + ix]; };

// ---------- mar e céu ----------
function skyMat() {
  return new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { zen: { value: new THREE.Color(.10, .30, .78) }, hor: { value: new THREE.Color(.62, .80, .95) }, sunD: { value: SUN.clone() }, sunC: { value: new THREE.Color(1, .93, .78) }, haze: { value: 0 } },
    vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 zen,hor,sunD,sunC; uniform float haze; varying vec3 vD;
      void main(){ vec3 d=normalize(vD); float y=max(d.y,0.); vec3 c=mix(hor,zen,pow(y,.42+haze*.5)); c=mix(c,hor*.82,smoothstep(0.,-.12,d.y));
        float s=max(dot(d,normalize(sunD)),0.); c+=sunC*(pow(s,900.)*14.+pow(s,60.)*.5+pow(s,6.)*.16)*(1.-haze*.6); gl_FragColor=vec4(c,1.); }` });
}
function buildSky() {
  SUN.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 36), THREE.MathUtils.degToRad(215));
  sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 32, 20), skyMat()); scene.add(sky);
  const pm = new THREE.PMREMGenerator(renderer); const sc = new THREE.Scene(); sc.add(new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), skyMat()));
  envTex = pm.fromScene(sc, 0, .1, 2000).texture; scene.environment = envTex; scene.environmentIntensity = .7; pm.dispose();
  sun = new THREE.DirectionalLight('#fff3dc', 3.1); sun.position.copy(SUN).multiplyScalar(160);
  hemi = new THREE.HemisphereLight('#cfe9ff', '#6a7a4a', 1.5); scene.add(sun, sun.target, hemi);
  scene.fog = new THREE.FogExp2('#a9d0ea', .0016);
  const cl = puffTex(); const clouds = new THREE.Group();
  for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cl, transparent: true, opacity: .8, depthWrite: false, fog: false })); const a = srand() * 6.28, r = 130 + srand() * 260; s.position.set(Math.cos(a) * r, 55 + srand() * 45, Math.sin(a) * r); const k = 70 + srand() * 90; s.scale.set(k, k * .5, 1); clouds.add(s); }
  scene.add(clouds); updaters.add(dt => { clouds.rotation.y += dt * .004; });
}
function setShadows() {
  const q = Q[quality]; renderer.shadowMap.enabled = !!q.sh; sun.castShadow = !!q.sh;
  if (q.sh) { sun.shadow.mapSize.set(q.sh, q.sh); const c = sun.shadow.camera; c.left = -72; c.right = 72; c.top = 72; c.bottom = -72; c.near = 20; c.far = 320; c.updateProjectionMatrix(); sun.shadow.bias = -.0004; sun.shadow.normalBias = .35; if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
}
function buildWater() {
  const wn = waterNormals(); const q = Q[quality];
  if (water) { scene.remove(water); water.geometry.dispose(); water.material.dispose(); water = null; }
  if (simpleWater) { scene.remove(simpleWater); simpleWater = null; }
  const geo = new THREE.PlaneGeometry(4000, 4000);
  if (q.wt) {
    water = new Water(geo, { textureWidth: q.wt, textureHeight: q.wt, waterNormals: wn, sunDirection: SUN.clone(), sunColor: 0xfff2d8, waterColor: 0x0b5d6e, distortionScale: 1.6, fog: true });
    water.rotation.x = -Math.PI / 2; water.material.uniforms.size.value = 1.4; scene.add(water);
  } else {
    wn.repeat.set(60, 60);
    simpleWater = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#0e7187', roughness: .12, metalness: .55, normalMap: wn, normalScale: new THREE.Vector2(.6, .6) }));
    simpleWater.rotation.x = -Math.PI / 2; scene.add(simpleWater);
  }
}
function buildShore() {
  const strip = (r0, r1, y, tex, op) => {
    const seg = 220, p = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) { const th = i / seg * Math.PI * 2, a = coastR(th, r0), b = coastR(th, r1); p.push(Math.cos(th) * a, y, Math.sin(th) * a, Math.cos(th) * b, y, Math.sin(th) * b); uv.push(i / seg * 40, 0, i / seg * 40, 1); if (i < seg) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = 2; scene.add(m); return m;
  };
  const shallow = canvasTex(8, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(120,235,215,.0)'); gr.addColorStop(.12, 'rgba(110,232,212,.78)'); gr.addColorStop(.5, 'rgba(40,190,200,.45)'); gr.addColorStop(1, 'rgba(20,140,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 128); });
  strip(51.6, 66, .06, shallow, 1);
  const foamT = canvasTex(256, 64, (g) => { for (let x = 0; x < 256; x++) { const a = fbm(x / 12, 1.3, 3), b = fbm(x / 7, 9.1, 3); g.fillStyle = `rgba(255,255,255,${.25 + a * .75})`; g.fillRect(x, 20 + b * 14, 1, 10 + a * 16); } }); foamT.wrapS = THREE.RepeatWrapping;
  const foam = strip(52.2, 54.6, .1, foamT, .9), foam2 = strip(55.5, 57.4, .09, foamT, .5);
  updaters.add((dt, t) => { foam.material.opacity = .65 + Math.sin(t * .9) * .25; foamT.offset.x = t * .012; foam2.material.opacity = .3 + Math.sin(t * .9 + 2) * .2; });
}

// ---------- rio ----------
function buildRiver() {
  const p = [], uv = [], idx = []; let n = 0;
  for (let al = RIV.r0 - 1; al <= RIV.r1; al += .8) {
    const c = rivPoint(al), hy = heightAt(c.x, c.z) + .78; if (al > RIV.rm + 4 && hy < .1) break; const y = Math.max(.12, hy), wd = 1.45 * clamp((al - RIV.r0 + 1.5) / 3, .2, 1);
    const l = rivPoint(al, -wd), r = rivPoint(al, wd); p.push(l.x, y, l.z, r.x, y, r.z); uv.push(0, al * .16, 1, al * .16);
    if (n) { const k = (n - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } n++;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const tex = canvasTex(64, 256, (c) => { c.fillStyle = '#2f9fd0'; c.fillRect(0, 0, 64, 256); for (let i = 0; i < 46; i++) { c.fillStyle = `rgba(255,255,255,${.12 + srand() * .32})`; c.fillRect(srand() * 60, srand() * 256, 1.5 + srand() * 2.5, 14 + srand() * 44); } }); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: .88, roughness: .12, metalness: .15, side: THREE.DoubleSide })); m.receiveShadow = true; scene.add(m);
  updaters.add((dt, t) => { tex.offset.y = -t * .22; });
  // nascente: pedras de onde brota a água
  const sp = rivPoint(RIV.r0 - 1.5); for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(.9 + srand() * .9, 0), new THREE.MeshStandardMaterial({ color: '#6f655c', roughness: .95, flatShading: true })); r.position.set(sp.x + (srand() - .5) * 3.4, heightAt(sp.x, sp.z) + .5 + srand(), sp.z + (srand() - .5) * 3.4); r.castShadow = true; scene.add(r); }
  // dois caminhos de 3 pedras entre a casa do rio e a margem de lá
  const A = D.PATH[D.RIVER], B = D.PATH[D.RIVER + 1], wy = Math.max(.12, heightAt((A.x + B.x) / 2, (A.z + B.z) / 2) + .78);
  T.stones = [[], []]; T.riverY = wy;
  [-1, 1].forEach((sg, side) => {
    const col = side ? '#5b86c9' : '#c9605b';
    [.2, .5, .8].forEach(t => { const lat = sg * (1.9 + Math.sin(Math.PI * t) * 1.3), x = lerp(A.x, B.x, t) + RIV.dx * lat, z = lerp(A.z, B.z, t) + RIV.dz * lat; const st = new THREE.Mesh(new THREE.CylinderGeometry(.62, .74, .5, 9), new THREE.MeshStandardMaterial({ color: col, roughness: .8, flatShading: true })); st.position.set(x, wy + .08, z); st.rotation.y = srand() * 3; st.castShadow = st.receiveShadow = true; st.userData.y = wy + .08; scene.add(st); T.stones[side].push(st); });
    const fl = new THREE.Group(), pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.2, 6), new THREE.MeshStandardMaterial({ color: '#6b4a2b' })); pole.position.y = 1.1; const flag = new THREE.Mesh(new THREE.PlaneGeometry(.9, .6), new THREE.MeshBasicMaterial({ color: side ? '#2f6fe0' : '#e03a2f', side: THREE.DoubleSide })); flag.position.set(.45, 1.85, 0); fl.add(pole, flag);
    fl.position.set(A.x + RIV.dx * sg * 2.1, A.y + .1, A.z + RIV.dz * sg * 2.1); fl.rotation.y = srand() * 3; scene.add(fl);
  });
}

// ---------- lava ----------
function makeLavaMat(scale) {
  return new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, sc: { value: scale }, heat: { value: 1 } }, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float t,sc,heat; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fb(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
      void main(){ vec2 p=vUv*sc; float q=fb(p*1.6-t*.05); float v=fb(p+vec2(t*.04,t*.025)+q*1.4);
        float crust=smoothstep(.42,.66,v); vec3 hot=mix(vec3(1.,.82,.28),vec3(1.,.22,.02),smoothstep(.15,.5,v));
        vec3 c=mix(hot*(2.2+heat),vec3(.07,.025,.02),crust); c+=vec3(1.,.3,.05)*pow(1.-crust,6.)*heat*.8; gl_FragColor=vec4(c,1.); }`,
  });
}
function particles(sc, o) { // o: n, life, size, color, add, spawn(i)->{p,v}, g
  const n = o.n, pos = new Float32Array(n * 3), vel = [], age = new Float32Array(n), life = new Float32Array(n);
  for (let i = 0; i < n; i++) { const s = o.spawn(i); pos.set([s.p.x, s.p.y, s.p.z], i * 3); vel.push(s.v); life[i] = o.life * (.6 + srand() * .6); age[i] = -(s.d || 0); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ map: T.dot, size: o.size, color: o.color, transparent: true, depthWrite: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: 1, sizeAttenuation: true, toneMapped: !o.add });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; sc.add(pts);
  let total = 0; const max = o.life * 1.25 + (o.delay || 0);
  const up = dt => {
    total += dt; let alive = false;
    for (let i = 0; i < n; i++) { age[i] += dt; if (age[i] < 0) { alive = true; continue; } if (age[i] > life[i]) { pos[i * 3 + 1] = -999; continue; } alive = true; const v = vel[i]; v.y -= (o.g || 0) * dt; if (o.drag) v.multiplyScalar(1 - o.drag * dt); pos[i * 3] += v.x * dt; pos[i * 3 + 1] += v.y * dt; pos[i * 3 + 2] += v.z * dt; }
    g.attributes.position.needsUpdate = true; m.opacity = clamp(1.6 - total / max * 1.6, 0, 1);
    if (!alive || total > max) { updaters.delete(up); sc.remove(pts); g.dispose(); m.dispose(); }
  };
  updaters.add(up); return pts;
}
const rv = (s) => V3((srand() - .5) * s, (srand() - .5) * s, (srand() - .5) * s);

// ---------- casas ----------
const topGeo = new THREE.CircleGeometry(1.46, 30).rotateX(-Math.PI / 2), tileGeo = new THREE.CylinderGeometry(1.62, 1.82, .42, 26);
const topMats = {};
function topMat(t, v) {
  const key = t + (v || ''); if (topMats[key]) return topMats[key];
  let em = D.SPACE[t][0]; if (t === '+') em = '+' + v; if (t === '-') em = '−' + v;
  const m = new THREE.MeshStandardMaterial({ map: iconTex(em, t === 'warp' ? D.WARPCOL[v] : D.SPCOL[t], t === 'skull'), roughness: .5 });
  if (t === '+' || t === '-') m.map = canvasTex(160, 160, (g) => { g.fillStyle = D.SPCOL[t]; g.beginPath(); g.arc(80, 80, 80, 0, 6.3); g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 9; g.beginPath(); g.arc(80, 80, 66, 0, 6.3); g.stroke(); g.fillStyle = '#fff'; g.font = '800 78px Inter,system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(em, 80, 86); });
  return topMats[key] = m;
}
function makeTile(sc, p, sp) {
  const g = new THREE.Group(); g.position.set(p.x, p.y, p.z);
  const body = new THREE.Mesh(tileGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color(D.SPCOL[sp.t]).multiplyScalar(.55), roughness: .8 })); body.castShadow = body.receiveShadow = true;
  const top = new THREE.Mesh(topGeo, topMat(sp.t, sp.v)); top.position.y = .22; top.receiveShadow = true;
  g.add(body, top); sc.add(g); g.userData = { top, sp, mat: top.material }; return g;
}
function buildBoard() {
  D.PATH.forEach((p, i) => tiles.push(makeTile(scene, p, D.ISLAND[i])));
  const rings = []; D.ISLAND.forEach((sp, i) => { if (sp.t !== 'warp') return; const c = new THREE.Color(D.WARPCOL[sp.v]).multiplyScalar(2.4); for (let k = 0; k < 2; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.25 - k * .4, .07, 8, 36).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: true, opacity: .85 })); r.position.set(D.PATH[i].x, D.PATH[i].y + .6 + k * .5, D.PATH[i].z); r.userData.k = k + i; scene.add(r); rings.push(r); } });
  updaters.add((dt, t) => rings.forEach(r => { r.rotation.y = t * (1.5 + r.userData.k % 2); r.position.y += Math.sin(t * 2 + r.userData.k) * dt * .12; }));
  // pedras entre as casas
  const st = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.42, 0), new THREE.MeshStandardMaterial({ color: '#b9a888', roughness: .9, flatShading: true }), D.FINE.length * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let k = 0;
  D.FINE.forEach((f, i) => { if (i % 2) return; for (let s = -1; s <= 1; s += 2) { const a = Math.atan2(f.z, f.x); const x = f.x + Math.cos(a) * s * (2.1 + srand() * .5), z = f.z + Math.sin(a) * s * (2.1 + srand() * .5); e.set(srand() * 3, srand() * 3, srand() * 3); q.setFromEuler(e); const sc = .5 + srand() * .8; m4.compose(V3(x, heightAt(x, z) + .05, z), q, V3(sc, sc * .6, sc)); st.setMatrixAt(k++, m4); } });
  st.count = k; st.castShadow = st.receiveShadow = true; scene.add(st);
  T.lavaTop = new THREE.MeshBasicMaterial({ map: iconTex('🔥', '#ff4a12'), toneMapped: false, color: new THREE.Color(2.2, 1.5, 1.2) });
}
function setLavaTiles(on) { tiles.forEach(g => { g.userData.top.material = on && D.LAVA_TYPES[g.userData.sp.t] ? T.lavaTop : g.userData.mat; }); }

// ---------- cenário ----------
function buildGates() {
  const wood = new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: .85 }), stone = new THREE.MeshStandardMaterial({ color: '#8d8478', roughness: .9, flatShading: true });
  D.GATES.forEach((gi, n) => {
    const p = D.PATH[gi], nx = D.PATH[gi + 1], dir = V3(nx.x - p.x, 0, nx.z - p.z).normalize();
    const g = new THREE.Group(); g.position.set(p.x + dir.x * 2.4, p.y - .2, p.z + dir.z * 2.4); g.rotation.y = Math.atan2(dir.x, dir.z);
    for (let s = -1; s <= 1; s += 2) { const pil = new THREE.Mesh(new THREE.CylinderGeometry(.5, .68, 5.4, 7), stone); pil.position.set(s * 2.6, 2.7, 0); pil.castShadow = true; g.add(pil); const tor = new THREE.Mesh(new THREE.SphereGeometry(.34, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.5, .4), toneMapped: false })); tor.position.set(s * 2.6, 5.8, 0); g.add(tor); }
    const lin = new THREE.Mesh(new THREE.BoxGeometry(6.8, .8, 1), wood); lin.position.y = 5.2; lin.castShadow = true; g.add(lin);
    const face = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.1, 1.1), stone); face.position.y = 6.4; face.castShadow = true; g.add(face);
    const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(.2, 1.6, 1.8), toneMapped: false });
    for (let s = -1; s <= 1; s += 2) { const ey = new THREE.Mesh(new THREE.BoxGeometry(.42, .3, .1), eyeM); ey.position.set(s * .45, 6.75, -.56); g.add(ey); }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(1, .22, .1), new THREE.MeshBasicMaterial({ color: '#201612' })); mouth.position.set(0, 5.95, -.56); g.add(mouth);
    const bars = new THREE.Group(); for (let b = -2; b <= 2; b++) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 4.8, 6), wood); bar.position.set(b * .86, 2.4, 0); bar.castShadow = true; bars.add(bar); }
    g.add(bars); scene.add(g); gates.push({ g, bars, eyeM, face });
  });
  // templo do cume
  const p = D.PATH[D.GOAL], c = V3(-p.x, 0, -p.z).normalize(); const t = new THREE.Group(); t.position.set(p.x + c.x * 2.6, p.y - .1, p.z + c.z * 2.6); t.rotation.y = Math.atan2(c.x, c.z);
  const red = new THREE.MeshStandardMaterial({ color: '#b3261e', roughness: .6 }), gold = new THREE.MeshStandardMaterial({ color: '#f2c14e', roughness: .25, metalness: 1 });
  for (let s = -1; s <= 1; s += 2) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(.28, .32, 5, 10), red); pl.position.set(s * 2, 2.5, 0); pl.castShadow = true; t.add(pl); }
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(5.6, .42, .7), red); b1.position.y = 5; const b2 = new THREE.Mesh(new THREE.BoxGeometry(4.6, .3, .5), red); b2.position.y = 4.1; t.add(b1, b2);
  const gong = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, .12, 32), gold); gong.rotation.x = Math.PI / 2; gong.position.y = 2.6; gong.castShadow = true; const pivot = new THREE.Group(); pivot.position.y = 4.1; gong.position.y = -1.5; pivot.add(gong); t.add(pivot);
  scene.add(t); T.gong = pivot; T.temple = t;
}
function scatter(geo, mat, count, test0, scl, yoff, cols) {
  const test = (x, z, y, r) => riverDist(x, z) > 3.4 && test0(x, z, y, r);
  const im = new THREE.InstancedMesh(geo, mat, count), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = V3(0, 1, 0); let k = 0, tries = 0;
  while (k < count && tries++ < count * 60) {
    const a = srand() * 6.283, r = 6 + srand() * 52, x = Math.cos(a) * r, z = Math.sin(a) * r, y = heightAt(x, z);
    if (!test(x, z, y, r)) continue;
    q.setFromAxisAngle(up, srand() * 6.28); const s = scl[0] + srand() * (scl[1] - scl[0]); m4.compose(V3(x, y + (yoff || 0) * s, z), q, V3(s, s * (.85 + srand() * .3), s)); if (cols) im.setColorAt(k, new THREE.Color(cols[(srand() * cols.length) | 0]).multiplyScalar(.85 + srand() * .3)); im.setMatrixAt(k++, m4);
  }
  im.count = k; im.castShadow = true; im.receiveShadow = true; scene.add(im); return im;
}
function buildNature() {
  // palmeiras
  const trunk = new THREE.CylinderGeometry(.16, .3, 6.4, 7, 8); trunk.translate(0, 3.2, 0); { const p = trunk.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + y * y * .035); } trunk.computeVertexNormals(); }
  const fr = []; for (let i = 0; i < 9; i++) { const f = new THREE.PlaneGeometry(.8, 3.1, 2, 7); f.translate(0, 1.55, 0); const p = f.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k), x = p.getX(k); p.setZ(k, -y * y * .2 - Math.abs(x) * .5); p.setX(k, x * (1 - y / 3.6)); } f.rotateX(1.05 + (i % 3) * .22); f.rotateY(i / 9 * 6.283 + (i % 2) * .2); f.translate(6.4 * 6.4 * .035, 6.35, 0); fr.push(f); }
  const leaves = mergeGeometries(fr); leaves.computeVertexNormals();
  const tm = new THREE.MeshStandardMaterial({ color: '#8a6a45', roughness: .9 }), lm = new THREE.MeshStandardMaterial({ color: '#3f9a3a', roughness: .7, side: THREE.DoubleSide });
  const palmOK = (x, z, y, r) => y > 1.15 && y < 6.5 && pathDist(x, z) > 6.4 && r > 33;
  seed = 11; scatter(trunk, tm, 90, palmOK, [.7, 1.05]); seed = 11; scatter(leaves, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .7, side: THREE.DoubleSide }), 90, palmOK, [.7, 1.05], 0, ['#3f9a3a', '#4fa844', '#368a34']);
  // árvores da selva
  const bl = []; [[0, 3.6, 0, 1.7], [1.1, 3.0, .4, 1.2], [-.9, 3.1, -.6, 1.25], [.2, 4.5, .5, 1.1]].forEach(b => { const s = new THREE.IcosahedronGeometry(b[3], 2); const sp = s.attributes.position; for (let i = 0; i < sp.count; i++) { const k = 1 + (fbm(sp.getX(i) * 1.7 + b[0], sp.getY(i) * 1.7 + sp.getZ(i) * 1.3, 2) - .5) * .5; sp.setXYZ(i, sp.getX(i) * k, sp.getY(i) * k * .85, sp.getZ(i) * k); } s.translate(b[0], b[1], b[2]); bl.push(s); });
  const crown = mergeGeometries(bl); crown.computeVertexNormals(); const tr2 = new THREE.CylinderGeometry(.2, .32, 3, 6); tr2.translate(0, 1.5, 0);
  const jOK = (x, z, y, r) => y > 2 && y < 12 && pathDist(x, z) > 6.6 && r > 18 && r < 46;
  seed = 23; scatter(tr2, tm, 150, jOK, [.6, 1.05]); seed = 23; scatter(crown, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .85 }), 150, jOK, [.6, 1.05], 0, ['#2f7a34', '#3d8a3a', '#28692f', '#4a9440']);
  const bush = new THREE.IcosahedronGeometry(.9, 2); { const sp = bush.attributes.position; for (let i = 0; i < sp.count; i++) { const k = 1 + (fbm(sp.getX(i) * 2.3, sp.getY(i) * 2.3 + sp.getZ(i) * 1.9, 2) - .5) * .7; sp.setXYZ(i, sp.getX(i) * k * 1.3, Math.max(-.2, sp.getY(i) * k * .7), sp.getZ(i) * k * 1.3); } bush.computeVertexNormals(); }
  seed = 31; scatter(bush, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .9 }), 200, (x, z, y, r) => y > 1.3 && y < 13 && pathDist(x, z) > 4.2, [.35, .8], .25, ['#4c9a3e', '#3e8a36', '#5aa646']);
  seed = 37; scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#6f655c', roughness: .95, flatShading: true }), 110, (x, z, y, r) => pathDist(x, z) > 3.8 && (y > 9 || (y > -.6 && y < 1.2 && srand() < .25)), [.3, 1.15], .2);
  seed = 41; scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#4a3d38', roughness: .9, flatShading: true }), 34, (x, z, y, r) => r < 13 && r > 8.5 && pathDist(x, z) > 3.5, [.3, .95], .2);
  // cabanas, pontão e barco na praia
  const s0 = D.PATH[0], out = V3(s0.x, 0, s0.z).normalize(), tan = V3(-out.z, 0, out.x);
  const thatch = new THREE.MeshStandardMaterial({ color: '#c9a45a', roughness: 1, flatShading: true }), wood = new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: .9 });
  [[-9, -3, 1], [-14, 1, .85], [9, -4, 1.1]].forEach(([a, b, s]) => { const x = s0.x + tan.x * a + out.x * b, z = s0.z + tan.z * a + out.z * b; const h = new THREE.Group(); const w = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 2.2, 10), wood); w.position.y = 1.1; const rf = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.2, 10), thatch); rf.position.y = 3.2; w.castShadow = rf.castShadow = true; h.add(w, rf); h.position.set(x, heightAt(x, z) - .1, z); h.scale.setScalar(s); scene.add(h); });
  const pier = new THREE.Group(); for (let i = 0; i < 9; i++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(2.4, .16, 1.1), wood); pl.position.set(0, .75, i * 1.25); pl.castShadow = true; pier.add(pl); if (i % 3 === 0) for (let s = -1; s <= 1; s += 2) { const po = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, 2.6, 6), wood); po.position.set(s * 1.1, -.2, i * 1.25); pier.add(po); } }
  const px = s0.x + out.x * 5.5 + tan.x * 3, pz = s0.z + out.z * 5.5 + tan.z * 3; pier.position.set(px, 0, pz); pier.rotation.y = Math.atan2(out.x, out.z); scene.add(pier);
  const boat = new THREE.Group(); const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10, 0, 6.283, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d8e4ea', roughness: .5, side: THREE.DoubleSide })); hull.scale.set(1.2, .9, 3); const mast = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 4.4, 6), wood); mast.position.y = 2.2; const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), new THREE.MeshStandardMaterial({ color: '#fff7e6', side: THREE.DoubleSide, roughness: .9 })); sail.position.set(0, 2.5, .2); sail.rotation.y = Math.PI / 2; boat.add(hull, mast, sail);
  boat.position.set(px + out.x * 14 + tan.x * 4, .25, pz + out.z * 14 + tan.z * 4); boat.rotation.y = 1; scene.add(boat); updaters.add((dt, t) => { boat.position.y = .25 + Math.sin(t * 1.1) * .12; boat.rotation.z = Math.sin(t * .8) * .05; });
}
function buildCrater() {
  lavaMat = makeLavaMat(5);
  const lava = new THREE.Mesh(new THREE.CircleGeometry(9.2, 40).rotateX(-Math.PI / 2), lavaMat); lava.position.y = 21.3; scene.add(lava);
  craterLight = new THREE.PointLight('#ff6a20', 900, 60, 1.8); craterLight.position.set(0, 25, 0); scene.add(craterLight);
  const pf = puffTex(); T.smoke = [];
  for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pf, color: '#d9d4cd', transparent: true, opacity: 0, depthWrite: false })); s.userData = { ph: i / 16, dx: (srand() - .5) * 9, dz: (srand() - .5) * 9 }; scene.add(s); T.smoke.push(s); }
  T.plume = 1;
  updaters.add((dt, t) => {
    lavaMat.uniforms.t.value = t; if (lavaIn) lavaIn.uniforms.t.value = t;
    T.smoke.forEach(s => { const u = (t * .045 * (1 + T.plume * .25) + s.userData.ph) % 1; s.position.set(s.userData.dx * (.3 + u * 2.2) + u * u * 16, 24 + u * (26 + T.plume * 22), s.userData.dz * (.3 + u * 2.2)); const k = (5 + u * 26) * (.7 + T.plume * .5); s.scale.set(k, k, 1); s.material.opacity = Math.sin(u * Math.PI) * (.1 + T.plume * .16); });
    craterLight.intensity = (700 + Math.sin(t * 3) * 90 + Math.sin(t * 7.3) * 60) * (1 + T.heat * 2.2);
  });
  // rios de lava (só durante a erupção)
  T.flows = new THREE.Group(); const fm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, .5, .06), toneMapped: false, transparent: true, opacity: 0 });
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + srand(), pts = []; for (let r = 10.5; r < 27 + srand() * 6; r += 1.2) { const aa = a + Math.sin(r * .35 + i) * .12, x = Math.cos(aa) * r, z = Math.sin(aa) * r; pts.push(V3(x, heightAt(x, z) + .18, z)); } const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .34 + srand() * .3, 5), fm); T.flows.add(tube); }
  T.flowMat = fm; T.flows.visible = false; scene.add(T.flows); T.heat = 0;
}

// ---------- interior do vulcão ----------
function buildInterior() {
  inScene = new THREE.Scene(); inScene.background = new THREE.Color('#0a0605'); inScene.fog = new THREE.FogExp2('#1a0c0a', .009);
  const wall = new THREE.CylinderGeometry(26, 20, 60, 48, 24, true); { const p = wall.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color(); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z) - (fbm(a * 3 + 9, y * .15, 4) * 7 + Math.sin(a * 9 + y * .4) * .8) - ss(10, 30, y) * 9; p.setX(i, Math.cos(a) * r); p.setZ(i, Math.sin(a) * r); col.set('#5a4a44').lerp(new THREE.Color('#6a2a14'), ss(-6, -30, y) * .7).multiplyScalar(.6 + fbm(a * 8, y * .3, 3) * .8); c.set([col.r, col.g, col.b], i * 3); } wall.setAttribute('color', new THREE.BufferAttribute(c, 3)); wall.computeVertexNormals(); }
  const wm = new THREE.Mesh(wall, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.BackSide, roughness: 1, flatShading: true })); wm.position.y = 26; inScene.add(wm);
  lavaIn = makeLavaMat(7); const lake = new THREE.Mesh(new THREE.CircleGeometry(30, 48).rotateX(-Math.PI / 2), lavaIn); lake.position.y = -.4; inScene.add(lake);
  const l1 = new THREE.PointLight('#ff6a28', 420, 80, 1.5); l1.position.set(0, 2.5, 0); const l2 = new THREE.PointLight('#bfe0ff', 2600, 90, 1.4); l2.position.set(0, 46, 0); inScene.add(l1, l2, new THREE.AmbientLight('#8a6a70', .5), new THREE.HemisphereLight('#6f86a8', '#ff5a20', .55));
  T.inLight = l1;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(9, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.4, 2.8), toneMapped: false })); hole.position.y = 55; inScene.add(hole);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(8, 13, 56, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#9fc8ff', transparent: true, opacity: .06, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); shaft.position.y = 27; inScene.add(shaft);
  const rock = new THREE.MeshStandardMaterial({ color: '#6a5a52', roughness: .95, flatShading: true });
  D.VPATH.forEach((p, i) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 1.2 + srand(), p.y + 1.2, 7), rock); col.position.set(p.x, (p.y - 1.2) / 2 - .2, p.z); col.rotation.y = srand() * 3; col.castShadow = true; inScene.add(col);
    vtiles.push(makeTile(inScene, { x: p.x, y: p.y, z: p.z }, D.VOLC[i]));
  });
  for (let i = 0; i < 26; i++) { const a = srand() * 6.28, r = 4 + srand() * 17, s = new THREE.Mesh(new THREE.ConeGeometry(.5 + srand() * 1.2, 3 + srand() * 8, 6), rock); s.position.set(Math.cos(a) * r, 50 - srand() * 6, Math.sin(a) * r); s.rotation.x = Math.PI; inScene.add(s); }
  for (let i = 0; i < 14; i++) { const a = srand() * 6.28, r = 2 + srand() * 20, s = new THREE.Mesh(new THREE.DodecahedronGeometry(1 + srand() * 2.2, 0), rock); s.position.set(Math.cos(a) * r, -.2, Math.sin(a) * r); inScene.add(s); }
  const ex = D.VPATH[D.EXITV], o = V3(ex.x, 0, ex.z).normalize(); const door = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.6, 2.2), toneMapped: false })); door.position.set(ex.x + o.x * 3.2, ex.y + 2.4, ex.z + o.z * 3.2); door.lookAt(0, ex.y + 2.4, 0); inScene.add(door); T.door = door;
  // brasas e vapor dos géiseres
  const N = 160, pos = new Float32Array(N * 3), sp = []; for (let i = 0; i < N; i++) { pos.set([(srand() - .5) * 40, srand() * 40, (srand() - .5) * 40], i * 3); sp.push(.6 + srand() * 2); }
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const emb = new THREE.Points(eg, new THREE.PointsMaterial({ map: T.dot, size: .45, color: new THREE.Color(3, 1.2, .3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); inScene.add(emb);
  const pf = puffTex(), steam = []; D.VOLC.forEach((s, i) => { if (s.t !== 'geyser') return; for (let k = 0; k < 4; k++) { const sp2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: pf, transparent: true, opacity: 0, depthWrite: false })); sp2.userData = { i, ph: k / 4 }; inScene.add(sp2); steam.push(sp2); } });
  updaters.add((dt, t) => {
    if (active !== inScene) return;
    for (let i = 0; i < N; i++) { pos[i * 3 + 1] += sp[i] * dt; pos[i * 3] += Math.sin(t + i) * dt * .4; if (pos[i * 3 + 1] > 42) pos[i * 3 + 1] = 0; } eg.attributes.position.needsUpdate = true;
    steam.forEach(s => { const p = D.VPATH[s.userData.i], u = (t * .35 + s.userData.ph) % 1; s.position.set(p.x, p.y + .6 + u * 4.5, p.z); const k = 1 + u * 2.6; s.scale.set(k, k, 1); s.material.opacity = Math.sin(u * 3.14) * .35; });
    l1.intensity = 400 + Math.sin(t * 2.3) * 50;
  });
}

// ---------- peões ----------
const SKIN = '#f0c9a0';
function hatMesh(k, col) {
  const g = new THREE.Group(), M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .7 }, o || {}));
  const add = (geo, mat, y, fn) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true; if (fn) fn(m); g.add(m); return m; };
  switch (k) {
    case 0: add(new THREE.CylinderGeometry(.82, .82, .06, 20), M('#e3c77a'), .3); add(new THREE.CylinderGeometry(.34, .44, .34, 16), M('#e3c77a'), .46); add(new THREE.CylinderGeometry(.445, .445, .1, 16), M(col), .36); break;
    case 1: add(new THREE.SphereGeometry(.5, 16, 10, 0, 6.3, 0, 1.45), M('#b3261e'), .02); add(new THREE.SphereGeometry(.13, 8, 8), M('#b3261e'), .2, m => m.position.set(-.45, .18, .2)); break;
    case 2: for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(.14, 8, 6), M(['#ff5d8f', '#ffd166', '#ffffff'][i % 3]), .28, m => m.position.set(Math.cos(i / 9 * 6.28) * .42, .26, Math.sin(i / 9 * 6.28) * .42)); break;
    case 3: add(new THREE.SphereGeometry(.5, 16, 10, 0, 6.3, 0, 1.5), M(col), .03); add(new THREE.BoxGeometry(.6, .05, .5), M(col), .2, m => m.position.set(0, .18, .55)); break;
    case 4: add(new THREE.SphereGeometry(.54, 16, 10, 0, 6.3, 0, 1.55), M('#f4f1e8', { roughness: .4 }), .02); add(new THREE.CylinderGeometry(.6, .66, .07, 18), M('#f4f1e8'), .1); break;
    case 5: add(new THREE.CylinderGeometry(.7, .7, .06, 20), M('#1c1c22'), .3); add(new THREE.CylinderGeometry(.42, .4, .7, 16), M('#1c1c22'), .66); add(new THREE.CylinderGeometry(.425, .425, .12, 16), M(col), .4); break;
    case 6: add(new THREE.SphereGeometry(.56, 14, 10, 0, 6.3, 0, 1.5), M('#6b4423', { roughness: 1 }), .0); break;
    default: add(new THREE.CylinderGeometry(.42, .38, .34, 12, 1, true), M('#f2c14e', { metalness: 1, roughness: .25, side: THREE.DoubleSide }), .46); for (let i = 0; i < 6; i++) add(new THREE.ConeGeometry(.09, .22, 6), M('#f2c14e', { metalness: 1, roughness: .25 }), .7, m => m.position.set(Math.cos(i / 6 * 6.28) * .4, .72, Math.sin(i / 6 * 6.28) * .4));
  }
  return g;
}
function makePawn(p) {
  const col = D.PCOLORS[p.col], g = new THREE.Group(), fig = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.5, .62, 6, 14), new THREE.MeshStandardMaterial({ color: col, roughness: .55 })); body.position.y = .92; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.47, 20, 16), new THREE.MeshStandardMaterial({ color: SKIN, roughness: .7 })); head.position.y = 1.98; head.castShadow = true;
  const eyeM = new THREE.MeshBasicMaterial({ color: '#1b1b20' }); for (let s = -1; s <= 1; s += 2) { const e = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 8), eyeM); e.position.set(s * .17, 2.03, .42); fig.add(e); }
  const hat = hatMesh(p.hat, col); hat.position.y = 2.1;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.72, .09, 8, 28).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.6), toneMapped: false })); ring.position.y = .08;
  fig.add(body, head, hat); g.add(fig, ring);
  const lab = labelSprite((p.bot ? '🤖 ' : '') + p.name, col); lab.position.y = 3.5; g.add(lab);
  g.userData = { fig, lab, ring, zone: 'i', idx: 0, key: p.name + '|' + p.col + '|' + p.hat + '|' + (p.bot ? 1 : 0) };
  return g;
}
function slotPos(zone, idx, k, n) {
  const p = zone === 'v' ? D.VPATH[idx] : D.PATH[idx]; const r = n > 1 ? (n > 4 ? 1.05 : .82) : 0, a = k / Math.max(1, n) * 6.283 + idx;
  return V3(p.x + Math.cos(a) * r, p.y + .22, p.z + Math.sin(a) * r);
}
function slotOf(pi) { const P = players(), p = P[pi]; const z = p.zone, idx = z === 'v' ? p.vpos : p.pos; const same = P.map((q, i) => (q.zone === z && (z === 'v' ? q.vpos : q.pos) === idx) ? i : -1).filter(i => i >= 0); return slotPos(z, idx, same.indexOf(pi), same.length); }
function syncAll(instant) {
  const P = players();
  while (pawns.length > P.length) { const g = pawns.pop(); g.parent && g.parent.remove(g); }
  P.forEach((p, i) => {
    const key = p.name + '|' + p.col + '|' + p.hat + '|' + (p.bot ? 1 : 0);
    if (!pawns[i] || pawns[i].userData.key !== key) { if (pawns[i]) pawns[i].parent && pawns[i].parent.remove(pawns[i]); pawns[i] = makePawn(p); }
    const g = pawns[i], sc = p.zone === 'v' ? inScene : scene; if (g.parent !== sc) sc.add(g);
    if (g.userData.busy) return;
    const t = slotOf(i); if (instant !== false) g.position.copy(t); g.userData.zone = p.zone; g.userData.idx = p.zone === 'v' ? p.vpos : p.pos; g.visible = true; g.scale.setScalar(1); g.userData.fig.rotation.set(0, g.userData.fig.rotation.y, 0);
  });
}
function settleOthers(pi) { players().forEach((p, i) => { if (i === pi || !pawns[i] || pawns[i].userData.busy) return; const t = slotOf(i); if (pawns[i].position.distanceTo(t) > .05 && pawns[i].position.distanceTo(t) < 3) { const a = pawns[i].position.clone(); tween(220, k => pawns[i].position.lerpVectors(a, t, k)); } }); }
async function hop(pi, sp) {
  const g = pawns[pi]; if (!g) return; const p = players()[pi]; if (g.parent !== (p.zone === 'v' ? inScene : scene)) { syncAll(); return; }
  const a = g.position.clone(), b = slotOf(pi), fig = g.userData.fig; g.userData.busy = true;
  fig.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); cam.mode = 'follow'; cam.who = pi; setScene(p.zone);
  const hgt = 1.5 + Math.max(0, b.y - a.y) * .4;
  await tween(400 * (sp || 1), k => { g.position.lerpVectors(a, b, k); g.position.y += Math.sin(k * Math.PI) * hgt; const sq = k < .15 ? 1 - k * 1.2 : k > .88 ? 1 - (1 - k) * 1.6 : 1.06; fig.scale.set(2 - sq > 1.25 ? 1.25 : 2 - sq, sq, 2 - sq > 1.25 ? 1.25 : 2 - sq); }, lin);
  fig.scale.set(1, 1, 1); g.userData.busy = false; g.userData.idx = p.zone === 'v' ? p.vpos : p.pos; settleOthers(pi);
  dust(g.position, p.zone === 'v' ? inScene : scene, 8, p.zone === 'v' ? '#6b5a50' : '#d8c59a');
  await sleep(90 * (sp || 1));
}
function dust(at, sc, n, color) { particles(sc, { n, life: .7, size: .7, color, spawn: () => ({ p: at.clone().add(V3(0, .15, 0)), v: V3((srand() - .5) * 3, .6 + srand() * 1.2, (srand() - .5) * 3) }), g: 2, drag: 2 }); }
async function flyTo(pi, ms, height, spin) {
  const g = pawns[pi]; if (!g) return; const a = g.position.clone(), b = slotOf(pi), fig = g.userData.fig; g.userData.busy = true;
  await tween(ms, k => { g.position.lerpVectors(a, b, k); g.position.y += Math.sin(k * Math.PI) * height; fig.rotation.y += spin || 0; });
  g.userData.busy = false; fig.rotation.x = fig.rotation.z = 0; settleOthers(pi); dust(g.position, g.parent, 12, '#d8c59a');
}

// ---------- câmara ----------
const cam = { mode: 'orbit', who: 0, pos: V3(140, 40, 140), look: V3(0, 10, 0), tp: V3(0, 0, 0), tl: V3(0, 0, 0), ang: .6, shake: 0, k: 2.6, orbitR: 108, orbitH: 50, orbitLook: V3(0, 9, 0), orbitSp: .035 };
function setScene(zone) { const sc = zone === 'v' ? inScene : scene; if (active === sc) return; active = sc; renderPass.scene = sc; sc.add(camera); if (bloom) bloom.strength = zone === 'v' ? .3 : (T.heat > 0 ? .5 : .32); }
function followPose(pi) {
  const g = pawns[pi]; if (!g) return; const p = g.position;
  if (g.parent === inScene) { const o = V3(-p.x, 0, -p.z).normalize(); cam.tp.set(o.x * 6, p.y + 6.5, o.z * 6); cam.tl.set(p.x, p.y + 1.2, p.z); }
  else { const o = V3(p.x, 0, p.z).normalize(), tn = V3(-o.z, 0, o.x); cam.tp.copy(p).addScaledVector(o, 14.5).addScaledVector(tn, 5).add(V3(0, 11.5, 0)); cam.tp.y = Math.max(cam.tp.y, heightAt(cam.tp.x, cam.tp.z) + 3); cam.tl.copy(p).add(V3(0, 1.6, 0)).addScaledVector(o, -2.5); }
}
function updateCam(dt) {
  if (cam.mode === 'orbit') { cam.ang += dt * cam.orbitSp; cam.tp.set(Math.cos(cam.ang) * cam.orbitR, cam.orbitH, Math.sin(cam.ang) * cam.orbitR); cam.tl.copy(cam.orbitLook); }
  else if (cam.mode === 'follow') followPose(cam.who);
  const k = 1 - Math.exp(-Math.min(dt, .5) * cam.k); cam.pos.lerp(cam.tp, k); cam.look.lerp(cam.tl, k);
  camera.position.copy(cam.pos); if (cam.shake > .001) { camera.position.add(rv(cam.shake)); cam.shake *= Math.exp(-dt * 2.2); }
  camera.lookAt(cam.look);
}
function orbit(r, h, look, spd) { cam.mode = 'orbit'; cam.orbitR = r || 108; cam.orbitH = h || 50; cam.orbitLook = look || V3(0, 9, 0); cam.orbitSp = spd === undefined ? .035 : spd; cam.ang = Math.atan2(cam.pos.z, cam.pos.x); setScene('i'); }
function fixed(pos, look, snap) { cam.mode = 'fixed'; cam.tp.copy(pos); cam.tl.copy(look); if (snap) { cam.pos.copy(pos); cam.look.copy(look); } }
function focus(pi) { const p = players()[pi]; if (!p) return sleep(1); setScene(p.zone); cam.mode = 'follow'; cam.who = pi; return sleep(900); }
function lookTile(idx, dist, h) { const p = D.PATH[idx], o = V3(p.x, 0, p.z).normalize(), tn = V3(-o.z, 0, o.x); setScene('i'); fixed(V3(p.x, p.y, p.z).addScaledVector(o, dist || 13).addScaledVector(tn, 5).add(V3(0, h || 6, 0)), V3(p.x, p.y + 2.2, p.z)); }

// ---------- dados ----------
const diceGroup = new THREE.Group();
function pipTex(v, bg, fg) { return canvasTex(128, 128, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 128, 128); g.fillStyle = fg; const P = { 1: [[64, 64]], 2: [[36, 36], [92, 92]], 3: [[34, 34], [64, 64], [94, 94]], 4: [[36, 36], [92, 36], [36, 92], [92, 92]], 5: [[36, 36], [92, 36], [64, 64], [36, 92], [92, 92]], 6: [[36, 32], [92, 32], [36, 64], [92, 64], [36, 96], [92, 96]] }[v]; P.forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 12, 0, 6.3); g.fill(); }); }); }
const dieGeo = new RoundedBoxGeometry(1, 1, 1, 4, .14), dieMats = {};
const FACE = { n: [1, 6, 2, 5, 3, 4], g: [1, 6, 2, 5, 3, 4], s: [1, 4, 2, 3, 3, 2], b: [1, 2, 1, 2, 2, 1] }, FN = [V3(1, 0, 0), V3(-1, 0, 0), V3(0, 1, 0), V3(0, -1, 0), V3(0, 0, 1), V3(0, 0, -1)];
function dieMat(t) { if (dieMats[t]) return dieMats[t]; const c = { n: ['#fbfbf6', '#20222a', .35, 0], g: ['#f3c545', '#4a2c00', .22, .9], s: ['#dfe4ea', '#2a2e36', .18, .9], b: ['#c9824a', '#3a1c08', .3, .85] }[t]; return dieMats[t] = FACE[t].map(v => new THREE.MeshStandardMaterial({ map: pipTex(v, c[0], c[1]), roughness: c[2], metalness: c[3] })); }
async function rollDice(out) {
  camera.add(diceGroup); diceGroup.clear(); diceGroup.position.set(0, -.2, -7);
  const lt = new THREE.PointLight('#ffffff', 30, 20); lt.position.set(2, 3, 4); diceGroup.add(lt);
  const ds = out.map((o, i) => { const m = new THREE.Mesh(dieGeo, dieMat(o.t)); m.userData = { x: (i - (out.length - 1) / 2) * 1.7, q0: new THREE.Quaternion().setFromEuler(new THREE.Euler(srand() * 6, srand() * 6, srand() * 6)), ax: rv(2).normalize(), sp: 14 + srand() * 8 }; const fi = FACE[o.t].indexOf(o.v); m.userData.q1 = new THREE.Quaternion().setFromUnitVectors(FN[fi], V3(0, 0, 1)); diceGroup.add(m); return m; });
  const q = new THREE.Quaternion();
  await tween(1150, k => { ds.forEach(m => { const u = m.userData, e = easeOut(k); m.position.set(u.x * (.4 + e * .6), 3.2 * (1 - e) + Math.abs(Math.sin(k * 9.4)) * (1 - k) * 1.2, (1 - e) * -4); q.setFromAxisAngle(u.ax, (1 - k) * u.sp); m.quaternion.copy(u.q0).premultiply(q); if (k > .72) m.quaternion.slerp(u.q1, (k - .72) / .28); m.scale.setScalar(.8 + e * .45); }); }, lin);
  ds.forEach(m => m.quaternion.copy(m.userData.q1));
  await tween(220, k => ds.forEach(m => m.scale.setScalar(1.25 + Math.sin(k * 3.14) * .2)));
}
async function clearDice() { await tween(260, k => diceGroup.children.forEach(m => m.isMesh && m.scale.setScalar(1.25 * (1 - k)))); diceGroup.clear(); camera.remove(diceGroup); }

// ---------- efeitos e cutscenes ----------
const pawnPos = pi => pawns[pi] ? pawns[pi].position.clone() : V3(0, 0, 0);
function setMood(h) { // 0 dia calmo · 1 erupção
  T.heat = h; T.plume = 1 + h * 3; const u = sky.material.uniforms; u.zen.value.setRGB(.10, .30, .78).lerp(new THREE.Color(.16, .07, .06), h); u.hor.value.setRGB(.62, .80, .95).lerp(new THREE.Color(.85, .36, .16), h); u.haze.value = h;
  sun.intensity = lerp(3.1, 1.7, h); sun.color.set('#fff3dc').lerp(new THREE.Color('#ff9a5a'), h); hemi.color.set('#cfe9ff').lerp(new THREE.Color('#ff7a4a'), h); hemi.intensity = lerp(1.5, .9, h);
  scene.fog.color.set('#a9d0ea').lerp(new THREE.Color('#6a3a2a'), h); scene.fog.density = lerp(.0016, .0042, h); scene.environmentIntensity = lerp(.7, .35, h);
  T.smoke.forEach(s => s.material.color.set('#d9d4cd').lerp(new THREE.Color('#2a2220'), h));
  T.flows.visible = h > .02; T.flowMat.opacity = h; lavaMat.uniforms.heat.value = 1 + h * 1.5; if (bloom && active === scene) bloom.strength = lerp(.32, .55, h);
  if (water) water.material.uniforms.sunColor.value.set('#fff2d8').lerp(new THREE.Color('#ff7a3a'), h);
}
function fountain(n, pow) { particles(scene, { n, life: 3.6, size: 3.2, color: new THREE.Color(4, 1.4, .25), add: true, g: 16, spawn: () => ({ p: V3((srand() - .5) * 8, 22, (srand() - .5) * 8), v: V3((srand() - .5) * 26, (24 + srand() * 26) * pow, (srand() - .5) * 26), d: srand() * 1.8 }) }); }
const CUT = {
  async intro() { setScene('i'); fixed(V3(205, 9, 60), V3(0, 16, 0), true); cam.k = 1.1; fixed(V3(120, 30, -85), V3(0, 12, 0)); await sleep(3600); orbit(108, 50); await sleep(2200); cam.k = 2.6; },
  async round() { orbit(104, 46); await sleep(500); },
  async overview() { orbit(108, 50); },
  async erupt() {
    setScene('i'); cam.k = 2; fixed(V3(60, 20, 46), V3(0, 27, 0)); await sleep(900);
    cam.shake = 1.4; fountain(380, 1); particles(scene, { n: 60, life: 2.6, size: 6, color: '#2a2220', g: -3, spawn: () => ({ p: V3((srand() - .5) * 8, 23, (srand() - .5) * 8), v: V3((srand() - .5) * 8, 10 + srand() * 12, (srand() - .5) * 8), d: srand() }) });
    setLavaTiles(true);
    await tween(2600, k => { setMood(k); cam.shake = Math.max(cam.shake, .5 * (1 - k)); });
    fountain(260, .8); cam.shake = .8; fixed(V3(96, 44, -70), V3(0, 14, 0)); await sleep(2400); cam.k = 2.6;
  },
  async cool() { orbit(104, 48); await tween(2400, k => setMood(1 - k)); setLavaTiles(false); },
  async quake() { orbit(100, 44); cam.shake = 2.2; await sleep(1500); },
  async lava({ pi }) { const p = pawnPos(pi); particles(scene, { n: 50, life: 1.1, size: 1, color: new THREE.Color(4, 1.3, .2), add: true, g: 9, spawn: () => ({ p: p.clone().add(V3(0, .3, 0)), v: V3((srand() - .5) * 5, 3 + srand() * 6, (srand() - .5) * 5) }) }); const f = pawns[pi].userData.fig; await tween(900, k => { f.position.y = Math.abs(Math.sin(k * 12)) * .7 * (1 - k); f.rotation.y += .4; }); f.position.y = 0; },
  async amulet({ pi }) { const p = pawnPos(pi); particles(scene, { n: 70, life: 1.3, size: .8, color: new THREE.Color(.6, 2.6, 3), add: true, spawn: () => ({ p: p.clone().add(V3(0, 1.4, 0)), v: rv(7) }), drag: 1.5 }); await sleep(1500); },
  async fall({ pi }) {
    const g = pawns[pi], t = tiles[players()[pi].pos], p = g.position.clone(); g.userData.busy = true; cam.mode = 'fixed'; cam.tp.copy(p).add(V3(0, 9, 0)).addScaledVector(V3(p.x, 0, p.z).normalize(), 9); cam.tl.copy(p);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000' })); hole.position.copy(t.position).add(V3(0, .26, 0)); hole.scale.setScalar(.01); scene.add(hole);
    const glow = new THREE.PointLight('#ff4a10', 0, 14); glow.position.copy(t.position).add(V3(0, 1, 0)); scene.add(glow);
    cam.shake = .5; await tween(700, k => { hole.scale.setScalar(k); glow.intensity = k * 160; t.position.x += Math.sin(k * 60) * .01; g.userData.fig.rotation.z = Math.sin(k * 30) * .15; });
    await tween(350, k => { g.position.y = p.y + Math.sin(k * Math.PI) * 1.2; }, lin);
    await tween(700, k => { g.position.y = p.y - k * k * 7; g.scale.setScalar(1 - k * .7); g.userData.fig.rotation.z += .3; g.position.x = lerp(p.x, t.position.x, k); g.position.z = lerp(p.z, t.position.z, k); }, lin);
    g.visible = false; particles(scene, { n: 40, life: 1, size: .9, color: new THREE.Color(4, 1.3, .2), add: true, g: 8, spawn: () => ({ p: t.position.clone(), v: V3((srand() - .5) * 4, 5 + srand() * 5, (srand() - .5) * 4) }) });
    await tween(500, k => { hole.scale.setScalar(1 - k); glow.intensity = (1 - k) * 160; }); scene.remove(hole, glow); g.userData.busy = false; g.scale.setScalar(1); g.userData.fig.rotation.z = 0;
  },
  async fallIn({ pi }) {
    syncAll(); const g = pawns[pi], b = g.position.clone(); g.userData.busy = true; g.visible = true; setScene('v');
    fixed(V3(-b.x * .55, b.y + 4, -b.z * .55), V3(b.x, b.y + 9, b.z), true); cam.tl.set(b.x, b.y + 1, b.z);
    await tween(1300, k => { g.position.y = b.y + 34 * (1 - k * k); g.userData.fig.rotation.x += .25; }, lin);
    g.userData.fig.rotation.x = 0; cam.shake = .5; dust(b, inScene, 26, '#7a655a'); await tween(400, k => { g.userData.fig.scale.set(1 + Math.sin(k * 3.14) * .3, 1 - Math.sin(k * 3.14) * .4, 1 + Math.sin(k * 3.14) * .3); });
    g.userData.busy = false; cam.mode = 'follow'; cam.who = pi; await sleep(900);
  },
  async geyser({ pi }) {
    const g = pawns[pi], p = g.position.clone(); g.userData.busy = true; cam.mode = 'fixed'; cam.tp.set(-p.x * .5, p.y + 3, -p.z * .5); cam.tl.set(p.x, p.y + 4, p.z);
    particles(inScene, { n: 160, life: 1.6, size: 1.6, color: '#e8f6ff', spawn: () => ({ p: p.clone().add(V3((srand() - .5) * .8, 0, (srand() - .5) * .8)), v: V3((srand() - .5) * 2, 14 + srand() * 16, (srand() - .5) * 2), d: srand() * .9 }), g: 6 });
    await tween(500, k => { g.position.x = p.x + Math.sin(k * 50) * .06; }); cam.shake = .4;
    await tween(1000, k => { g.position.y = p.y + k * k * 46; g.userData.fig.rotation.y += .5; cam.tl.y = p.y + 4 + k * 14; }, lin);
    g.visible = false; g.userData.busy = false;
  },
  async exit({ pi }) {
    const g = pawns[pi], p = g.position.clone(), d = T.door.position; g.userData.busy = true; cam.mode = 'fixed'; cam.tp.set(-p.x * .2, p.y + 5, -p.z * .2); cam.tl.copy(d);
    g.userData.fig.rotation.y = Math.atan2(d.x - p.x, d.z - p.z);
    await tween(1300, k => { g.position.lerpVectors(p, V3(d.x, p.y, d.z), k); g.position.y = p.y + Math.abs(Math.sin(k * 12)) * .35; g.scale.setScalar(1 - k * .3); }, lin);
    g.visible = false; g.scale.setScalar(1); g.userData.busy = false; await sleep(250);
  },
  async backOut({ pi, how }) {
    const P = players()[pi]; syncAll(); const g = pawns[pi], b = g.position.clone(); setScene('i'); g.userData.busy = true;
    if (how === 'geyser') {
      fixed(V3(b.x * 1.5 + 14, b.y + 16, b.z * 1.5 + 14), V3(0, 30, 0), true); const a = V3(0, 24, 0); g.position.copy(a); g.visible = true;
      particles(scene, { n: 140, life: 2, size: 2.2, color: '#eef8ff', g: 4, spawn: () => ({ p: V3((srand() - .5) * 3, 23, (srand() - .5) * 3), v: V3((srand() - .5) * 4, 14 + srand() * 14, (srand() - .5) * 4), d: srand() * .5 }) });
      await tween(1900, k => { g.position.lerpVectors(a, b, k); g.position.y += Math.sin(k * Math.PI) * 26; g.userData.fig.rotation.x += .22; cam.tl.lerp(g.position, .2); }, lin);
      g.userData.fig.rotation.x = 0; cam.shake = .3; dust(b, scene, 22, '#d8c59a');
    } else {
      lookTile(P.pos, 12, 5); cam.pos.copy(cam.tp); cam.look.copy(cam.tl); g.visible = true; g.scale.setScalar(.01);
      particles(scene, { n: 50, life: 1, size: 1.2, color: '#d8c59a', spawn: () => ({ p: b.clone(), v: V3((srand() - .5) * 5, 1 + srand() * 3, (srand() - .5) * 5) }), drag: 2 });
      await tween(600, k => { g.scale.setScalar(k); g.position.y = b.y + Math.sin(k * Math.PI) * 1.6; });
    }
    g.userData.busy = false; g.scale.setScalar(1); settleOthers(pi); cam.mode = 'follow'; cam.who = pi; await sleep(700);
  },
  async storm({ pi }) {
    const g = pawns[pi], a = g.position.clone(), b = slotOf(pi); g.userData.busy = true; setScene('i');
    const tor = new THREE.Group(), tm = new THREE.MeshStandardMaterial({ color: '#9aa4b0', transparent: true, opacity: .62, side: THREE.DoubleSide, roughness: 1, depthWrite: false });
    for (let i = 0; i < 12; i++) { const r = .5 + i * .42, ring = new THREE.Mesh(new THREE.CylinderGeometry(r + .4, r, 1.1, 14, 1, true), tm); ring.position.y = i * 1.05 + .5; ring.userData = { ph: i * .5 }; tor.add(ring); }
    const out = V3(a.x, 0, a.z).normalize(), start = a.clone().addScaledVector(out, 46); start.y = 0; tor.position.copy(start); scene.add(tor);
    const spin = (dt, t) => { tor.children.forEach(r => { r.rotation.y = t * 9 + r.userData.ph; r.position.x = Math.sin(t * 5 + r.userData.ph) * .35 * (r.position.y / 6); r.position.z = Math.cos(t * 4 + r.userData.ph) * .35 * (r.position.y / 6); }); particles; }; updaters.add(spin);
    cam.mode = 'fixed'; cam.tp.copy(a).addScaledVector(out, 24).add(V3(0, 12, 0)); cam.tl.copy(a).add(V3(0, 4, 0));
    await tween(1900, k => { tor.position.lerpVectors(start, a, k); tor.position.y = Math.max(0, heightAt(tor.position.x, tor.position.z)); cam.shake = .15; }, easeOut);
    dust(a, scene, 40, '#d8c59a');
    const mid = a.clone().lerp(b, .5); cam.tl.copy(mid).add(V3(0, 5, 0)); cam.tp.copy(mid).addScaledVector(V3(mid.x, 0, mid.z).normalize(), 26).add(V3(0, 13, 0));
    await tween(2300, k => { tor.position.lerpVectors(a, b, k); tor.position.y = Math.max(0, heightAt(tor.position.x, tor.position.z)); const h = Math.sin(k * Math.PI) * 7 + 2 * Math.min(1, k * 6) * (1 - k); g.position.set(tor.position.x + Math.cos(k * 40) * 1.2, tor.position.y + 1 + h, tor.position.z + Math.sin(k * 40) * 1.2); g.userData.fig.rotation.y += .6; g.userData.fig.rotation.z = Math.sin(k * 25) * .5; });
    g.position.copy(b); g.userData.fig.rotation.z = 0; g.userData.busy = false; settleOthers(pi); dust(b, scene, 26, '#d8c59a');
    const end = b.clone().addScaledVector(V3(b.x, 0, b.z).normalize(), 50); end.y = 0;
    await tween(1400, k => { tor.position.lerpVectors(b, end, k); tm.opacity = .5 * (1 - k); }, t => t * t); updaters.delete(spin); scene.remove(tor);
  },
  async swap({ a, b }) {
    setScene('i'); const A = pawns[a], B = pawns[b], pa = A.position.clone(), pb = B.position.clone(), ta = slotOf(a), tb = slotOf(b); A.userData.busy = B.userData.busy = true;
    const mid = pa.clone().lerp(pb, .5), o = V3(mid.x, 0, mid.z).normalize(); cam.mode = 'fixed'; const dist = pa.distanceTo(pb); cam.tp.copy(mid).addScaledVector(o, 22 + dist * .7).add(V3(0, 14 + dist * .2, 0)); cam.tl.copy(mid).add(V3(0, 4, 0));
    [pa, pb].forEach(p => particles(scene, { n: 50, life: 1.4, size: .8, color: new THREE.Color(3, 1.2, 2.4), add: true, spawn: () => ({ p: p.clone().add(V3(0, 1, 0)), v: rv(6) }), drag: 1.4 }));
    await sleep(600);
    await tween(1900, k => { A.position.lerpVectors(pa, ta, k); A.position.y += Math.sin(k * Math.PI) * (8 + dist * .15); B.position.lerpVectors(pb, tb, k); B.position.y += Math.sin(k * Math.PI) * (5 + dist * .1); A.userData.fig.rotation.y += .35; B.userData.fig.rotation.y -= .35; });
    A.userData.busy = B.userData.busy = false; dust(ta, scene, 14, '#d8c59a'); dust(tb, scene, 14, '#d8c59a'); await sleep(500);
  },
  async riverIntro() { const A = D.PATH[D.RIVER], B = D.PATH[D.RIVER + 1], M = V3((A.x + B.x) / 2, T.riverY, (A.z + B.z) / 2); setScene('i'); fixed(M.clone().add(V3(RIV.dx * 11, 8.5, RIV.dz * 11)).add(V3(-RIV.dz * 3, 0, RIV.dx * 3)), M.clone().add(V3(0, .6, 0))); await sleep(1700); },
  async river({ pi, side, ok, saved }) {
    const g = pawns[pi], fig = g.userData.fig, st = T.stones[side], home = g.position.clone(); g.userData.busy = true; setScene('i');
    const A = D.PATH[D.RIVER], B = D.PATH[D.RIVER + 1], M = V3((A.x + B.x) / 2, T.riverY, (A.z + B.z) / 2); fixed(M.clone().add(V3(RIV.dx * 11, 8.5, RIV.dz * 11)).add(V3(-RIV.dz * 3, 0, RIV.dx * 3)), M.clone().add(V3(0, .6, 0)));
    const jump = async (to, h) => { const a = g.position.clone(); fig.rotation.y = Math.atan2(to.x - a.x, to.z - a.z); await tween(430, k => { g.position.lerpVectors(a, to, k); g.position.y += Math.sin(k * Math.PI) * (h || 1.3); }, lin); await sleep(230); };
    const top = m => m.position.clone().add(V3(0, .3, 0));
    const bad = ok ? 9 : 1 + Math.floor(Math.random() * 2);
    for (let k = 0; k < 3; k++) {
      await jump(top(st[k])); dust(g.position, scene, 5, '#cfe9f5');
      if (k === bad) {
        const s = st[k]; cam.shake = .35; await tween(300, q => { s.position.y = s.userData.y + Math.sin(q * 40) * .05; });
        particles(scene, { n: 90, life: 1.1, size: .9, color: '#e8f6ff', g: 12, spawn: () => ({ p: s.position.clone().add(V3(0, .2, 0)), v: V3((srand() - .5) * 6, 4 + srand() * 6, (srand() - .5) * 6) }) });
        await tween(450, q => { s.position.y = s.userData.y - q * 1.4; g.position.y = s.position.y + .3; fig.rotation.z = q * 1.2; }, lin);
        if (saved) { await sleep(500); fig.rotation.z = 0; await jump(home, 3); }
        else {
          const a = g.position.clone(); cam.tl.add(V3(RIV.dx * 5, 0, RIV.dz * 5));
          await tween(1900, q => { const al = (a.x * RIV.dx + a.z * RIV.dz) + q * q * 20, c = rivPoint(al); g.position.set(c.x, Math.max(.05, heightAt(c.x, c.z) + .6) + Math.sin(q * 30) * .12 - q * .5, c.z); fig.rotation.y += .35; g.scale.setScalar(1 - q * .5); }, lin);
          g.visible = false; g.scale.setScalar(1);
        }
        fig.rotation.z = 0; setTimeout(() => tween(900, q => { s.position.y = s.userData.y - 1.4 * (1 - q); }), 1500);
        g.userData.busy = false; return;
      }
    }
    await jump(slotPos('i', D.RIVER + 1, 0, 1), 1.5); dust(g.position, scene, 12, '#d8c59a'); g.userData.busy = false; g.userData.idx = D.RIVER + 1; cam.mode = 'follow'; cam.who = pi; await sleep(500);
  },
  async warp({ pi, from, to }) {
    const g = pawns[pi], a = g.position.clone(), b = slotOf(pi), fig = g.userData.fig, col = new THREE.Color(D.WARPCOL[D.ISLAND[from].v] || '#12b8d4').multiplyScalar(3); g.userData.busy = true; setScene('i');
    const sparks = at => particles(scene, { n: 70, life: 1.1, size: .8, color: col, add: true, drag: 1.2, spawn: () => ({ p: at.clone().add(V3(0, 1, 0)), v: V3((srand() - .5) * 5, 2 + srand() * 6, (srand() - .5) * 5) }) });
    lookTile(from, 12, 6); sparks(a);
    await tween(800, k => { g.position.y = a.y + k * 2.2; g.scale.setScalar(1 - k * .95); fig.rotation.y += .5 + k; });
    g.visible = false; lookTile(to, 12, 6); await sleep(900);
    g.position.copy(b); g.position.y = b.y + 2.2; g.visible = true; sparks(b);
    await tween(800, k => { g.position.y = b.y + (1 - k) * 2.2; g.scale.setScalar(.05 + k * .95); fig.rotation.y += 1.5 - k; });
    g.scale.setScalar(1); g.userData.busy = false; g.userData.idx = to; settleOthers(pi); cam.mode = 'follow'; cam.who = pi; await sleep(500);
  },
  async gate({ pi, gi }) { const G = gates[gi], idx = D.GATES[gi], p = D.PATH[idx], o = V3(p.x, 0, p.z).normalize(), pv = D.PATH[idx - 1]; setScene('i'); fixed(V3(pv.x, p.y + 4.5, pv.z).addScaledVector(o, 7).addScaledVector(V3(pv.x - p.x, 0, pv.z - p.z).normalize(), 7), G.g.position.clone().add(V3(0, 3.6, 0))); await sleep(1500); },
  async gateOpen({ gi }) { const G = gates[gi]; G.eyeM.color.setRGB(.3, 2.6, .6); await tween(900, k => { G.bars.position.y = -5 * k; }); await sleep(500); setTimeout(() => { tween(700, k => { G.bars.position.y = -5 * (1 - k); }); G.eyeM.color.setRGB(.2, 1.6, 1.8); }, 4200 * speed); },
  async gateFail({ gi, last }) { const G = gates[gi]; G.eyeM.color.setRGB(3.2, .2, .1); cam.shake = .6; await tween(900, k => { G.face.rotation.z = Math.sin(k * 26) * .1 * (1 - k); }); await sleep(last ? 500 : 900); G.eyeM.color.setRGB(.2, 1.6, 1.8); },
  async summit({ pi }) { const p = D.PATH[D.GOAL]; setScene('i'); fixed(V3(p.x * 2.1, p.y + 6, p.z * 2.1).add(V3(-p.z, 0, p.x).normalize().multiplyScalar(6)), T.temple.position.clone().add(V3(0, 3, 0))); await sleep(1500); },
  async gong() { await tween(1600, k => { T.gong.rotation.x = Math.sin(k * 14) * .5 * (1 - k); }); },
  async win({ rank }) {
    const pi = rank[0], g = pawns[pi]; setScene('i'); if (T.heat > 0) setMood(0), setLavaTiles(false);
    CUT.gong(); const p = D.PATH[D.GOAL]; orbit(26, p.y + 9, V3(p.x, p.y + 2.5, p.z), .35);
    const fw = () => { const c = new THREE.Color().setHSL(srand(), 1, .6).multiplyScalar(3), o = V3(p.x + (srand() - .5) * 30, p.y + 12 + srand() * 12, p.z + (srand() - .5) * 30); particles(scene, { n: 110, life: 1.7, size: 1.1, color: c, add: true, g: 5, drag: 1.2, spawn: () => ({ p: o.clone(), v: rv(1).normalize().multiplyScalar(8 + srand() * 8) }) }); };
    T.fw = setInterval(fw, 420); fw();
    const jump = (dt, t) => { if (g) g.userData.fig.position.y = Math.abs(Math.sin(t * 5)) * 1.3; }; updaters.add(jump); T.winStop = () => { clearInterval(T.fw); updaters.delete(jump); if (g) g.userData.fig.position.y = 0; };
    await sleep(1000);
  },
};
async function cut(name, o) { const f = CUT[name]; if (!f) return; if (name !== 'win' && T.winStop) { T.winStop(); T.winStop = null; } try { await f(o || {}); } catch (e) { console.error('cut ' + name, e); syncAll(); } }

// ---------- arranque e ciclo ----------
function applyQuality() {
  const q = Q[quality]; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr));
  setShadows(); buildWater(); resize();
}
function resize() {
  const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
}
let lastT = 0, time = 0, frames = 0, fpsT = 0, slow = 0;
function frame(now) {
  const rdt = Math.min(.6, (now - lastT) / 1000 || .016), dt = Math.min(.1, rdt); lastT = now; time += dt;
  tick(); updaters.forEach(u => { try { u(dt, time); } catch (e) { console.error(e); updaters.delete(u); } });
  updateCam(rdt);
  if (water) water.material.uniforms.time.value = time * .55; else if (simpleWater) simpleWater.material.normalMap.offset.set(time * .01, time * .006);
  pawns.forEach(g => { const d = camera.position.distanceTo(g.position), k = clamp(d / 24, 1, 4.2); g.userData.lab.scale.set(4.4 * k, 1.1 * k, 1); g.userData.lab.position.y = 3.3 + k * .4; });
  if (Q[quality].bloom) composer.render(); else renderer.render(active, camera);
  frames++; fpsT += dt; if (fpsT > 4) { const fps = frames / fpsT; T.fps = fps; frames = 0; fpsT = 0; if (fps < 21 && !document.hidden) { if (++slow >= 2 && T.autoQ) { slow = 0; if (quality === 'alta') setQuality('media', true); else if (quality === 'media') setQuality('leve', true); } } else slow = 0; }
}
function setQuality(q, auto) { if (!Q[q] || q === quality) return; quality = q; applyQuality(); if (T.onQuality) T.onQuality(q, !!auto); }
async function init(el, o) {
  container = el; players = o.players; quality = Q[o.quality] ? o.quality : 'alta'; T.autoQ = o.autoQ !== false; T.onQuality = o.onQuality;
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .5; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);
  camera = new THREE.PerspectiveCamera(42, 16 / 9, .5, 6000);
  scene = new THREE.Scene(); active = scene; scene.add(camera);
  T.dot = softDot();
  buildSky(); seed = 7; buildTerrain(); buildRiver(); buildShore(); buildBoard(); buildGates(); buildCrater(); buildNature(); buildInterior();
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt); renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .32, .7, 1.7); composer.addPass(bloom); composer.addPass(new OutputPass());
  applyQuality(); setMood(0);
  addEventListener('resize', resize);
  // em ecrãs lentos, dá vez aos temporizadores (rede, bots) entre cada imagem
  const loop = now => { const t0 = performance.now(); frame(now); if (performance.now() - t0 > 34) setTimeout(() => requestAnimationFrame(loop), 14); else requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  // separador escondido: o relógio continua a andar para o jogo não encravar
  setInterval(() => { if (performance.now() - lastTick > 240) tick(); }, 120);
  T.ready = true; syncAll();
}
Object.assign(T, { init, syncAll, hop, flyTo, focus, cut, rollDice, clearDice, orbit, lookTile, setQuality, setLavaTiles, setMood, sleep, setSpeed: s => { speed = s || 1; }, get quality() { return quality; }, debug: { cam, CUT, THREE, get scene() { return scene; }, get camera() { return camera; }, get bloom() { return bloom; }, get renderer() { return renderer; }, get sky() { return sky; }, snap() { if (cam.mode === 'follow') followPose(cam.who); cam.pos.copy(cam.tp); cam.look.copy(cam.tl); }, get water() { return water; }, fixed, V3 } });
window.TV3D = T;
