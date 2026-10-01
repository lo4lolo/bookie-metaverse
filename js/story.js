/* 석산 이야기 — 스토리 모드(혼자 하는 이야기). 로그인하면 보상이 메타버스 계정에 들어간다. */
(async function () {
  'use strict';
  const { api, el, toast, openPanel, closePanel, currentPanel } = UI;
  const $ = s => document.querySelector(s);
  const GUEST_KEY = 'seoksan-story-guest';

  const [CAT, ST] = await Promise.all([
    fetch('data/catalog.json', { cache: 'no-cache' }).then(r => r.json()),
    fetch('data/story.json', { cache: 'no-cache' }).then(r => r.json()),
  ]);
  const Q = {}, NPC = {};
  ST.quests.forEach(q => (Q[q.id] = q));
  ST.npcs.forEach(n => (NPC[n.id] = n));
  const WEAR = {};
  CAT.wear.forEach(w => (WEAR[w.id] = w));

  // ------------------------------------------------------------ 진행 불러오기
  let online = false, me = { name: '여행자', look: CAT.defaultLook, points: 0 }, prog = null, done = [], stones = [];
  if (UI.getToken()) {
    try {
      const r = await api('/api/story');
      online = true; me = r.me; prog = r.progress; done = r.quests.slice(); stones = r.stones.slice();
    } catch (e) { /* 손님으로 */ }
  }
  if (!online) {
    try { prog = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null'); } catch (e) { prog = null; }
    done = (prog && prog.done) || [];
    stones = (prog && prog.stones) || [];
  }
  prog = Object.assign({ pos: null, picked: [], items: {}, active: [], talked: {}, visited: [], intro: false }, prog || {});
  prog.active = prog.active.filter(id => Q[id] && !done.includes(id));

  // ------------------------------------------------------------ 지도 만들기
  const ground = [], objects = [];
  const H = ST.map.length, W = Math.max(...ST.map.map(r => r.length));
  ST.map.forEach((row, y) => {
    let g = '';
    for (let x = 0; x < W; x++) {
      const [tile, obj] = (ST.legend[row[x] || '.'] || 'g').split('+');
      g += tile;
      if (obj) objects.push({ id: `m${x}_${y}`, t: obj, x, y });
    }
    ground.push(g);
  });
  ST.objects.forEach((o, i) => objects.push(Object.assign({ id: 's' + i }, o)));
  objects.push({ id: 'tower', t: 'tower', x: ST.tower[0], y: ST.tower[1] });
  const map = { w: W, h: H, ground, objects, plots: [] };
  const npcAt = new Map(ST.npcs.map(n => [n.x + ',' + n.y, n]));

  let dlg = null, typing = null, saveTimer = null;
  const ENG = new Engine($('#game'), {
    catalog: CAT,
    hooks: {
      blocked: (x, y) => npcAt.has(x + ',' + y),
      onMove: av => arrive(av.x, av.y),
      onAction() {
        if (dlg) return nextLine();
        const [fx, fy] = ENG.facing();
        const n = npcAt.get(fx + ',' + fy);
        if (n) return talk(n);
        const o = ENG.objectAt(fx, fy, false);
        if (o) inspect(o);
      },
      onKey(key, e) {
        if (key === 'Enter' && dlg) { e.preventDefault(); nextLine(); }
        if (key === 'Escape') closePanel();
      },
      onClick(tx, ty) {
        if (dlg) { nextLine(); return true; }
        const n = npcAt.get(tx + ',' + ty) || npcAt.get(tx + ',' + (ty + 1));
        if (n) { ENG.approach(n.x, n.y, 1, 1, () => talk(n)); return true; }
        const o = ENG.objectAt(tx, ty, true);
        if (o && (o.t === 'sign' || o.t === 'tower')) {
          const s = ENG.OBJ[o.t];
          ENG.approach(o.x, o.y, s.w, s.h, () => inspect(o));
          return true;
        }
        return false;
      },
      drawables(list, cx, cy, S) {
        const t = ENG.t;
        for (const p of ST.pickups) {
          if (prog.picked.includes(p.id)) continue;
          const px = p.x * S - cx, py = p.y * S - cy;
          if (px < -S || py < -S || px > ENG.cv.width || py > ENG.cv.height) continue;
          list.push({
            z: (p.y + 1) * S - 1,
            draw: () => {
              const c = ENG.ctx, bob = Math.sin(t * 3 + p.x) * S * 0.06;
              c.fillStyle = 'rgba(75,58,50,0.16)';
              c.beginPath(); c.ellipse(px + S / 2, py + S * 0.86, S * 0.28, S * 0.08, 0, 0, Math.PI * 2); c.fill();
              c.drawImage(Art.itemSprite(p.item, Math.round(S * 0.8)), px + S * 0.1, py + S * 0.02 + bob);
              if (Math.sin(t * 4 + p.x * 2) > 0.7) { c.fillStyle = '#FBEFC8'; c.fillRect(px + S * 0.75, py + S * 0.1, S * 0.08, S * 0.08); }
            },
          });
        }
      },
      drawGround(c, cx, cy, S) {
        for (const q of activeQuests()) {
          if (q.need.type !== 'visit' || prog.visited.includes(q.need.spot)) continue;
          const sp = ST.spots.find(s => s.id === q.need.spot);
          const a = 0.25 + 0.15 * Math.sin(ENG.t * 3);
          c.fillStyle = `rgba(235,203,122,${a})`;
          c.beginPath(); c.arc((sp.x + 0.5) * S - cx, (sp.y + 0.5) * S - cy, S * (sp.r + 0.5), 0, Math.PI * 2); c.fill();
        }
      },
      drawOver(c, cx, cy, S) {
        const dpr = ENG.dpr, u = S / 16;
        for (const n of ST.npcs) {
          const mk = marker(n.id);
          if (!mk) continue;
          const px = (n.x + 0.5) * S - cx, py = n.y * S - cy + S - 27 * u - 26 * dpr + Math.sin(ENG.t * 4) * 2 * dpr;
          c.fillStyle = mk === '?' ? '#6F8C63' : mk === '!' ? '#C97B5D' : '#526D89';
          c.beginPath(); c.arc(px, py, 10 * dpr, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#F6EFE3';
          c.font = `bold ${Math.round(14 * dpr)}px ${Engine.FONT}`;
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(mk, px, py + dpr);
        }
      },
    },
  });
  ENG.setMap(map);
  const start = prog.pos || ST.spawn;
  const meAv = ENG.addAvatar({ id: 'me', name: me.name, look: me.look, x: start[0], y: start[1] });
  ENG.setMe(meAv);
  if (!ENG.walkable(meAv.x, meAv.y)) { const [x, y] = ENG.nearestFree(...ST.spawn); ENG.teleport(x, y); }
  for (const n of ST.npcs) ENG.addAvatar({ id: n.id, name: n.name, look: n.look, x: n.x, y: n.y, d: n.d, tag: 'rgba(82,109,137,0.88)' });
  updateTower();
  updateHud();

  // ------------------------------------------------------------ 도구
  function activeQuests() { return prog.active.map(id => Q[id]).filter(Boolean); }
  function state(q) {
    if (done.includes(q.id)) return 'done';
    if (prog.active.includes(q.id)) return 'active';
    return (q.pre || []).every(p => done.includes(p)) ? 'avail' : 'locked';
  }
  function talked(q) { return prog.talked[q.id] || (prog.talked[q.id] = []); }
  function satisfied(q) {
    const n = q.need;
    switch (n.type) {
      case 'collect': return (prog.items[n.item] || 0) >= n.count;
      case 'talk': return n.npcs.every(id => talked(q).includes(id));
      case 'visit': return prog.visited.includes(n.spot);
      case 'stones': return stones.length >= n.count;
    }
    return false;
  }
  function progressText(q) {
    const n = q.need;
    switch (n.type) {
      case 'collect': return `${ST.items[n.item].name} ${Math.min(n.count, prog.items[n.item] || 0)}/${n.count}`;
      case 'talk': return `${talked(q).filter(id => n.npcs.includes(id)).length}/${n.npcs.length}명`;
      case 'visit': return prog.visited.includes(n.spot) ? '다녀왔어요' : '아직';
      case 'stones': return `기억의 돌 ${Math.min(n.count, stones.length)}/${n.count}`;
    }
    return '';
  }
  function marker(id) {
    const mine = ST.quests.filter(q => q.npc === id);
    if (mine.some(q => state(q) === 'active' && satisfied(q))) return '?';
    if (activeQuests().some(q => q.need.type === 'talk' && q.need.npcs.includes(id) && !talked(q).includes(id))) return '💬';
    if (mine.some(q => state(q) === 'avail')) return '!';
    return '';
  }
  function fill(s) { return s.replace(/\{name\}/g, me.name); }

  // ------------------------------------------------------------ 움직임·줍기
  function arrive(x, y) {
    for (const p of ST.pickups) {
      if (p.x === x && p.y === y && !prog.picked.includes(p.id)) {
        prog.picked.push(p.id);
        prog.items[p.item] = (prog.items[p.item] || 0) + 1;
        toast(`✨ ${ST.items[p.item].name} +1 (가진 것 ${prog.items[p.item]}개)`);
        const q = activeQuests().find(q => q.need.type === 'collect' && q.need.item === p.item);
        if (q && satisfied(q) && prog.items[p.item] === q.need.count) toast(`${NPC[q.npc].name}에게 가져다주자!`, 'big');
        save();
      }
    }
    for (const sp of ST.spots) {
      if (Math.abs(sp.x - x) <= sp.r && Math.abs(sp.y - y) <= sp.r && !prog.visited.includes(sp.id)) {
        const q = activeQuests().find(q => q.need.type === 'visit' && q.need.spot === sp.id);
        if (!q) continue;
        prog.visited.push(sp.id);
        say([{ who: '', text: `📍 ${sp.name}에 왔다. ` + (sp.id === 'falls' ? '물소리가 가슴까지 울린다.' : sp.id === 'hilltop' ? '바람이 머리카락을 쓸고 지나간다. 마을이 한눈에 보인다.' : '커다란 나무 아래, 흙 위에 작은 돌 하나가 놓여 있다.') },
          { who: '', text: `${NPC[q.npc].name}에게 돌아가 이야기해 주자.` }]);
        save();
      }
    }
    updateHud();
  }
  function inspect(o) {
    if (o.t === 'sign') say([{ who: '', text: `팻말: “${o.text || ''}”` }]);
    if (o.t === 'tower') say([{ who: '', text: stones.length ? `돌탑에 나의 기억의 돌 ${stones.length}개가 쌓여 있다. (${stones.join(', ')})` : '아직 나의 돌은 하나도 없다. 마을 사람들을 도우면 돌이 생긴다.' }]);
  }

  // ------------------------------------------------------------ 대화
  function talk(n) {
    const av = ENG.avatars.get(n.id);
    av.d = Engine.dirTo(n.x, n.y, meAv.x, meAv.y);
    meAv.d = Engine.dirTo(meAv.x, meAv.y, n.x, n.y);
    const lines = [];
    let onEnd = null;
    for (const q of activeQuests()) {
      if (q.need.type === 'talk' && q.need.npcs.includes(n.id) && !talked(q).includes(n.id)) {
        talked(q).push(n.id);
        lines.push({ who: n.id, text: (q.talkLines && q.talkLines[n.id]) || '반가워!' });
        if (q.npc !== n.id && satisfied(q)) lines.push({ who: '', text: `${NPC[q.npc].name}에게 돌아가 보자.` });
        save();
      }
    }
    const mine = ST.quests.filter(q => q.npc === n.id);
    const act = mine.find(q => state(q) === 'active' && satisfied(q)) || mine.find(q => state(q) === 'active');
    if (act) {
      if (satisfied(act)) { act.done.forEach(t => lines.push({ who: n.id, text: t })); onEnd = () => complete(act); }
      else if (!lines.length) act.progress.forEach(t => lines.push({ who: n.id, text: t }));
    } else {
      const nq = mine.find(q => state(q) === 'avail');
      if (nq) { nq.offer.forEach(t => lines.push({ who: n.id, text: t })); onEnd = () => accept(nq); }
    }
    if (!lines.length) lines.push({ who: n.id, text: n.idle[Math.floor(Math.random() * n.idle.length)] });
    say(lines, onEnd);
  }
  function say(lines, onEnd) {
    dlg = { lines, i: 0, onEnd };
    ENG.frozen = true;
    ENG.path = []; ENG.pathDone = null;
    showLine();
  }
  function showLine() {
    const line = dlg.lines[dlg.i];
    const n = NPC[line.who];
    $('#dialog').hidden = false;
    $('#dlgName').replaceChildren(n ? n.name : line.who === 'me' ? me.name : '이야기', n ? el('small', {}, n.title) : '');
    const face = $('#dlgFace'), c = face.getContext('2d');
    c.clearRect(0, 0, face.width, face.height);
    c.imageSmoothingEnabled = false;
    if (n) c.drawImage(Art.avatarIcon(n.look, 152, 0, 'head'), 0, 6);
    else c.drawImage(Art.itemSprite('stone', 120), 16, 10);
    const full = fill(line.text);
    const box = $('#dlgText');
    let k = 0;
    clearInterval(typing);
    box.textContent = '';
    typing = setInterval(() => {
      k += 2;
      box.textContent = full.slice(0, k);
      if (k >= full.length) { clearInterval(typing); typing = null; }
    }, 28);
    dlg.full = full;
  }
  function nextLine() {
    if (!dlg) return;
    if (typing) { clearInterval(typing); typing = null; $('#dlgText').textContent = dlg.full; return; }
    dlg.i++;
    if (dlg.i >= dlg.lines.length) {
      const f = dlg.onEnd;
      dlg = null;
      $('#dialog').hidden = true;
      ENG.frozen = false;
      ENG.held = [];
      if (f) f();
    } else showLine();
  }
  $('#dialog').addEventListener('click', nextLine);

  // ------------------------------------------------------------ 퀘스트
  function accept(q) {
    if (!prog.active.includes(q.id)) prog.active.push(q.id);
    toast(`📜 새 부탁: ${q.title}`, 'big');
    save(); updateHud();
  }
  async function complete(q) {
    prog.active = prog.active.filter(id => id !== q.id);
    if (q.need.type === 'collect') prog.items[q.need.item] = Math.max(0, (prog.items[q.need.item] || 0) - q.need.count);
    if (!done.includes(q.id)) done.push(q.id);
    const r = q.reward || {};
    if (r.stone && !stones.includes(r.stone)) stones.push(r.stone);
    const parts = [];
    if (r.stone) parts.push(`🪨 ${r.stone}`);
    if (online && r.points) parts.push(`⭐ +${r.points}P`);
    if (r.wear) parts.push(`👕 ${WEAR[r.wear].name}`);
    if (r.obj) parts.push('🎁 작은 돌탑');
    toast(`「${q.title}」 완료! ${parts.join(' · ')}`, 'big');
    updateTower(); updateHud(); save(true);
    if (online) {
      try {
        const res = await api('/api/story/complete', { quest: q.id });
        me = Object.assign(me, res.me);
        updateHud();
      } catch (e) { toast('보상을 서버에 기록하지 못했어요: ' + e.message, 'err'); }
    } else if (r.points) {
      toast('로그인하고 하면 포인트도 받아요!');
    }
    if (q.id === 'q_final') setTimeout(() => say(ST.ending), 600);
  }

  // ------------------------------------------------------------ 저장
  function save(now) {
    prog.pos = [meAv.x, meAv.y];
    if (!online) {
      prog.done = done; prog.stones = stones;
      try { localStorage.setItem(GUEST_KEY, JSON.stringify(prog)); } catch (e) { /* 저장 불가 */ }
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => api('/api/story/save', { progress: prog }).catch(() => {}), now ? 0 : 1500);
  }
  addEventListener('beforeunload', () => {
    prog.pos = [meAv.x, meAv.y];
    if (online) {
      try {
        fetch('/api/story/save', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', 'X-Token': UI.getToken() }, body: JSON.stringify({ progress: prog }) });
      } catch (e) { /* 무시 */ }
    } else save();
  });
  setInterval(() => save(), 15000);

  // ------------------------------------------------------------ 화면
  function updateTower() { ENG.towerLevel = Math.min(14, 2 + stones.length * 2); }
  function updateHud() {
    $('#meName').textContent = me.name;
    $('#meInfo').textContent = (online ? `⭐ ${me.points}P · ` : '손님 · ') + `🪨 ${stones.length}`;
    const cv = $('#meIcon'), c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    c.imageSmoothingEnabled = false;
    c.drawImage(Art.avatarIcon(me.look, 88, 0, 'head'), 0, 4);
    const act = activeQuests();
    const box = $('#questNow');
    box.replaceChildren();
    if (!prog.intro) box.append('📖 석산 이야기');
    else if (act.length) {
      const q = act[act.length - 1];
      box.append(el('b', {}, '📜 ' + q.title), el('div', {}, q.desc + ' · ' + progressText(q)));
    } else if (done.includes('q_final')) box.append(el('b', {}, '🌟 1장 완료!'), el('div', {}, '메타버스 가방에 작은 돌탑이 있어요.'));
    else box.append(el('span', {}, '머리 위에 ', el('b', {}, '!'), ' 가 뜬 사람에게 말을 걸어 보자.'));
    if (currentPanel() === 'quests') showPanel('quests');
  }

  const PANELS = {
    quests() {
      const node = el('div', { class: 'stack' });
      const act = activeQuests();
      node.append(el('b', {}, '하고 있는 부탁'));
      if (!act.length) node.append(el('p', { class: 'muted' }, '지금 받은 부탁이 없어요. 머리 위에 ! 가 뜬 사람에게 말을 걸어요.'));
      node.append(el('div', { class: 'list' }, act.map(q => el('div', { class: 'li' },
        el('div', { class: 'grow' }, el('b', {}, q.title, ' '), el('span', { class: 'muted' }, `· ${NPC[q.npc].name}`),
          el('div', {}, q.desc), el('div', { class: satisfied(q) ? 'own' : 'muted' }, satisfied(q) ? `✔ ${NPC[q.npc].name}에게 돌아가요` : progressText(q)))))));
      node.append(el('b', {}, `끝낸 이야기 (${done.length}/${ST.quests.length})`));
      node.append(el('div', { class: 'stones' }, done.map(id => Q[id] && el('span', { class: 'stone-chip' }, '✔ ' + Q[id].title))));
      return { title: '📜 할 일', node };
    },
    items() {
      const node = el('div', { class: 'list' });
      const ids = Object.keys(prog.items).filter(k => prog.items[k] > 0);
      if (!ids.length) node.append(el('p', { class: 'muted' }, '가방이 비었어요. 반짝이는 물건 위를 지나가면 주울 수 있어요.'));
      for (const id of ids) {
        node.append(el('div', { class: 'li' }, Art.itemSprite(id, 80), el('div', { class: 'grow' }, el('b', {}, `${ST.items[id].name} × ${prog.items[id]}`), el('div', { class: 'muted' }, ST.items[id].desc))));
      }
      return { title: '🎒 이야기 가방', node };
    },
    stones() {
      const node = el('div', { class: 'stack' });
      const cv = el('canvas', { width: 160, height: 200, style: 'width:80px;height:100px;image-rendering:pixelated;align-self:center;justify-self:center' });
      cv.getContext('2d').drawImage(Art.objSprite(ENG.OBJ.tower, 40, { level: ENG.towerLevel }), 0, 0);
      node.append(cv);
      node.append(el('p', {}, '작은 만남과 작은 하루들이 차곡차곡 쌓여 나만의 이야기가 된다.'));
      node.append(stones.length ? el('div', { class: 'stones' }, stones.map(s => el('span', { class: 'stone-chip' }, '🪨 ' + s)))
        : el('p', { class: 'muted' }, '아직 기억의 돌이 없어요.'));
      if (online) node.append(el('p', { class: 'muted' }, '내 돌은 광장의 “우리 반 돌탑”에도 함께 쌓여요.'));
      return { title: '🪨 나의 석산', node };
    },
    menu() {
      const node = el('div', { class: 'stack' });
      node.append(el('div', { class: 'row' }, '화면 크기',
        el('button', { class: 'btn small', onclick: () => ENG.setZoom(ENG.zoom - 6) }, '－ 작게'),
        el('button', { class: 'btn small', onclick: () => ENG.setZoom(ENG.zoom + 6) }, '＋ 크게')));
      node.append(el('div', { class: 'notice' }, '걷기: 방향키 · WASD · 화면 누르기\n말 걸기: 사람 앞에서 스페이스 · 사람 누르기\n줍기: 반짝이는 물건 위를 지나가기'));
      node.append(el('p', { class: 'muted' }, online ? `${me.name}(으)로 로그인했어요. 진행은 서버에 저장돼요.` : '손님으로 하는 중이에요. 진행은 이 브라우저에만 저장되고 포인트는 받지 않아요.'));
      if (!online) node.append(el('a', { class: 'btn primary', href: 'index.html' }, '로그인하러 가기'));
      if (!online) node.append(el('button', { class: 'btn', onclick: () => { if (confirm('손님 진행을 처음부터 다시 할까요?')) { localStorage.removeItem(GUEST_KEY); location.reload(); } } }, '처음부터 다시'));
      return { title: '⚙️ 설정', node };
    },
  };
  function showPanel(k) { const b = PANELS[k](); openPanel(k, b.title, b.node); }
  $('#panelClose').onclick = closePanel;
  $('#toolbar').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const k = b.dataset.p;
    if (k === 'back') { save(true); setTimeout(() => (location.href = 'index.html'), 150); return; }
    if (currentPanel() === k) return closePanel();
    showPanel(k);
  });

  window.STORY = { ENG, get prog() { return prog; }, get done() { return done; }, get stones() { return stones; }, get me() { return me; } };

  if (!prog.intro) {
    say(ST.intro, () => { prog.intro = true; save(); updateHud(); });
  } else if (!online && !UI.getToken()) toast('손님으로 하는 중이에요. 로그인하면 포인트도 받아요.');
})();
