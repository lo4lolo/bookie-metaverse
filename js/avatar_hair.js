/* 머리카락 — 앞(f)·옆(s, 오른쪽을 본다)·뒤(b) 세 방향.
 * 머리카락은 두 층: 뒤쪽(몸 뒤로 늘어지는 부분)은 HAIRBACK, 앞쪽(정수리·앞머리·옆머리)은 HAIRFRONT.
 * 앞머리는 뾰족한 "가닥(tuft)"을 겹쳐서 만든다. 모자가 정수리를 덮으면 g.flags.hat.covers 가 켜진다.
 */
(function () {
  'use strict';
  const A = Avatar, U = A.U, Z = A.Z;
  const { PI, blob, curve, sym, poly, ell, part, stroke, fill, inside, ramp, mix, rad } = U;

  /** 뾰족한 머리 가닥: 위(y0)에서 시작해 아래(y0+len)로 갈수록 뾰족. lean = 끝이 기우는 정도 */
  function tuft(x, y0, w, len, lean, bulge) {
    bulge = bulge == null ? 1 : bulge;
    const tip = [x + lean, y0 + len, 1];
    const open = curve([[x - w / 2, y0], [x - w * 0.5 * bulge + lean * 0.3, y0 + len * 0.52], tip, [x + w * 0.5 * bulge + lean * 0.5, y0 + len * 0.5], [x + w / 2, y0]]);
    const closed = new Path2D(open);
    closed.closePath();
    return { fill: closed, line: open };
  }
  function paintTufts(ctx, list, R, tint) {
    list.forEach(t => {
      part(ctx, t.fill, R, { line: false, hi: false, sd: [1.7, 2.4] });
      stroke(ctx, t.line, R.o, 1);
    });
  }
  /** 이마에 드리우는 앞머리 그림자 */
  function foreheadShadow(ctx, g, paths) {
    inside(ctx, g.head, () => paths.forEach(p => {
      ctx.save(); ctx.translate(0.6, 2.6); fill(ctx, p, '#7a4438', 0.24); ctx.restore();
    }));
  }
  /** 머리카락 한 덩어리: 색 + 결 + 반짝 띠 */
  function mass(ctx, path, R, o) {
    o = o || {};
    part(ctx, path, R, { sd: o.sd || [2.6, 3.4], hd: o.hd || [1.3, 1.6], line: false });
    ctx.save();
    if (o.hide) { const c = new Path2D(); c.rect(-400, -400, 900, 900); c.rect(o.hide[0], o.hide[1], o.hide[2] - o.hide[0], o.hide[3] - o.hide[1]); ctx.clip(c, 'evenodd'); }
    stroke(ctx, path, R.o, 1);
    ctx.restore();
    inside(ctx, path, () => {
      (o.strands || []).forEach(s => stroke(ctx, curve(s), R.d, 0.85));
      if (o.shine) {
        ctx.save();
        ctx.globalAlpha = 0.5; ctx.strokeStyle = R.h; ctx.lineWidth = o.shineW || 2.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.ellipse(o.shine[0], o.shine[1], o.shine[2], o.shine[3], 0, PI * (o.shine[4] || 1.14), PI * (o.shine[5] || 1.86)); ctx.stroke();
        ctx.restore();
      }
    });
  }
  const SHINE_F = [0, 21.5, 15.6, 19.6];
  const HIDE_F = [-13.2, 12, 13.2, 32], HIDE_S = [1, 11, 18, 32];

  // ---------------------------------------------------------------- 공통 머리 덮개
  const CAP_F = blob(sym([[0, -1.6], [9.4, -0.6], [16.6, 5.2], [20.2, 14.8], [20.6, 24.5], [19.4, 31.5, 1], [16.6, 29.6], [16.3, 21.6], [13.6, 15.6], [7, 13.2], [0, 13.8]]));
  const CAP_B = blob(sym([[0, -1.8], [10, -0.8], [17.4, 5.6], [21, 16], [21, 28], [18.6, 37.4], [11, 40], [0, 40.6]]));
  const CAP_S = blob([[15.8, 13.2], [14.6, 6.2], [8.6, -0.4], [0, -2.6], [-9.4, -1.6], [-16.8, 4.4], [-21, 13.6], [-21.8, 24], [-20, 33.2, 1], [-13.4, 32], [-9, 26.6], [-4.4, 20.6], [2, 15.6], [9, 13.4]]);

  A.reg('hair', 'none', { draw() { } });
  A.hairKit = { tuft, paintTufts, foreheadShadow, mass, CAP_F, CAP_B, CAP_S, SHINE_F, HIDE_F, HIDE_S };

  // ---------------------------------------------------------------- 짧은 머리
  A.reg('hair', 'short', {
    draw(g, tint) {
      const R = ramp(tint), d = g.dir;
      if (d === 'f') {
        const tufts = [tuft(-13.6, 9, 8, 14.5, -1.5), tuft(-7.4, 9, 9, 15.5, 0.4), tuft(-0.4, 9, 9.5, 14.2, -0.8), tuft(6.4, 9, 9.4, 15.4, 1.2), tuft(13, 9, 8.2, 14.6, 1.8)];
        g.z(Z.HAIRFRONT - 1, ctx => foreheadShadow(ctx, g, tufts.map(t => t.fill)), 'h');
        g.z(Z.HAIRFRONT, ctx => {
          mass(ctx, CAP_F, R, { hide: HIDE_F, shine: SHINE_F, strands: [[[-4, 0], [-9, 6], [-14, 12]], [[3, -0.6], [-1, 6], [-3, 11]], [[9, 0.6], [13, 6], [16, 12]]] });
          paintTufts(ctx, tufts, R);
        }, 'h');
      } else if (d === 's') {
        const tufts = [tuft(5.4, 9.5, 8, 12.5, 2), tuft(11, 9, 8.4, 12.6, 3.2), tuft(15.6, 8.6, 7, 11, 3.4)];
        g.z(Z.HAIRFRONT - 1, ctx => foreheadShadow(ctx, g, tufts.map(t => t.fill)), 'h');
        g.z(Z.HAIRFRONT, ctx => {
          mass(ctx, CAP_S, R, { hide: HIDE_S, shine: [-2, 21, 16.5, 19.4, 1.16, 1.86], strands: [[[-6, -1], [-13, 6], [-18, 16]], [[0, -2], [-4, 6], [-6, 14]]] });
          paintTufts(ctx, tufts, R);
          // 귀 앞 옆머리
          const lock = tuft(-1.4, 12, 7.2, 19, 0.6);
          part(ctx, lock.fill, R, { line: false, hi: false, sd: [1.7, 2.4] }); stroke(ctx, lock.line, R.o, 1);
        }, 'h');
      } else {
        g.z(Z.HAIRFRONT, ctx => mass(ctx, CAP_B, R, { shine: [0, 21.5, 15.6, 19.6, 1.12, 1.88], strands: [[[-7, 4], [-10, 16], [-11, 30]], [[0, 2], [0, 16], [0, 34]], [[7, 4], [10, 16], [11, 30]]] }), 'h');
      }
    },
  });

  // ---------------------------------------------------------------- 삐죽 머리
  A.reg('hair', 'spiky', {
    top: -12,
    draw(g, tint) {
      const R = ramp(tint), d = g.dir, covered = g.flags.hat && g.flags.hat.covers;
      // 목표 그림체: 가시를 짧고 부드럽게 (끝을 밑변 쪽으로 45% 당김)
      const soft = (b0, b1, tip) => { const mx = (b0[0] + b1[0]) / 2, my = (b0[1] + b1[1]) / 2; return [mx + (tip[0] - mx) * 0.55, my + (tip[1] - my) * 0.55]; };
      const spike = (b0, b1, tip0) => { const tip = soft(b0, b1, tip0); return blob([b0, [(b0[0] + b1[0]) / 2 + (tip[0] - (b0[0] + b1[0]) / 2) * 0.15, (b0[1] + b1[1]) / 2 + (tip[1] - (b0[1] + b1[1]) / 2) * 0.5], [tip[0], tip[1], 1], b1], 1); };
      const tame = pts => { const base = pts.filter(p => !p[2]); const mx = base.reduce((a, p) => a + p[0], 0) / base.length, my = base.reduce((a, p) => a + p[1], 0) / base.length; return blob(pts.map(p => (p[2] ? [mx + (p[0] - mx) * 0.55, my + (p[1] - my) * 0.55, 1] : p))); };
      if (d === 'f') {
        const tufts = [tuft(-13.6, 8, 8.6, 16, -3.2), tuft(-7, 8, 9.6, 17.4, -0.6), tuft(-0.6, 8, 8.4, 15, 1.4), tuft(5.6, 8, 9.6, 17.8, 1), tuft(12.4, 8, 9, 16, 3.6)];
        const spikes = covered ? [] : [
          spike([-9, 0.4], [-1, -1.2], [-6.4, -11.4]), spike([-2, -1.2], [7, -0.4], [3.4, -12.6]), spike([5.6, -0.6], [14.4, 3.8], [14.6, -8.6]),
          spike([-16.8, 5.2], [-9, 0.2], [-16.8, -5.4]), spike([13, 3.4], [20.4, 12], [24.2, 2.2]), spike([-20.4, 13.4], [-16.8, 4.4], [-23.6, 1.6]),
        ];
        g.z(Z.HAIRFRONT - 1, ctx => foreheadShadow(ctx, g, tufts.map(t => t.fill)), 'h');
        g.z(Z.HAIRFRONT, ctx => {
          spikes.forEach(s => part(ctx, s, R, { sd: [1.6, 2.4], hd: [0.8, 1.2] }));
          mass(ctx, CAP_F, R, { hide: HIDE_F, shine: SHINE_F, strands: [[[-4, 0], [-9, 6], [-14, 12]], [[3, -0.6], [1, 6], [-1, 11]], [[9, 0.6], [13, 6], [16, 12]]] });
          paintTufts(ctx, tufts, R);
        }, 'h');
      } else if (d === 's') {
        const tufts = [tuft(4.6, 9, 9, 15, 3.6), tuft(10.6, 8.4, 9.4, 15.6, 4.6), tuft(15.6, 8, 7.4, 12.6, 4)];
        const spikes = covered ? [] : [
          tame([[-3, -1.6], [7, -0.6], [10.4, -10.4, 1], [3, -3]]), tame([[-11, -0.8], [-2, -2.4], [-6, -11.6, 1], [-12, -4]]),
          tame([[-20, 6], [-14, 0.4], [-22.6, -3.8, 1]]), tame([[-22, 18], [-19, 8], [-26.6, 8.6, 1]]), tame([[9.6, 0.4], [15.4, 6], [21.4, -1.4, 1]]),
        ];
        g.z(Z.HAIRFRONT - 1, ctx => foreheadShadow(ctx, g, tufts.map(t => t.fill)), 'h');
        g.z(Z.HAIRFRONT, ctx => {
          spikes.forEach(s => part(ctx, s, R, { sd: [1.6, 2.4], hd: [0.8, 1.2] }));
          mass(ctx, CAP_S, R, { hide: HIDE_S, shine: [-2, 21, 16.5, 19.4, 1.16, 1.86], strands: [[[-6, -1], [-13, 6], [-18, 16]], [[0, -2], [-4, 6], [-6, 14]]] });
          paintTufts(ctx, tufts, R);
          const lock = tuft(-1.4, 12, 7.2, 19, 0.6);
          part(ctx, lock.fill, R, { line: false, hi: false, sd: [1.7, 2.4] }); stroke(ctx, lock.line, R.o, 1);
        }, 'h');
      } else {
        const spikes = covered ? [] : [
          spike([-9, 0.4], [-1, -1.2], [-6.4, -11.4]), spike([-2, -1.2], [7, -0.4], [3.4, -12.6]), spike([5.6, -0.6], [14.4, 3.8], [14.6, -8.6]),
          spike([-16.8, 5.2], [-9, 0.2], [-16.8, -5.4]), spike([13, 3.4], [20.4, 12], [24.2, 2.2]), spike([-20.4, 13.4], [-16.8, 4.4], [-23.6, 1.6]),
        ];
        g.z(Z.HAIRFRONT, ctx => {
          spikes.forEach(s => part(ctx, s, R, { sd: [1.6, 2.4], hd: [0.8, 1.2] }));
          mass(ctx, CAP_B, R, { shine: [0, 21.5, 15.6, 19.6, 1.12, 1.88], strands: [[[-7, 4], [-10, 16], [-11, 30]], [[0, 2], [0, 16], [0, 34]], [[7, 4], [10, 16], [11, 30]]] });
        }, 'h');
      }
    },
  });

  // ---------------------------------------------------------------- 단발
  A.reg('hair', 'bob', {
    draw(g, tint) {
      const R = ramp(tint), d = g.dir;
      const BACK = blob(sym([[0, -1.6], [11, -0.6], [18.8, 6.4], [22.6, 19], [23, 32], [21.4, 42.4, 1], [15.6, 45.4], [8, 43], [0, 42.6]]));
      if (d === 'f') {
        const tufts = [tuft(-13.4, 9, 8.6, 12, -1), tuft(-6.8, 9, 8.6, 13.2, 0.2), tuft(-0.4, 9, 8.2, 12.6, 0), tuft(6, 9, 8.6, 13.2, -0.2), tuft(13, 9, 8.6, 12, 1)];
        const sideL = blob([[-16.2, 12], [-20.8, 18], [-22, 31], [-21, 41.4, 1], [-15.4, 41.6], [-16.4, 30], [-15.4, 20]]);
        const sideR = blob([[16.2, 12], [20.8, 18], [22, 31], [21, 41.4, 1], [15.4, 41.6], [16.4, 30], [15.4, 20]]);
        g.z(Z.HAIRBACK, ctx => mass(ctx, BACK, ramp(mix(tint, '#2a1912', 0.12)), { strands: [[[-16, 14], [-18, 28], [-17, 40]], [[16, 14], [18, 28], [17, 40]]] }), 'h');
        g.z(Z.HAIRFRONT - 1, ctx => foreheadShadow(ctx, g, tufts.map(t => t.fill)), 'h');
        g.z(Z.HAIRFRONT, ctx => {
          mass(ctx, CAP_F, R, { hide: HIDE_F, shine: SHINE_F, strands: [[[-4, 0], [-9, 6], [-14, 12]], [[9, 0.6], [13, 6], [16, 12]]] });
          part(ctx, sideL, R, { sd: [1.8, 2.6] }); part(ctx, sideR, R, { sd: [1.8, 2.6] });
          paintTufts(ctx, tufts, R);
        }, 'h');
      } else if (d === 's') {
        const SB = blob([[16, 13], [14, 6.4], [8, -0.6], [0, -2.6], [-9.6, -1.8], [-17.6, 4.4], [-22, 14], [-23.4, 27], [-22.4, 40, 1], [-16, 44.6], [-8, 43.4], [-3, 38], [-4, 27], [-4, 20], [2, 15.6], [9, 13.4]]);
        const tufts = [tuft(5, 9.5, 8.2, 12.5, 2.2), tuft(10.8, 9, 8.6, 12.8, 3.2), tuft(15.6, 8.6, 7, 11, 3.4)];
        g.z(Z.HAIRFRONT - 1, ctx => foreheadShadow(ctx, g, tufts.map(t => t.fill)), 'h');
        g.z(Z.HAIRFRONT, ctx => {
          mass(ctx, SB, R, { shine: [-2, 21, 16.5, 19.4, 1.16, 1.86], strands: [[[-8, 2], [-16, 12], [-19, 30]], [[-3, 22], [-8, 32], [-10, 42]]] });
          paintTufts(ctx, tufts, R);
          const lock = tuft(-1.6, 12, 7.4, 19, 0.6);
          part(ctx, lock.fill, R, { line: false, hi: false, sd: [1.7, 2.4] }); stroke(ctx, lock.line, R.o, 1);
        }, 'h');
      } else {
        g.z(Z.HAIRFRONT, ctx => mass(ctx, BACK, R, { shine: [0, 21.5, 15.6, 19.6, 1.12, 1.88], strands: [[[-8, 6], [-12, 24], [-13, 40]], [[0, 4], [0, 24], [0, 42]], [[8, 6], [12, 24], [13, 40]]] }), 'h');
      }
    },
  });

  // ---------------------------------------------------------------- 긴 머리
  A.reg('hair', 'long', {
    draw(g, tint) {
      const R = ramp(tint), d = g.dir, Rb = ramp(mix(tint, '#2a1912', 0.1));
      const BACK = blob(sym([[0, -1.6], [11, -0.6], [18.8, 6.4], [22.4, 19], [23.4, 38], [24.4, 58], [25.2, 73, 1], [19, 78.6], [12, 75.4], [6, 79.6], [0, 76]]));
      if (d === 'f') {
        const tufts = [tuft(-13.6, 9, 8.6, 14, -1.4), tuft(-7, 9, 8.6, 15.5, 0.6), tuft(-0.6, 9, 8.2, 13.4, 0.2), tuft(6, 9, 8.8, 15.6, -0.4), tuft(13, 9, 8.6, 14, 1.2)];
        const lockL = blob([[-14, 30], [-19.6, 30], [-21.6, 44], [-20.4, 60], [-19.2, 66, 1], [-15, 61], [-13.4, 46]]);
        const lockR = blob([[14, 30], [19.6, 30], [21.6, 44], [20.4, 60], [19.2, 66, 1], [15, 61], [13.4, 46]]);
        g.z(Z.HAIRBACK, ctx => mass(ctx, BACK, Rb, { strands: [[[-14, 20], [-18, 44], [-19, 70]], [[0, 20], [0, 50], [0, 74]], [[14, 20], [18, 44], [19, 70]]] }), 'b');
        g.z(Z.HAIRFRONT - 1, ctx => foreheadShadow(ctx, g, tufts.map(t => t.fill)), 'h');
        g.z(Z.HAIRFRONT, ctx => {
          mass(ctx, CAP_F, R, { hide: HIDE_F, shine: SHINE_F, strands: [[[-4, 0], [-9, 6], [-14, 12]], [[9, 0.6], [13, 6], [16, 12]]] });
          paintTufts(ctx, tufts, R);
        }, 'h');
        g.z(Z.HAND + 1, ctx => { part(ctx, lockL, R, { sd: [1.8, 2.6] }); part(ctx, lockR, R, { sd: [1.8, 2.6] }); }, 'b');
      } else if (d === 's') {
        const SB = blob([[-19, 30], [-22.6, 44], [-23.4, 62], [-21.4, 76, 1], [-14, 80], [-8, 72], [-6, 58], [-6, 40], [-9, 30]]);
        const tufts = [tuft(5, 9.5, 8.2, 13, 2.2), tuft(10.8, 9, 8.6, 13.6, 3.2), tuft(15.6, 8.6, 7, 11.4, 3.4)];
        g.z(Z.HAIRBACK, ctx => mass(ctx, SB, Rb, { strands: [[[-14, 34], [-17, 54], [-16, 74]]] }), 'b');
        g.z(Z.HAIRFRONT - 1, ctx => foreheadShadow(ctx, g, tufts.map(t => t.fill)), 'h');
        g.z(Z.HAIRFRONT, ctx => {
          mass(ctx, CAP_S, R, { hide: HIDE_S, shine: [-2, 21, 16.5, 19.4, 1.16, 1.86], strands: [[[-6, -1], [-13, 6], [-18, 16]], [[0, -2], [-4, 6], [-6, 14]]] });
          paintTufts(ctx, tufts, R);
          const lock = tuft(-1.6, 12, 7.4, 22, 0.6);
          part(ctx, lock.fill, R, { line: false, hi: false, sd: [1.7, 2.4] }); stroke(ctx, lock.line, R.o, 1);
        }, 'h');
      } else {
        g.z(Z.BACKFRONT + 1, ctx => mass(ctx, BACK, R, { shine: [0, 21.5, 15.6, 19.6, 1.12, 1.88], strands: [[[-10, 6], [-14, 30], [-16, 72]], [[0, 4], [0, 34], [0, 76]], [[10, 6], [14, 30], [16, 72]]] }), 'b');
        g.z(Z.HAIRFRONT - 0.5, ctx => mass(ctx, CAP_B, R, { shine: [0, 21.5, 15.6, 19.6, 1.12, 1.88] }), 'h');
      }
    },
  });
})();
