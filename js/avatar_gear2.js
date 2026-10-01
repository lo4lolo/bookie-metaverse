/* 직업 장비: 궁수 모자 · 고글 · 슬라임 친구 · 활 · 십자가 지팡이 · 단검 · 화살통 · 배낭 · 날개 */
(function () {
  'use strict';
  const A = Avatar, U = A.U, Z = A.Z;
  const { PI, rad, blob, curve, sym, poly, ell, rrect, capsule, part, stroke, fill, inside, ramp, mix, star } = U;
  const hold = A.holdItem;
  const K = {
    gold: '#DDB24E', goldD: '#B58A2E', leather: '#8A5A3A', leatherD: '#5E3B27', leatherL: '#B27B4E', steel: '#C4CBD6', wood: '#8A5A3A',
    cream: '#F3EAD6', red: '#C7473B', brass: '#C9A24A',
  };

  // ================================================================ 머리
  // ---------------------------------------------------------------- 궁수 모자 (깃털 달린 초록 모자)
  A.reg('head', 'archer', {
    top: -28,
    draw(g, tint) {
      g.flags.hat = { covers: true };
      const d = g.dir, R = ramp(tint), sh = d === 's' ? -1.4 : 0;
      g.z(Z.HAT, ctx => {
        ctx.translate(sh, 0);
        const flip = d === 's' ? 1 : 1;
        // 챙: 오른쪽이 위로 말려 올라감
        const brim = d === 'b'
          ? blob([[-21, 9], [-10, 5], [0, 5.4], [12, 4.6], [24, -1.4, 1], [24.4, 6.4], [14, 13.6], [0, 15.4], [-14, 13.8], [-22.4, 12, 1]])
          : blob([[-21.4, 10.2], [-12, 7], [0, 8.4], [12, 6.6], [24.6, 0.6, 1], [25.4, 8], [14, 15.4], [0, 16.8], [-14, 15.6], [-22.6, 13.4, 1]]);
        part(ctx, brim, mix(tint, '#1c3a1c', 0.12), { sd: [2, 2.6] });
        const dome = blob([[-16.8, 10, 1], [-16.6, -1.6], [-9, -9.6], [2, -12.4], [12.4, -9.4], [17.6, -1.4], [18, 9, 1], [9, 13], [0, 14], [-9, 13]]);
        part(ctx, dome, R, { sd: [3, 3.4], hd: [1.4, 1.8] });
        inside(ctx, dome, () => {
          stroke(ctx, curve([[-8, -8], [-6, 0], [-5, 8]]), R.d, 0.9);
          fill(ctx, poly([[-20, 5.4], [20, 5.4], [20, 12], [-20, 12]]), K.leather);
          fill(ctx, poly([[-20, 5.4], [20, 5.4], [20, 6.6], [-20, 6.6]]), K.leatherL);
        });
        stroke(ctx, dome, R.o, 1);
        // 깃털
        const fx = d === 'b' ? -1 : 1;
        ctx.save();
        ctx.translate(fx * 13.4, 0);
        if (d === 's') ctx.translate(-16, 0);
        const rot = d === 's' ? -18 : d === 'b' ? -14 : 14;
        ctx.rotate(rad(rot));
        const feather = blob([[0, 2, 1], [5.2, -8], [7.4, -20], [4.6, -30, 1], [-2.6, -21], [-3.6, -9]], 1);
        part(ctx, feather, '#D9584A', { sd: [1.6, 2], hi: false });
        inside(ctx, feather, () => { stroke(ctx, curve([[0, 2], [2.6, -12], [4.6, -30]]), '#f8e4d0', 0.9); fill(ctx, poly([[-10, -25], [12, -25], [12, -40], [-10, -40]]), '#FBF3E6', 0.85); });
        stroke(ctx, feather, ramp('#D9584A').o, 0.9);
        ctx.restore();
      });
    },
  });

  // ---------------------------------------------------------------- 고글
  A.reg('head', 'goggles', {
    draw(g, tint) {
      const d = g.dir, R = ramp(tint);
      g.z(Z.HAT, ctx => {
        // 가죽 띠
        const strap = d === 's' ? rrect(-19.4, 5.2, 36.8, 4.6, 2) : rrect(-19.8, 5.2, 39.6, 4.6, 2);
        part(ctx, strap, R, { sd: [1, 1.4], hi: false });
        const lens = (x, y, r) => {
          part(ctx, ell(x, y, r + 1.6, r + 1.6), K.brass, { sd: [1.4, 1.8] });
          const glass = ell(x, y, r, r);
          fill(ctx, glass, '#6FBAD2');
          inside(ctx, glass, () => { fill(ctx, ell(x + 1.2, y + 1.6, r, r), '#4E96B4', 0.8); fill(ctx, ell(x - 1.6, y - 1.8, 1.7, 1.2), '#ffffff', 0.85); });
          stroke(ctx, glass, '#3d7f9a', 0.7);
        };
        if (d === 'f') { fill(ctx, rrect(-3, 6.4, 6, 2.4, 1), K.brass); lens(-9.2, 7.8, 5.2); lens(9.2, 7.8, 5.2); }
        else if (d === 's') { lens(7.6, 7.8, 5.2); }
        else { part(ctx, rrect(-2.6, 4.6, 5.2, 6, 1.4), K.brass, { sd: [0.8, 1], hi: false }); }
      }, 'h');
    },
  });

  // ---------------------------------------------------------------- 슬라임 친구
  A.reg('head', 'slime', {
    top: -19,
    draw(g, tint) {
      const d = g.dir, sq = 1 - g.P.bob * 0.03, P = ramp('#F4A3B8');
      g.z(Z.HAT, ctx => {
        ctx.translate(d === 's' ? -2 : 0, 4);
        ctx.scale(1 / sq, sq);
        const body = blob(sym([[0, -18], [7, -16], [13, -9], [15.4, -1], [14, 5.4, 1], [0, 7]]), 1);
        part(ctx, body, '#F4A3B8', { sd: [2.6, 3], hd: [1.6, 2] });
        fill(ctx, ell(-5.4, -10, 3, 1.8), '#ffffff', 0.55);
        if (d !== 'b') {
          const ex = d === 's' ? 3 : 0;
          [-1, 1].forEach(s => { fill(ctx, ell(s * 5.4 + ex, -3.4, 1.7, 2.3), '#3a2530'); fill(ctx, ell(s * 5.4 + ex - 0.5, -4.2, 0.7, 0.7), '#fff'); });
          stroke(ctx, curve([[-1.6 + ex, 0.4], [0 + ex, 1.6], [1.6 + ex, 0.4]]), '#8a3a4a', 0.9);
          fill(ctx, ell(-9.4 + ex, 0.4, 2, 1.1), '#f0627e', 0.5); fill(ctx, ell(9.4 + ex, 0.4, 2, 1.1), '#f0627e', 0.5);
        }
      }, 'h');
    },
  });

  // ================================================================ 손
  // ---------------------------------------------------------------- 활
  A.reg('hand', 'bow', {
    draw(g) {
      hold(g, 4, ctx => {
        const limb = blob([[3, -31, 1], [9.6, -16], [11.4, 0], [9.6, 16], [3, 31, 1], [6.4, 15.6], [8, 0], [6.4, -15.6]], 0.9);
        part(ctx, limb, K.wood, { sd: [1, 1.4], hd: [0.8, 1] });
        stroke(ctx, curve([[3, -31], [3, 31]]), '#f2eadb', 0.7);
        part(ctx, rrect(6.2, -4.4, 5.6, 8.8, 1.6), K.leatherL, { sd: [0.8, 1], hi: false });
        [[3, -31], [3, 31]].forEach(p => fill(ctx, ell(p[0], p[1], 1.5, 1.5), K.gold));
      }, { armSide: 62, sideAngle: 2, sideDx: 3 });
    },
  });

  // ---------------------------------------------------------------- 십자가 지팡이
  A.reg('hand', 'cross', {
    top: -34,
    draw(g) {
      hold(g, 3, ctx => {
        part(ctx, capsule(0, 21, 0, -28, 1.9, 1.7), '#F1EBDD', { sd: [1, 1.2], hi: false });
        [-6, 8, 18].forEach(y => fill(ctx, rrect(-2.4, y, 4.8, 1.7, 0.6), K.gold));
        const cross = poly([[-2.2, -22], [2.2, -22], [2.2, -30], [6.6, -30], [6.6, -34.4], [2.2, -34.4], [2.2, -43], [-2.2, -43], [-2.2, -34.4], [-6.6, -34.4], [-6.6, -30], [-2.2, -30]]);
        part(ctx, cross, K.gold, { sd: [1.4, 1.8], hd: [1, 1.2] });
        const ring = ell(0, -32.2, 3.4, 3.4);
        part(ctx, ring, '#F3EAD6', { sd: [1, 1.2], hd: [0.8, 1] });
        fill(ctx, ell(0, -32.2, 1.5, 1.5), '#6CA6D8');
        fill(ctx, ell(-0.5, -32.8, 0.5, 0.5), '#fff');
      }, { armSide: 64, sideAngle: 3, sideDx: 3 });
    },
  });

  // ---------------------------------------------------------------- 단검
  A.reg('hand', 'dagger', {
    draw(g) {
      hold(g, 12, ctx => {
        part(ctx, rrect(-1.3, -2, 2.6, 8, 1), K.leatherD, { sd: [0.6, 0.9], hi: false });
        fill(ctx, ell(0, 6.6, 2, 2), '#9C3B5A'); stroke(ctx, ell(0, 6.6, 2, 2), K.gold, 0.7);
        const blade = blob([[-3, -3.6, 1], [3, -3.6, 1], [2.6, -16], [0, -25, 1], [-2.6, -16]], 0.5);
        part(ctx, blade, K.steel, { sd: [1.2, 1.6], hd: [0.8, 1] });
        inside(ctx, blade, () => stroke(ctx, curve([[0, -5], [0, -20]]), ramp(K.steel).d, 0.8));
        part(ctx, blob([[-5.4, -4.4], [5.4, -4.4], [6, -2.2], [-6, -2.2]], 0.5), K.gold, { sd: [0.8, 1.2] });
      }, { armSide: 40, sideAngle: 14, sideDx: 2 });
    },
  });

  // ================================================================ 등
  // ---------------------------------------------------------------- 화살통
  A.reg('back', 'quiver', {
    draw(g, tint) {
      const d = g.dir, R = ramp(tint);
      const arrows = (ctx) => {
        [[-3, '#D9584A'], [1.4, '#FBF3E6'], [5.8, '#D9584A']].forEach(([x, c], i) => {
          stroke(ctx, curve([[x, -6], [x + 0.6, -2]]), '#6a4a34', 1.1);
          const fe = blob([[x - 2.4, -12, 1], [x + 2.4, -12, 1], [x + 1.6, -3.6], [x - 1.6, -3.6]], 0.6);
          part(ctx, fe, c, { sd: [0.6, 0.9], hi: false, lw: 0.7 });
        });
      };
      if (d === 's') {
        g.z(Z.BACKITEM, ctx => {
          ctx.translate(-9, 50); ctx.rotate(rad(-26));
          arrows(ctx);
          part(ctx, blob([[-5.6, -3, 1], [5.6, -3, 1], [4.6, 26], [-4.6, 26]], 0.6), tint, { sd: [1.6, 2], hd: [0.8, 1] });
          part(ctx, rrect(-6, 0, 12, 3, 1), K.gold, { sd: [0.6, 0.8], hi: false }); part(ctx, rrect(-5.2, 20, 10.4, 3, 1), K.leatherD, { sd: [0.6, 0.8], hi: false });
        }, 'b');
      } else if (d === 'f') {
        g.z(Z.BACKITEM, ctx => {
          ctx.translate(-14, 52); ctx.rotate(rad(-24));
          arrows(ctx);
          part(ctx, blob([[-5.6, -3, 1], [5.6, -3, 1], [4.6, 26], [-4.6, 26]], 0.6), tint, { sd: [1.6, 2], hd: [0.8, 1] });
          part(ctx, rrect(-6, 0, 12, 3, 1), K.gold, { sd: [0.6, 0.8], hi: false });
        }, 'b');
        // 가슴을 가로지르는 끈
        g.z(Z.SLEEVE + 0.8, ctx => {
          const strap = poly([[-11.6, 38.4], [-8.4, 37.2], [11.2, 58], [8, 60.4]]);
          part(ctx, strap, K.leather, { sd: [0.8, 1.2], hi: false });
          fill(ctx, ell(0, 48.6, 1.3, 1.3), K.gold);
        }, 'b');
      } else {
        g.z(Z.BACKFRONT, ctx => {
          ctx.translate(-4, 52); ctx.rotate(rad(-24));
          arrows(ctx);
          part(ctx, blob([[-6.4, -3, 1], [6.4, -3, 1], [5.4, 27], [-5.4, 27]], 0.6), tint, { sd: [1.6, 2], hd: [0.8, 1] });
          part(ctx, rrect(-7, 0, 14, 3, 1), K.gold, { sd: [0.6, 0.8], hi: false }); part(ctx, rrect(-6, 21, 12, 3, 1), K.leatherD, { sd: [0.6, 0.8], hi: false });
        }, 'b');
        g.z(Z.BACKFRONT + 0.5, ctx => {
          const strap = poly([[11.6, 38.4], [8.4, 37.2], [-11.2, 58], [-8, 60.4]]);
          part(ctx, strap, K.leather, { sd: [0.8, 1.2], hi: false });
        }, 'b');
      }
    },
  });

  // ---------------------------------------------------------------- 배낭 (큰 짐가방)
  A.reg('back', 'backpack', {
    draw(g, tint) {
      const d = g.dir, R = ramp(tint), Dk = ramp(mix(tint, '#2a1912', 0.25));
      if (d === 'f') {
        g.z(Z.BACKITEM, ctx => {
          const roll = rrect(-19, 27.6, 38, 9, 4.4);
          part(ctx, roll, '#7C8B6A', { sd: [1.6, 2], hd: [1, 1.2] });
          stroke(ctx, curve([[-13, 28], [-13, 36]]), '#5c6a4c', 0.9); stroke(ctx, curve([[13, 28], [13, 36]]), '#5c6a4c', 0.9);
          const bag = blob(sym([[0, 33], [17, 33.4], [23, 44], [23.6, 62], [19, 74, 1], [0, 76]]), 0.9);
          part(ctx, bag, R, { sd: [2.6, 3.2] });
          [-1, 1].forEach(s => part(ctx, rrect(s * 20.4 - 4.4, 52, 8.8, 15, 3), Dk, { sd: [1, 1.4], hi: false }));
        }, 'b');
        // 어깨끈
        g.z(Z.SLEEVE + 0.8, ctx => {
          [-1, 1].forEach(s => {
            part(ctx, poly([[s * 4.6, 36.8], [s * 9.8, 37.6], [s * 12.6, 56], [s * 9, 57]]), K.leather, { sd: [0.8, 1.2], hi: false });
          });
          part(ctx, rrect(-9.4, 46, 18.8, 2.6, 1), K.leatherD, { sd: [0.6, 0.8], hi: false });
          fill(ctx, rrect(-1.4, 45.6, 2.8, 3.4, 0.6), K.gold);
        }, 'b');
      } else if (d === 's') {
        g.z(Z.BACKITEM, ctx => {
          part(ctx, rrect(-25, 29, 12, 8.6, 4), '#7C8B6A', { sd: [1.4, 1.8], hd: [1, 1.2] });
          const bag = blob([[-10.5, 34], [-20, 34], [-27, 44], [-27.6, 60], [-24, 72, 1], [-10, 74, 1]], 0.9);
          part(ctx, bag, R, { sd: [2.6, 3.2] });
          part(ctx, rrect(-28.4, 52, 7.8, 14, 3), Dk, { sd: [1, 1.4], hi: false });
        }, 'b');
        g.z(Z.SLEEVE + 0.8, ctx => {
          part(ctx, poly([[-1, 37], [3.6, 37.6], [4.4, 56], [0.4, 57]]), K.leather, { sd: [0.8, 1.2], hi: false });
        }, 'b');
      } else {
        g.z(Z.BACKFRONT, ctx => {
          const roll = rrect(-19, 34, 38, 9, 4.4);
          part(ctx, roll, '#7C8B6A', { sd: [1.6, 2], hd: [1, 1.2] });
          stroke(ctx, curve([[-13, 34.4], [-13, 42.4]]), '#5c6a4c', 0.9); stroke(ctx, curve([[13, 34.4], [13, 42.4]]), '#5c6a4c', 0.9);
          const bag = blob(sym([[0, 39], [17, 39.4], [23, 50], [23.6, 66], [19, 79, 1], [0, 81]]), 0.9);
          part(ctx, bag, R, { sd: [2.6, 3.2] });
          [-1, 1].forEach(s => part(ctx, rrect(s * 20.4 - 4.4, 56, 8.8, 15, 3), Dk, { sd: [1, 1.4], hi: false }));
          const flap = blob(sym([[0, 41], [15, 41.4], [15.4, 58], [0, 63]]), 0.7);
          part(ctx, flap, Dk, { sd: [1.6, 2], hi: false });
          fill(ctx, rrect(-2.4, 58.6, 4.8, 5.4, 1), K.gold);
          fill(ctx, ell(-9, 55, 1.2, 1.2), K.gold); fill(ctx, ell(9, 55, 1.2, 1.2), K.gold);
        }, 'b');
      }
    },
  });

  // ---------------------------------------------------------------- 날개
  A.reg('back', 'wings', {
    draw(g, tint) {
      const d = g.dir, R = ramp(tint), fl = 1 + g.P.bob * 0.06;
      const wing = (s) => blob([[s * 8, 42], [s * 20, 30 * fl + 4 * (1 - fl)], [s * 33, 22 * fl], [s * 40, 26 * fl, 1], [s * 36, 36 * fl], [s * 40, 44 * fl, 1], [s * 32, 50], [s * 34, 58, 1], [s * 24, 58], [s * 16, 54], [s * 9, 52]], 1);
      const paint = (ctx, s) => {
        const w = wing(s);
        part(ctx, w, tint, { sd: [2, 2.6], hd: [1.2, 1.6] });
        inside(ctx, w, () => {
          [[s * 18, 34, s * 34, 30], [s * 16, 42, s * 36, 40], [s * 14, 49, s * 30, 52]].forEach(l => stroke(ctx, curve([[s * 8, 44], [(l[0] + l[2]) / 2, (l[1] + l[3]) / 2 - 2], [l[2], l[3]]]), R.d, 0.8));
          fill(ctx, ell(s * 22, 38, 8, 3.4), '#ffffff', 0.25);
        });
        stroke(ctx, w, R.o, 1);
      };
      if (d === 's') {
        g.z(Z.BACKITEM, ctx => { ctx.translate(-4, 0); ctx.rotate(rad(-14)); paint(ctx, -1); }, 'b');
      } else if (d === 'f') {
        g.z(Z.BACKITEM, ctx => { paint(ctx, -1); paint(ctx, 1); }, 'b');
      } else {
        g.z(Z.BACKFRONT, ctx => { paint(ctx, -1); paint(ctx, 1); }, 'b');
      }
    },
  });
})();
