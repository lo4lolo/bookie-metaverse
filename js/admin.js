/* 석산 메타버스 — 선생님 관리 화면 */
(function () {
  'use strict';
  const { api, el, toast } = UI;
  const $ = s => document.querySelector(s);
  let state = null;
  const picked = new Set();
  let timer = null;

  async function boot() {
    if (!UI.getToken()) return showLogin();
    try {
      const r = await api('/api/me');
      if (r.me.role !== 'teacher') return showLogin('선생님 계정으로 들어와 주세요.');
      $('#login').hidden = true;
      $('#main').hidden = false;
      await refresh(true);
      loadChat();
      clearInterval(timer);
      timer = setInterval(() => refresh(false), 5000);
    } catch (e) { showLogin(); }
  }
  function showLogin(msg) {
    $('#login').hidden = false;
    $('#main').hidden = true;
    $('#loginMsg').textContent = msg || '';
  }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const r = await api('/api/login', { id: $('#lid').value.trim(), pw: $('#lpw').value });
      if (r.me.role !== 'teacher') throw new Error('선생님 계정이 아니에요.');
      UI.setToken(r.token);
      if (r.defaultPw) toast('처음 비밀번호를 쓰고 있어요. 아래 “선생님 비밀번호”에서 꼭 바꿔 주세요.', 'err');
      boot();
    } catch (err) { $('#loginMsg').textContent = err.message; }
  });
  $('#logout').onclick = async () => { try { await api('/api/logout', {}); } catch (e) { /* 무시 */ } UI.setToken(''); location.reload(); };

  async function refresh(fillSettings) {
    try { state = await api('/api/admin/state'); } catch (e) { $('#status').textContent = '서버 연결 끊김'; return; }
    $('#status').textContent = `접속 ${state.online}명 · 반 돌탑 ${state.stoneTotal}개`;
    $('#urls').replaceChildren(...(state.urls.length ? state.urls : ['(와이파이 주소를 찾지 못했어요)']).map(u => el('div', {}, u)));
    renderRows();
    renderPlots();
    if (fillSettings) {
      const s = state.settings;
      $('#sClass').value = s.className; $('#sStart').value = s.startPoints; $('#sDaily').value = s.dailyBonus; $('#sPlot').value = s.plotPrice;
      $('#sPublic').checked = s.publicEdit; $('#sChat').checked = s.chatOn; $('#sAll').checked = s.allChat;
      $('#sNotice').value = s.notice; $('#sBan').value = (s.banWords || []).join(', ');
    }
  }

  function renderRows() {
    const tb = $('#rows');
    const students = state.students.filter(s => s.role === 'student');
    tb.replaceChildren(...students.map(s => {
      const cb = el('input', { type: 'checkbox', onchange: e => (e.target.checked ? picked.add(s.id) : picked.delete(s.id)) });
      cb.checked = picked.has(s.id);
      const plot = s.plot ? state.plots.find(p => p.id === s.plot) : null;
      return el('tr', {},
        el('td', {}, cb),
        el('td', {}, el('span', { class: 'dot' + (s.online ? ' on' : ''), title: s.online ? '접속 중' : '' })),
        el('td', {}, s.id), el('td', {}, s.name),
        el('td', { title: s.log.map(l => `${l[0]} ${l[1] > 0 ? '+' : ''}${l[1]} ${l[2]}`).join('\n') }, el('b', {}, s.points), ' ',
          el('button', { class: 'btn small', onclick: () => give([s.id], 5, '칭찬') }, '+5')),
        el('td', {}, plot ? `${plot.no}번` : '-'),
        el('td', {}, s.stones), el('td', {}, s.quests),
        el('td', {}, s.lastDaily || '-'),
        el('td', {},
          el('button', { class: 'btn small', onclick: () => resetPw(s) }, '비번'), ' ',
          el('button', { class: 'btn small', onclick: () => delStudent(s) }, '삭제')));
    }));
    if (!students.length) tb.append(el('tr', {}, el('td', { colspan: 10, class: 'muted' }, '아직 학생이 없어요. 아래에서 만들어 주세요.')));
  }
  function renderPlots() {
    const names = Object.fromEntries(state.students.map(s => [s.id, s.name]));
    $('#plots').replaceChildren(...state.plots.map(p => el('tr', {},
      el('td', {}, p.no), el('td', {}, p.owner ? `${names[p.owner] || p.owner} (${p.owner})` : '-'),
      el('td', {}, (p.locked ? '🔒 ' : '') + (p.name || '')),
      el('td', {}, p.owner ? el('button', {
        class: 'btn small', onclick: async () => {
          if (!confirm(`${p.no}번 집터를 비울까요? 안의 물건은 주인 가방으로 돌아가요. (포인트는 돌려주지 않아요)`)) return;
          try { await api('/api/admin/plot_reset', { plot: p.id }); toast('집터를 비웠어요.'); refresh(); } catch (e) { toast(e.message, 'err'); }
        },
      }, '비우기') : ''))));
  }

  $('#checkAll').onchange = e => {
    state.students.filter(s => s.role === 'student').forEach(s => (e.target.checked ? picked.add(s.id) : picked.delete(s.id)));
    renderRows();
  };
  async function give(ids, delta, reason) {
    if (!ids.length) return toast('학생을 먼저 골라 주세요.', 'err');
    try { const r = await api('/api/admin/points', { ids, delta, reason }); toast(`${r.count}명에게 ${delta > 0 ? '+' : ''}${delta}P`); refresh(); }
    catch (e) { toast(e.message, 'err'); }
  }
  $('#givePts').onclick = () => give([...picked], parseInt($('#ptDelta').value, 10) || 0, $('#ptReason').value.trim());
  async function resetPw(s) {
    const pw = prompt(`${s.name}(${s.id})의 새 비밀번호`, '1234');
    if (!pw) return;
    try { await api('/api/admin/reset_pw', { id: s.id, pw }); toast('비밀번호를 바꿨어요.'); } catch (e) { toast(e.message, 'err'); }
  }
  async function delStudent(s) {
    if (!confirm(`${s.name}(${s.id}) 계정을 지울까요? 포인트·집터·이야기 기록이 모두 사라져요.`)) return;
    try { await api('/api/admin/delete', { id: s.id }); picked.delete(s.id); toast('지웠어요.'); refresh(); } catch (e) { toast(e.message, 'err'); }
  }

  // 한꺼번에 만들기
  function parseBulk() {
    return $('#bulk').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const [id, name, pw] = l.split(/[,\t]/).map(x => (x || '').trim());
      return { id, name, pw };
    });
  }
  $('#bulkBtn').onclick = async () => {
    const rows = parseBulk();
    if (!rows.length) return toast('칸이 비었어요.', 'err');
    try {
      const r = await api('/api/admin/students', { rows });
      toast(`새로 ${r.made}명 · 고침 ${r.updated}명`);
      if (r.errors.length) alert('만들지 못한 줄:\n' + r.errors.join('\n'));
      refresh();
    } catch (e) { toast(e.message, 'err'); }
  };
  $('#genBtn').onclick = () => {
    const pre = $('#genPrefix').value.trim(), a = +$('#genFrom').value, b = +$('#genTo').value, rand = $('#genPw').value === 'rand';
    const lines = [];
    for (let i = a; i <= b && lines.length < 200; i++) {
      const no = String(i).padStart(2, '0');
      lines.push(`${pre}${no},${i}번,${rand ? String(Math.floor(1000 + Math.random() * 9000)) : '1234'}`);
    }
    $('#bulk').value = lines.join('\n');
  };
  $('#printBtn').onclick = () => {
    const rows = parseBulk();
    if (!rows.length) return toast('위 칸에 학생 줄이 있어야 인쇄할 수 있어요.', 'err');
    const url = state.urls[0] || location.origin;
    const w = open('', '_blank');
    w.document.write(`<meta charset="utf-8"><title>석산 메타버스 계정 카드</title><style>body{font-family:"Malgun Gothic",sans-serif;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px}div{border:1.5px dashed #B9ADA0;border-radius:10px;padding:10px;font-size:14px;line-height:1.7}b{font-size:16px}small{color:#765849}</style>` +
      rows.map(r => `<div><b>🪨 석산 메타버스</b><br>이름: ${esc(r.name || '')}<br>아이디: <b>${esc(r.id)}</b><br>비밀번호: <b>${esc(r.pw || '')}</b><br><small>${esc(url)}</small></div>`).join(''));
    w.document.close();
    w.print();
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // 설정
  $('#saveSettings').onclick = async () => {
    try {
      await api('/api/admin/settings', {
        className: $('#sClass').value, startPoints: +$('#sStart').value, dailyBonus: +$('#sDaily').value, plotPrice: +$('#sPlot').value,
        publicEdit: $('#sPublic').checked, chatOn: $('#sChat').checked, allChat: $('#sAll').checked,
        notice: $('#sNotice').value, banWords: $('#sBan').value,
      });
      toast('설정을 저장했어요. 접속한 학생에게 바로 적용돼요.');
      refresh(true);
    } catch (e) { toast(e.message, 'err'); }
  };

  // 공지·채팅
  $('#announceBtn').onclick = async () => {
    const text = $('#announce').value.trim();
    if (!text) return;
    try { await api('/api/admin/announce', { text }); $('#announce').value = ''; toast('보냈어요.'); } catch (e) { toast(e.message, 'err'); }
  };
  async function loadChat() {
    try {
      const r = await api('/api/admin/chatlog');
      const box = $('#chatlog');
      box.replaceChildren(...r.chatlog.map(m => el('p', {}, el('span', { class: 'muted' }, `${m.ts} ${m.scope === 'all' ? '[전체]' : '[근처]'} `), el('b', {}, `${m.name}(${m.id})`), ' ', m.text)));
      if (!r.chatlog.length) box.append(el('p', { class: 'muted' }, '기록이 없어요.'));
      box.scrollTop = box.scrollHeight;
    } catch (e) { toast(e.message, 'err'); }
  }
  $('#chatRefresh').onclick = loadChat;
  $('#chatClear').onclick = async () => {
    if (!confirm('채팅 기록을 모두 지울까요?')) return;
    try { await api('/api/admin/chat_clear', {}); loadChat(); } catch (e) { toast(e.message, 'err'); }
  };

  // 자료
  $('#backupBtn').onclick = async () => {
    try {
      const r = await api('/api/admin/backup');
      const blob = new Blob([JSON.stringify(r.db, null, 1)], { type: 'application/json' });
      const a = el('a', { href: URL.createObjectURL(blob), download: `석산메타버스-백업-${new Date().toISOString().slice(0, 10)}.json` });
      document.body.append(a); a.click(); a.remove();
    } catch (e) { toast(e.message, 'err'); }
  };
  $('#restoreFile').onchange = async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (!confirm('지금 자료를 이 백업으로 바꿀까요? 접속한 학생은 다시 로그인해야 해요.')) return;
    try {
      const db = JSON.parse(await f.text());
      await api('/api/admin/restore', { db });
      toast('되돌렸어요.');
      refresh(true);
    } catch (err) { toast(err.message || '파일을 읽지 못했어요.', 'err'); }
  };
  $('#worldReset').onclick = async () => {
    if (!confirm('광장(공용 공간)을 처음 모습으로 되돌릴까요? 학생 집터는 그대로예요.')) return;
    try { await api('/api/admin/world_reset', {}); toast('광장을 되돌렸어요.'); } catch (e) { toast(e.message, 'err'); }
  };
  $('#pwBtn').onclick = async () => {
    try { await api('/api/password', { old: $('#pwOld').value, new: $('#pwNew').value }); toast('비밀번호를 바꿨어요.'); $('#pwOld').value = $('#pwNew').value = ''; }
    catch (e) { toast(e.message, 'err'); }
  };

  boot();
})();
