/* 놀이 — 무대 위에서 세계의 코드(이야기·동작)를 실행한다.
 * 코드는 runtime-worker.js(따로 떨어진 일꾼)에서 돌고, 명령(말하기·걷기…)만 여기로 온다.
 * 이어 읽기: 쪽()마다 진행을 저장 → 다시 열면 그 쪽까지 "빨리 감기"(말 건너뛰기·저장된 대답·순간이동).
 */
import { T, rng } from './art3d.js';
import { shade } from './objects.js';
import { hasFinished, josa } from './gate.js';

const WORKER = new URL('./runtime-worker.js', import.meta.url);
const TONE = { 이야기: [1.0, 0.95], 토끼: [1.45, 1.05], 거북이: [0.7, 0.85], 부엉이: [1.1, 0.92], 나: [1.25, 1.0] };
const $ = id => document.getElementById(id);

function ui() {
  if ($('playUI')) return;
  const d = document.createElement('div'); d.id = 'playUI';
  d.innerHTML = `
  <header id="pTop" hidden>
    <div id="pPage"><span id="pPageNo">1쪽</span> <b id="pPageTitle"></b></div>
    <div id="pGoal"></div>
    <div class="btns">
      <button id="pLeft" title="화면 왼쪽으로 돌리기 (Q)">⟲</button>
      <button id="pRight" title="화면 오른쪽으로 돌리기 (E)">⟳</button>
      <button id="pVoice" title="읽어 주기 켜기/끄기">🔊</button>
      <button id="pLib" title="부기 도서관으로" hidden>도서관</button>
      <button id="pHelp" title="도움말">❓</button>
    </div>
  </header>
  <section id="pTalk" hidden>
    <canvas id="pFace" width="96" height="96"></canvas>
    <div class="body"><div id="pWho"></div><div id="pLine"></div><div id="pChoices"></div></div>
    <div class="side"><button id="pAgain" title="다시 듣기">🔊</button><button id="pNext">다음 ▶</button></div>
  </section>
  <section id="pEnd" class="sheet" hidden><div class="paper"><h1>이야기 끝!</h1><div id="pSummary"></div>
    <div class="row"><button class="big" id="pSave">📒 기록장에 저장하기</button><button class="big soft" id="pReplay">처음부터 다시</button></div>
    <p class="small" id="pEndLinks"></p><p id="pSaveMsg" class="small"></p></div></section>
  <section id="pHelpSheet" class="sheet" hidden><div class="paper"><h2>이렇게 해요</h2><ul>
    <li>👆 가고 싶은 곳의 땅을 누르면 걸어가요. (W A S D, 화살표)</li>
    <li>🔄 ⟲ ⟳ 단추나 Q, E 키로 책을 돌려요. 끌어도 돼요.</li>
    <li>❗ 느낌표가 있는 친구에게 가면 이야기가 이어져요.</li>
    <li>🔊 단추를 누르면 글을 읽어 줘요.</li></ul><button class="big" id="pHelpClose">알겠어요</button></div></section>
  <div id="pError" hidden></div>
  <div id="pFlash"></div>`;
  document.body.append(d);
}

export class Player {
  /** opt: {student, progressKey, onEnd, onLine, onError, links} */
  constructor(stage, opt = {}) {
    ui();
    this.stage = stage; this.opt = opt; this.student = opt.student || null;
    this.voice = { on: 'speechSynthesis' in window, ko: null };
    if ('speechSynthesis' in window) { const pick = () => { const vs = speechSynthesis.getVoices(); this.voice.ko = vs.find(v => /ko/i.test(v.lang) && /Google|Natural|Online/i.test(v.name)) || vs.find(v => /ko/i.test(v.lang)) || null; }; pick(); speechSynthesis.onvoiceschanged = pick; }
    this.keys = new Set(); this.locked = true;
    this.ring = new T.Mesh(new T.RingGeometry(1.4, 1.85, 40), new T.MeshBasicMaterial({ color: '#e8b84a', transparent: true, opacity: 0.8, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.06; this.ring.visible = false; stage.scene.add(this.ring);
    this.pin = stage.addTag('⬇', 'bang'); this.pin.hidden = true;
    this.bits = []; this.handlers = new Map(); this.nearState = new Map();
    this.bind();
  }

  // ───── 시작·멈춤 ─────
  async start(code, { resume = null } = {}) {
    this.stop(true);
    const S = this.stage, wd = S.world;
    this.run = { page: 0, answers: [], log: [], promise: '', seed: (resume && resume.seed) || (Date.now() % 100000) };
    this.ff = resume && resume.page > 0 ? resume : null; this.ffAnswers = this.ff ? [...resume.answers] : [];
    this.rand = rng(this.run.seed);
    this.lastChoice = ''; this.goalTarget = null; this.arrival = null; this.clickWait = null; this.handlers = new Map(); this.nearState = new Map();
    this.ended = false; this.gateBusy = false;
    this.gates = [...S.objs.values()].filter(r => r.def.gate);
    for (const a of S.actors.values()) { a.place(a.data); a.show(true); a.sleep(false); a.anim = '자동'; a.scaleK = 1; a.lift = a.baseLift = a.data.lift || 0; a.flying = false; if (a.data.dir) a.look(a.data.dir); }
    for (const rec of S.objs.values()) { rec.g.visible = true; }
    if (S.me) { S.me.place(wd.player); S.me.show(true); }
    S.cam.follow = S.me; S.cam.focus = null;
    $('pTop').hidden = false; $('pEnd').hidden = true; $('pError').hidden = true; this.hideTalk(); this.goal('', null);
    this.locked = false;
    const names = ['이야기', '나', ...S.actors.keys(), ...wd.paths.map(p => p.name), ...wd.spots.map(s => s.name), ...wd.objects.filter(o => o.name).map(o => o.name)];
    const w = this.worker = new Worker(WORKER);
    w.onmessage = ev => this.onMsg(ev.data);
    w.onerror = e => this.fail(e.message || '코드 실행기를 열지 못했어요.', 0);
    w.postMessage({ t: 'run', code, names });
  }
  stop(silent) {
    if (this.worker) { this.worker.terminate(); this.worker = null; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    this.locked = true; this.nextWait = this.choiceWait = null; this.arrival = null; this.clickWait = null;
    if (this.stage.actors) for (const a of this.stage.actors.values()) { a.finish(); a.bangEl.hidden = true; a.emoteEl.hidden = true; a.zzEl.hidden = true; }
    for (const rec of this.stage.objs.values()) if (rec.labelEl && !rec.o.label) rec.labelEl.hidden = true;
    if (!silent) { $('pTop').hidden = true; this.hideTalk(); this.goal('', null); }
  }
  fail(msg, line) {
    const e = $('pError'); e.hidden = false; e.textContent = `⚠ ${line ? line + '번째 줄: ' : ''}${msg}`;
    if (this.opt.onError) this.opt.onError(msg, line);
  }

  // ───── 일꾼과 주고받기 ─────
  onMsg(d) {
    if (d.t === 'call') {
      if (this.opt.onLine) this.opt.onLine(d.line);
      Promise.resolve().then(() => this.exec(d.fn, d.who, d.args.map(a => this.unpack(a))))
        .then(value => this.worker && this.worker.postMessage({ t: 'ret', id: d.id, value: value === undefined ? null : value }))
        .catch(err => this.worker && this.worker.postMessage({ t: 'ret', id: d.id, error: err.message || String(err) }));
    } else if (d.t === 'error' || d.t === 'syntax') this.fail(d.msg, d.line);
    else if (d.t === 'main-done') { if (this.ff) this.ff = null; if (this.opt.onLine) this.opt.onLine(0); }
  }
  unpack(a) {
    if (a && a.ref !== undefined) { const t = this.stage.find(a.ref) || (this.stage.curves[a.ref] ? { path: a.ref } : null); if (!t) throw new Error(`'${a.ref}'(이)라는 이름이 세계에 없어요.`); t.__name = a.ref; return t; }
    if (Array.isArray(a)) return a.map(x => this.unpack(x));
    return a;
  }
  who(name) {
    if (name === '이야기') return null;
    const t = this.stage.find(name); if (!t) throw new Error(`'${name}'(이)라는 이름이 세계에 없어요.`);
    return t;
  }
  actorOf(name, cmd) { const t = this.who(name); if (!t || !t.pos) throw new Error(`'${name}'(은)는 인물이 아니라서 ${cmd}(을)를 할 수 없어요.`); return t; }
  speed(v, d) { const n = Number(v); return isFinite(n) && n > 0 ? Math.min(40, n) : d; }

  async exec(fn, whoName, a) {
    const S = this.stage, ff = !!this.ff;
    switch (fn) {
      // 말
      case '말하기': if (ff) return; return this.say(whoName, String(a[0] ?? ''));
      case '묻기': {
        const q = String(a[0] ?? ''), opts = (Array.isArray(a[1]) ? a[1] : []).map(String).filter(Boolean);
        if (!opts.length) throw new Error('묻기에는 보기가 하나 이상 있어야 해요. 예: ["네", "아니요"]');
        let k;
        if (ff && this.ffAnswers.length) k = this.ffAnswers.shift();
        else { if (ff) this.ff = null; k = await this.choose(whoName, q, opts); }
        this.run.answers.push(k);
        this.lastChoice = opts[k - 1].replace(/^[^\p{L}\p{N}]+/u, '').trim();
        this.run.log.push([q, this.lastChoice]);
        return k;
      }
      case '고른말': return this.lastChoice;
      case '다짐': this.run.promise = String(a[0] ?? ''); return;
      // 움직임
      case '걷기': { const t = this.actorOf(whoName, '걷기'), p = S.posOf(a[0]); if (!p) throw new Error('어디로 걸을지 알려 주세요.'); if (ff) return void t.place(p); return t.walkTo([p], this.speed(a[1], 3)); }
      case '길따라': {
        const t = this.actorOf(whoName, '길따라'), name = a[0] && a[0].__name ? a[0].__name : String(a[0]);
        if (!S.curves[name]) throw new Error(`'${name}'(이)라는 길이 없어요.`);
        const pts = S.route(name, Number(a[1]) || 0, Number(a[2]) ?? 100);
        if (ff) return void t.place(pts[pts.length - 1]);
        return t.walkTo(pts, this.speed(a[3], 3));
      }
      case '순간이동': { const t = this.actorOf(whoName, '순간이동'), p = S.posOf(a[0]); if (p) t.place(p); return; }
      case '날기': { const t = this.actorOf(whoName, '날기'), p = S.posOf(a[0]); if (!p) return; if (ff) return void t.place(p); return t.flyTo(p); }
      case '뛰기': { const t = this.actorOf(whoName, '뛰기'); if (ff) return; return t.jump(Number(a[0]) || 1); }
      case '보기': this.actorOf(whoName, '보기').look(String(a[0])); return;
      case '멈출때까지': { const t = this.actorOf(whoName, '멈출때까지'); return t.idle(); }
      // 모습
      case '눕기': this.actorOf(whoName, '눕기').sleep(true); return;
      case '일어나기': this.actorOf(whoName, '일어나기').sleep(false); return;
      case '숨기기': case '보이기': {
        const t = this.who(whoName), on = fn === '보이기';
        if (t && t.pos) t.show(on); else if (t && t.g) { t.g.visible = on; S.recalcColliders(); }
        return;
      }
      case '크기': { const t = this.who(whoName), k = Math.min(5, Math.max(0.2, Number(a[0]) || 1)); if (t && t.pos) t.scaleK = k; else if (t && t.g) t.g.scale.setScalar((t.o.s || 1) * k); return; }
      case '표정': { const t = this.actorOf(whoName, '표정'); t.emote(String(a[0] ?? ''), a[1] === undefined ? 2.5 : Number(a[1])); return; }
      case '애니': { const t = this.actorOf(whoName, '애니'), n = String(a[0] ?? '자동'); if (!['자동', '서기', '걷기', '깡충', '빙글', '흔들'].includes(n)) throw new Error(`애니는 자동·서기·걷기·깡충·빙글·흔들 중 하나예요.`); t.anim = n; return; }
      case '프레임': { const t = this.actorOf(whoName, '프레임'); t.anim = '프레임'; t.frameNo = Math.max(0, Math.min(2, Math.round(Number(a[0]) || 0))); return; }
      case '색': {
        const t = this.who(whoName), c = String(a[0] ?? '');
        if (!/^#[0-9a-fA-F]{6}$/.test(c)) throw new Error('색은 "#ffcc00"처럼 써요.');
        if (t && t.g) { t.g.traverse(m => { if (m.isMesh && m.material && m.material.isMeshToonMaterial && m.parent && m.parent.children[1] === m) m.material = m.material.clone(), m.material.color.set(c); }); return; }
        throw new Error('색은 물건만 바꿀 수 있어요.');
      }
      case '이름표': {
        const t = this.who(whoName), text = String(a[0] ?? '');
        if (t && t.g) S.labelObject(t.o.id, text); else if (t && t.tagEl) t.setName(text || t.data?.name || t.name);
        return;
      }
      // 흐름
      case '쪽': {
        this.run.page++;
        if (this.ff && this.run.page >= this.ff.page) { this.ff = null; this.ffAnswers = []; }
        $('pPageNo').textContent = `${this.run.page}쪽`; $('pPageTitle').textContent = String(a[0] ?? '');
        if (!this.ff) this.save();
        this.hideTalk();
        return;
      }
      case '목표': this.goal(String(a[0] ?? ''), a[1] || null); return;
      case '도착': {
        const t = a[0], r = Number(a[1]) || 3; if (!S.posOf(t)) throw new Error('어디에 도착할지 알려 주세요.');
        if (ff) { const p = S.posOf(t); S.me.place(new T.Vector3(p.x + r * 0.6, 0, p.z + r * 0.6)); this.goal('', null); return; }
        if (!this.goalTarget) this.goal($('pGoal').textContent || '여기로 가요', t);
        this.hideTalk();
        await new Promise(res => { this.arrival = { t, r, res }; });
        return;
      }
      case '누를때까지': {
        const t = a[0]; if (ff) return;
        this.hideTalk();
        await new Promise(res => { this.clickWait = { t, res }; });
        return;
      }
      case '기다리기': if (ff) return; return new Promise(r => setTimeout(r, Math.min(60, Math.max(0, Number(a[0]) || 0)) * 1000));
      case '누르면': this.handlers.set('click:' + (a[0] && a[0].__name), true); return;
      case '가까이가면': this.handlers.set('near:' + (a[0] && a[0].__name), true); return;
      // 연출
      case '번쩍': if (!ff) this.flash(String(a[0] ?? '')); return;
      case '꽃가루': if (!ff) this.confetti(S.posOf(a[0]) || S.me.pos); return;
      case '카메라': { const t = a[0]; S.cam.focus = !t || t === S.me ? null : t; return; }
      case '카메라돌리기': S.turn(Math.round((Number(a[0]) || 45) / 45)); return;
      case '무작위': { const lo = Math.ceil(Number(a[0]) || 0), hi = Math.floor(Number(a[1]) || 0); return lo + Math.floor(this.rand() * (hi - lo + 1)); }
      case '끝내기': this.ending(a[0] || {}); return;
      case '처음방문': {   // 이 세계에 처음 왔으면 true(이 브라우저 기준) — 인사를 한 번만 하려고
        const k = 'bookie-visited-' + S.world.id; let first = true;
        try { first = !localStorage.getItem(k); localStorage.setItem(k, '1'); } catch (e) { /* */ }
        return first;
      }
    }
    throw new Error(`'${fn}'(은)는 모르는 명령이에요.`);
  }

  // ───── 책 문(도서관 → 책의 세계) ─────
  async openGate(rec) {
    this.gateBusy = true; me_stop(this.stage.me);
    const o = rec.o, book = o.text || '이 책', who = this.stage.actors.has('사서') ? '사서' : '이야기';
    try {
      if (!o.world) {
        await this.say(who, `『${book}』의 세계는 아직 만드는 중이에요. 조금만 기다려 줘요!`);
      } else if (await hasFinished(this, who, book)) {
        await this.say(who, `좋아요! 『${book}』 속으로 들어가 볼까요? 책장을 펼쳐요!`);
        this.flash('책 속으로!');
        if (this.opt.onGate) this.opt.onGate(o.world, book);
        else setTimeout(() => { location.href = new URL(`../worlds/${encodeURIComponent(o.world)}/`, import.meta.url).href + '?go=1'; }, 700);
      } else {
        await this.say(who, `그럼 부기 도서관에서 『${book}』${josa(book, '을', '를')} 먼저 끝까지 읽고 와요. 다 읽으면 이 책 문이 열려요.`);
      }
    } finally { this.hideTalk(); this.gateBusy = false; }
  }

  // ───── 대화 ─────
  speak(text, who = '이야기') {
    if (!this.voice.on) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}☀-➿️「」~]/gu, ''));
    u.lang = 'ko-KR'; if (this.voice.ko) u.voice = this.voice.ko;
    const base = Object.keys(TONE).find(k => who.startsWith(k));
    [u.pitch, u.rate] = TONE[base] || [1.05, 0.95];
    speechSynthesis.speak(u);
  }
  face(whoName) {
    const c = $('pFace').getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, 96, 96);
    const a = whoName === '나' ? this.stage.me : this.stage.actors.get(whoName);
    if (!a) { c.font = '58px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('📖', 48, 52); return; }
    c.drawImage(a.img, 8, a.faceTop || 0, 48, 48, 0, 0, 96, 96);
  }
  showTalk(whoName, text) {
    $('pTalk').hidden = false;
    $('pWho').textContent = whoName === '나' ? (this.stage.me ? this.stage.me.name : '나') : whoName;
    $('pLine').textContent = text; this.face(whoName);
    this.last = [text, whoName]; this.speak(text, whoName);
  }
  say(whoName, text) {
    this.showTalk(whoName, text); $('pChoices').innerHTML = ''; $('pNext').hidden = false;
    return new Promise(r => { this.nextWait = r; });
  }
  next() { if (!this.nextWait) return; const r = this.nextWait; this.nextWait = null; r(); }
  choose(whoName, q, opts) {
    this.showTalk(whoName, q); $('pNext').hidden = true;
    const box = $('pChoices'); box.innerHTML = '';
    return new Promise(r => {
      this.choiceWait = i => { this.choiceWait = null; box.innerHTML = ''; r(i + 1); };
      opts.forEach((o, i) => { const b = document.createElement('button'); b.textContent = o; b.onclick = () => this.choiceWait && this.choiceWait(i); box.append(b); });
    });
  }
  hideTalk() { $('pTalk').hidden = true; }

  // ───── 목표 ─────
  goal(text, target) {
    $('pGoal').textContent = text || '';
    for (const a of this.stage.actors.values()) a.bangEl.hidden = true;
    if (target) this.hideTalk();
    this.goalTarget = target; this.ring.visible = !!target; this.pin.hidden = !target || !!target.pos;
    if (target && target.bangEl) target.bangEl.hidden = false;
  }
  flash(t) { const f = $('pFlash'); f.textContent = t; f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  confetti(p) {
    const cols = ['#d9634f', '#e8b84a', '#5d8fc4', '#6f9d52', '#f39a9a', '#fff'];
    for (let i = 0; i < 140; i++) {
      const m = new T.Mesh(new T.PlaneGeometry(0.25, 0.4), new T.MeshBasicMaterial({ color: cols[i % 6], side: T.DoubleSide }));
      m.position.set(p.x + (Math.random() - 0.5) * 2, 5 + Math.random() * 2, p.z + (Math.random() - 0.5) * 2);
      m.userData.v = new T.Vector3((Math.random() - 0.5) * 8, 4 + Math.random() * 6, (Math.random() - 0.5) * 8); m.userData.life = 4;
      this.stage.scene.add(m); this.bits.push(m);
    }
  }

  // ───── 저장·끝 ─────
  save() { if (!this.opt.progressKey) return; try { localStorage.setItem(this.opt.progressKey, JSON.stringify({ page: this.run.page, answers: this.run.answers, seed: this.run.seed })); } catch (e) { /* 저장 불가 */ } }
  ending(reward) {
    if (this.ended) return; this.ended = true;
    this.locked = true; this.goal('', null); this.hideTalk();
    const R = { points: Math.max(0, Math.min(100, Number(reward.포인트) || 0)), stones: [].concat(reward.돌 || []).map(String).filter(Boolean), stickers: [].concat(reward.스티커 || []).map(String).filter(Boolean) };
    this.reward = R;
    const ans = this.run.log.map(([q, a]) => `<li>${esc(q)} → <b>${esc(a)}</b></li>`).join('');
    $('pSummary').innerHTML = `<p style="text-align:center">끝까지 읽었어요! 🎉</p>
      <div class="reward">${R.stones.map(s => `<div><b>🪨</b>${esc(s)}</div>`).join('')}${R.stickers.map(s => `<div><b>⭐</b>${esc(s)} 스티커</div>`).join('')}${R.points ? `<div><b>🪙</b>포인트 ${R.points}<br><span class="small">(선생님 확인 뒤 받아요)</span></div>` : ''}</div>
      ${ans ? `<p><b>나의 생각</b></p><ul>${ans}</ul>` : ''}${this.run.promise ? `<p><b>나의 다짐</b><br>${esc(this.run.promise)}</p>` : ''}
      ${this.student ? '' : '<p class="small">손님은 이름을 쓰면 새 기록장으로 저장할 수 있어요.<br><input id="pGuestName" placeholder="내 이름"></p>'}`;
    $('pEndLinks').innerHTML = this.opt.links || '';
    $('pSave').disabled = false; $('pSaveMsg').textContent = '';
    $('pEnd').hidden = false;
    if (this.opt.progressKey) try { localStorage.removeItem(this.opt.progressKey); } catch (e) { /* */ }
    if (this.opt.onEnd) this.opt.onEnd(this.run);
  }
  saveRecord() {
    let d = this.student;
    if (!d) {
      const n = ($('pGuestName') && $('pGuestName').value.trim()) || '';
      if (!n) { $('pSaveMsg').textContent = '이름을 먼저 써 주세요.'; return; }
      d = StudentMD.create({ name: n });
    }
    const wd = this.stage.world;
    StudentMD.addRecord(d, wd.id, '동화책 · ' + wd.title, { title: wd.title + ' 끝까지 읽기', done: true, gained: this.reward, answers: Object.fromEntries(this.run.log), promise: this.run.promise });
    StudentMD.download(d); StudentMD.remember(d); this.student = d;
    $('pSave').disabled = true;
    $('pSaveMsg').textContent = '기록장(md)을 내려받았어요. 내 폴더에 잘 넣어 두세요. 포인트는 선생님이 확인하면 들어와요.';
  }

  // ───── 입력 ─────
  bind() {
    const S = this.stage, cv = S.canvas;
    $('pNext').onclick = () => this.next();
    $('pAgain').onclick = () => this.last && this.speak(...this.last);
    $('pLeft').onclick = () => S.turn(-1); $('pRight').onclick = () => S.turn(1);
    $('pVoice').onclick = () => { this.voice.on = !this.voice.on; $('pVoice').classList.toggle('off', !this.voice.on); if (!this.voice.on) speechSynthesis.cancel(); };
    $('pHelp').onclick = () => { $('pHelpSheet').hidden = false; }; $('pHelpClose').onclick = () => { $('pHelpSheet').hidden = true; };
    $('pSave').onclick = () => this.saveRecord();
    $('pReplay').onclick = () => { $('pEnd').hidden = true; this.start(S.world.code); };
    this.onKey = e => {
      if (this.locked && !this.nextWait && !this.choiceWait) return;
      if (/INPUT|TEXTAREA/.test(e.target.tagName) || e.target.closest?.('.blocklyWidgetDiv')) return;
      if ((e.key === ' ' || e.key === 'Enter') && this.nextWait) { e.preventDefault(); this.next(); }
      if (this.choiceWait && /^[1-4]$/.test(e.key)) { const b = $('pChoices').children[+e.key - 1]; if (b) b.click(); }
      const k = e.key.toLowerCase(); if (k === 'q') S.turn(-1); if (k === 'e') S.turn(1);
      this.keys.add(k);
    };
    addEventListener('keydown', this.onKey);
    addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());
    let press = null;
    cv.addEventListener('contextmenu', e => { if (!this.locked) e.preventDefault(); });
    cv.addEventListener('pointerdown', e => { if (this.locked) return; press = { x: e.clientX, y: e.clientY, yaw: S.cam.yawTo, drag: e.button === 2 }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!press) return; const dx = e.clientX - press.x; if (!press.drag && Math.abs(dx) + Math.abs(e.clientY - press.y) > 8) press.drag = true; if (press.drag) S.cam.yawTo = press.yaw - dx * 0.008; });
    cv.addEventListener('pointerup', e => {
      if (!press) return; const p = press; press = null;
      if (p.drag) { S.cam.yawTo = Math.round(S.cam.yawTo / (Math.PI / 4)) * (Math.PI / 4); return; }
      this.click(e.clientX, e.clientY);
    });
    cv.addEventListener('wheel', e => { if (!this.locked) S.cam.distTo = Math.min(70, Math.max(16, S.cam.distTo + e.deltaY * 0.02)); }, { passive: true });
    this.prevUpdate = S.onUpdate;
    S.onUpdate = dt => { this.prevUpdate && this.prevUpdate(dt); this.update(dt); };
  }
  click(x, y) {
    const S = this.stage, hit = S.pick(x, y);
    const name = hit ? (hit.actor ? (hit.actor === S.me ? '나' : hit.actor.name) : hit.obj ? hit.obj.o.name : null) : null;
    const target = hit ? (hit.actor || hit.obj) : null;
    if (this.clickWait && target && (this.clickWait.t === target)) { const c = this.clickWait; this.clickWait = null; c.res(); return; }
    if (name && this.handlers.has('click:' + name) && this.worker) { this.worker.postMessage({ t: 'event', key: 'click:' + name }); return; }
    if (hit && hit.obj && hit.obj.def.gate && !this.nextWait && !this.choiceWait && !this.gateBusy) { this.openGate(hit.obj); return; }
    if (this.nextWait || this.choiceWait || this.locked || this.clickWait) return;
    const g = S.groundAt(x, y); if (g) S.me.walkTo([S.clamp(g)], 6.5);
  }
  update(dt) {
    const S = this.stage, me = S.me; if (!me) return;
    me.extMoving = false;
    if (!this.locked && !this.nextWait && !this.choiceWait) {
      const { fwd, right } = S.basis(), v = new T.Vector3();
      if (this.keys.has('w') || this.keys.has('arrowup')) v.add(fwd);
      if (this.keys.has('s') || this.keys.has('arrowdown')) v.sub(fwd);
      if (this.keys.has('d') || this.keys.has('arrowright')) v.add(right);
      if (this.keys.has('a') || this.keys.has('arrowleft')) v.sub(right);
      if (v.lengthSq() > 0) { me.path = []; me.finish(); v.normalize(); me.pos.addScaledVector(v, 6.5 * dt); me.move.copy(v); me.extMoving = true; }
      for (const c of S.colliders) { const dx = me.pos.x - c.x, dz = me.pos.z - c.z, d = Math.hypot(dx, dz), r = c.r + 0.5; if (d < r && d > 0.001) { me.pos.x = c.x + (dx / d) * r; me.pos.z = c.z + (dz / d) * r; } }
      S.clamp(me.pos);
    }
    if (this.arrival && !this.nextWait && !this.choiceWait) {
      const p = S.posOf(this.arrival.t);
      if (p && Math.hypot(me.pos.x - p.x, me.pos.z - p.z) < this.arrival.r) { const a = this.arrival; this.arrival = null; this.goal('', null); me.walkTo([]); a.res(); }
    }
    if (this.gates && !this.locked && !this.nextWait && !this.choiceWait && !this.gateBusy) {
      for (const g of this.gates) {
        const near = Math.hypot(me.pos.x - g.o.x, me.pos.z - g.o.z) < 2.9 * (g.o.s || 1), key = 'gate:' + g.o.id, was = this.nearState.get(key);
        this.nearState.set(key, near);
        if (near && !was) { this.openGate(g); break; }
      }
    }
    for (const key of this.handlers.keys()) {
      if (!key.startsWith('near:')) continue;
      const t = S.find(key.slice(5)), p = S.posOf(t); if (!p) continue;
      const near = Math.hypot(me.pos.x - p.x, me.pos.z - p.z) < 2.6, was = this.nearState.get(key);
      if (near && !was && this.worker) this.worker.postMessage({ t: 'event', key });
      this.nearState.set(key, near);
    }
    if (this.goalTarget) {
      const p = S.posOf(this.goalTarget);
      if (p) { this.ring.position.x = p.x; this.ring.position.z = p.z; this.ring.material.opacity = 0.55 + Math.sin(performance.now() / 250) * 0.3; if (!this.pin.hidden) S.placeTag(this.pin, new T.Vector3(p.x, 3.2, p.z)); }
    } else this.pin.style.display = 'none';
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const m = this.bits[i], v = m.userData.v; v.y -= 9 * dt; v.multiplyScalar(0.985);
      m.position.addScaledVector(v, dt); m.rotation.x += dt * 6; m.rotation.y += dt * 4;
      if (m.position.y < 0.05) { m.position.y = 0.05; v.set(0, 0, 0); }
      if ((m.userData.life -= dt) < 0) { S.scene.remove(m); this.bits.splice(i, 1); }
    }
  }
}
function me_stop(me) { if (me) { me.walkTo([]); me.extMoving = false; } }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
export { shade };
