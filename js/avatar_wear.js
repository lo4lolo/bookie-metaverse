/* 옷(상의·하의)과 신발.
 * 상의는 g.torso 모양을 따라 그리고, 소매는 g.arms 를 덮는다.
 * 하의는 다리(g.legs) 위에, 신발은 발목(l.ank) 위치에 그린다.
 */
(function () {
  'use strict';
  const A = Avatar, U = A.U, Z = A.Z;
  const { PI, blob, curve, sym, poly, ell, rrect, capsule, part, stroke, fill, inside, ramp, mix, rad } = U;

  // ---------------------------------------------------------------- 공용 조각
  /** 상의 몸통 모양 (hem: 밑단 y, flare: 밑단이 퍼지는 정도) */
  function shirtPath(g, hem, flare, wide) {
    flare = flare || 0; wide = wide || 0;
    if (g.dir === 's') {
      return blob([[-1.6, 36], [5.4, 36.4], [9.2 + wide, 40], [9.6 + wide, 47], [9 + wide, 55], [9 + flare, hem - 1], [9.6 + flare, hem + 0.4], [-9.6 - flare, hem + 0.4], [-9.4 - flare, hem - 2], [-9.8 - wide, 50], [-8.6 - wide, 41]]);
    }
    return blob(sym([[0, 35.8], [6.6, 36.3], [11.6 + wide, 38.8], [12.9 + wide, 45], [12.2 + wide, 53], [12 + wide + flare * 0.5, hem - 3], [12.6 + wide + flare, hem + 0.2], [0, hem + 0.9]]));
  }
  /** 소매: t = 팔의 얼마까지 덮는가(0~1), wide = 소매 통이 넓은 정도 */
  function sleeves(g, color, t, o) {
    o = o || {};
    g.arms.forEach(a => {
      const path = g.sleevePath(a, t, o.grow == null ? 1.0 : o.grow);
      const zz = a.far ? Z.ARMFAR + 0.1 : Z.SLEEVE;
      g.z(zz, ctx => {
        part(ctx, path, a.far ? mix(color, '#5a4a52', 0.14) : color, { sd: [1.8, 2.4], hi: false });
        if (o.cuff) {
          const p = g.armAt(a, t), q = g.armAt(a, Math.max(0, t - 0.09));
          const cp = capsule(q[0], q[1], p[0], p[1], a.r0 + (a.r1 - a.r0) * (t - 0.09) + (o.grow == null ? 1.0 : o.grow) + 0.35, a.r0 + (a.r1 - a.r0) * t + (o.grow == null ? 1.0 : o.grow) + 0.35);
          part(ctx, cp, o.cuff, { sd: [1, 1.4], hi: false });
        }
      }, 'b');
    });
  }
  /** 목 둘레 (앞모습에서 목이 드러나는 구멍) */
  function neckHole(ctx, g, rx, ry, cy, col) {
    const p = ell(0, cy, rx, ry);
    fill(ctx, p, g.L.skin);
    stroke(ctx, new Path2D((() => { const q = new Path2D(); q.ellipse(0, cy, rx, ry, 0, 0, PI); return q; })()), ramp(g.L.skin).o, 0.9);
    if (col) stroke(ctx, (() => { const q = new Path2D(); q.ellipse(0, cy, rx + 0.4, ry + 0.4, 0, 0, PI); return q; })(), col, 1.5);
  }

  A.reg('top', 'none', { draw() { } });

  // ---------------------------------------------------------------- 티셔츠
  A.reg('top', 'tee', {
    draw(g, tint) {
      const R = ramp(tint), d = g.dir;
      const body = shirtPath(g, 63, 0.4);
      sleeves(g, tint, 0.46, { cuff: null });
      g.z(Z.TOP, ctx => {
        part(ctx, body, R, { sd: [2.4, 3.2] });
        if (d === 'f') {
          const hole = (() => { const q = new Path2D(); q.ellipse(0, 37.4, 5.2, 2.8, 0, 0, PI); q.closePath(); return q; })();
          fill(ctx, hole, g.L.skin); stroke(ctx, hole, ramp(g.L.skin).o, 0.9);
          stroke(ctx, (() => { const q = new Path2D(); q.ellipse(0, 37.4, 5.7, 3.2, 0, 0.05, PI - 0.05); return q; })(), R.d2, 1.4);
        } else if (d === 'b') {
          stroke(ctx, (() => { const q = new Path2D(); q.ellipse(0, 36.6, 5.2, 1.8, 0, 0.1, PI - 0.1); return q; })(), R.d2, 1.3);
        }
        stroke(ctx, curve([[-12.2, 61.6], [0, 62.8], [12.2, 61.6]]), R.d, 0.9);
      }, 'b');
    },
  });

  // ---------------------------------------------------------------- 하의
  A.reg('bottom', 'none', { draw() { } });
  A.reg('bottom', 'pants', {
    draw(g, tint) {
      if (g.flags.skirtCovers) return;
      const R = ramp(tint);
      g.legs.forEach(l => g.z(Z.PANTS, ctx => {
        const p = capsule(l.hip[0], l.hip[1] - 1, l.ank[0], l.ank[1] - 1.5, l.r0 + 0.7, l.r1 + 0.6);
        part(ctx, p, l.far ? mix(tint, '#5a4a52', 0.16) : R, { sd: [1.8, 2.4], hi: false });
      }));
    },
  });
  A.reg('bottom', 'shorts', {
    draw(g, tint) {
      if (g.flags.skirtCovers) return;
      const R = ramp(tint);
      g.legs.forEach(l => g.z(Z.PANTS, ctx => {
        const p = capsule(l.hip[0], l.hip[1] - 1, l.ank[0], l.hip[1] + 8 + l.lift * 0.4, l.r0 + 0.8, l.r0 + 1.3);
        part(ctx, p, l.far ? mix(tint, '#5a4a52', 0.16) : R, { sd: [1.8, 2.4], hi: false });
      }));
    },
  });

  // ---------------------------------------------------------------- 신발
  A.reg('shoes', 'none', { draw() { } });
  function sideBoot(ax, ay) {
    return blob([[ax - 5.4, ay - 8], [ax + 4.8, ay - 8], [ax + 5.2, ay + 2.6], [ax + 9.8, ay + 6.8], [ax + 12.4, ay + 11.4], [ax + 11.4, ay + 16, 1], [ax - 6, ay + 16, 1], [ax - 6.4, ay + 8]], 1);
  }
  function sideShoe(ax, ay) {
    return blob([[ax - 5, ay + 1.4], [ax + 4, ay + 1], [ax + 5.4, ay + 5], [ax + 10.6, ay + 8.4], [ax + 12.4, ay + 12], [ax + 11.4, ay + 16, 1], [ax - 6, ay + 16, 1], [ax - 6.2, ay + 9]], 1);
  }
  function footFront(l) {
    const [ax, ay] = l.ank, s = l.s || 1;
    return { ax, ay, cx: ax + s * 0.5, cy: ay + 10.4 };
  }
  A.reg('shoes', 'sneakers', {
    draw(g, tint) {
      const R = ramp(tint), W = ramp('#F3EBDD');
      g.legs.forEach(l => g.z(Z.BOOTS, ctx => {
        if (g.dir === 's') {
          const [ax, ay] = l.ank;
          const shoe = sideShoe(ax, ay);
          part(ctx, shoe, l.far ? mix(tint, '#5a4a52', 0.16) : R, { sd: [1.8, 2.4] });
          inside(ctx, shoe, () => { fill(ctx, rrect(ax - 8, ay + 13.2, 26, 4, 1), '#F3EBDD'); fill(ctx, ell(ax + 9.4, ay + 9.4, 3, 2.4), '#F3EBDD', 0.9); });
          stroke(ctx, curve([[ax - 6, ay + 13.2], [ax + 12, ay + 13.2]]), '#b8a996', 0.8);
        } else {
          const f = footFront(l);
          const shoe = ell(f.cx, f.cy, 6.6, 5.6);
          part(ctx, shoe, l.far ? R : R, { sd: [1.8, 2.4] });
          inside(ctx, shoe, () => {
            fill(ctx, rrect(f.cx - 8, f.cy + 2.8, 16, 4, 1), '#F3EBDD');
            fill(ctx, ell(f.cx, f.cy - 1.6, 3.4, 2.2), '#F3EBDD', 0.85);
          });
          stroke(ctx, curve([[f.cx - 6, f.cy + 2.9], [f.cx + 6, f.cy + 2.9]]), '#b8a996', 0.8);
        }
      }));
    },
  });
  A.reg('shoes', 'boots', {
    draw(g, tint) {
      const R = ramp(tint), T = ramp(mix(tint, '#e8c9a0', 0.32)), S = ramp('#4a3128');
      g.legs.forEach(l => g.z(Z.BOOTS, ctx => {
        const [ax, ay] = l.ank, far = l.far;
        const col = far ? mix(tint, '#5a4a52', 0.16) : tint;
        if (g.dir === 's') {
          const boot = sideBoot(ax, ay);
          part(ctx, boot, col, { sd: [1.8, 2.6] });
          inside(ctx, boot, () => { fill(ctx, rrect(ax - 8, ay + 13, 26, 4, 1), S.b); });
          part(ctx, rrect(ax - 6.2, ay - 9, 11.8, 4.6, 1.8), mix(col, '#e8c9a0', 0.3), { sd: [1, 1.4], hi: false });
        } else {
          const f = footFront(l);
          const shaft = rrect(ax - 5.4, ay - 8.2, 10.8, 13, 3);
          const foot = ell(f.cx, f.cy, 6.9, 5.7);
          part(ctx, foot, col, { sd: [1.8, 2.6] });
          inside(ctx, foot, () => fill(ctx, rrect(f.cx - 8, f.cy + 2.6, 16, 4, 1), S.b));
          part(ctx, shaft, col, { sd: [1.8, 2.6] });
          part(ctx, rrect(ax - 6, ay - 9.2, 12, 4.8, 1.9), mix(col, '#e8c9a0', 0.3), { sd: [1, 1.4], hi: false });
          fill(ctx, ell(ax + (l.s || 1) * 0.5, ay + 0.6, 1.4, 1.4), '#d8b04f'); // 작은 단추
        }
      }));
    },
  });

  // ---------------------------------------------------------------- 통 넓은 바지 (검사)
  A.reg('bottom', 'bloomers', {
    draw(g, tint) {
      if (g.flags.skirtCovers) return;
      const R = ramp(tint), Bn = ramp(mix(tint, '#2a1912', 0.35));
      g.legs.forEach(l => g.z(Z.PANTS, ctx => {
        const far = l.far;
        const c = far ? mix(tint, '#5a4a52', 0.16) : tint;
        if (g.dir === 's') {
          const p = blob([[l.hip[0] - 6.6, 61], [l.hip[0] + 6.6, 61], [l.ank[0] + 9.6, 70], [l.ank[0] + 7.4, 79.6], [l.ank[0] + 4, 82.2], [l.ank[0] - 4.4, 82.2], [l.ank[0] - 8, 79.4], [l.ank[0] - 8.6, 70]]);
          part(ctx, p, c, { sd: [2, 2.6], hi: false });
          inside(ctx, p, () => stroke(ctx, curve([[l.ank[0] - 2, 63], [l.ank[0] + 1, 72], [l.ank[0] - 1, 80]]), R.d, 0.9));
          part(ctx, rrect(l.ank[0] - 5.4, 79.6, 10.8, 3.2, 1.2), K_.leatherD, { sd: [0.6, 0.9], hi: false });
        } else {
          const s = l.s, x = l.ank[0];
          const p = blob([[s * 0.4, 61], [s * 12.6, 61], [s * 14.4, 71], [x + s * 6.6, 79.6], [x + s * 3.4, 82.4], [x - s * 4.4, 82.4], [s * 0.6, 76], [s * -1.2, 68]]);
          part(ctx, p, c, { sd: [2, 2.6], hi: false });
          inside(ctx, p, () => stroke(ctx, curve([[s * 8, 63], [s * 9.6, 72], [s * 7.6, 80]]), R.d, 0.9));
          part(ctx, rrect(x - 5.6, 79.6, 11.2, 3.2, 1.2), K_.leatherD, { sd: [0.6, 0.9], hi: false });
        }
      }));
    },
  });
  const K_ = { leatherD: '#5E3B27' };

  // ---------------------------------------------------------------- 긴 장화 (허벅지 위까지)
  A.reg('shoes', 'thigh', {
    draw(g, tint) {
      const R = ramp(tint), S = ramp('#3a2a2a');
      g.legs.forEach(l => g.z(Z.BOOTS, ctx => {
        const [ax, ay] = l.ank, far = l.far;
        const col = far ? mix(tint, '#5a4a52', 0.16) : tint;
        if (g.dir === 's') {
          const boot = blob([[ax - 5.4, ay - 22], [ax + 5, ay - 22], [ax + 5.2, ay + 2.6], [ax + 9.8, ay + 6.8], [ax + 12.4, ay + 11.4], [ax + 11.4, ay + 16, 1], [ax - 6, ay + 16, 1], [ax - 6.4, ay + 8]], 0.8);
          part(ctx, boot, col, { sd: [1.8, 2.6] });
          inside(ctx, boot, () => fill(ctx, rrect(ax - 8, ay + 13, 26, 4, 1), S.b));
          part(ctx, rrect(ax - 6.4, ay - 24, 12.2, 4.4, 1.8), mix(col, '#e8c9a0', 0.26), { sd: [1, 1.4], hi: false });
        } else {
          const cx = ax + (l.s || 1) * 0.5, cy = ay + 10.4;
          const foot = ell(cx, cy, 6.9, 5.7);
          part(ctx, foot, col, { sd: [1.8, 2.6] });
          inside(ctx, foot, () => fill(ctx, rrect(cx - 8, cy + 2.6, 16, 4, 1), S.b));
          const shaft = rrect(ax - 5.6, ay - 22, 11.2, 27, 3);
          part(ctx, shaft, col, { sd: [1.8, 2.6] });
          part(ctx, rrect(ax - 6.2, ay - 23.4, 12.4, 4.6, 1.9), mix(col, '#e8c9a0', 0.26), { sd: [1, 1.4], hi: false });
          for (let i = 0; i < 3; i++) fill(ctx, ell(ax + (l.s || 1) * 0.4, ay - 12 + i * 4.4, 0.9, 0.9), K_.gold || '#DDB24E');
        }
      }));
    },
  });
})();
