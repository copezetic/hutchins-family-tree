/* The living tree: the whole pedigree drawn as a tree that grows up through the centuries. DeWitt (or Christine) is
   the trunk at the bottom; each parent is a branch, placed by birth year, so the tree climbs from today back to the
   1500s. Once grown it sways, and a spotlight tours the ancestors with stories or photographs, lighting the line
   that leads from the trunk to each one. Canvas 2D, light enough for the Fire TV. Shared via window.FAMILYGROW. */
(() => {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const QUAD = { 4: '#c9a85f', 5: '#9fbf9f', 6: '#8fa6c9', 7: '#c99a86' };
  const gen = k => Math.floor(Math.log2(k));
  // birth year from the birth date, else from 'years' only when it starts with one ("?–1679" has none)
  const yearOf = a => { const m = ((a.born || {}).date || '').match(/\d{4}/) || (a.years || '').match(/^(?:b\.\s*)?(\d{4})/); return m ? +(m[1] || m[0]) : null; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => -(Math.cos(Math.PI * t) - 1) / 2;
  const back = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const town = p => (p || '').split(',')[0].trim();

  // positions in a unit square: x by share of the known ancestors above each person (fathers left, mothers right),
  // y by birth year (0 = the root's year, 1 = the earliest ancestor)
  function layout(M, split) {
    const ks = Object.keys(M).map(Number).filter(k => M[k]).sort((a, b) => a - b);
    const Y = {};
    for (const k of ks) { const y = yearOf(M[k]), c = Y[k >> 1]; Y[k] = k === 1 ? (y || 1985) : Math.min(y || c - 28, c - 14); }
    const wid = {};
    for (const k of [...ks].reverse()) wid[k] = Math.max(1, (M[2 * k] ? wid[2 * k] : 0) + (M[2 * k + 1] ? wid[2 * k + 1] : 0));
    const X = {};
    const place = (k, a, b) => { X[k] = (a + b) / 2; const f = M[2 * k] ? wid[2 * k] : 0, m = M[2 * k + 1] ? wid[2 * k + 1] : 0; if (!f && !m) return;
      const mid = a + (b - a) * (k === 1 && split && f && m ? split : f / (f + m)); if (f) place(2 * k, a, mid); if (m) place(2 * k + 1, mid, b); };
    place(1, 0, 1);
    const y0 = Y[1], y1 = Math.min(...ks.map(k => Y[k]));
    const V = {}; for (const k of ks) V[k] = Math.pow((y0 - Y[k]) / Math.max(1, y0 - y1), .85);
    return { ks, Y, X, V, wid, y0, y1 };
  }
  const CQUAD = { 4: '#d7a9b8', 5: '#b8a8db', 6: '#9fc3d6', 7: '#d9c9a0' };
  const colorOf = (k, side = 'h') => { const g = gen(k), Q = side === 'c' ? CQUAD : QUAD;
    return g === 0 ? (side === 'c' ? '#ecd0d8' : '#efe6cf') : g === 1 ? (side === 'c' ? (k === 2 ? '#e0b8c6' : '#c6b7e3') : (k === 2 ? '#c9a85f' : '#a7b6c9')) : Q[k >> (g - 2)] || '#999'; };
  // both trees in one: a virtual root (the marriage) whose father is DeWitt and mother Christine. A person k in
  // DeWitt's tree becomes k + 2^gen(k) (a 0 inserted after the leading bit), in Christine's k + 2^(gen(k)+1).
  function joined(F) {
    const M = {}, meta = {}, A = F.A, C = F.C, yr = a => { const m = ((a.born || {}).date || a.years || '').match(/\d{4}/); return m ? +m[0] : 0; };
    for (const k of Object.keys(A).map(Number)) if (A[k]) { const j = k + 2 ** gen(k); M[j] = A[k]; meta[j] = { side: 'h', k }; }
    if (C) for (const k of Object.keys(C).map(Number)) if (C[k]) { const j = k + 2 ** (gen(k) + 1); M[j] = C[k]; meta[j] = { side: 'c', k }; }
    M[1] = { name: 'DeWitt & Christine', years: 'Married 19 August', born: { date: String(Math.max(yr(A[1]), C && C[1] ? yr(C[1]) : 0) + 3) }, union: true };
    meta[1] = { side: 'u', k: 1 };
    return { M, meta };
  }

  function grow(el, { side = 'h', growMs = 24000, tour = true, pair = false, onDone = null, quiet = false, feature = null } = {}) {
    const F = window.FAMILYAPP, D = window.FAMILY || {}, J = pair ? joined(F) : null, M = J ? J.M : side === 'c' ? F.C : F.A;
    if (!M || !M[1]) return () => {};
    const orig = k => J ? J.meta[k] : { side, k }, col = k => { const o = orig(k); return o.side === 'u' ? '#d8c690' : colorOf(o.k, o.side); };
    const L = layout(M, J ? .56 : 0), { ks, Y, X, V, wid } = L;
    // the featured ancestors (the chronicle's people): named on the quiet tree and toured first
    const FEAT = (feature || []).map(([s, k]) => J ? (s === 'c' ? k + 2 ** (gen(k) + 1) : k + 2 ** gen(k)) : s === side ? k : 0).filter(k => k && M[k]);
    el.innerHTML = `<div class="grow"><canvas></canvas><div class="gyr"></div><div class="gcap"></div></div>`;
    const wrap = el.firstChild, cv = wrap.querySelector('canvas'), ctx = cv.getContext('2d'), yrEl = wrap.querySelector('.gyr'), cap = wrap.querySelector('.gcap');
    const font = getComputedStyle(document.body).fontFamily;
    let W = 0, H = 0, dpr = 1, S = 1, TS = 1;   // S scales the drawing; TS the type, which on a phone stays larger than S
    const size = () => { const r = wrap.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 1.5); W = r.width; H = r.height; S = Math.min(W, H) / 800; TS = Math.max(S, Math.min(W, H) < 700 ? .8 : 0);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); };
    size(); addEventListener('resize', size);
    const padX = () => W * .05, px = k => padX() + X[k] * (W - 2 * padX()), py = k => H * .9 - V[k] * H * .8;
    const yAt = yr => H * .9 - Math.pow((L.y0 - yr) / Math.max(1, L.y0 - L.y1), .85) * H * .8;
    const R = k => [24, 18, 14.5, 11.5, 9, 7, 5.5, 4.5, 3.8, 3.3][Math.min(9, gen(k))] * S;
    const thick = k => (1.1 + 15 * Math.pow(wid[k] / wid[1], .55)) * S;
    // names further up the tree: placed once per size, nearest generations first, beside, above or below each
    // circle wherever they fit without touching another name or circle
    const lg = k => gen(k) - (J && k > 1 ? 1 : 0), short = n => { const p = n.replace(/["“”]|\(.*?\)/g, '').replace(/^(Rev\.?|Sergeant|Colonel|Deacon|Capt\.?|Lt\.?|Dr\.?)\s+/i, '').trim().split(/\s+/); return p.length > 1 ? p[0] + ' ' + p[p.length - 1] : p[0] || ''; };
    let plan = {};
    function planLabels() {
      plan = {}; if (quiet && !FEAT.length) return;
      const maxG = J ? 6 : 7, rects = [], hit = r => r.x < 2 || r.y < 2 || r.x + r.w > W - 2 || r.y + r.h > H - 2 || rects.some(q => r.x < q.x + q.w && q.x < r.x + r.w && r.y < q.y + q.h && q.y < r.y + r.h);
      for (const k of ks) { const r = R(k) + 1.5 * S; rects.push({ x: px(k) - r, y: py(k) - r, w: 2 * r, h: 2 * r }); }
      for (const k of ks) if (lg(k) <= 2 && k > 1) rects.push({ x: px(k) - 70 * TS, y: py(k) + R(k), w: 140 * TS, h: (lg(k) <= 1 ? 34 : 20) * TS });
      const cand = quiet ? [...new Set(FEAT)].sort((a, b) => lg(a) - lg(b)) : ks.filter(k => k > 1 && lg(k) >= 3 && lg(k) <= maxG && !M[k].living).sort((a, b) => lg(a) - lg(b) || (img[b] ? 1 : 0) - (img[a] ? 1 : 0) || (role(b) ? 1 : 0) - (role(a) ? 1 : 0));
      for (const k of cand) {
        const g = lg(k), text = g <= 4 || quiet ? short(M[k].name) : short(M[k].name).split(' ').pop(), fs = (quiet ? 12.5 : [0, 0, 0, 11.5, 10.5, 9.5, 8.8, 8.2][Math.min(7, g)]) * TS + 1.5;
        ctx.font = `500 ${fs}px ${font}`; const w = ctx.measureText(text).width, h = fs * 1.05, x = px(k), y = py(k), r = R(k) + 3 * S;
        for (const [dx, dy, al] of [[r, -h / 2, 'left'], [-r - w, -h / 2, 'right'], [-w / 2, -r - h, 'center'], [-w / 2, r, 'center']]) {
          const box = { x: x + dx, y: y + dy, w, h }; if (hit(box)) continue;
          rects.push(box); plan[k] = { text, fs, ox: al === 'left' ? r : al === 'right' ? -r : 0, oy: dy + h * .8, al }; break;
        }
      }
    }
    addEventListener('resize', () => setTimeout(planLabels, 50));

    // photographs for the inner generations (family photos first; period pictures are left out)
    const img = {};
    for (const k of ks) {
      if (gen(k) > 7) continue;
      const o = orig(k); if (o.side === 'u') continue;
      const own = o.side === 'h' && D.stories && D.stories[o.k] && D.stories[o.k].photos || [];
      const p = [...own, ...F.pics(M[k])].find(x => x && x.src && !/\/era\//.test(x.src));
      if (p) { const im = new Image(); im.src = p.src; img[k] = im; }
    }
    const story = k => { const o = orig(k); return o.side === 'u' ? '' : (o.side === 'h' && D.stories && D.stories[o.k] && D.stories[o.k].story) || F.note(M[k]).story || ''; };
    const role = k => orig(k).side === 'u' ? '' : F.note(M[k]).role || '';

    planLabels();
    // the spotlight tour: people with a story, a role or a photograph, mixing near and far generations
    const stars = ks.filter(k => k > 1 && !M[k].living && (role(k) || story(k) || img[k]));
    const far = stars.filter(k => gen(k) >= 5).sort((a, b) => Y[a] - Y[b]), near = stars.filter(k => gen(k) < 5).sort((a, b) => Y[a] - Y[b]);
    let order = []; while (far.length || near.length) { if (far.length) order.push(far.shift()); if (far.length) order.push(far.pop()); if (near.length) order.push(near.shift()); }
    if (FEAT.length) order = [...new Set([...FEAT.filter(k => !M[k].living), ...order])];

    const bloom = {}, sparks = [], motes = Array.from({ length: 36 }, (_, i) => ({ x: Math.random(), y: Math.random(), s: .4 + Math.random(), p: Math.random() * 6.28 }));
    const t0 = performance.now(); let raf = 0, stop = false, spot = null, spotAt = 0, si = 0, cam = { x: .5, y: .5, z: 1 }, camT = { x: .5, y: .5, z: 1 };
    const pathTo = k => { const p = []; while (k >= 1) { p.push(k); k >>= 1; } return p.reverse(); };

    function bez(c, k, f, sw) {   // branch from child c to parent k, drawn up to fraction f
      const x0 = px(c) + sw(c), y0 = py(c), x1 = px(k) + sw(k), y1 = py(k), dy = y0 - y1;
      const pts = [], n = Math.max(6, Math.ceil(16 * f));
      for (let i = 0; i <= n; i++) { const t = f * i / n, u = 1 - t;
        pts.push([u * u * u * x0 + 3 * u * u * t * x0 + 3 * u * t * t * x1 + t * t * t * x1, u * u * u * y0 + 3 * u * u * t * (y0 - dy * .55) + 3 * u * t * t * (y1 + dy * .45) + t * t * t * y1]); }
      return pts;
    }
    const strokePts = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };

    function caption(k) {
      if (!k) { cap.classList.remove('on'); return; }
      const a = M[k], first = (story(k).match(/^.*?[.!?](\s|$)/) || [story(k)])[0].trim();
      const o = orig(k), kin = (o.side === 'h' ? "DeWitt's " : "Christine's ") + F.kin(o.k);
      const im = img[k] && img[k].complete && img[k].naturalWidth ? `<img src="${img[k].src}" alt="">` : '';
      cap.innerHTML = `${im}<div><p class="k">${kin}</p>${o.k > 3 ? `<p class="v">${F.via(o.side, o.k)}</p>` : ''}<h3>${a.name}</h3><p class="m">${[a.years, town((a.born || {}).place)].filter(Boolean).join(' · ')}</p>` +
        (role(k) ? `<p class="r">${role(k)}</p>` : '') + (first ? `<p class="s">${first.length > 190 ? first.slice(0, 187) + '…' : first}</p>` : '') + `</div>`;
      cap.classList.toggle('left', X[k] > .5); cap.classList.add('on');
    }

    function frame(now) {
      if (stop) return;
      raf = requestAnimationFrame(frame);
      const el_ = now - t0, f = REDUCED ? 1 : clamp(el_ / growMs, 0, 1), cursor = L.y0 - (L.y0 - L.y1 + 6) * ease(f);
      const grown = f >= 1;
      // the tour: once grown, a new person every 7 s; the camera eases toward them
      if (grown && tour && order.length && !REDUCED && (!spot || now - spotAt > 7000)) {
        spot = order[si++ % order.length]; spotAt = now; caption(spot);
        const z = gen(spot) >= 6 ? 2.1 : gen(spot) >= 4 ? 1.7 : 1.35;
        camT = { x: clamp(px(spot) / W, .5 / z, 1 - .5 / z), y: clamp(py(spot) / H, .5 / z, 1 - .5 / z), z };
      }
      const k_ = 1 - Math.pow(.025, 1 / 60); cam.x += (camT.x - cam.x) * k_; cam.y += (camT.y - cam.y) * k_; cam.z += (camT.z - cam.z) * k_;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const z = cam.z, ox = W / 2 - z * cam.x * W, oy = H / 2 - z * cam.y * H;
      ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
      // centuries, in the tree's own coordinates so they stay true when the camera zooms
      const lx = (12 - ox) / z, x0w = -ox / z, x1w = (W - ox) / z;
      ctx.font = `${(13 * TS + 4) / Math.sqrt(z)}px ${font}`; ctx.textAlign = 'left';
      for (let c = Math.ceil(L.y1 / 100) * 100; c <= L.y0; c += 100) { const y = yAt(c);
        ctx.strokeStyle = 'rgba(216,198,144,.08)'; ctx.lineWidth = 1 / z; ctx.beginPath(); ctx.moveTo(x0w, y); ctx.lineTo(x1w, y); ctx.stroke();
        ctx.fillStyle = 'rgba(138,147,173,.6)'; ctx.fillText(c, lx, y - 4 / z); }
      // ambient motes
      for (const m of motes) { m.y -= .00012 * m.s; if (m.y < -.02) { m.y = 1.02; m.x = Math.random(); }
        ctx.fillStyle = `rgba(216,198,144,${.12 + .1 * Math.sin(now / 900 + m.p)})`; ctx.beginPath(); ctx.arc((m.x + .01 * Math.sin(now / 3000 + m.p)) * W, m.y * H, 1.2 * m.s * S, 0, 6.29); ctx.fill(); }
      const sw = k => k === 1 || REDUCED ? 0 : Math.sin(now / 2600 + k * 1.7) * Math.min(6, gen(k) * .9) * S;
      // the growth cursor
      if (!grown) { const y = yAt(cursor); ctx.strokeStyle = 'rgba(239,230,207,.18)'; ctx.setLineDash([4 * S, 8 * S]); ctx.lineWidth = 1 / z; ctx.beginPath(); ctx.moveTo(-W, y); ctx.lineTo(2 * W, y); ctx.stroke(); ctx.setLineDash([]); }
      yrEl.textContent = grown || quiet ? '' : Math.round(cursor);
      if (grown && onDone) { const cb = onDone; onDone = null; setTimeout(cb, 0); }
      // branches, deepest first so the trunk sits on top
      const lit = spot ? new Set(pathTo(spot)) : null;
      ctx.lineCap = 'round';
      for (let i = ks.length - 1; i >= 0; i--) {
        const k = ks[i]; if (k === 1) continue; const c = k >> 1; if (!M[c]) continue;
        const pr = clamp((Y[c] - cursor) / Math.max(1, Y[c] - Y[k]), 0, 1); if (pr <= 0) continue;
        const pts = bez(c, k, pr, sw), colr = col(k), on = lit && lit.has(k);
        ctx.globalAlpha = lit && !on ? .35 : .85; ctx.strokeStyle = colr; ctx.lineWidth = thick(k); strokePts(pts);
        ctx.globalAlpha = lit && !on ? .15 : .45; ctx.strokeStyle = '#fff6dc'; ctx.lineWidth = thick(k) * .28; strokePts(pts);
        if (on) { ctx.globalAlpha = .5 + .3 * Math.sin(now / 300); ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = thick(k) * .6 + 2 * S; strokePts(pts); }
        ctx.globalAlpha = 1;
        if (pr >= 1 && !bloom[k]) { bloom[k] = now; for (let j = 0; j < (gen(k) < 6 ? 6 : 2); j++) sparks.push({ x: px(k), y: py(k), vx: (Math.random() - .5) * 1.4 * S, vy: (-Math.random() * 1.2 - .3) * S, t: now, c: colr }); }
      }
      // sparks from each new bloom
      for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i], a = (now - s.t) / 1400; if (a >= 1) { sparks.splice(i, 1); continue; }
        s.x += s.vx; s.y += s.vy; ctx.globalAlpha = 1 - a; ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, 2 * S * (1 - a) + .5, 0, 6.29); ctx.fill(); }
      ctx.globalAlpha = 1;
      // people
      ctx.textAlign = 'center';
      for (const k of ks) {
        const b = k === 1 ? t0 : bloom[k]; if (!b) continue;
        const a = clamp((now - b) / 650, 0, 1), r = R(k) * (REDUCED ? 1 : back(a)), x = px(k) + sw(k), y = py(k), colr = col(k), on = spot === k;
        if (on) { ctx.fillStyle = 'rgba(255,233,168,.18)'; ctx.beginPath(); ctx.arc(x, y, r * (2.2 + .25 * Math.sin(now / 250)), 0, 6.29); ctx.fill(); }
        ctx.fillStyle = '#0f1626'; ctx.beginPath(); ctx.arc(x, y, r + 1.6 * S, 0, 6.29); ctx.fill();
        const im = img[k];
        if (im && im.complete && im.naturalWidth && r > 4) {
          ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.clip();
          const s = 2 * r / Math.min(im.naturalWidth, im.naturalHeight); ctx.drawImage(im, x - im.naturalWidth * s / 2, y - im.naturalHeight * s * .38, im.naturalWidth * s, im.naturalHeight * s); ctx.restore();
          ctx.strokeStyle = colr; ctx.lineWidth = Math.max(1.2, r * .14); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.stroke();
        } else if (M[k].union) {   // the marriage: two linked rings
          ctx.lineWidth = r * .16; ctx.strokeStyle = '#d8c690'; ctx.beginPath(); ctx.arc(x - r * .42, y, r * .72, 0, 6.29); ctx.stroke();
          ctx.strokeStyle = '#ecd0d8'; ctx.beginPath(); ctx.arc(x + r * .42, y, r * .72, 0, 6.29); ctx.stroke();
        } else { ctx.fillStyle = colr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
          if (r > 9) { const p = M[k].name.split(/\s+/); ctx.fillStyle = '#0f1626'; ctx.font = `600 ${r * .8}px ${font}`; ctx.fillText((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] : ''), x, y + r * .28); } }
        const g = gen(k) - (J && k > 1 ? 1 : 0);
        const pl = plan[k];
        if (quiet && !M[k].union && g > 0) {   // the main page: only the featured ancestors are named
          if (pl && a > .6) { ctx.font = `500 ${pl.fs}px ${font}`; ctx.textAlign = pl.al; ctx.fillStyle = 'rgba(232,223,198,.85)'; ctx.fillText(pl.text, x + pl.ox, y + pl.oy); ctx.textAlign = 'center'; }
          continue;
        }
        if (pl && !on && a > .6) { ctx.font = `500 ${pl.fs}px ${font}`; ctx.textAlign = pl.al; ctx.globalAlpha = lit && !lit.has(k) ? .35 : .8;
          ctx.fillStyle = '#e8dfc6'; ctx.fillText(pl.text, x + pl.ox, y + pl.oy); ctx.globalAlpha = 1; ctx.textAlign = 'center'; }
        if (g <= 2 || on) {
          const full = g <= 1 || on, nm = full ? M[k].name : g === 2 ? M[k].name.split(/\s+/).filter((w, i, all) => i === 0 || i === all.length - 1).join(' ') : M[k].name.split(/\s+/).slice(-1)[0];
          const fs = (g <= 1 ? 17 : g === 2 ? 13 : 12) * TS / (on ? 1 : Math.sqrt(z)) + 2, side_ = !full && g === 2;
          ctx.font = `${on ? 600 : 500} ${fs}px ${font}`; ctx.fillStyle = on ? '#ffe9a8' : 'rgba(239,230,207,.9)';
          if (side_) {   // grandparents: the outer two beside their node, the inner two below and pulled apart
            const q = orig(k).k & 3, outer = q === 0 || q === 3;
            if (outer) { const tw = ctx.measureText(nm).width, left = q === 0 ? x - r - 7 * TS - tw > 4 : x + r + 7 * TS + tw > W - 4;
              ctx.textAlign = left ? 'right' : 'left'; ctx.fillText(nm, x + (left ? -1 : 1) * (r + 7 * TS), y + fs * .35); }
            else { ctx.textAlign = q === 1 ? 'right' : 'left'; ctx.fillText(nm, x + (q === 1 ? 1 : -1) * r, y + r + 15 * TS); }
            ctx.textAlign = 'center'; }
          else ctx.fillText(nm, x, y + r + 15 * TS / Math.sqrt(z) + 2);
          if (full) { ctx.fillStyle = 'rgba(138,147,173,.95)'; ctx.font = `${11 * TS / Math.sqrt(z) + 2}px ${font}`; ctx.fillText(M[k].years || '', x, y + r + 29 * TS / Math.sqrt(z) + 3); }
        }
      }
    }
    raf = requestAnimationFrame(frame);
    const end = () => { stop = true; cancelAnimationFrame(raf); removeEventListener('resize', size); };
    end.duration = growMs + (tour && order.length ? 4 * 7000 : 3000);
    return end;
  }

  const LAY = new WeakMap();
  // a small map of the tree with one person's line lit, for the explorer
  function mini(side, k, w = 220, h = 130) {
    const F = window.FAMILYAPP, M = side === 'c' ? F.C : F.A; if (!M || !M[1]) return '';
    if (!LAY.has(M)) LAY.set(M, layout(M)); const L = LAY.get(M), lit = new Set(); for (let j = k; j >= 1; j >>= 1) lit.add(j);
    const x = j => 8 + L.X[j] * (w - 16), y = j => h - 10 - L.V[j] * (h - 20);
    let s = `<svg viewBox="0 0 ${w} ${h}" class="xmini">`;
    for (const j of L.ks) { if (j === 1 || !M[j >> 1]) continue; const c = j >> 1;
      s += `<path d="M${x(c).toFixed(1)} ${y(c).toFixed(1)} C${x(c).toFixed(1)} ${(y(c) - (y(c) - y(j)) * .55).toFixed(1)} ${x(j).toFixed(1)} ${(y(j) + (y(c) - y(j)) * .45).toFixed(1)} ${x(j).toFixed(1)} ${y(j).toFixed(1)}" class="${lit.has(j) ? 'on' : ''}" stroke="${colorOf(j, side)}"/>`; }
    return s + `<circle cx="${x(k).toFixed(1)}" cy="${y(k).toFixed(1)}" r="4" class="me"/></svg>`;
  }

  window.FAMILYGROW = { grow, mini };
})();
