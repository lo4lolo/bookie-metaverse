/* 무대 — 세계 파일(world.json)을 받아 펼친 동화책 3D로 세운다. 놀이 화면과 세계 만들기가 함께 쓴다.
 * 세계 파일 형식은 38_석산메타버스/설계_3단계_세계만들기엔진.md 1절 · public/engine3d/README.md
 */
import { T, rng, toon, inked, curveOf, normalOf, distToCurve } from './art3d.js';
import { LIB } from './objects.js';
import { Actor, loadCanvas } from './actor.js';

const PACK = new URL('../packs/characters/', import.meta.url).href;
const V5 = new URL('../packs/avatar-v5/', import.meta.url).href;
const PPU = 32;                                  // 책장 그림: 1칸 = 32픽셀

export const STEP = Math.PI / 4;                 // 카메라 45°
let charIndex = null;
export async function characters() {
  if (!charIndex) charIndex = fetch(PACK + 'index.json').then(r => r.json());
  return charIndex;
}

export const PACK_URL = PACK;
/** 그림 꾸러미 인물 + 이 세계에서 도트 공방으로 만든 인물(world.chars, 그림이 파일 안에 들어 있음) */
export async function allChars(world) { return { ...(await characters()), ...((world && world.chars) || {}) }; }
export function charSrc(meta) { return meta.src.startsWith('data:') ? meta.src : PACK + meta.src; }

export function newWorld() {
  return {
    format: 'seoksan-world', version: 1, id: 'my-world', title: '새 이야기', author: '',
    book: { w: 64, d: 40, cover: '#b4533f', texts: { tl: '새 이야기', tr: '부기 동화책', bl: '', br: '' }, pages: [12, 13], grass: true, seed: 7, flowers: 300 },
    paths: [], objects: [], actors: [], spots: [], player: { x: -24, z: 0 },
    code: '// ▶ 시작하면 여기부터 차례대로 해요\n이야기.말하기("안녕! 새 이야기를 만들어 봐요.");\n',
  };
}

export class Stage {
  constructor(canvas, { editor = false } = {}) {
    this.canvas = canvas; this.editor = editor;
    const r = this.renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
    r.setPixelRatio(Math.min(2, devicePixelRatio)); r.outputColorSpace = T.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
    const s = this.scene = new T.Scene();
    const BG = new T.Color('#efeadd'); s.background = BG; s.fog = new T.Fog(BG, 80, 170);
    this.camera = new T.PerspectiveCamera(34, 1, 0.5, 500);
    s.add(new T.HemisphereLight('#fff6e4', '#b59a72', 1.6));
    const sun = this.sun = new T.DirectionalLight('#fff1d6', 1.9);
    sun.position.set(-18, 40, 22); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0008; sun.shadow.radius = 4; s.add(sun);
    this.cam = { yaw: 0, yawTo: 0, dist: 34, distTo: 34, el: 0.9, elTo: 0.9, target: new T.Vector3(), follow: null, focus: null };
    this.tagLayer = document.createElement('div'); this.tagLayer.className = 'tags'; document.body.append(this.tagLayer);
    this.tags = [];                  // [{el, get:()=>Vector3|null}]
    this.root = new T.Group(); s.add(this.root);
    this.objs = new Map();           // id → {o, g}
    this.actors = new Map();         // 이름 → Actor
    this.spotMarks = new Map();
    this.colliders = [];
    this.curves = {};
    this.onUpdate = null;
    this.clock = new T.Clock();
    this.ray = new T.Raycaster(); this.ground = new T.Plane(new T.Vector3(0, 1, 0), 0);
    addEventListener('resize', () => this.resize());
    this.resize();
    const loop = () => { requestAnimationFrame(loop); try { this.frame(); } catch (e) { if (!this._warned) { this._warned = true; console.error(e); } } };   // 한 번 오류가 나도 화면은 계속
    requestAnimationFrame(loop);
  }

  // ───── 세계 세우기 ─────
  async load(world, { student = null } = {}) {
    this.world = world;
    await Promise.all([document.fonts.load('40px "Noto Serif KR"'), document.fonts.load('800 40px Pretendard')]).catch(() => null);
    this.clear();
    this.buildBook();
    this.repaint();
    for (const o of world.objects) this.addObject(o);
    for (const sp of world.spots) this.markSpot(sp);
    const chars = await allChars(world);
    for (const a of world.actors) await this.addActor(a, chars);
    // 학생(나)
    await (window.AvatarV5 && AvatarV5.ROLES && !AvatarV5.DEFAULTS.hair ? AvatarV5.load(V5) : Promise.resolve()).catch(() => null);
    const img = window.AvatarV5 ? AvatarV5.sheet(student ? student.avatar.colors : null) : null;   // 앞·뒤 × 서기·걷기(다리·팔은 역할 지도로 움직임)
    if (img) {
      this.me = new Actor(this, { name: this.editor ? '나(시작)' : (student ? student.student.name : '손님'), img, sheet: true, foot: 60, tagH: 4.1, hop: 0.1, me: true });
      this.me.place(world.player);
      this.me.kind = 'player';
    }
    const B = world.book;
    const sc = this.sun.shadow.camera; Object.assign(sc, { left: -B.w / 2 - 8, right: B.w / 2 + 8, top: B.d / 2 + 10, bottom: -B.d / 2 - 10, near: 1, far: 140 }); sc.updateProjectionMatrix();
    this.cam.target.set(world.player.x, 0, world.player.z);
  }
  clear() {
    for (const a of this.actors.values()) a.dispose();
    if (this.me) { this.me.dispose(); this.me = null; }
    for (const r of this.objs.values()) if (r.labelEl) r.labelEl.remove();
    this.actors.clear(); this.objs.clear(); this.spotMarks.forEach(m => m.el.remove()); this.spotMarks.clear();
    this.scene.remove(this.root); this.root = new T.Group(); this.scene.add(this.root);
    this.colliders = [];
    this.tags = this.tags.filter(t => t.el.isConnected);
  }
  /** 도서관 방(scene: 'library') — 나무 바닥 + 둥근 깔개 + 낮은 벽(아래 나무 판, 위 크림) — 카메라가 돌아도 안이 보이게 벽은 낮게 */
  buildRoom() {
    const B = this.world.book, W = B.w, D = B.d, root = this.root;
    this.pageMat = new T.MeshLambertMaterial();
    const floor = this.page = new T.Mesh(new T.PlaneGeometry(W, D), this.pageMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
    const wallH = 3.2, th = 0.7;
    const walls = [[0, -D / 2 - th / 2, W + th * 2, th], [-W / 2 - th / 2, 0, th, D], [W / 2 + th / 2, 0, th, D], [0, D / 2 + th / 2, W + th * 2, th]];
    walls.forEach(([x, z, w, d], i) => {
      const h = i === 3 ? 0.5 : wallH;                                  // 앞(학생 쪽) 벽은 문턱만큼 낮게
      const low = inked(new T.BoxGeometry(w, Math.min(1.3, h), d), '#8a5a3b', 1.01); low.traverse(m => { m.castShadow = false; }); low.position.set(x, Math.min(1.3, h) / 2, z); root.add(low);
      if (h > 1.3) { const up = new T.Mesh(new T.BoxGeometry(w, h - 1.3, d), toon('#f3eedf')); up.position.set(x, 1.3 + (h - 1.3) / 2, z); up.receiveShadow = true; root.add(up); }
      const cap = inked(new T.BoxGeometry(w + 0.1, 0.18, d + 0.12), '#6b4430', 1.02); cap.position.set(x, h + 0.09, z); root.add(cap);
    });
    const base = new T.Mesh(new T.BoxGeometry(W + 6, 0.6, D + 6), toon('#5c3d2a')); base.position.y = -0.31; base.receiveShadow = true; root.add(base);
    const out = new T.Mesh(new T.PlaneGeometry(500, 500), new T.MeshLambertMaterial({ color: '#e8e1cf' })); out.rotation.x = -Math.PI / 2; out.position.y = -0.62; root.add(out);
  }
  buildBook() {
    if (this.world.scene === 'library') return this.buildRoom();
    const B = this.world.book, W = B.w, D = B.d, root = this.root;
    this.pageMat = new T.MeshLambertMaterial();
    const page = this.page = new T.Mesh(new T.PlaneGeometry(W, D), this.pageMat);
    page.rotation.x = -Math.PI / 2; page.receiveShadow = true; root.add(page);
    const sc = document.createElement('canvas'); sc.width = 8; sc.height = 64;
    const sx = sc.getContext('2d'); sx.fillStyle = '#f6ecd4'; sx.fillRect(0, 0, 8, 64);
    for (let y = 0; y < 64; y += 4) { sx.fillStyle = '#d9c9a5'; sx.fillRect(0, y, 8, 1); }
    const st = new T.CanvasTexture(sc); st.wrapS = st.wrapT = T.RepeatWrapping; st.repeat.set(20, 1); st.colorSpace = T.SRGBColorSpace;
    const block = new T.Mesh(new T.BoxGeometry(W, 1.6, D), new T.MeshLambertMaterial({ map: st })); block.position.y = -0.81; block.receiveShadow = true; root.add(block);
    const cover = new T.Mesh(new T.BoxGeometry(W + 2.6, 0.6, D + 2.6), toon(B.cover || '#b4533f')); cover.position.y = -1.9; cover.receiveShadow = true; root.add(cover);
    const spine = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, D + 2.6, 16, 1, false, Math.PI / 2, Math.PI), toon(B.cover || '#b4533f'));
    spine.rotation.x = Math.PI / 2; spine.rotation.y = Math.PI; spine.position.set(0, -2.2, 0); root.add(spine);
    const ribbon = new T.Mesh(new T.PlaneGeometry(0.8, 9), new T.MeshLambertMaterial({ color: '#e8b84a', side: T.DoubleSide }));
    ribbon.position.set(0.4, -1.4, D / 2 + 3.6); ribbon.rotation.x = -1.2; root.add(ribbon);
    const tc = document.createElement('canvas'); tc.width = tc.height = 512;
    const tx = tc.getContext('2d'); tx.fillStyle = '#d7b88a'; tx.fillRect(0, 0, 512, 512);
    const R = rng(3); for (let i = 0; i < 90; i++) { tx.strokeStyle = `rgba(140,96,56,${0.08 + R() * 0.12})`; tx.lineWidth = 1 + R() * 3; tx.beginPath(); const y = R() * 512; tx.moveTo(0, y); tx.bezierCurveTo(170, y + (R() - 0.5) * 30, 340, y + (R() - 0.5) * 30, 512, y); tx.stroke(); }
    const tt = new T.CanvasTexture(tc); tt.wrapS = tt.wrapT = T.RepeatWrapping; tt.repeat.set(6, 6); tt.colorSpace = T.SRGBColorSpace;
    const table = new T.Mesh(new T.PlaneGeometry(500, 500), new T.MeshLambertMaterial({ map: tt }));
    table.rotation.x = -Math.PI / 2; table.position.y = -2.21; table.receiveShadow = true; root.add(table);
  }

  /** 책장 그림(종이·풀밭 물감·개울·길·꽃·글씨)을 다시 그린다 — 길을 고친 뒤 부른다 */
  repaint() {
    const wd = this.world, B = wd.book, W = B.w * PPU, H = B.d * PPU;
    this.curves = {};
    for (const p of wd.paths) this.curves[p.name] = curveOf(p.points);
    const cv = this.pageCanvas || (this.pageCanvas = document.createElement('canvas'));
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d'), R = rng(B.seed || 7);
    if (wd.scene === 'library') return this.paintFloor(c, W, H, R);
    const X = x => (x + B.w / 2) * PPU, Z = z => (z + B.d / 2) * PPU;
    c.fillStyle = '#fbf3df'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H / 290; i++) { c.fillStyle = `rgba(${150 + R() * 60},${120 + R() * 50},${80 + R() * 40},${R() * 0.05})`; c.fillRect(R() * W, R() * H, 1 + R() * 3, 1 + R() * 2); }
    const inset = 1.6 * PPU;
    const blob = (x, y, r, col) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
    if (B.grass !== false) {
      const greens = ['rgba(150,196,104,0.20)', 'rgba(126,180,92,0.18)', 'rgba(184,210,112,0.18)', 'rgba(110,165,96,0.14)'];
      const n = Math.round(W * H / 1000);
      for (let i = 0; i < n; i++) {
        const x = inset + R() * (W - 2 * inset), y = inset + R() * (H - 2 * inset);
        const edge = Math.min(x - inset, W - inset - x, y - inset, H - inset - y) / PPU;
        if (edge < R() * 1.4) continue;
        blob(x, y, (0.8 + R() * 2.4) * PPU, greens[i % 4]);
      }
      for (let i = 0; i < n / 16; i++) blob(inset + R() * (W - 2 * inset), inset + R() * (H - 2 * inset), (1 + R() * 2) * PPU, 'rgba(240,226,140,0.16)');
      c.strokeStyle = 'rgba(86,130,70,0.35)'; c.lineWidth = 2;
      for (let i = 0; i < n / 2; i++) { const x = inset + R() * (W - 2 * inset), y = inset + R() * (H - 2 * inset); c.beginPath(); c.moveTo(x - 4, y - 7); c.lineTo(x, y); c.lineTo(x + 4, y - 8); c.stroke(); }
    }
    const stroke = (curve, w, col, cap = 'round') => { c.strokeStyle = col; c.lineWidth = w * PPU; c.lineCap = cap; c.lineJoin = 'round'; c.beginPath(); for (let i = 0; i <= 300; i++) { const p = curve.getPointAt(i / 300); c.lineTo(X(p.x), Z(p.z)); } c.stroke(); };
    for (const p of wd.paths) {
      const cu = this.curves[p.name]; if (!cu) continue;
      const w = p.width || (p.kind === 'water' ? 3 : 2.6);
      if (p.kind === 'water') {
        stroke(cu, w * 1.27, 'rgba(120,170,205,0.35)'); stroke(cu, w, 'rgba(130,184,222,0.75)'); stroke(cu, w * 0.6, 'rgba(170,212,238,0.85)');
        c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3;
        const len = cu.getLength();
        for (let i = 0; i < len * 1.8; i++) { const q = cu.getPointAt(R()), n = normalOf(cu, 0.5); c.beginPath(); c.arc(X(q.x + (R() - 0.5) * w * 0.5 * n.x), Z(q.z + (R() - 0.5) * w * 0.5), 10 + R() * 8, 3.6, 5.6); c.stroke(); }
      }
    }
    for (const p of wd.paths) {
      const cu = this.curves[p.name]; if (!cu || p.kind === 'water') continue;
      const w = p.width || 2.6;
      stroke(cu, w * 1.2, 'rgba(176,132,82,0.45)'); stroke(cu, w, '#e3c48e'); stroke(cu, w * 0.65, '#ecd6a8');
      const len = cu.getLength();
      for (let i = 0; i < len * 9; i++) { const q = cu.getPointAt(R()), n = (R() - 0.5) * w * 0.85; c.fillStyle = `rgba(150,110,70,${0.2 + R() * 0.3})`; c.beginPath(); c.arc(X(q.x + n * 0.7), Z(q.z + n * 0.7), 2 + R() * 3, 0, 7); c.fill(); }
    }
    const flowerCols = ['#f39a9a', '#ffd25a', '#ffffff', '#c7a0e8', '#f7b267'];
    for (let i = 0; i < (B.flowers ?? 300); i++) {
      const x = -B.w / 2 + 2 + R() * (B.w - 4), z = -B.d / 2 + 2 + R() * (B.d - 4);
      if (wd.paths.some(p => this.curves[p.name] && distToCurve(this.curves[p.name], x, z, 60) < (p.kind === 'water' ? 2 : 1.8))) continue;
      c.fillStyle = flowerCols[i % 5]; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(X(x) + Math.cos(k * 1.26) * 4, Z(z) + Math.sin(k * 1.26) * 4, 3.2, 0, 7); c.fill(); }
      c.fillStyle = '#e8a33d'; c.beginPath(); c.arc(X(x), Z(z), 2.4, 0, 7); c.fill();
    }
    const g = c.createLinearGradient(W / 2 - 3 * PPU, 0, W / 2 + 3 * PPU, 0);
    g.addColorStop(0, 'rgba(90,60,30,0)'); g.addColorStop(0.5, 'rgba(90,60,30,0.28)'); g.addColorStop(1, 'rgba(90,60,30,0)');
    c.fillStyle = g; c.fillRect(W / 2 - 3 * PPU, 0, 6 * PPU, H);
    const tx = B.texts || {};
    c.fillStyle = 'rgba(74,52,38,0.75)'; c.textBaseline = 'middle';
    c.font = `${0.62 * PPU}px "Noto Serif KR", serif`;
    c.textAlign = 'left'; c.fillText(tx.tl || '', 2 * PPU, 0.8 * PPU);
    c.textAlign = 'right'; c.fillText(tx.tr || '', W - 2 * PPU, 0.8 * PPU);
    c.font = `${0.58 * PPU}px "Noto Serif KR", serif`;
    c.textAlign = 'left'; c.fillText(tx.bl || '', 2 * PPU, H - 0.8 * PPU);
    c.textAlign = 'right'; c.fillText(tx.br || '', W - 2 * PPU, H - 0.8 * PPU);
    const [p1, p2] = B.pages || [];
    c.textAlign = 'center'; if (p1) c.fillText(`— ${p1} —`, W / 4, H - 0.8 * PPU); if (p2) c.fillText(`— ${p2} —`, W * 3 / 4, H - 0.8 * PPU);
    if (this.pageTex) this.pageTex.dispose();
    const tex = this.pageTex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.pageMat.map = tex; this.pageMat.needsUpdate = true;
  }

  /** 도서관 바닥: 가로 나무 판(판마다 결·이음매) + 가운데 둥근 깔개(부기 숲색) */
  paintFloor(c, W, H, R) {
    const B = this.world.book, plank = 1.1 * PPU, tones = ['#c99b6b', '#c4955f', '#cfa474', '#bf8f5c'];
    for (let y = 0, row = 0; y < H; y += plank, row++) {
      let x = -(row % 3) * 2.2 * PPU;
      while (x < W) { const len = (3 + R() * 4) * PPU; c.fillStyle = tones[Math.floor(R() * tones.length)]; c.fillRect(x, y, len, plank); c.strokeStyle = 'rgba(92,61,42,.35)'; c.lineWidth = 2; c.strokeRect(x, y, len, plank);
        c.strokeStyle = 'rgba(92,61,42,.10)'; c.lineWidth = 1; for (let k = 0; k < 3; k++) { const yy = y + plank * (0.25 + k * 0.25) + (R() - 0.5) * 4; c.beginPath(); c.moveTo(x + 4, yy); c.bezierCurveTo(x + len * 0.3, yy + 3, x + len * 0.7, yy - 3, x + len - 4, yy); c.stroke(); }
        x += len; }
    }
    const rug = B.rug || { x: 0, z: 2, r: 9 };
    const cx = (rug.x + B.w / 2) * PPU, cz = (rug.z + B.d / 2) * PPU, r = rug.r * PPU;
    c.save(); c.translate(cx, cz); c.scale(1.35, 1);
    const ring = (rr, col) => { c.fillStyle = col; c.beginPath(); c.arc(0, 0, rr, 0, 7); c.fill(); };
    ring(r, '#1d3a2a'); ring(r * 0.94, '#2f7d4f'); ring(r * 0.86, '#dfe8d8'); ring(r * 0.8, '#2f7d4f'); ring(r * 0.55, '#f7f4ec'); ring(r * 0.5, '#82a35e');
    c.strokeStyle = '#f7f4ec'; c.lineWidth = 3; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58); c.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78); c.stroke(); }
    c.restore();
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.7); g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(1, 'rgba(60,40,20,0.22)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (this.pageTex) this.pageTex.dispose();
    const tex = this.pageTex = new T.CanvasTexture(this.pageCanvas);
    tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.pageMat.map = tex; this.pageMat.needsUpdate = true;
  }

  // ───── 물건 ─────
  addObject(o) {
    const def = LIB[o.type]; if (!def) return null;
    for (const [k, v] of Object.entries(def.def)) if (o[k] === undefined) o[k] = v;
    if (!o.id) o.id = 'o' + Math.random().toString(36).slice(2, 8);
    const g = def.build(o);
    g.traverse(m => { m.userData.objId = o.id; });
    this.root.add(g);
    const rec = { o, g, def };
    this.objs.set(o.id, rec);
    this.placeObject(rec);
    if (o.label) this.labelObject(o.id, o.label);
    return rec;
  }
  placeObject(rec) {
    const { o, g } = rec;
    g.position.set(o.x, 0, o.z); g.rotation.y = -(o.r || 0) * Math.PI / 180; g.scale.setScalar(o.s || 1);
    this.recalcColliders();
  }
  updateObject(o) { this.removeObject(o.id, false); return this.addObject(o); }
  removeObject(id, recalc = true) {
    const rec = this.objs.get(id); if (!rec) return;
    this.root.remove(rec.g); this.objs.delete(id);
    if (rec.labelEl) rec.labelEl.remove();
    if (recalc) this.recalcColliders();
  }
  recalcColliders() {
    this.colliders = [];
    for (const { o, def, g } of this.objs.values()) if (def.solid && g.visible) this.colliders.push({ x: o.x, z: o.z, r: def.solid * (o.s || 1) });
  }
  labelObject(id, text) {
    const rec = this.objs.get(id); if (!rec) return;
    if (!rec.labelEl) { rec.labelEl = this.addTag('', 'tag me num', () => rec.g.visible ? rec.g.position.clone().add(new T.Vector3(0, 1.4 * (rec.o.s || 1) + (rec.def.top || 0), 0)) : null); }
    rec.labelEl.textContent = text; rec.labelEl.hidden = !text;
  }
  objByName(name) { for (const r of this.objs.values()) if (r.o.name === name) return r; return null; }

  // ───── 자리(이름 붙은 곳) ─────
  markSpot(sp) {
    if (!this.editor) return;
    const g = new T.Group();
    const pin = inked(new T.ConeGeometry(0.35, 1.2, 8), '#e8b84a', 1.15); pin.rotation.x = Math.PI; pin.position.y = 0.9; g.add(pin);
    const ball = inked(new T.SphereGeometry(0.4, 12, 8), '#e8b84a', 1.12); ball.position.y = 1.6; g.add(ball);
    const ring = new T.Mesh(new T.RingGeometry(0.9, 1.1, 24), new T.MeshBasicMaterial({ color: '#e8b84a', side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
    g.position.set(sp.x, 0, sp.z); g.traverse(m => { m.userData.spot = sp; });
    this.root.add(g);
    const el = this.addTag('📍 ' + sp.name, 'tag spot', () => g.position.clone().add(new T.Vector3(0, 2.4, 0)));
    this.spotMarks.set(sp, { g, el });
  }
  unmarkSpot(sp) { const m = this.spotMarks.get(sp); if (!m) return; this.root.remove(m.g); m.el.remove(); this.spotMarks.delete(sp); }
  spot(name) { return this.world.spots.find(s => s.name === name) || null; }

  // ───── 인물 ─────
  async addActor(a, chars) {
    chars = chars || await allChars(this.world);
    const meta = chars[a.sheet] || Object.values(chars)[0];
    const img = await loadCanvas(charSrc(meta));
    const acc = await Promise.all((meta.acc || []).map(async x => ({ kind: x.kind, img: await loadCanvas(x.src) })));
    const act = new Actor(this, { name: a.name, img, acc, foot: meta.foot, lift: a.lift ?? 0, tagH: meta.tagH, hop: meta.hop, faceTop: meta.faceTop });
    act.place(a); act.data = a;
    if (a.dir) act.look(a.dir);
    this.actors.set(a.name, act);
    return act;
  }
  removeActor(name) { const a = this.actors.get(name); if (a) { a.dispose(); this.actors.delete(name); } }

  /** 이름 → 자리·인물·물건 (코드의 '대상') */
  find(name) {
    if (name === '나') return this.me;
    return this.actors.get(name) || this.objByName(name) || this.spot(name) || null;
  }
  posOf(t) {
    if (!t) return null;
    if (t.pos) return t.pos;                       // 인물
    if (t.g) return t.g.position;                  // 물건
    if (Array.isArray(t)) return new T.Vector3(t[0], 0, t[1]);
    if (t.x !== undefined) return new T.Vector3(t.x, 0, t.z);
    return null;
  }
  /** 길 이름 + 백분율(0~100) → 점 */
  along(pathName, pct) { const cu = this.curves[pathName]; if (!cu) return null; return cu.getPointAt(Math.min(1, Math.max(0, pct / 100))); }
  route(pathName, a, b) {
    const cu = this.curves[pathName]; if (!cu) return [];
    const pts = [], n = Math.max(2, Math.ceil(Math.abs(b - a) * 0.8));
    for (let i = 1; i <= n; i++) pts.push(cu.getPointAt(Math.min(1, Math.max(0, (a + ((b - a) * i) / n) / 100))));
    return pts;
  }

  // ───── 머리 위 글자 ─────
  addTag(text, cls, get) {
    const el = document.createElement('div'); el.className = cls; el.textContent = text; this.tagLayer.append(el);
    if (get) this.tags.push({ el, get });
    return el;
  }
  placeTag(el, v) {
    if (!v || el.hidden) { el.style.display = 'none'; return; }
    const p = v.clone().project(this.camera);
    if (p.z > 1 || Math.abs(p.x) > 1.02 || Math.abs(p.y) > 1.02) { el.style.display = 'none'; return; }
    const r = this.canvas.getBoundingClientRect();
    el.style.display = ''; el.style.left = r.left + ((p.x + 1) / 2) * r.width + 'px'; el.style.top = r.top + ((1 - p.y) / 2) * r.height + 'px';
  }

  // ───── 카메라 ─────
  turn(k) { this.cam.yawTo = Math.round(this.cam.yawTo / STEP) * STEP + k * STEP; }
  basis() {
    const y = this.cam.yaw;
    return { fwd: new T.Vector3(-Math.sin(y), 0, -Math.cos(y)), right: new T.Vector3(Math.cos(y), 0, -Math.sin(y)) };
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const fit = this.camera.aspect < 1 ? Math.min(66, 34 / Math.pow(this.camera.aspect, 1.3)) : 34;   // 세로 화면은 더 멀리서
    if (!this.editor) this.cam.distTo = this.cam.dist = fit;
  }
  pickRay(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(new T.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), this.camera);
    return this.ray;
  }
  groundAt(clientX, clientY) { const p = new T.Vector3(); return this.pickRay(clientX, clientY).ray.intersectPlane(this.ground, p) ? p : null; }
  /** 누른 곳의 물건·인물·자리 */
  pick(clientX, clientY) {
    const ray = this.pickRay(clientX, clientY);
    const list = [this.root, ...[...this.actors.values()].map(a => a.mesh)]; if (this.me) list.push(this.me.mesh);
    for (const h of ray.intersectObjects(list, true)) {
      const u = h.object.userData;
      if (u.actor) return { actor: u.actor };
      if (u.objId) return { obj: this.objs.get(u.objId) };
      if (u.spot) return { spot: u.spot };
    }
    return null;
  }
  clamp(p) { const B = this.world.book; p.x = Math.max(-B.w / 2 + 1, Math.min(B.w / 2 - 1, p.x)); p.z = Math.max(-B.d / 2 + 1.2, Math.min(B.d / 2 - 1, p.z)); p.y = 0; return p; }

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const c = this.cam;
    if (this.onUpdate) this.onUpdate(dt);
    c.yaw += (c.yawTo - c.yaw) * Math.min(1, dt * 7);
    c.dist += (c.distTo - c.dist) * Math.min(1, dt * 7);
    c.el += (c.elTo - c.el) * Math.min(1, dt * 7);
    const { fwd, right } = this.basis();
    for (const a of this.actors.values()) a.update(dt, c.yaw, right, fwd);
    if (this.me) this.me.update(dt, c.yaw, right, fwd);
    const f = c.focus ? this.posOf(c.focus) : c.follow ? this.posOf(c.follow) : null;
    if (f) c.target.lerp(new T.Vector3(f.x, 0, f.z), Math.min(1, dt * (c.focus ? 2.5 : 4)));
    const h = Math.cos(c.el) * c.dist;
    this.camera.position.set(c.target.x + Math.sin(c.yaw) * h, Math.sin(c.el) * c.dist, c.target.z + Math.cos(c.yaw) * h);
    this.camera.lookAt(c.target.x, 1.2, c.target.z);
    for (const a of [...this.actors.values(), this.me].filter(Boolean)) {
      const hd = a.head();
      if (a.tagEl) this.placeTag(a.tagEl, a.visible ? hd : null);
      this.placeTag(a.bangEl, hd.clone().add(new T.Vector3(0, 1.1, 0)));
      this.placeTag(a.zzEl, a.pos.clone().add(new T.Vector3(0.6, 2.2, 0)));
      this.placeTag(a.emoteEl, hd.clone().add(new T.Vector3(0, a.tagEl ? 1.2 : 0.4, 0)));
    }
    for (const t of this.tags) this.placeTag(t.el, t.get());
    this.renderer.render(this.scene, this.camera);
  }
}

/** 나무 흩뿌리기 — 길·개울·자리·인물에서 떨어진 곳에 나무·덤불·바위·버섯을 놓아 물건 목록에 더한다 */
export function scatter(world, curves, { seed = 21, trees = 46, rocks = 26, bushes = 18, mushrooms = 10 } = {}) {
  const R = rng(seed), B = world.book, out = [];
  const keep = [...world.spots, ...world.actors, world.player];
  const solid = world.objects.map(o => ({ x: o.x, z: o.z }));
  const near = (x, z, pad) => Object.entries(curves).some(([n, c]) => c && distToCurve(c, x, z, 80) < (world.paths.find(p => p.name === n)?.kind === 'water' ? pad + 0.4 : pad));
  const add = o => { out.push(o); solid.push(o); };
  let n = 0;
  for (let i = 0; i < 500 && n < trees; i++) {
    const x = -B.w / 2 + 2.5 + R() * (B.w - 5), z = -B.d / 2 + 3.5 + R() * (B.d - 6);
    if (near(x, z, 3.2) || keep.some(p => Math.hypot(p.x - x, p.z - z) < 5) || solid.some(c => Math.hypot(c.x - x, c.z - z) < 3.2)) continue;
    if (z > B.d / 2 - 8 && R() < 0.6) { add({ type: 'bush', x: +x.toFixed(2), z: +z.toFixed(2), s: +(0.8 + R() * 0.4).toFixed(2) }); continue; }
    const k = R(), type = k < 0.3 ? 'pine' : k < 0.4 ? 'appletree' : 'tree';
    add({ type, x: +x.toFixed(2), z: +z.toFixed(2), s: +(0.8 + R() * 0.5).toFixed(2), r: Math.round(R() * 360) }); n++;
  }
  for (let i = 0; i < rocks; i++) { const x = -B.w / 2 + 2 + R() * (B.w - 4), z = -B.d / 2 + 2 + R() * (B.d - 4); if (!near(x, z, 2.2)) add({ type: 'rock', x: +x.toFixed(2), z: +z.toFixed(2), s: +(0.4 + R() * 0.5).toFixed(2) }); }
  for (let i = 0; i < bushes; i++) { const x = -B.w / 2 + 2 + R() * (B.w - 4), z = -B.d / 2 + 2 + R() * (B.d - 4); if (!near(x, z, 2.5) && !solid.some(c => Math.hypot(c.x - x, c.z - z) < 2)) add({ type: 'bush', x: +x.toFixed(2), z: +z.toFixed(2), s: +(0.6 + R() * 0.5).toFixed(2) }); }
  for (let i = 0; i < mushrooms; i++) { const x = -B.w / 2 + 4 + R() * (B.w - 8), z = -B.d / 2 + 4 + R() * (B.d - 8); if (!near(x, z, 2.3)) add({ type: 'mushroom', x: +x.toFixed(2), z: +z.toFixed(2) }); }
  return out;
}
