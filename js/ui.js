/* 석산 메타버스 — 화면 공용 도구(서버 호출·알림·창) */
(function () {
  'use strict';
  const TOKEN_KEY = 'seoksan-metaverse-token';

  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) { /* 저장 불가 */ } }

  async function api(path, body) {
    const opt = { method: body ? 'POST' : 'GET', headers: { 'X-Token': getToken() } };
    if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    const res = await fetch(path, opt);
    let data = {};
    try { data = await res.json(); } catch (e) { /* 빈 응답 */ }
    if (!res.ok) { const err = new Error(data.error || '서버에 연결할 수 없어요.'); err.status = res.status; throw err; }
    return data;
  }

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k === 'html') n.innerHTML = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return n;
  }

  function toast(msg, kind) {
    const box = document.getElementById('toasts');
    if (!box) return;
    const t = el('div', { class: 'toast' + (kind ? ' ' + kind : '') }, msg);
    box.append(t);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => t.remove(), kind === 'big' ? 6000 : 3000);
  }

  let panelKind = null;
  function openPanel(kind, title, body) {
    const p = document.getElementById('panel');
    panelKind = kind;
    document.getElementById('panelTitle').textContent = title;
    const b = document.getElementById('panelBody');
    b.replaceChildren(body);
    p.hidden = false;
  }
  function closePanel() {
    const p = document.getElementById('panel');
    if (p) p.hidden = true;
    panelKind = null;
    document.dispatchEvent(new Event('panelclose'));
  }
  function currentPanel() { return panelKind; }

  function tabs(list, cur, onPick) {
    return el('div', { class: 'tabs' }, list.map(([id, name]) =>
      el('button', { class: id === cur ? 'on' : '', type: 'button', onclick: () => onPick(id) }, name)));
  }

  function confirmBox(title, msg, okText, onOk) {
    openPanel('confirm', title, el('div', { class: 'stack' },
      el('p', {}, msg),
      el('div', { class: 'row' },
        el('button', { class: 'btn primary', onclick: () => { closePanel(); onOk(); } }, okText || '좋아요'),
        el('button', { class: 'btn', onclick: closePanel }, '아니요'))));
  }

  window.UI = { api, el, toast, openPanel, closePanel, currentPanel, tabs, confirmBox, getToken, setToken };
})();
