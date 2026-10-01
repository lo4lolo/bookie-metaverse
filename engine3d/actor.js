/* 도트 인물 — 카메라를 바라보는 판(빌보드) + 흰 스티커 테두리 + 둥근 그림자.
 * 시트: 64칸 단위, 가로 = 서기·걷기1·걷기2, 세로 = 앞·옆(오른쪽)·뒤 (픽셀엔진 storybook_chars.py 형식)
 * 시트가 아니면(학생 v5) 한 장짜리 — 방향과 상관없이 같은 그림, 왼쪽으로 가면 뒤집기.
 */
import { T } from './art3d.js';

export const PX = 16;                 // 도트 16칸 = 월드 1칸
const ROW = { f: 0, s: 1, b: 2 };
export const ANIMS = ['자동', '서기', '걷기', '깡충', '빙글', '흔들'];

/** 장식이 움직임에 따라 고르는 칸(도트 공방 미리보기와 같은 규칙)
 *  move: 'idle' 서 있기 · 'walk' 걷기 · 'run' 달리기/날기/뛰기,  n: 박자 수
 *  망토: 가만히(0) / 걸으면 펄럭1·2 / 빠르면 크게 펄럭(2)에 머묾
 *  날개: 서 있으면 가끔 살짝(0-0-1-0) / 걸으면 1·2 / 날거나 뛰면 0-1-2-1 빠르게
 *  모자·장식: 몸과 같은 칸(따라감) */
export function accFrame(kind, move, n) {
  if (kind === 'cape') return move === 'idle' ? 0 : move === 'run' ? 2 : [1, 2][n % 2];
  if (kind === 'wings') return move === 'idle' ? [0, 0, 1, 0][Math.floor(n / 2) % 4] : move === 'run' ? [0, 1, 2, 1][n % 4] : [1, 2][n % 2];
  return 0;
}
const BEHIND = { cape: [true, true, false], wings: [true, true, false], hat: [false, false, false] };   // 방향(앞·옆·뒤)별로 몸 뒤에 그릴지

/** 불투명 칸 바깥쪽 1칸을 흰 종이 테두리로 (칸(64) 경계는 넘지 않음) */
export function stickerize(src) {
  const w = src.width, h = src.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0);
  const d = x.getImageData(0, 0, w, h), a = d.data, out = new Uint8ClampedArray(a);
  const solid = (i, j, ci, cj) => i >= 0 && j >= 0 && i < w && j < h && (i >> 6) === ci && (j >> 6) === cj && a[(j * w + i) * 4 + 3] > 128;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4; if (a[k + 3] > 128) continue;
    const ci = i >> 6, cj = j >> 6;
    if (solid(i - 1, j, ci, cj) || solid(i + 1, j, ci, cj) || solid(i, j - 1, ci, cj) || solid(i, j + 1, ci, cj)) { out[k] = 255; out[k + 1] = 251; out[k + 2] = 240; out[k + 3] = 255; }
  }
  x.putImageData(new ImageData(out, w, h), 0, 0);
  return c;
}
export async function loadCanvas(src) {
  const im = new Image();
  await new Promise((ok, bad) => { im.onload = ok; im.onerror = () => bad(new Error('그림을 못 불러왔어요: ' + src)); im.src = src; });   // decode()는 숨은 탭에서 멈춤
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0);
  return c;
}

export class Actor {
  /** opt: {name, img(캔버스), sheet:true/false, foot, lift, tagH, hop, me} */
  constructor(stage, opt) {
    this.stage = stage; this.name = opt.name; this.img = opt.img; this.sheet = opt.sheet !== false;
    this.baseLift = opt.lift || 0; this.tagH = opt.tagH || 4; this.hopK = opt.hop ?? 0.18; this.faceTop = opt.faceTop || 0;
    const tex = new T.CanvasTexture(stickerize(opt.img));
    tex.colorSpace = T.SRGBColorSpace; tex.magFilter = tex.minFilter = T.NearestFilter; tex.generateMipmaps = false;
    if (this.sheet) tex.repeat.set(1 / 3, 1 / 3);
    this.tex = tex;
    const size = 64 / PX, foot = opt.foot || 62;
    const geo = new T.PlaneGeometry(size, size); geo.translate(0, size / 2 - ((64 - foot) / 64) * size, 0);
    this.mesh = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: T.DoubleSide }));
    this.mesh.userData.actor = this;
    this.group = new T.Group(); this.group.add(this.mesh);
    const sh = new T.Mesh(new T.CircleGeometry(0.85, 20), new T.MeshBasicMaterial({ color: '#3a2a1c', transparent: true, opacity: 0.2, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; this.shadow = sh; this.group.add(sh);
    stage.scene.add(this.group);
    this.pos = this.group.position;
    this.path = []; this.speed = 3; this.done = null; this.dir = 'f'; this.flip = false;
    this.moving = false; this.extMoving = false; this.t = 0; this.sleeping = false; this.flying = false; this.lift = this.baseLift;
    this.move = new T.Vector3(0, 0, 1); this.anim = '자동'; this.frameNo = 0; this.scaleK = 1; this.jumpT = -1; this.jumpH = 0; this.jumpDone = null;
    this.visible = true;
    this.tagEl = opt.tag === false ? null : stage.addTag(this.name, opt.me ? 'tag me' : 'tag');
    this.bangEl = stage.addTag('!', 'bang'); this.bangEl.hidden = true;
    this.zzEl = stage.addTag('Z z', 'zz'); this.zzEl.hidden = true;
    this.emoteEl = stage.addTag('', 'emote'); this.emoteEl.hidden = true;
    // 장식 층(망토·날개·모자) — 몸 판의 자식이라 돌기·뒤집기·통통을 같이 한다
    this.acc = (opt.acc || []).map(a => {
      const t = new T.CanvasTexture(stickerize(a.img)); t.colorSpace = T.SRGBColorSpace; t.magFilter = t.minFilter = T.NearestFilter; t.generateMipmaps = false; t.repeat.set(1 / 3, 1 / 3);
      const m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: t, alphaTest: 0.5, side: T.DoubleSide }));
      m.userData.actor = this; this.mesh.add(m);
      return { kind: a.kind, tex: t, mesh: m };
    });
  }
  dispose() { this.stage.scene.remove(this.group); [this.tagEl, this.bangEl, this.zzEl, this.emoteEl].forEach(e => e && e.remove()); this.finish(); }
  place(p) { this.pos.set(p.x, 0, p.z); this.path = []; this.finish(); return this; }
  finish() { this.moving = false; if (this.done) { const d = this.done; this.done = null; d(); } }
  walkTo(points, speed = 3) {
    this.finish();
    this.path = points.map(p => new T.Vector3(p.x, 0, p.z)); this.speed = Math.max(0.2, speed);
    if (!this.path.length) return Promise.resolve();
    return new Promise(r => { this.done = r; });
  }
  idle() { return this.path.length ? new Promise(r => { const d = this.done; this.done = () => { d && d(); r(); }; }) : Promise.resolve(); }
  flyTo(p) { this.flying = true; return this.walkTo([p], 9).then(() => { this.flying = false; }); }
  jump(h = 1) { this.jumpH = Math.min(6, Math.max(0.2, h)); this.jumpT = 0; return new Promise(r => { if (this.jumpDone) this.jumpDone(); this.jumpDone = r; }); }
  sleep(on) { this.sleeping = on; this.zzEl.hidden = !on || !this.visible; }
  look(d) { const m = { 앞: ['f', false], 뒤: ['b', false], 오른쪽: ['s', false], 왼쪽: ['s', true] }[d]; if (m) { [this.dir, this.flip] = m; } }
  show(on) { this.visible = on; this.group.visible = on; if (this.tagEl) this.tagEl.hidden = !on; if (!on) { this.zzEl.hidden = true; this.emoteEl.hidden = true; } }
  emote(text, sec = 2.5) {
    this.emoteEl.textContent = text; this.emoteEl.hidden = !text;
    clearTimeout(this._emoteTimer); if (text && sec > 0) this._emoteTimer = setTimeout(() => { this.emoteEl.hidden = true; }, sec * 1000);
  }
  setName(n) { this.name = n; if (this.tagEl) this.tagEl.textContent = n; }
  update(dt, yaw, right, fwd) {
    if (this.path.length) {
      const tgt = this.path[0], d = tgt.clone().sub(this.pos); d.y = 0;
      const dist = d.length(), step = this.speed * dt;
      if (dist <= step) { this.pos.copy(tgt); this.path.shift(); if (!this.path.length) this.finish(); }
      else { this.pos.addScaledVector(d, step / dist); this.move.copy(d); this.moving = true; }
    }
    const walking = this.moving || this.extMoving;
    if (walking) {
      const sx = this.move.dot(right), sf = this.move.dot(fwd);
      if (Math.abs(sx) > Math.abs(sf) * 0.8) { this.dir = 's'; this.flip = sx < 0; }
      else { this.dir = sf > 0 ? 'b' : 'f'; this.flip = false; }
    }
    this.t += dt;
    const a = this.anim, stepping = a === '걷기' || a === '깡충' || (a === '자동' && walking);
    let col = a === '프레임' ? this.frameNo : stepping ? 1 + (Math.floor(this.t / 0.14) % 2) : 0;
    if (this.sheet) this.tex.offset.set(col / 3, 1 - (ROW[this.dir] + 1) / 3);
    if (this.acc.length) {
      const fast = this.flying || this.jumpT >= 0 || this.anim === '깡충' || (walking && this.speed > 5.5);
      const move = fast ? 'run' : stepping ? 'walk' : 'idle', n = Math.floor(this.t * (move === 'run' ? 12 : move === 'walk' ? 7 : 2));
      const row = ROW[this.dir];
      for (const a of this.acc) {
        const c = a.kind === 'hat' ? col : accFrame(a.kind, move, n);
        a.tex.offset.set(c / 3, 1 - (row + 1) / 3);
        a.mesh.position.z = BEHIND[a.kind] && BEHIND[a.kind][row] ? -0.03 : 0.03;      // 판 앞뒤로 살짝 — 몸 뒤/앞
        a.mesh.rotation.z = a.kind === 'cape' && move !== 'idle' ? Math.sin(this.t * 8) * 0.025 : 0;   // 망토가 살랑
      }
    }
    // 위아래(걸음 통통·깡충·뛰기·날기)
    const targetLift = this.flying ? 3 : this.baseLift;
    this.lift += (targetLift - this.lift) * Math.min(1, dt * 5);
    let hop = (a === '자동' && walking && !this.flying) || a === '걷기' ? Math.abs(Math.sin(this.t * 11)) * this.hopK : 0;
    if (a === '깡충') hop = Math.abs(Math.sin(this.t * 6)) * 0.9;
    if (this.jumpT >= 0) {
      this.jumpT += dt; const k = this.jumpT / 0.5;
      hop += Math.sin(Math.min(1, k) * Math.PI) * this.jumpH;
      if (k >= 1) { this.jumpT = -1; const r = this.jumpDone; this.jumpDone = null; r && r(); }
    }
    this.mesh.position.y = this.lift + hop + (this.sleeping ? 0.75 : 0);
    let roll = this.sleeping ? Math.PI / 2 * 0.92 : 0, sx = this.flip ? -1 : 1;
    if (a === '흔들') roll += Math.sin(this.t * 9) * 0.18;
    if (a === '빙글') sx *= Math.cos(this.t * 6);
    this.mesh.rotation.set(0, yaw, roll);
    this.mesh.scale.set(sx * this.scaleK, this.scaleK, 1);
    this.shadow.scale.setScalar((this.sleeping ? 1.5 : 1 - Math.min(0.5, hop * 0.4)) * this.scaleK);
  }
  head() { return this.pos.clone().add(new T.Vector3(0, this.lift + (this.sleeping ? 2 : this.tagH * this.scaleK), 0)); }
}
