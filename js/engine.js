/* 석산 메타버스 — 공용 엔진: 칸 이동, 길찾기, 카메라, 그리기
 * 메타버스(world.js)와 이야기 모드(story.js)가 함께 쓴다.
 * hooks: onMove(me) · onClick(tx,ty,ev) · onAction() · onKey(key,ev) · onPointer(tx,ty,ev)
 *        blocked(x,y,fx,fy) · drawGround(c,cx,cy,S) · drawables(list,cx,cy,S) · drawOver(c,cx,cy,S) · onFrame(dt)
 */
(function () {
  'use strict';
  const DIRS = [[0, 1], [-1, 0], [1, 0], [0, -1]];          // 0 아래 · 1 왼쪽 · 2 오른쪽 · 3 위
  const KEYDIR = {
    ArrowDown: 0, KeyS: 0, ArrowLeft: 1, KeyA: 1, ArrowRight: 2, KeyD: 2, ArrowUp: 3, KeyW: 3,
  };
  const WALK = [1, 3, 2, 3];
  const EMO_FACE = { '😮': 'wow', '❓': 'wow', '😢': 'sad' };   // 나머지 감정은 웃는 얼굴
  const FONT = '"Gowun Dodum","Malgun Gothic",sans-serif';

  function dirTo(fx, fy, tx, ty) {
    if (tx > fx) return 2;
    if (tx < fx) return 1;
    if (ty < fy) return 3;
    return 0;
  }
  function isTyping(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function wrap(c, str, maxW, maxLines) {
    const out = [];
    let line = '';
    for (const ch of Array.from(str)) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      if (c.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; }
      else line += ch;
    }
    if (line) out.push(line);
    if (out.length > maxLines) { out.length = maxLines; out[maxLines - 1] = out[maxLines - 1].slice(0, -1) + '…'; }
    return out;
  }

  class Engine {
    constructor(canvas, opts) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.OBJ = {};
      this.TILES = {};
      opts.catalog.objects.forEach(o => (this.OBJ[o.id] = o));
      opts.catalog.tiles.forEach(t => (this.TILES[t.id] = t));
      this.hooks = opts.hooks || {};
      this.zoom = opts.zoom || (innerWidth < 700 ? 36 : 46);
      this.map = null;
      this.avatars = new Map();
      this.me = null;
      this.held = [];
      this.path = [];
      this.pathDone = null;
      this.speed = 6.5;
      this.t = 0;
      this.cam = { x: 0, y: 0 };
      this.pointer = null;
      this.towerLevel = 2;
      this.frozen = false;
      this._resize();
      addEventListener('resize', () => this._resize());
      this._bindInput();
      this._last = performance.now();
      requestAnimationFrame(t => this._loop(t));
    }

    // ---------------------------------------------------------------- 지도
    setMap(map) {
      this.map = map;
      this.rebuild();
    }
    rebuild() {
      const m = this.map;
      this.solid = new Uint8Array(m.w * m.h);
      for (const o of m.objects) {
        const s = this.OBJ[o.t];
        if (!s || !s.solid) continue;
        for (let y = o.y; y < o.y + s.h; y++)
          for (let x = o.x; x < o.x + s.w; x++)
            if (x >= 0 && y >= 0 && x < m.w && y < m.h) this.solid[y * m.w + x] = 1;
      }
    }
    tileAt(x, y) {
      const row = this.map.ground[y];
      return row ? row[x] : undefined;
    }
    setTile(x, y, ch) {
      const row = this.map.ground[y];
      this.map.ground[y] = row.slice(0, x) + ch + row.slice(x + 1);
    }
    inBounds(x, y) { return x >= 0 && y >= 0 && x < this.map.w && y < this.map.h; }
    walkable(x, y, fx, fy) {
      if (!this.map || !this.inBounds(x, y)) return false;
      const t = this.TILES[this.tileAt(x, y)];
      if (!t || !t.walk) return false;
      if (this.solid[y * this.map.w + x]) return false;
      if (this.hooks.blocked && this.hooks.blocked(x, y, fx, fy)) return false;
      return true;
    }
    objectAt(tx, ty, tallToo) {
      let best = null, bestZ = -1;
      for (const o of this.map.objects) {
        const s = this.OBJ[o.t];
        if (!s) continue;
        const top = tallToo ? o.y - s.tall : o.y;
        if (tx >= o.x && tx < o.x + s.w && ty >= top && ty < o.y + s.h) {
          const z = (s.floor ? 0 : 10000) + (o.y + s.h) * 100 + o.x;
          if (z > bestZ) { bestZ = z; best = o; }
        }
      }
      return best;
    }

    // ---------------------------------------------------------------- 아바타
    addAvatar(a) {
      const av = Object.assign({ d: 0, rx: a.x, ry: a.y, anim: 0, moving: false, bubble: null, bubbleT: 0, emote: null, emoteT: 0 }, a);
      this.avatars.set(av.id, av);
      return av;
    }
    removeAvatar(id) { this.avatars.delete(id); }
    setMe(av) { this.me = av; }
    say(id, textStr) {
      const av = this.avatars.get(id);
      if (av) { av.bubble = textStr; av.bubbleT = 5 + Math.min(4, textStr.length / 12); }
    }
    emote(id, e) {
      const av = this.avatars.get(id);
      if (av) { av.emote = e; av.emoteT = 2.6; }
    }
    teleport(x, y) {
      const me = this.me;
      if (!me) return;
      me.x = me.rx = x; me.y = me.ry = y;
      this.path = [];
      this.pathDone = null;
      if (this.hooks.onMove) this.hooks.onMove(me, true);
    }
    nearestFree(x, y) {
      if (this.walkable(x, y)) return [x, y];
      for (let r = 1; r < 8; r++)
        for (let dy = -r; dy <= r; dy++)
          for (let dx = -r; dx <= r; dx++)
            if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.walkable(x + dx, y + dy)) return [x + dx, y + dy];
      return [x, y];
    }

    // ---------------------------------------------------------------- 길찾기
    /** goals: [[x,y],...] 중 가장 가까운 곳까지 걸어간다. */
    walkTo(goals, done) {
      const me = this.me;
      if (!me || !this.map) return false;
      const m = this.map, W = m.w, N = m.w * m.h;
      const goal = new Uint8Array(N);
      let any = false;
      for (const [x, y] of goals) if (this.inBounds(x, y)) { goal[y * W + x] = 1; any = true; }
      if (!any) return false;
      const start = me.y * W + me.x;
      if (goal[start]) { this.path = []; this.pathDone = null; if (done) done(); return true; }
      const prev = new Int32Array(N).fill(-1);
      prev[start] = start;
      const q = [start];
      let found = -1;
      for (let qi = 0; qi < q.length && found < 0; qi++) {
        const cur = q[qi], cx = cur % W, cy = (cur / W) | 0;
        for (const [dx, dy] of DIRS) {
          const nx = cx + dx, ny = cy + dy, ni = ny * W + nx;
          if (!this.inBounds(nx, ny) || prev[ni] >= 0 || !this.walkable(nx, ny, cx, cy)) continue;
          prev[ni] = cur;
          if (goal[ni]) { found = ni; break; }
          q.push(ni);
        }
      }
      if (found < 0) return false;
      const path = [];
      for (let i = found; i !== start; i = prev[i]) path.push([i % W, (i / W) | 0]);
      path.reverse();
      this.path = path;
      this.pathDone = done || null;
      return true;
    }
    goTo(tx, ty, done) {
      if (this.walkable(tx, ty)) return this.walkTo([[tx, ty]], done);
      return this.walkTo(DIRS.map(([dx, dy]) => [tx + dx, ty + dy]), done);
    }
    /** 오브젝트 옆 칸까지 걸어간 뒤 그쪽을 바라본다. */
    approach(x, y, w, h, done) {
      const goals = [];
      for (let xx = x; xx < x + w; xx++) { goals.push([xx, y - 1]); goals.push([xx, y + h]); }
      for (let yy = y; yy < y + h; yy++) { goals.push([x - 1, yy]); goals.push([x + w, yy]); }
      return this.walkTo(goals, () => {
        const me = this.me;
        const cx = Math.max(x, Math.min(x + w - 1, me.x)), cy = Math.max(y, Math.min(y + h - 1, me.y));
        me.d = dirTo(me.x, me.y, cx, cy);
        if (this.hooks.onMove) this.hooks.onMove(me);
        if (done) done();
      });
    }
    facing() {
      const me = this.me;
      const [dx, dy] = DIRS[me.d];
      return [me.x + dx, me.y + dy];
    }

    // ---------------------------------------------------------------- 입력
    _bindInput() {
      addEventListener('keydown', e => {
        if (isTyping(document.activeElement)) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.code in KEYDIR) {
          e.preventDefault();
          const d = KEYDIR[e.code];
          if (!this.held.includes(d)) this.held.push(d);
          return;
        }
        if (e.code === 'Space' || e.code === 'KeyE') {
          e.preventDefault();
          if (!e.repeat && this.hooks.onAction) this.hooks.onAction();
          return;
        }
        if (this.hooks.onKey) this.hooks.onKey(e.key, e);
      });
      addEventListener('keyup', e => {
        if (e.code in KEYDIR) this.held = this.held.filter(d => d !== KEYDIR[e.code]);
      });
      addEventListener('blur', () => (this.held = []));
      const cv = this.cv;
      cv.addEventListener('contextmenu', e => e.preventDefault());
      cv.addEventListener('pointerdown', e => {
        const [tx, ty] = this.tileFromEvent(e);
        this.pointer = { tx, ty, down: true };
        if (this.hooks.onClick && this.hooks.onClick(tx, ty, e)) return;
        if (this.frozen || !this.map) return;
        this.goTo(tx, ty);
      });
      cv.addEventListener('pointermove', e => {
        const [tx, ty] = this.tileFromEvent(e);
        this.pointer = { tx, ty, down: e.buttons > 0 };
        if (this.hooks.onPointer) this.hooks.onPointer(tx, ty, e);
      });
      cv.addEventListener('pointerleave', () => (this.pointer = null));
      cv.addEventListener('wheel', e => {
        e.preventDefault();
        this.setZoom(this.zoom + (e.deltaY < 0 ? 4 : -4));
      }, { passive: false });
    }
    setZoom(z) {
      this.zoom = Math.max(24, Math.min(80, z));
      this._resize();
    }
    tileFromEvent(e) {
      const r = this.cv.getBoundingClientRect();
      const px = (e.clientX - r.left) * this.dpr + this.cam.x, py = (e.clientY - r.top) * this.dpr + this.cam.y;
      return [Math.floor(px / this.S), Math.floor(py / this.S)];
    }
    _resize() {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = this.cv.clientWidth || innerWidth, h = this.cv.clientHeight || innerHeight;
      this.cv.width = Math.round(w * this.dpr);
      this.cv.height = Math.round(h * this.dpr);
      this.S = Math.max(16, Math.round(this.zoom * this.dpr));
    }

    // ---------------------------------------------------------------- 움직임
    _update(dt) {
      const me = this.me;
      if (me && this.map && !this.frozen) {
        if (me.rx === me.x && me.ry === me.y) {
          const d = this.held.length ? this.held[this.held.length - 1] : null;
          if (d !== null) {
            this.path = []; this.pathDone = null;
            const [dx, dy] = DIRS[d];
            const nx = me.x + dx, ny = me.y + dy;
            const turned = me.d !== d;
            me.d = d;
            if (this.walkable(nx, ny, me.x, me.y)) { me.x = nx; me.y = ny; this.hooks.onMove && this.hooks.onMove(me); }
            else if (turned && this.hooks.onMove) this.hooks.onMove(me);
          } else if (this.path.length) {
            const [nx, ny] = this.path[0];
            if (this.walkable(nx, ny, me.x, me.y)) {
              this.path.shift();
              me.d = dirTo(me.x, me.y, nx, ny);
              me.x = nx; me.y = ny;
              this.hooks.onMove && this.hooks.onMove(me);
            } else { this.path = []; this.pathDone = null; }
          } else if (this.pathDone) {
            const f = this.pathDone; this.pathDone = null; f();
          }
        }
      }
      for (const av of this.avatars.values()) {
        const dx = av.x - av.rx, dy = av.y - av.ry, dist = Math.hypot(dx, dy);
        if (dist > 5) { av.rx = av.x; av.ry = av.y; }
        else if (dist > 0) {
          const sp = (av === me ? this.speed : Math.max(this.speed, dist * 5)) * dt;
          if (sp >= dist) { av.rx = av.x; av.ry = av.y; }
          else { av.rx += dx / dist * sp; av.ry += dy / dist * sp; }
        }
        av.moving = dist > 0.001;
        av.anim = av.moving ? av.anim + dt * 10 : 0;
        if (av.bubbleT > 0 && (av.bubbleT -= dt) <= 0) av.bubble = null;
        if (av.emoteT > 0 && (av.emoteT -= dt) <= 0) av.emote = null;
      }
    }
    _loop(now) {
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      this.t += dt;
      this._update(dt);
      if (this.hooks.onFrame) this.hooks.onFrame(dt);
      this.render();
      requestAnimationFrame(t => this._loop(t));
    }

    // ---------------------------------------------------------------- 그리기
    render() {
      const c = this.ctx, S = this.S, W = this.cv.width, H = this.cv.height;
      c.imageSmoothingEnabled = false;
      c.fillStyle = '#6F8C63';
      c.fillRect(0, 0, W, H);
      const m = this.map;
      if (!m) return;
      const me = this.me;
      const mw = m.w * S, mh = m.h * S;
      let cx = me ? (me.rx + 0.5) * S - W / 2 : mw / 2 - W / 2;
      let cy = me ? (me.ry + 0.5) * S - H / 2 : mh / 2 - H / 2;
      cx = mw > W ? Math.max(0, Math.min(mw - W, cx)) : (mw - W) / 2;
      cy = mh > H ? Math.max(0, Math.min(mh - H, cy)) : (mh - H) / 2;
      cx = Math.round(cx); cy = Math.round(cy);
      this.cam.x = cx; this.cam.y = cy;
      const x0 = Math.max(0, Math.floor(cx / S)), x1 = Math.min(m.w - 1, Math.floor((cx + W) / S));
      const y0 = Math.max(0, Math.floor(cy / S)), y1 = Math.min(m.h - 1, Math.floor((cy + H) / S));
      const wf = Math.floor(this.t * 2) % 4;
      for (let y = y0; y <= y1; y++) {
        const row = m.ground[y];
        for (let x = x0; x <= x1; x++) {
          const ch = row[x];
          const v = ((x * 7 + y * 13) ^ (x * y)) & 3;
          c.drawImage(Art.tileSprite(ch, v, ch === '~' || ch === 'b' ? wf : 0, S), x * S - cx, y * S - cy);
          if (ch === '~' && y > 0) {
            const up = m.ground[y - 1][x];
            if (up !== '~' && up !== 'b') { c.fillStyle = 'rgba(95,128,88,0.35)'; c.fillRect(x * S - cx, y * S - cy, S, Math.ceil(S * 0.12)); }
          }
        }
      }
      if (this.hooks.drawGround) this.hooks.drawGround(c, cx, cy, S);

      const list = [];
      for (const o of m.objects) {
        const s = this.OBJ[o.t];
        if (!s) continue;
        const px = o.x * S - cx, py = (o.y - s.tall) * S - cy, pw = s.w * S, ph = (s.h + s.tall) * S;
        if (px > W || py > H || px + pw < 0 || py + ph < 0) continue;
        if (s.floor) this._drawObj(c, o, s, px, py, S);
        else list.push({ z: (o.y + s.h) * S, draw: () => this._drawObj(c, o, s, px, py, S) });
      }
      if (this.hooks.drawables) this.hooks.drawables(list, cx, cy, S);
      for (const av of this.avatars.values()) {
        const px = av.rx * S - cx, py = av.ry * S - cy;
        if (px < -2 * S || py < -3 * S || px > W + S || py > H + 2 * S) continue;
        list.push({
          z: (av.ry + 1) * S + 0.5,
          draw: () => {
            if (av.ph == null) av.ph = Math.random() * 40;
            const t = this.t + av.ph;
            // 걷기 4프레임 · 서 있을 때 숨쉬기(0↔4) · 눈 깜빡임 · 감정 표현 때 표정
            const frame = av.moving ? WALK[Math.floor(av.anim) % 4] : (Math.floor(t * 1.6) % 2 ? 4 : 0);
            let expr = av.emote ? (EMO_FACE[av.emote] || 'happy') : '';
            if (!expr && t % 4.3 < 0.13) expr = 'blink';
            const spr = Art.avatarSprite(av.look, av.d, frame, S, expr);
            const fx = Math.round(px + S / 2), fy = Math.round(py + S * 0.94);
            c.drawImage(spr, fx - Math.round(spr.ax), fy - Math.round(spr.ay));
            av.tagTop = fy - spr.ay + spr.tagY;
          },
        });
      }
      list.sort((a, b) => a.z - b.z);
      for (const it of list) it.draw();

      // 이름표·말풍선은 늘 맨 위에
      const dpr = this.dpr;
      for (const av of this.avatars.values()) {
        const px = av.rx * S - cx + S / 2, top = av.tagTop != null ? av.tagTop : av.ry * S - cy + S - 1.7 * S;
        if (px < -S * 3 || px > W + S * 3 || top < -S * 3 || top > H + S) continue;
        c.font = `bold ${Math.round(11 * dpr)}px ${FONT}`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const name = av.name || '';
        const tw = c.measureText(name).width + 10 * dpr, th = 16 * dpr;
        const ny = top - 1 * dpr;
        c.fillStyle = av.tag || (av === me ? 'rgba(111,140,99,0.92)' : 'rgba(75,58,50,0.62)');
        roundRect(c, px - tw / 2, ny - th / 2, tw, th, th / 2); c.fill();
        c.fillStyle = '#F6EFE3';
        c.fillText(name, px, ny + 0.5 * dpr);
        let by = ny - th / 2 - 4 * dpr;
        if (av.emote) {
          const k = Math.min(1, (2.6 - av.emoteT) * 6);
          c.font = `${Math.round(26 * dpr * (0.6 + 0.4 * k))}px sans-serif`;
          c.fillText(av.emote, px, by - 14 * dpr);
          by -= 30 * dpr;
        }
        if (av.bubble) {
          c.font = `${Math.round(13 * dpr)}px ${FONT}`;
          const lines = wrap(c, av.bubble, 170 * dpr, 3);
          const lh = 17 * dpr;
          const bw = Math.max(...lines.map(l => c.measureText(l).width)) + 16 * dpr, bh = lines.length * lh + 10 * dpr;
          const bx = px - bw / 2, byy = by - bh - 6 * dpr;
          c.fillStyle = 'rgba(246,239,227,0.97)';
          c.strokeStyle = '#B9ADA0'; c.lineWidth = dpr;
          roundRect(c, bx, byy, bw, bh, 8 * dpr); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(px - 5 * dpr, byy + bh - 0.5); c.lineTo(px, byy + bh + 6 * dpr); c.lineTo(px + 5 * dpr, byy + bh - 0.5); c.closePath();
          c.fill();
          c.fillStyle = '#4B3A32';
          lines.forEach((l, i) => c.fillText(l, px, byy + 5 * dpr + lh * (i + 0.5)));
        }
      }
      if (this.hooks.drawOver) this.hooks.drawOver(c, cx, cy, S);
    }
    _drawObj(c, o, s, px, py, S) {
      if (Art.ANIMATED[s.id]) Art.drawObjLive(c, s, S, px, py, this.t);
      else c.drawImage(Art.objSprite(s, S, s.id === 'tower' ? { level: this.towerLevel } : null), px, py);
      if (o.text && (s.id === 'whiteboard' || s.id === 'easel')) {
        const u = S / 16;
        const box = s.id === 'whiteboard' ? [3, 4, 26, 14] : [2.5, 5, 11, 11];
        c.save();
        c.fillStyle = s.id === 'whiteboard' ? '#F3EBDD' : '#4B3A32';
        c.font = `${Math.max(8, Math.round(3.2 * u))}px ${FONT}`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const lines = wrap(c, o.text, box[2] * u, s.id === 'whiteboard' ? 3 : 3);
        const lh = 4 * u;
        lines.forEach((l, i) => c.fillText(l, px + (box[0] + box[2] / 2) * u, py + (box[1] + box[3] / 2) * u + (i - (lines.length - 1) / 2) * lh));
        c.restore();
      }
    }
  }

  Engine.DIRS = DIRS;
  Engine.dirTo = dirTo;
  Engine.roundRect = roundRect;
  Engine.wrap = wrap;
  Engine.FONT = FONT;
  window.Engine = Engine;
})();
