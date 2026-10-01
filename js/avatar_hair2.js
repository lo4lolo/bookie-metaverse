/* 머리카락 2: 포니테일 · 양갈래 · 똥머리 · 곱슬 머리 (avatar_hair.js 의 도구를 이어 쓴다) */
(function () {
  'use strict';
  const A = Avatar, U = A.U, Z = A.Z;
  const { PI, rad, blob, curve, sym, poly, ell, part, stroke, fill, inside, ramp, mix } = U;
  const { tuft, paintTufts, foreheadShadow, mass, CAP_F, CAP_B, CAP_S, SHINE_F, HIDE_F, HIDE_S } = A.hairKit;

  function frontTufts(d) {
    if (d === 'f') return [tuft(-13.4, 9, 8.6, 13.6, -1.4), tuft(-6.8, 9, 8.8, 15, 0.5), tuft(-0.4, 9, 8.4, 13, 0), tuft(6.2, 9, 8.8, 15, -0.2), tuft(13, 9, 8.6, 13.6, 1.2)];
    return [tuft(5, 9.5, 8.2, 12.6, 2.2), tuft(10.8, 9, 8.6, 13, 3.2), tuft(15.6, 8.6, 7, 11.2, 3.4)];
  }
  const TIE = '#E4574F';
  function tie(ctx, x, y, rx, ry, rotDeg) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rad(rotDeg || 0));
    part(ctx, ell(0, 0, rx, ry), TIE, { sd: [0.8, 1.1], hi: false });
    ctx.restore();
  }
  /** 정수리·앞머리 공통 (extra 는 그 위에 얹는 장식) */
  function crownFront(g, R, d, extra) {
    const tufts = frontTufts(d);
    g.z(Z.HAIRFRONT - 1, ctx => foreheadShadow(ctx, g, tufts.map(t => t.fill)), 'h');
    g.z(Z.HAIRFRONT, ctx => {
      if (d === 'f') mass(ctx, CAP_F, R, { hide: HIDE_F, shine: SHINE_F, strands: [[[-4, 0], [-9, 6], [-14, 12]], [[9, 0.6], [13, 6], [16, 12]]] });
      else if (d === 's') mass(ctx, CAP_S, R, { hide: HIDE_S, shine: [-2, 21, 16.5, 19.4, 1.16, 1.86], strands: [[[-6, -1], [-13, 6], [-18, 16]], [[0, -2], [-4, 6], [-6, 14]]] });
      else mass(ctx, CAP_B, R, { shine: [0, 21.5, 15.6, 19.6, 1.12, 1.88], strands: [[[-7, 4], [-10, 16], [-11, 30]], [[0, 2], [0, 16], [0, 34]], [[7, 4], [10, 16], [11, 30]]] });
      if (d !== 'b') {
        paintTufts(ctx, tufts, R);
        if (d === 's') { const lock = tuft(-1.4, 12, 7.2, 19, 0.6); part(ctx, lock.fill, R, { line: false, hi: false, sd: [1.7, 2.4] }); stroke(ctx, lock.line, R.o, 1); }
      }
      if (extra) extra(ctx);
    }, 'h');
  }

  // ---------------------------------------------------------------- 포니테일
  A.reg('hair', 'pony', {
    top: -3,
    draw(g, tint) {
      const R = ramp(tint), Rb = ramp(mix(tint, '#2a1912', 0.1)), d = g.dir;
      if (d === 'f') {
        const tail = blob([[8, 0], [17, -4], [26.6, 3], [29.4, 17], [28, 33], [25.6, 47], [22, 58, 1], [20.4, 46], [21.4, 32], [19.4, 20], [12, 9]]);
        g.z(Z.HAIRBACK, ctx => mass(ctx, tail, Rb, { strands: [[[20, 4], [25, 24], [23, 50]], [[14, 4], [20, 20], [18, 40]]] }), 'h');
        crownFront(g, R, d, ctx => tie(ctx, 15.4, 3, 3.6, 2.4, 40));
      } else if (d === 's') {
        const tail = blob([[-10, 1], [-20, -4], [-30, 6], [-32, 22], [-30, 40], [-26, 56, 1], [-23, 44], [-23.6, 28], [-17, 14], [-9, 9]]);
        g.z(Z.HAIRBACK, ctx => mass(ctx, tail, Rb, { strands: [[[-22, 2], [-28, 24], [-26, 50]], [[-16, 6], [-22, 20], [-22, 40]]] }), 'h');
        crownFront(g, R, d, ctx => tie(ctx, -13, 0.6, 2.4, 3.6, 20));
      } else {
        const tail = blob(sym([[0, 0], [7.6, 4], [10, 20], [11.4, 40], [7, 60, 1], [0, 63]]));
        crownFront(g, R, d);
        g.z(Z.HAIRFRONT + 1, ctx => { mass(ctx, tail, Rb, { strands: [[[-5, 6], [-7, 30], [-5, 56]], [[3, 6], [5, 30], [3, 56]]] }); tie(ctx, 0, 5, 7.4, 2.6, 0); }, 'h');
      }
    },
  });

  // ---------------------------------------------------------------- 양갈래
  A.reg('hair', 'twin', {
    draw(g, tint) {
      const R = ramp(tint), Rb = ramp(mix(tint, '#2a1912', 0.1)), d = g.dir;
      const tailR = blob([[16, 9], [23.4, 9.4], [28, 22], [29.4, 38], [27, 54], [22, 62, 1], [21.4, 48], [22.4, 34], [19.6, 22]]);
      const tailL = blob([[-16, 9], [-23.4, 9.4], [-28, 22], [-29.4, 38], [-27, 54], [-22, 62, 1], [-21.4, 48], [-22.4, 34], [-19.6, 22]]);
      if (d === 'f') {
        g.z(Z.HAIRBACK, ctx => { mass(ctx, tailR, Rb, { strands: [[[22, 12], [26, 34], [23, 56]]] }); mass(ctx, tailL, Rb, { strands: [[[-22, 12], [-26, 34], [-23, 56]]] }); }, 'h');
        crownFront(g, R, d, ctx => { tie(ctx, 19.6, 10, 3.4, 4.2, -10); tie(ctx, -19.6, 10, 3.4, 4.2, 10); });
      } else if (d === 's') {
        const tail = blob([[-12, 8], [-20, 10], [-26, 22], [-28, 38], [-25, 54], [-20, 62, 1], [-19, 48], [-19.6, 34], [-15, 22]]);
        g.z(Z.HAIRBACK, ctx => mass(ctx, tail, Rb, { strands: [[[-20, 12], [-24, 34], [-21, 56]]] }), 'h');
        crownFront(g, R, d, ctx => tie(ctx, -14, 10, 2.8, 4, 12));
      } else {
        crownFront(g, R, d);
        g.z(Z.HAIRFRONT + 1, ctx => {
          mass(ctx, tailR, R, { strands: [[[22, 12], [26, 34], [23, 56]]] }); mass(ctx, tailL, R, { strands: [[[-22, 12], [-26, 34], [-23, 56]]] });
          tie(ctx, 19.6, 10, 3.4, 4.2, -10); tie(ctx, -19.6, 10, 3.4, 4.2, 10);
        }, 'h');
      }
    },
  });

  // ---------------------------------------------------------------- 똥머리
  A.reg('hair', 'bun', {
    top: -17,
    draw(g, tint) {
      const R = ramp(tint), d = g.dir, covered = g.flags.hat && g.flags.hat.covers;
      const bx = d === 's' ? -6 : 0, by = -8;
      crownFront(g, R, d, ctx => {
        if (covered) return;
        const b = ell(bx, by, 9.4, 8.2);
        part(ctx, b, R, { sd: [2.2, 2.8], hd: [1.4, 1.6] });
        inside(ctx, b, () => {
          stroke(ctx, curve([[bx - 6, by + 2], [bx, by - 6], [bx + 6, by + 2]]), R.d, 0.9);
          stroke(ctx, curve([[bx - 4, by + 5], [bx, by - 1], [bx + 4, by + 5]]), R.d, 0.9);
        });
        tie(ctx, bx, by + 7.2, 8, 2.2, 0);
      });
    },
  });

  // ---------------------------------------------------------------- 곱슬 머리
  A.reg('hair', 'curly', {
    top: -7,
    draw(g, tint) {
      const R = ramp(tint), d = g.dir;
      const lobes = d === 's'
        ? [[-19, 24, 6.8], [-21, 12, 7.6], [-15, 2, 8], [-6, -3, 8.6], [4, -2, 8.2], [12, 2, 7]]
        : [[-20, 25, 6.4], [-21.4, 13, 7.6], [-15, 2.6, 8.2], [-5, -3, 8.6], [5, -3, 8.6], [15, 2.6, 8.2], [21.4, 13, 7.6], [20, 25, 6.4]];
      const capF = d === 'b' ? CAP_B : d === 's' ? CAP_S : CAP_F;
      const bangs = d === 'b' ? [] : (d === 'f' ? [[-12.4, 13.4, 4.8], [-6.2, 15.6, 4.6], [0, 14.6, 4.8], [6.2, 15.8, 4.6], [12.4, 13.6, 4.8]] : [[6, 14.4, 4.6], [11.6, 14, 4.8], [16, 12.6, 4.2]]);
      g.z(Z.HAIRFRONT, ctx => {
        lobes.forEach(l => part(ctx, ell(l[0], l[1], l[2], l[2] * 0.96), R, { sd: [1.8, 2.4], hd: [1, 1.2] }));
        mass(ctx, capF, R, { hide: d === 'f' ? HIDE_F : d === 's' ? HIDE_S : null, shine: [0, 21.5, 15.6, 19.6, 1.12, 1.88] });
        bangs.forEach(t => part(ctx, ell(t[0], t[1], t[2], t[2] * 0.9), R, { sd: [1.5, 2], hd: [0.9, 1] }));
        if (d === 'b') [[-8, 22], [0, 28], [8, 22], [-14, 30], [14, 30]].forEach(l => part(ctx, ell(l[0], l[1], 5.4, 5), R, { sd: [1.6, 2.2], hd: [0.9, 1] }));
        if (d === 's') part(ctx, ell(-1.4, 25, 3.8, 6), R, { sd: [1.4, 2], hd: [0.8, 1] });
      }, 'h');
    },
  });
})();
