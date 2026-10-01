/* 모자·머리장식, 손에 든 물건, 등에 메는 것(망토·배낭·화살통·날개).
 * 손 아이템은 g.holdItem 으로 "쥔 곳이 (0,0)" 인 좌표계에서 그린다. 위쪽이 -y.
 */
(function () {
  'use strict';
  const A = Avatar, U = A.U, Z = A.Z;
  const { PI, rad, blob, curve, sym, poly, ell, rrect, capsule, part, stroke, fill, inside, ramp, mix, star, rot } = U;

  const K = {
    gold: '#DDB24E', goldD: '#B58A2E', leather: '#8A5A3A', leatherD: '#5E3B27', leatherL: '#B27B4E',
    steel: '#C4CBD6', steelD: '#8E97A6', wood: '#8A5A3A', cream: '#F3EAD6', white: '#FBF7EE', red: '#C7473B', green: '#5F8A4A',
  };

  // ---------------------------------------------------------------- 손에 든 물건 공용
  /** fn(ctx) 는 쥔 곳이 (0,0)인 좌표계. angle = 기울기(도, 위쪽이 화면 오른쪽으로 갈수록 +) */
  function holdItem(g, angle, fn, opt) {
    opt = opt || {};
    const back = g.dir === 'b', side = g.dir === 's';
    if (side && opt.armSide != null) g.holdPose(opt.armSide);
    const arm = g.handArm, h = arm.h;
    const hx = h[0] + (side && opt.sideDx != null ? opt.sideDx : (opt.dx || 0)) * (back ? -1 : 1), hy = h[1] + 1.2 + (opt.dy || 0);
    const layer = back ? Z.HANDBEHIND : (opt.layer || Z.HANDFRONT);
    let ang = side && opt.sideAngle != null ? opt.sideAngle : angle;
    if (side) ang += (arm.h[0] - arm.j[0]) * 0.9;   // 팔이 흔들리면 같이 기운다
    g.z(layer, ctx => {
      ctx.translate(hx, hy);
      if (back) ctx.scale(-1, 1);
      ctx.rotate(rad(ang));
      fn(ctx);
    }, 'b');
  }
  A.holdItem = holdItem;

  A.reg('hand', 'none', { draw() { } });
  A.reg('head', 'none', { draw() { } });
  A.reg('back', 'none', { draw() { } });

  // ================================================================ 모자
  // ---------------------------------------------------------------- 마법사 모자
  A.reg('head', 'wizard', {
    top: -30,
    draw(g, tint) {
      // 목표 그림체: 넓고 살짝 처진 챙 · 뒤로 꺾인 끝 · 가죽 띠 · 둥근 금 장식과 작은 꽃
      g.flags.hat = { covers: true };
      const d = g.dir, R = ramp(tint), Lb = ramp(K.leather);
      const side = d === 's', back = d === 'b', sx = side ? 1.8 : 0;
      g.z(Z.HAT, ctx => {
        ctx.translate(sx, 0);
        const bw = side ? 30 : 34;
        const brim = blob([[-bw, 14.2], [-bw * 0.7, 7.6], [0, 5.8], [bw * 0.7, 7.6], [bw, 14.6], [bw * 0.82, 16.2], [0, 14.2], [-bw * 0.82, 15.8]], 1);
        part(ctx, brim, R, { sd: [2, 2.6] });
        inside(ctx, brim, () => fill(ctx, ell(0, 8.6, bw * 0.62, 3.2), R.d2, 0.55));
        const sgn = back ? -1 : 1;
        // 낮고 넓은 몸통, 끝은 옆으로 푹 꺾임
        const cone = blob([[-15, 9.8, 1], [-14.4, 0.4], [-10.6, -7.6], [-3.6 * sgn, -12.6], [6 * sgn, -15.2], [15 * sgn, -15.6], [22 * sgn, -11.8, 1], [15.4 * sgn, -10.6], [11.6, -5.4], [14.2, 1.2], [15.4, 9.8, 1], [0, 11.8]], 1);
        part(ctx, cone, R, { sd: [2.6, 3], hd: [1.2, 1.4] });
        inside(ctx, cone, () => {
          const band = poly([[-16, 3.2], [16, 3.2], [16, 8.6], [-16, 8.8]]);
          fill(ctx, band, Lb.b);
          fill(ctx, poly([[-16, 7.4], [16, 7.4], [16, 8.6], [-16, 8.8]]), Lb.d);
          stroke(ctx, curve([[-4, -1], [-2, -9], [3, -16]]), R.d, 0.8);
        });
        stroke(ctx, cone, R.o, 1);
        if (!back) {
          const bx = side ? 7.5 : 5.5;
          const br = ell(bx, 5.9, 2.7, 2.7);
          fill(ctx, br, K.gold); stroke(ctx, br, K.goldD, 0.7); fill(ctx, ell(bx - 0.7, 5.1, 0.8, 0.8), K.cream, 0.8);
          for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; fill(ctx, ell(bx + 5 + Math.cos(a) * 1.6, 5.2 + Math.sin(a) * 1.6, 1.3, 1.3), '#E8C9C0'); }
          fill(ctx, ell(bx + 5, 5.2, 0.9, 0.9), K.gold);
        }
      });
    },
  });
  function TAU_() { return Math.PI * 2; }

  // ================================================================ 손 아이템
  // ---------------------------------------------------------------- 검
  A.reg('hand', 'sword', {
    draw(g) {
      holdItem(g, 14, ctx => {
        const St = ramp(K.steel);
        // 자루·손잡이
        part(ctx, rrect(-1.5, -3.6, 3, 9, 1.2), K.leatherD, { sd: [0.8, 1.2], hi: false });
        part(ctx, ell(0, 6, 2.2, 2.2), K.gold, { sd: [0.8, 1.2] });
        // 날
        const blade = blob([[-2.9, -4, 1], [2.9, -4, 1], [3, -30], [0, -39.4, 1], [-3, -30]], 0.6);
        part(ctx, blade, K.steel, { sd: [1.4, 2], hd: [0.8, 1] });
        inside(ctx, blade, () => { stroke(ctx, curve([[0, -6], [0, -34]]), St.d, 0.9); fill(ctx, rrect(-3.4, -32, 6.8, 4, 0), '#fff', 0.15); });
        // 가드
        part(ctx, blob([[-6.6, -4.6], [6.6, -4.6], [7.4, -2.4], [-7.4, -2.4]], 0.5), K.gold, { sd: [1, 1.4] });
        fill(ctx, ell(0, -3.5, 1, 1), K.red);
      }, { armSide: 34, sideAngle: 18, sideDx: 2 });
    },
  });

  // ---------------------------------------------------------------- 마법사 지팡이 (호박색 구슬)
  A.reg('hand', 'staff', {
    top: -30,
    draw(g) {
      holdItem(g, 3, ctx => {
        // 막대
        const shaft = capsule(0, 21, 0, -34, 1.9, 1.7);
        part(ctx, shaft, K.wood, { sd: [1, 1.2], hi: false });
        [-8, 8, 18].forEach(y => fill(ctx, rrect(-2.3, y, 4.6, 1.6, 0.6), K.gold));
        // 윗 장식: 갈고리 + 구슬
        const claw = blob([[-2.4, -32], [2.4, -32], [7.4, -38], [8.8, -47, 1], [5.2, -41.6], [1.6, -38], [-1.6, -38], [-5.2, -41.6], [-8.8, -47, 1], [-7.4, -38]], 0.8);
        part(ctx, claw, K.gold, { sd: [1, 1.4] });
        // 구슬 빛
        ctx.save();
        const glow = ctx.createRadialGradient(0, -42, 2, 0, -42, 12);
        glow.addColorStop(0, 'rgba(255,214,120,0.55)'); glow.addColorStop(1, 'rgba(255,214,120,0)');
        ctx.fillStyle = glow; ctx.fillRect(-14, -56, 28, 28);
        ctx.restore();
        const orb = ell(0, -42, 5.4, 5.4);
        part(ctx, orb, '#F2A93B', { sd: [1.8, 2.2], hd: [1.4, 1.6] });
        fill(ctx, ell(-1.8, -44, 1.6, 1.6), '#fff', 0.85);
        part(ctx, blob([[-3.4, -36.4], [3.4, -36.4], [2.8, -34.4], [-2.8, -34.4]], 0.5), K.gold, { sd: [0.6, 0.8] });
      }, { armSide: 64, sideAngle: 3, sideDx: 3 });
    },
  });

  // ================================================================ 등
  // ---------------------------------------------------------------- 망토
  A.reg('back', 'cape', {
    draw(g, tint) {
      const d = g.dir, R = ramp(tint), Lin = ramp(mix(tint, '#3a1a1a', 0.35));
      const sw = g.P.sway * 1.6;
      if (d === 's') {
        const cape = blob([[-7, 38], [-1, 37.6], [-3, 52], [-6.6 - sw, 68], [-8.6 - sw * 2, 84, 1], [-16 - sw * 2, 86.6], [-24 - sw * 3, 84, 1], [-21 - sw * 2, 70], [-16 - sw, 55], [-11, 42]], 1);
        g.z(Z.BACKITEM, ctx => {
          part(ctx, cape, R, { sd: [2.6, 3], hd: [1.2, 1.4] });
          inside(ctx, cape, () => { stroke(ctx, curve([[-8, 44], [-12 - sw, 64], [-14 - sw * 2, 84]]), R.d, 1); stroke(ctx, curve([[-13, 50], [-19 - sw, 68], [-20 - sw * 2, 84]]), R.d, 1); });
        }, 'b');
      } else if (d === 'f') {
        const cape = blob(sym([[0, 38], [12, 37.6], [17.4, 52], [21, 68], [23.4, 84, 1], [14, 87.4], [7, 84], [0, 86.6]]), 1);
        g.z(Z.BACKITEM, ctx => {
          part(ctx, cape, Lin, { sd: [2.4, 2.8], hi: false });
          stroke(ctx, curve([[-15, 52], [-18 + sw, 70], [-20 + sw, 84]]), Lin.d2, 0.9);
          stroke(ctx, curve([[15, 52], [18 + sw, 70], [20 + sw, 84]]), Lin.d2, 0.9);
        }, 'b');
        // 어깨 걸쇠 (앞)
        g.z(Z.SLEEVE + 1, ctx => {
          part(ctx, rrect(-13.4, 37.8, 26.8, 2.8, 1.2), K.gold, { sd: [0.6, 1], hi: false });
          [-1, 1].forEach(s => { fill(ctx, ell(s * 5.4, 39.2, 1.9, 1.9), K.gold); stroke(ctx, ell(s * 5.4, 39.2, 1.9, 1.9), K.goldD, 0.6); });
          stroke(ctx, curve([[-5.4, 40.4], [0, 43], [5.4, 40.4]]), K.gold, 0.9);
        }, 'b');
      } else {
        const cape = blob(sym([[0, 37.4], [12.6, 37.6], [17.6, 52], [21.4, 68], [23.8, 84, 1], [14, 87.6], [7, 85], [0, 87]]), 1);
        g.z(Z.BACKFRONT, ctx => {
          part(ctx, cape, R, { sd: [2.6, 3], hd: [1.2, 1.4] });
          inside(ctx, cape, () => [-13, -6.4, 0, 6.4, 13].forEach((x, i) => stroke(ctx, curve([[x * 0.5, 44], [x * 0.95 + sw, 64], [x * 1.25 + sw, 86]]), R.d, 0.9)));
          part(ctx, rrect(-13.6, 37.4, 27.2, 3.2, 1.4), K.gold, { sd: [0.6, 1], hi: false });
        }, 'b');
      }
    },
  });
})();
