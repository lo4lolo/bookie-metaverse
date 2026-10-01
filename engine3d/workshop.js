/* 🎨 도트 공방 — 인물 그림(64칸 시트 3×3)을 고쳐 세계의 새 인물로 넣는다.
 * 시트: 가로 = 서기·걷기1·걷기2, 세로 = 앞·옆(오른쪽)·뒤. 결과는 세계 파일의 chars에 그림(dataURL)째 → 공유해도 따라간다.
 *
 * 기본 모델 지키기
 *  - 사람(승인 v5) 바탕: "서기" 두 칸(앞·뒤)만 고친다. 걷기 칸은 엔진이 다리·팔을 움직여 자동으로 만든다(옆은 아직 앞모습).
 *    그래서 몸 윤곽·다리·팔 자리를 바꾸면 걷기가 어색해진다 → 몸 바깥에 붙는 것은 "장식 층"에.
 *    승인 눈 14칸은 잠겨 있다. 발바닥 줄 아래는 그리지 않는다(그림자 자리).
 *  - 앞·뒤 모습은 좌우 대칭이 기본(머리 모양만 예외 — 대칭을 끄고 그림).
 *
 * 장식 층(움직임 규칙이 다름 → 엔진 actor.js가 칸을 골라 보여 줌)
 *  - 모자·장식(따라감): 몸과 같은 칸. 걸음에 맞춰 같이 통통.
 *  - 망토(펄럭): 가로 칸 = 가만히 · 펄럭1 · 펄럭2. 걸으면 1↔2, 빨리 달리면 2에 머묾, 서면 0으로 늘어짐. 앞·옆에서는 몸 뒤, 뒤에서는 몸 앞.
 *  - 날개(파닥): 가로 칸 = 접힘 · 반쯤 · 펼침. 서 있으면 천천히(0-1-0), 걸으면 1-2, 날거나 뛰면 빠르게 0-1-2-1. 앞·옆은 몸 뒤, 뒤는 몸 앞.
 */
import { loadCanvas, accFrame } from './actor.js';

const $ = id => document.getElementById(id);
const CELL = 64, Z = 7;
const ROWS = ['앞', '옆', '뒤'];
export const LAYERS = {
  body: { name: '몸', cols: ['서기', '걷기1', '걷기2'] },
  hat: { name: '모자·장식(따라감)', cols: ['서기', '걷기1', '걷기2'] },
  cape: { name: '망토(펄럭)', cols: ['가만히', '펄럭1', '펄럭2'] },
  wings: { name: '날개(파닥)', cols: ['접힘', '반쯤', '펼침'] },
};
/** 줄(방향)마다 그리는 순서 — 앞·옆은 망토·날개가 몸 뒤, 뒤는 몸 앞 */
export function drawOrder(row) { return row === 2 ? ['body', 'cape', 'wings', 'hat'] : ['cape', 'wings', 'body', 'hat']; }
let W = null;

function html() {
  const d = document.createElement('section'); d.id = 'ws'; d.className = 'sheet'; d.hidden = true;
  d.innerHTML = `<div class="paper wsBox">
    <div class="wsHead"><h2>🎨 도트 공방</h2>
      <label>바탕 <select id="wsBase"></select></label>
      <label>이름 <input id="wsName" maxlength="10" placeholder="새 친구"></label>
      <span class="grow"></span>
      <button id="wsSave" class="big">✅ 세계에 넣기</button><button id="wsClose" class="big soft">닫기</button></div>
    <div class="wsBody">
      <div class="wsLeft">
        <div class="wsLayers" id="wsLayers"></div>
        <div class="wsTools">
          <button data-tool="pen" class="on" title="그리기 (B)">✏ 그리기</button><button data-tool="erase" title="지우기 (E)">🧽 지우기</button>
          <button data-tool="fill" title="같은 색 칸 채우기 (G)">🪣 채우기</button><button data-tool="pick" title="색 고르기 (I)">💧 색 고르기</button>
          <input type="color" id="wsColor" value="#d9634f" title="그릴 색">
          <button id="wsUndo" title="되돌리기 (Ctrl+Z)">↶</button>
        </div>
        <canvas id="wsBig" width="${CELL * Z}" height="${CELL * Z}"></canvas>
        <div class="wsOpts">
          <label><input type="checkbox" id="wsMirror" checked> 좌우 대칭으로 그리기 (앞·뒤)</label>
          <label><input type="checkbox" id="wsAll"> 같은 방향 3칸에 함께 그리기</label>
          <label><input type="checkbox" id="wsGuide" checked> 기본 윤곽·발바닥 줄 보기</label>
        </div>
        <p id="wsWarn" class="small"></p>
      </div>
      <div class="wsRight">
        <div id="wsRules" class="wsRules"></div>
        <p class="small">칸을 눌러 고를 그림을 바꿔요</p>
        <canvas id="wsSheet" width="384" height="384"></canvas>
        <div class="wsPrev"><canvas id="wsAnim" width="192" height="192"></canvas>
          <div><label>방향 <select id="wsDir"><option value="0">앞</option><option value="1">옆</option><option value="2">뒤</option></select></label>
          <label>움직임 <select id="wsMove"><option value="idle">서 있기</option><option value="walk" selected>걷기</option><option value="run">달리기·날기</option></select></label></div></div>
        <div class="wsBtns" id="wsPresets"></div>
        <p class="small"><b>색 바꾸기</b> — 동그라미를 누르면 지금 층의 그 색이 모든 칸에서 한꺼번에 바뀌어요</p>
        <div id="wsColors"></div>
        <div class="wsBtns"><button id="wsReset">이 층 처음으로</button><button id="wsPng">PNG 내려받기</button></div>
      </div>
    </div></div>`;
  document.body.append(d);
  const css = document.createElement('style');
  css.textContent = `
  #ws { z-index: 60; }
  #ws .wsBox { width: min(1100px, 100%); max-width: none; text-align: left; padding: 14px 18px; }
  .wsHead { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .wsHead h2 { margin: 0 6px 0 0; }
  .wsHead .grow { flex: 1; }
  .wsHead select, .wsHead input, .wsPrev select { font: inherit; border: 2px solid var(--ink); border-radius: 10px; padding: 3px 8px; }
  .wsBody { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; }
  .wsLayers { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px; }
  .wsLayers button { border: 2px solid var(--ink); border-radius: 999px; background: #fff; padding: 2px 10px; font-size: 14px; }
  .wsLayers button.on { background: var(--red); color: #fff; }
  .wsTools { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin-bottom: 6px; }
  .wsTools button, .wsBtns button { border: 2px solid var(--ink); border-radius: 10px; background: #fff; padding: 3px 9px; font-size: 15px; }
  .wsTools button.on { background: var(--gold); }
  .wsTools input[type=color] { width: 44px; height: 32px; border: 2px solid var(--ink); border-radius: 8px; }
  #wsBig { width: ${CELL * Z}px; max-width: 100%; image-rendering: pixelated; border: 2px solid var(--ink); border-radius: 8px; cursor: crosshair; touch-action: none; background: #fff; }
  #wsSheet { width: 320px; image-rendering: pixelated; border: 2px solid var(--ink); border-radius: 8px; cursor: pointer; background: #f3e8cf; }
  .wsPrev { display: flex; gap: 10px; align-items: center; margin: 8px 0; }
  #wsAnim { width: 120px; height: 120px; image-rendering: pixelated; background: radial-gradient(#fff8e6, #f0e2c2); border: 2px solid var(--ink); border-radius: 12px; }
  .wsPrev label { display: block; font-size: 14px; margin: 2px 0; }
  #wsColors { display: flex; flex-wrap: wrap; gap: 5px; max-width: 340px; }
  #wsColors button { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--ink); }
  .wsOpts label { display: block; font-size: 14px; }
  .wsBtns { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
  .wsRules { background: #fff8e0; border: 2px dashed #e8b84a; border-radius: 12px; padding: 6px 10px; font-size: 13.5px; line-height: 1.5; max-width: 360px; }
  .wsRules b { color: var(--red); }
  #wsWarn { color: #a0362a; max-width: ${CELL * Z}px; }`;
  document.head.append(css);
}

const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const blank = () => { const c = document.createElement('canvas'); c.width = c.height = CELL * 3; return c; };
function topRow(ctx, r, c) { const d = ctx.getImageData(c * CELL, r * CELL, CELL, CELL).data; for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) if (d[(y * CELL + x) * 4 + 3]) return y; return 0; }

export function openWorkshop({ world, chars, base, onSave, packBase }) {
  if (!$('ws')) html();
  W = { world, chars, onSave, packBase, row: 0, col: 0, layer: 'body', tool: 'pen', undo: [], drawing: false };
  const opts = [['__v5', '사람(학생 아바타 바탕)'], ...Object.entries(chars).map(([k, c]) => [k, `${c.name}${world.chars && world.chars[k] ? ' (내가 만든)' : ''}`])];
  $('wsBase').innerHTML = opts.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
  $('wsBase').value = base && opts.some(o => o[0] === base) ? base : '__v5';
  $('ws').hidden = false;
  bind();
  loadBase($('wsBase').value);
}

async function loadBase(key) {
  const L = { body: blank(), hat: blank(), cape: blank(), wings: blank() };
  const mine = W.world.chars && W.world.chars[key];
  const meta = key === '__v5' ? null : W.chars[key];
  W.v5 = key === '__v5' || (meta && meta.base === 'v5');
  if (key === '__v5') {
    const x = L.body.getContext('2d');
    x.drawImage(AvatarV5.sheet(null), 0, 0);
    W.meta = { name: '친구', foot: 60, tagH: 4.1, hop: 0.1, faceTop: 0 };
  } else {
    L.body.getContext('2d').drawImage(await loadCanvas(meta.src.startsWith('data:') ? meta.src : W.packBase + meta.src), 0, 0);
    for (const a of meta.acc || []) if (L[a.kind]) L[a.kind].getContext('2d').drawImage(await loadCanvas(a.src), 0, 0);
    W.meta = { name: meta.name, foot: meta.foot || 62, tagH: meta.tagH || 4, hop: meta.hop ?? 0.15, faceTop: meta.faceTop || 0 };
  }
  // 기본 윤곽은 바탕(원본)의 몸 — 사람이면 승인 v5
  const ref = blank(); ref.getContext('2d').drawImage(W.v5 ? AvatarV5.sheet(null) : L.body, 0, 0);
  W.ref = ref.getContext('2d').getImageData(0, 0, CELL * 3, CELL * 3);
  W.L = L; W.key = key; W.mine = !!mine; W.undo = [];
  W.orig = Object.fromEntries(Object.entries(L).map(([k, c]) => [k, c.getContext('2d').getImageData(0, 0, CELL * 3, CELL * 3)]));
  W.eyes = new Set(W.v5 ? AvatarV5.eyes.map(([x, y]) => y * CELL + x) : []);
  $('wsName').value = mine ? meta.name : (key === '__v5' ? '친구' : meta.name + '친구');
  W.row = 0; W.col = 0; setLayer('body');
}

function rules() {
  const v5 = W.v5;
  $('wsRules').innerHTML = `<b>기본 모델 지키기</b><br>
    ${v5 ? '• 사람은 <b>앞·뒤 「서기」 두 칸만</b> 고쳐요. 걷기는 엔진이 다리·팔을 움직여 자동으로 만들어요(옆은 아직 앞모습).<br>• <b>몸 윤곽(빨간 점선)·팔·다리 자리는 그대로</b> 두세요. 바뀌면 걷는 모습이 어색해져요.<br>• 눈 14칸은 잠겨 있어요(승인 그림).<br>' : '• 걷기 칸끼리 몸 위치가 같아야 걸을 때 흔들리지 않아요.<br>'}
    • 앞·뒤는 <b>좌우 대칭</b>(머리 모양만 예외 — 그때만 대칭 끄기).<br>
    • <b>파란 줄</b>(발바닥) 아래는 그리지 않아요. 64칸 밖으로 나가지 않아요.<br>
    • 외곽선은 짙은 갈색 1칸. 새 색보다 <b>색 바꾸기</b>가 그림체를 지켜요.<br>
    • 모자·망토·날개처럼 몸 밖에 붙는 것은 <b>장식 층</b>에 그려요. 층마다 움직이는 법이 달라요.`;
  const pre = $('wsPresets');
  pre.innerHTML = W.layer === 'cape' ? '<button id="wsPreCape">🧣 망토 본보기 그리기</button>' : W.layer === 'wings' ? '<button id="wsPreWings">🪽 날개 본보기 그리기</button>' : W.layer === 'hat' ? '<button id="wsPreHat">👑 왕관 본보기 그리기</button>' : '';
  const p = $('wsPreCape') || $('wsPreWings') || $('wsPreHat');
  if (p) p.onclick = () => { snap(); preset(W.layer); redraw(); };
}
function setLayer(k) {
  W.layer = k;
  $('wsLayers').innerHTML = Object.entries(LAYERS).map(([key, l]) => `<button data-layer="${key}" class="${key === k ? 'on' : ''}">${l.name}</button>`).join('');
  $('wsAll').checked = k === 'hat';
  fixCell(); rules(); redraw();
}
/** 사람 몸 층은 서기 칸(앞·뒤)만 고칠 수 있다 */
function fixCell() { if (W.v5 && W.layer === 'body') { W.col = 0; if (W.row === 1) W.row = 0; } $('wsMirror').checked = W.row !== 1; }

function snap() { W.undo.push(Object.fromEntries(Object.entries(W.L).map(([k, c]) => [k, c.getContext('2d').getImageData(0, 0, CELL * 3, CELL * 3)]))); if (W.undo.length > 40) W.undo.shift(); }
function undo() { const s = W.undo.pop(); if (!s) return; for (const [k, d] of Object.entries(s)) W.L[k].getContext('2d').putImageData(d, 0, 0); redraw(); }
const ctx = () => W.L[W.layer].getContext('2d');

/** 사람 바탕: 서기 칸을 고치면 걷기 칸·옆 줄을 다시 만든다 */
function regen() {
  if (!W.v5) return;
  const x = W.L.body.getContext('2d');
  for (const [row, view] of [[0, 'front'], [2, 'back']]) {
    const frames = AvatarV5.walk(x.getImageData(0, row * CELL, CELL, CELL), view);
    frames.forEach((d, c) => x.putImageData(d, c * CELL, row * CELL));
  }
  for (let c = 0; c < 3; c++) x.putImageData(x.getImageData(c * CELL, 0, CELL, CELL), c * CELL, CELL);
}

function composite(target, row, col, cols) {
  const t = target.getContext('2d');
  for (const k of drawOrder(row)) {
    const c = cols ? cols[k] : col;
    t.drawImage(W.L[k], c * CELL, row * CELL, CELL, CELL, 0, 0, CELL, CELL);
  }
}
function redraw() {
  const b = $('wsBig').getContext('2d'); b.imageSmoothingEnabled = false;
  b.fillStyle = '#ffffff'; b.fillRect(0, 0, CELL * Z, CELL * Z);
  for (let y = 0; y < CELL; y += 2) for (let x = (y / 2) % 2 ? 0 : 2; x < CELL; x += 4) { b.fillStyle = '#f2ece0'; b.fillRect(x * Z, y * Z, Z * 2, Z * 2); }
  // 다른 층은 흐리게, 지금 층은 진하게
  const cell = document.createElement('canvas'); cell.width = cell.height = CELL;
  for (const k of drawOrder(W.row)) {
    b.globalAlpha = k === W.layer ? 1 : 0.35;
    b.drawImage(W.L[k], W.col * CELL, W.row * CELL, CELL, CELL, 0, 0, CELL * Z, CELL * Z);
  }
  b.globalAlpha = 1;
  if ($('wsGuide').checked) {
    // 기본 윤곽(빨간 점), 발바닥 줄(파랑), 잠긴 눈(자물쇠 테두리)
    const d = W.ref.data, ox = W.col * CELL, oy = W.row * CELL, at = (x, y) => d[((oy + y) * CELL * 3 + ox + x) * 4 + 3];
    b.fillStyle = 'rgba(217,99,79,0.85)';
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) if (at(x, y) && (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1) || x === 0 || x === 63)) b.fillRect(x * Z + Z / 2 - 1, y * Z + Z / 2 - 1, 3, 3);
    b.strokeStyle = 'rgba(93,143,196,0.9)'; b.lineWidth = 2; b.beginPath(); b.moveTo(0, (W.meta.foot + 1) * Z); b.lineTo(CELL * Z, (W.meta.foot + 1) * Z); b.stroke();
    if (W.eyes.size && W.row === 0 && W.layer === 'body') { b.strokeStyle = '#5d8fc4'; b.lineWidth = 2; for (const k of W.eyes) b.strokeRect((k % CELL) * Z + 1, Math.floor(k / CELL) * Z + 1, Z - 2, Z - 2); }
  }
  b.strokeStyle = 'rgba(74,52,38,0.07)'; b.lineWidth = 1;
  for (let i = 0; i <= CELL; i++) { b.beginPath(); b.moveTo(i * Z + 0.5, 0); b.lineTo(i * Z + 0.5, CELL * Z); b.stroke(); b.beginPath(); b.moveTo(0, i * Z + 0.5); b.lineTo(CELL * Z, i * Z + 0.5); b.stroke(); }
  if ($('wsMirror').checked && W.row !== 1) { b.strokeStyle = 'rgba(217,99,79,0.5)'; b.lineWidth = 2; b.beginPath(); b.moveTo(32 * Z, 0); b.lineTo(32 * Z, CELL * Z); b.stroke(); }
  // 시트 9칸(모든 층 합쳐서)
  const s = $('wsSheet').getContext('2d'); s.imageSmoothingEnabled = false; s.clearRect(0, 0, 384, 384);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { cell.getContext('2d').clearRect(0, 0, CELL, CELL); composite(cell, r, c); s.drawImage(cell, c * 128, r * 128, 128, 128); }
  const cols = LAYERS[W.layer].cols, lock = W.v5 && W.layer === 'body';
  s.font = '14px "Gowun Dodum"';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const auto = lock && (c > 0 || r === 1);
    if (auto) { s.fillStyle = 'rgba(243,232,207,0.55)'; s.fillRect(c * 128, r * 128, 128, 128); }
    s.fillStyle = 'rgba(74,52,38,.7)'; s.fillText(`${ROWS[r]}·${cols[c]}${auto ? ' (자동)' : ''}`, c * 128 + 5, r * 128 + 16);
  }
  s.strokeStyle = '#d9634f'; s.lineWidth = 4; s.strokeRect(W.col * 128 + 2, W.row * 128 + 2, 124, 124);
  // 경고: 기본 윤곽 밖
  let out = 0;
  if (W.layer === 'body') { const a = ctx().getImageData(0, 0, CELL * 3, CELL * 3).data, r = W.ref.data; for (let i = 3; i < a.length; i += 4) if (a[i] && !r[i]) out++; }
  $('wsWarn').textContent = out ? `⚠ 기본 윤곽 밖에 ${out}칸이 있어요. 몸 모양이 바뀌면 걷기가 어색해질 수 있어요 — 몸 밖에 붙는 것은 장식 층에 그려 보세요.` : '';
  drawColors();
}
function drawColors() {
  const d = ctx().getImageData(0, 0, CELL * 3, CELL * 3).data, count = new Map();
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { const h = hex(d[i], d[i + 1], d[i + 2]); count.set(h, (count.get(h) || 0) + 1); }
  $('wsColors').innerHTML = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([h, n]) => `<button style="background:${h}" title="${h} · ${n}칸" data-c="${h}"></button>`).join('');
}

function cellXY(e) { const r = $('wsBig').getBoundingClientRect(); return [Math.floor(((e.clientX - r.left) / r.width) * CELL), Math.floor(((e.clientY - r.top) / r.height) * CELL)]; }
function canPaint(x, y, row) {
  if (y > W.meta.foot + 1) return false;                                         // 발바닥 아래 금지
  if (W.layer === 'body' && row === 0 && W.eyes.has(y * CELL + x)) return false;  // 승인 눈 잠금
  return true;
}
function plot(x, y, color) {
  if (x < 0 || y < 0 || x >= CELL || y >= CELL) return;
  const c2 = ctx(), cols = $('wsAll').checked && !(W.v5 && W.layer === 'body') ? [0, 1, 2] : [W.col];
  const mirror = $('wsMirror').checked && W.row !== 1;
  const top0 = topRow(W.L.body.getContext('2d'), W.row, W.col);
  for (const c of cols) {
    const dy = W.layer === 'hat' || W.layer === 'body' ? topRow(W.L.body.getContext('2d'), W.row, c) - top0 : 0;   // 걷기 통통 맞추기
    const pts = [[x, y + dy]]; if (mirror) pts.push([CELL - 1 - x, y + dy]);
    for (const [px, py] of pts) {
      if (py < 0 || py >= CELL || !canPaint(px, py, W.row)) continue;
      const gx = c * CELL + px, gy = W.row * CELL + py;
      if (color) { c2.fillStyle = color; c2.fillRect(gx, gy, 1, 1); } else c2.clearRect(gx, gy, 1, 1);
    }
  }
}
function fill(x, y, color) {
  const ox = W.col * CELL, oy = W.row * CELL, c2 = ctx();
  const img = c2.getImageData(ox, oy, CELL, CELL), d = img.data, at = (i, j) => (j * CELL + i) * 4;
  const k0 = at(x, y), tg = [d[k0], d[k0 + 1], d[k0 + 2], d[k0 + 3]];
  const [r, g, b] = color ? rgb(color) : [0, 0, 0], a = color ? 255 : 0;
  if (tg[0] === r && tg[1] === g && tg[2] === b && tg[3] === a) return;
  const same = k => d[k] === tg[0] && d[k + 1] === tg[1] && d[k + 2] === tg[2] && d[k + 3] === tg[3];
  const st = [[x, y]], seen = new Uint8Array(CELL * CELL);
  while (st.length) {
    const [i, j] = st.pop(); if (i < 0 || j < 0 || i >= CELL || j >= CELL || seen[j * CELL + i]) continue;
    seen[j * CELL + i] = 1; const k = at(i, j); if (!same(k) || !canPaint(i, j, W.row)) continue;
    d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = a;
    st.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
  }
  c2.putImageData(img, ox, oy);
}
function replaceColor(from, to) {
  const c2 = ctx(), img = c2.getImageData(0, 0, CELL * 3, CELL * 3), d = img.data, [r0, g0, b0] = rgb(from), [r, g, b] = rgb(to);
  for (let i = 0; i < d.length; i += 4) {
    const p = i / 4, x = p % (CELL * 3), y = Math.floor(p / (CELL * 3));
    if (W.layer === 'body' && y < CELL && x < CELL && W.eyes.has(y * CELL + x)) continue;
    if (d[i + 3] > 128 && d[i] === r0 && d[i + 1] === g0 && d[i + 2] === b0) { d[i] = r; d[i + 1] = g; d[i + 2] = b; }
  }
  c2.putImageData(img, 0, 0);
}

/** 본보기 장식: 바탕 몸의 크기(서기 칸)를 재서 그린다 */
function bodyBox(row) {
  const d = W.L.body.getContext('2d').getImageData(0, row * CELL, CELL, CELL).data;
  let x0 = 64, x1 = 0, y0 = 64, y1 = 0;
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) if (d[(y * CELL + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, x1, y0, y1, h: y1 - y0 };
}
function preset(kind) {
  const c2 = ctx(), INK = '#4a3426';
  c2.clearRect(0, 0, CELL * 3, CELL * 3);
  const px = (x, y, col) => { c2.fillStyle = col; c2.fillRect(x, y, 1, 1); };
  for (let r = 0; r < 3; r++) {
    const bb = bodyBox(r), cx = 32, sh = bb.y0 + Math.round(bb.h * (W.v5 ? 0.4 : 0.42));   // 어깨 높이
    for (let c = 0; c < 3; c++) {
      const ox = c * CELL, oy = r * CELL;
      if (kind === 'cape') {
        const COL = $('wsColor').value || '#d9634f', DARK = shade(COL, 0.75);
        const bottom = Math.min(W.meta.foot - 5, bb.y1 - 6), flare = c, back = r === 1 ? -(2 + c * 2) : 0;   // 옆모습은 뒤로 날림
        for (let y = sh; y <= bottom; y++) {
          const t = (y - sh) / Math.max(1, bottom - sh), half = Math.round(7 + t * (4 + flare * 2));
          const wave = c && y > bottom - 3 ? ((y + c) % 2) : 0;
          const l = cx - half + back - (r === 1 ? Math.round(t * flare * 3) : 0), rr = cx + half + back - (r === 1 ? Math.round(t * flare * 2) : 0);
          for (let x = l; x <= rr; x++) px(ox + x, oy + y + wave, (x === l || x === rr) ? INK : (x - l) % 4 === 1 ? DARK : COL);
        }
        for (let x = cx - 8 + back; x <= cx + 8 + back; x++) px(ox + x, oy + bottom + 1 + (c && x % 2 ? 1 : 0), INK);
      } else if (kind === 'wings') {
        const COL = '#ffffff', MID = '#e6e9f2', span = [5, 9, 13][c], lift = [1, 3, 5][c];
        for (const side of r === 1 ? [-1] : [-1, 1]) {
          const base = side < 0 ? bb.x0 + 3 : bb.x1 - 3;
          for (let i = 0; i <= span; i++) {
            const x = base + side * i, top = sh - Math.round(lift * (i / span)) - 2, len = Math.max(2, 9 - Math.round(i * 0.45));
            for (let y = top; y <= top + len; y++) px(ox + x, oy + y, (y === top || y === top + len || i === span) ? INK : (y - top) % 3 === 2 ? MID : COL);
          }
        }
      } else if (kind === 'hat') {
        const top = topRow(W.L.body.getContext('2d'), r, c), COL = '#ffd25a', DARK = '#e8a33d';
        for (let x = cx - 6; x <= cx + 5; x++) { px(ox + x, oy + top - 1, INK); px(ox + x, oy + top - 2, x % 2 ? DARK : COL); px(ox + x, oy + top - 3, COL); }
        for (const x of [cx - 6, cx - 2, cx + 1, cx + 5]) { px(ox + x, oy + top - 4, COL); px(ox + x, oy + top - 5, INK); }
        if (r !== 2) px(ox + cx - 1, oy + top - 3, '#d9634f');
      }
    }
  }
}
function shade(h, k) { return hex(...rgb(h).map(v => Math.max(0, Math.min(255, Math.round(v * k))))); }

let bound = false, animT = 0, animF = 0;
function bind() {
  if (bound) return; bound = true;
  const big = $('wsBig');
  const act = e => {
    const [x, y] = cellXY(e), t = W.tool, color = $('wsColor').value;
    if (t === 'pick') {
      for (const k of [W.layer, ...drawOrder(W.row).reverse()]) { const p = W.L[k].getContext('2d').getImageData(W.col * CELL + x, W.row * CELL + y, 1, 1).data; if (p[3] > 128) { $('wsColor').value = hex(p[0], p[1], p[2]); break; } }
      setTool('pen'); return;
    }
    if (t === 'fill') fill(x, y, color); else plot(x, y, t === 'erase' ? null : color);
    if (W.layer === 'body') regen();
    redraw();
  };
  big.addEventListener('pointerdown', e => { snap(); W.drawing = true; big.setPointerCapture(e.pointerId); act(e); });
  big.addEventListener('pointermove', e => { if (W.drawing && (W.tool === 'pen' || W.tool === 'erase')) act(e); });
  big.addEventListener('pointerup', () => { W.drawing = false; });
  $('wsSheet').addEventListener('click', e => {
    const r = e.target.getBoundingClientRect();
    W.col = Math.min(2, Math.floor(((e.clientX - r.left) / r.width) * 3)); W.row = Math.min(2, Math.floor(((e.clientY - r.top) / r.height) * 3));
    fixCell(); $('wsDir').value = W.row; redraw();
  });
  $('wsLayers').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setLayer(b.dataset.layer); });
  const setTool = t => { W.tool = t; document.querySelectorAll('#ws [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t)); };
  document.querySelectorAll('#ws [data-tool]').forEach(b => { b.onclick = () => setTool(b.dataset.tool); });
  $('wsMirror').onchange = redraw; $('wsGuide').onchange = redraw;
  $('wsUndo').onclick = undo;
  $('wsBase').onchange = e => loadBase(e.target.value);
  $('wsReset').onclick = () => { snap(); ctx().putImageData(W.orig[W.layer], 0, 0); redraw(); };
  $('wsColors').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const inp = document.createElement('input'); inp.type = 'color'; inp.value = b.dataset.c;
    inp.oninput = () => { if (!inp._s) { snap(); inp._s = true; } replaceColor(b.dataset.c, inp.value); b.dataset.c = inp.value; if (W.layer === 'body') regen(); redraw(); };
    inp.click();
  };
  $('wsPng').onclick = () => { const c = blank(); for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) { const t = document.createElement('canvas'); t.width = t.height = CELL; composite(t, r, k); c.getContext('2d').drawImage(t, k * CELL, r * CELL); } const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = ($('wsName').value || '도트친구') + '.png'; a.click(); };
  $('wsClose').onclick = () => { $('ws').hidden = true; };
  $('wsSave').onclick = () => {
    const name = $('wsName').value.trim() || '친구';
    const key = W.mine ? W.key : 'my' + Math.random().toString(36).slice(2, 7);
    const empty = c => !c.getContext('2d').getImageData(0, 0, CELL * 3, CELL * 3).data.some((v, i) => i % 4 === 3 && v);
    const acc = ['hat', 'cape', 'wings'].filter(k => !empty(W.L[k])).map(k => ({ kind: k, src: W.L[k].toDataURL('image/png') }));
    const baseKey = W.key === '__v5' ? 'v5' : (W.mine ? W.chars[W.key].base : W.key);
    const meta = { ...W.meta, name, src: W.L.body.toDataURL('image/png'), base: baseKey, acc };
    $('ws').hidden = true;
    W.onSave(key, meta);
  };
  addEventListener('keydown', e => {
    if (!$('ws') || $('ws').hidden || e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.stopPropagation(); undo(); return; }
    const m = { b: 'pen', e: 'erase', g: 'fill', i: 'pick' }[k]; if (m) { e.stopPropagation(); setTool(m); }
    if (k === 'escape') $('ws').hidden = true;
  }, true);
  // 움직임 미리보기 — 엔진과 같은 규칙(actor.js accFrame)
  const tick = t => {
    requestAnimationFrame(tick);
    if (!W || $('ws').hidden) return;
    const move = $('wsMove').value, fps = move === 'run' ? 12 : move === 'walk' ? 7 : 2;
    if (t - animT > 1000 / fps) { animT = t; animF++; }
    const row = Number($('wsDir').value), walking = move !== 'idle';
    const bodyCol = walking ? [1, 0, 2, 0][animF % 4] : 0;
    const cols = { body: bodyCol, hat: bodyCol, cape: accFrame('cape', move, animF), wings: accFrame('wings', move, animF) };
    const a = $('wsAnim').getContext('2d'); a.imageSmoothingEnabled = false; a.clearRect(0, 0, 192, 192);
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = CELL; composite(tmp, row, 0, cols);
    a.drawImage(tmp, 0, 0, 192, 192);
  };
  requestAnimationFrame(tick);
}
