/* 동화책 3D 그리기 도구 — 모든 세계가 함께 쓴다.
 * three.js 불러오기: public/vendor/three.module.js(오프라인) → 없으면 jsdelivr CDN(r160).
 */
export const T = await (async () => {
  try { return await import('../vendor/three.module.js'); }
  catch (e) { return await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'); }
})();

export const INK_COLOR = '#4a3426';

/** 같은 씨앗이면 같은 무작위(나무 흩뿌리기 등을 다시 해도 같게) */
export function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const gradient = (() => { const t = new T.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, T.RedFormat); t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true; return t; })();
const toonCache = new Map();
/** 3단 그늘 만화 재질 (같은 색은 같이 씀) */
export function toon(color) {
  const k = String(color);
  if (!toonCache.has(k)) toonCache.set(k, new T.MeshToonMaterial({ color, gradientMap: gradient }));
  return toonCache.get(k);
}
export const INK = new T.MeshBasicMaterial({ color: INK_COLOR, side: T.BackSide });

/** 둥근 물체 + 동화책 테두리(뒷면을 조금 키운 외곽선). children[1]이 색 있는 몸 */
export function inked(geo, color, k = 1.07) {
  const g = new T.Group();
  const m = new T.Mesh(geo, toon(color)); m.castShadow = true; m.receiveShadow = true;
  const o = new T.Mesh(geo, INK); o.scale.setScalar(k);
  g.add(o, m);
  return g;
}

/** 종이 오림(두께 있는 모양 + 흰 종이 테두리) */
export function paperCut(shape, color, depth = 0.18) {
  const g = new T.Group();
  const geo = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 18 });
  const m = new T.Mesh(geo, toon(color)); m.castShadow = true; m.receiveShadow = true;
  const edge = new T.Mesh(geo, new T.MeshBasicMaterial({ color: '#fffaf0' }));
  edge.scale.set(1.025, 1.025, 0.9); edge.position.z = -0.04;
  g.add(edge, m);
  return g;
}
export function hillShape(w, h, bumps, seed) {
  const R = rng(seed), s = new T.Shape();
  s.moveTo(-w / 2, 0);
  for (let i = 0; i < bumps; i++) {
    const x0 = -w / 2 + (w * i) / bumps, x1 = -w / 2 + (w * (i + 1)) / bumps;
    s.quadraticCurveTo((x0 + x1) / 2, h * (0.75 + R() * 0.5), x1, i === bumps - 1 ? 0 : h * (0.35 + R() * 0.25));
  }
  s.lineTo(-w / 2, 0);
  return s;
}
export function cloudShape(r) {
  const s = new T.Shape();
  s.moveTo(-2.2 * r, 0);
  s.absarc(-1.3 * r, 0.5 * r, 0.9 * r, Math.PI, Math.PI / 2, true);
  s.absarc(0, 1.0 * r, 1.2 * r, Math.PI * 0.9, Math.PI * 0.1, true);
  s.absarc(1.4 * r, 0.5 * r, 0.9 * r, Math.PI / 2, 0, true);
  s.lineTo(-2.2 * r, 0);
  return s;
}
export function sunShape(r) {
  const s = new T.Shape();
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, rr = i % 2 ? r : r * 1.35; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(rr, 0); }
  return s;
}

/** 글씨 판(앞뒤 두 장 — 뒤에서 봐도 바로 읽힘) */
export function banner(text, w, h, bg, fg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.max(32, Math.round(512 * h / w));
  const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = INK_COLOR; x.lineWidth = 10; x.strokeRect(5, 5, c.width - 10, c.height - 10);
  let size = c.height * 0.55; x.font = `${size}px Jua, sans-serif`;
  while (x.measureText(text).width > c.width - 40 && size > 12) { size -= 4; x.font = `${size}px Jua, sans-serif`; }
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, c.width / 2, c.height * 0.55);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  const g = new T.Group(), mat = new T.MeshLambertMaterial({ map: t });
  const front = new T.Mesh(new T.PlaneGeometry(w, h), mat), back = new T.Mesh(new T.PlaneGeometry(w, h), mat);
  back.rotation.y = Math.PI; g.add(front, back);
  return g;
}

/** 점 목록 [[x,z],…] → 부드러운 곡선 (점이 2개 미만이면 null) */
export function curveOf(points) {
  if (!points || points.length < 2) return null;
  return new T.CatmullRomCurve3(points.map(([x, z]) => new T.Vector3(x, 0, z)), false, 'centripetal');
}
export function normalOf(curve, t) { const d = curve.getTangentAt(Math.min(1, Math.max(0, t))); return new T.Vector3(-d.z, 0, d.x).normalize(); }
export function distToCurve(curve, x, z, n = 160) { let m = 1e9; for (let i = 0; i <= n; i++) { const p = curve.getPointAt(i / n); m = Math.min(m, Math.hypot(p.x - x, p.z - z)); } return m; }
