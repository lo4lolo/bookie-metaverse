/* 물건 도감 — type 하나 = 그리는 함수 하나.
 * 새 물건 넣기: 아래 LIB에 { name, icon, cat, def:{기본값}, props:[고칠 수 있는 칸], solid:부딪힘 반지름, build(o) } 를 더한다.
 * o: 세계 파일의 물건 한 개 {type, x, z, s(크기), r(회전, 도), color, text, w, h, y, seed, name}
 * build는 원점(0,0,0)에 서 있는 Group을 돌려준다. 자리·회전·크기는 무대가 맞춘다.
 */
import { T, toon, inked, paperCut, hillShape, cloudShape, sunShape, banner, rng } from './art3d.js';

const GREENS = ['#6fae5a', '#86c065', '#5f9e57', '#9ccd6e'];

function roundTree(o, apples) {
  const g = new T.Group();
  const trunk = inked(new T.CylinderGeometry(0.28, 0.4, 2.2, 8), '#9a6a43'); trunk.position.y = 1.1; g.add(trunk);
  const base = o.color || GREENS[0];
  const cols = [base, shade(base, 1.12), shade(base, 0.9), shade(base, 1.25)];
  [[0, 3.1, 0, 1.5], [-0.9, 2.6, 0.3, 1.0], [0.95, 2.7, -0.2, 1.05], [0.2, 3.9, 0.1, 1.0]]
    .forEach(([x, y, z, r], i) => { const p = inked(new T.SphereGeometry(r, 14, 10), cols[i], 1.06); p.position.set(x, y, z); g.add(p); });
  if (apples) for (let i = 0; i < 5; i++) {
    const a = inked(new T.SphereGeometry(0.2, 10, 8), '#e2523f', 1.15), ang = i * 1.25 - 0.6;
    a.position.set(Math.sin(ang) * 1.45, 2.7 + (i % 2) * 0.8, Math.cos(ang) * 1.45); g.add(a);
  }
  return g;
}
/** 색을 밝게(k>1)·어둡게(k<1) */
export function shade(hex, k) {
  const c = new T.Color(hex), h = {}; c.getHSL(h);
  c.setHSL(h.h, h.s, Math.max(0, Math.min(1, h.l * k)));
  return '#' + c.getHexString();
}

export const CATS = ['도서관', '자연', '길·물', '표지', '집·소품', '배경'];

export const LIB = {
  // ───── 도서관 ─────
  bookshelf: {
    name: '책장', icon: '📚', cat: '도서관', def: { s: 1, w: 6, h: 4.2, color: '#8a5a3b', seed: 3 }, props: ['w', 'h', 'r', 'color', 'seed'], solid: 0,
    build(o) {
      const g = new T.Group(), w = o.w || 6, h = o.h || 4.2, d = 1.1, wood = o.color || '#8a5a3b', R = rng(o.seed || 3);
      const back = inked(new T.BoxGeometry(w, h, 0.2), shade(wood, 0.8), 1.02); back.position.set(0, h / 2, -d / 2 + 0.1); g.add(back);
      for (const k of [-1, 1]) { const side = inked(new T.BoxGeometry(0.25, h, d), wood, 1.04); side.position.set(k * (w / 2 - 0.12), h / 2, 0); g.add(side); }
      const rows = Math.max(2, Math.round(h / 1.05));
      const spine = ['#c0563f', '#d59a3a', '#82a35e', '#479b94', '#5d87ab', '#8c6193', '#e9dcc1', '#2f7d4f', '#cf7150', '#f1cd8d'];
      for (let r = 0; r <= rows; r++) {
        const y = (h * r) / rows; const sh = inked(new T.BoxGeometry(w - 0.3, 0.14, d), shade(wood, 1.1), 1.03); sh.position.set(0, y + 0.07, 0); g.add(sh);
        if (r === rows) break;
        let x = -w / 2 + 0.3; const top = (h / rows) * 0.92;
        while (x < w / 2 - 0.45) {
          const bw = 0.16 + R() * 0.16, bh = top * (0.6 + R() * 0.35), tilt = R() < 0.08;
          const b = new T.Mesh(new T.BoxGeometry(bw, bh, d * 0.75), toon(spine[Math.floor(R() * spine.length)]));
          b.position.set(x + bw / 2, y + 0.14 + bh / 2, 0.05); if (tilt) b.rotation.z = 0.18; b.castShadow = true; g.add(b);
          x += bw + 0.03 + (R() < 0.12 ? 0.3 : 0);
        }
      }
      return g;
    },
  },
  readingtable: {
    name: '읽기 탁자', icon: '🪑', cat: '도서관', def: { s: 1, color: '#a8764b' }, props: ['s', 'r', 'color'], solid: 1.2,
    build(o) {
      const g = new T.Group(), wood = o.color || '#a8764b';
      const top = inked(new T.CylinderGeometry(1.4, 1.4, 0.16, 20), wood, 1.04); top.position.y = 1.1; g.add(top);
      const leg = inked(new T.CylinderGeometry(0.16, 0.24, 1.05, 8), shade(wood, 0.8)); leg.position.y = 0.53; g.add(leg);
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; const st = inked(new T.CylinderGeometry(0.42, 0.42, 0.55, 12), '#dfe8d8', 1.06); st.position.set(Math.cos(a) * 1.9, 0.28, Math.sin(a) * 1.9); g.add(st); }
      const book = new T.Mesh(new T.BoxGeometry(0.7, 0.08, 0.5), toon('#f7f4ec')); book.position.set(0.2, 1.22, 0.1); book.rotation.y = 0.4; g.add(book);
      const cov = new T.Mesh(new T.BoxGeometry(0.74, 0.04, 0.54), toon('#2f7d4f')); cov.position.set(0.2, 1.17, 0.1); cov.rotation.y = 0.4; g.add(cov);
      return g;
    },
  },
  lamp: {
    name: '스탠드', icon: '💡', cat: '도서관', def: { s: 1, color: '#f1cd8d' }, props: ['s', 'color'], solid: 0.3,
    build(o) {
      const g = new T.Group();
      const base = inked(new T.CylinderGeometry(0.35, 0.45, 0.15, 12), '#3d2c1d'); base.position.y = 0.08; g.add(base);
      const pole = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.8, 6), toon('#3d2c1d')); pole.position.y = 1.5; g.add(pole);
      const shadeM = inked(new T.CylinderGeometry(0.35, 0.65, 0.6, 14, 1, true), o.color || '#f1cd8d', 1.05); shadeM.position.y = 2.9; g.add(shadeM);
      const glow = new T.Mesh(new T.SphereGeometry(0.9, 14, 10), new T.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.22, depthWrite: false })); glow.position.y = 2.8; g.add(glow);
      return g;
    },
  },
  plant: {
    name: '화분', icon: '🪴', cat: '도서관', def: { s: 1, color: '#6fae5a' }, props: ['s', 'color'], solid: 0.4,
    build(o) {
      const g = new T.Group();
      const pot = inked(new T.CylinderGeometry(0.45, 0.32, 0.7, 12), '#cf7150', 1.06); pot.position.y = 0.35; g.add(pot);
      [[0, 1.2, 0, 0.55], [-0.35, 0.95, 0.15, 0.4], [0.35, 1.0, -0.1, 0.42]].forEach(([x, y, z, r]) => { const l = inked(new T.SphereGeometry(r, 12, 8), o.color || '#6fae5a', 1.08); l.position.set(x, y, z); g.add(l); });
      return g;
    },
  },
  bookgate: {
    name: '책 문(세계로 가는 책)', icon: '📖', cat: '도서관', def: { s: 1, text: '책 제목', color: '#cf7150', world: '' }, props: ['text', 'world', 'color', 'r'], solid: 1.1, gate: true,
    build(o) {
      const g = new T.Group(), col = o.color || '#cf7150', ready = !!o.world;
      const ped = inked(new T.CylinderGeometry(1.1, 1.3, 0.6, 16), '#efeadd', 1.04); ped.position.y = 0.3; g.add(ped);
      // 세워 둔 큰 책(표지 + 종이 두께)
      const cover = inked(new T.BoxGeometry(2.3, 3.0, 0.22), ready ? col : '#c9c2b4', 1.04); cover.position.set(0, 2.15, 0); cover.rotation.x = -0.12; g.add(cover);
      const pages = new T.Mesh(new T.BoxGeometry(2.1, 2.85, 0.24), toon('#fffdf9')); pages.position.set(0.06, 2.15, -0.1); pages.rotation.x = -0.12; g.add(pages);
      const lab = banner(o.text || '', 2.0, 0.62, '#fffdf9', ready ? '#1d3a2a' : '#8a9084'); lab.position.set(0, 2.55, 0.16); lab.rotation.x = -0.12; g.add(lab);
      const badge = banner(ready ? '들어가기' : '준비 중', 1.3, 0.36, ready ? '#1d3a2a' : '#e6e1d4', ready ? '#f2f6ef' : '#8a9084'); badge.position.set(0, 1.45, 0.24); badge.rotation.x = -0.12; g.add(badge);
      if (ready) { const ring = new T.Mesh(new T.RingGeometry(1.5, 1.85, 40), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; ring.userData.pulse = true; g.add(ring); }
      return g;
    },
  },
  tree: { name: '몽글 나무', icon: '🌳', cat: '자연', def: { s: 1, color: '#6fae5a' }, props: ['s', 'r', 'color'], solid: 0.75, build: o => roundTree(o, false) },
  appletree: { name: '사과나무', icon: '🍎', cat: '자연', def: { s: 1.4, color: '#6fae5a' }, props: ['s', 'r', 'color'], solid: 0.75, build: o => roundTree(o, true) },
  pine: {
    name: '뾰족 나무', icon: '🌲', cat: '자연', def: { s: 1, color: '#5f9e57' }, props: ['s', 'r', 'color'], solid: 0.75,
    build(o) {
      const g = new T.Group();
      const trunk = inked(new T.CylinderGeometry(0.28, 0.4, 2.2, 8), '#9a6a43'); trunk.position.y = 1.1; g.add(trunk);
      for (let i = 0; i < 3; i++) { const c = inked(new T.ConeGeometry(1.6 - i * 0.35, 1.9, 10), shade(o.color || '#5f9e57', 1 + i * 0.1), 1.06); c.position.y = 2.3 + i * 1.05; g.add(c); }
      return g;
    },
  },
  bush: {
    name: '덤불', icon: '🌿', cat: '자연', def: { s: 1, color: '#79b45f' }, props: ['s', 'color'], solid: 0,
    build(o) { const g = new T.Group(); [[0, 0.5, 0, 0.75], [0.6, 0.4, 0.1, 0.55], [-0.6, 0.4, -0.1, 0.55]].forEach(([x, y, z, r]) => { const p = inked(new T.SphereGeometry(r, 12, 8), o.color || '#79b45f', 1.08); p.position.set(x, y, z); g.add(p); }); return g; },
  },
  rock: {
    name: '바위', icon: '🪨', cat: '자연', def: { s: 0.8, color: '#b9b1a3' }, props: ['s', 'color'], solid: 0,
    build(o) { const r = inked(new T.SphereGeometry(0.7, 10, 7), o.color || '#b9b1a3', 1.08); r.scale.y = 0.55; r.position.y = 0.12; const g = new T.Group(); g.add(r); return g; },
  },
  mushroom: {
    name: '버섯', icon: '🍄', cat: '자연', def: { s: 1, color: '#e2523f' }, props: ['s', 'color'], solid: 0,
    build(o) {
      const g = new T.Group();
      const st = inked(new T.CylinderGeometry(0.12, 0.15, 0.4, 8), '#f6ecd8', 1.2); st.position.y = 0.2; g.add(st);
      const cap = inked(new T.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), o.color || '#e2523f', 1.12); cap.position.y = 0.36; g.add(cap);
      return g;
    },
  },
  flowers: {
    name: '꽃 무더기', icon: '🌼', cat: '자연', def: { s: 1, color: '#f39a9a' }, props: ['s', 'color'], solid: 0,
    build(o) {
      const g = new T.Group(), R = rng(Math.round((o.x || 0) * 31 + (o.z || 0) * 17));
      for (let i = 0; i < 7; i++) {
        const a = R() * 6.28, d = R() * 0.8, f = new T.Group();
        const stem = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.5, 4), toon('#5f9e57')); stem.position.y = 0.25; f.add(stem);
        const head = inked(new T.SphereGeometry(0.14, 8, 6), i % 3 ? (o.color || '#f39a9a') : '#ffd25a', 1.2); head.position.y = 0.52; f.add(head);
        f.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); g.add(f);
      }
      return g;
    },
  },
  stone: {
    name: '징검돌', icon: '⚪', cat: '길·물', def: { s: 1.05, color: '#c9c2b4' }, props: ['s', 'color'], solid: 0,
    build(o) { const r = inked(new T.SphereGeometry(0.7, 10, 7), o.color || '#c9c2b4', 1.08); r.scale.y = 0.55; r.position.y = 0.12; const g = new T.Group(); g.add(r); return g; },
  },
  stump: {
    name: '그루터기', icon: '🪵', cat: '자연', def: { s: 1 }, props: ['s'], solid: 0.9, top: 0.7,
    build() {
      const g = new T.Group();
      const s = inked(new T.CylinderGeometry(0.85, 1.0, 0.7, 12), '#a8764b', 1.05); s.position.y = 0.35; g.add(s);
      const top = new T.Mesh(new T.CircleGeometry(0.82, 16), toon('#e3c08f')); top.rotation.x = -Math.PI / 2; top.position.y = 0.71; g.add(top);
      return g;
    },
  },
  fence: {
    name: '울타리', icon: '🚧', cat: '집·소품', def: { s: 1, w: 8 }, props: ['w', 'r'], solid: 0,
    build(o) {
      const g = new T.Group(), w = o.w || 8, n = Math.max(2, Math.round(w / 1.4) + 1);
      for (let i = 0; i < n; i++) { const p = inked(new T.BoxGeometry(0.2, 1.1, 0.2), '#c79a62'); p.position.set(-w / 2 + (w * i) / (n - 1), 0.55, 0); g.add(p); }
      const rail = inked(new T.BoxGeometry(w + 0.3, 0.18, 0.12), '#c79a62'); rail.position.y = 0.8; g.add(rail);
      return g;
    },
  },
  flag: {
    name: '깃발', icon: '🚩', cat: '표지', def: { s: 1, color: '#ffcf4a' }, props: ['color'], solid: 0,
    build(o) {
      const g = new T.Group();
      const pole = inked(new T.CylinderGeometry(0.06, 0.06, 2.6, 6), '#f5ecd8', 1.3); pole.position.y = 1.3; g.add(pole);
      const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(1.1, -0.35); sh.lineTo(0, -0.7);
      const f = new T.Mesh(new T.ShapeGeometry(sh), new T.MeshLambertMaterial({ color: o.color || '#ffcf4a', side: T.DoubleSide })); f.position.y = 2.55; g.add(f);
      return g;
    },
  },
  arch: {
    name: '아치(출발·결승)', icon: '🏁', cat: '표지', def: { s: 1, text: '결승선', color: '#5d8fc4' }, props: ['text', 'color', 'r'], solid: 0,
    build(o) {
      const g = new T.Group();
      for (const k of [-1, 1]) { const post = inked(new T.CylinderGeometry(0.16, 0.16, 4, 8), '#f5ecd8', 1.25); post.position.set(k * 2.6, 2, 0); g.add(post); }
      const b = banner(o.text || '', 5.6, 1.2, o.color || '#5d8fc4', '#fffaf0'); b.position.y = 3.7; g.add(b);
      return g;
    },
  },
  sign: {
    name: '표지판', icon: '🪧', cat: '표지', def: { s: 1, text: '이름', color: '#fbf5e6' }, props: ['text', 'color', 'r'], solid: 0.3,
    build(o) {
      const g = new T.Group();
      const post = inked(new T.BoxGeometry(0.25, 2.4, 0.25), '#9a6a43'); post.position.y = 1.2; g.add(post);
      const b = banner(o.text || '', 4.4, 1.4, o.color || '#fbf5e6', '#d9634f'); b.position.set(0, 2.6, 0.15); g.add(b);
      return g;
    },
  },
  line: {
    name: '바닥 줄(출발선)', icon: '🏳️', cat: '표지', def: { s: 1, w: 6, color: '#d9634f' }, props: ['w', 'color', 'r'], solid: 0,
    build(o) {
      const g = new T.Group(), w = o.w || 6, n = Math.round(w / 0.25);
      for (let i = 0; i < n; i++) { const m = new T.Mesh(new T.PlaneGeometry(0.25, 1), new T.MeshLambertMaterial({ color: i % 2 ? '#ffffff' : (o.color || '#d9634f') })); m.rotation.x = -Math.PI / 2; m.position.set(-w / 2 + 0.125 + i * 0.25, 0.02, 0); m.receiveShadow = true; g.add(m); }
      return g;
    },
  },
  cottage: {
    name: '작은 집', icon: '🏠', cat: '집·소품', def: { s: 1, color: '#d9634f' }, props: ['s', 'r', 'color'], solid: 1.6,
    build(o) {
      const g = new T.Group();
      const body = inked(new T.BoxGeometry(2.6, 2, 2.2), '#f6e7c8', 1.04); body.position.y = 1; g.add(body);
      const roof = inked(new T.ConeGeometry(2.3, 1.6, 4), o.color || '#d9634f', 1.05); roof.position.y = 2.8; roof.rotation.y = Math.PI / 4; g.add(roof);
      const door = new T.Mesh(new T.PlaneGeometry(0.7, 1.1), toon('#9a6a43')); door.position.set(0, 0.56, 1.11); g.add(door);
      const win = new T.Mesh(new T.CircleGeometry(0.3, 12), toon('#bfe3f5')); win.position.set(0.8, 1.3, 1.11); g.add(win);
      return g;
    },
  },
  bench: {
    name: '나무 의자', icon: '🪑', cat: '집·소품', def: { s: 1 }, props: ['s', 'r'], solid: 0.6,
    build() {
      const g = new T.Group();
      const seat = inked(new T.BoxGeometry(2, 0.18, 0.6), '#c79a62'); seat.position.y = 0.6; g.add(seat);
      for (const k of [-0.8, 0.8]) { const l = inked(new T.BoxGeometry(0.15, 0.6, 0.5), '#9a6a43'); l.position.set(k, 0.3, 0); g.add(l); }
      return g;
    },
  },
  hill: {
    name: '종이 언덕', icon: '⛰️', cat: '배경', def: { s: 1, w: 30, h: 6, color: '#a6cd78', seed: 11 }, props: ['w', 'h', 'color', 'seed', 'r'], solid: 0,
    build(o) { return paperCut(hillShape(o.w || 30, o.h || 6, Math.max(1, Math.round((o.w || 30) / 6)), o.seed || 11), o.color || '#a6cd78'); },
  },
  cloud: {
    name: '종이 구름', icon: '☁️', cat: '배경', def: { s: 1.2, y: 11, color: '#ffffff' }, props: ['s', 'y', 'color'], solid: 0,
    build(o) {
      const g = new T.Group(), y = o.y || 11, s = o.s || 1;
      const cl = paperCut(cloudShape(1), o.color || '#ffffff', 0.25); cl.position.y = y / s; g.add(cl);
      const str = new T.Mesh(new T.CylinderGeometry(0.03 / s, 0.03 / s, y / s), new T.MeshBasicMaterial({ color: '#8a7058' })); str.position.set(0, y / s / 2, -0.1); g.add(str);
      return g;
    },
    keepY: true,
  },
  sun: {
    name: '종이 해', icon: '☀️', cat: '배경', def: { s: 1, y: 14.5, color: '#ffcf4a' }, props: ['s', 'y', 'color'], solid: 0,
    build(o) {
      const g = new T.Group(), y = (o.y || 14.5) / (o.s || 1);
      const s = paperCut(sunShape(2.2), o.color || '#ffcf4a', 0.25); s.position.y = y; g.add(s);
      const f = paperCut(new T.Shape().absarc(0, 0, 1.7, 0, Math.PI * 2), shade(o.color || '#ffcf4a', 1.15), 0.1); f.position.set(0, y, 0.3); g.add(f);
      return g;
    },
    keepY: true,
  },
};
