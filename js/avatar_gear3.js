/* 기존 머리장식과 손 아이템: 새싹 · 리본 · 털모자 · 밀짚모자 · 토끼 귀 · 고양이 귀 · 작은 왕관 · 들꽃 머리핀 / 꽃 · 풍선 · 초롱 · 낚싯대 · 별 지팡이 · 이야기책 */
(function () {
  'use strict';
  const A = Avatar, U = A.U, Z = A.Z;
  const { PI, rad, blob, curve, sym, poly, ell, rrect, capsule, part, stroke, fill, inside, ramp, mix, star } = U;
  const hold = A.holdItem;
  const K = { gold: '#DDB24E', goldD: '#B58A2E', leather: '#8A5A3A', cream: '#F3EAD6', pink: '#F2A6B6' };
  const side = d => (d === 's' ? -1.6 : 0);

  // ---------------------------------------------------------------- 새싹
  A.reg('head', 'sprout', {
    top: -17,
    draw(g) {
      const d = g.dir;
      g.z(Z.HAT, ctx => {
        ctx.translate(side(d), 0);
        stroke(ctx, curve([[0, 3], [0.4, -3], [0, -7]]), '#5E8A4E', 1.8);
        const leaf = (s, ang) => { ctx.save(); ctx.translate(0, -7); ctx.rotate(rad(ang)); part(ctx, blob([[0, 0, 1], [s * 6.4, -3.6], [s * 10.6, -1.2], [s * 6.4, 2.6]], 0.9), '#8CC46A', { sd: [1, 1.4] }); ctx.restore(); };
        leaf(-1, -20); leaf(1, 20);
        fill(ctx, ell(0, -7, 1.2, 1.2), '#5E8A4E');
      }, 'h');
    },
  });

  // ---------------------------------------------------------------- 리본
  A.reg('head', 'ribbon', {
    top: -4,
    draw(g, tint) {
      const d = g.dir, x = d === 'b' ? -13.4 : d === 's' ? -8 : 13.4, y = d === 's' ? 2 : 4;
      g.z(Z.HAT, ctx => {
        ctx.translate(x, y);
        const R = ramp(tint);
        [-1, 1].forEach(s => part(ctx, blob([[0, 0], [s * 5, -5.6], [s * 10.6, -4.6], [s * 10.6, 4.2], [s * 5, 5.4]], 0.9), tint, { sd: [1.4, 1.8] }));
        part(ctx, ell(0, 0, 3, 3.4), mix(tint, '#fff', 0.15), { sd: [0.8, 1.1] });
        [-1, 1].forEach(s => part(ctx, blob([[s * 1, 2.6], [s * 4.6, 9], [s * 2.4, 11, 1], [s * -0.4, 4]], 0.8), R, { sd: [0.8, 1.1], hi: false }));
      }, 'h');
    },
  });

  // ---------------------------------------------------------------- 털모자
  A.reg('head', 'beanie', {
    top: -14,
    draw(g, tint) {
      g.flags.hat = { covers: true };
      const d = g.dir, R = ramp(tint), sx = side(d);
      g.z(Z.HAT, ctx => {
        ctx.translate(sx, 0);
        const dome = blob([[-18.8, 12, 1], [-18.2, 0], [-10.4, -7.6], [0, -9.8], [10.4, -7.6], [18.2, 0], [18.8, 12, 1], [0, 14]], 1);
        part(ctx, dome, R, { sd: [2.6, 3.2] });
        inside(ctx, dome, () => { for (let x = -16; x <= 16; x += 4.2) stroke(ctx, curve([[x * 0.9, -8], [x, 2], [x * 1.05, 10]]), R.d, 0.8); });
        const cuff = blob([[-20.4, 9.4], [-19.6, 16.6], [0, 19.4], [19.6, 16.6], [20.4, 9.4], [0, 11.4]], 0.9);
        part(ctx, cuff, mix(tint, '#fff', 0.18), { sd: [1.6, 2] });
        inside(ctx, cuff, () => { for (let x = -18; x <= 18; x += 3.6) stroke(ctx, curve([[x, 11], [x, 19]]), R.d, 0.8); });
        stroke(ctx, cuff, R.o, 1);
        part(ctx, ell(0, -11.4, 5.2, 5), '#F6F0E4', { sd: [1.4, 1.8], hd: [1, 1.2] });
        inside(ctx, ell(0, -11.4, 5.2, 5), () => { for (let i = 0; i < 4; i++) stroke(ctx, curve([[-4 + i * 2.6, -15], [-2 + i * 2.6, -7]]), '#d8cbb0', 0.7); });
      }, 'h');
    },
  });

  // ---------------------------------------------------------------- 밀짚모자
  A.reg('head', 'strawhat', {
    top: -14,
    draw(g, tint) {
      g.flags.hat = { covers: true };
      const d = g.dir, sx = side(d), S = ramp('#E7C97A');
      g.z(Z.HAT, ctx => {
        ctx.translate(sx, 0);
        const brim = ell(0, 8.6, 27.6, 8);
        part(ctx, brim, '#E7C97A', { sd: [2.4, 3] });
        inside(ctx, brim, () => { for (let r = 8; r < 27; r += 4.4) stroke(ctx, (() => { const q = new Path2D(); q.ellipse(0, 8.6, r, r * 0.29, 0, 0, PI * 2); return q; })(), S.d, 0.7); });
        const dome = blob([[-15, 8.4, 1], [-14.6, -2], [-8, -9.4], [0, -11], [8, -9.4], [14.6, -2], [15, 8.4, 1], [0, 13.6]], 1);
        part(ctx, dome, '#EFD48A', { sd: [2.8, 3.2] });
        inside(ctx, dome, () => { for (let y = -8; y < 12; y += 3.4) stroke(ctx, curve([[-16, y], [0, y + 1.6], [16, y]]), S.d, 0.7); fill(ctx, poly([[-20, 1.6], [20, 1.6], [20, 9.4], [-20, 12.4]]), tint); });
        stroke(ctx, dome, S.o, 1);
        const bow = blob([[9, 4.6], [14.6, 1.8], [15, 8.6], [9, 6.6]], 0.9);
        part(ctx, bow, mix(tint, '#fff', 0.2), { sd: [0.6, 0.9], hi: false });
      }, 'h');
    },
  });

  // ---------------------------------------------------------------- 토끼 귀
  A.reg('head', 'bunny', {
    top: -28,
    draw(g) {
      const d = g.dir, sx = side(d);
      const ear = (x, tilt, floppy) => {
        g.z(Z.HAT, ctx => {
          ctx.translate(x + sx, 6); ctx.rotate(rad(tilt));
          const e = blob([[-3.6, 2, 1], [-4.8, -12], [-3.2, -24], [0, -30], [3.2, -24], [4.8, -12], [3.6, 2, 1]], 1);
          part(ctx, e, '#FBF7EE', { sd: [1.4, 1.8], hd: [1, 1.2] });
          if (d !== 'b') fill(ctx, blob([[-1.8, 0], [-2.6, -12], [-1.2, -23], [0, -26], [1.2, -23], [2.6, -12], [1.8, 0]], 1), '#F4A6B6');
        }, 'h');
      };
      if (d === 's') { ear(-4, -8); ear(7, 12); } else { ear(-9.4, -10); ear(9.4, 10); }
    },
  });

  // ---------------------------------------------------------------- 고양이 귀
  A.reg('head', 'cat', {
    top: -13,
    draw(g, tint) {
      const d = g.dir, sx = side(d), hc = g.L.hairC;
      const ear = (x, s) => g.z(Z.HAT, ctx => {
        ctx.translate(x + sx, 0);
        const e = blob([[s * -6, 8, 1], [s * -8.6, -8, 1], [s * 4.6, 1, 1], [s * 6.4, 8, 1]], 0.2);
        part(ctx, e, hc, { sd: [1.4, 1.8] });
        if (d !== 'b') fill(ctx, poly([[s * -4, 6], [s * -6.2, -3.6], [s * 2, 2.6]]), '#F4A6B6');
      }, 'h');
      if (d === 's') { ear(-6, -1); ear(6, 1); } else { ear(-12.4, 1); ear(12.4, -1); }
    },
  });

  // ---------------------------------------------------------------- 작은 왕관
  A.reg('head', 'crown', {
    top: -10,
    draw(g) {
      const d = g.dir, sx = side(d);
      g.z(Z.HAT, ctx => {
        ctx.translate(sx, -1);
        const c = blob([[-11.4, 7, 1], [-12.2, -4.8, 1], [-6.6, 1], [-3.6, -8.8, 1], [0, 0.2], [3.6, -8.8, 1], [6.6, 1], [12.2, -4.8, 1], [11.4, 7, 1], [0, 9.4]], 0.4);
        part(ctx, c, K.gold, { sd: [1.6, 2], hd: [1, 1.2] });
        inside(ctx, c, () => fill(ctx, rrect(-14, 4.4, 28, 2.2, 0), K.goldD));
        [[-12.2, -4.8], [12.2, -4.8], [-3.6, -8.8], [3.6, -8.8]].forEach(p => fill(ctx, ell(p[0], p[1] - 0.6, 1.5, 1.5), '#F3EAD6'));
        if (d !== 'b') { fill(ctx, ell(0, 4.4, 1.9, 1.9), '#D94B5B'); fill(ctx, ell(-6, 4.4, 1.3, 1.3), '#5B9BD5'); fill(ctx, ell(6, 4.4, 1.3, 1.3), '#5B9BD5'); }
      }, 'h');
    },
  });

  // ---------------------------------------------------------------- 들꽃 머리핀
  A.reg('head', 'flowerpin', {
    draw(g) {
      const d = g.dir, x = d === 'b' ? 13 : d === 's' ? 2 : -13, y = d === 's' ? 12 : 13;
      g.z(Z.HAT, ctx => {
        ctx.translate(x, y);
        const leaf = blob([[0, 0], [-5.4, 1.2], [-8, 5.6], [-3, 4.4]], 0.9); part(ctx, leaf, '#8CC46A', { sd: [0.8, 1.1], hi: false });
        for (let i = 0; i < 5; i++) {
          const a = -PI / 2 + i * TAU5;
          part(ctx, ell(Math.cos(a) * 3.2, Math.sin(a) * 3.2, 2.3, 2.3), '#F4A6B6', { sd: [0.6, 0.9], hi: false, lw: 0.7 });
        }
        fill(ctx, ell(0, 0, 1.7, 1.7), '#F3D36B'); stroke(ctx, ell(0, 0, 1.7, 1.7), '#c9a43e', 0.5);
      }, 'h');
    },
  });
  const TAU5 = PI * 2 / 5;

  // ================================================================ 손
  A.reg('hand', 'flower', {
    draw(g) {
      hold(g, 8, ctx => {
        stroke(ctx, curve([[0, 4], [0.6, -8], [0, -16]]), '#5E8A4E', 1.6);
        part(ctx, blob([[0.4, -6], [5.6, -8.6], [7, -4.6], [2, -3.6]], 0.9), '#8CC46A', { sd: [0.6, 0.9], hi: false });
        for (let i = 0; i < 6; i++) { const a = i * PI / 3; part(ctx, ell(Math.cos(a) * 4, -19 + Math.sin(a) * 4, 3, 3), '#F4A6B6', { sd: [0.8, 1.1], hi: false, lw: 0.7 }); }
        fill(ctx, ell(0, -19, 2.4, 2.4), '#F3D36B'); stroke(ctx, ell(0, -19, 2.4, 2.4), '#c9a43e', 0.6);
      }, { armSide: 40, sideAngle: 12, sideDx: 2 });
    },
  });
  A.reg('hand', 'balloon', {
    top: -58,
    draw(g) {
      hold(g, 4, ctx => {
        stroke(ctx, curve([[0, 2], [1.4, -14], [-1, -30], [1, -44]]), '#9C9186', 0.8);
        const b = blob(sym([[0, -66], [7.4, -63], [11, -55], [8.6, -46], [3, -41], [0, -40]]), 1);
        ctx.translate(2, 6);
        part(ctx, b, '#F08A9C', { sd: [2.2, 2.6], hd: [1.4, 1.6] });
        fill(ctx, ell(-3.6, -58, 2, 3.4), '#fff', 0.5);
        fill(ctx, poly([[-1.6, -40], [1.6, -40], [0, -37.6]]), '#d96a80');
      }, { armSide: 50, sideAngle: 2, sideDx: 3 });
    },
  });
  A.reg('hand', 'lantern', {
    draw(g) {
      hold(g, 0, ctx => {
        stroke(ctx, curve([[0, 0], [0, 5]]), K.leather, 1);
        ctx.save();
        const glow = ctx.createRadialGradient(0, 12, 1, 0, 12, 14);
        glow.addColorStop(0, 'rgba(255,224,130,0.55)'); glow.addColorStop(1, 'rgba(255,224,130,0)');
        ctx.fillStyle = glow; ctx.fillRect(-16, -4, 32, 32);
        ctx.restore();
        part(ctx, rrect(-4.6, 5, 9.2, 2.4, 1), K.gold, { sd: [0.6, 0.8], hi: false });
        const body = rrect(-4.2, 7, 8.4, 11, 1.6);
        part(ctx, body, '#F6D77A', { sd: [1.2, 1.6], hd: [0.8, 1] });
        fill(ctx, ell(0, 12.6, 1.8, 2.6), '#FFF3C0');
        stroke(ctx, curve([[0, 7], [0, 18]]), K.goldD, 0.6);
        part(ctx, rrect(-4.8, 17.6, 9.6, 2.4, 1), K.gold, { sd: [0.6, 0.8], hi: false });
      }, { armSide: 44, sideAngle: 0, sideDx: 2 });
    },
  });
  A.reg('hand', 'rod', {
    top: -30,
    draw(g) {
      hold(g, 26, ctx => {
        part(ctx, capsule(0, 6, 0, -44, 1.4, 0.7), '#8A6650', { sd: [0.6, 0.8], hi: false });
        part(ctx, rrect(-2.6, -2, 5.2, 6, 1.2), K.leather, { sd: [0.6, 0.8], hi: false });
        fill(ctx, ell(0, 0, 0.8, 0.8), K.gold);
        // 낚싯줄 + 찌
        stroke(ctx, curve([[0, -44], [3, -34], [4, -22]]), '#e8e2d4', 0.5);
        fill(ctx, ell(4, -19, 1.6, 2.4), '#E4574F'); fill(ctx, ell(4, -21, 1.6, 1.2), '#fff');
      }, { armSide: 46, sideAngle: 28, sideDx: 2 });
    },
  });
  A.reg('hand', 'wand', {
    top: -14,
    draw(g) {
      hold(g, 8, ctx => {
        part(ctx, capsule(0, 6, 0, -22, 1.3, 1.1), '#8A6650', { sd: [0.6, 0.8], hi: false });
        ctx.save();
        const glow = ctx.createRadialGradient(0, -28, 1, 0, -28, 12);
        glow.addColorStop(0, 'rgba(255,230,140,0.6)'); glow.addColorStop(1, 'rgba(255,230,140,0)');
        ctx.fillStyle = glow; ctx.fillRect(-14, -42, 28, 28);
        ctx.restore();
        const st = star(0, -28, 8, 3.6, 5);
        part(ctx, st, '#F5D14E', { sd: [1, 1.4], hd: [0.8, 1] });
        fill(ctx, ell(-1.4, -29.6, 1, 1), '#fff', 0.8);
      }, { armSide: 46, sideAngle: 8, sideDx: 3 });
    },
  });
  A.reg('hand', 'book', {
    draw(g) {
      hold(g, -6, ctx => {
        part(ctx, rrect(-6, -12, 12, 15, 1.4), '#5F9A6A', { sd: [1.4, 1.8], hd: [0.8, 1] });
        fill(ctx, rrect(-4.8, -10.8, 1.4, 12.6, 0.4), '#3f7a4c');
        part(ctx, rrect(-3.4, -8.6, 7.6, 2.6, 0.8), K.cream, { sd: [0.4, 0.6], hi: false, lw: 0.6 });
        fill(ctx, star(0.4, -1.8, 2.4, 1, 4), K.gold);
        stroke(ctx, curve([[5.8, -11], [5.8, 2]]), '#f3ead6', 1);
      }, { armSide: 44, sideAngle: 4, sideDx: 3 });
    },
  });
})();
