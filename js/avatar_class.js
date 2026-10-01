/* 직업 옷 6벌: 검사(갑옷) · 마법사(로브) · 궁수(튜닉) · 복사(성직자 로브) · 상인(조끼) · 도적(복장)
 * 각 벌은 상의 + (필요하면) 치마 + 소매 + 작은 장식으로 이루어진다.
 * 색을 바꿀 수 있는 부분은 tint(= 학생이 고른 옷 색), 금장·가죽·쇠 같은 고정색은 아래 K 표.
 */
(function () {
  'use strict';
  const A = Avatar, U = A.U, Z = A.Z;
  const { PI, blob, curve, sym, poly, ell, rrect, capsule, part, stroke, fill, inside, ramp, mix, star, rot, mv } = U;

  const K = {
    gold: '#DDB24E', goldD: '#B58A2E', leather: '#8A5A3A', leatherD: '#5E3B27', leatherL: '#B27B4E',
    steel: '#B9C0CB', steelD: '#8E97A6', cream: '#F3EAD6', white: '#FBF7EE', navy: '#3E4E7A', blue: '#5B7DB5', dark: '#3A2A2A',
  };
  const FAR = c => mix(c, '#5a4a52', 0.16);

  // ---------------------------------------------------------------- 공용
  function shirtPath(g, hem, flare, wide) {
    flare = flare || 0; wide = wide || 0;
    if (g.dir === 's') {
      return blob([[-1.6, 36], [5.4, 36.4], [9.4 + wide, 40], [9.8 + wide, 47], [9.2 + wide, 55], [9.2 + flare, hem - 1], [9.8 + flare, hem + 0.4], [-9.8 - flare, hem + 0.4], [-9.6 - flare, hem - 2], [-10 - wide, 50], [-8.8 - wide, 41]]);
    }
    return blob(sym([[0, 35.8], [6.6, 36.3], [11.8 + wide, 38.8], [13.1 + wide, 45], [12.4 + wide, 53], [12.2 + wide + flare * 0.5, hem - 3], [12.8 + wide + flare, hem + 0.2], [0, hem + 0.9]]));
  }
  function sleeveCap(g, color, t, o) {
    o = o || {};
    g.arms.forEach(a => {
      const gr = o.grow == null ? 1.0 : o.grow;
      const path = g.sleevePath(a, t, gr);
      g.z(a.far ? Z.ARMFAR + 0.1 : Z.SLEEVE, ctx => {
        part(ctx, path, a.far ? FAR(color) : color, { sd: [1.8, 2.4], hi: false });
        if (o.cuff) {
          const p = g.armAt(a, t), q = g.armAt(a, Math.max(0, t - o.cuffLen));
          const cp = capsule(q[0], q[1], p[0], p[1], a.r0 + (a.r1 - a.r0) * (t - o.cuffLen) + gr + 0.4, a.r0 + (a.r1 - a.r0) * t + gr + 0.4);
          part(ctx, cp, a.far ? FAR(o.cuff) : o.cuff, { sd: [1, 1.4], hi: false });
        }
      }, 'b');
    });
  }
  /** 장갑 (손 위에 덮음) */
  function gloves(g, color) {
    g.arms.forEach(a => g.z(a.far ? Z.ARMFAR + 0.3 : Z.HAND + 0.2, ctx => {
      part(ctx, ell(a.h[0], a.h[1] + 1.2, 3.9, 3.9), a.far ? FAR(color) : color, { sd: [1.2, 1.6], hi: false });
      fill(ctx, ell(a.h[0] - 0.4, a.h[1] + 0.2, 1.4, 1), '#ffffff', 0.18);
    }, 'b'));
  }
  function hemWave(ctx, x0, x1, y, n, amp, col, w) {
    const pts = []; for (let i = 0; i <= n; i++) pts.push([x0 + (x1 - x0) * i / n, y + (i % 2 ? amp : 0)]);
    stroke(ctx, curve(pts), col, w || 0.9);
  }
  function neckV(ctx, g, half, depth, col) {
    const v = poly([[-half, 35.6], [half, 35.6], [0, 35.6 + depth]]);
    fill(ctx, v, g.L.skin); stroke(ctx, curve([[-half, 35.8], [0, 35.8 + depth], [half, 35.8]]), col, 1.1);
  }

  A.clothKit = { K, FAR, shirtPath, sleeveCap, gloves, hemWave, neckV };

  // ---------------------------------------------------------------- 검사 갑옷
  A.reg('top', 'armor', {
    draw(g, tint) {
      const R = ramp(tint), d = g.dir, L = ramp(K.leather), St = ramp(K.steel), Gd = ramp(K.gold);
      const body = shirtPath(g, 62, 0.5, 0.2);
      sleeveCap(g, tint, 0.62, { cuff: K.leatherL, cuffLen: 0.13, grow: 1.1 });
      g.z(Z.TOP, ctx => {
        part(ctx, body, R, { sd: [2.4, 3.2] });
        if (d === 'f') {
          neckV(ctx, g, 4.6, 5.4, R.o);
          // 가죽 어깨끈 + 가슴 끈
          [-1, 1].forEach(s => {
            const strap = poly([[s * 3.6, 36.6], [s * 7.4, 36.9], [s * 6.4, 58.6], [s * 3, 58.6]]);
            part(ctx, strap, K.leather, { sd: [1, 1.4], hi: false });
          });
          part(ctx, rrect(-7.4, 45.6, 14.8, 2.8, 1), K.leather, { sd: [0.8, 1.2], hi: false });
          fill(ctx, rrect(-1.3, 45.2, 2.6, 3.6, 0.8), K.gold);
          // 끈 묶음 (가슴 라이트)
          for (let i = 0; i < 3; i++) stroke(ctx, curve([[-2.4, 38 + i * 1.6], [0, 39 + i * 1.6], [2.4, 38 + i * 1.6]]), L.o, 0.7);
        } else if (d === 'b') {
          [-1, 1].forEach(s => part(ctx, poly([[s * 3.6, 36.6], [s * 7.4, 36.9], [s * 6.4, 58.6], [s * 3, 58.6]]), K.leather, { sd: [1, 1.4], hi: false }));
          part(ctx, rrect(-7.4, 46, 14.8, 2.8, 1), K.leather, { sd: [0.8, 1.2], hi: false });
        } else {
          part(ctx, poly([[0.6, 36.6], [4.4, 37], [3.6, 58.6], [-0.6, 58.6]]), K.leather, { sd: [1, 1.4], hi: false });
        }
      }, 'b');
      // 허리띠 + 주머니
      g.z(Z.BELT, ctx => {
        if (d === 's') {
          part(ctx, rrect(-9.9, 57.6, 19.8, 5.2, 1.4), K.leather, { sd: [1, 1.4], hi: false });
          part(ctx, rrect(1.6, 58.6, 6, 8, 1.6), K.leatherL, { sd: [1, 1.4], hi: false });   // 옆 주머니
        } else {
          part(ctx, rrect(-12.6, 57.4, 25.2, 5.4, 1.4), K.leather, { sd: [1, 1.4], hi: false });
          if (d === 'f') {
            part(ctx, rrect(-2.8, 56.8, 5.6, 6.6, 1.2), K.gold, { sd: [1, 1.2], hi: true });
            fill(ctx, rrect(-1.2, 58.6, 2.4, 3, 0.6), K.goldD);
            part(ctx, rrect(6.2, 58.4, 6, 7.6, 1.6), K.leatherL, { sd: [1, 1.4], hi: false });
            fill(ctx, ell(9.2, 61.6, 0.9, 0.9), K.gold);
          }
        }
      }, 'b');
      // 어깨 보호대 (화면 왼쪽 = 캐릭터의 오른쪽)
      const pauld = (sx) => {
        const cx = sx * 15.4, cy = 41.4;
        const p = blob([[cx - sx * 8.4, cy - 4.4], [cx - sx * 1.6, cy - 6.2], [cx + sx * 3.8, cy - 3], [cx + sx * 5.2, cy + 4.6], [cx + sx * 2, cy + 9.6], [cx - sx * 4.4, cy + 8.4], [cx - sx * 8.6, cy + 3.4]]);
        return p;
      };
      if (d !== 's') {
        const sx = d === 'f' ? -1 : 1;
        g.z(Z.SLEEVE + 0.5, ctx => {
          const p = pauld(sx);
          part(ctx, p, K.steel, { sd: [2, 2.6] });
          inside(ctx, p, () => {
            stroke(ctx, curve([[sx * 7.6, 37.6], [sx * 12.4, 40], [sx * 15, 46]]), St.d, 1);
            fill(ctx, ell(sx * 10.4, 38.8, 1.2, 1.2), K.gold);
            fill(ctx, ell(sx * 16.4, 47, 1.2, 1.2), K.gold);
          });
          // 팔 둘레 가죽 띠
          part(ctx, rrect(sx * 15.4 - 3.9, 50.6, 7.8, 3.2, 1.4), K.leather, { sd: [0.8, 1.2], hi: false });
        }, 'b');
      } else {
        g.z(Z.SLEEVE + 0.5, ctx => {
          const p = blob([[-6, 37.4], [1.4, 35.6], [7.4, 39], [8.4, 46.4], [4.4, 50.8], [-3, 50], [-7.6, 44]]);
          part(ctx, p, K.steel, { sd: [2, 2.6] });
          inside(ctx, p, () => { stroke(ctx, curve([[-4, 38], [1, 41], [4, 48]]), St.d, 1); fill(ctx, ell(-3.2, 41.2, 1.1, 1.1), K.gold); });
        }, 'b');
      }
      gloves(g, K.leather);
    },
  });

  // ---------------------------------------------------------------- 마법사 로브
  A.reg('top', 'robe', {
    draw(g, tint) {
      const R = ramp(tint), d = g.dir, Gd = ramp(K.gold);
      g.flags.skirtCovers = true;
      const body = shirtPath(g, 64, 0.2, 0);
      // 치마 (A자로 퍼짐)
      const skirt = d === 's'
        ? blob([[-9.6, 58], [9.8, 58], [14.2, 70], [16.2, 78, 1], [10, 80.2], [3, 78.6], [-5, 80.4], [-12, 78.4], [-15, 77, 1], [-13, 68]])
        : blob(sym([[0, 57], [11.6, 57.6], [16.6, 68], [19.8, 77.8, 1], [14.4, 80.4], [7.4, 78.4], [0, 80.6]]));
      g.z(Z.BOOTS + 1, ctx => {
        part(ctx, skirt, R, { sd: [2.6, 3.2] });
        inside(ctx, skirt, () => {
          if (d === 'f') {
            [-8.4, -4.2, 4.2, 8.4].forEach(x => stroke(ctx, curve([[x * 0.55, 60], [x * 1.1, 70], [x * 1.4, 80]]), R.d, 0.9));
          } else if (d === 'b') {
            [-6, 0, 6].forEach(x => stroke(ctx, curve([[x * 0.6, 60], [x * 1.1, 70], [x * 1.4, 80]]), R.d, 0.9));
          } else {
            [-6, 0, 6].forEach(x => stroke(ctx, curve([[x * 0.8, 60], [x * 1.2, 70], [x * 1.5, 80]]), R.d, 0.9));
          }
          fill(ctx, rrect(-24, 76.6, 48, 6, 0), K.gold);
          fill(ctx, rrect(-24, 76.2, 48, 1, 0), K.goldD);
        });
        stroke(ctx, skirt, R.o, 1);
        if (d !== 's') for (let i = -2; i <= 2; i++) fill(ctx, poly([[i * 6.6 - 1.2, 76.6], [i * 6.6, 79.4], [i * 6.6 + 1.2, 76.6]]), K.goldD, 0.5);
      }, 'b');
      sleeveCap(g, tint, 0.36, { grow: 1.2 });
      // 넓은 종 모양 소매
      g.arms.forEach(a => {
        if (a.far) return;
        const s = a.s || 1, j = a.j, h = a.h;
        const bell = d === 's'
          ? blob([[j[0] - 3.8, j[1] - 1.5], [j[0] + 4.4, j[1] - 1.5], [h[0] + 8.6, h[1] + 3.6], [h[0] + 2, h[1] + 6.4], [h[0] - 6.4, h[1] + 4.6]])
          : blob([[j[0] - s * 3.6, j[1] - 1.4], [j[0] + s * 4.2, j[1] - 1.4], [h[0] + s * 6.6, h[1] + 3.2], [h[0] + s * 1.6, h[1] + 6.6], [h[0] - s * 4.8, h[1] + 4.2]]);
        g.z(Z.SLEEVE + 0.3, ctx => {
          part(ctx, bell, R, { sd: [2, 2.6] });
          inside(ctx, bell, () => {
            // 금 테두리 띠
            fill(ctx, rrect(-60, h[1] + 3, 120, 2.2, 0), K.gold);
          });
          stroke(ctx, bell, R.o, 1);
        }, 'b');
      });
      if (d === 's') {
        const a = g.arms[0]; // 먼 팔 소매도 살짝
      }
      g.z(Z.TOP, ctx => {
        part(ctx, body, R, { sd: [2.4, 3.2] });
        if (d === 'f') {
          // 앞트임 금 띠 + 깃
          fill(ctx, rrect(-1.5, 38.5, 3, 26, 0), K.gold);
          stroke(ctx, curve([[-1.5, 38.5], [-1.5, 64]]), K.goldD, 0.7); stroke(ctx, curve([[1.5, 38.5], [1.5, 64]]), K.goldD, 0.7);
          const collar = blob(sym([[0, 35.4], [7.4, 35.8], [8, 40.4], [0, 42.4]]));
          part(ctx, collar, K.gold, { sd: [1, 1.4] });
          fill(ctx, star(0, 48.4, 2.6, 1.1, 5), K.gold); stroke(ctx, star(0, 48.4, 2.6, 1.1, 5), K.goldD, 0.6);
          // 허리 띠
          part(ctx, rrect(-11.8, 55.4, 23.6, 4.4, 1.2), ramp(mix(tint, '#3a1a1a', 0.35)), { sd: [1, 1.4], hi: false });
          fill(ctx, ell(0, 57.6, 2.6, 2.6), K.gold); stroke(ctx, ell(0, 57.6, 2.6, 2.6), K.goldD, 0.7);
        } else if (d === 'b') {
          const collar = blob(sym([[0, 35.4], [7.4, 35.8], [8, 40.2], [0, 41.4]]));
          part(ctx, collar, K.gold, { sd: [1, 1.4] });
          part(ctx, rrect(-11.8, 55.4, 23.6, 4.4, 1.2), ramp(mix(tint, '#3a1a1a', 0.35)), { sd: [1, 1.4], hi: false });
          fill(ctx, rrect(-2.6, 55.6, 5.2, 8.6, 1), K.gold);
        } else {
          part(ctx, blob([[-3.6, 35.4], [3.6, 36], [4.6, 40.4], [-3.6, 41.6]]), K.gold, { sd: [1, 1.4] });
          part(ctx, rrect(-9.6, 55.4, 19.2, 4.4, 1.2), ramp(mix(tint, '#3a1a1a', 0.35)), { sd: [1, 1.4], hi: false });
          fill(ctx, ell(4, 57.6, 2.4, 2.4), K.gold);
        }
      }, 'b');
    },
  });
})();
