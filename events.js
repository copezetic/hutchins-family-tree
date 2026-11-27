/* Event maps for the Family Tree channel: one place drawn close up (a battlefield, a crossing) so a chapter can show
   where things happened. The ground comes from family/geo/<id>.json (or, with spec.image, a georeferenced period map) (OpenStreetMap roads and streams, and contour
   lines from AWS Terrain Tiles elevation, baked offline); the story comes from FAMILY.maps[id]: labels, family pins
   and a run of steps, each zooming to a spot with a caption. FAMILYVIS.event(el, { id, side }) draws it into el and,
   like FAMILYVIS.map, returns a stop function whose .duration is the story's running time. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ZOOM = REDUCED ? 0 : 1900;
  const cache = {};
  const load = id => cache[id] || (cache[id] = fetch(`geo/${id}.json?v=1`).then(r => r.json()).catch(() => null));
  const chars = s => (s || '').replace(/<[^>]+>/g, '').length;
  // paced for reading across a room, like the film's captions: about 52 ms a character, never under five seconds
  const readMs = st => Math.max(5000, 2600 + chars(st.t) * 52);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  function event(el, { id, side = 'h', from = 0, top = .06, voice = null } = {}) {   // voice: { dur(j) ms, play(j) }, the film's narrator, by the step's place in the full list
    const D = window.FAMILY || {}, spec = (D.maps || {})[id];
    const none = () => {}; none.duration = 0;
    if (!spec) { el.innerHTML = ''; return none; }
    const steps = spec.steps.filter(s => !s.side || s.side === side).slice(from);
    let stopped = false; const timers = [];
    const later = (f, t) => timers.push(setTimeout(() => { if (!stopped) f(); }, t));

    el.innerHTML = `<div class="evm"><svg class="evmap" xmlns="${NS}"><g class="img"></g><g class="ctr"></g><g class="wat"></g><g class="tn"></g><g class="rd"></g>` +
      `<g class="arw"></g><g class="rlab"></g><g class="lab"></g><g class="pins"></g></svg>` +
      `<div class="evkey">${(spec.key || []).map(([cls, txt]) => `<span><i class="${cls}"></i>${txt}</span>`).join('')}</div>` +
      `<div class="evscale"><i></i><span></span></div><div class="evcap"><p class="k"></p><p class="t"></p></div>` +
      `<div class="evcr">${spec.credit || ''}</div></div>`;
    const svg = el.querySelector('svg'), cap = el.querySelector('.evcap'), G = c => svg.querySelector('.' + c);
    const W = el.clientWidth || innerWidth || 1600, H = el.clientHeight || innerHeight || 900, AR = W / H;   // hidden: assume 16:9

    // a local flat projection in metres, east and south of the map's centre; fine over a few miles
    const [lo0, la0] = spec.center, KX = 111320 * Math.cos(la0 * Math.PI / 180), KY = 110540;
    const P = ([lo, la]) => [(lo - lo0) * KX, (la0 - la) * KY];
    const line = pts => 'M' + pts.map(p => P(p).map(n => n.toFixed(1)).join(',')).join('L');
    // the caption covers the bottom of a wide screen and the top of a tall one: the spot in focus sits clear of it
    // (top: how much of the top a page header covers; a wide screen's caption covers roughly the bottom quarter)
    const FY = AR < 1.1 || W <= 900 ? .6 : (top + .75) / 2;
    // a step's width is for a wide screen; a tall one shows less width (and more height) of the same ground
    const NARROW = Math.min(1, Math.max(.55, AR / 1.6)), TXT = Math.min(1, Math.max(.72, W / 1100));
    const view = (c, w0) => { const w = w0 * NARROW, [x, y] = P(c), h = w / AR; return [x - w / 2, y - h * FY, w, h]; };

    // text and pins keep their size on screen while the view zooms: each sits in a group scaled by metres per pixel
    let vb = null, mpp = 1; const floats = [];
    const fit = () => { mpp = vb[2] / (svg.clientWidth || W);
      for (const f of floats) { f.el.setAttribute('transform', `translate(${f.x.toFixed(1)},${f.y.toFixed(1)}) scale(${(mpp * TXT).toFixed(4)})${f.rot ? ` rotate(${f.rot.toFixed(1)})` : ''}`);
        if (f.maxw) f.el.style.display = vb[2] / NARROW > f.maxw ? 'none' : ''; }
      const mile = 1609.34, px = mile / mpp, half = px > 260;   // the scale bar: a mile, or half a mile on a close view
      el.querySelector('.evscale i').style.width = (half ? px / 2 : px).toFixed(0) + 'px';
      el.querySelector('.evscale span').textContent = half ? '½ mile' : '1 mile'; };
    const setVB = v => { vb = v; svg.setAttribute('viewBox', v.map(n => n.toFixed(1)).join(' ')); fit(); };
    const zoomTo = (to, ms) => {
      if (!vb || !ms) return setVB(to);
      const from = vb.slice(), t0 = performance.now();
      const f = now => { if (stopped) return; const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        setVB(from.map((v, i) => v + (to[i] - v) * e)); if (k < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    };
    const float = (parent, at, html, cls, rot, maxw) => {
      const [x, y] = P(at), g = document.createElementNS(NS, 'g'); g.setAttribute('class', cls || ''); g.innerHTML = html;
      parent.appendChild(g); const f = { el: g, x, y, rot, maxw }; floats.push(f); return g;
    };

    // labels and pins first, so the story reads even before (or without) the ground
    for (const [name, at, kind, o = {}] of spec.labels || []) {
      const side = o.a === 'e' ? ' x="7" style="text-anchor:start"' : o.a === 'w' ? ' x="-7" style="text-anchor:end"' : '';
      float(G('lab'), at, kind === 'town' ? `<circle r="4.5"/><text y="-9">${esc(name)}</text>` : `<text${side}>${esc(name)}</text>`, 'l ' + (kind || ''), 0, o.w);
    }
    const pins = {};
    for (const [pid, p] of Object.entries(spec.pins || {})) {
      pins[pid] = float(G('pins'), p.at, `<circle class="halo" r="15"/><circle class="dot" r="6.5"/>` +
        `<text class="pn" x="12" y="-3">${esc(p.name)}</text>${p.sub ? `<text class="ps" x="12" y="14">${esc(p.sub)}</text>` : ''}`, 'pin ' + (p.side || 'n'));
    }
    // a period map as the ground (a georeferenced scan, north up): placed by its corner coordinates
    if (spec.image) { const [x0, y0] = P(spec.image.tl), [x1, y1] = P(spec.image.br);
      G('img').innerHTML = `<image href="${spec.image.src}" x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${(y1 - y0).toFixed(1)}" preserveAspectRatio="none"/>`; }
    setVB(view(spec.view.at, spec.view.w));

    if (spec.geo !== false) load(spec.geo || id).then(geo => {
      if (stopped || !geo) return;
      G('ctr').innerHTML = (geo.contours || []).map(([lev, pts]) => `<path class="${lev % 50 ? '' : 'ix'}" d="${line(pts)}"/>`).join('');
      G('wat').innerHTML = Object.entries(geo.streams || {}).flatMap(([n, ls]) => ls.map(pts => `<path${(spec.rivers || []).includes(n) ? ' class="big"' : ''} d="${line(pts)}"/>`)).join('');
      G('tn').innerHTML = (geo.roads.town || []).map(pts => `<path d="${line(pts)}"/>`).join('');
      G('rd').innerHTML = Object.entries(geo.roads || {}).filter(([n]) => n !== 'town').flatMap(([, ls]) => ls).map(pts => `<path d="${line(pts)}"/>`).join('');
      // road names, turned to run along the road at the nearest stretch
      for (const [name, at, maxw] of spec.roads || []) {
        const ls = (geo.roads || {})[name] || []; let best = null;
        for (const pts of ls) for (let i = 1; i < pts.length; i++) {
          const a = P(pts[i - 1]), b = P(pts[i]), m = P(at), d = Math.hypot((a[0] + b[0]) / 2 - m[0], (a[1] + b[1]) / 2 - m[1]);
          if (!best || d < best.d) best = { d, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI,
            mid: [(pts[i - 1][0] + pts[i][0]) / 2, (pts[i - 1][1] + pts[i][1]) / 2] };
        }
        let ang = best ? best.ang : 0; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
        float(G('rlab'), best ? best.mid : at, `<text y="-5">${esc(name)}</text>`, 'r', ang, maxw);
      }
      fit();
    });

    // the story: zoom, then the caption, then the pins it names
    const say = st => { cap.classList.remove('on');
      later(() => { cap.querySelector('.k').innerHTML = st.k || ''; cap.querySelector('.t').innerHTML = st.t || ''; cap.classList.add('on'); }, 350); };
    let heads = [];
    const clearArrows = () => { G('arw').innerHTML = ''; const gone = new Set(heads); heads = []; for (let i = floats.length - 1; i >= 0; i--) if (gone.has(floats[i].el)) floats.splice(i, 1); };
    const arrow = pts => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', line(pts)); p.setAttribute('class', 'go');
      G('arw').appendChild(p); const L = p.getTotalLength ? p.getTotalLength() : 0, slow = L && !REDUCED;
      if (slow) { p.style.strokeDasharray = `${L} ${L}`; p.style.strokeDashoffset = L; requestAnimationFrame(() => { p.style.transition = 'stroke-dashoffset 2.4s ease'; p.style.strokeDashoffset = 0; }); }
      // the head: a small triangle, turned along the last stretch, that lands as the line arrives
      const a = P(pts[pts.length - 2]), b = P(pts[pts.length - 1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
      const h = float(G('arw'), pts[pts.length - 1], '<polygon points="4,0 -9,-6.5 -9,6.5"/>', 'head' + (slow ? ' wait' : ''), ang); heads.push(h); fit();
      if (slow) later(() => h.classList.remove('wait'), 2300); };
    let t = 600;
    steps.forEach((st, j) => {
      later(() => {
        zoomTo(view(st.at || spec.view.at, st.w || spec.view.w), j ? ZOOM : 0);
        el.querySelectorAll('.pin.on').forEach(p => p.classList.remove('on'));
        clearArrows();
        (st.pins || []).forEach(pid => { if (pins[pid]) pins[pid].classList.add('shown', 'on'); });
        if (st.arrow) later(() => arrow(st.arrow), ZOOM * .6);
        say(st);
      }, t);
      const vj = spec.steps.indexOf(st), spoken = voice ? voice.dur(vj) : 0;
      if (spoken) later(() => voice.play(vj), t + (j ? ZOOM * .5 : 0) + 700);
      t += (j ? ZOOM : 0) + Math.max(readMs(st), spoken ? spoken + (j ? ZOOM * .5 : 0) + 2000 : 0);
    });
    const stop = () => { stopped = true; timers.forEach(clearTimeout); };
    stop.duration = t + 1200;
    return stop;
  }
  window.FAMILYVIS = Object.assign(window.FAMILYVIS || {}, { event });
})();
