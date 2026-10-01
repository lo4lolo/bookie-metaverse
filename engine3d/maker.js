/* 세계 만들기 — 게더타운식 꾸미기 + 블록/코드 + ▶ 해 보기.
 * 세계 파일 하나(world)를 고친다. 무대(stage.js)는 놀이 화면과 같은 것을 쓰므로 보이는 그대로 놀이가 된다.
 */
import { T, inked } from './art3d.js';
import { Stage, newWorld, scatter, characters, allChars, charSrc, PACK_URL } from './stage.js';
import { openWorkshop } from './workshop.js';
import { LIB, CATS } from './objects.js';
import { Player } from './play.js';
import { loadCanvas } from './actor.js';

const $ = id => document.getElementById(id);
const AUTOSAVE = 'seoksan-maker-autosave';
const BASE = new URL('../', import.meta.url).href;
const NATURE = ['tree', 'appletree', 'pine', 'bush', 'rock', 'mushroom'];

const st = { world: null, tab: 'map', tool: null, sel: null, undo: [], redo: [], playing: false, palCat: '자연', open: { obj: true, actor: true, path: false, spot: false } };
let stage, player, chars;

// ───── 작은 도구 ─────
function toast(t) { const e = $('mToast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2200); }
function hint(t) { $('mHint').textContent = t || ''; }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function loadScript(src) { return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(new Error(src)); document.head.append(s); }); }
async function loadLib(local, cdn) { try { await loadScript(BASE + 'vendor/' + local); } catch (e) { await loadScript(cdn); } }
const r2 = v => Math.round(v * 100) / 100;
const validName = n => /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(n);
function allNames() { const w = st.world; return new Set(['나', '이야기', ...w.actors.map(a => a.name), ...w.spots.map(s => s.name), ...w.paths.map(p => p.name), ...w.objects.filter(o => o.name).map(o => o.name)]); }
function freeName(base) { base = String(base).replace(/[^\p{L}\p{N}_]/gu, '') || '친구'; if (/^\p{N}/u.test(base)) base = '친구' + base; const used = allNames(); if (!used.has(base)) return base; for (let i = 2; ; i++) if (!used.has(base + i)) return base + i; }
/** 코드 안의 이름 바꾸기(낱말 경계, 따옴표 안 "찾기" 글자는 그대로) */
function renameInCode(from, to) {
  if (!from || from === to) return;
  const re = new RegExp(`(?<![\\p{L}\\p{N}_$."])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_$"])`, 'gu');
  const before = st.world.code; st.world.code = before.replace(re, to);
  if (before !== st.world.code) { toast(`코드의 '${from}'도 '${to}'(으)로 바꿨어요`); if (cm) cm.setValue(st.world.code); }
}

// ───── 되돌리기·자동 저장 ─────
function snap() { st.undo.push(JSON.stringify(st.world)); if (st.undo.length > 60) st.undo.shift(); st.redo = []; }
function autosave() { try { localStorage.setItem(AUTOSAVE, JSON.stringify({ at: Date.now(), world: st.world })); } catch (e) { /* 저장 공간 부족 등 */ } }
async function restore(json) { st.world = JSON.parse(json); select(null); await reload(); autosave(); }
async function undo() { if (!st.undo.length) return toast('더 되돌릴 것이 없어요'); st.redo.push(JSON.stringify(st.world)); await restore(st.undo.pop()); }
async function redo() { if (!st.redo.length) return; st.undo.push(JSON.stringify(st.world)); await restore(st.redo.pop()); }

// ───── 불러오기 ─────
async function reload() {
  await stage.load(st.world);
  stage.cam.follow = null;
  $('mTitle').value = st.world.title || '';
  if (cm && cm.getValue() !== st.world.code) cm.setValue(st.world.code);
  drawPalette(); drawProps();
}
async function openWorld(w, msg) {
  if (!w || w.format !== 'seoksan-world') { toast('세계 파일이 아니에요'); return; }
  st.world = w; st.undo = []; st.redo = []; select(null); $('mErr').hidden = true; $('pError').hidden = true;
  await reload(); stage.cam.target.set(w.player.x, 0, w.player.z); autosave();
  if (msg) toast(msg);
}
function starter() {
  const w = newWorld();
  w.paths.push({ name: '길', kind: 'dirt', width: 2.6, points: [[-22, 4], [-10, 6], [0, 2], [12, -2], [22, -4]] });
  w.actors.push({ name: '토끼', sheet: 'rabbit', x: -14, z: 0, dir: '오른쪽' });
  w.spots.push({ name: '나무앞', x: 10, z: -6 });
  w.objects.push({ type: 'hill', x: -16, z: -19.6, w: 31, h: 7, color: '#8dbb6a', seed: 10 }, { type: 'hill', x: 16, z: -19.6, w: 31, h: 6, color: '#8dbb6a', seed: 12 },
    { type: 'hill', x: -16, z: -18.2, w: 31, h: 4.5, color: '#a6cd78', seed: 11 }, { type: 'hill', x: 16, z: -18.2, w: 31, h: 4, color: '#a6cd78', seed: 13 },
    { type: 'cloud', x: -12, z: -17, y: 11, s: 1.3 }, { type: 'cloud', x: 8, z: -16.5, y: 12.5, s: 1.1 }, { type: 'sun', x: 22, z: -19, y: 14 },
    { type: 'tree', x: 10, z: -9, s: 1.2 }, { type: 'pine', x: -4, z: -8 }, { type: 'bush', x: 4, z: 8 }, { type: 'flowers', x: -6, z: 9 });
  w.code = `// ▶ 시작하면 여기부터 차례대로 해요
쪽("첫째 쪽");
토끼.말하기("안녕! 나는 토끼야.");
목표("토끼에게 가 보세요", 토끼);
도착(토끼, 3);
토끼.뛰기(1);
let 대답 = 토끼.묻기("나랑 나무까지 가 볼래?", ["😊 좋아!", "🙅 싫어"]);
if (대답 == 1) {
  토끼.걷기(나무앞, 3);
  토끼.표정("🌳");
} else {
  토끼.말하기("그래, 다음에 같이 가자!");
}
`;
  return w;
}

// ───── 왼쪽 도감 ─────
async function drawPalette() {
  const p = $('mPalette'), w = st.world;
  chars = await allChars(w);
  const sec = (key, title, html) => `<section class="pal"><h3 data-sec="${key}">${title}<span>${st.open[key] ? '▾' : '▸'}</span></h3>${st.open[key] ? html : ''}</section>`;
  const items = Object.entries(LIB).filter(([, d]) => d.cat === st.palCat)
    .map(([k, d]) => `<button data-place="${k}" class="${st.tool === 'obj:' + k ? 'on' : ''}" title="${esc(d.name)}"><span class="ic">${d.icon}</span>${esc(d.name)}</button>`).join('');
  const objHtml = `<div class="cats">${CATS.map(c => `<button data-cat="${c}" class="${c === st.palCat ? 'on' : ''}">${c}</button>`).join('')}</div><div class="grid">${items}</div>`;
  const actHtml = `<div class="grid">${Object.entries(chars).map(([k, c]) => `<button data-actor="${k}" class="${st.tool === 'actor:' + k ? 'on' : ''}"><canvas data-face="${k}" width="40" height="40"></canvas>${esc(c.name)}</button>`).join('')}</div>
    <div class="row"><button data-workshop="1">🎨 도트 공방(인물 꾸미기)</button></div>
    <div class="list">${w.actors.map(a => `<button data-selactor="${esc(a.name)}" class="${st.sel?.kind === 'actor' && st.sel.ref === a ? 'on' : ''}">🙂 ${esc(a.name)}</button>`).join('')}<button data-selplayer="1" class="${st.sel?.kind === 'player' ? 'on' : ''}">🧒 나(학생 시작 자리)</button></div>`;
  const pathHtml = `<div class="list">${w.paths.map((q, i) => `<button data-selpath="${i}" class="${st.sel?.kind === 'path' && st.sel.ref === q ? 'on' : ''}">${q.kind === 'water' ? '💧' : '🟫'} ${esc(q.name)}</button>`).join('')}</div>
    <div class="row"><button data-newpath="dirt">+ 새 길</button><button data-newpath="water">+ 새 개울</button></div>`;
  const spotHtml = `<div class="list">${w.spots.map((s, i) => `<button data-selspot="${i}" class="${st.sel?.kind === 'spot' && st.sel.ref === s ? 'on' : ''}">📍 ${esc(s.name)}</button>`).join('')}</div>
    <div class="row"><button data-placespot="1" class="${st.tool === 'spot' ? 'on' : ''}">+ 자리 놓기</button></div><p class="hint" style="font-size:12px;opacity:.75">자리는 놀이 화면에는 안 보여요. 코드에서 "어디로"를 가리킬 때 써요.</p>`;
  p.innerHTML = sec('obj', '🌳 물건', objHtml) + sec('actor', '🐰 인물', actHtml) + sec('path', '〰 길·개울', pathHtml) + sec('spot', '📍 자리', spotHtml)
    + `<section class="pal"><h3 data-book="1">📕 책 설정 · 자동 꾸미기</h3></section>`;
  for (const c of p.querySelectorAll('canvas[data-face]')) {
    const meta = chars[c.dataset.face];
    loadCanvas(charSrc(meta)).then(img => { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 8, meta.faceTop || 0, 48, 48, 0, 0, 40, 40); }).catch(() => null);
  }
}
$('mPalette').addEventListener('click', async e => {
  const b = e.target.closest('button, h3'); if (!b) return;
  const d = b.dataset, w = st.world;
  if (d.sec) { st.open[d.sec] = !st.open[d.sec]; return drawPalette(); }
  if (d.cat) { st.palCat = d.cat; return drawPalette(); }
  if (d.place) return setTool(st.tool === 'obj:' + d.place ? null : 'obj:' + d.place);
  if (d.actor) return setTool(st.tool === 'actor:' + d.actor ? null : 'actor:' + d.actor);
  if (d.workshop) return workshop();
  if (d.placespot) return setTool(st.tool === 'spot' ? null : 'spot');
  if (d.selactor) return select({ kind: 'actor', ref: w.actors.find(a => a.name === d.selactor) }, true);
  if (d.selplayer) return select({ kind: 'player', ref: w.player }, true);
  if (d.selpath) return select({ kind: 'path', ref: w.paths[+d.selpath] }, true);
  if (d.selspot) return select({ kind: 'spot', ref: w.spots[+d.selspot] }, true);
  if (d.book) return select(null);
  if (d.newpath) {
    snap();
    const c = stage.cam.target, water = d.newpath === 'water';
    const q = { name: freeName(water ? '개울' : '길'), kind: d.newpath, width: water ? 3 : 2.6, points: water ? [[c.x, c.z - 8], [c.x + 1.5, c.z], [c.x, c.z + 8]] : [[c.x - 8, c.z], [c.x, c.z + 1.5], [c.x + 8, c.z]] };
    w.paths.push(q); stage.repaint(); autosave(); select({ kind: 'path', ref: q }); toast('노란 점을 끌어 모양을 바꿔요');
  }
});
function workshop(base) {
  openWorkshop({
    world: st.world, chars, base, packBase: PACK_URL,
    onSave: async (key, meta) => {
      snap(); (st.world.chars ||= {})[key] = meta; chars = await allChars(st.world);
      for (const a of st.world.actors.filter(a => a.sheet === key)) { stage.removeActor(a.name); await stage.addActor(a, chars); }
      autosave(); st.open.actor = true; await drawPalette(); setTool('actor:' + key);
      toast(`「${meta.name}」(을)를 만들었어요. 책장을 누르면 놓여요`);
    },
  });
}
function setTool(t) {
  st.tool = t; drawPalette();
  const name = t ? (t.startsWith('obj:') ? LIB[t.slice(4)].name : t.startsWith('actor:') ? chars[t.slice(6)].name : '자리') : '';
  hint(t ? `책장을 누르면 「${name}」(이)가 놓여요 · Esc 그만` : '');
  $('mView').style.cursor = t ? 'copy' : '';
}

// ───── 고르기·표시 ─────
const selRing = new T.Mesh(new T.RingGeometry(1.2, 1.45, 40), new T.MeshBasicMaterial({ color: '#d9634f', transparent: true, opacity: 0.9, depthWrite: false }));
selRing.rotation.x = -Math.PI / 2; selRing.position.y = 0.08; selRing.visible = false;
let handles = [], pathLine = null;
function select(sel, focus) {
  st.sel = sel && sel.ref ? sel : null;
  clearHandles();
  if (st.sel && st.sel.kind === 'path') makeHandles();
  if (focus && st.sel) { const p = selPos(); if (p) stage.cam.target.set(p.x, 0, p.z); }
  drawProps(); if (stage) drawPalette();
}
function selPos() {
  const s = st.sel; if (!s) return null;
  if (s.kind === 'obj') return { x: s.ref.x, z: s.ref.z };
  if (s.kind === 'actor' || s.kind === 'spot') return { x: s.ref.x, z: s.ref.z };
  if (s.kind === 'player') return st.world.player;
  if (s.kind === 'path') { const m = s.ref.points[Math.floor(s.ref.points.length / 2)]; return { x: m[0], z: m[1] }; }
  return null;
}
function clearHandles() { for (const h of handles) stage.scene.remove(h); handles = []; if (pathLine) { stage.scene.remove(pathLine); pathLine = null; } }
function makeHandles() {
  const q = st.sel.ref;
  q.points.forEach((p, i) => {
    const h = inked(new T.SphereGeometry(0.5, 14, 10), i === 0 ? '#8fd18a' : '#ffd25a', 1.15);
    h.position.set(p[0], 0.5, p[1]); h.traverse(m => { m.userData.handle = i; });
    stage.scene.add(h); handles.push(h);
  });
  drawPathLine();
}
function drawPathLine() {
  if (pathLine) stage.scene.remove(pathLine);
  const pts = st.sel.ref.points.map(([x, z]) => new T.Vector3(x, 0.15, z));
  pathLine = new T.Line(new T.BufferGeometry().setFromPoints(pts.length > 1 ? new T.CatmullRomCurve3(pts, false, 'centripetal').getPoints(80) : pts), new T.LineBasicMaterial({ color: '#d9634f' }));
  stage.scene.add(pathLine);
}

// ───── 오른쪽 속성 ─────
const FIELD = {
  s: ['크기', 'range', 0.3, 3, 0.05], r: ['회전(도)', 'range', -180, 180, 15], color: ['색', 'color'], text: ['글씨', 'text'],
  w: ['너비', 'range', 1, 40, 0.5], h: ['높이', 'range', 1, 14, 0.5], y: ['떠 있는 높이', 'range', 2, 22, 0.5], seed: ['모양 번호', 'number'],
};
function field(key, val, [label, type, min, max, step]) {
  if (type === 'range') return `<label>${label} <span class="val">${val}</span><input type="range" data-k="${key}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
  if (type === 'color') return `<label>${label}<input type="color" data-k="${key}" value="${val || '#ffffff'}"></label>`;
  if (type === 'number') return `<label>${label}<input type="number" data-k="${key}" value="${val ?? 0}"></label>`;
  return `<label>${label}<input type="text" data-k="${key}" value="${esc(val)}"></label>`;
}
function drawProps() {
  const p = $('mProps'), s = st.sel, w = st.world;
  p.className = 'props';
  if (!s) {
    const B = w.book, tx = B.texts || {};
    p.innerHTML = `<h3>📕 책 설정</h3>
      <label>세계 이름<input type="text" data-book="title" value="${esc(w.title)}"></label>
      <label>만든 사람<input type="text" data-book="author" value="${esc(w.author)}"></label>
      <label>세계 id(파일·기록용, 영문)<input type="text" data-book="id" value="${esc(w.id)}"></label>
      <label>왼쪽 위 글씨<input type="text" data-text="tl" value="${esc(tx.tl)}"></label>
      <label>오른쪽 위 글씨<input type="text" data-text="tr" value="${esc(tx.tr)}"></label>
      <label>왼쪽 아래 글씨<input type="text" data-text="bl" value="${esc(tx.bl)}"></label>
      <label>오른쪽 아래 글씨<input type="text" data-text="br" value="${esc(tx.br)}"></label>
      <label>표지 색<input type="color" data-book="cover" value="${B.cover || '#b4533f'}"></label>
      <label><input type="checkbox" data-book="grass" ${B.grass !== false ? 'checked' : ''}> 풀밭 물감</label>
      <label>꽃 점 <span class="val">${B.flowers ?? 300}</span><input type="range" data-book="flowers" min="0" max="800" step="20" value="${B.flowers ?? 300}"></label>
      <div class="btns"><button id="bScatter">🌳 나무 자동 심기</button><button id="bClearNature" class="danger">자연 물건 모두 치우기</button></div>
      <p class="hint">자동 심기는 길·개울·자리·인물을 피해서 심어요. 마음에 안 들면 ↶ 되돌리기.</p>`;
    return;
  }
  if (s.kind === 'obj') {
    const o = s.ref, def = LIB[o.type];
    p.innerHTML = `<h3>${def.icon} ${esc(def.name)}</h3>${def.props.map(k => field(k, o[k] ?? def.def[k] ?? 0, FIELD[k])).join('')}
      <label>코드 이름 <input type="text" data-name="1" value="${esc(o.name || '')}" placeholder="(없음)"></label>
      <p class="hint">이름을 붙이면 코드에서 부를 수 있어요. 예: 징검돌1.색("#ffcc00")</p>
      <div class="btns"><button id="bDup">복사 (Ctrl+D)</button><button id="bDel" class="danger">지우기 (Del)</button></div>`;
  } else if (s.kind === 'actor') {
    const a = s.ref;
    p.innerHTML = `<h3>🙂 인물</h3>
      <label>이름(코드에서 부르는 이름)<input type="text" data-aname="1" value="${esc(a.name)}"></label>
      <label>그림<select data-a="sheet">${Object.entries(chars).map(([k, c]) => `<option value="${k}" ${k === a.sheet ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label>처음 보는 쪽<select data-a="dir">${['앞', '뒤', '왼쪽', '오른쪽'].map(d => `<option ${d === (a.dir || '앞') ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      <label>떠 있는 높이 <span class="val">${a.lift || 0}</span><input type="range" data-a="lift" min="0" max="3" step="0.1" value="${a.lift || 0}"></label>
      <p class="hint">그루터기 위에 세우려면 0.7</p>
      <div class="btns"><button id="bPaint">🎨 이 인물 그림 고치기</button><button id="bDel" class="danger">지우기 (Del)</button></div>`;
  } else if (s.kind === 'player') {
    p.innerHTML = `<h3>🧒 나(학생)</h3><p>놀이를 시작할 때 학생이 서는 자리예요. 끌어서 옮겨요.</p><p class="hint">학생 모습은 기록장의 아바타 색으로 바뀌어요. 코드에서는 <b>나</b>.</p>`;
  } else if (s.kind === 'spot') {
    p.innerHTML = `<h3>📍 자리</h3><label>이름<input type="text" data-sname="1" value="${esc(s.ref.name)}"></label>
      <p class="hint">코드 예: 토끼.걷기(${esc(s.ref.name)}, 3)</p><div class="btns"><button id="bDel" class="danger">지우기 (Del)</button></div>`;
  } else if (s.kind === 'path') {
    const q = s.ref;
    p.innerHTML = `<h3>${q.kind === 'water' ? '💧 개울' : '🟫 길'}</h3><label>이름<input type="text" data-pname="1" value="${esc(q.name)}"></label>
      <label>종류<select data-p="kind"><option value="dirt" ${q.kind !== 'water' ? 'selected' : ''}>흙길</option><option value="water" ${q.kind === 'water' ? 'selected' : ''}>개울</option></select></label>
      <label>폭 <span class="val">${q.width}</span><input type="range" data-p="width" min="1" max="6" step="0.2" value="${q.width}"></label>
      <p>점 ${q.points.length}개 · 초록 점이 처음(0%)</p>
      <div class="btns"><button id="bAddPt">+ 점 더하기</button><button id="bRemPt">− 끝 점 빼기</button><button id="bRevPt">⇄ 방향 바꾸기</button><button id="bDel" class="danger">길 지우기</button></div>
      <p class="hint">코드 예: 토끼.길따라(${esc(q.name)}, 0, 100, 3)</p>`;
  }
}
$('mProps').addEventListener('input', e => {
  const t = e.target, s = st.sel, w = st.world, d = t.dataset;
  const v = t.type === 'range' || t.type === 'number' ? Number(t.value) : t.type === 'checkbox' ? t.checked : t.value;
  if (t.type === 'range') { const lab = t.closest('label').querySelector('.val'); if (lab) lab.textContent = v; }
  if (!s) {
    if (d.book === 'title') { w.title = v; $('mTitle').value = v; }
    else if (d.book === 'author') w.author = v;
    else if (d.book === 'id') w.id = String(v).replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'my-world';
    else if (d.book) { w.book[d.book] = v; schedule(d.book === 'cover' ? 'book' : 'repaint'); }
    else if (d.text) { (w.book.texts ||= {})[d.text] = v; schedule('repaint'); }
    autosave(); return;
  }
  if (s.kind === 'obj' && d.k) { s.ref[d.k] = v; schedule('obj'); }
  if (s.kind === 'actor' && d.a) { s.ref[d.a] = v; schedule('actor'); }
  if (s.kind === 'path' && d.p) { s.ref[d.p] = v; schedule('repaint'); }
  autosave();
});
let pending = new Set(), schedT = null;
function schedule(kind) {
  if (!st.snapped) { snap(); st.snapped = true; }
  pending.add(kind); clearTimeout(schedT);
  schedT = setTimeout(async () => {
    const k = pending; pending = new Set(); st.snapped = false;
    if (k.has('book')) return reload();
    if (k.has('repaint')) stage.repaint();
    if (k.has('obj') && st.sel?.kind === 'obj') stage.updateObject(st.sel.ref);
    if (k.has('actor') && st.sel?.kind === 'actor') { const a = st.sel.ref; stage.removeActor(a.name); await stage.addActor(a); }
  }, 120);
}
$('mProps').addEventListener('change', e => {
  const t = e.target, s = st.sel, d = t.dataset, v = t.value.trim();
  const rename = (oldName, apply) => {
    if (v === oldName) return;
    if (!v) { t.value = oldName; return toast('이름을 비울 수 없어요'); }
    if (!validName(v)) { t.value = oldName; return toast('이름은 글자로 시작하고 띄어쓰기·기호 없이 써요'); }
    if (allNames().has(v)) { t.value = oldName; return toast('이미 있는 이름이에요'); }
    snap(); apply(v); renameInCode(oldName, v); autosave(); drawPalette();
  };
  if (s?.kind === 'obj' && d.name) {
    const old = s.ref.name || '';
    if (!v) { snap(); delete s.ref.name; autosave(); return; }
    if (!validName(v)) { t.value = old; return toast('이름은 글자로 시작하고 띄어쓰기·기호 없이 써요'); }
    if (v !== old && allNames().has(v)) { t.value = old; return toast('이미 있는 이름이에요'); }
    snap(); s.ref.name = v; if (old) renameInCode(old, v); autosave();
  }
  if (s?.kind === 'actor' && d.aname) rename(s.ref.name, async n => { stage.removeActor(s.ref.name); s.ref.name = n; await stage.addActor(s.ref); });
  if (s?.kind === 'spot' && d.sname) rename(s.ref.name, n => { stage.unmarkSpot(s.ref); s.ref.name = n; stage.markSpot(s.ref); });
  if (s?.kind === 'path' && d.pname) rename(s.ref.name, n => { s.ref.name = n; stage.repaint(); });
});
$('mProps').addEventListener('click', e => {
  const id = e.target.id, s = st.sel, w = st.world;
  if (id === 'bDel') return removeSel();
  if (id === 'bPaint') return workshop(s.ref.sheet);
  if (id === 'bDup') return duplicate();
  if (id === 'bAddPt' || id === 'bRemPt' || id === 'bRevPt') {
    const q = s.ref; snap();
    if (id === 'bAddPt') { const a = q.points[q.points.length - 1], b = q.points[q.points.length - 2] || [a[0] - 4, a[1]]; q.points.push([r2(a[0] + (a[0] - b[0]) * 0.8), r2(a[1] + (a[1] - b[1]) * 0.8)]); }
    if (id === 'bRemPt') { if (q.points.length <= 2) return toast('길에는 점이 두 개는 있어야 해요'); q.points.pop(); }
    if (id === 'bRevPt') q.points.reverse();
    stage.repaint(); clearHandles(); makeHandles(); drawProps(); autosave();
  }
  if (id === 'bScatter') {
    snap(); const add = scatter(w, stage.curves, { seed: Math.floor(Math.random() * 1e6) });
    w.objects.push(...add); add.forEach(o => stage.addObject(o)); autosave(); toast(`${add.length}개를 심었어요`);
  }
  if (id === 'bClearNature') {
    snap(); const n = w.objects.length;
    w.objects = w.objects.filter(o => !NATURE.includes(o.type) || o.name); reload(); autosave(); toast(`${n - w.objects.length}개를 치웠어요(이름 붙은 것은 남김)`);
  }
});
function removeSel() {
  const s = st.sel, w = st.world; if (!s || s.kind === 'player') return;
  snap();
  if (s.kind === 'obj') { w.objects.splice(w.objects.indexOf(s.ref), 1); stage.removeObject(s.ref.id); }
  if (s.kind === 'actor') { w.actors.splice(w.actors.indexOf(s.ref), 1); stage.removeActor(s.ref.name); }
  if (s.kind === 'spot') { w.spots.splice(w.spots.indexOf(s.ref), 1); stage.unmarkSpot(s.ref); }
  if (s.kind === 'path') { w.paths.splice(w.paths.indexOf(s.ref), 1); stage.repaint(); }
  const name = s.ref.name; select(null); autosave();
  if (name && new RegExp(`(?<![\\p{L}\\p{N}_])${name}(?![\\p{L}\\p{N}_])`, 'u').test(w.code)) toast(`코드에 아직 '${name}'(이)가 있어요. 코드도 고쳐 주세요`);
}
function duplicate() {
  const s = st.sel; if (!s || s.kind !== 'obj') return;
  snap(); const o = JSON.parse(JSON.stringify(s.ref)); delete o.id; if (o.name) o.name = freeName(o.name); o.x = r2(o.x + 2); o.z = r2(o.z + 1);
  st.world.objects.push(o); stage.addObject(o); select({ kind: 'obj', ref: o }); autosave();
}

// ───── 무대 위 누르기·끌기 ─────
function bindView() {
  const cv = stage.canvas;
  let press = null;
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', async e => {
    if (st.playing || st.tab !== 'map') return;
    cv.setPointerCapture(e.pointerId);
    const g = stage.groundAt(e.clientX, e.clientY);
    if (e.button === 2) { press = { kind: 'rotate', x: e.clientX, yaw: stage.cam.yawTo }; return; }
    // 놓기
    if (st.tool && g) {
      stage.clamp(g); snap();
      const w = st.world, x = r2(g.x), z = r2(g.z);
      if (st.tool.startsWith('obj:')) { const o = { type: st.tool.slice(4), x, z }; w.objects.push(o); stage.addObject(o); select({ kind: 'obj', ref: o }); }
      else if (st.tool.startsWith('actor:')) { const k = st.tool.slice(6), a = { name: freeName(chars[k].name), sheet: k, x, z }; w.actors.push(a); await stage.addActor(a); select({ kind: 'actor', ref: a }); }
      else if (st.tool === 'spot') { const sp = { name: freeName('자리'), x, z }; w.spots.push(sp); stage.markSpot(sp); select({ kind: 'spot', ref: sp }); }
      autosave(); if (!e.shiftKey && st.tool !== 'spot' && !st.tool.startsWith('obj:')) setTool(null);
      return;
    }
    // 길 점 손잡이
    const ray = stage.pickRay(e.clientX, e.clientY);
    const hh = handles.length ? ray.intersectObjects(handles, true)[0] : null;
    if (hh) { snap(); press = { kind: 'handle', i: hh.object.userData.handle }; return; }
    const hit = stage.pick(e.clientX, e.clientY);
    if (hit && g) {
      let sel = null;
      if (hit.obj) sel = { kind: 'obj', ref: hit.obj.o };
      else if (hit.actor) sel = hit.actor === stage.me ? { kind: 'player', ref: st.world.player } : { kind: 'actor', ref: hit.actor.data };
      else if (hit.spot) sel = { kind: 'spot', ref: hit.spot };
      if (sel) {
        if (st.sel?.ref !== sel.ref) select(sel);
        const p = selPos(); press = { kind: 'move', dx: p.x - g.x, dz: p.z - g.z, moved: false };
        return;
      }
    }
    if (st.sel && st.sel.kind !== 'path') select(null);
    if (g) press = { kind: 'pan', g, t: stage.cam.target.clone() };
  });
  cv.addEventListener('pointermove', e => {
    if (!press) return;
    if (press.kind === 'rotate') { stage.cam.yawTo = press.yaw - (e.clientX - press.x) * 0.008; return; }
    const g = stage.groundAt(e.clientX, e.clientY); if (!g) return;
    if (press.kind === 'pan') { stage.cam.target.add(press.g.clone().sub(g)); stage.cam.target.y = 0; return; }
    stage.clamp(g);
    if (press.kind === 'handle') {
      const q = st.sel.ref; q.points[press.i] = [r2(g.x), r2(g.z)];
      handles[press.i].position.set(g.x, 0.5, g.z); drawPathLine(); return;
    }
    if (press.kind === 'move') {
      if (!press.moved) { snap(); press.moved = true; }
      const x = r2(g.x + press.dx), z = r2(g.z + press.dz), s = st.sel;
      if (s.kind === 'obj') { s.ref.x = x; s.ref.z = z; const rec = stage.objs.get(s.ref.id); if (rec) stage.placeObject(rec); }
      if (s.kind === 'actor') { s.ref.x = x; s.ref.z = z; const a = stage.actors.get(s.ref.name); if (a) a.place(s.ref); }
      if (s.kind === 'player') { st.world.player = { x, z }; s.ref = st.world.player; stage.me.place(st.world.player); }
      if (s.kind === 'spot') { s.ref.x = x; s.ref.z = z; const m = stage.spotMarks.get(s.ref); if (m) m.g.position.set(x, 0, z); }
    }
  });
  cv.addEventListener('pointerup', () => {
    if (!press) return; const p = press; press = null;
    if (p.kind === 'rotate') stage.cam.yawTo = Math.round(stage.cam.yawTo / (Math.PI / 4)) * (Math.PI / 4);
    if (p.kind === 'handle') { stage.repaint(); autosave(); }
    if (p.kind === 'move' && p.moved) autosave();
  });
  cv.addEventListener('wheel', e => { if (!st.playing) stage.cam.distTo = Math.min(90, Math.max(12, stage.cam.distTo + e.deltaY * 0.03)); }, { passive: true });
  const keys = new Set();
  addEventListener('keydown', e => {
    if (st.playing) return;
    const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.closest('.CodeMirror, .blocklyWidgetDiv, #mBlocks');
    if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === 'z') { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === 'y') { e.preventDefault(); return redo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); return saveFile(); }
    if (typing || st.tab !== 'map') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); return duplicate(); }
    const k = e.key.toLowerCase();
    if (k === 'escape') { setTool(null); select(null); }
    if (k === 'delete' || k === 'backspace') removeSel();
    if (k === 'q') stage.turn(-1); if (k === 'e') stage.turn(1);
    if (k === 't') toggleTop();
    if (k === 'h') stage.cam.target.set(st.world.player.x, 0, st.world.player.z);
    if (k === 'r' && st.sel?.kind === 'obj' && LIB[st.sel.ref.type].props.includes('r')) { snap(); let r = (st.sel.ref.r || 0) + 45; if (r > 180) r -= 360; st.sel.ref.r = r; stage.placeObject(stage.objs.get(st.sel.ref.id)); drawProps(); autosave(); }
    keys.add(k);
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  const prev = stage.onUpdate;
  stage.onUpdate = dt => {
    prev && prev(dt);
    if (st.playing) { selRing.visible = false; return; }
    const { fwd, right } = stage.basis(), v = new T.Vector3();
    if (keys.has('w') || keys.has('arrowup')) v.add(fwd); if (keys.has('s') || keys.has('arrowdown')) v.sub(fwd);
    if (keys.has('d') || keys.has('arrowright')) v.add(right); if (keys.has('a') || keys.has('arrowleft')) v.sub(right);
    if (v.lengthSq()) stage.cam.target.addScaledVector(v.normalize(), dt * stage.cam.dist * 0.7);
    const p = selPos();
    selRing.visible = !!p && st.sel.kind !== 'path';
    if (p) { selRing.position.x = p.x; selRing.position.z = p.z; selRing.material.opacity = 0.6 + Math.sin(performance.now() / 200) * 0.3; }
  };
}
function toggleTop() { const top = stage.cam.elTo < 1.2; stage.cam.elTo = top ? 1.45 : 0.9; $('mTop2').textContent = top ? '↗ 비스듬히' : '⬇ 위에서'; }

// ───── 탭: 꾸미기 · 블록 · 코드 ─────
let cm = null, ws = null, blocksMod = null, wsLoading = false, wsTimer = null;
async function showTab(tab) {
  if (st.playing) return;
  if (st.tab === 'blocks' && ws && tab !== 'blocks') flushBlocks();
  if (tab === 'blocks') { const ok = await openBlocks(); if (!ok) return; }
  if (tab === 'code') await openCode();
  st.tab = tab;
  for (const b of document.querySelectorAll('#mTabs button')) b.classList.toggle('on', b.dataset.tab === tab);
  $('mView').hidden = tab !== 'map'; $('mBlocks').hidden = tab !== 'blocks'; $('mCode').hidden = tab !== 'code';
  $('mPalette').hidden = tab !== 'map'; $('mProps').hidden = tab !== 'map';
  stage.tagLayer.hidden = tab !== 'map';
  if (tab === 'map') stage.resize();
  if (tab === 'blocks') window.Blockly.svgResize(ws);
  if (tab === 'code') cm.refresh();
}
document.querySelectorAll('#mTabs button').forEach(b => { b.onclick = () => showTab(b.dataset.tab); });

const REF = [
  ['말', [['토끼.말하기("안녕!");', '말풍선에 말하고 「다음」을 기다려요'], ['let 대답 = 이야기.묻기("어떻게 할까?", ["좋아", "싫어"]);', '보기 중 고른 번호(1, 2…)'], ['고른말()', '방금 고른 보기의 글'], ['다짐("나는 …");', '기록장에 남는 다짐']]],
  ['움직임', [['토끼.걷기(나, 3);', '대상까지 걷기 (빠르기)'], ['토끼.길따라(길, 0, 100, 3);', '길을 따라 시작%~끝%'], ['토끼.순간이동(나무앞);', '바로 옮기기'], ['부엉이.날기(나무앞);', '날아가기'], ['토끼.뛰기(1);', '깡충 한 번(높이)'], ['토끼.멈출때까지();', '걷기가 끝날 때까지 기다리기']]],
  ['모습·애니', [['토끼.애니("깡충");', '자동·서기·걷기·깡충·빙글·흔들'], ['토끼.프레임(1);', '시트 그림 번호 0~2로 고정'], ['토끼.보기("왼쪽");', '앞·뒤·왼쪽·오른쪽'], ['토끼.눕기();', '눕기(잠) / 일어나기()'], ['토끼.크기(1.5);', '몇 배 크기'], ['토끼.표정("😊");', '머리 위에 잠깐 띄우기'], ['토끼.숨기기();', '숨기기 / 보이기()']]],
  ['물건', [['찾기("징검돌1").색("#ffe27a");', '물건 색 바꾸기'], ['찾기("징검돌1").이름표("1");', '머리 위 글씨'], ['찾기("징검돌1").숨기기();', '숨기기 / 보이기()']]],
  ['흐름', [['쪽("둘째 쪽");', '새 쪽(이어 읽기 저장 단위)'], ['목표("토끼에게 가요", 토끼);', '할 일과 표시'], ['도착(토끼, 3);', '학생이 가까이 올 때까지'], ['누를때까지(찾기("징검돌1"));', '그것을 누를 때까지'], ['기다리기(1);', '초 단위'], ['따로(() => 토끼.걷기(나, 3));', '기다리지 않고 함께 하기'], ['누르면(토끼, () => {\n  토끼.뛰기(1);\n});', '누를 때마다'], ['가까이가면(토끼, () => {\n  토끼.표정("👋");\n});', '가까이 갈 때마다'], ['for (let i = 1; i <= 3; i++) {\n  토끼.뛰기(1);\n}', '반복'], ['if (대답 == 1) {\n  \n} else {\n  \n}', '만약/아니면']]],
  ['연출·끝', [['번쩍("짜잔!");', '화면 가운데 큰 글자'], ['꽃가루(나);', '꽃가루'], ['카메라(토끼);', '카메라가 비추기 (나 = 원래대로)'], ['끝내기({ 포인트: 10, 돌: ["용기의 돌"], 스티커: [] });', '끝 화면 · 기록장 저장']]],
  ['계산', [['무작위(1, 6)', '1~6 중 하나'], ['function 깡충깡충(누가) {\n  누가.뛰기(1);\n  누가.뛰기(1);\n}', '동작 만들기(함수)']]],
];
async function openCode() {
  if (!cm) {
    await loadLib('codemirror.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js');
    await loadLib('codemirror-javascript.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js');
    cm = window.CodeMirror($('mCm'), { value: st.world.code, mode: 'javascript', lineNumbers: true, indentUnit: 2, tabSize: 2, lineWrapping: true });
    let t = null;
    cm.on('change', () => { clearTimeout(t); t = setTimeout(() => { st.world.code = cm.getValue(); autosave(); }, 300); clearMarks(); });
    $('mRef').innerHTML = '<p class="small" style="margin:0">누르면 커서 자리에 넣어요. 이름(토끼·길…)은 내 세계에 맞게 바꿔요.</p>' +
      REF.map(([g, list]) => `<h4>${g}</h4>` + list.map(([c, d]) => `<button data-snip="${esc(c)}">${esc(c.split('\n')[0])}<span class="d">${esc(d)}</span></button>`).join('')).join('');
    $('mRef').onclick = e => { const b = e.target.closest('button'); if (!b) return; cm.replaceSelection(b.dataset.snip + '\n'); cm.focus(); };
  } else if (cm.getValue() !== st.world.code) cm.setValue(st.world.code);
  return true;
}
let marks = [];
function clearMarks() { for (const [l, c] of marks) cm.removeLineClass(l, 'background', c); marks = []; }
function markLine(n, cls) { if (!cm || !n) return; const h = cm.addLineClass(n - 1, 'background', cls); marks.push([h, cls]); cm.scrollIntoView({ line: n - 1, ch: 0 }, 120); }

async function openBlocks() {
  if (!window.acorn) await loadLib('acorn.js', 'https://cdn.jsdelivr.net/npm/acorn@8.11.3/dist/acorn.js');
  if (!window.Blockly) {
    hint('블록을 불러오는 중…');
    await loadLib('blockly_compressed.js', 'https://cdn.jsdelivr.net/npm/blockly@10.4.3/blockly_compressed.js');
    await loadLib('blockly-ko.js', 'https://cdn.jsdelivr.net/npm/blockly@10.4.3/msg/ko.js');
    hint('');
  }
  blocksMod = blocksMod || await import('./blocks.js');
  const w = st.world, C = blocksMod.ctx;
  C.actors = w.actors.map(a => a.name); C.paths = w.paths.map(p => p.name);
  C.targets = [...w.actors.map(a => a.name), ...w.spots.map(s => s.name), ...w.objects.filter(o => o.name).map(o => o.name)];
  C.extra = new Set();
  let json;
  try { json = blocksMod.codeToBlocks(w.code); }
  catch (e) { toast('코드에 틀린 곳이 있어 블록으로 못 바꿔요. 코드 탭에서 고쳐 주세요'); await showTab('code'); markLine(e.loc && e.loc.line, 'err-line'); return false; }
  blocksMod.defineBlocks();
  if (!ws) {
    ws = window.Blockly.inject('mBlocks', { media: BASE + 'vendor/blockly-media/', toolbox: blocksMod.toolbox(), renderer: 'zelos', trashcan: true, zoom: { controls: true, wheel: true, startScale: 0.8 }, move: { scrollbars: true, drag: true, wheel: false }, grid: { spacing: 24, length: 2, colour: '#e8dcc2', snap: true } });
    ws.addChangeListener(e => {
      if (wsLoading || e.isUiEvent) return;
      clearTimeout(wsTimer); wsTimer = setTimeout(flushBlocks, 400);
    });
  } else ws.updateToolbox(blocksMod.toolbox());
  wsLoading = true;
  ws.clear();
  try { window.Blockly.serialization.workspaces.load(json, ws); }
  catch (e) { console.error(e); toast('블록으로 바꾸다 문제가 생겼어요: ' + e.message); }
  setTimeout(() => { wsLoading = false; st.blockBase = blocksMod.blocksToCode(ws); }, 0);   // 불러온 직후 모습 — 이것과 같으면 글을 건드리지 않는다
  return true;
}
function tokens(src) {
  try {
    const out = [], com = [];
    for (const t of window.acorn.tokenizer(src, { ecmaVersion: 2022, onComment: (blk, text) => com.push(text.trim()) })) out.push(t.type.label + ':' + (t.value ?? ''));
    return out.join('') + '' + com.join('');
  } catch (e) { return src; }
}
function flushBlocks() {
  if (!ws || wsLoading) return;
  clearTimeout(wsTimer);
  const code = blocksMod.blocksToCode(ws);
  const same = code === st.blockBase || tokens(code) === tokens(st.world.code);   // 블록을 안 고쳤거나 빈 줄만 다르면 원래 글 그대로
  if (!same) { st.world.code = code; st.blockBase = code; autosave(); if (cm) cm.setValue(code); }
}

// ───── ▶ 해 보기 ─────
async function play() {
  if (st.playing) return stopPlay();
  if (st.tab === 'blocks') flushBlocks();
  if (cm && st.tab === 'code') st.world.code = cm.getValue();
  st.playing = true; document.body.classList.add('playing'); $('pError').hidden = true;
  $('mPlay').textContent = '■ 멈추기'; $('mPlay').className = 'stop'; $('mErr').hidden = true;
  st.returnTab = st.tab;
  $('mView').hidden = false; $('mBlocks').hidden = true; $('mCode').hidden = true; stage.tagLayer.hidden = false;
  clearHandles(); selRing.visible = false;
  stage.editor = false; await stage.load(st.world, { student: StudentMD.recall() }); stage.resize();
  stage.cam.follow = stage.me; stage.cam.elTo = 0.9; stage.cam.distTo = 34;
  player.start(st.world.code);
}
async function stopPlay() {
  player.stop();
  $('pEnd').hidden = true; $('pError').hidden = true;
  st.playing = false; document.body.classList.remove('playing');
  $('mPlay').textContent = '▶ 해 보기'; $('mPlay').className = 'play';
  stage.editor = true; await stage.load(st.world); stage.cam.follow = null; stage.cam.distTo = 44; stage.cam.elTo = 0.9;
  if (st.sel?.kind === 'path') makeHandles();
  const tab = st.returnTab || 'map'; st.tab = null; await showTab(tab);
}
$('mPlay').onclick = play;
$('mWorkshop').onclick = () => { if (!st.playing) workshop(); };
$('mErr').onclick = async () => { const n = +$('mErr').dataset.line; if (st.playing) await stopPlay(); await showTab('code'); clearMarks(); markLine(n, 'err-line'); };

// ───── 파일 ─────
function saveFile() {
  if (st.tab === 'blocks') flushBlocks();
  const blob = new Blob([JSON.stringify(st.world, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `${(st.world.title || '세계').replace(/[\\/:*?"<>|]/g, '')}.seoksan-world.json`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('세계 파일을 내려받았어요');
}
$('mSave').onclick = saveFile;
$('mShare').onclick = async () => {
  if (st.tab === 'blocks') flushBlocks();
  const author = prompt('반 도서관에 올려요. 만든 사람 이름을 써 주세요.', st.world.author || '');
  if (author === null) return;
  st.world.author = author.trim(); autosave();
  try {
    const r = await fetch(BASE + 'api/worlds/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ world: st.world, author: st.world.author }) }).then(r => r.json());
    if (r.error) return toast(r.error);
    toast('반 도서관에 올렸어요! 📚 세계 도서관에서 볼 수 있어요');
  } catch (e) { toast('선생님 컴퓨터(교실 서버)에 연결되어 있을 때만 올릴 수 있어요. 대신 💾 저장으로 파일을 나눠 주세요'); }
};
$('mOpen').onclick = () => {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = async () => { try { snap(); await openWorld(JSON.parse(await inp.files[0].text()), '세계를 열었어요'); } catch (e) { toast('열 수 없는 파일이에요'); } };
  inp.click();
};
$('mNew').onclick = async () => { if (!confirm('새 세계를 만들까요? 지금 세계는 💾 저장했나요?')) return; snap(); await openWorld(starter(), '새 세계예요. 왼쪽에서 물건을 골라 놓아 보세요'); };
$('mUndo').onclick = undo; $('mRedo').onclick = redo;
$('mTitle').oninput = e => { st.world.title = e.target.value; autosave(); };
$('mTurnL').onclick = () => stage.turn(-1); $('mTurnR').onclick = () => stage.turn(1);
$('mTop2').onclick = toggleTop; $('mHome').onclick = () => stage.cam.target.set(st.world.player.x, 0, st.world.player.z);
$('mHelpBtn').onclick = () => { $('mHelp').hidden = false; }; $('mHelpClose').onclick = () => { $('mHelp').hidden = true; };

// ───── 시작 ─────
(async () => {
  chars = await characters();
  stage = new Stage($('scene'), { editor: true });
  stage.scene.add(selRing);
  stage.cam.distTo = stage.cam.dist = 44;
  player = new Player(stage, {
    onError: (msg, line) => { const e = $('mErr'); e.hidden = false; e.dataset.line = line || 0; e.textContent = `⚠ ${line ? line + '줄: ' : ''}${msg}`; e.title = '눌러서 코드에서 보기'; },
    onLine: () => {},
    links: '<a href="#" onclick="document.getElementById(\'mPlay\').click();return false">■ 만들기로 돌아가기</a>',
  });
  bindView();
  const id = new URLSearchParams(location.search).get('w');
  let auto = null; try { auto = JSON.parse(localStorage.getItem(AUTOSAVE) || 'null'); } catch (e) { /* */ }
  let w = null;
  const share = new URLSearchParams(location.search).get('share');
  if (share) { w = await fetch(`${BASE}api/worlds/get?key=${encodeURIComponent(share)}`).then(r => r.json()).catch(() => null); if (w && w.error) w = null; if (!w) toast('도서관에서 세계를 못 찾았어요'); }
  else if (id) {
    w = await fetch(`${BASE}worlds/${encodeURIComponent(id)}/world.json`, { cache: 'no-store' }).then(r => r.json()).catch(() => null);
    if (w && auto && auto.world && auto.world.id === w.id && JSON.stringify(auto.world) !== JSON.stringify(w) && confirm('이 세계를 고치던 내용이 브라우저에 남아 있어요. 이어서 고칠까요?\n(취소 = 원래 세계로 시작)')) w = auto.world;
  } else if (auto && auto.world) w = auto.world;
  await openWorld(w || starter(), w ? '' : '새 세계예요. 왼쪽에서 물건을 골라 놓아 보세요');
  window.__maker = { st, stage, player, showTab, flushBlocks };
  if (new URLSearchParams(location.search).get('workshop')) workshop();   // 첫 화면 「도트 공방」에서 바로 열기
})();
