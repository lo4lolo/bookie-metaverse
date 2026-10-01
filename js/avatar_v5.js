/* 승인 기본형 v5(64×64 도트)를 학생 색으로 칠한다 — 역할 지도(packs/avatar-v5/roles.json) 사용.
 * 승인 PNG의 명암·외곽선·눈은 그대로 두고, 역할마다 "원래 색이 그 역할 평균보다 얼마나 밝은가"를 지켜 새 색을 입힌다.
 * AvatarV5.load(basePath) → Promise.  AvatarV5.canvas(colors) → 64×64 캔버스(발 기준점 32,60).
 */
(function (root) {
  'use strict';
  const ROLES = ['hair', 'skin', 'shirt', 'collar', 'pants', 'shoes', 'eye'];
  const DEFAULTS = {};          // 원래 v5 색(역할 평균) — load 뒤 채워짐
  let base = null, map = null, back = null, backMap = null, eyes = [];

  function hex2rgb(h) { const n = parseInt(h.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function rgb2hex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
    return [h, s, l];
  }
  function hsl2rgb(h, s, l) {
    if (!s) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }

  async function load(path) {
    path = path || '/packs/avatar-v5/';
    const img = new Image();
    await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = path + 'base.png'; });
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
    base = c.getImageData(0, 0, 64, 64);
    map = await fetch(path + 'roles.json').then(r => r.json());
    backMap = map.back ? { roles: map.back } : null;
    if (backMap) {
      const bi = new Image();
      await new Promise((ok, bad) => { bi.onload = ok; bi.onerror = bad; bi.src = path + 'back.png'; });
      const bc = document.createElement('canvas'); bc.width = bc.height = 64; const bx = bc.getContext('2d'); bx.drawImage(bi, 0, 0);
      back = bx.getImageData(0, 0, 64, 64);
    }
    eyes = await fetch(path + 'locked-eyes.json').then(r => r.json()).then(l => l.map(e => [e.x, e.y])).catch(() => []);
    for (const role of ROLES) {
      const pts = map.roles[role] || [];
      let r = 0, g = 0, b = 0;
      for (const [x, y] of pts) { const i = (y * 64 + x) * 4; r += base.data[i]; g += base.data[i + 1]; b += base.data[i + 2]; }
      if (pts.length) DEFAULTS[role] = rgb2hex(r / pts.length, g / pts.length, b / pts.length);
    }
    return DEFAULTS;
  }

  /** colors: {hair:'#..', shirt:'#..', ...} 빠진 역할은 원래 색. view: 'front' | 'back' */
  function recolor(colors, view) {
    if (!base) throw new Error('AvatarV5.load()를 먼저 불러 주세요.');
    const useBack = view === 'back' && back;
    const src = useBack ? back : base, m = useBack ? backMap : map;
    const out = new ImageData(new Uint8ClampedArray(src.data), 64, 64);
    for (const role of ROLES) {
      const want = colors && colors[role];
      if (!want || !/^#[0-9a-fA-F]{6}$/.test(want)) continue;
      const pts = m.roles[role] || [];
      if (!pts.length) continue;
      const [th, ts, tl] = rgb2hsl(...hex2rgb(want));
      const [, ms, ml] = rgb2hsl(...hex2rgb(DEFAULTS[role]));
      for (const [x, y] of pts) {
        const i = (y * 64 + x) * 4;
        const [, s, l] = rgb2hsl(out.data[i], out.data[i + 1], out.data[i + 2]);
        const nl = Math.max(0.04, Math.min(0.97, tl + (l - ml) * 0.9));
        const ns = Math.max(0, Math.min(1, ms > 0.02 ? ts * (s / ms) : ts));
        const [r, g, b] = hsl2rgb(th, ns, nl);
        out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b;
      }
    }
    return out;
  }
  function canvas(colors, view) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    cv.getContext('2d').putImageData(recolor(colors, view), 0, 0);
    return cv;
  }

  // ───── 걷기: 그리지 않고 역할 지도로 다리·팔을 움직인다 ─────
  // 다리 = 46줄 아래(종아리·발), 왼쪽(x<32)·오른쪽. 팔 = 34~44줄, 몸통 바깥(x≤24 / x≥39)의 피부·외곽선.
  // 걷기1: 왼발 1칸 들기 + 오른팔 1칸 앞으로(짧아짐) + 왼팔 1칸 뒤로(길어짐). 걷기2는 좌우 반대.
  const LEG_Y = 46, ARM_Y0 = 34, ARM_Y1 = 44;
  function roleAt(m) { const r = new Map(); for (const [k, pts] of Object.entries(m.roles)) for (const [x, y] of pts) r.set(y * 64 + x, k); return r; }
  function moved(img, roles, side, legUp, armL, armR) {
    const src = img.data, out = new Uint8ClampedArray(src);
    const isLeg = (x, y) => y >= LEG_Y && (side === 'L' ? x < 32 : x >= 32);
    const isArm = (x, y, which) => y >= ARM_Y0 && y <= ARM_Y1 && (which === 'L' ? x <= 24 : x >= 39) && !['pants', 'shoes'].includes(roles.get(y * 64 + x));
    const shift = (pred, dy) => {
      const pts = [];
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (src[(y * 64 + x) * 4 + 3] && pred(x, y)) pts.push([x, y]);
      for (const [x, y] of pts) if (dy < 0) out.fill(0, (y * 64 + x) * 4, (y * 64 + x) * 4 + 4);   // 올리면 아래 끝이 비고
      for (const [x, y] of pts) { const ty = y + dy; if (ty < 0 || ty > 63) continue; const a = (y * 64 + x) * 4, b = (ty * 64 + x) * 4; for (let i = 0; i < 4; i++) out[b + i] = src[a + i]; }   // 내리면 위 끝은 원래 줄이 남아 1칸 길어짐
    };
    if (legUp) shift(isLeg, -1);
    if (armL) shift((x, y) => isArm(x, y, 'L'), armL);
    if (armR) shift((x, y) => isArm(x, y, 'R'), armR);
    return new ImageData(out, 64, 64);
  }
  /** 192×192 시트(가로: 서기·걷기1·걷기2, 세로: 앞·옆·뒤). 옆모습은 아직 없어서 앞모습으로 대신한다. */
  function sheet(colors) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 192;
    const x = cv.getContext('2d');
    const rows = [['front', map], ['front', map], [back ? 'back' : 'front', back ? backMap : map]];
    rows.forEach(([view], r) => walk(recolor(colors, view), view).forEach((d, c) => x.putImageData(d, c * 64, r * 64)));
    return cv;
  }
  /** 서기 그림(ImageData 64×64) → [서기, 걷기1, 걷기2]. 도트 공방에서 고친 그림에도 쓴다(기본 모델 위치가 같아야 맞게 움직임) */
  function walk(img, view) {
    const m = view === 'back' && backMap ? backMap : map, roles = roleAt(m);
    const first = view === 'back' ? 'R' : 'L', second = first === 'L' ? 'R' : 'L';   // 뒷모습은 좌우가 뒤집혀 있음
    const f1 = moved(img, roles, first, true, first === 'L' ? 1 : -1, first === 'L' ? -1 : 1);
    const f2 = moved(img, roles, second, true, second === 'L' ? 1 : -1, second === 'L' ? -1 : 1);
    return [img, f1, f2];
  }

  root.AvatarV5 = { ROLES, DEFAULTS, load, canvas, sheet, walk, recolor, get eyes() { return eyes; }, get hasBack() { return !!back; }, NAMES: { hair: '머리', skin: '피부', shirt: '윗옷', collar: '깃·소매 끝', pants: '바지', shoes: '신발', eye: '눈' } };
})(window);
