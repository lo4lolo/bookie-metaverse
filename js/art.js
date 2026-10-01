/* 석산 메타버스 — 코드로 그리는 그림(타일·오브젝트, 아바타는 avatar.js)
 * 모든 그림은 16×16 "그림 픽셀" 격자 기준이다. u = 화면 픽셀 / 그림 픽셀.
 * 오브젝트 캔버스: (w×16) × ((h+tall)×16), 발자국(footprint)은 아래쪽 h칸.
 */
(function () {
  'use strict';

  // ---------- 그리기 도구
  function R(c, u, x, y, w, h, col) {
    c.fillStyle = col;
    const X = Math.round(x * u), Y = Math.round(y * u);
    c.fillRect(X, Y, Math.max(1, Math.round((x + w) * u) - X), Math.max(1, Math.round((y + h) * u) - Y));
  }
  function E(c, u, cx, cy, rx, ry, col) {
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(cx * u, cy * u, Math.max(0.5, rx * u), Math.max(0.5, ry * u), 0, 0, Math.PI * 2);
    c.fill();
  }
  function POLY(c, u, pts, col) {
    c.fillStyle = col;
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p[0] * u, p[1] * u) : c.moveTo(p[0] * u, p[1] * u)));
    c.closePath();
    c.fill();
  }
  function LINE(c, u, x1, y1, x2, y2, col, w) {
    c.strokeStyle = col;
    c.lineWidth = Math.max(1, (w || 1) * u);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x1 * u, y1 * u);
    c.lineTo(x2 * u, y2 * u);
    c.stroke();
  }
  function SH(c, u, cx, cy, rx, ry) { E(c, u, cx, cy, rx, ry, 'rgba(75,58,50,0.18)'); }
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function text(c, u, str, x, y, size, col, align) {
    c.fillStyle = col;
    c.font = `bold ${Math.max(6, size * u)}px "Gowun Dodum","Malgun Gothic",sans-serif`;
    c.textAlign = align || 'center';
    c.textBaseline = 'middle';
    c.fillText(str, x * u, y * u);
  }

  // ---------- 바닥 타일
  const TILE = {
    g(c, u, v) {
      R(c, u, 0, 0, 16, 16, '#AFC78F');
      const r = rng(v * 977 + 13);
      for (let i = 0; i < 3; i++) {
        const x = 1 + (r() * 12 | 0), y = 3 + (r() * 11 | 0);
        R(c, u, x, y, 1, 1, '#9AB77C'); R(c, u, x + 1, y - 1, 1, 1, '#9AB77C'); R(c, u, x + 2, y, 1, 1, '#9AB77C');
      }
      for (let i = 0; i < 2; i++) R(c, u, r() * 15 | 0, r() * 15 | 0, 1, 1, '#C2D6A6');
    },
    f(c, u, v) {
      TILE.g(c, u, v);
      const r = rng(v * 31 + 7), cols = ['#EBA9A4', '#F3EBDD', '#EBCB7A', '#C9B5DA'];
      for (let i = 0; i < 3; i++) {
        const x = 2 + (r() * 11 | 0), y = 2 + (r() * 11 | 0), col = cols[r() * 4 | 0];
        R(c, u, x, y + 1, 1, 2, '#7E9D6B');
        R(c, u, x - 1, y, 3, 1, col); R(c, u, x, y - 1, 1, 3, col); R(c, u, x, y, 1, 1, '#E3B85C');
      }
    },
    d(c, u, v) {
      R(c, u, 0, 0, 16, 16, '#DEC6A3');
      const r = rng(v * 53 + 3);
      for (let i = 0; i < 4; i++) R(c, u, r() * 14 | 0, r() * 15 | 0, 2, 1, '#CBB08A');
      for (let i = 0; i < 3; i++) R(c, u, r() * 15 | 0, r() * 15 | 0, 1, 1, '#EAD7BB');
    },
    s(c, u, v) {
      R(c, u, 0, 0, 16, 16, '#D9D0C3');
      const g = '#C4B8A9', l = '#E4DDD2';
      R(c, u, 0, 0, 16, 1, g); R(c, u, 0, 8, 16, 1, g);
      R(c, u, 0, 0, 1, 8, g); R(c, u, 8, 0, 1, 8, g); R(c, u, 4, 8, 1, 8, g); R(c, u, 12, 8, 1, 8, g);
      R(c, u, 1, 1, 7, 1, l); R(c, u, 9, 1, 7, 1, l); R(c, u, 5, 9, 7, 1, l);
      if (v & 1) R(c, u, 10, 4, 2, 1, '#CDC3B5');
    },
    w(c, u, v) {
      R(c, u, 0, 0, 16, 16, '#D2A67E');
      for (let y = 0; y < 16; y += 4) {
        R(c, u, 0, y, 16, 1, '#B98D67');
        R(c, u, ((y / 4 + v) % 2) ? 5 : 11, y, 1, 4, '#B98D67');
      }
      R(c, u, 2, 2, 3, 1, '#DDB690');
    },
    t(c, u) {
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) R(c, u, x * 8, y * 8, 8, 8, (x + y) % 2 ? '#E2D5C1' : '#F1E8DA');
    },
    m(c, u) {
      R(c, u, 0, 0, 16, 16, '#C6DDCB');
      R(c, u, 3, 3, 1, 1, '#B3CFBA'); R(c, u, 11, 11, 1, 1, '#B3CFBA');
      R(c, u, 11, 4, 1, 1, '#D5E8D9'); R(c, u, 4, 12, 1, 1, '#D5E8D9');
    },
    c(c, u) {
      R(c, u, 0, 0, 16, 16, '#E0ABA4');
      R(c, u, 0, 0, 16, 1, '#D69A93'); R(c, u, 0, 15, 16, 1, '#D69A93');
      for (let x = 2; x < 16; x += 4) R(c, u, x, 7, 2, 2, '#EBC2B9');
    },
    a(c, u, v) {
      R(c, u, 0, 0, 16, 16, '#EDDFC0');
      const r = rng(v * 71 + 5);
      for (let i = 0; i < 5; i++) R(c, u, r() * 15 | 0, r() * 15 | 0, 1, 1, '#DCCAA3');
    },
    '~'(c, u, v, f) {
      R(c, u, 0, 0, 16, 16, '#8FB9D4');
      const k = (f + v) % 4;
      for (const [yy, o] of [[3, 0], [8, 6], [13, 11]]) {
        const x = (o + k * 2) % 16;
        R(c, u, x, yy, 4, 1, '#B6D4E6');
        if (x > 12) R(c, u, x - 16, yy, 4, 1, '#B6D4E6');
      }
      R(c, u, (v * 5) % 14, (v * 7 + 5) % 14, 2, 1, '#7FA9C6');
    },
    b(c, u, v, f) {
      TILE['~'](c, u, v, f);
      R(c, u, 0, 1, 16, 14, '#C8996D');
      for (let x = 0; x < 16; x += 4) R(c, u, x, 1, 1, 14, '#A77B55');
      R(c, u, 0, 0, 16, 1.5, '#8E6848'); R(c, u, 0, 14.5, 16, 1.5, '#8E6848');
    },
  };

  // ---------- 오브젝트
  function house(c, u, roof, wall) {
    SH(c, u, 32, 78, 31, 3);
    R(c, u, 4, 36, 56, 42, wall);
    R(c, u, 4, 36, 56, 2, shade(wall, -0.1));
    R(c, u, 4, 72, 56, 6, '#C4B8A9');
    R(c, u, 4, 72, 56, 1, '#B3A89B');
    POLY(c, u, [[0, 40], [8, 8], [56, 8], [64, 40]], roof);
    for (let y = 14; y < 40; y += 6) {
      const left = 8 - (y - 8) / 4;
      R(c, u, left, y, 64 - 2 * left, 1, shade(roof, -0.12));
    }
    R(c, u, 8, 8, 48, 2, shade(roof, 0.18));
    R(c, u, 0, 39, 64, 3, shade(roof, -0.22));
    R(c, u, 44, 1, 7, 10, '#B9ADA0'); R(c, u, 43, 0, 9, 2, '#A0948A');
    R(c, u, 27, 54, 10, 22, '#8A6650'); R(c, u, 28, 55, 8, 21, '#A67A55');
    R(c, u, 34, 65, 1.5, 1.5, '#EBCB7A');
    R(c, u, 25, 76, 14, 2, '#B9ADA0');
    for (const wx of [9, 43]) {
      R(c, u, wx, 48, 12, 11, '#8A6650'); R(c, u, wx + 1, 49, 10, 9, '#BFD8E6');
      R(c, u, wx + 1, 49, 4, 3, '#D7E7F0');
      R(c, u, wx + 5.5, 49, 1, 9, '#8A6650'); R(c, u, wx + 1, 53, 10, 1, '#8A6650');
      R(c, u, wx - 1, 59, 14, 3, '#A67A55');
      R(c, u, wx + 1, 57.5, 2, 2, '#E7A3A0'); R(c, u, wx + 5, 57.5, 2, 2, '#EBCB7A'); R(c, u, wx + 9, 57.5, 2, 2, '#E7A3A0');
    }
  }
  function wall(c, u, cap, face, kind) {
    R(c, u, 0, 6, 16, 26, face);
    R(c, u, 0, 0, 16, 6, cap);
    R(c, u, 0, 5, 16, 1, shade(cap, -0.15));
    if (kind === 'wood') {
      for (const y of [12, 18, 24]) R(c, u, 0, y, 16, 1, shade(face, -0.12));
      R(c, u, 5, 6, 1, 6, shade(face, -0.12)); R(c, u, 11, 12, 1, 6, shade(face, -0.12)); R(c, u, 4, 18, 1, 6, shade(face, -0.12));
    } else if (kind === 'stone') {
      for (let y = 6, i = 0; y < 32; y += 5, i++) {
        R(c, u, 0, y, 16, 1, shade(face, -0.15));
        R(c, u, i % 2 ? 4 : 10, y, 1, 5, shade(face, -0.15));
      }
    } else {
      R(c, u, 0, 27, 16, 3, '#C9B79C');
    }
    R(c, u, 0, 30, 16, 2, shade(face, -0.25));
  }

  const OBJ = {
    tree(c, u) {
      SH(c, u, 8, 29.5, 6.5, 2);
      R(c, u, 6, 20, 4, 10, '#8A6650'); R(c, u, 8, 20, 2, 10, '#765849');
      E(c, u, 8, 13, 8, 9, '#7C9B69'); E(c, u, 7, 11, 6.5, 7, '#8BAB76');
      E(c, u, 5, 9, 3.5, 3, '#A3C28B'); E(c, u, 11, 16, 3, 2.5, '#6F8C63');
    },
    pine(c, u) {
      SH(c, u, 8, 29.5, 6, 2);
      R(c, u, 7, 24, 2, 6, '#765849');
      POLY(c, u, [[8, 12], [16, 26], [0, 26]], '#5F8058'); POLY(c, u, [[8, 12], [8, 26], [0, 26]], '#6C8C60');
      POLY(c, u, [[8, 6], [15, 18], [1, 18]], '#678A5E'); POLY(c, u, [[8, 6], [8, 18], [1, 18]], '#759668');
      POLY(c, u, [[8, 1], [13, 11], [3, 11]], '#6F8C63'); POLY(c, u, [[8, 1], [8, 11], [3, 11]], '#7E9D6B');
    },
    bush(c, u) {
      SH(c, u, 8, 14, 7, 2);
      E(c, u, 8, 10, 7, 5, '#7C9B69'); E(c, u, 6, 8.5, 4.5, 3.5, '#8BAB76'); E(c, u, 11, 9, 3, 2.5, '#86A672');
      R(c, u, 4, 9, 1, 1, '#E7A3A0'); R(c, u, 10, 7, 1, 1, '#E7A3A0'); R(c, u, 12, 11, 1, 1, '#E7A3A0');
    },
    flowers(c, u) {
      for (const [x, y, col] of [[3, 4, '#EBA9A4'], [10, 3, '#F3EBDD'], [6, 9, '#EBCB7A'], [12, 10, '#C9B5DA'], [3, 12, '#EBA9A4'], [9, 13, '#EBCB7A']]) {
        R(c, u, x, y + 1, 1, 2, '#7E9D6B');
        R(c, u, x - 1, y, 3, 1, col); R(c, u, x, y - 1, 1, 3, col); R(c, u, x, y, 1, 1, '#E3B85C');
      }
    },
    rock(c, u) {
      SH(c, u, 8, 13.5, 6.5, 2);
      E(c, u, 8, 10.5, 6.5, 4.5, '#B3A89B'); E(c, u, 7, 9, 5, 3, '#CAC1B5'); R(c, u, 5, 8, 2, 1, '#DCD5CB');
    },
    stump(c, u) {
      SH(c, u, 8, 13.5, 6, 2);
      R(c, u, 3, 8, 10, 5, '#A77B55'); E(c, u, 8, 13, 5, 1.5, '#A77B55');
      E(c, u, 8, 8, 5, 2.2, '#D8B48A'); E(c, u, 8, 8, 3, 1.3, '#C89F74'); E(c, u, 8, 8, 1.2, 0.6, '#D8B48A');
    },
    fence(c, u) {
      R(c, u, 1, 5, 2, 10, '#B88A5E'); R(c, u, 13, 5, 2, 10, '#B88A5E');
      R(c, u, 1, 4, 2, 1, '#CFA37A'); R(c, u, 13, 4, 2, 1, '#CFA37A');
      R(c, u, 0, 7, 16, 2, '#C99A6E'); R(c, u, 0, 11, 16, 2, '#C99A6E');
      R(c, u, 0, 8.6, 16, 0.6, '#A67A55'); R(c, u, 0, 12.6, 16, 0.6, '#A67A55');
    },
    lamp(c, u) {
      E(c, u, 8, 8, 8, 8, 'rgba(246,222,154,0.22)');
      SH(c, u, 8, 30, 4, 1.3);
      R(c, u, 5, 28, 6, 3, '#5A4A42'); R(c, u, 7, 10, 2, 19, '#5A4A42'); R(c, u, 7.5, 10, 0.8, 19, '#766259');
      POLY(c, u, [[4, 5], [8, 2], [12, 5]], '#4B3A32');
      R(c, u, 4.5, 5, 7, 6, '#4B3A32'); R(c, u, 5.5, 6, 5, 4, '#F6DE9A'); R(c, u, 6, 6.5, 1.5, 3, '#FBEFC8');
    },
    bench(c, u) {
      SH(c, u, 16, 14.5, 14, 1.5);
      R(c, u, 3, 10, 2, 5, '#765849'); R(c, u, 27, 10, 2, 5, '#765849');
      R(c, u, 3, 3, 1.5, 6, '#8A6650'); R(c, u, 27.5, 3, 1.5, 6, '#8A6650');
      R(c, u, 1, 2, 30, 2, '#B88A5E'); R(c, u, 1, 5, 30, 2, '#B88A5E');
      R(c, u, 1, 8, 30, 3, '#C99A6E'); R(c, u, 1, 10.5, 30, 1, '#A67A55');
    },
    barrel(c, u) {
      SH(c, u, 8, 15, 6, 1.3);
      R(c, u, 3, 3, 10, 12, '#A87850'); R(c, u, 2.5, 5, 11, 8, '#A87850');
      R(c, u, 3, 5, 10, 1, '#6D5446'); R(c, u, 3, 12, 10, 1, '#6D5446'); R(c, u, 5, 6, 1, 6, '#B98A60');
      E(c, u, 8, 3, 5, 1.7, '#C79A6E'); E(c, u, 8, 3, 3.5, 1, '#B88A5E');
    },
    crate(c, u) {
      SH(c, u, 8, 15, 7, 1.2);
      R(c, u, 2, 4, 12, 11, '#C99A6E'); R(c, u, 2, 4, 12, 1.5, '#DDB690');
      R(c, u, 2, 4, 1, 11, '#A67A55'); R(c, u, 13, 4, 1, 11, '#A67A55'); R(c, u, 2, 14, 12, 1, '#A67A55');
      LINE(c, u, 3.5, 6.5, 12.5, 13.5, '#A67A55', 1);
    },
    sign(c, u) {
      SH(c, u, 8, 15, 4, 1);
      R(c, u, 7, 8, 2, 7, '#8A6650');
      R(c, u, 1.5, 2, 13, 7, '#8A6650'); R(c, u, 2.5, 3, 11, 5, '#DDB690');
      R(c, u, 4, 4.5, 8, 1, '#A67A55'); R(c, u, 4, 6, 5, 1, '#A67A55');
    },
    well(c, u) {
      SH(c, u, 16, 46, 15, 2.5);
      R(c, u, 3, 26, 26, 19, '#CFC6BA');
      R(c, u, 3, 31, 26, 1, '#B9ADA0'); R(c, u, 3, 37, 26, 1, '#B9ADA0'); R(c, u, 3, 43, 26, 1, '#B9ADA0');
      for (const x of [9, 17, 25]) R(c, u, x, 32, 1, 5, '#B9ADA0');
      for (const x of [6, 13, 21]) R(c, u, x, 38, 1, 5, '#B9ADA0');
      E(c, u, 16, 26, 13, 4, '#D9D0C3'); E(c, u, 16, 26, 10, 2.8, '#7FA9C6');
      R(c, u, 5, 8, 2.5, 19, '#8A6650'); R(c, u, 24.5, 8, 2.5, 19, '#8A6650');
      R(c, u, 7, 14, 18, 1.5, '#765849'); R(c, u, 15.5, 15, 1, 6, '#DCC7AE'); R(c, u, 14, 20, 4, 3, '#A87850');
      POLY(c, u, [[1, 11], [16, 2], [31, 11]], '#C97B5D'); R(c, u, 1, 10, 30, 3, '#B56A4E');
    },
    tower(c, u, o) {
      const n = Math.max(2, Math.min(14, (o && o.level) || 2));
      SH(c, u, 16, 78, 15, 2.5);
      E(c, u, 16, 74, 14, 4, '#B3A89B'); E(c, u, 16, 72, 13, 3.5, '#C6BDB1');
      const cols = ['#CFC6BA', '#B9ADA0', '#DCD3C7', '#C4B8AA', '#D6C3B0'];
      let y = 68;
      for (let i = 0; i < n; i++) {
        const w = Math.max(4.5, 11 - i * 0.5), jx = ((i * 37) % 5 - 2) * 0.4, col = cols[i % cols.length];
        E(c, u, 16 + jx, y, w, 3.2, shade(col, -0.12));
        E(c, u, 16 + jx, y - 0.6, w - 0.4, 2.7, col);
        E(c, u, 14.5 + jx, y - 1.4, w * 0.45, 0.9, shade(col, 0.25));
        y -= 4.1;
      }
      if (n >= 10) {
        E(c, u, 16, y + 1, 5, 5, 'rgba(235,203,122,0.35)');
        POLY(c, u, [[16, y - 3], [17.2, y], [20, y + 0.3], [17.8, y + 2], [18.5, y + 5], [16, y + 3.3], [13.5, y + 5], [14.2, y + 2], [12, y + 0.3], [14.8, y]], '#EBCB7A');
      }
    },
    minitower(c, u) {
      SH(c, u, 8, 31, 6, 1.3);
      R(c, u, 2, 27, 12, 4, '#A67A55'); R(c, u, 2, 27, 12, 1, '#C99A6E');
      E(c, u, 8, 25, 5, 2.2, '#CFC6BA'); E(c, u, 8, 21, 4.3, 2, '#B9ADA0'); E(c, u, 8, 17.5, 3.6, 1.8, '#DCD3C7');
      E(c, u, 8, 14.3, 3, 1.6, '#C4B8AA'); E(c, u, 8, 11.5, 2.3, 1.4, '#CFC6BA');
      R(c, u, 7.5, 6, 1, 3, '#EBCB7A'); R(c, u, 6.5, 7, 3, 1, '#EBCB7A');
    },
    house_red(c, u) { house(c, u, '#C97B5D', '#F1E6D2'); },
    house_blue(c, u) { house(c, u, '#7FA3BF', '#E9DFCE'); },
    shop(c, u) {
      house(c, u, '#8FA879', '#F1E6D2');
      for (let i = 0; i < 8; i++) {
        R(c, u, 4 + i * 7, 43, 7, 5, i % 2 ? '#F3EBDD' : '#C97B5D');
        E(c, u, 7.5 + i * 7, 48, 3.5, 1.6, i % 2 ? '#F3EBDD' : '#C97B5D');
      }
      R(c, u, 16, 22, 32, 11, '#8A6650'); R(c, u, 17, 23, 30, 9, '#F3EBDD');
      text(c, u, '석산 상점', 32, 27.8, 6, '#765849');
    },
    board(c, u) {
      SH(c, u, 16, 30, 14, 1.5);
      R(c, u, 3, 18, 2, 13, '#765849'); R(c, u, 27, 18, 2, 13, '#765849');
      R(c, u, 1, 2, 30, 18, '#8A6650'); R(c, u, 2.5, 3.5, 27, 15, '#E8D4B6');
      R(c, u, 0, 1, 32, 2, '#6D5446');
      R(c, u, 5, 5, 7, 9, '#F6EFE3'); R(c, u, 14, 6, 6, 6, '#F0DC9C'); R(c, u, 22, 5, 6, 10, '#CFE2EC');
      R(c, u, 8, 5, 1, 1, '#C97B5D'); R(c, u, 16.5, 6, 1, 1, '#6F8C63'); R(c, u, 24.5, 5, 1, 1, '#C97B5D');
      for (const y of [7.5, 9.5, 11.5]) R(c, u, 6, y, 5, 0.6, '#B9ADA0');
    },
    storygate(c, u, o, t) {
      const glow = 0.28 + 0.1 * Math.sin((t || 0) * 2);
      R(c, u, 7, 12, 18, 35, `rgba(185,163,201,${glow})`);
      E(c, u, 16, 13, 9, 8, `rgba(185,163,201,${glow})`);
      for (const [x, y] of [[11, 20], [20, 26], [14, 33], [19, 40], [12, 42]]) R(c, u, x, y, 1, 1, '#F6EFE3');
      R(c, u, 1, 12, 6, 35, '#B9ADA0'); R(c, u, 25, 12, 6, 35, '#B9ADA0');
      for (let y = 18; y < 46; y += 6) { R(c, u, 1, y, 6, 1, '#A0948A'); R(c, u, 25, y, 6, 1, '#A0948A'); }
      c.strokeStyle = '#CFC6BA'; c.lineWidth = 6 * u;
      c.beginPath(); c.arc(16 * u, 13 * u, 12 * u, Math.PI, 0); c.stroke();
      c.strokeStyle = '#DCD3C7'; c.lineWidth = 1.5 * u;
      c.beginPath(); c.arc(16 * u, 13 * u, 14 * u, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      for (const [x, y] of [[2, 16], [5, 24], [2, 34], [28, 20], [26, 30], [29, 38]]) E(c, u, x, y, 1.6, 1.1, '#8FA879');
      R(c, u, 9, 0, 14, 6, '#8A6650'); R(c, u, 10, 1, 12, 4, '#F3EBDD');
      text(c, u, '이야기', 16, 3.2, 3.4, '#765849');
    },
    mailbox(c, u) {
      SH(c, u, 8, 30.5, 3.5, 1);
      R(c, u, 7, 18, 2, 13, '#765849');
      R(c, u, 3, 9, 10, 9, '#C97B5D'); E(c, u, 8, 9, 5, 3, '#C97B5D'); R(c, u, 4, 12, 8, 1, '#B56A4E');
      R(c, u, 12, 7, 1, 6, '#4B3A32'); R(c, u, 12, 7, 3, 2, '#EBCB7A');
    },
    fountain(c, u, o, t) {
      SH(c, u, 16, 30, 15, 2);
      E(c, u, 16, 20, 15, 10, '#C4B8A9'); E(c, u, 16, 19, 14, 9, '#D9D0C3'); E(c, u, 16, 19, 11.5, 7, '#8FB9D4');
      const k = Math.floor((t || 0) * 3) % 3;
      E(c, u, 12 + k, 17, 4, 1.5, '#B6D4E6');
      R(c, u, 14, 6, 4, 13, '#CFC6BA'); R(c, u, 14, 6, 1, 13, '#DCD3C7');
      E(c, u, 16, 6, 5, 2, '#D9D0C3'); E(c, u, 16, 5.5, 3.5, 1.2, '#8FB9D4');
      R(c, u, 12, 2 + k, 1, 2, '#B6D4E6'); R(c, u, 19, 2 + ((k + 1) % 3), 1, 2, '#B6D4E6'); R(c, u, 15.5, 0.5, 1, 3, '#B6D4E6');
    },
    bed(c, u) {
      SH(c, u, 8, 31, 7, 1);
      R(c, u, 1, 1, 14, 30, '#A87850'); R(c, u, 1, 1, 14, 4, '#8A6650');
      R(c, u, 2, 5, 12, 25, '#F3EBDD'); R(c, u, 3, 6, 10, 5, '#FBF6EC');
      R(c, u, 2, 13, 12, 17, '#8FB9D4'); R(c, u, 2, 13, 12, 2, '#B6D4E6'); R(c, u, 2, 29, 12, 1, '#7FA9C6');
    },
    table(c, u) {
      SH(c, u, 16, 15, 14, 1.2);
      R(c, u, 2, 11, 2, 4, '#8A6650'); R(c, u, 28, 11, 2, 4, '#8A6650');
      R(c, u, 1, 2, 30, 9, '#C99A6E'); R(c, u, 1, 10, 30, 2, '#A67A55'); R(c, u, 2, 3, 28, 1, '#DDB690');
      R(c, u, 14, 3, 3, 4, '#8FB9D4'); E(c, u, 15.5, 2.8, 2, 1.3, '#E7A3A0');
    },
    chair(c, u) {
      SH(c, u, 8, 15, 5, 1);
      R(c, u, 4, 11, 1.5, 4, '#8A6650'); R(c, u, 10.5, 11, 1.5, 4, '#8A6650');
      R(c, u, 4, 1, 8, 7, '#B88A5E'); R(c, u, 5, 2, 6, 5, '#C99A6E'); R(c, u, 4, 1, 8, 1, '#DDB690');
      R(c, u, 3, 8, 10, 3, '#C99A6E'); R(c, u, 3, 10.3, 10, 0.7, '#A67A55');
    },
    sofa(c, u) {
      SH(c, u, 16, 15, 15, 1.2);
      R(c, u, 1, 4, 30, 11, '#C98A7E'); R(c, u, 2, 1, 28, 7, '#B77A6E');
      R(c, u, 0, 5, 4, 10, '#B77A6E'); R(c, u, 28, 5, 4, 10, '#B77A6E');
      R(c, u, 4, 8, 11, 5, '#D99C90'); R(c, u, 17, 8, 11, 5, '#D99C90'); R(c, u, 15.5, 8, 1, 5, '#B77A6E');
    },
    desk(c, u) {
      SH(c, u, 16, 15, 14, 1.2);
      R(c, u, 2, 11, 2, 4, '#8A6650');
      R(c, u, 1, 3, 30, 8, '#B88A5E'); R(c, u, 1, 10, 30, 2, '#8A6650');
      R(c, u, 20, 11, 9, 4, '#A67A55'); R(c, u, 24, 12.5, 1.5, 1, '#EBCB7A');
      R(c, u, 4, 4, 6, 4, '#8FB9D4'); R(c, u, 12, 4, 6, 5, '#F6EFE3');
      R(c, u, 24.5, 1, 1, 5, '#4B3A32'); E(c, u, 25, 1.5, 3, 1.5, '#EBCB7A');
    },
    bookshelf(c, u) {
      SH(c, u, 8, 31, 7, 1);
      R(c, u, 1, 2, 14, 29, '#8A6650'); R(c, u, 2, 3, 12, 27, '#6D5446');
      R(c, u, 2, 11, 12, 1.5, '#8A6650'); R(c, u, 2, 20, 12, 1.5, '#8A6650');
      const cols = ['#C97B5D', '#8FB9D4', '#EBCB7A', '#8FA879', '#B9A3C9', '#E7A3A0'];
      [[4, 7], [13, 7], [22, 8]].forEach(([y0, h], row) => {
        for (let x = 2, i = row; x < 13.5; x += 2, i++) {
          const cut = (i * 7) % 3;
          R(c, u, x + 0.1, y0 + cut, 1.7, h - cut, cols[i % cols.length]);
        }
      });
    },
    piano(c, u) {
      SH(c, u, 16, 31, 15, 1);
      R(c, u, 3, 26, 2, 5, '#3A2D27'); R(c, u, 27, 26, 2, 5, '#3A2D27');
      R(c, u, 1, 3, 30, 24, '#4B3A32'); R(c, u, 2, 4, 28, 10, '#5E4A40');
      R(c, u, 10, 6, 12, 6, '#F6EFE3'); R(c, u, 12, 8, 8, 0.6, '#B9ADA0'); R(c, u, 12, 10, 6, 0.6, '#B9ADA0');
      R(c, u, 2, 17, 28, 5, '#F3EBDD');
      for (let x = 3.5; x < 29; x += 3.5) R(c, u, x, 17, 1.4, 3, '#3A2D27');
    },
    clock(c, u) {
      SH(c, u, 8, 31, 5, 1);
      R(c, u, 3, 4, 10, 27, '#8A6650'); E(c, u, 8, 4.5, 5, 3, '#8A6650');
      E(c, u, 8, 9, 4, 4, '#F3EBDD');
      LINE(c, u, 8, 9, 8, 6.5, '#4B3A32', 0.7); LINE(c, u, 8, 9, 10, 9, '#4B3A32', 0.7);
      R(c, u, 5, 15, 6, 12, '#6D5446'); R(c, u, 7.5, 16, 1, 7, '#EBCB7A'); E(c, u, 8, 23, 1.8, 1.8, '#EBCB7A');
    },
    floorlamp(c, u) {
      E(c, u, 8, 8, 7, 6, 'rgba(246,222,154,0.2)');
      SH(c, u, 8, 31, 4, 1);
      R(c, u, 5, 29, 6, 2, '#5A4A42'); R(c, u, 7.5, 10, 1, 19, '#5A4A42');
      POLY(c, u, [[3, 11], [5, 3], [11, 3], [13, 11]], '#F0D9A0'); R(c, u, 3, 10, 10, 1.5, '#E3C07A');
    },
    rug(c, u) {
      E(c, u, 16, 16, 15, 13, '#D9A3A0'); E(c, u, 16, 16, 12.5, 10.5, '#E8C3B5');
      E(c, u, 16, 16, 8, 6.5, '#D9A3A0'); E(c, u, 16, 16, 4, 3, '#EBCB7A');
    },
    whiteboard(c, u) {
      SH(c, u, 16, 31, 14, 1);
      R(c, u, 3, 20, 2, 11, '#9C9186'); R(c, u, 27, 20, 2, 11, '#9C9186');
      R(c, u, 1, 2, 30, 19, '#B9ADA0'); R(c, u, 2, 3, 28, 16, '#6F8C63'); R(c, u, 2, 3, 28, 1, '#5F7C55');
      R(c, u, 4, 19, 24, 1.5, '#9C9186'); R(c, u, 8, 18.3, 3, 1, '#F3EBDD');
    },
    plant(c, u) {
      SH(c, u, 8, 31, 4.5, 1);
      POLY(c, u, [[4, 23], [12, 23], [11, 31], [5, 31]], '#C97B5D'); R(c, u, 3, 21, 10, 2.5, '#B56A4E');
      E(c, u, 8, 15, 4, 6, '#7C9B69'); E(c, u, 5, 17, 3, 4, '#8BAB76'); E(c, u, 11, 16, 3, 5, '#6F8C63'); E(c, u, 8, 11, 2, 3, '#8BAB76');
    },
    aquarium(c, u) {
      SH(c, u, 8, 31, 6, 1);
      R(c, u, 2, 22, 12, 9, '#8A6650'); R(c, u, 3, 24, 10, 1, '#A67A55');
      R(c, u, 1, 9, 14, 13, '#A8CFE0'); R(c, u, 1, 9, 14, 2, '#C8E2EE'); R(c, u, 1, 20, 14, 2, '#EDDFC0');
      R(c, u, 12, 15, 1, 5, '#6F8C63'); R(c, u, 3, 17, 1, 3, '#6F8C63');
      E(c, u, 6, 15, 2, 1.2, '#E8A06E'); R(c, u, 3.5, 14.5, 1, 1, '#E8A06E'); E(c, u, 10.5, 18, 1.6, 1, '#EBCB7A');
      R(c, u, 1, 9, 14, 0.8, '#8A6650');
    },
    easel(c, u) {
      LINE(c, u, 4, 31, 7, 6, '#8A6650', 1.2); LINE(c, u, 12, 31, 9, 6, '#8A6650', 1.2); LINE(c, u, 8, 30, 8, 8, '#765849', 1);
      R(c, u, 2, 4, 12, 13, '#F6EFE3'); R(c, u, 2, 4, 12, 1, '#DCC7AE'); R(c, u, 1.5, 16.5, 13, 1.2, '#A67A55');
    },
    teddy(c, u) {
      SH(c, u, 8, 15, 5, 1);
      E(c, u, 8, 11, 4.5, 4, '#B98A60'); E(c, u, 8, 6, 4, 3.5, '#C79A6E');
      E(c, u, 5, 3.5, 1.6, 1.6, '#C79A6E'); E(c, u, 11, 3.5, 1.6, 1.6, '#C79A6E');
      E(c, u, 8, 7, 1.8, 1.2, '#E8D4B6');
      R(c, u, 6.5, 5.3, 1, 1, '#4B3A32'); R(c, u, 8.8, 5.3, 1, 1, '#4B3A32'); R(c, u, 6, 9, 4, 1.2, '#E7A3A0');
    },
    cake(c, u) {
      SH(c, u, 8, 15, 6, 1);
      E(c, u, 8, 13, 7, 2, '#F3EBDD');
      R(c, u, 3, 6, 10, 7, '#F6E3D3'); E(c, u, 8, 6, 5, 1.8, '#FBF1E6'); R(c, u, 3, 9, 10, 1.5, '#E7A3A0');
      R(c, u, 5, 4, 2, 2, '#D9706A'); R(c, u, 9, 4, 2, 2, '#D9706A');
      R(c, u, 7.5, 1.5, 1, 3, '#8FB9D4'); E(c, u, 8, 1, 0.8, 1, '#EBCB7A');
    },
    wall_wood(c, u) { wall(c, u, '#B88A5E', '#D2A67E', 'wood'); },
    wall_stone(c, u) { wall(c, u, '#CFC6BA', '#B9ADA0', 'stone'); },
    wall_white(c, u) { wall(c, u, '#F3EBDD', '#E9DFCE', 'white'); },
    door(c, u) {
      R(c, u, 2, 4, 12, 9, '#C97B5D'); R(c, u, 3, 5, 10, 7, '#D99070');
      R(c, u, 3, 7, 10, 1, '#E8B08F'); R(c, u, 3, 9, 10, 1, '#E8B08F');
    },
  };
  const ANIMATED = { storygate: 1, fountain: 1 };

  // ---------- 이야기 모드 아이템(16×16)
  const ITEM = {
    wheat(c, u) {
      R(c, u, 7.5, 5, 1, 10, '#C9A45A');
      E(c, u, 8, 4, 1.5, 2.5, '#E3C07A'); E(c, u, 6.3, 7, 1.3, 2, '#E3C07A'); E(c, u, 9.7, 7, 1.3, 2, '#E3C07A');
      E(c, u, 6.3, 10, 1.3, 2, '#D9B466'); E(c, u, 9.7, 10, 1.3, 2, '#D9B466');
    },
    flower(c, u) {
      R(c, u, 7.5, 8, 1, 7, '#6F8C63'); E(c, u, 10, 12, 2, 1, '#8FA879');
      for (const [x, y] of [[8, 4], [5.8, 6], [10.2, 6], [8, 8]]) E(c, u, x, y, 2, 2, '#EBA9A4');
      E(c, u, 8, 6, 1.3, 1.3, '#EBCB7A');
    },
    shell(c, u) {
      E(c, u, 8, 9, 5.5, 4.5, '#F1D3C4');
      for (const x of [4.5, 6.5, 8, 9.5, 11.5]) LINE(c, u, 8, 13, x, 5.5, '#DDB3A2', 0.5);
      R(c, u, 6.5, 12, 3, 2, '#E0B7A6');
    },
    gem(c, u) {
      POLY(c, u, [[8, 3], [12.5, 7], [8, 13.5], [3.5, 7]], '#9FD0E0');
      POLY(c, u, [[8, 3], [12.5, 7], [8, 7]], '#C8E6EF'); POLY(c, u, [[3.5, 7], [8, 7], [8, 13.5]], '#7FB4C8');
    },
    page(c, u) {
      R(c, u, 4, 3, 9, 11, '#F3EBDD'); R(c, u, 4, 3, 9, 1, '#DCC7AE');
      for (const y of [6, 8, 10]) R(c, u, 5.5, y, 6, 0.7, '#B9ADA0');
      POLY(c, u, [[10, 14], [13, 11], [13, 14]], '#DCC7AE');
    },
    stone(c, u) {
      E(c, u, 8, 10, 5.5, 3.8, '#B9ADA0'); E(c, u, 8, 9.4, 5, 3.2, '#CFC6BA'); E(c, u, 6.5, 8, 2.5, 1.2, '#E4DDD2');
    },
  };

  // ---------- 아바타는 avatar.js (벡터 부품 캐릭터 엔진)가 그린다.

  // ---------- 캐시
  const cache = new Map();
  function mk(w, h) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h));
    return cv;
  }
  function tileSprite(id, v, f, S) {
    const key = `t${id}|${v}|${f}|${S}`;
    let cv = cache.get(key);
    if (!cv) {
      cv = mk(S, S);
      (TILE[id] || TILE.g)(cv.getContext('2d'), S / 16, v, f);
      cache.set(key, cv);
    }
    return cv;
  }
  function objSprite(spec, S, opts) {
    const level = opts && opts.level || 0;
    const key = `o${spec.id}|${S}|${level}`;
    let cv = cache.get(key);
    if (!cv) {
      cv = mk(spec.w * S, (spec.h + spec.tall) * S);
      const fn = OBJ[spec.id];
      if (fn) fn(cv.getContext('2d'), S / 16, opts || {}, 0);
      cache.set(key, cv);
    }
    return cv;
  }
  function drawObjLive(c, spec, S, x, y, t) {
    c.save();
    c.translate(x, y);
    OBJ[spec.id](c, S / 16, {}, t);
    c.restore();
  }
  /** 걷는 캐릭터: 반환 캔버스에 ax·ay(발바닥 가운데)와 tagY(머리 맨 위)가 붙어 있다. */
  function avatarSprite(L, dir, frame, S, expr) { return Avatar.sprite(L, dir, frame, S, expr); }
  function itemSprite(id, S) {
    const key = `i${id}|${S}`;
    let cv = cache.get(key);
    if (!cv) {
      cv = mk(S, S);
      (ITEM[id] || ITEM.stone)(cv.getContext('2d'), S / 16);
      cache.set(key, cv);
    }
    return cv;
  }
  /** UI용: 오브젝트를 size×size 칸에 맞춰 그린 캔버스 */
  function objIcon(spec, size) {
    const tilesW = spec.w, tilesH = spec.h + spec.tall;
    const S = Math.floor(size / Math.max(tilesW, tilesH));
    const spr = objSprite(spec, S, spec.id === 'tower' ? { level: 6 } : null);
    const cv = mk(size, size), c = cv.getContext('2d');
    c.drawImage(spr, (size - spr.width) / 2, (size - spr.height) / 2);
    return cv;
  }
  function tileIcon(id, size) {
    const cv = mk(size, size);
    cv.getContext('2d').drawImage(tileSprite(id, 1, 0, size), 0, 0);
    return cv;
  }
  /** 옷장·이름표 그림. focus: full | head | body | feet | wide */
  function avatarIcon(L, size, dir, focus) { return Avatar.icon(L, size, dir || 0, focus || 'full'); }

  window.Art = {
    R, E, POLY, LINE, shade, rng,
    tileSprite, objSprite, drawObjLive, avatarSprite, itemSprite,
    objIcon, tileIcon, avatarIcon, ANIMATED, hasObj: id => !!OBJ[id],
  };
})();
