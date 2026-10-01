/* 학생 기록장(md) — 석산 메타버스의 모든 체험 공간(별개 웹사이트)이 함께 쓰는 형식.
 * 형식 설명: 38_석산메타버스/학생md_형식.md
 *
 * 한 파일 = 학생 한 명. 위쪽은 사람이 읽는 기록장, 맨 아래 "## 기계용 자료" 의 ```json 칸이 진짜 자료다.
 * 사이트는 json 칸만 읽고 고친 뒤, 사람용 부분을 render()로 다시 만든다(사람용 부분은 손으로 고쳐도 무시된다).
 * 포인트: 사이트가 준 포인트는 points.pending(보류)에만 쌓인다. 선생님 서버가 확인해 서명하면 confirmed 로 옮긴다.
 */
(function (root) {
  'use strict';
  const FORMAT = 'seoksan-student-md', VERSION = 1;
  const MARK = '## 기계용 자료';

  function today() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function create(o) {
    o = o || {};
    return {
      format: FORMAT, version: VERSION,
      student: { name: o.name || '이름 없음', school: o.school || '', class: o.class || '', number: o.number || '', id: o.id || '' },
      avatar: { base: 'v5', colors: Object.assign({}, o.colors || {}) },
      points: { confirmed: 0, pending: 0 },
      items: { stones: [], stickers: [] },
      records: {},
      promises: [],
      created: today(), updated: today(),
      sig: null,
    };
  }

  /** md 글 → 자료. 형식이 아니면 오류 */
  function parse(text) {
    const i = text.indexOf(MARK);
    if (i < 0) throw new Error('부기 기록장(md)이 아니에요. "## 기계용 자료" 칸을 찾지 못했어요.');
    const m = text.slice(i).match(/```json\s*([\s\S]*?)```/);
    if (!m) throw new Error('기계용 자료(json)가 비어 있어요.');
    const d = JSON.parse(m[1]);
    if (d.format !== FORMAT) throw new Error('다른 형식의 파일이에요.');
    // 빠진 칸 채우기(예전 판과 호환)
    const base = create();
    for (const k of Object.keys(base)) if (d[k] == null) d[k] = base[k];
    d.points = Object.assign({ confirmed: 0, pending: 0 }, d.points);
    d.items = Object.assign({ stones: [], stickers: [] }, d.items);
    return d;
  }

  /** 체험 기록 덧붙이기. entry: {title, done, gained:{points,stones,stickers}, answers, note} */
  function addRecord(d, siteId, siteName, entry) {
    const list = d.records[siteId] || (d.records[siteId] = { name: siteName, entries: [] });
    list.name = siteName;
    const e = Object.assign({ at: today() }, entry);
    list.entries.push(e);
    const g = e.gained || {};
    if (g.points) d.points.pending += g.points;
    for (const s of g.stones || []) if (!d.items.stones.includes(s)) d.items.stones.push(s);
    for (const s of g.stickers || []) if (!d.items.stickers.includes(s)) d.items.stickers.push(s);
    if (e.promise) d.promises.push({ at: e.at, site: siteName, text: e.promise });
    d.updated = today();
    d.sig = null;          // 고쳤으므로 서명은 다시 받아야 한다
    return e;
  }

  const COLOR_NAMES = { hair: '머리', skin: '피부', shirt: '윗옷', collar: '깃·소매 끝', pants: '바지', shoes: '신발', eye: '눈' };

  /** 자료 → md 글 (사람용 + 기계용) */
  function render(d) {
    const s = d.student, L = [];
    L.push(`# ${s.name}의 부기 기록장`, '');
    L.push('> 부기 메타버스의 여러 체험 공간에서 한 일이 이 파일 하나에 모여요. 다음에 들어갈 때 이 파일을 넣으면 내 정보를 불러와요.', '> **맨 아래 "기계용 자료" 칸은 고치지 마세요.** 고치면 선생님 확인을 다시 받아야 해요.', '');
    L.push('## 나', '');
    L.push(`- 이름: ${s.name}`);
    if (s.school || s.class) L.push(`- 학교·반: ${[s.school, s.class].filter(Boolean).join(' ')}${s.number ? ` ${s.number}번` : ''}`);
    L.push(`- 처음 만든 날: ${d.created} · 마지막 기록: ${d.updated}`, '');
    L.push('## 내 아바타', '', `기본 모습: ${d.avatar.base}`, '');
    const cols = Object.entries(d.avatar.colors || {});
    if (cols.length) { L.push('| 부분 | 색 |', '|---|---|'); for (const [k, v] of cols) L.push(`| ${COLOR_NAMES[k] || k} | ${v} |`); L.push(''); }
    L.push('## 포인트와 모은 것', '');
    L.push(`- 확인된 포인트: **${d.points.confirmed}** · 선생님 확인을 기다리는 포인트: ${d.points.pending}`);
    L.push(`- 돌: ${d.items.stones.length ? d.items.stones.join(', ') : '아직 없어요'}`);
    L.push(`- 스티커: ${d.items.stickers.length ? d.items.stickers.join(', ') : '아직 없어요'}`, '');
    L.push('## 체험 기록', '');
    const sites = Object.entries(d.records);
    if (!sites.length) L.push('아직 다녀온 곳이 없어요.', '');
    for (const [, r] of sites) {
      L.push(`### ${r.name}`, '');
      for (const e of r.entries) {
        const g = e.gained || {}, got = [];
        if (g.points) got.push(`포인트 ${g.points}(보류)`);
        if (g.stones && g.stones.length) got.push(g.stones.join(', '));
        if (g.stickers && g.stickers.length) got.push('스티커 ' + g.stickers.join(', '));
        L.push(`- ${e.at} · ${e.title}${e.done ? ' ✔' : ''}${got.length ? ' · 얻은 것: ' + got.join(' / ') : ''}`);
        for (const [q, a] of Object.entries(e.answers || {})) L.push(`  - ${q} → ${a}`);
        if (e.note) L.push(`  - 메모: ${e.note}`);
      }
      L.push('');
    }
    if (d.promises.length) {
      L.push('## 나의 다짐', '');
      for (const p of d.promises) L.push(`- ${p.at} · ${p.site}: ${p.text}`);
      L.push('');
    }
    L.push(MARK + ' (고치지 마세요)', '', '```json', JSON.stringify(d, null, 1), '```', '');
    return L.join('\n');
  }

  function download(d) {
    const blob = new Blob([render(d)], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `부기기록장_${d.student.name}.md`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /** 파일 고르기 → 자료 */
  function pick() {
    return new Promise((ok, bad) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.md,text/markdown,text/plain';
      inp.onchange = async () => { try { ok(parse(await inp.files[0].text())); } catch (e) { bad(e); } };
      inp.click();
    });
  }

  // 같은 컴퓨터에서 사이트를 옮겨 다닐 때 다시 고르지 않도록 잠시 기억 (진짜 보관은 md 파일)
  const KEY = 'seoksan-student-md-session';
  function remember(d) { try { sessionStorage.setItem(KEY, JSON.stringify(d)); localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* 저장 불가 */ } }
  function recall() { try { const t = sessionStorage.getItem(KEY) || localStorage.getItem(KEY); return t ? parse(render(JSON.parse(t))) : null; } catch (e) { return null; } }
  function forget() { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) { /* 저장 불가 */ } }

  root.StudentMD = { FORMAT, VERSION, create, parse, render, addRecord, download, pick, remember, recall, forget, today };
})(typeof window !== 'undefined' ? window : globalThis);
