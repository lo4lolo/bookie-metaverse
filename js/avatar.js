/* 석산 메타버스 — 캐릭터 그리기 엔진 (avatar.js)
 *
 * 2.5등신 치비 캐릭터를 "부품 겹치기"로 그린다. 모든 부품은 벡터라서 어떤 크기에서도 선명하고,
 * 색은 실행 중에 바뀌며(피부·머리·옷 …), 걷기·숨쉬기·표정도 부품을 움직여 만든다.
 *
 * 설계 좌표(design units): x 는 캐릭터 가운데가 0, y 는 머리카락 윗끝이 0, 발바닥이 100.
 * 캔버스는 x -48..48, y -64..106 (모자·지팡이·풍선 자리 포함).
 *
 * 그리는 순서는 z 층(Z)으로 정한다. 부품은 g.z(층, 함수, 공간)로 대기열에 넣고, 마지막에 층 순서대로 그린다.
 *   공간 'w' = 그대로, 'b' = 몸통(숨쉬기·들썩임 따라감), 'h' = 머리(몸통 + 고개 흔들림)
 * 새 아이템은 A.reg(슬롯, 이름, {draw(g){…}}) 로 등록한다. (avatar_hair.js · avatar_wear.js · avatar_gear.js)
 */
(function (root) {
  'use strict';

  const PI = Math.PI, TAU = PI * 2;
  const rad = d => d * PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ------------------------------------------------------------------ 색
  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function rgb2hex(r, g, b) { return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hsl2rgb(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  function mix(a, b, t) {
    const A = hex2rgb(a), B = hex2rgb(b);
    return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }
  function hueToward(h, target, t) { const d = ((target - h + 540) % 360) - 180; return h + d * t; }
  /** 그림체 조정표 — 목표 그림(참고/아바타_목표그림체_09-30.webp)에 맞춘 값. Avatar.tune({...})으로 바꿔 비교한다. */
  const TUNE = {
    head: 0.84,          // 머리(머리카락·모자 포함) 크기. 1 = 예전(약 2.5등신), 0.84 ≈ 3등신
    sat: 0.62,           // 채도 배율 (낮을수록 흙빛)
    warm: 0.10,          // 따뜻한 쪽(주황 30°)으로 색조를 끄는 정도
    lift: 0.02,          // 전체 밝기 보정
    outline: '#4a2c20',  // 겉 외곽선 색 (예전 #2b1a14)
    outlineW: 0.9,       // 겉 외곽선 굵기 (예전 1.2)
    inner: 0.48,         // 안쪽 선이 짙은 갈색에 섞이는 정도 (예전 0.62)
    eye: 'small',        // 'small' = 작은 단순한 눈 · 'big' = 예전 큰 눈
    blush: 0.14,         // 볼 홍조 진하기 (예전 0.36)
  };
  function grade(hex) {
    if (TUNE.sat === 1 && !TUNE.warm && !TUNE.lift) return hex;
    const [h, s, l] = rgb2hsl(...hex2rgb(hex));
    return rgb2hex(...hsl2rgb(hueToward(h, 30, TUNE.warm * s), clamp(s * TUNE.sat, 0, 1), clamp(l + TUNE.lift, 0, 1)));
  }
  const RAMPS = {};
  /** 한 가지 색에서 그림자·밝음·윤곽 색을 뽑는다. 그림자는 푸른 보라 쪽, 밝은 면은 노란 쪽으로 살짝 비튼다. */
  function ramp(hex) {
    let r = RAMPS[hex];
    if (r) return r;
    const src = hex;
    hex = grade(hex);
    const [R, G, B] = hex2rgb(hex), [h, s, l] = rgb2hsl(R, G, B);
    const mk = (dl, ds, ht, target) => rgb2hex(...hsl2rgb(hueToward(h, target, ht), clamp(s * ds, 0, 1), clamp(l + dl, 0.02, 0.98)));
    r = RAMPS[src] = {
      b: hex,
      d: mk(-0.11 - 0.08 * l, 1.08, 0.10, 265),
      d2: mk(-0.23 - 0.10 * l, 1.10, 0.18, 268),
      l: mk(0.07 + 0.08 * (1 - l), 0.96, 0.08, 48),
      h: mk(0.16 + 0.12 * (1 - l), 0.86, 0.12, 52),
      o: mix(hex, '#3a2218', TUNE.inner),
    };
    return r;
  }
  const R_ = c => (typeof c === 'string' ? ramp(c) : c);

  // ------------------------------------------------------------------ 길(Path2D) 도구
  /** 점들을 부드럽게 잇는 닫힌 길. 점의 셋째 값이 1이면 그 점은 뾰족한 모서리. */
  function blob(pts, k) {
    k = k == null ? 1 : k;
    const n = pts.length, at = i => pts[((i % n) + n) % n], p = new Path2D();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) * k / 6, p1[1] + (p2[1] - p0[1]) * k / 6];
      const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) * k / 6, p2[1] - (p3[1] - p1[1]) * k / 6];
      p.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
    }
    p.closePath();
    return p;
  }
  /** 열린 부드러운 선 (머리카락 결, 끈 …) */
  function curve(pts, k) {
    k = k == null ? 1 : k;
    const n = pts.length, at = i => pts[clamp(i, 0, n - 1)], p = new Path2D();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n - 1; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) * k / 6, p1[1] + (p2[1] - p0[1]) * k / 6];
      const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) * k / 6, p2[1] - (p3[1] - p1[1]) * k / 6];
      p.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
    }
    return p;
  }
  /** 오른쪽 절반(위 가운데 → 아래 가운데)만 주면 좌우 대칭 전체 점 목록을 만든다. */
  function sym(half) {
    const left = half.slice(1, -1).map(p => [-p[0], p[1], p[2]]).reverse();
    return half.concat(left);
  }
  function poly(pts) {
    const p = new Path2D();
    pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
    p.closePath();
    return p;
  }
  function ell(cx, cy, rx, ry, rot) { const p = new Path2D(); p.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); return p; }
  function rrect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    const p = new Path2D();
    p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.arcTo(x + w, y, x + w, y + r, r);
    p.lineTo(x + w, y + h - r); p.arcTo(x + w, y + h, x + w - r, y + h, r);
    p.lineTo(x + r, y + h); p.arcTo(x, y + h, x, y + h - r, r);
    p.lineTo(x, y + r); p.arcTo(x, y, x + r, y, r);
    p.closePath();
    return p;
  }
  /** 굵기가 변하는 캡슐 (팔·다리) */
  function capsule(x1, y1, x2, y2, r1, r2) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    if (d < Math.abs(r1 - r2) + 0.01) return ell(r1 > r2 ? x1 : x2, r1 > r2 ? y1 : y2, Math.max(r1, r2), Math.max(r1, r2));
    const a = Math.atan2(dy, dx), f = Math.acos((r1 - r2) / d), p = new Path2D();
    p.moveTo(x1 + r1 * Math.cos(a + f), y1 + r1 * Math.sin(a + f));
    p.lineTo(x2 + r2 * Math.cos(a + f), y2 + r2 * Math.sin(a + f));
    p.arc(x2, y2, r2, a + f, a - f, true);
    p.lineTo(x1 + r1 * Math.cos(a - f), y1 + r1 * Math.sin(a - f));
    p.arc(x1, y1, r1, a - f, a + f, true);
    p.closePath();
    return p;
  }
  /** 길 하나를 옮기고 돌리고 늘려서 새 길로 */
  function xf(path, a, b, c, d, e, f) { const p = new Path2D(); p.addPath(path, { a, b, c, d, e, f }); return p; }
  function mv(path, dx, dy) { return xf(path, 1, 0, 0, 1, dx, dy); }
  function flipX(path) { return xf(path, -1, 0, 0, 1, 0, 0); }
  function rot(path, deg, ox, oy) {
    const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
    return xf(path, c, s, -s, c, ox - c * ox + s * oy, oy - s * ox - c * oy);
  }
  function star(cx, cy, r1, r2, n) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) { const a = -PI / 2 + i * PI / n, r = i % 2 ? r2 : r1; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return poly(pts);
  }

  // ------------------------------------------------------------------ 칠하기 도구
  let LW = 1;         // 선 굵기 배율 (도트 버전에서 키운다)
  let PIX = false;    // 도트 버전을 그리는 중이면 눈 반짝이 등을 키운다
  const SD = [2.1, 2.7];   // 그림자 어긋남 (왼쪽 위에서 빛이 온다)
  const HD = [1.1, 1.3];   // 밝은 테두리 어긋남
  /** 길 안쪽에서 (path − 옮긴 path) 만큼만 칠한다 = 초승달 모양 명암 */
  function crescent(ctx, path, dx, dy, color) {
    const c = new Path2D();
    c.rect(-400, -400, 900, 900);
    c.addPath(path, { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy });
    ctx.save();
    ctx.clip(c, 'evenodd');
    ctx.fillStyle = color;
    ctx.fill(path);
    ctx.restore();
  }
  /** 한 부품: 바탕색 → 아래오른쪽 그림자 → 위왼쪽 밝은 테두리 → 얇은 윤곽선 */
  function part(ctx, path, base, o) {
    o = o || {};
    const R = R_(base);
    ctx.save();
    ctx.fillStyle = R.b;
    ctx.fill(path);
    if (o.shade !== false) {
      const sd = o.sd || SD;
      crescent(ctx, path, -sd[0], -sd[1], o.dark ? R.d2 : R.d);
      if (o.hi !== false) { const hd = o.hd || HD; crescent(ctx, path, hd[0], hd[1], R.l); }
    }
    if (o.line !== false) {
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.lineWidth = (o.lw || 1) * LW;
      ctx.strokeStyle = o.line || R.o;
      ctx.stroke(path);
    }
    ctx.restore();
  }
  function stroke(ctx, path, color, w, cap) {
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = cap || 'round';
    ctx.lineWidth = (w || 1) * LW; ctx.strokeStyle = color;
    ctx.stroke(path);
    ctx.restore();
  }
  function fill(ctx, path, color, alpha) {
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill(path);
    ctx.restore();
  }
  /** path 안쪽에만 그리기 */
  function inside(ctx, path, fn) { ctx.save(); ctx.clip(path); fn(); ctx.restore(); }

  // ------------------------------------------------------------------ 아이템 등록
  const SLOTS = ['hair', 'top', 'bottom', 'shoes', 'head', 'hand', 'back'];
  const DEFS = {};
  SLOTS.forEach(s => (DEFS[s] = {}));
  function reg(slot, name, def) { DEFS[slot][name] = def; return def; }
  function defOf(slot, id) {
    const name = id ? String(id).slice(slot.length + 1) : 'none';
    return DEFS[slot][name] || DEFS[slot].none || null;
  }

  // ------------------------------------------------------------------ 층
  const Z = {
    GROUND: 0, BACKITEM: 10, HAIRBACK: 15, HATBACK: 17, HANDBEHIND: 19,
    LEGSKIN: 20, PANTS: 30, BOOTS: 35, TORSO: 40, TOP: 45, BELT: 47, ARMFAR: 48, BACKFRONT: 52, ARM: 55, SLEEVE: 56, HAND: 58,
    HEAD: 60, FACE: 65, HAIRFRONT: 70, HAT: 80, HATFRONT: 82, HANDFRONT: 90, FX: 95,
  };

  // ------------------------------------------------------------------ 자세
  /** frame: 0 서기 · 1 왼발(화면 왼쪽)·2 오른발 걸음 · 3 지나가는 순간 · 4 숨쉬기 */
  function poseFor(dir, frame) {
    const P = { bob: 0, headDy: 0, roll: 0, sway: 0, arm: [0, 0], armAng: [0, 0], leg: [{ dx: 0, lift: 0 }, { dx: 0, lift: 0 }] };
    if (dir === 's') { P.leg = [{ dx: -2.6, lift: 0 }, { dx: 2.8, lift: 0 }]; P.armAng = [6, -6]; }
    if (frame === 4) { P.bob = 0.9; P.headDy = 0.35; P.arm = [0.5, 0.5]; }
    if (dir === 's') {
      // leg[0] = 뒷다리(먼 쪽), leg[1] = 앞다리(가까운 쪽)  armAng[0] = 먼 팔, armAng[1] = 가까운 팔 (도)
      if (frame === 1) { P.bob = 0.4; P.leg = [{ dx: -6.5, lift: -3.4 }, { dx: 7, lift: 0 }]; P.armAng = [28, -30]; P.roll = 1.2; P.sway = 1; }
      else if (frame === 2) { P.bob = 0.4; P.leg = [{ dx: 7, lift: 0 }, { dx: -6.5, lift: -3.4 }]; P.armAng = [-30, 28]; P.roll = 1.2; P.sway = -1; }
      else if (frame === 3) { P.bob = -1.7; P.leg = [{ dx: 0.5, lift: -1 }, { dx: -0.5, lift: -4.2 }]; P.armAng = [4, -4]; P.sway = 0; }
      else if (frame === 4) { P.armAng = [7, -7]; }
    } else {
      if (frame === 1) { P.bob = 0.3; P.leg = [{ dx: 0, lift: -4.6 }, { dx: 0, lift: 0 }]; P.arm = [1.8, -1.8]; P.roll = -1.6; P.sway = 1; }
      else if (frame === 2) { P.bob = 0.3; P.leg = [{ dx: 0, lift: 0 }, { dx: 0, lift: -4.6 }]; P.arm = [-1.8, 1.8]; P.roll = 1.6; P.sway = -1; }
      else if (frame === 3) { P.bob = -1.9; P.arm = [0, 0]; P.sway = 0; }
    }
    return P;
  }

  // ------------------------------------------------------------------ 몸 뼈대(geo)
  const HEAD_F = sym([[0, 2.4], [9.6, 3.5], [15.9, 9.4], [18.4, 19.2], [17.7, 28], [13.6, 35.4], [7, 39.2], [0, 40.2]]);
  const HEAD_S = [[0, 2.4], [9.3, 3.7], [15.6, 9.6], [18, 18.6], [17.4, 27], [14.4, 33.6], [9.4, 38.3], [2.2, 40.2], [-6.8, 38.8], [-14.8, 33.4], [-19, 24.2], [-18.3, 13.4], [-11.4, 5.6]];

  function buildGeo(dir, P) {
    const g = { dir, P };
    if (dir === 's') {
      g.head = blob(HEAD_S);
      g.torso = blob([[-1.5, 36.2], [5.2, 36.6], [8.6, 40], [9, 47], [8.4, 55], [8.2, 61], [9, 66], [-8.6, 66], [-8.4, 60], [-9.4, 50], [-8, 41]]);
      const sh = [0.5, 41.2];
      const arm = (ang, far) => {
        const L = 19.4, a = rad(ang);
        return { far, j: sh, h: [sh[0] + Math.sin(a) * L, sh[1] + Math.cos(a) * L], r0: 4, r1: 3.4 };
      };
      g.arms = [arm(P.armAng[0], true), arm(P.armAng[1], false)];
      g.legs = [0, 1].map(i => ({ far: i === 0, hip: [0.5, 62], ank: [0.5 + P.leg[i].dx, 84 + P.leg[i].lift], r0: 4.7, r1: 4.1, lift: P.leg[i].lift }));
    } else {
      g.head = blob(HEAD_F);
      g.torso = blob(sym([[0, 36], [6.5, 36.3], [11, 38.7], [12.2, 45], [11.5, 53], [10.8, 60], [11.8, 65.5], [0, 66]]));
      g.arms = [-1, 1].map((s, i) => ({ s, far: false, j: [s * 12.6, 41.4], h: [s * 15.6, 60.8 + P.arm[i]], r0: 4.2, r1: 3.5 }));
      g.legs = [-1, 1].map((s, i) => ({ s, hip: [s * 6.2, 62], ank: [s * 6.6, 84 + P.leg[i].lift], r0: 4.8, r1: 4.2, lift: P.leg[i].lift }));
    }
    return g;
  }

  // ------------------------------------------------------------------ 눈·입
  function irisColors(hairC) {
    const [h, s, l] = rgb2hsl(...hex2rgb(hairC));
    const sat = clamp(s * 0.9 + 0.1, 0.2, 0.62);
    const c = (ll, ss) => rgb2hex(...hsl2rgb(h, ss == null ? sat : ss, ll));
    return { dark: c(0.13, 0.35), mid: c(0.28), light: c(0.46, clamp(sat + 0.05, 0, 0.7)) };
  }
  function eye(ctx, cx, cy, rx, ry, ic, side, expr) {
    const LASH = '#22140f';
    if (expr === 'blink') {
      stroke(ctx, curve([[cx - rx * 1.05, cy], [cx, cy + ry * 0.22], [cx + rx * 1.05, cy]]), LASH, 1.7);
      return;
    }
    if (expr === 'happy') {
      stroke(ctx, curve([[cx - rx * 1.05, cy + ry * 0.35], [cx, cy - ry * 0.55], [cx + rx * 1.05, cy + ry * 0.35]]), LASH, 1.9);
      return;
    }
    if (TUNE.eye === 'small') {
      // 목표 그림체: 작고 단순한 진한 갈색 눈 + 흰 점 하나
      const erx = rx * 0.82, ery = ry * 0.84, ecy = cy + ry * 0.1;
      const sh = ell(cx, ecy, erx, ery);
      fill(ctx, sh, '#2a1811');
      inside(ctx, sh, () => fill(ctx, ell(cx, ecy + ery * 0.55, erx * 0.95, ery * 0.5), ic.dark));
      fill(ctx, ell(cx - erx * 0.28, ecy - ery * 0.38, erx * 0.42 * (PIX ? 1.5 : 1), erx * 0.42 * (PIX ? 1.5 : 1)), '#f6ecdc');
      stroke(ctx, curve([[cx - erx * 1.15, ecy - ery * 0.95], [cx, ecy - ery * 1.18], [cx + erx * 1.15, ecy - ery * 0.95]]), LASH, 1.0);
      return;
    }
    const shape = ell(cx, cy, rx, ry);
    fill(ctx, shape, '#24160f');
    inside(ctx, shape, () => {
      const g = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
      g.addColorStop(0, ic.dark); g.addColorStop(0.45, ic.mid); g.addColorStop(1, ic.light);
      ctx.fillStyle = g;
      ctx.fill(ell(cx, cy + ry * 0.14, rx * 0.92, ry * 0.86));
      fill(ctx, ell(cx, cy - ry * 0.05, rx * 0.5, ry * 0.5), '#1c110c');
    });
    // 반짝이
    const hk = PIX ? 1.5 : 1;
    fill(ctx, ell(cx - rx * 0.34, cy - ry * 0.4, rx * 0.5 * hk, rx * 0.5 * hk), '#ffffff');
    if (!PIX) fill(ctx, ell(cx + rx * 0.38, cy + ry * 0.42, rx * 0.24, rx * 0.24), '#ffffff', 0.9);
    // 윗 속눈썹 선
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineWidth = 1.5 * LW; ctx.strokeStyle = LASH;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx + 0.15, ry + 0.15, 0, PI * 1.02, PI * 1.98); ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx + side * rx * 0.85, cy - ry * 0.78); ctx.lineTo(cx + side * (rx + 1.3), cy - ry * 0.98); ctx.stroke();
    ctx.restore();
  }
  function mouth(ctx, x, y, expr, s) {
    const M = '#8a3f37';
    if (expr === 'happy') {
      const p = blob([[x - 3.4, y - 0.6, 1], [x + 3.4, y - 0.6, 1], [x + 2.2, y + 2.6], [x, y + 3.6], [x - 2.2, y + 2.6]], 1);
      fill(ctx, p, '#7d2d30');
      inside(ctx, p, () => fill(ctx, ell(x, y + 3.4, 2.1, 1.3), '#e8867f'));
      stroke(ctx, p, '#5a1f22', 0.9);
    } else if (expr === 'wow') {
      const p = ell(x, y + 1.2, 1.5, 2.1);
      fill(ctx, p, '#7d2d30'); stroke(ctx, p, '#5a1f22', 0.8);
    } else if (expr === 'sad') {
      stroke(ctx, curve([[x - 2.2, y + 1.4], [x, y - 0.1], [x + 2.2, y + 1.4]]), M, 1.1);
    } else {
      stroke(ctx, curve([[x - 2.3, y], [x - 1, y + 1.3], [x, y + 1.5], [x + 1, y + 1.3], [x + 2.3, y]]), M, 1.1);
    }
  }
  function face(g, ctx) {
    const ic = irisColors(g.L.hairC), e = g.expr, dir = g.dir;
    if (dir === 's') {
      eye(ctx, 8.2, 28.2, 3.3, 4.9, ic, 1, e);
      eye(ctx, 15.6, 28.2, 2.1, 4.6, ic, 1, e);
      fill(ctx, ell(11.6, 34.4, 2.6, 1.5), '#f0857c', TUNE.blush);
      mouth(ctx, 12.8, 35.3, e, 1);
    } else {
      eye(ctx, -8.6, 28.2, 3.3, 4.9, ic, -1, e);
      eye(ctx, 8.6, 28.2, 3.3, 4.9, ic, 1, e);
      fill(ctx, ell(-13.2, 34, 2.7, 1.5), '#f0857c', TUNE.blush);
      fill(ctx, ell(13.2, 34, 2.7, 1.5), '#f0857c', TUNE.blush);
      mouth(ctx, 0, 35.2, e, 1);
    }
  }

  // ------------------------------------------------------------------ 그리기 대기열(g)
  class G {
    constructor(ctx, L, dir, frame, expr) {
      this.ctx = ctx; this.L = L; this.dir = dir; this.frame = frame; this.expr = expr || 'n';
      this.P = poseFor(dir, frame);
      this.geo = buildGeo(dir, this.P);
      Object.assign(this, this.geo);
      this.q = []; this.flags = {}; this.skin = ramp(L.skin);
      this.top = 0;    // 가장 위로 튀어나온 y (모자 등) — 이름표 위치
    }
    z(layer, fn, space) { this.q.push({ layer, fn, space: space || 'w', i: this.q.length, slot: this.slot }); }
    run() {
      const ctx = this.ctx, P = this.P;
      this.q.sort((a, b) => a.layer - b.layer || a.i - b.i);
      this.slot = null;
    for (const it of this.q) {
        ctx.save();
        const headish = it.space === 'h' || it.slot === 'hair' || it.slot === 'head';
        if (it.space !== 'w') {
          ctx.translate(0, P.bob);
          if (it.space === 'h') {
            ctx.translate(0, 38 + P.headDy);
            ctx.rotate(rad(P.roll));
            ctx.translate(0, -38);
          }
        }
        if (headish && TUNE.head !== 1) { ctx.translate(0, 38); ctx.scale(TUNE.head, TUNE.head); ctx.translate(0, -38); }
        it.fn(ctx);
        ctx.restore();
      }
    }
    // 아이템이 쓰는 도우미
    part(path, color, o) { part(this.ctx, path, color, o); }
    /** 팔 위의 점 (t=0 어깨, t=1 손) */
    armAt(a, t) { return [a.j[0] + (a.h[0] - a.j[0]) * t, a.j[1] + (a.h[1] - a.j[1]) * t]; }
    /** 어깨에서 t 지점까지 덮는 소매 길 */
    sleevePath(a, t, grow) {
      const p = this.armAt(a, t), gr = grow == null ? 0.9 : grow;
      return capsule(a.j[0], a.j[1], p[0], p[1], a.r0 + gr, a.r0 + (a.r1 - a.r0) * t + gr);
    }
    /** 옆모습에서 긴 물건을 들 때 가까운 팔을 앞으로 뻗는다 (deg: 아래 = 0, 앞 = +) */
    holdPose(deg) {
      if (this.dir !== 's') return;
      const a = this.arms[1], L = 19.4, r = rad(deg + this.P.armAng[1] * 0.2);
      a.h = [a.j[0] + Math.sin(r) * L, a.j[1] + Math.cos(r) * L];
    }
    get handPoint() {
      // 손 아이템을 쥐는 손 (앞 = 화면 오른쪽 손, 뒤 = 화면 왼쪽 손, 옆 = 가까운 팔)
      if (this.dir === 's') return this.arms[1].h;
      return this.dir === 'b' ? this.arms[0].h : this.arms[1].h;
    }
    get handArm() { return this.dir === 's' ? this.arms[1] : (this.dir === 'b' ? this.arms[0] : this.arms[1]); }
  }

  // ------------------------------------------------------------------ 기본 몸 그리기
  function drawBody(g) {
    const { dir, P, L } = g, skin = g.skin, back = dir === 'b';
    // 다리 (맨살)
    g.legs.forEach(l => g.z(Z.LEGSKIN, ctx => part(ctx, capsule(l.hip[0], l.hip[1], l.ank[0], l.ank[1] - 2, l.r0, l.r1), l.far ? mix(L.skin, '#7a5a5a', 0.16) : L.skin, { hi: false })));
    // 몸통 (맨살) + 목
    g.z(Z.TORSO, ctx => {
      part(ctx, g.torso, L.skin, { sd: [2.6, 3.2] });
    }, 'b');
    g.z(Z.HEAD - 1, ctx => {
      part(ctx, rrect(dir === 's' ? -3.4 : -4.6, 33, dir === 's' ? 8 : 9.2, 8, 3), mix(L.skin, '#7a5a5a', 0.12), { hi: false });
    }, 'b');
    // 팔 (맨살) + 손
    g.arms.forEach(a => {
      g.z(a.far ? Z.ARMFAR : Z.ARM, ctx => part(ctx, capsule(a.j[0], a.j[1], a.h[0], a.h[1], a.r0, a.r1), a.far ? mix(L.skin, '#7a5a5a', 0.16) : L.skin, { hi: false }), 'b');
      g.z(a.far ? Z.ARMFAR + 0.2 : Z.HAND, ctx => part(ctx, ell(a.h[0], a.h[1] + 1.2, 3.7, 3.7), a.far ? mix(L.skin, '#7a5a5a', 0.16) : L.skin, { hi: false }), 'b');
    });
    // 머리 (맨살 + 귀)
    g.z(Z.HEAD, ctx => {
      if (dir === 's') {
        part(ctx, ell(-3.6, 27.2, 2.8, 3.6), L.skin, { hi: false });
      } else {
        part(ctx, ell(-18.6, 27.5, 2.6, 3.4), L.skin, { hi: false });
        part(ctx, ell(18.6, 27.5, 2.6, 3.4), L.skin, { hi: false });
      }
      part(ctx, g.head, L.skin, { sd: [2.6, 3.4], hd: [1.4, 1.6] });
    }, 'h');
    if (!back) g.z(Z.FACE, ctx => face(g, ctx), 'h');
  }

  // ------------------------------------------------------------------ 겉 윤곽선
  function withOutline(src, w, color) {
    const W = src.width, H = src.height;
    const sil = document.createElement('canvas'); sil.width = W; sil.height = H;
    const sc = sil.getContext('2d');
    sc.drawImage(src, 0, 0);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = color; sc.fillRect(0, 0, W, H);
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const c = out.getContext('2d');
    const n = w > 2.2 ? 16 : 8;
    for (let i = 0; i < n; i++) { const a = i * TAU / n; c.drawImage(sil, Math.cos(a) * w, Math.sin(a) * w); }
    c.drawImage(src, 0, 0);
    return out;
  }

  // ------------------------------------------------------------------ 모습 합치기
  const DEFAULT = {
    skin: '#F3D2B3', hair: 'hair_short', hairC: '#765849', top: 'top_tee', topC: '#8FB9D4', bottom: 'bottom_pants', botC: '#526D89',
    shoes: 'shoes_sneakers', shoeC: '#765849', head: 'head_none', headC: '#C97B5D', hand: 'hand_none', back: 'back_none', backC: '#B4483C',
  };
  const fullLook = L => Object.assign({}, DEFAULT, L || {});
  function lookKey(L) {
    return [L.skin, L.hair, L.hairC, L.top, L.topC, L.bottom, L.botC, L.shoes, L.shoeC, L.head, L.headC, L.hand, L.back, L.backC].join(',');
  }

  const BOX = { x0: -48, x1: 48, y0: -64, y1: 106 };
  /** 부품을 겹쳐 그린다 (윤곽선·그림자 전). d = 'f' | 's' | 'b' */
  function paintLayers(L, d, frame, k, expr) {
    const W = Math.ceil((BOX.x1 - BOX.x0) * k), H = Math.ceil((BOX.y1 - BOX.y0) * k);
    const work = document.createElement('canvas'); work.width = W; work.height = H;
    const ctx = work.getContext('2d');
    ctx.setTransform(k, 0, 0, k, -BOX.x0 * k, -BOX.y0 * k);
    const g = new G(ctx, L, d, frame || 0, expr);
    // 아이템 대기열 넣기 (손 → 모자 → 옷 → … → 머리카락 순서: 앞의 것이 뒤의 것에게 표시를 남긴다)
    const order = ['hand', 'head', 'top', 'bottom', 'shoes', 'back', 'hair'];
    drawBody(g);
    for (const slot of order) {
      const def = defOf(slot, L[slot]);
      if (def && def.draw) { g.slot = slot; def.draw(g, L[{ head: 'headC', top: 'topC', bottom: 'botC', shoes: 'shoeC', back: 'backC', hair: 'hairC' }[slot]]); if (def.top != null) g.top = Math.min(g.top, def.top); }
    }
    g.run();
    return { work, g, W, H };
  }
  /** 한 장을 그려서 캔버스로 돌려준다. k = 설계 1칸당 화면 픽셀 */
  function renderSprite(L, dir, frame, k, expr) {
    L = fullLook(L);
    const flip = dir === 1;
    const d = dir === 3 ? 'b' : dir === 0 ? 'f' : 's';
    const { work, g, W, H } = paintLayers(L, d, frame, k, expr);
    const ow = Math.max(1, TUNE.outlineW * k);
    const shaded = withOutline(work, ow, TUNE.outline);
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const oc = out.getContext('2d');
    oc.setTransform(k, 0, 0, k, -BOX.x0 * k, -BOX.y0 * k);
    // 바닥 그림자 (윤곽선 밖)
    const lift = Math.min(0, ...g.legs.map(l => l.lift)) * -0.25;
    fill(oc, ell(0, 99.4, 17.5 - lift, 4.8 - lift * 0.3), '#3a2419', 0.13);
    fill(oc, ell(0, 99.4, 13.5 - lift, 3.5 - lift * 0.3), '#3a2419', 0.2);
    oc.setTransform(1, 0, 0, 1, 0, 0);
    if (flip) { oc.translate(W, 0); oc.scale(-1, 1); }
    oc.drawImage(shaded, 0, 0);
    out.ax = -BOX.x0 * k;                 // 발 가운데 x
    out.ay = (100 - BOX.y0) * k;          // 발바닥 y
    out.tagY = (Math.min(0, g.top) - BOX.y0) * k;   // 머리(모자) 맨 위
    out.k = k;
    return out;
  }

  /** 도트 버전: 크게 그린 뒤 한 칸(OV×OV)마다 가장 많은 색만 남기고, 도트 단위로 외곽선과 그림자를 다시 두른다.
   *  hp = 몸 100칸이 차지하는 도트 수. 돌려주는 캔버스는 도트 1개 = 캔버스 1픽셀. */
  function renderPixel(L, dir, frame, hp, expr) {
    L = fullLook(L);
    const d = dir === 3 ? 'b' : dir === 0 ? 'f' : 's';
    const OV = 6, k = hp / 100 * OV;
    LW = 2.0; PIX = true;
    let pl;
    try { pl = paintLayers(L, d, frame, k, expr); } finally { LW = 1; PIX = false; }
    const { work, g, W, H } = pl;
    const w = Math.ceil(W / OV), h = Math.ceil(H / OV);
    const data = work.getContext('2d').getImageData(0, 0, W, H).data;
    const grid = new Uint32Array(w * h);          // 0 = 투명, 아니면 0xFF000000 | rgb
    const counts = new Map();
    for (let by = 0; by < h; by++) for (let bx = 0; bx < w; bx++) {
      counts.clear();
      let opaque = 0, total = 0;
      for (let y = by * OV; y < Math.min(H, by * OV + OV); y++) for (let x = bx * OV; x < Math.min(W, bx * OV + OV); x++) {
        total++;
        const i = (y * W + x) * 4;
        if (data[i + 3] < 140) continue;
        opaque++;
        const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      if (opaque * 2 < total) continue;
      let best = 0, bn = 0;
      for (const [kk, n] of counts) if (n > bn) { best = kk; bn = n; }
      grid[by * w + bx] = 0xFF000000 | ((best & 255) << 16) | (best & 0xFF00) | (best >> 16);   // ABGR
    }
    // 겉 윤곽선 1도트
    const oc0 = hex2rgb(TUNE.outline);
    const outlineColor = (0xFF000000 | (oc0[2] << 16) | (oc0[1] << 8) | oc0[0]) >>> 0;   // TUNE.outline (ABGR)
    const res = new Uint32Array(grid);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (grid[y * w + x]) continue;
      if ((x > 0 && grid[y * w + x - 1]) || (x < w - 1 && grid[y * w + x + 1]) || (y > 0 && grid[(y - 1) * w + x]) || (y < h - 1 && grid[(y + 1) * w + x])) res[y * w + x] = outlineColor;
    }
    // 바닥 그림자 (반투명 타원)
    const u = hp / 100, cx = -BOX.x0 * u, cy = (99.4 - BOX.y0) * u, rx = 16.5 * u, ry = 4.2 * u;
    const sh = 0x38000000 | (0x19 << 16) | (0x24 << 8) | 0x3a;   // alpha 56, #3a2419
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (res[y * w + x]) continue;
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) res[y * w + x] = sh;
    }
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const oc = out.getContext('2d');
    const img = oc.createImageData(w, h);
    new Uint32Array(img.data.buffer).set(res);
    oc.putImageData(img, 0, 0);
    out.ax = -BOX.x0 * u; out.ay = (100 - BOX.y0) * u; out.tagY = (Math.min(0, g.top) - BOX.y0) * u; out.k = u;
    return out;
  }

  // ------------------------------------------------------------------ 바깥에서 쓰는 함수
  const SCALE = 0.0165;      // 타일 한 칸(S)당 설계 1칸의 화면 크기: 캐릭터 키가 타일의 약 1.65칸
  const cache = new Map();   // 최근에 쓴 것이 뒤로 가는 LRU
  let cacheBytes = 0;
  const CACHE_LIMIT = 90 * 1024 * 1024;
  function remember(key, cv) {
    cache.set(key, cv);
    cacheBytes += cv.width * cv.height * 4;
    for (const [k0, v0] of cache) {
      if (cacheBytes <= CACHE_LIMIT) break;
      cache.delete(k0); cacheBytes -= v0.width * v0.height * 4;
    }
    return cv;
  }
  function recall(key) {
    const cv = cache.get(key);
    if (cv) { cache.delete(key); cache.set(key, cv); }
    return cv;
  }
  function flipped(src) {
    const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
    const c = cv.getContext('2d'); c.translate(src.width, 0); c.scale(-1, 1); c.drawImage(src, 0, 0);
    cv.ax = src.ax; cv.ay = src.ay; cv.tagY = src.tagY; cv.k = src.k;
    return cv;
  }
  /** 그림체: 'smooth'(부드러운 벡터, 기본) · 'pixel'(도트). 바꾸면 새로 그려진다. */
  let STYLE = 'smooth';
  try { STYLE = localStorage.getItem('seoksan-avatar-style') === 'pixel' ? 'pixel' : 'smooth'; } catch (e) { /* 저장소 없음 */ }
  function setStyle(st) {
    STYLE = st === 'pixel' ? 'pixel' : 'smooth';
    try { localStorage.setItem('seoksan-avatar-style', STYLE); } catch (e) { /* 저장소 없음 */ }
    cache.clear(); cacheBytes = 0;
  }
  /** 도트 버전을 화면 크기에 맞게 정수 배로 키운 캔버스 (k: 설계 1칸당 화면 픽셀) */
  function pixelUpscaled(L, dir, frame, k, expr) {
    const target = k * 100;                                   // 몸 100칸의 화면 높이(px)
    const f = Math.max(1, Math.round(target / 72));            // 도트 하나의 화면 크기
    const hp = Math.max(24, Math.round(target / f));           // 몸 100칸이 차지하는 도트 수
    const px = renderPixel(L, dir === 1 ? 2 : dir, frame, hp, expr);
    const cv = document.createElement('canvas'); cv.width = px.width * f; cv.height = px.height * f;
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    if (dir === 1) { c.translate(cv.width, 0); c.scale(-1, 1); }
    c.drawImage(px, 0, 0, cv.width, cv.height);
    cv.ax = px.ax * f; cv.ay = px.ay * f; cv.tagY = px.tagY * f; cv.k = k;
    return cv;
  }
  /** 캐시를 거쳐 한 장 얻기. 부드러운 그림체의 왼쪽(1)은 오른쪽(2)을 뒤집어서 만든다. */
  function get(L, dir, frame, k, expr) {
    const key = `${STYLE}|${lookKey(fullLook(L))}|${dir}|${frame}|${expr || ''}|${Math.round(k * 1000)}`;
    let cv = recall(key);
    if (!cv) {
      if (STYLE === 'pixel') cv = pixelUpscaled(fullLook(L), dir, frame, k, expr);
      else cv = dir === 1 ? flipped(get(L, 2, frame, k, expr)) : renderSprite(L, dir, frame, k, expr);
      remember(key, cv);
    }
    return cv;
  }
  function sprite(L, dir, frame, S, expr) { return get(L, dir, frame, S * SCALE, expr); }
  /** 옷장·프로필용 정사각형 그림. focus: full | head | body | feet | wide */
  function icon(L, size, dir, focus, frame, expr) {
    const F = {
      full: [-36, -8, 72, 112], wide: [-46, -44, 92, 152],
      head: [-32, -12, 64, 66], hat: [-36, -44, 72, 86], body: [-34, 24, 68, 68], feet: [-30, 58, 60, 50],
    }[focus || 'full'];
    const k = size / Math.max(F[2], F[3]);
    const cv = document.createElement('canvas'); cv.width = cv.height = size; cv.className = 'av';
    const src = get(L, dir || 0, frame || 0, k, expr);
    const c = cv.getContext('2d');
    const sx = (F[0] - BOX.x0) * k, sy = (F[1] - BOX.y0) * k, dw = F[2] * k, dh = F[3] * k;
    c.drawImage(src, sx, sy, dw, dh, (size - dw) / 2, (size - dh) / 2, dw, dh);
    return cv;
  }
  /** 캔버스에 곧바로: (x, y) = 발바닥 가운데, k = 설계 1칸당 픽셀 */
  function draw(ctx, L, dir, frame, x, y, k, expr) {
    const cv = get(L, dir, frame, k, expr);
    ctx.drawImage(cv, Math.round(x - cv.ax), Math.round(y - cv.ay));
  }

  root.Avatar = {
    reg, defOf, DEFS, Z, SLOTS, DEFAULT, fullLook, lookKey, BOX,
    sprite, icon, draw, renderSprite, renderPixel, SCALE, setStyle, get style() { return STYLE; },
    TUNE, tune(o) { Object.assign(TUNE, o || {}); for (const k0 in RAMPS) delete RAMPS[k0]; cache.clear(); cacheBytes = 0; return TUNE; },
    // 아이템 파일이 쓰는 도구
    U: { PI, TAU, rad, clamp, mix, ramp, shade: (h, a) => (a < 0 ? mix(h, '#000000', -a) : mix(h, '#ffffff', a)), blob, curve, sym, poly, ell, rrect, capsule, xf, mv, flipX, rot, star, part, stroke, fill, inside, crescent, irisColors, hex2rgb, rgb2hex, rgb2hsl, hsl2rgb },
  };
})(window);
