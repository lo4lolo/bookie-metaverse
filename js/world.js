/* 석산 메타버스 — 광장(여럿이 함께) 화면 */
(async function () {
  'use strict';
  const { api, el, toast, openPanel, closePanel, currentPanel, tabs, confirmBox } = UI;
  const $ = s => document.querySelector(s);

  const CAT = await fetch('data/catalog.json', { cache: 'no-cache' }).then(r => r.json());
  const OBJ = {}, WEAR = {};
  CAT.objects.forEach(o => (OBJ[o.id] = o));
  CAT.wear.forEach(w => (WEAR[w.id] = w));

  let ENG = null, ws = null, me = null, meAv = null, W = null;
  let settings = {}, stoneTotal = 0, emotes = CAT.emotes;
  let scope = 'near', kicked = false, lastGate = false;
  const build = { on: false, tool: 'place', src: 'inv', cat: 'furniture', item: null, tile: 'w', sel: null, lastPaint: '' };
  const DIRS = Engine.DIRS;

  // ------------------------------------------------------------ 로그인
  drawLogo();
  api('/api/info').then(info => { $('#loginClass').textContent = info.className; }).catch(() => {});

  function showLogin(msg) {
    $('#login').hidden = false;
    ['#hud', '#toolbar', '#chat', '#emotes', '#buildBar', '#actionHint', '#conn'].forEach(s => ($(s).hidden = true));
    closePanel();
    $('#loginMsg').textContent = msg || '';
    setTimeout(() => $('#lid').focus(), 50);
  }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    $('#loginMsg').textContent = '';
    try {
      const r = await api('/api/login', { id: $('#lid').value.trim(), pw: $('#lpw').value });
      UI.setToken(r.token);
      $('#lpw').value = '';
      if (r.defaultPw) toast('선생님 비밀번호가 처음 값이에요. 관리 화면에서 꼭 바꿔 주세요.', 'err');
      start();
    } catch (err) { $('#loginMsg').textContent = err.message; }
  });
  function drawLogo() {
    const cv = $('#logoArt'), c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(Art.objSprite(OBJ.tower, 16, { level: 9 }), 32, 0, 32, 80);
    const L = Object.assign({}, CAT.defaultLook, { head: 'head_sprout' });
    const sp = Art.avatarSprite(L, 0, 0, 40);
    c.drawImage(sp, Math.round(72 - sp.ax), Math.round(93 - sp.ay));
  }

  // ------------------------------------------------------------ 시작
  function start() {
    $('#login').hidden = true;
    kicked = false;
    if (!ENG) {
      ENG = new Engine($('#game'), { catalog: CAT, hooks });
      bindUi();
    }
    connect();
  }

  function connect() {
    if (ws) { try { ws.onclose = null; ws.close(); } catch (e) { /* 이미 닫힘 */ } }
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ws.onopen = () => send({ t: 'auth', token: UI.getToken() });
    ws.onmessage = e => { try { onMsg(JSON.parse(e.data)); } catch (err) { console.error(err); } };
    ws.onclose = () => {
      if (kicked) return;
      $('#conn').hidden = false;
      setTimeout(() => { if (!kicked) connect(); }, 2000);
    };
    clearInterval(connect.hb);
    connect.hb = setInterval(() => send({ t: 'hb' }), 20000);
  }
  function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }

  // ------------------------------------------------------------ 서버 메시지
  function onMsg(m) {
    switch (m.t) {
      case 'welcome': {
        me = m.me; settings = m.settings; stoneTotal = m.stoneTotal; emotes = m.emotes || emotes;
        W = m.world;
        ENG.setMap(W);
        ENG.avatars.clear();
        meAv = ENG.addAvatar({ id: me.id, name: me.name, look: me.look, x: m.pos[0], y: m.pos[1], role: me.role });
        ENG.setMe(meAv);
        if (!ENG.walkable(meAv.x, meAv.y)) { const [x, y] = ENG.nearestFree(meAv.x, meAv.y); ENG.teleport(x, y); }
        m.players.forEach(addPlayer);
        ['#hud', '#toolbar', '#chat', '#emotes'].forEach(s => ($(s).hidden = false));
        $('#conn').hidden = true;
        updateHud(); updateTower(); updatePlace(); renderEmotes();
        if (!sessionStorage.getItem('seoksan-hello')) {
          sessionStorage.setItem('seoksan-hello', '1');
          chatSys('방향키·WASD 또는 화면을 눌러 걸어요. 물건 앞에서 스페이스(또는 클릭)로 살펴봐요.');
          chatSys('Enter로 채팅, 숫자 1~8로 감정 표현을 해요.');
        }
        break;
      }
      case 'moves':
        for (const [id, x, y, d] of m.m) {
          if (me && id === me.id) continue;
          const av = ENG.avatars.get(id);
          if (av) { av.x = x; av.y = y; av.d = d; }
        }
        break;
      case 'join': addPlayer(m.p); chatSys(`${m.p.name} 님이 마을에 왔어요.`); refreshPanel('people'); break;
      case 'leave': {
        const av = ENG.avatars.get(m.id);
        if (av) chatSys(`${av.name} 님이 나갔어요.`);
        ENG.removeAvatar(m.id);
        refreshPanel('people');
        break;
      }
      case 'chat': ENG.say(m.id, m.text); chatLine(m); break;
      case 'emote': ENG.emote(m.id, m.e); break;
      case 'look': {
        const av = ENG.avatars.get(m.id);
        if (av) av.look = m.look;
        if (me && m.id === me.id) { me.look = m.look; updateHud(); refreshPanel('look'); }
        break;
      }
      case 'obj+': W.objects.push(m.o); ENG.rebuild(); break;
      case 'obj-': {
        const i = W.objects.findIndex(o => o.id === m.id);
        if (i >= 0) W.objects.splice(i, 1);
        if (build.sel && build.sel.id === m.id) build.sel = null;
        ENG.rebuild();
        break;
      }
      case 'objm': {
        const o = W.objects.find(o => o.id === m.id);
        if (o) { o.x = m.x; o.y = m.y; ENG.rebuild(); }
        break;
      }
      case 'objt': {
        const o = W.objects.find(o => o.id === m.id);
        if (o) o.text = m.text;
        break;
      }
      case 'paint': ENG.setTile(m.x, m.y, m.tile); break;
      case 'plot': {
        const i = W.plots.findIndex(p => p.id === m.p.id);
        if (i >= 0) W.plots[i] = m.p;
        updatePlace(); refreshPanel('home');
        break;
      }
      case 'me': {
        const look = me.look;
        me = m.me; me.look = look;
        updateHud(); updatePlace();
        refreshPanel('shop'); refreshPanel('bag'); refreshPanel('home'); refreshPanel('look');
        if (build.on) renderBuildBar();
        break;
      }
      case 'settings': settings = m.settings; updatePlace(); if (build.on) renderBuildBar(); break;
      case 'stones': stoneTotal = m.total; updateTower(); break;
      case 'toast': toast(m.msg, m.big ? 'big' : ''); break;
      case 'err': toast(m.msg, 'err'); break;
      case 'kick': kicked = true; ws.close(); showLogin(m.msg); break;
      case 'auth_fail': kicked = true; UI.setToken(''); showLogin('다시 로그인해 주세요.'); break;
      case 'reload': toast(m.msg || '마을이 새로 바뀌었어요.', 'big'); connect(); break;
    }
  }

  function addPlayer(p) {
    const old = ENG.avatars.get(p.id);
    if (old) { Object.assign(old, { x: p.x, y: p.y, d: p.d, look: p.look, name: p.name }); return; }
    ENG.addAvatar(Object.assign({}, p, { tag: p.role === 'teacher' ? 'rgba(181,106,78,0.92)' : null }));
  }

  // ------------------------------------------------------------ 영역·권한
  function plotAt(x, y) {
    return W.plots.find(p => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) || null;
  }
  function zoneOf(x, y, w, h) {
    if (x < 0 || y < 0 || x + w > W.w || y + h > W.h) return null;
    const ids = new Set();
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { const p = plotAt(xx, yy); ids.add(p ? p.id : ''); }
    if (ids.size !== 1) return null;
    const id = [...ids][0];
    return id ? { kind: 'plot', p: W.plots.find(p => p.id === id) } : { kind: 'public' };
  }
  function canEdit(z) {
    if (!z || !me) return false;
    if (me.role === 'teacher') return true;
    if (z.kind === 'plot') return z.p.owner === me.id;
    return !!settings.publicEdit;
  }
  function overlaps(spec, x, y, skipId) {
    return W.objects.some(o => {
      if (o.id === skipId) return false;
      const s = OBJ[o.t];
      if (!s || !!s.floor !== !!spec.floor) return false;
      return x < o.x + s.w && o.x < x + spec.w && y < o.y + s.h && o.y < y + spec.h;
    });
  }
  function canPlace(spec, x, y, skipId) {
    const z = zoneOf(x, y, spec.w, spec.h);
    return canEdit(z) && !overlaps(spec, x, y, skipId);
  }
  function myPlot() { return me && me.plot ? W.plots.find(p => p.id === me.plot) : null; }

  // ------------------------------------------------------------ 엔진 훅
  const hooks = {
    onMove(av, jump) {
      send({ t: 'move', x: av.x, y: av.y, d: av.d });
      updatePlace();
      const o = ENG.objectAt(av.x, av.y);
      const onGate = !!(o && OBJ[o.t].act === 'story');
      if (onGate && !lastGate && !jump) askStory();
      lastGate = onGate;
    },
    blocked(x, y, fx, fy) {
      const p = plotAt(x, y);
      if (!p || !p.locked || !me || p.owner === me.id || me.role === 'teacher') return false;
      return !(fx != null && plotAt(fx, fy) === p);
    },
    onClick(tx, ty, e) {
      if (build.on) { buildClick(tx, ty, e); return true; }
      const o = ENG.objectAt(tx, ty, true);
      if (o && OBJ[o.t].act) {
        const s = OBJ[o.t];
        if (s.act === 'story') { ENG.goTo(o.x, o.y); return true; }
        ENG.approach(o.x, o.y, s.w, s.h, () => interact(o));
        return true;
      }
      return false;
    },
    onPointer(tx, ty, e) {
      if (build.on && build.tool === 'paint' && e.buttons && ENG.pointer) paintAt(tx, ty);
    },
    onAction() {
      const [fx, fy] = ENG.facing();
      const o = ENG.objectAt(fx, fy) || ENG.objectAt(meAv.x, meAv.y);
      if (o && OBJ[o.t].act) return interact(o);
      const p = plotAt(meAv.x, meAv.y);
      if (p && !p.owner) offerPlot(p);
    },
    onKey(key, e) {
      if (key === 'Enter') { e.preventDefault(); $('#chatInput').focus(); return; }
      if (key === 'Escape') { if (build.on) toggleBuild(false); else closePanel(); return; }
      const n = parseInt(key, 10);
      if (n >= 1 && n <= emotes.length) send({ t: 'emote', e: emotes[n - 1] });
    },
    drawGround(c, cx, cy, S) {
      const dpr = ENG.dpr;
      for (const p of W.plots) {
        const x = p.x * S - cx, y = p.y * S - cy, w = p.w * S, h = p.h * S;
        if (x > c.canvas.width || y > c.canvas.height || x + w < 0 || y + h < 0) continue;
        const mine = me && p.owner === me.id;
        c.save();
        c.setLineDash([6 * dpr, 5 * dpr]);
        c.lineWidth = 2 * dpr;
        c.strokeStyle = mine ? 'rgba(201,123,93,0.9)' : p.owner ? 'rgba(118,88,73,0.45)' : 'rgba(246,239,227,0.8)';
        c.strokeRect(x + dpr, y + dpr, w - 2 * dpr, h - 2 * dpr);
        c.setLineDash([]);
        if (!p.owner) { c.fillStyle = 'rgba(246,239,227,0.14)'; c.fillRect(x, y, w, h); }
        c.restore();
      }
    },
    drawOver(c, cx, cy, S) {
      const pt = ENG.pointer;
      const dpr = ENG.dpr;
      for (const p of W.plots) {
        const x = p.x * S - cx, y = p.y * S - cy;
        if (x > c.canvas.width || y > c.canvas.height || x + p.w * S < 0 || y + p.h * S < 0) continue;
        const mine = me && p.owner === me.id;
        c.save();
        const label = p.owner ? `${p.locked ? '🔒 ' : ''}${p.name || '이름 없는 공간'}` : `${p.no}번 집터 · ${settings.plotPrice}P`;
        c.font = `bold ${Math.round(11 * dpr)}px ${Engine.FONT}`;
        c.textAlign = 'left'; c.textBaseline = 'middle';
        const tw = c.measureText(label).width + 12 * dpr;
        c.fillStyle = mine ? 'rgba(201,123,93,0.9)' : p.owner ? 'rgba(118,88,73,0.75)' : 'rgba(111,140,99,0.85)';
        Engine.roundRect(c, x + 4 * dpr, y + 4 * dpr, tw, 18 * dpr, 9 * dpr); c.fill();
        c.fillStyle = '#F6EFE3';
        c.fillText(label, x + 10 * dpr, y + 13.5 * dpr);
        c.restore();
      }
      if (build.on && pt) {
        c.save();
        if (build.tool === 'place' && build.item) {
          const s = OBJ[build.item];
          drawGhost(c, s, pt.tx, pt.ty, cx, cy, S, canPlace(s, pt.tx, pt.ty));
        } else if (build.tool === 'move' && build.sel) {
          const s = OBJ[build.sel.t];
          drawGhost(c, s, pt.tx, pt.ty, cx, cy, S, canPlace(s, pt.tx, pt.ty, build.sel.id));
        } else if (build.tool === 'paint') {
          const ok = canEdit(zoneOf(pt.tx, pt.ty, 1, 1));
          c.globalAlpha = 0.7;
          c.drawImage(Art.tileSprite(build.tile, 1, 0, S), pt.tx * S - cx, pt.ty * S - cy);
          c.globalAlpha = 1;
          c.strokeStyle = ok ? '#6FAE5C' : '#C0504D'; c.lineWidth = 2 * dpr;
          c.strokeRect(pt.tx * S - cx, pt.ty * S - cy, S, S);
        } else {
          const o = ENG.objectAt(pt.tx, pt.ty, true);
          if (o) {
            const s = OBJ[o.t];
            const ok = canEdit(zoneOf(o.x, o.y, s.w, s.h)) && (me.role === 'teacher' || s.price !== -1);
            c.strokeStyle = !ok ? '#9C9186' : build.tool === 'remove' ? '#C0504D' : '#6FAE5C';
            c.lineWidth = 2.5 * dpr; c.setLineDash([5 * dpr, 4 * dpr]);
            c.strokeRect(o.x * S - cx, (o.y - s.tall) * S - cy, s.w * S, (s.h + s.tall) * S);
          }
        }
        if (build.sel) {
          const s = OBJ[build.sel.t];
          c.strokeStyle = '#C97B5D'; c.lineWidth = 3 * dpr; c.setLineDash([]);
          c.strokeRect(build.sel.x * S - cx, (build.sel.y - s.tall) * S - cy, s.w * S, (s.h + s.tall) * S);
        }
        c.restore();
      }
      // 가까운 팻말 글 보여 주기
      if (meAv && !build.on) {
        for (const o of W.objects) {
          if (o.t !== 'sign' || !o.text) continue;
          if (Math.abs(o.x - meAv.x) + Math.abs(o.y - meAv.y) > 2) continue;
          const px = (o.x + 0.5) * S - cx, py = o.y * S - cy - 6 * dpr;
          c.font = `${Math.round(12.5 * dpr)}px ${Engine.FONT}`;
          c.textAlign = 'center'; c.textBaseline = 'middle';
          const tw = c.measureText(o.text).width + 16 * dpr;
          c.fillStyle = 'rgba(221,182,144,0.97)';
          Engine.roundRect(c, px - tw / 2, py - 12 * dpr, tw, 22 * dpr, 6 * dpr); c.fill();
          c.fillStyle = '#4B3A32';
          c.fillText(o.text, px, py - 1 * dpr);
        }
      }
    },
  };

  function drawGhost(c, s, tx, ty, cx, cy, S, ok) {
    const dpr = ENG.dpr;
    c.globalAlpha = 0.65;
    c.drawImage(Art.objSprite(s, S, s.id === 'tower' ? { level: ENG.towerLevel } : null), tx * S - cx, (ty - s.tall) * S - cy);
    c.globalAlpha = 1;
    c.fillStyle = ok ? 'rgba(111,174,92,0.25)' : 'rgba(192,80,77,0.3)';
    c.fillRect(tx * S - cx, ty * S - cy, s.w * S, s.h * S);
    c.strokeStyle = ok ? '#6FAE5C' : '#C0504D'; c.lineWidth = 2 * dpr;
    c.strokeRect(tx * S - cx, ty * S - cy, s.w * S, s.h * S);
  }

  // ------------------------------------------------------------ 상호작용
  function interact(o) {
    const s = OBJ[o.t];
    switch (s.act) {
      case 'shop': return showPanel('shop');
      case 'board': return openPanel('board', '📌 알림판', el('div', { class: 'notice' }, settings.notice || '아직 알림이 없어요.'));
      case 'story': return askStory();
      case 'tower': return openPanel('tower', '🪨 우리 반 돌탑', el('div', { class: 'stack' },
        el('p', {}, `우리 반 친구들이 이야기 모드에서 모은 기억의 돌이 모두 `, el('b', {}, `${stoneTotal}개`), ` 쌓였어요.`),
        el('p', { class: 'muted' }, '이야기 모드에서 마을 사람들의 부탁을 들어주면 돌이 하나씩 쌓이고, 광장의 돌탑이 조금씩 높아져요.'),
        el('button', { class: 'btn primary', onclick: askStory }, '📖 이야기 모드로 가기')));
      case 'sign': return showSign(o);
    }
  }
  function showSign(o) {
    const s = OBJ[o.t];
    const editable = canEdit(zoneOf(o.x, o.y, s.w, s.h));
    const box = el('div', { class: 'stack' }, el('div', { class: 'notice' }, o.text || '(아직 아무것도 쓰지 않았어요)'));
    if (editable) {
      const ta = el('textarea', { rows: 3, maxlength: 80, placeholder: '80자까지 쓸 수 있어요' });
      ta.value = o.text || '';
      box.append(ta, el('button', { class: 'btn primary', onclick: () => { send({ t: 'text', id: o.id, text: ta.value }); closePanel(); } }, '글 바꾸기'));
    }
    openPanel('sign', `✏️ ${s.name}`, box);
  }
  function askStory() {
    confirmBox('📖 석산 이야기', '이야기 모드로 떠날까요? 돌봄마을 사람들의 부탁을 들어주면 포인트와 기억의 돌, 특별한 아이템을 받아요. 받은 것은 메타버스에도 그대로 들어와요.', '떠나기', () => { location.href = 'story.html'; });
  }
  function offerPlot(p) {
    if (me.role === 'teacher') return toast('집터는 학생용이에요. 선생님은 어디든 꾸밀 수 있어요.');
    if (me.plot) return toast('집터는 한 사람에 하나예요.');
    confirmBox(`🏠 ${p.no}번 집터`, `${settings.plotPrice}P로 이 집터를 내 공간으로 살까요? (지금 ${me.points}P) 산 뒤에는 가방의 가구를 놓고 바닥을 칠할 수 있어요.`, '살래요', () => send({ t: 'buyplot', plot: p.id }));
  }

  // ------------------------------------------------------------ HUD
  function updateHud() {
    if (!me) return;
    $('#meName').textContent = me.name + (me.role === 'teacher' ? ' 선생님' : '');
    $('#mePoints').textContent = me.points;
    $('#meStones').textContent = me.stones.length;
    const cv = $('#meIcon'), c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    c.imageSmoothingEnabled = false;
    c.drawImage(Art.avatarIcon(me.look, 88, 0, 'head'), 0, 4);
  }
  function updateTower() {
    if (ENG) ENG.towerLevel = Math.min(14, 2 + Math.round(Math.sqrt(stoneTotal) * 1.2));
  }
  function updatePlace() {
    if (!meAv || !W) return;
    const p = plotAt(meAv.x, meAv.y);
    const box = $('#placeName');
    box.replaceChildren();
    if (p) box.append(p.owner ? el('b', {}, (p.locked ? '🔒 ' : '🏠 ') + (p.name || '누군가의 공간')) : el('span', {}, `${p.no}번 집터 · 분양 중`));
    else box.append(el('b', {}, '🌿 ' + (settings.className || '석산 광장')));
    const hint = $('#actionHint');
    hint.replaceChildren();
    if (p && !p.owner && me.role === 'student' && !me.plot) {
      hint.append(el('button', { class: 'btn primary', onclick: () => offerPlot(p) }, `🏠 이 집터 사기 (${settings.plotPrice}P)`));
      hint.hidden = false;
    } else hint.hidden = true;
  }

  // ------------------------------------------------------------ 채팅
  function chatLine(m) {
    const log = $('#chatLog');
    log.append(el('p', { class: m.role === 'teacher' ? 'teacher' : '' },
      el('span', { class: 'tag' }, m.scope === 'all' ? '[전체]' : '[근처]'),
      el('span', { class: 'who' }, m.name), ' ', m.text));
    trimLog();
  }
  function chatSys(text) {
    $('#chatLog').append(el('p', { class: 'sys' }, text));
    trimLog();
  }
  function trimLog() {
    const log = $('#chatLog');
    while (log.children.length > 120) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  function renderEmotes() {
    $('#emotes').replaceChildren(...emotes.map((e, i) =>
      el('button', { title: `${i + 1}번 키`, onclick: () => send({ t: 'emote', e }) }, e)));
  }

  // ------------------------------------------------------------ UI 연결
  function bindUi() {
    $('#panelClose').onclick = closePanel;
    $('#toolbar').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const k = b.dataset.p;
      if (k === 'build') return toggleBuild(!build.on);
      if (k === 'story') return askStory();
      if (currentPanel() === k) return closePanel();
      showPanel(k);
    });
    $('#chatForm').addEventListener('submit', e => {
      e.preventDefault();
      const inp = $('#chatInput');
      const text = inp.value.trim();
      if (text) send({ t: 'chat', text, scope });
      inp.value = '';
      if (!text) inp.blur();
    });
    $('#chatInput').addEventListener('keydown', e => { if (e.key === 'Escape') e.target.blur(); });
    $('#scopeBtn').onclick = () => {
      if (scope === 'near' && !settings.allChat && me.role !== 'teacher') return toast('지금은 근처 채팅만 쓸 수 있어요.');
      scope = scope === 'near' ? 'all' : 'near';
      $('#scopeBtn').textContent = scope === 'near' ? '근처' : '전체';
      $('#scopeBtn').classList.toggle('all', scope === 'all');
      toast(scope === 'near' ? '가까이 있는 친구(같은 공간)에게만 말해요.' : '마을 모두에게 말해요.');
    };
  }
  function refreshPanel(kind) { if (currentPanel() === kind) showPanel(kind, true); }

  function showPanel(kind, refresh) {
    const body = PANELS[kind] && PANELS[kind](refresh);
    if (body) openPanel(kind, body.title, body.node);
  }

  // 패널 상태(탭 등)
  const ps = { lookSlot: 'hair', lookDir: 0, shopTab: 'wear', bagTab: 'obj' };
  const FOCUS = { hair: 'head', head: 'hat', top: 'body', bottom: 'feet', shoes: 'feet', hand: 'wide', back: 'wide' };

  const PANELS = {
    look() {
      const node = el('div', { class: 'look-wrap' });
      const prev = el('div', { class: 'look-prev' });
      const cv = el('canvas', { width: 240, height: 240 });
      const c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      c.drawImage(Art.avatarIcon(me.look, 240, ps.lookDir, 'wide'), 0, 0);
      prev.append(cv, el('div', { class: 'row' },
        el('button', { class: 'btn small', onclick: () => { ps.lookDir = [1, 3, 0, 2][ps.lookDir]; showPanel('look'); } }, '◀'),
        el('button', { class: 'btn small', onclick: () => { ps.lookDir = [2, 0, 3, 1][ps.lookDir]; showPanel('look'); } }, '▶')));
      const right = el('div', { class: 'stack' });
      const slots = [...(CAT.presets ? [['set', '직업 세트']] : []), ['skin', '피부'], ...CAT.wearSlots.map(s => [s.id, s.name])];
      right.append(tabs(slots, ps.lookSlot, id => { ps.lookSlot = id; showPanel('look'); }));
      if (ps.lookSlot === 'set') {
        right.append(el('p', { class: 'muted' }, '직업 옷차림을 한 번에 입어 봐요. 아직 없는 옷은 상점에서 살 수 있어요.'));
        const grid = el('div', { class: 'grid' });
        for (const pr of CAT.presets) {
          const missing = presetMissing(pr);
          const need = missing.reduce((a, w) => a + Math.max(0, w.price), 0);
          grid.append(el('div', { class: 'item', onclick: () => applyPreset(pr) },
            Art.avatarIcon(Object.assign({}, pr.look, { skin: me.look.skin }), 128, ps.lookDir, 'wide'), el('b', {}, pr.name),
            missing.length ? el('span', { class: 'price' }, `🔒 ${need}P`) : el('span', { class: 'own' }, '모두 있어요')));
        }
        right.append(grid);
      } else if (ps.lookSlot === 'skin') {
        right.append(swatches(CAT.skins, me.look.skin, col => setLook({ skin: col })));
      } else {
        const slot = CAT.wearSlots.find(s => s.id === ps.lookSlot);
        if (slot.color) right.append(swatches(ps.lookSlot === 'hair' ? CAT.hairColors : CAT.clothColors, me.look[slot.color], col => setLook({ [slot.color]: col })));
        const grid = el('div', { class: 'grid' });
        for (const w of CAT.wear.filter(w => w.slot === ps.lookSlot)) {
          const owned = w.price === 0 || me.owned.includes(w.id) || me.role === 'teacher';
          const tryLook = tryOn(w);
          const icon = Art.avatarIcon(tryLook, 128, ps.lookDir, FOCUS[w.slot]);
          const tag = owned ? (me.look[w.slot] === w.id ? el('span', { class: 'own' }, '입는 중') : el('span', { class: 'muted' }, '가진 것'))
            : w.price > 0 ? el('span', { class: 'price' }, `🔒 ${w.price}P`) : el('span', { class: 'muted' }, '🔒 ' + (w.note || '특별 보상'));
          grid.append(el('div', {
            class: 'item' + (me.look[w.slot] === w.id ? ' sel' : '') + (owned ? '' : ' locked'),
            onclick: () => {
              if (owned) return setLook({ [w.slot]: w.id });
              if (w.price < 0) return toast(`${w.name}은(는) ${w.note || '특별 보상'}으로 얻을 수 있어요.`);
              confirmBox('🛍️ 사기', `${w.name}을(를) ${w.price}P에 살까요? (지금 ${me.points}P)`, '살래요', () => { ps.after = { [w.slot]: w.id }; send({ t: 'buy', item: w.id }); setTimeout(() => showPanel('look'), 400); });
            },
          }, icon, el('b', {}, w.name), tag));
        }
        right.append(grid);
      }
      node.append(prev, right);
      if (ps.after) {
        const k = Object.keys(ps.after)[0];
        if (me.owned.includes(ps.after[k])) { const a = ps.after; ps.after = null; setLook(a); }
      }
      return { title: '👕 캐릭터 꾸미기', node };
    },
    shop() {
      const node = el('div', { class: 'stack' });
      node.append(el('p', { class: 'muted' }, `지금 가진 포인트: ⭐ ${me.points}P · 산 가구는 🎒가방에 들어가요.`));
      const tabList = [['wear', '옷·장식'], ...CAT.objectCats.filter(c => c.id !== 'special').map(c => [c.id, c.name])];
      node.append(tabs(tabList, ps.shopTab, id => { ps.shopTab = id; showPanel('shop'); }));
      const grid = el('div', { class: 'grid' });
      if (ps.shopTab === 'wear') {
        for (const w of CAT.wear.filter(w => w.price > 0)) {
          const owned = me.owned.includes(w.id);
          const icon = Art.avatarIcon(tryOn(w), 128, 0, FOCUS[w.slot]);
          grid.append(el('div', { class: 'item' }, icon, el('b', {}, w.name),
            owned ? el('span', { class: 'own' }, '가지고 있어요')
              : el('button', { class: 'btn small primary', disabled: me.points < w.price || me.role === 'teacher', onclick: () => send({ t: 'buy', item: w.id }) }, `${w.price}P 사기`)));
        }
      } else {
        for (const s of CAT.objects.filter(o => o.cat === ps.shopTab && o.price > 0)) {
          const n = me.inv[s.id] || 0;
          grid.append(el('div', { class: 'item' }, Art.objIcon(s, 128), el('b', {}, s.name),
            el('span', { class: 'muted' }, `${s.w}×${s.h}칸${n ? ` · 가방 ${n}` : ''}`),
            el('button', { class: 'btn small primary', disabled: me.points < s.price || me.role === 'teacher', onclick: () => send({ t: 'buy', item: s.id }) }, `${s.price}P 사기`)));
        }
      }
      node.append(grid);
      if (me.role === 'teacher') node.append(el('p', { class: 'muted' }, '선생님은 물건을 사지 않아도 🔨배치에서 모든 물건을 놓을 수 있어요.'));
      return { title: '🛍️ 석산 상점', node };
    },
    bag() {
      const node = el('div', { class: 'stack' });
      node.append(tabs([['obj', '가구·소품'], ['stone', '기억의 돌']], ps.bagTab, id => { ps.bagTab = id; showPanel('bag'); }));
      if (ps.bagTab === 'obj') {
        const ids = Object.keys(me.inv).filter(k => me.inv[k] > 0 && OBJ[k]);
        if (!ids.length) node.append(el('p', { class: 'muted' }, '가방이 비었어요. 🛍️상점에서 가구를 사거나, 이야기 모드에서 보상을 받아 보세요.'));
        const list = el('div', { class: 'list' });
        for (const id of ids) {
          const s = OBJ[id];
          list.append(el('div', { class: 'li' }, Art.objIcon(s, 80), el('div', { class: 'grow' }, el('b', {}, s.name), el('div', { class: 'muted' }, `× ${me.inv[id]}`)),
            el('button', { class: 'btn small primary', onclick: () => placeFromBag(id) }, '놓기')));
        }
        node.append(list);
      } else {
        node.append(me.stones.length ? el('div', { class: 'stones' }, me.stones.map(s => el('span', { class: 'stone-chip' }, '🪨 ' + s)))
          : el('p', { class: 'muted' }, '아직 기억의 돌이 없어요. 📖 이야기 모드에서 모을 수 있어요.'));
      }
      return { title: '🎒 가방', node };
    },
    home() {
      const node = el('div', { class: 'stack' });
      const p = myPlot();
      if (me.role === 'teacher') {
        node.append(el('p', {}, '선생님은 모든 곳을 꾸밀 수 있어요. 학생 집터 관리는 관리 화면에서 해요.'),
          el('a', { class: 'btn', href: 'admin.html', target: '_blank' }, '🛠️ 관리 화면 열기'));
      } else if (p) {
        const name = el('input', { maxlength: 16, value: p.name || '' });
        node.append(el('p', {}, `${p.no}번 집터가 내 공간이에요. 가방의 가구를 놓고, 🔨배치에서 바닥도 칠할 수 있어요.`),
          el('label', { class: 'stack' }, el('span', { class: 'muted' }, '공간 이름'), el('div', { class: 'row' }, name,
            el('button', { class: 'btn small', onclick: () => send({ t: 'plotset', plot: p.id, name: name.value }) }, '바꾸기'))),
          el('div', { class: 'row' },
            el('button', { class: 'btn ' + (p.locked ? 'on' : ''), onclick: () => send({ t: 'plotset', plot: p.id, locked: !p.locked }) }, p.locked ? '🔒 잠금 켜짐 (친구가 못 들어와요)' : '🔓 잠금 꺼짐 (누구나 놀러 와요)')),
          el('p', { class: 'muted' }, '공간 안에서 하는 “근처” 채팅은 같은 공간에 있는 친구에게만 들려요.'),
          el('div', { class: 'row' },
            el('button', { class: 'btn primary', onclick: () => goPlot(p) }, '🏠 내 공간으로 가기'),
            el('button', { class: 'btn', onclick: () => { goPlot(p); toggleBuild(true); } }, '🔨 꾸미러 가기')));
      } else {
        const free = W.plots.filter(q => !q.owner);
        node.append(el('p', {}, `포인트 ${settings.plotPrice}P로 집터 하나를 사서 나만의 공간을 만들 수 있어요. (지금 ⭐${me.points}P)`),
          el('p', { class: 'muted' }, `남은 집터 ${free.length}곳 · 광장 남쪽에 있어요. 집터 안에 들어가면 “이 집터 사기” 버튼이 나와요.`),
          el('p', { class: 'muted' }, '포인트는 선생님께 받거나, 매일 출석하거나, 📖 이야기 모드에서 모을 수 있어요.'));
        if (free.length) node.append(el('button', { class: 'btn primary', onclick: () => { goPlot(free[0]); closePanel(); } }, '빈 집터 구경 가기'));
      }
      node.append(el('button', { class: 'btn', onclick: () => { const sp = W.spawn || [35, 17]; const [x, y] = ENG.nearestFree(sp[0], sp[1]); ENG.teleport(x, y); closePanel(); } }, '🌿 광장으로 가기'));
      return { title: '🏠 내 공간', node };
    },
    people() {
      const node = el('div', { class: 'list' });
      const list = [...ENG.avatars.values()].sort((a, b) => (a === meAv ? -1 : b === meAv ? 1 : a.name.localeCompare(b.name, 'ko')));
      node.append(el('p', { class: 'muted' }, `지금 마을에 ${list.length}명이 있어요.`));
      for (const av of list) {
        node.append(el('div', { class: 'li' }, Art.avatarIcon(av.look, 80, 0, 'head'), el('div', { class: 'grow' }, el('b', {}, av.name), av.role === 'teacher' ? el('div', { class: 'muted' }, '선생님') : null),
          av === meAv ? el('span', { class: 'muted' }, '나') : el('button', { class: 'btn small', onclick: () => { const [x, y] = ENG.nearestFree(av.x, av.y + 1); ENG.teleport(x, y); closePanel(); } }, '찾아가기')));
      }
      return { title: '👥 접속한 친구', node };
    },
    menu() {
      const node = el('div', { class: 'stack' });
      node.append(el('div', { class: 'row' }, '화면 크기',
        el('button', { class: 'btn small', onclick: () => ENG.setZoom(ENG.zoom - 6) }, '－ 작게'),
        el('button', { class: 'btn small', onclick: () => ENG.setZoom(ENG.zoom + 6) }, '＋ 크게')));
      node.append(el('div', { class: 'row' }, '캐릭터 그림체',
        el('button', { class: 'btn small' + (Avatar.style === 'smooth' ? ' primary' : ''), onclick: () => { Avatar.setStyle('smooth'); showPanel('menu'); updateHud(); } }, '부드럽게'),
        el('button', { class: 'btn small' + (Avatar.style === 'pixel' ? ' primary' : ''), onclick: () => { Avatar.setStyle('pixel'); showPanel('menu'); updateHud(); } }, '도트')));
      node.append(el('div', { class: 'notice' },
        '걷기: 방향키 · WASD · 화면 누르기\n살펴보기: 스페이스 · E · 물건 누르기\n채팅: Enter (근처 ↔ 전체 버튼으로 바꾸기)\n감정 표현: 숫자 1~8\n배치 모드 닫기: Esc'));
      const old = el('input', { type: 'password', placeholder: '지금 비밀번호' }), nw = el('input', { type: 'password', placeholder: '새 비밀번호 (4글자 이상)' });
      node.append(el('b', {}, '비밀번호 바꾸기'), old, nw, el('button', {
        class: 'btn', onclick: async () => {
          try { await api('/api/password', { old: old.value, new: nw.value }); toast('비밀번호를 바꿨어요.'); old.value = nw.value = ''; }
          catch (e) { toast(e.message, 'err'); }
        },
      }, '바꾸기'));
      if (me.role === 'teacher') node.append(el('a', { class: 'btn green', href: 'admin.html', target: '_blank' }, '🛠️ 선생님 관리 화면'));
      node.append(el('button', {
        class: 'btn', onclick: async () => {
          try { await api('/api/logout', {}); } catch (e) { /* 무시 */ }
          UI.setToken(''); kicked = true; if (ws) ws.close(); toggleBuild(false); showLogin('로그아웃했어요.');
        },
      }, '로그아웃'));
      return { title: '⚙️ 설정', node };
    },
  };

  function swatches(cols, cur, pick) {
    return el('div', { class: 'swatches' }, cols.map(col =>
      el('span', { class: 'swatch' + (col.toLowerCase() === String(cur).toLowerCase() ? ' sel' : ''), style: `background:${col}`, onclick: () => pick(col) })));
  }
  /** 아이템 하나를 입혀 본 모습 (겹쳐서 가려지는 것은 잠깐 벗긴다) */
  function tryOn(w) {
    const L = Object.assign({}, me.look, { [w.slot]: w.id });
    if (w.slot === 'hair') L.head = 'head_none';
    if (w.slot === 'bottom' || w.slot === 'shoes') { L.top = 'top_tee'; L.back = 'back_none'; }
    return L;
  }
  /** 직업 세트에서 아직 내 것이 아닌 옷 */
  function presetMissing(pr) {
    return CAT.wear.filter(w => Object.values(pr.look).includes(w.id) && w.price !== 0 && !(me.owned.includes(w.id) || me.role === 'teacher'));
  }
  function applyPreset(pr) {
    const have = new Set(CAT.wear.filter(w => w.price === 0 || me.owned.includes(w.id) || me.role === 'teacher').map(w => w.id));
    const patch = {};
    for (const [k, v] of Object.entries(pr.look)) {
      if (k === 'skin') continue;
      const isItem = /^(hair|top|bottom|shoes|head|hand|back)_/.test(String(v));
      if (!isItem || have.has(v)) patch[k] = v;
    }
    const missing = presetMissing(pr);
    if (missing.length) toast(`${missing.map(w => w.name).join(', ')}은(는) 상점에서 살 수 있어요.`);
    setLook(patch);
  }
  function setLook(patch) {
    me.look = Object.assign({}, me.look, patch);
    meAv.look = me.look;
    send({ t: 'look', look: me.look });
    updateHud();
    showPanel('look');
  }
  function goPlot(p) {
    const [x, y] = ENG.nearestFree(p.x + Math.floor(p.w / 2), p.y + p.h - 1);
    ENG.teleport(x, y);
  }
  function placeFromBag(id) {
    if (!myPlot() && me.role !== 'teacher') return toast('먼저 🏠집터를 사야 가구를 놓을 수 있어요.', 'err');
    closePanel();
    build.src = 'inv'; build.tool = 'place'; build.item = id;
    toggleBuild(true);
    if (myPlot() && plotAt(meAv.x, meAv.y) !== myPlot()) goPlot(myPlot());
  }

  // ------------------------------------------------------------ 배치(꾸미기) 모드
  function toggleBuild(on) {
    build.on = on;
    build.sel = null;
    $('#buildBtn').classList.toggle('on', on);
    $('#buildBar').hidden = !on;
    document.body.classList.toggle('building', on);
    if (on) {
      closePanel();
      if (me.role !== 'teacher' && !myPlot() && !settings.publicEdit) {
        toast('집터를 사면 내 공간을 꾸밀 수 있어요. 지금은 볼 수만 있어요.');
      }
      renderBuildBar();
    }
  }
  function renderBuildBar() {
    const bar = $('#buildBar');
    const tools = [['place', '📦 놓기'], ['move', '✋ 옮기기'], ['remove', '🧹 치우기'], ['paint', '🎨 바닥']];
    const hints = {
      place: '아래에서 물건을 고르고 땅을 눌러요',
      move: '물건을 누른 뒤, 옮길 곳을 눌러요',
      remove: '치울 물건을 눌러요 (집터 물건은 가방으로)',
      paint: '바닥 무늬를 고르고 누르거나 끌어요',
    };
    const toolRow = el('div', { class: 'build-tools' },
      tools.map(([id, name]) => el('button', { class: 'btn small' + (build.tool === id ? ' on' : ''), onclick: () => { build.tool = id; build.sel = null; renderBuildBar(); } }, name)),
      el('span', { class: 'hint' }, hints[build.tool]),
      el('button', { class: 'btn small', onclick: () => toggleBuild(false) }, '닫기 ✕'));
    const kids = [toolRow];
    const publicOk = me.role === 'teacher' || settings.publicEdit;
    if (build.tool === 'place') {
      const srcs = [['inv', '🎒 내 가방']];
      if (publicOk) CAT.objectCats.forEach(c => (c.id !== 'special' || me.role === 'teacher') && srcs.push([c.id, c.name]));
      if (!srcs.some(s => s[0] === build.src)) build.src = 'inv';
      kids.push(tabs(srcs, build.src, id => { build.src = id; build.item = null; renderBuildBar(); }));
      const items = el('div', { class: 'build-items' });
      let list;
      if (build.src === 'inv') list = Object.keys(me.inv).filter(k => me.inv[k] > 0 && OBJ[k]).map(k => [OBJ[k], me.inv[k]]);
      else list = CAT.objects.filter(o => o.cat === build.src && (o.price >= 0 || me.role === 'teacher') && o.price !== -2).map(o => [o, null]);
      if (build.item && build.src === 'inv' && !(me.inv[build.item] > 0)) build.item = null;
      if (!list.length) items.append(el('span', { class: 'muted' }, build.src === 'inv' ? '가방이 비었어요. 🛍️상점에서 가구를 사 보세요. (집터 안에만 놓을 수 있어요)' : '물건이 없어요.'));
      for (const [s, n] of list) {
        items.append(el('div', { class: 'bitem' + (build.item === s.id ? ' sel' : ''), title: s.name, onclick: () => { build.item = s.id; renderBuildBar(); } },
          Art.objIcon(s, 108), s.name, n ? el('span', { class: 'cnt' }, n) : null));
      }
      kids.push(items);
      if (build.src !== 'inv') kids.push(el('span', { class: 'muted' }, me.role === 'teacher' ? '선생님: 어디든 무료로 놓을 수 있어요.' : '광장 꾸미기가 허락되어 있어요. 광장에는 무료로 놓을 수 있어요.'));
    } else if (build.tool === 'paint') {
      const items = el('div', { class: 'build-items' });
      for (const t of CAT.tiles) {
        items.append(el('div', { class: 'bitem' + (build.tile === t.id ? ' sel' : ''), onclick: () => { build.tile = t.id; renderBuildBar(); } }, Art.tileIcon(t.id, 108), t.name));
      }
      kids.push(items);
    }
    bar.replaceChildren(...kids);
  }
  function buildClick(tx, ty, e) {
    if (e.button === 2) { build.sel = null; return; }
    if (build.tool === 'place') {
      if (!build.item) return toast('아래 줄에서 놓을 물건을 먼저 골라요.');
      const s = OBJ[build.item];
      const z = zoneOf(tx, ty, s.w, s.h);
      if (!canEdit(z)) return toast(me.role === 'student' && !settings.publicEdit ? '내 집터 안에만 놓을 수 있어요.' : '여기에는 놓을 수 없어요.', 'err');
      if (build.src === 'inv' && z.kind !== 'plot' && me.role !== 'teacher') return toast('가방 물건은 내 집터 안에 놓아요.', 'err');
      if (build.src !== 'inv' && z.kind === 'plot' && me.role !== 'teacher') return toast('집터에는 가방의 물건만 놓을 수 있어요.', 'err');
      if (overlaps(s, tx, ty)) return toast('다른 물건과 겹쳐요.', 'err');
      send({ t: 'place', item: build.item, x: tx, y: ty });
    } else if (build.tool === 'paint') {
      build.lastPaint = '';
      paintAt(tx, ty);
    } else if (build.tool === 'move') {
      if (build.sel) {
        send({ t: 'moveobj', id: build.sel.id, x: tx, y: ty });
        build.sel = null;
      } else {
        const o = ENG.objectAt(tx, ty, true);
        if (!o) return;
        const s = OBJ[o.t];
        if (!canEdit(zoneOf(o.x, o.y, s.w, s.h)) || (s.price === -1 && me.role !== 'teacher')) return toast('이 물건은 옮길 수 없어요.', 'err');
        build.sel = o;
      }
    } else if (build.tool === 'remove') {
      const o = ENG.objectAt(tx, ty, true);
      if (!o) return;
      const s = OBJ[o.t];
      if (!canEdit(zoneOf(o.x, o.y, s.w, s.h)) || (s.price === -1 && me.role !== 'teacher')) return toast('이 물건은 치울 수 없어요.', 'err');
      send({ t: 'remove', id: o.id });
    }
  }
  function paintAt(tx, ty) {
    const key = tx + ',' + ty;
    if (build.lastPaint === key) return;
    build.lastPaint = key;
    if (!ENG.inBounds(tx, ty) || ENG.tileAt(tx, ty) === build.tile) return;
    if (!canEdit(zoneOf(tx, ty, 1, 1))) return;
    send({ t: 'paint', x: tx, y: ty, tile: build.tile });
  }

  window.SEOKSAN = { get me() { return me; }, get engine() { return ENG; }, send };

  // ------------------------------------------------------------ 처음 열 때
  let signedIn = false;
  if (UI.getToken()) {
    try { await api('/api/me'); signedIn = true; } catch (e) { /* 다시 로그인 */ }
  }
  if (signedIn) start(); else showLogin();
})();
