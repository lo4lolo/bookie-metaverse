/* 직업 옷 2: 궁수(튜닉) · 복사(성직자 로브) · 상인(조끼) · 도적(복장) + 바지·치마 */
(function () {
  'use strict';
  const A = Avatar, U = A.U, Z = A.Z;
  const { PI, blob, curve, sym, poly, ell, rrect, capsule, part, stroke, fill, inside, ramp, mix, star } = U;
  const { K, FAR, shirtPath, sleeveCap, gloves, hemWave, neckV } = A.clothKit;

  /** 팔의 t0~t1 구간을 두르는 띠 (팔목 보호대·소매 끝) */
  function armBand(g, a, t0, t1, color, grow) {
    const p = g.armAt(a, t0), q = g.armAt(a, t1), gr = grow == null ? 0.9 : grow;
    return capsule(p[0], p[1], q[0], q[1], a.r0 + (a.r1 - a.r0) * t0 + gr, a.r0 + (a.r1 - a.r0) * t1 + gr);
  }
  function scallop(ctx, x0, x1, y, n, r, color) {
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) part(ctx, ell(x0 + w * (i + 0.5), y, w * 0.62, r), color, { sd: [0.6, 0.9], hi: false, lw: 0.8 });
  }

  // ---------------------------------------------------------------- 궁수 튜닉
  A.reg('top', 'tunic', {
    draw(g, tint) {
      const d = g.dir, R = ramp(tint), C = ramp(K.cream), Lr = ramp(K.leather);
      g.flags.skirtCovers = true;
      // 속옷 블라우스 소매 (통통)
      sleeveCap(g, K.cream, 0.4, { grow: 1.9 });
      // 팔목 보호대
      g.arms.forEach(a => g.z(a.far ? Z.ARMFAR + 0.2 : Z.SLEEVE + 0.2, ctx => {
        part(ctx, armBand(g, a, 0.62, 0.95, K.leather, 0.9), a.far ? FAR(K.leather) : K.leather, { sd: [1, 1.4], hi: false });
        if (!a.far) stroke(ctx, curve([[g.armAt(a, 0.7)[0] - 2, g.armAt(a, 0.7)[1]], [g.armAt(a, 0.7)[0] + 2, g.armAt(a, 0.7)[1]]]), Lr.d2, 0.8);
      }, 'b'));
      // 치마 (짧게 퍼지고 하얀 프릴)
      const skirt = d === 's'
        ? blob([[-9.4, 57], [9.6, 57], [13.8, 67], [15, 74, 1], [-15, 74, 1], [-13.4, 67]])
        : blob(sym([[0, 56.6], [11.8, 57], [16, 66], [18.4, 74.4, 1], [0, 75.4]]));
      g.z(Z.BOOTS + 1, ctx => {
        // 하얀 속치마 프릴
        if (d === 's') { scallop(ctx, -14, 14, 74.4, 5, 3.6, K.cream); }
        else scallop(ctx, -19, 19, 74.6, 7, 3.6, K.cream);
        part(ctx, skirt, R, { sd: [2.4, 3] });
        inside(ctx, skirt, () => {
          const xs = d === 's' ? [-7, 0, 7] : [-10, -5, 5, 10];
          xs.forEach(x => stroke(ctx, curve([[x * 0.5, 59], [x * 0.9, 66], [x * 1.15, 74]]), R.d, 0.9));
        });
      }, 'b');
      g.z(Z.TOP, ctx => {
        const body = shirtPath(g, 60, 0.2, 0);
        part(ctx, body, R, { sd: [2.4, 3.2] });
        if (d === 'f') {
          // 목선(크림 블라우스) + 가슴 끈
          const neck = blob(sym([[0, 35.6], [7, 36], [8.2, 40.4], [3.8, 44.4], [0, 46]]));
          part(ctx, neck, K.cream, { sd: [1, 1.4], hi: false });
          scallop(ctx, -8.4, 8.4, 36.8, 5, 2.2, K.cream);
          part(ctx, rrect(-4.6, 44.4, 9.2, 14.6, 1.4), K.leather, { sd: [1, 1.4], hi: false });
          for (let i = 0; i < 4; i++) { const y = 46 + i * 3.2; stroke(ctx, curve([[-3.4, y], [3.4, y + 2.4]]), K.cream, 0.8); stroke(ctx, curve([[3.4, y], [-3.4, y + 2.4]]), K.cream, 0.8); }
          // 잎사귀 브로치
          const leaf = blob([[-8.4, 47.6], [-5.6, 44.6], [-3.4, 47.2], [-6, 50.4]]);
          part(ctx, leaf, '#7EB05A', { sd: [0.6, 0.9], hi: false });
        } else if (d === 'b') {
          part(ctx, rrect(-4.6, 40, 9.2, 19, 1.4), K.leather, { sd: [1, 1.4], hi: false });
          for (let i = 0; i < 5; i++) { const y = 41.5 + i * 3.4; stroke(ctx, curve([[-3.4, y], [3.4, y + 2.4]]), K.cream, 0.8); stroke(ctx, curve([[3.4, y], [-3.4, y + 2.4]]), K.cream, 0.8); }
        } else {
          const neck = blob([[-2.6, 35.6], [5, 36.2], [6.8, 40.8], [2, 44.6]]);
          part(ctx, neck, K.cream, { sd: [1, 1.4], hi: false });
        }
      }, 'b');
      // 허리띠
      g.z(Z.BELT, ctx => {
        const w = d === 's' ? 9.8 : 12.6;
        part(ctx, rrect(-w, 54.6, w * 2, 3.6, 1.2), K.leather, { sd: [0.8, 1.2], hi: false });
        if (d === 'f') { part(ctx, rrect(-2.4, 54, 4.8, 4.8, 1), K.gold, { sd: [0.8, 1], hi: true }); part(ctx, rrect(7, 56, 5.4, 6.4, 1.4), K.leatherL, { sd: [0.8, 1.2], hi: false }); }
      }, 'b');
    },
  });

  // ---------------------------------------------------------------- 복사(성직자) 로브
  A.reg('top', 'holy', {
    draw(g, tint) {
      const d = g.dir, R = ramp(tint), Bl = ramp(K.blue || '#5B7DB5');
      const BLUE = '#5B7DB5', BLUED = '#3F5C93';
      g.flags.skirtCovers = true;
      // 긴 치마
      const skirt = d === 's'
        ? blob([[-9.6, 58], [9.8, 58], [14, 72], [16.4, 87, 1], [9, 89], [2, 87.4], [-6, 89], [-13, 87, 1], [-14.6, 74]])
        : blob(sym([[0, 57], [11.6, 57.6], [16.4, 70], [19.6, 87.6, 1], [12, 89.6], [6, 87.6], [0, 89.8]]));
      g.z(Z.BOOTS + 1, ctx => {
        part(ctx, skirt, R, { sd: [2.6, 3.2] });
        inside(ctx, skirt, () => {
          if (d === 'f') {
            // 파란 앞치마(덧치마) + 금 테두리
            const panel = poly([[-6.4, 56], [6.4, 56], [8.6, 92], [-8.6, 92]]);
            fill(ctx, panel, BLUE); fill(ctx, poly([[-6.4, 56], [-5.2, 56], [-7.4, 92], [-8.6, 92]]), '#7c9bd0');
            stroke(ctx, curve([[-6.4, 56], [-8.6, 92]]), K.gold, 1.1); stroke(ctx, curve([[6.4, 56], [8.6, 92]]), K.gold, 1.1);
            [-3, 3].forEach(x => stroke(ctx, curve([[x, 62], [x * 1.3, 90]]), BLUED, 0.8));
          } else {
            [-8, -3, 3, 8].forEach(x => stroke(ctx, curve([[x * 0.6, 60], [x * 1.1, 72], [x * 1.4, 88]]), R.d, 0.9));
          }
          fill(ctx, rrect(-24, 84.6, 48, 1.4, 0), K.gold);
        });
        stroke(ctx, skirt, R.o, 1);
      }, 'b');
      // 종 모양 소매 (하양 + 파란 안감)
      g.arms.forEach(a => {
        if (a.far) return;
        const s = a.s || 1, j = a.j, h = a.h;
        const bell = d === 's'
          ? blob([[j[0] - 3.8, j[1] - 1.5], [j[0] + 4.4, j[1] - 1.5], [h[0] + 8, h[1] + 3.6], [h[0] + 2, h[1] + 6.2], [h[0] - 6, h[1] + 4.6]])
          : blob([[j[0] - s * 3.6, j[1] - 1.4], [j[0] + s * 4.2, j[1] - 1.4], [h[0] + s * 6.4, h[1] + 3], [h[0] + s * 1.6, h[1] + 6.4], [h[0] - s * 4.6, h[1] + 4]]);
        g.z(Z.SLEEVE + 0.3, ctx => {
          part(ctx, bell, R, { sd: [2, 2.6] });
          inside(ctx, bell, () => { fill(ctx, rrect(-60, h[1] + 3.2, 120, 2.6, 0), BLUE); fill(ctx, rrect(-60, h[1] + 3, 120, 0.9, 0), K.gold); });
          stroke(ctx, bell, R.o, 1);
        }, 'b');
      });
      sleeveCap(g, tint, 0.34, { grow: 1.2 });
      g.z(Z.TOP, ctx => {
        part(ctx, shirtPath(g, 62, 0.2, 0), R, { sd: [2.4, 3.2] });
        if (d === 'f') {
          // 파란 깃(어깨 망토) + 금 십자
          const mantle = blob(sym([[0, 35.4], [9.6, 35.8], [14.2, 40], [13, 46.4], [5, 44.4], [0, 46]]));
          part(ctx, mantle, BLUE, { sd: [1.2, 1.6] });
          stroke(ctx, mantle, K.gold, 0.8);
          const cx = 0, cy = 52;
          fill(ctx, rrect(cx - 1.3, cy - 5.4, 2.6, 10.8, 0.6), K.gold); fill(ctx, rrect(cx - 4.2, cy - 2.6, 8.4, 2.6, 0.6), K.gold);
          stroke(ctx, rrect(cx - 1.3, cy - 5.4, 2.6, 10.8, 0.6), K.goldD, 0.5);
          part(ctx, rrect(-11.8, 57.6, 23.6, 3.6, 1.2), BLUE, { sd: [0.8, 1.2], hi: false });
        } else if (d === 'b') {
          const mantle = blob(sym([[0, 35.4], [9.6, 35.8], [14.2, 40], [13, 47.6], [0, 50]]));
          part(ctx, mantle, BLUE, { sd: [1.2, 1.6] }); stroke(ctx, mantle, K.gold, 0.8);
          part(ctx, rrect(-11.8, 57.6, 23.6, 3.6, 1.2), BLUE, { sd: [0.8, 1.2], hi: false });
        } else {
          const mantle = blob([[-6, 35.6], [5, 36], [9.4, 40.6], [8, 47], [-6.4, 45]]);
          part(ctx, mantle, BLUE, { sd: [1.2, 1.6] }); stroke(ctx, mantle, K.gold, 0.8);
          part(ctx, rrect(-9.6, 57.6, 19.2, 3.6, 1.2), BLUE, { sd: [0.8, 1.2], hi: false });
        }
      }, 'b');
    },
  });

  // ---------------------------------------------------------------- 상인 조끼
  A.reg('top', 'vest', {
    draw(g, tint) {
      const d = g.dir, R = ramp(tint), C = ramp(K.cream);
      sleeveCap(g, K.cream, 0.66, { cuff: K.cream, cuffLen: 0.0, grow: 1.5 });
      g.arms.forEach(a => g.z(a.far ? Z.ARMFAR + 0.2 : Z.SLEEVE + 0.2, ctx => {
        // 걷어 올린 소매 접힘 띠
        part(ctx, armBand(g, a, 0.5, 0.68, mix(K.cream, '#c9b79a', 0.35), 1.7), a.far ? FAR(K.cream) : mix(K.cream, '#d8c7aa', 0.4), { sd: [1, 1.4], hi: false });
      }, 'b'));
      g.z(Z.TOP, ctx => {
        // 속 셔츠
        part(ctx, shirtPath(g, 62, 0.3, 0), K.cream, { sd: [2.4, 3.2] });
        if (d === 'f') {
          // 빨간 목수건
          const kerch = poly([[-6.4, 36.4], [6.4, 36.4], [0, 43.6]]);
          part(ctx, kerch, '#C7473B', { sd: [0.8, 1.1], hi: false });
          // 조끼 양쪽
          [-1, 1].forEach(s => {
            const half = blob([[s * 2.2, 38.4], [s * 8.6, 36.6], [s * 12.6, 40], [s * 13.2, 50], [s * 12.6, 60], [s * 9, 62.6], [s * 2.2, 62]], 0.9);
            part(ctx, half, R, { sd: [2, 2.6] });
          });
          [45, 50.4, 55.8].forEach(y => { fill(ctx, ell(-0.1, y, 1.05, 1.05), K.gold); });
          // 가슴 주머니
          part(ctx, rrect(4.6, 49, 5.6, 5.4, 1.2), ramp(mix(tint, '#000', 0.18)), { sd: [0.6, 0.9], hi: false });
        } else if (d === 'b') {
          part(ctx, blob(sym([[0, 36.4], [8.6, 36.6], [12.8, 40], [13.4, 50], [12.6, 60], [9, 63], [0, 63.4]])), R, { sd: [2, 2.6] });
        } else {
          part(ctx, blob([[-3, 37], [5.8, 37.4], [9.6, 41], [10, 50], [9.4, 60], [6, 63], [-9, 62.6], [-9.8, 50], [-8, 41]]), R, { sd: [2, 2.6] });
          fill(ctx, ell(8.8, 47, 1, 1), K.gold);
        }
      }, 'b');
      // 허리띠·주머니
      g.z(Z.BELT, ctx => {
        const w = d === 's' ? 9.6 : 12.6;
        part(ctx, rrect(-w, 58.2, w * 2, 3.8, 1.2), K.leatherD || '#5E3B27', { sd: [0.8, 1.2], hi: false });
        if (d === 'f') {
          part(ctx, rrect(-2.6, 57.6, 5.2, 5, 1), K.gold, { sd: [0.8, 1] });
          part(ctx, rrect(-12.6, 59, 6.2, 7.4, 1.6), K.leatherL, { sd: [0.8, 1.2], hi: false });
          part(ctx, rrect(6.6, 59, 6.2, 7.4, 1.6), K.leatherL, { sd: [0.8, 1.2], hi: false });
          fill(ctx, ell(-9.5, 62.6, 0.8, 0.8), K.gold); fill(ctx, ell(9.7, 62.6, 0.8, 0.8), K.gold);
        }
      }, 'b');
      gloves(g, K.leather);
    },
  });

  // ---------------------------------------------------------------- 도적 복장
  A.reg('top', 'rogue', {
    draw(g, tint) {
      const d = g.dir, R = ramp(tint), SC = '#3E5A7E', Sc = ramp(SC);
      // 꼭 맞는 팔 토시
      g.arms.forEach(a => g.z(a.far ? Z.ARMFAR + 0.2 : Z.SLEEVE + 0.2, ctx => {
        part(ctx, armBand(g, a, 0.3, 0.98, '#3a2a3a', 0.35), a.far ? FAR('#3a2a3a') : '#3a2a3a', { sd: [1, 1.4], hi: false });
        part(ctx, armBand(g, a, 0.78, 0.9, K.leather, 0.9), a.far ? FAR(K.leather) : K.leather, { sd: [0.6, 0.9], hi: false });
      }, 'b'));
      sleeveCap(g, tint, 0.24, { grow: 1.0 });
      g.z(Z.TOP, ctx => {
        // 배꼽티 (가슴~허리 위)
        const crop = d === 's'
          ? blob([[-1.6, 36], [5.4, 36.4], [9.4, 40], [9.8, 46], [9, 52], [-9.4, 52], [-9.6, 46], [-8.8, 41]])
          : blob(sym([[0, 35.8], [6.6, 36.3], [11.8, 38.8], [12.9, 44], [12, 51.6], [0, 52.6]]));
        part(ctx, crop, R, { sd: [2.2, 3] });
        if (d === 'f') {
          neckV(ctx, g, 3.8, 4.4, R.o);
          // 가죽 가슴 끈
          stroke(ctx, curve([[-9.4, 39.4], [-2, 47], [0, 52]]), K.leather, 2.2);
          stroke(ctx, curve([[9.4, 39.4], [2, 47], [0, 52]]), K.leather, 2.2);
          fill(ctx, ell(0, 47.6, 1.5, 1.5), K.gold);
        }
        // 허리 붕대띠
        part(ctx, rrect(d === 's' ? -9.8 : -12.4, 57.4, d === 's' ? 19.6 : 24.8, 4.8, 1.4), '#3a2a3a', { sd: [0.8, 1.2], hi: false });
        if (d === 'f') { part(ctx, rrect(-3, 56.8, 6, 6, 1), K.gold, { sd: [0.8, 1] }); part(ctx, rrect(7, 58.6, 5.4, 6.6, 1.4), K.leatherL, { sd: [0.8, 1.2], hi: false }); }
      }, 'b');
      // 목도리 (밤색 남색) + 꼬리
      const sw = g.P.sway * 1.4;
      g.z(Z.HEAD - 0.5, ctx => {
        const wrap = d === 's' ? blob([[-6.4, 34.4], [5.8, 34.6], [7.8, 39.6], [-1, 41.6], [-7.8, 39.8]]) : blob(sym([[0, 34.4], [9.4, 34.8], [11.2, 39.6], [4, 42.8], [0, 43.2]]));
        part(ctx, wrap, SC, { sd: [1.4, 1.8] });
        stroke(ctx, curve(d === 's' ? [[-6, 37.4], [1, 39.6], [7, 37.4]] : [[-9.6, 37.6], [0, 41.4], [9.6, 37.6]]), Sc.d, 0.8);
      }, 'b');
      g.z(d === 'b' ? Z.BACKFRONT + 2 : Z.BACKITEM + 2, ctx => {
        if (d === 'f') {
          const tail = blob([[5.4, 38], [10.6, 40], [14.4 + sw, 50], [15.4 + sw, 60, 1], [10.4 + sw, 55], [7.6, 46]]);
          part(ctx, tail, SC, { sd: [1.2, 1.6] });
        } else if (d === 's') {
          const tail = blob([[-6, 38], [-11, 40], [-19 - sw * 2, 46], [-27 - sw * 3, 44, 1], [-22 - sw * 2, 52], [-13, 48], [-5, 44]]);
          part(ctx, tail, SC, { sd: [1.2, 1.6] });
        } else {
          const tail = blob([[-4, 38], [4, 38], [7 + sw, 52], [8 + sw, 66, 1], [1 + sw, 60], [-6, 50]]);
          part(ctx, tail, SC, { sd: [1.2, 1.6] });
        }
      }, 'b');
      gloves(g, '#3a2a3a');
    },
  });

  // ---------------------------------------------------------------- 하의: 치마 · 카고 · 레깅스
  A.reg('bottom', 'skirt', {
    draw(g, tint) {
      if (g.flags.skirtCovers) return;
      const d = g.dir, R = ramp(tint);
      const skirt = d === 's'
        ? blob([[-9.6, 57], [9.8, 57], [13.6, 66], [14.6, 72.4, 1], [-14.6, 72.4, 1], [-13.4, 66]])
        : blob(sym([[0, 56.6], [11.8, 57], [15.6, 66], [17.6, 72.6, 1], [0, 73.4]]));
      g.z(Z.BOOTS + 1, ctx => {
        part(ctx, skirt, R, { sd: [2.4, 3] });
        inside(ctx, skirt, () => {
          const xs = d === 's' ? [-6, 0, 6] : [-9, -4.5, 0, 4.5, 9];
          xs.forEach(x => stroke(ctx, curve([[x * 0.5, 59], [x * 0.95, 66], [x * 1.2, 73]]), R.d, 0.9));
        });
      }, 'b');
    },
  });
  A.reg('bottom', 'cargo', {
    draw(g, tint) {
      if (g.flags.skirtCovers) return;
      const R = ramp(tint);
      g.legs.forEach(l => g.z(Z.PANTS, ctx => {
        const c = l.far ? FAR(tint) : tint;
        const p = capsule(l.hip[0], l.hip[1] - 1, l.ank[0], l.ank[1] - 3, l.r0 + 1.9, l.r1 + 1.7);
        part(ctx, p, c, { sd: [1.8, 2.4], hi: false });
        if (g.dir !== 's' && !l.far) {
          // 옆 주머니
          const px = l.hip[0] + (l.s || 1) * 3.6;
          part(ctx, rrect(px - 3, 68, 6, 6.4, 1.2), ramp(mix(tint, '#000', 0.12)), { sd: [0.6, 0.9], hi: false });
          fill(ctx, ell(px, 70, 0.8, 0.8), K.gold);
        }
      }));
    },
  });
  A.reg('bottom', 'leggings', {
    draw(g, tint) {
      if (g.flags.skirtCovers) return;
      const R = ramp(tint);
      g.legs.forEach(l => g.z(Z.PANTS, ctx => {
        const p = capsule(l.hip[0], l.hip[1] - 1, l.ank[0], l.ank[1] - 1.5, l.r0 + 0.3, l.r1 + 0.2);
        part(ctx, p, l.far ? FAR(tint) : tint, { sd: [1.6, 2.2], hi: false });
      }));
      // 허리 아래 짧은 뒤 치마 자락
      g.z(Z.BOOTS + 1, ctx => {
        const d = g.dir;
        const flap = d === 's' ? blob([[-9.6, 58], [-2, 58], [-3, 70], [-9, 72], [-13, 68]]) : blob(sym([[0, 58], [11.2, 58.4], [13.6, 66], [10, 71, 1], [0, 66]]));
        part(ctx, flap, mix(tint, '#000', 0.1), { sd: [1.6, 2.2], hi: false });
      }, 'b');
    },
  });
})();
