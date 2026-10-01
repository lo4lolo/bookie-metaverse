/* 놀이 화면 공용 — 표지(기록장 열기·손님·이어 읽기) → 세계 불러오기 → 놀이.
 * 쓰는 곳: worlds/<id>/index.html (window.WORLD_URL = 'world.json'), worlds/play.html?w=<id> 또는 파일 열기
 */
import { Stage } from './stage.js';
import { Player } from './play.js';

const $ = id => document.getElementById(id);
const BASE = new URL('../', import.meta.url).href;          // public/

function cover() {
  const d = document.createElement('section'); d.id = 'cover'; d.className = 'sheet';
  d.innerHTML = `<div class="paper">
    <p class="small">📖 부기 메타버스 · 동화책 세계</p><h1 id="cTitle">…</h1>
    <p id="cLead">책을 펼치면 이야기 속으로 들어가요.</p>
    <div id="whoAmI"></div>
    <div class="row"><button class="big" id="cOpen">📒 내 기록장 열기</button><button class="big soft" id="cGuest">👀 손님으로 들어가기</button></div>
    <p class="small">기록장이 없으면 <a href="${BASE}avatar-maker.html" target="_blank">내 아바타·기록장 만들기</a>에서 먼저 만들어요.</p>
    <div class="row" id="cResumeRow" hidden><button class="big" id="cResume">이어서 읽기</button><button class="big soft" id="cRestart">처음부터 읽기</button></div>
    <p id="cMsg" class="small"></p>
    <p class="small dim">움직이기: 땅을 누르거나 W A S D · 화면 돌리기: Q E 또는 끌기 · 확대: 휠<br><a id="cEdit" href="${BASE}maker.html?w=${encodeURIComponent(window.WORLD_ID || '')}">🛠 이 세계 고쳐 보기(세계 만들기)</a> · <a href="${BASE}worlds/index.html">📚 세계 도서관</a></p>
  </div>`;
  document.body.append(d);
}

export async function boot() {
  cover();
  const params = new URLSearchParams(location.search);
  const url = window.WORLD_URL || (params.get('w') ? `${BASE}worlds/${params.get('w')}/world.json` : null);
  let world = null;
  if (url) world = await fetch(url, { cache: 'no-store' }).then(r => r.json()).catch(() => null);
  const share = params.get('share');
  if (!world && share) { world = await fetch(`${BASE}api/worlds/get?key=${encodeURIComponent(share)}`).then(r => r.json()).catch(() => null); if (world && world.error) world = null; if (world) $('cEdit').href = `${BASE}maker.html?share=${encodeURIComponent(share)}`; }
  if (!world) try { world = JSON.parse(sessionStorage.getItem('seoksan-play-world') || 'null'); } catch (e) { /* */ }
  if (!world) {
    $('cTitle').textContent = '세계를 골라 주세요'; $('cLead').innerHTML = `세계 파일(.json)을 열거나 <a href="${BASE}worlds/index.html">📚 세계 도서관</a>에서 골라요.`;
    $('cOpen').textContent = '📂 세계 파일 열기'; $('cGuest').hidden = true;
    $('cOpen').onclick = () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'; inp.onchange = async () => { try { const w = JSON.parse(await inp.files[0].text()); if (w.format !== 'seoksan-world') throw 0; sessionStorage.setItem('seoksan-play-world', JSON.stringify(w)); location.reload(); } catch (e) { $('cMsg').textContent = '세계 파일이 아니에요.'; } }; inp.click(); };
    return;
  }
  document.title = `${world.title} · 부기 메타버스`;
  $('cTitle').textContent = world.title;
  const canvas = $('scene');
  const stage = new Stage(canvas);
  let student = StudentMD.recall();
  await stage.load(world, { student });
  stage.cam.follow = stage.me;
  const key = 'seoksan-progress-' + world.id;
  const player = new Player(stage, { student, progressKey: key, links: `<a href="${BASE}index.html">처음 화면으로</a> · <a href="${BASE}avatar-maker.html">내 아바타·기록장</a>` });
  window.__play = { stage, player };
  const showWho = () => {
    const box = $('whoAmI'); box.innerHTML = '';
    if (!student) return;
    box.append(AvatarV5.canvas(student.avatar.colors));
    const t = document.createElement('div'); t.innerHTML = `<b>${student.student.name}</b>의 기록장을 열었어요.<br><span class="small">확인된 포인트 ${student.points.confirmed} · 보류 ${student.points.pending}</span>`; box.append(t);
    $('cOpen').textContent = '📖 이 기록장으로 읽기'; $('cOpen').dataset.ready = '1';
  };
  showWho();
  let prev = null; try { prev = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { /* */ }
  if (prev && prev.page > 1) { $('cResumeRow').hidden = false; $('cResume').textContent = `이어서 읽기 (${prev.page}쪽)`; }
  const begin = async resume => {
    $('cover').hidden = true;
    if (player.student !== student) { player.student = student; await stage.load(world, { student }); stage.cam.follow = stage.me; }
    player.start(world.code, { resume: resume ? prev : null });
  };
  $('cOpen').onclick = async () => {
    if ($('cOpen').dataset.ready) return begin(false);
    try { student = await StudentMD.pick(); StudentMD.remember(student); showWho(); $('cMsg').textContent = ''; }
    catch (e) { $('cMsg').textContent = e.message; }
  };
  $('cGuest').onclick = () => { student = null; begin(false); };
  $('cResume').onclick = () => begin(true);
  $('cRestart').onclick = () => begin(false);
}
