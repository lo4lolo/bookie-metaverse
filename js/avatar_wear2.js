/* 기존 옷: 줄무늬 티 · 앞치마 · 후드티 · 멜빵옷 · 원피스 · 한복 · 샌들 */
(function () {
  'use strict';
  const A = Avatar, U = A.U, Z = A.Z;
  const { PI, blob, curve, sym, poly, ell, rrect, capsule, part, stroke, fill, inside, ramp, mix } = U;
  const { K, FAR, shirtPath, sleeveCap, gloves, hemWave, neckV } = A.clothKit;
  const CREAM = '#F3EAD6';

  function crewNeck(ctx, g, R) {
    const d = g.dir;
    if (d === 'f') {
      const hole = (() => { const q = new Path2D(); q.ellipse(0, 37.4, 5.2, 2.8, 0, 0, PI); q.closePath(); return q; })();
      fill(ctx, hole, g.L.skin); stroke(ctx, hole, ramp(g.L.skin).o, 0.9);
      stroke(ctx, (() => { const q = new Path2D(); q.ellipse(0, 37.4, 5.7, 3.2, 0, 0.05, PI - 0.05); return q; })(), R.d2, 1.4);
    } else if (d === 'b') {
      stroke(ctx, (() => { const q = new Path2D(); q.ellipse(0, 36.6, 5.2, 1.8, 0, 0.1, PI - 0.1); return q; })(), R.d2, 1.3);
    }
  }

  // ---------------------------------------------------------------- 줄무늬 티
  A.reg('top', 'stripe', {
    draw(g, tint) {
      const R = ramp(tint), d = g.dir, body = shirtPath(g, 63, 0.4);
      sleeveCap(g, tint, 0.46, {});
      g.z(Z.TOP, ctx => {
        part(ctx, body, R, { sd: [2.4, 3.2] });
        inside(ctx, body, () => { for (let y = 40.6; y < 64; y += 5.4) fill(ctx, rrect(-16, y, 32, 2.6, 0), CREAM); });
        crewNeck(ctx, g, R);
        stroke(ctx, curve([[-12.2, 61.6], [0, 62.8], [12.2, 61.6]]), R.d, 0.9);
      }, 'b');
      g.arms.forEach(a => g.z(a.far ? Z.ARMFAR + 0.2 : Z.SLEEVE + 0.2, ctx => {
        const p = g.armAt(a, 0.2), q = g.armAt(a, 0.32), r = g.armAt(a, 0.42);
        [[0.18, 0.26], [0.34, 0.42]].forEach(([t0, t1]) => {
          const p0 = g.armAt(a, t0), p1 = g.armAt(a, t1);
          part(ctx, capsule(p0[0], p0[1], p1[0], p1[1], a.r0 + 1.0, a.r0 + 1.0), a.far ? FAR(CREAM) : CREAM, { sd: [0.4, 0.6], hi: false, line: false });
        });
      }, 'b'));
    },
  });

  // ---------------------------------------------------------------- 앞치마
  A.reg('top', 'apron', {
    draw(g, tint) {
      const R = ramp(tint), d = g.dir, W = ramp('#F6F0E4');
      sleeveCap(g, tint, 0.5, {});
      g.z(Z.TOP, ctx => {
        part(ctx, shirtPath(g, 63, 0.3), R, { sd: [2.4, 3.2] });
        crewNeck(ctx, g, R);
        if (d === 'f') {
          const bib = blob([[-6.4, 42], [6.4, 42], [7.4, 50], [10.8, 52], [12.6, 67], [-12.6, 67], [-10.8, 52], [-7.4, 50]], 0.7);
          part(ctx, bib, '#F6F0E4', { sd: [1.8, 2.4] });
          stroke(ctx, curve([[-5.6, 42], [-9, 37.6]]), W.d, 1.3); stroke(ctx, curve([[5.6, 42], [9, 37.6]]), W.d, 1.3);
          part(ctx, rrect(-4.6, 55.4, 9.2, 6.6, 1.6), '#EADFC9', { sd: [0.6, 0.9], hi: false });
          hemWave(ctx, -12, 12, 65.6, 6, 0.5, '#d8cbb0', 0.8);
        } else if (d === 'b') {
          part(ctx, rrect(-11.6, 56.6, 23.2, 3, 1.2), '#F6F0E4', { sd: [0.6, 0.9], hi: false });
          const bow = blob([[0, 56.6], [-5.4, 53.8], [-6.4, 58.6], [0, 59.4], [6.4, 58.6], [5.4, 53.8]], 0.9);
          part(ctx, bow, '#F6F0E4', { sd: [0.6, 0.9], hi: false });
          stroke(ctx, curve([[-2, 59.4], [-3.6, 66]]), W.d, 1.2); stroke(ctx, curve([[2, 59.4], [3.6, 66]]), W.d, 1.2);
        } else {
          part(ctx, blob([[-1, 42], [7.4, 44], [8.8, 66], [-2.6, 66], [-3, 52]], 0.7), '#F6F0E4', { sd: [1.6, 2.2] });
        }
      }, 'b');
    },
  });

  // ---------------------------------------------------------------- 후드티
  A.reg('top', 'hoodie', {
    draw(g, tint) {
      const R = ramp(tint), d = g.dir, body = shirtPath(g, 64, 0.6, 0.4);
      sleeveCap(g, tint, 0.92, { cuff: mix(tint, '#000', 0.14), cuffLen: 0.12, grow: 1.5 });
      // 등 뒤로 넘어간 모자
      g.z(d === 'b' ? Z.HEAD - 0.4 : Z.HEAD - 2, ctx => {
        const hood = d === 's' ? blob([[-12, 36], [1, 35.4], [-3, 45], [-15, 47], [-19, 41]]) : blob(sym([[0, 35], [12.4, 36], [14.4, 44], [6, 48.4], [0, 48.6]]));
        part(ctx, hood, mix(tint, '#000', 0.08), { sd: [1.8, 2.4] });
        if (d !== 'b') stroke(ctx, hood, R.o, 0.6);
      }, 'b');
      g.z(Z.TOP, ctx => {
        part(ctx, body, R, { sd: [2.6, 3.4] });
        if (d === 'f') {
          const collar = blob(sym([[0, 35.4], [8.6, 35.8], [9.8, 40.6], [4.8, 44], [0, 45.4]]));
          part(ctx, collar, mix(tint, '#fff', 0.06), { sd: [1, 1.4] });
          const inner = (() => { const q = new Path2D(); q.ellipse(0, 37.8, 5.4, 2.6, 0, 0, PI); q.closePath(); return q; })();
          fill(ctx, inner, mix(tint, '#000', 0.4));
          [-1, 1].forEach(s => { stroke(ctx, curve([[s * 3.2, 41], [s * 3.6, 47]]), '#F3EAD6', 1.1); fill(ctx, ell(s * 3.6, 47.6, 1, 1), '#F3EAD6'); });
          const pocket = blob([[-8.6, 55], [8.6, 55], [11, 65], [-11, 65]], 0.5);
          part(ctx, pocket, mix(tint, '#000', 0.1), { sd: [1, 1.4], hi: false });
        }
      }, 'b');
    },
  });

  // ---------------------------------------------------------------- 멜빵옷
  A.reg('top', 'overall', {
    draw(g, tint) {
      const R = ramp(tint), d = g.dir;
      sleeveCap(g, CREAM, 0.6, { grow: 1.2 });
      g.z(Z.TOP, ctx => {
        part(ctx, shirtPath(g, 63, 0.3), CREAM, { sd: [2.4, 3.2] });
        crewNeck(ctx, g, ramp(CREAM));
        if (d === 'f') {
          const bib = blob([[-6.6, 46], [6.6, 46], [12.4, 52], [12.6, 67], [-12.6, 67], [-12.4, 52]], 0.6);
          part(ctx, bib, R, { sd: [2, 2.6] });
          [-1, 1].forEach(s => part(ctx, poly([[s * 3.4, 46.4], [s * 7.4, 46.4], [s * 7.8, 37], [s * 4.2, 36.6]]), R, { sd: [1, 1.4], hi: false }));
          part(ctx, rrect(-4.4, 52.4, 8.8, 6, 1.4), mix(tint, '#000', 0.12), { sd: [0.6, 0.9], hi: false });
          [-1, 1].forEach(s => { fill(ctx, ell(s * 5.6, 47.6, 1.2, 1.2), K.gold); });
        } else if (d === 'b') {
          part(ctx, rrect(-11.6, 50, 23.2, 17, 1.6), R, { sd: [2, 2.6] });
          [-1, 1].forEach(s => part(ctx, poly([[s * 3.4, 50], [s * 7.4, 50], [s * 7.8, 37], [s * 4.2, 36.6]]), R, { sd: [1, 1.4], hi: false }));
        } else {
          part(ctx, blob([[-3, 46], [8.6, 47], [9.6, 66], [-8.8, 66], [-9, 52]], 0.6), R, { sd: [2, 2.6] });
          part(ctx, poly([[0.6, 47], [4.4, 47], [4.4, 38], [1, 37.4]]), R, { sd: [1, 1.4], hi: false });
        }
      }, 'b');
    },
  });

  // ---------------------------------------------------------------- 원피스
  A.reg('top', 'dress', {
    draw(g, tint) {
      const R = ramp(tint), d = g.dir;
      g.flags.skirtCovers = true;
      const skirt = d === 's'
        ? blob([[-9.6, 57], [9.8, 57], [13.6, 68], [15.2, 77, 1], [-15.2, 77, 1], [-13.4, 68]])
        : blob(sym([[0, 56.6], [11.8, 57], [16.4, 68], [19.4, 77.6, 1], [0, 78.6]]));
      sleeveCap(g, tint, 0.34, { grow: 1.5 });
      g.z(Z.BOOTS + 1, ctx => {
        part(ctx, skirt, R, { sd: [2.6, 3.2] });
        inside(ctx, skirt, () => {
          const xs = d === 's' ? [-6, 0, 6] : [-10, -5, 5, 10];
          xs.forEach(x => stroke(ctx, curve([[x * 0.5, 59], [x * 0.95, 68], [x * 1.2, 78]]), R.d, 0.9));
          fill(ctx, rrect(-24, 74.6, 48, 3.4, 0), mix(tint, '#fff', 0.35));
        });
        stroke(ctx, skirt, R.o, 1);
      }, 'b');
      g.z(Z.TOP, ctx => {
        part(ctx, shirtPath(g, 62, 0.2), R, { sd: [2.4, 3.2] });
        if (d === 'f') {
          const col = blob(sym([[0, 35.6], [8.2, 36], [10, 41], [4.6, 44.6], [0, 46]]));
          part(ctx, col, '#FBF7EE', { sd: [0.8, 1.2], hi: false });
          fill(ctx, ell(0, 45.4, 2, 2), '#E7716B');
          part(ctx, rrect(-11.8, 55.6, 23.6, 3.6, 1.2), mix(tint, '#fff', 0.3), { sd: [0.8, 1.2], hi: false });
          const bow = blob([[0, 57.2], [-5.4, 54.4], [-6, 60], [0, 58.6], [6, 60], [5.4, 54.4]], 0.9);
          part(ctx, bow, '#E7716B', { sd: [0.6, 0.9], hi: false });
        } else if (d === 'b') {
          part(ctx, rrect(-11.8, 55.6, 23.6, 3.6, 1.2), mix(tint, '#fff', 0.3), { sd: [0.8, 1.2], hi: false });
          const bow = blob([[0, 57.2], [-6, 53.6], [-7, 60], [0, 58.6], [7, 60], [6, 53.6]], 0.9);
          part(ctx, bow, '#E7716B', { sd: [0.6, 0.9], hi: false });
        } else {
          part(ctx, rrect(-9.6, 55.6, 19.2, 3.6, 1.2), mix(tint, '#fff', 0.3), { sd: [0.8, 1.2], hi: false });
        }
      }, 'b');
    },
  });

  // ---------------------------------------------------------------- 한복
  A.reg('top', 'hanbok', {
    draw(g, tint) {
      const R = ramp(tint), d = g.dir, sk = g.L.botC, S = ramp(sk);
      g.flags.skirtCovers = true;
      const skirt = d === 's'
        ? blob([[-9.6, 50], [9.8, 50], [15.6, 66], [18, 88, 1], [-18, 88, 1], [-15, 66]])
        : blob(sym([[0, 49.6], [12, 50], [19, 68], [23, 88, 1], [0, 90]]));
      // 저고리 소매 (넓고 둥글다)
      g.arms.forEach(a => {
        const p = g.sleevePath(a, 0.78, 2.4);
        g.z(a.far ? Z.ARMFAR + 0.1 : Z.SLEEVE, ctx => {
          part(ctx, p, a.far ? FAR(tint) : tint, { sd: [2, 2.6], hi: false });
          if (!a.far) { const e = g.armAt(a, 0.78); fill(ctx, ell(e[0], e[1], 2.5, 2.5), '#FBF7EE', 0.0); }
        }, 'b');
      });
      g.z(Z.BOOTS + 1, ctx => {
        part(ctx, skirt, sk, { sd: [3, 3.4] });
        inside(ctx, skirt, () => {
          const xs = d === 's' ? [-8, -2, 5] : [-14, -8, -3, 3, 8, 14];
          xs.forEach(x => stroke(ctx, curve([[x * 0.4, 52], [x * 0.9, 68], [x * 1.25, 88]]), S.d, 0.9));
          fill(ctx, rrect(-26, 84, 52, 1.2, 0), mix(sk, '#fff', 0.5));
        });
        stroke(ctx, skirt, S.o, 1);
      }, 'b');
      g.z(Z.TOP, ctx => {
        const jeo = d === 's'
          ? blob([[-1.6, 36], [5.4, 36.4], [9.6, 40], [10, 47], [9.4, 52.6], [-9.6, 52.6], [-9.8, 46], [-8.6, 40.6]])
          : blob(sym([[0, 35.8], [6.6, 36.3], [11.8, 38.8], [12.9, 44], [12.4, 52.6], [0, 53.6]]));
        part(ctx, jeo, R, { sd: [2.4, 3.2] });
        if (d === 'f') {
          // 동정(흰 깃) 교차 + 옷고름
          const collarL = poly([[-6.4, 35.6], [-2.2, 35.6], [4.6, 47], [1.4, 47.6]]);
          const collarR = poly([[6.4, 35.6], [2.2, 35.6], [-4.6, 47], [-1.4, 47.6]]);
          fill(ctx, collarL, '#FBF7EE'); fill(ctx, collarR, '#FBF7EE');
          stroke(ctx, collarL, '#d8cbb0', 0.6); stroke(ctx, collarR, '#d8cbb0', 0.6);
          const bow = blob([[1.4, 46.6], [-3.4, 44.6], [-3.6, 49.6], [1.4, 48.4], [6.4, 49.6], [6.2, 44.6]], 0.9);
          part(ctx, bow, '#D95B62', { sd: [0.6, 0.9], hi: false });
          stroke(ctx, curve([[1.2, 48.4], [0, 55], [-1.4, 61]]), '#D95B62', 1.3); stroke(ctx, curve([[1.6, 48.4], [3.4, 55], [4, 61]]), '#D95B62', 1.3);
        } else if (d === 'b') {
          fill(ctx, rrect(-6.4, 35.8, 12.8, 2.4, 1), '#FBF7EE');
        }
      }, 'b');
    },
  });

  // ---------------------------------------------------------------- 샌들
  A.reg('shoes', 'sandals', {
    draw(g, tint) {
      const R = ramp(tint);
      g.legs.forEach(l => g.z(Z.BOOTS, ctx => {
        const [ax, ay] = l.ank, far = l.far, col = far ? FAR(tint) : tint;
        if (g.dir === 's') {
          part(ctx, blob([[ax - 5.6, ay + 13.4], [ax + 11, ay + 13.4], [ax + 12.6, ay + 15.4, 1], [ax - 6, ay + 16, 1]], 0.4), col, { sd: [0.6, 0.9], hi: false });
          const foot = blob([[ax - 5, ay + 2], [ax + 4, ay + 1.6], [ax + 5, ay + 6], [ax + 10.4, ay + 9.4], [ax + 11.6, ay + 13.4], [ax - 5.6, ay + 13.4], [ax - 6, ay + 8]], 0.9);
          part(ctx, foot, far ? FAR(g.L.skin) : g.L.skin, { sd: [1.2, 1.6], hi: false });
          stroke(ctx, curve([[ax - 4, ay + 8], [ax + 4.4, ay + 5]]), col, 1.3); stroke(ctx, curve([[ax - 5.6, ay + 12], [ax - 5.4, ay + 8]]), col, 1.3);
        } else {
          const cx = ax + (l.s || 1) * 0.5, cy = ay + 10.6;
          part(ctx, ell(cx, cy + 3.4, 6.4, 3.2), col, { sd: [0.6, 0.9], hi: false });
          part(ctx, ell(cx, cy, 5.6, 5.2), g.L.skin, { sd: [1.2, 1.6], hi: false });
          stroke(ctx, curve([[cx - 5.4, cy - 0.6], [cx, cy - 2.6], [cx + 5.4, cy - 0.6]]), col, 1.4);
          stroke(ctx, curve([[cx - 3.6, cy + 2.6], [cx - 2, cy - 0.8]]), col, 1.1);
          [-1.6, 1.6].forEach(dx => fill(ctx, ell(cx + dx * 1.8, cy + 3.6, 1.4, 1.1), ramp(g.L.skin).d, 0.7));
        }
      }));
    },
  });
})();
