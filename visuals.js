/* Timeline and migration-map scenes for the Family Tree channel. Both draw into a container as SVG and animate
   themselves; the walkthrough (walk.js) and the browse pages (app.js) share them via window.FAMILYVIS.
   The map uses d3-geo and topojson-client (loaded in index.html) with Natural Earth land from world-atlas; without
   them it still draws the routes on a plain sea. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const yearOf = a => { const m = ((a.born || {}).date || a.years || '').match(/\d{4}/); return m ? +m[0] : null; };
  const deathOf = a => { const m = ((a.died || {}).date || '').match(/\d{4}/); if (m) return +m[0]; const n = (a.years || '').match(/–(\d{4})/); return n ? +n[1] : null; };

  // --- the five-century timeline -------------------------------------------------------------------------------
  // Each direct line is a stack of lifespans; world events are flags on the axis. A playhead sweeps the years.
  const EVENTS = {
    h: [
      [1588, 'George marries Alice, Broadwindsor'], [1620, 'The Mayflower'], [1659, 'Southwicks banished from Salem'], [1712, 'Thomas Hutchins in Salem'],
      [1762, 'Ebenezer Dana dies at Havana'], [1775, 'Lexington, Concord, Bunker Hill'], [1825, 'Erie Canal opens'], [1861, 'Civil War'], [1918, 'Harold Bucher marries Marion Muir'],
      [1944, 'World War II'], [1954, 'Richard and Marion marry'], [1985, 'DeWitt born'],
    ],
    c: [
      [1732, 'The Wenderoths land at Philadelphia'], [1776, 'Revolution: Johann Jacob Winteroth'], [1809, 'The Staebells marry at Stundwiller'], [1836, 'The Fritzes in Ohio'], [1853, 'Staebell, Schmitts arrive'], [1863, 'Edward Wintrode at Gettysburg'],
      [1880, 'West to Illinois and Iowa'], [1910, 'Jackson marries Duffy'], [1920, 'Parker, South Dakota'],
      [1943, 'Maksimows deported'], [1944, 'Maurice taken prisoner'], [1956, 'The Maksimows fly in'], [1992, 'Christine born'],
    ],
  };
  function timeline(el, { lines, from = 1520, to = 2030, sweep = 16000, events = EVENTS.h }) {
    const W = 1600, H = 820, L = 150, R = 40, top = 70, axisY = H - 90, x = y => L + (y - from) / (to - from) * (W - L - R);
    const rows = lines.reduce((n, l) => n + l.people.length, 0), gap = 10, rowH = Math.min(30, (axisY - top - 30 - gap * lines.length) / rows);
    // a tall screen (a phone) would shrink five centuries to a strip: show a slice of them at a readable size, the
    // view following the playhead, the line names pinned to its left edge
    const bx = el.getBoundingClientRect(), follow = !REDUCED && bx.width > 0 && bx.height > bx.width * 1.05;
    const VW = follow ? Math.max(380, Math.min(W, H * bx.width / bx.height)) : W;
    let svg = `<svg viewBox="0 0 ${VW} ${H}" class="tl${follow ? ' follow' : ''}" preserveAspectRatio="xMidYMid meet">`;
    for (let y = Math.ceil(from / 50) * 50; y <= to; y += 50) svg += `<line class="grid" x1="${x(y)}" y1="${top - 20}" x2="${x(y)}" y2="${axisY}"/><text class="yr" x="${x(y)}" y="${axisY + 30}">${y}</text>`;
    let yy = top;
    const bars = [];
    for (const l of lines) {
      svg += follow ? `<text class="ln" x="12" y="${yy + rowH * .7}" fill="${l.color}">${l.name}</text>` : `<text class="ln" x="${L - 16}" y="${yy + rowH * .7}" text-anchor="end" fill="${l.color}">${l.name}</text>`;
      for (const p of l.people) {
        const born = ((p.born || {}).date || (/^\d/.test(p.years || '') ? p.years : '')).match(/\d{4}/), dd = deathOf(p);
        const guess = !born && dd ? dd - 78 : null;   // no birth on record: draw an estimated span ending at the death
        const b = born ? +born[0] : guess, d = p.living ? 2026 : (dd || (b ? b + 60 : null)); if (!b) { yy += rowH; continue; }
        bars.push({ b, d, x0: x(b), x1: x(d), y: yy, h: rowH - 6, c: l.color, name: p.name.replace(/\s*\(.*?\)/g, ''), est: !p.living && !dd, guess });
        yy += rowH;
      }
      yy += gap;
    }
    for (const [i, br] of bars.entries())
      svg += `<g class="bar" data-b="${br.b}"><rect x="${br.x0}" y="${br.y}" width="${Math.max(4, br.x1 - br.x0)}" height="${br.h}" rx="${br.h / 2}" fill="${br.c}" opacity="${br.est ? .45 : .85}"/>` +
        (br.x1 > W - 330 ? `<text class="nm" x="${br.x0 - 8}" y="${br.y + br.h * .78}" text-anchor="end">` : `<text class="nm" x="${br.x1 + 8}" y="${br.y + br.h * .78}">`) +
        `${br.name} <tspan class="dt">${br.guess ? 'd. ' + br.d : br.b + (br.est ? '' : '–' + (br.d === 2026 ? '' : br.d))}</tspan></text></g>`;
    events.filter(([y]) => y >= from && y <= to).forEach(([y, t], i) =>
      svg += `<g class="ev" data-b="${y}"><line x1="${x(y)}" y1="${axisY}" x2="${x(y)}" y2="${axisY - 14}"/><circle cx="${x(y)}" cy="${axisY}" r="5"/>` +
        `<text x="${x(y)}" y="${axisY + [52, 70, 88][i % 3]}" text-anchor="middle">${t}</text></g>`);
    svg += `<line class="axis" x1="${L}" y1="${axisY}" x2="${W - R}" y2="${axisY}"/><line class="head" id="tlHead" x1="${x(from)}" y1="${top - 30}" x2="${x(from)}" y2="${axisY}"/>` +
      `<text class="headyr" id="tlYear" x="${x(from)}" y="${top - 38}" text-anchor="middle">${from}</text></svg>`;
    el.innerHTML = svg;
    const head = el.querySelector('#tlHead'), hy = el.querySelector('#tlYear'), gs = [...el.querySelectorAll('.bar, .ev')];
    const sv = el.querySelector('svg'), lns = [...el.querySelectorAll('.ln')];
    if (REDUCED) { gs.forEach(g => g.classList.add('on')); head.style.display = hy.style.display = 'none'; return () => {}; }
    let t0 = performance.now(), raf = 0, stop = false;
    const step = now => {
      if (stop) return;
      const f = Math.min(1, (now - t0) / sweep), y = from + (2026 - from) * (1 - Math.pow(1 - f, 1.6)), X = x(y);
      head.setAttribute('x1', X); head.setAttribute('x2', X); hy.setAttribute('x', X); hy.textContent = Math.floor(y);
      if (follow) { const vx = Math.max(0, Math.min(W - VW, X - VW * .62)); sv.setAttribute('viewBox', `${vx.toFixed(1)} 0 ${VW.toFixed(1)} ${H}`); lns.forEach(t => t.setAttribute('x', vx + 12)); }
      gs.forEach(g => g.classList.toggle('on', +g.dataset.b <= y));
      el.querySelectorAll('.bar.on rect').forEach(r => { const b = +r.parentNode.dataset.b, full = +r.getAttribute('data-w') || (r.setAttribute('data-w', r.getAttribute('width')), +r.getAttribute('width'));
        r.setAttribute('width', Math.max(4, Math.min(full, X - x(b)))); });
      if (f < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { stop = true; cancelAnimationFrame(raf); };
  }

  // --- the migration map -----------------------------------------------------------------------------------------
  // Natural Earth (public domain) cut down to the two regions the families moved through: family/geo/ne.json holds
  // land at two detail levels, coastlines, country borders, US state and Canadian province lines, lakes, the rivers
  // they lived along, and reference cities. Built with mapshaper from the Natural Earth 10m/50m GeoJSON.
  const P = {
    'Broadwindsor': [-2.80, 50.82], 'Salem, MA': [-70.90, 42.52], 'Dudley, MA': [-71.93, 42.05], 'Pomfret, CT': [-71.96, 41.90],
    'Vermont': [-72.6, 44.1], 'Fort Covington, NY': [-74.49, 44.99], 'Saranac, NY': [-73.74, 44.64], 'Malone, NY': [-74.29, 44.85], 'Stamford, CT': [-73.54, 41.05],
    'Bangor, NY': [-74.39, 44.81], 'Dalserf, Scotland': [-3.92, 55.73], 'Trout River, Quebec': [-74.30, 45.01],
    'Switzerland': [7.45, 46.95], 'Northampton, PA': [-75.50, 40.69], 'Milton, PA': [-76.85, 41.01], 'Watsontown, PA': [-76.86, 41.08],
    'Mount Lebanon, PA': [-80.05, 40.37], 'Washington, DC': [-77.04, 38.90],
    'DeWitt, NY': [-76.07, 43.03], 'Syracuse, NY': [-76.15, 43.05], 'Olean, NY': [-78.43, 42.08], 'New Kensington, PA': [-79.76, 40.57],
    'Alsace': [7.97, 49.03], 'Stundwiller, Alsace': [8.03, 48.98], 'Tiffin, OH': [-83.18, 41.11], 'Buffalo, NY': [-78.88, 42.89],
    'Freeport, IL': [-89.62, 42.30], 'Carroll County, IL': [-89.93, 42.07], 'Barclay, IA': [-92.2, 42.55], 'Parker, SD': [-97.14, 43.40],
    'Bammental': [8.78, 49.36], 'Philadelphia, PA': [-75.16, 39.95], 'Frederick, MD': [-77.41, 39.41], 'Bavaria': [11.4, 48.9], 'Littlestown, PA': [-77.09, 39.74], 'Gettysburg, PA': [-77.23, 39.83], 'Franklin Grove, IL': [-89.30, 41.84],
    'Ida Grove, IA': [-95.47, 42.34], 'West Hartford, CT': [-72.74, 41.76],
    'St. Louis, MO': [-90.20, 38.63], 'Brooklyn, NY': [-73.95, 40.65], 'Hoboken, NJ': [-74.03, 40.74],
    'Leiden': [4.49, 52.16], 'Little Compton, RI': [-71.17, 41.51], 'Mansfield, CT': [-72.23, 41.79], 'South Kingstown, RI': [-71.52, 41.45], 'Weybridge, VT': [-73.21, 44.04], 'Plymouth, England': [-4.14, 50.37], 'Plymouth, MA': [-70.67, 41.96], 'Duxbury, MA': [-70.67, 42.04], 'Dartmouth, MA': [-70.97, 41.59], 'Wayne County, PA': [-75.26, 41.57], 'Slate Hill, NY': [-74.49, 41.38], 'Atlantic City, NJ': [-74.42, 39.36],
    'Hamburg': [9.99, 53.55], 'Luga, Russia': [29.85, 58.74], 'Weener, Germany': [7.35, 53.17], 'Varel, Germany': [8.14, 53.40], 'Paterson, NJ': [-74.17, 40.92], 'Southbury, CT': [-73.21, 41.48],
  };
  // Each line's moves in order, with the year the family is first documented there (null where no record gives one).
  // Christine's side runs her mother's lines first, then her father's.
  const ROUTES = {
    h: [
      { name: 'Hutchins', color: '#d8b46a', stops: [['Broadwindsor', 1532], ['Salem, MA', 1712], ['Dudley, MA', 1747], ['Pomfret, CT', 1770], ['Vermont', 1795], ['Malone, NY', 1818], ['Fort Covington, NY', 1847], ['Saranac, NY', 1918], ['Stamford, CT', 1985]] },
      { name: 'Watson', color: '#9fbf9f', stops: [['Dalserf, Scotland', 1797], ['Trout River, Quebec', 1825], ['Saranac, NY', 1918]] },
      { name: 'Southworth', color: '#cfd9a8', stops: [['Leiden', 1613], ['Plymouth, MA', 1628], ['Duxbury, MA', 1640], ['Little Compton, RI', 1686], ['Mansfield, CT', 1720], ['South Kingstown, RI', 1791], ['Weybridge, VT', 1800], ['Bangor, NY', 1835], ['Fort Covington, NY', 1870]] },
      { name: 'Soule', color: '#e6d39a', stops: [['Plymouth, England', 1620], ['Plymouth, MA', 1620], ['Duxbury, MA', 1639], ['Dartmouth, MA', 1671], ['Wayne County, PA', 1767], ['Slate Hill, NY', 1801], ['Atlantic City, NJ', 1894], ['Mount Lebanon, PA', 1929]] },
      { name: 'Bucher', color: '#c99a86', stops: [['Switzerland', 1808], ['Northampton, PA', 1827], ['Milton, PA', 1850], ['Watsontown, PA', 1889], ['Mount Lebanon, PA', 1934], ['Washington, DC', 1954]] },
      { name: 'Snyder', color: '#8fa6c9', stops: [['DeWitt, NY', 1849], ['Syracuse, NY', 1927], ['Washington, DC', 1954]] },
      { name: 'Hammond', color: '#e0a8c0', stops: [['Olean, NY', 1895], ['New Kensington, PA', 1910]] },
    ],
    c: [
      { name: 'Wintrode', color: '#d8b46a', stops: [['Bammental', 1705], ['Philadelphia, PA', 1732], ['Frederick, MD', 1735], ['Littlestown, PA', 1798], ['Gettysburg, PA', 1864], ['Franklin Grove, IL', 1880], ['Ida Grove, IA', 1900], ['Parker, SD', 1920], ['West Hartford, CT', null]] },
      { name: 'Fritz', color: '#8fa6c9', stops: [['Alsace', 1807], ['Tiffin, OH', 1836], ['Carroll County, IL', 1860], ['Barclay, IA', 1870], ['Parker, SD', 1920]] },
      { name: 'Staebell', color: '#b7c7e6', stops: [['Stundwiller, Alsace', 1828], ['Freeport, IL', 1853], ['Barclay, IA', 1863]] },
      { name: 'Phillips', color: '#d9c2e8', stops: [['Stundwiller, Alsace', 1831], ['Buffalo, NY', 1853], ['Freeport, IL', 1855]] },
      { name: 'Schmitt', color: '#a8d0c0', stops: [['Bavaria', 1835], ['Tiffin, OH', 1853], ['Freeport, IL', 1856], ['Barclay, IA', 1860]] },
      { name: 'Jackson', color: '#c99a86', stops: [['St. Louis, MO', 1883], ['Hoboken, NJ', 1915], ['Brooklyn, NY', 1934]] },
      { name: 'Duffy', color: '#e0a8c0', stops: [['Brooklyn, NY', 1892]] },
      { name: 'Maksimow', color: '#e6d39a', stops: [['Luga, Russia', 1937], ['Weener, Germany', 1943], ['Varel, Germany', 1949], ['Hamburg', 1956], ['Paterson, NJ', 1956], ['Southbury, CT', 1992]] },
    ],
  };
  // place names on the map: [label, [lon, lat], kind, shown from zoom level 0 (overview) or 1 (close-up)]
  const REGIONS = [
    ['Atlantic Ocean', [-42, 43], 'ocean', 0], ['North Sea', [3.2, 56.2], 'ocean', 1], ['Lake Ontario', [-77.9, 43.65], 'water', 1], ['Lake Erie', [-81.2, 42.2], 'water', 1],
    ['Lake Michigan', [-87.0, 43.4], 'water', 1], ['Lake Champlain', [-73.0, 44.6], 'water', 2],
    ['England', [-1.4, 52.4], 'cty', 0], ['Scotland', [-4.1, 56.9], 'cty', 0], ['France', [2.4, 46.9], 'cty', 0], ['Germany', [10.2, 51.2], 'cty', 0],
    ['Switzerland', [8.3, 46.6], 'cty', 1], ['Canada', [-78, 48.6], 'cty', 0], ['United States', [-86, 36.4], 'cty', 0],
    ['Quebec', [-72.3, 47.0], 'st', 1], ['Ontario', [-80.4, 45.4], 'st', 1], ['New York', [-75.4, 42.75], 'st', 1], ['Pennsylvania', [-77.7, 40.95], 'st', 1],
    ['Vermont', [-72.75, 44.25], 'st', 2], ['Massachusetts', [-71.8, 42.4], 'st', 2], ['Connecticut', [-72.7, 41.55], 'st', 2], ['New Jersey', [-74.5, 40.1], 'st', 2],
    ['Ohio', [-82.7, 40.3], 'st', 1], ['Illinois', [-89.2, 40.0], 'st', 1], ['Iowa', [-93.5, 42.0], 'st', 1], ['South Dakota', [-99.0, 44.4], 'st', 1],
    ['Missouri', [-92.5, 38.4], 'st', 1], ['Michigan', [-84.6, 43.6], 'st', 1], ['Indiana', [-86.2, 40.0], 'st', 1], ['Wisconsin', [-89.8, 44.6], 'st', 1],
    ['Minnesota', [-94.5, 45.8], 'st', 1], ['Nebraska', [-99.0, 41.5], 'st', 1], ['Maryland', [-76.9, 39.35], 'st', 2], ['Maine', [-69.2, 45.3], 'st', 1],
    ['New Hampshire', [-71.6, 43.6], 'st', 2], ['Virginia', [-78.6, 37.6], 'st', 1], ['Alsace', [7.6, 48.4], 'st', 1], ['Dorset', [-2.4, 50.95], 'st', 1], ['Bavaria', [11.6, 48.6], 'st', 1],
  ];
  const RIVERS = ['St. Lawrence', 'Hudson', 'Mississippi', 'Ohio', 'Susquehanna', 'Missouri', 'Rhine', 'Elbe', 'Connecticut', 'Delaware', 'Potomac', 'Allegheny', 'Mohawk'];
  let GEO = null;
  async function geo() {
    if (GEO || !window.topojson) return GEO;
    try {
      const t = await fetch('geo/ne.json?v=1').then(r => r.json()), f = k => topojson.feature(t, t.objects[k]);
      GEO = { land50: f('land50'), land10: [f('land10na'), f('land10eu')], coast50: f('coast50'), coast10: [f('coast10na'), f('coast10eu')],
        borders: f('borders'), states: f('states'), lakes: f('lakes'), rivers: f('rivers'), cities: f('cities') };
    } catch (e) {
      try { const w = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json').then(r => r.json()); GEO = { land50: topojson.feature(w, w.objects.land) }; } catch (e2) { GEO = null; }
    }
    return GEO;
  }
  const near = (a, b, d) => Math.abs(a[0] - b[0]) < d && Math.abs(a[1] - b[1]) < d * .7;

  function map(el, { side = 'h' } = {}) {
    // a tall screen gets a tall map; TS keeps a 20-unit name at least 12.5px on screen, DS grows the dots a little less
    const bx = el.getBoundingClientRect(), W = 1600, H = bx.width > 0 && bx.height > bx.width * 1.05 ? Math.round(W * bx.height / bx.width) : 820, routes = ROUTES[side];
    const fit = bx.width > 0 ? Math.min(bx.width / W, bx.height / H) : 1, TS = Math.max(1, 12.5 / (20 * fit)), DS = Math.min(TS, 1.8);
    let stopped = false; const timers = [], later = (f, t) => timers.push(setTimeout(() => { if (!stopped) f(); }, t));
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="mp" preserveAspectRatio="xMidYMid meet"><defs><radialGradient id="mpSea" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#12203a"/><stop offset="1" stop-color="#0a1222"/></radialGradient></defs>` +
      `<rect x="-4000" y="-4000" width="12000" height="12000" fill="url(#mpSea)"/><g class="grat"></g><g class="land"></g><g class="lakes"></g><g class="rivers"></g><g class="bord"></g><g class="coast"></g>` +
      `<g class="ctx"></g><g class="rt"></g><g class="pts"></g><g class="lbl"></g></svg>` +
      `<div class="mkey">${routes.map(r => `<span data-r="${r.name}"><i style="background:${r.color}"></i>${r.name}</span>`).join('')}</div><div class="mcap" id="mcap"></div>`;
    const svg = el.querySelector('svg'), cap = el.querySelector('.mcap');
    const G = c => svg.querySelector('.' + c);
    const all = routes.flatMap(r => r.stops.map(s => P[s[0]])), amer = all.filter(p => p[0] < -50);
    const lon = ps => [Math.min(...ps.map(p => p[0])), Math.max(...ps.map(p => p[0]))], lat = ps => [Math.min(...ps.map(p => p[1])), Math.max(...ps.map(p => p[1]))];
    let proj, path = null, projA = null;
    {
      const [x0, x1] = lon(all), [y0, y1] = lat(all);
      if (window.d3 && d3.geoConicConformal) {
        proj = d3.geoConicConformal().rotate([35, 0]).parallels([38, 55]).fitExtent([[80, 80], [W - 80, H - 80]], { type: 'MultiPoint', coordinates: [[x0 - 3, y0 - 3], [x1 + 4, y1 + 3], [x0 - 3, y1 + 3], [x1 + 4, y0 - 3]] });
        path = d3.geoPath(proj);
        // America upright: centred on the stops west of the Atlantic, the way a US map is drawn
        if (amer.length) { const [a0, a1] = lon(amer), [b0, b1] = lat(amer), mid = (a0 + a1) / 2;
          projA = d3.geoConicConformal().rotate([-mid, 0]).parallels([33, 45]).fitExtent([[80, 80], [W - 80, H - 80]], { type: 'MultiPoint', coordinates: [[a0 - 4, b0 - 3], [a1 + 4, b1 + 3], [a0 - 4, b1 + 3], [a1 + 4, b0 - 3]] }); }
      } else proj = ([lo, la]) => [80 + (lo - x0 + 3) / (x1 - x0 + 7) * (W - 160), 80 + (y1 + 3 - la) / (y1 - y0 + 6) * (H - 160)];
    }
    const xy = name => proj(P[name]);
    // a view box round some projected points, padded, at the screen's shape, never closer than minW
    const boxAround = (pts, minW = 260, padX = 1.45, padY = 1.6) => {
      const Q = pts.map(p => proj(p)), bx0 = Math.min(...Q.map(p => p[0])), bx1 = Math.max(...Q.map(p => p[0])), by0 = Math.min(...Q.map(p => p[1])), by1 = Math.max(...Q.map(p => p[1]));
      let zw = Math.max(bx1 - bx0, minW) * padX, zh = Math.max(by1 - by0, minW * .55) * padY; if (zw / zh > W / H) zh = zw * H / W; else zw = zh * W / H;
      return [(bx0 + bx1) / 2 - zw / 2, (by0 + by1) / 2 - zh * .44, zw, zh];   // a little more room below, for the caption
    };
    let america = boxAround(amer); const full = [0, 0, W, H];
    let vb = full, scale = 1;
    const setVB = v => { vb = v; svg.setAttribute('viewBox', v.map(n => n.toFixed(1)).join(' ')); };
    // while the view flies, names fade out and dots keep their size on screen; everything is re-placed on landing
    let flying = false;
    const sizeDots = () => { const k = vb[2] / W; svg.querySelectorAll('.pts circle').forEach(c => { c.setAttribute('r', 7 * k * DS); c.style.strokeWidth = (2 * k * DS) + 'px'; });
      svg.querySelectorAll('.pts .from').forEach(t => t.style.fontSize = (20 * k * TS) + 'px');
      svg.querySelectorAll('.lbl > *, .ctx > *').forEach(e => e._it && put(e)); };
    // labels are kept, not redrawn: each knows its anchor point and its offset and size in screen units, so it can be
    // re-sized every frame of a zoom; only a name that is new to the map animates in
    const put = e => { const it = e._it, k = vb[2] / W;
      if (it.tag === 'circle') { e.setAttribute('cx', it.ax); e.setAttribute('cy', it.ay); e.setAttribute('r', it.r * k * DS); return; }
      e.setAttribute('x', it.ax + it.ox * k); e.setAttribute('y', it.ay + it.oy * k); e.style.fontSize = (it.base * k) + 'px'; if (it.sw) e.style.strokeWidth = (it.sw * k) + 'px'; };
    const sync = (g, items) => {
      const old = new Map([...g.children].map(e => [e.dataset.key, e])), keep = new Set();
      for (const it of items) {
        let e = old.get(it.key);
        if (!e || e.tagName.toLowerCase() !== it.tag) { if (e) e.remove(); e = document.createElementNS(NS, it.tag); e.dataset.key = it.key; e.classList.add('nw'); g.appendChild(e); setTimeout(() => e.classList.remove('nw'), 900); }
        const fresh = e.classList.contains('nw'); e.setAttribute('class', it.cls + (fresh ? ' nw' : ''));
        if (it.tag === 'text') { e.setAttribute('text-anchor', it.anchor); if (e._html !== it.html) { e.innerHTML = it.html; e._html = it.html; } }
        e._it = it; put(e); keep.add(it.key);
      }
      for (const [k, e] of old) if (!keep.has(k)) e.remove();
    };
    const item = (key, cls, x, y, at, fs, sw, html) => ({ key, cls, tag: 'text', ax: x, ay: y, ox: (at[0] - x) / scale, oy: (at[1] - y) / scale, anchor: at[2], base: fs / scale, sw: sw / scale, html });
    const zoomTo = (to, ms, then) => { const done = () => { scale = to[2] / W; flying = false; svg.classList.remove('flying'); marks(); then && then(); };
      if (REDUCED) { setVB(to); return done(); } const from = vb.slice(), t0 = performance.now(); flying = true; svg.classList.add('flying');
      const f = now => { if (stopped) return; const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; setVB(from.map((v, i) => v + (to[i] - v) * e)); sizeDots(); if (k < 1) requestAnimationFrame(f); else done(); };
      requestAnimationFrame(f); };

    // the base map, drawn once; strokes keep their width on screen as the view zooms
    const drawBase = g => {
      if (stopped || !g || !path) return;
      const d = f => path(f) || '';
      G('grat').innerHTML = `<path d="${path(d3.geoGraticule().step([5, 5])())}"/>`;
      G('land').innerHTML = `<path d="${d(g.land50)}"/>` + (g.land10 || []).map(f => `<path d="${d(f)}"/>`).join('');
      if (g.lakes) G('lakes').innerHTML = `<path d="${d(g.lakes)}"/>`;
      if (g.rivers) G('rivers').innerHTML = g.rivers.features.map(f => `<path d="${d(f)}" data-n="${f.properties.name}"/>`).join('');
      if (g.states) G('bord').innerHTML = `<path class="st" d="${d(g.states)}"/>`;
      if (g.borders) G('bord').insertAdjacentHTML('beforeend', `<path class="ct" d="${d(g.borders)}"/>`);
      G('coast').innerHTML = (g.coast10 ? `<path class="z" d="${(g.coast10 || []).map(d).join('')}"/>` : '') + (g.coast50 ? `<path class="o" d="${d(g.coast50)}"/>` : '');
      marks();
    };
    geo().then(drawBase);

    // --- stops reached so far, their labels, and the place names around them -----------------------------------
    const reached = [];   // {name, year, color}
    const finals = new Set(routes.map(r => r.stops[r.stops.length - 1][0]));
    const lastAt = new Map(); let inUS = false;
    function marks() {
      if (flying) return;
      const lvl = inUS ? (scale > .8 ? 1 : 2) : scale > .8 ? 0 : scale > .38 ? 1 : 2;   // the upright US view always shows states and towns
      svg.classList.toggle('zoomed', lvl > 0);
      const boxes = [], dots = [];
      const inside = b => b[0] > vb[0] + 4 * scale && b[2] < vb[0] + vb[2] - 4 * scale && b[1] > vb[1] + 4 * scale && b[3] < vb[1] + vb[3] * .88
        && !(b[0] < vb[0] + vb[2] * .14 && b[3] > vb[1] + vb[3] * .68);   // the caption and the colour key sit there
      const ov = (b, list) => list.reduce((s, o) => s + Math.max(0, Math.min(b[2], o[2]) - Math.max(b[0], o[0])) * Math.max(0, Math.min(b[3], o[3]) - Math.max(b[1], o[1])), 0);
      const overlap = b => ov(b, boxes) + 12 * ov(b, dots);   // covering another family's dot is worse than touching a label
      const place = (x, y, text, fs, force, centre, far) => {
        const w = text.length * fs * .52, h = fs * 1.1, opts = [];
        if (centre) opts.push([x, y + h * .35, 'middle']);
        for (const m of far ? [.55, 1.8, 3.2] : [.5, .95, 1.5]) { const o = fs * m;
          opts.push([x + o, y + h * .35, 'start'], [x - o, y + h * .35, 'end'], [x + o, y - o * .6, 'start'], [x + o, y + o * .6 + h * .8, 'start'], [x - o, y - o * .6, 'end'], [x - o, y + o * .6 + h * .8, 'end'], [x, y - o - h * .2, 'middle'], [x, y + o + h, 'middle']); }
        const boxOf = ([tx, ty, an]) => { const bx = an === 'end' ? tx - w : an === 'middle' ? tx - w / 2 : tx; return [bx, ty - h, bx + w, ty]; };
        // a label that already has a spot keeps it while it still fits, so names don't hop as new stops appear
        const was = lastAt.get(text); if (was) { const op = [x + was[0] * fs, y + was[1] * fs, was[2]], b = boxOf(op); if (inside(b) && !overlap(b)) { boxes.push(b); return op; } }
        const keep = op => { lastAt.set(text, [(op[0] - x) / fs, (op[1] - y) / fs, op[2]]); return op; };
        for (const op of opts) { const b = boxOf(op); if (inside(b) && !overlap(b)) { boxes.push(b); return keep(op); } }
        if (!force) return null;
        const best = opts.filter(op => inside(boxOf(op))).sort((p, q) => overlap(boxOf(p)) - overlap(boxOf(q)))[0] || opts[0];
        boxes.push(boxOf(best)); return keep(best);
      };
      // dots first, so every label keeps clear of them
      const seen = new Map(); reached.forEach(s => { if (!seen.has(s.name)) seen.set(s.name, s); else if (s.year && !seen.get(s.name).year) seen.set(s.name, s); });
      let pts = '';
      reached.forEach(s => { const [x, y] = xy(s.name), r = 7 * scale * DS; dots.push([x - r, y - r, x + r, y + r]); pts += `<circle cx="${x}" cy="${y}" r="${r}" fill="${s.color}" style="stroke-width:${2 * scale * DS}px"/>`; });
      G('pts').innerHTML = pts + fromNote();
      const lbl = [];
      for (const [name, s] of seen) { const [x, y] = xy(name); if (x < vb[0] || x > vb[0] + vb[2] || y < vb[1] || y > vb[1] + vb[3]) continue;   // off screen: no label
        const fs = 20 * scale * TS, short = name.replace(/, [A-Z]{2}$/, ''), text = short + (s.year ? ' ' + s.year : ''), at = place(x, y, text, fs, true);
        if (at) lbl.push(item('p:' + name, 'pl', x, y, at, fs, 5 * scale * TS, `${short}${s.year ? ` <tspan>${s.year}</tspan>` : ''}`)); }
      // reference cities: close-ups only, and none on top of a family stop
      const ctx = [];
      if (lvl > 0 && GEO && GEO.cities) for (const f of GEO.cities.features) {
        const c = f.geometry.coordinates; if (Object.values(P).some(p => near(p, c, .5))) continue;
        const [x, y] = proj(c), fs = 13 * scale * TS, nm = f.properties.name.replace(/,\s+D\.C\./, ''); if (x < vb[0] || x > vb[0] + vb[2] || y < vb[1] || y > vb[1] + vb[3]) continue;
        const at = place(x, y, nm, fs, false, false, true); if (!at) continue; boxes.push([x - 3 * scale, y - 3 * scale, x + 3 * scale, y + 3 * scale]);
        ctx.push({ key: 'cd:' + nm, cls: 'cd', tag: 'circle', ax: x, ay: y, r: 2.6 }, item('cn:' + nm, 'cn', x, y, at, fs, 3.5 * scale * TS, nm));
      }
      // regions, seas and lakes
      for (const [nm, ll, kind, from] of REGIONS) { if (lvl < from) continue;
        const [x, y] = proj(ll), fs = (kind === 'ocean' ? 26 : kind === 'cty' ? (lvl ? 22 : 17) : kind === 'water' ? 14 : 15) * scale * TS;
        const text = kind === 'water' ? nm : nm.toUpperCase(), at = place(x, y, text + '  ', fs, false, true);
        if (at) ctx.push(item('rg:' + nm, 'rg ' + kind, x, y, at, fs, 0, text)); }
      // river names, on the middle of each river's longest stretch inside the view
      if (lvl > 0 && GEO && GEO.rivers) for (const rn of RIVERS) {
        let best = null; GEO.rivers.features.filter(f => f.properties.name === rn || (rn === 'Rhine' && f.properties.name === 'Rhein')).forEach(f => {
          const parts = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates];
          parts.forEach(ln => { const q = ln.map(c => proj(c)).filter(([x, y]) => x > vb[0] && x < vb[0] + vb[2] && y > vb[1] && y < vb[1] + vb[3]); if (q.length > 4 && (!best || q.length > best.length)) best = q; }); });
        if (!best) continue; const m = best[Math.floor(best.length / 2)], fs = 13 * scale * TS, at = place(m[0], m[1], rn + ' R.', fs, false, true);
        if (at) ctx.push(item('rv:' + rn, 'rv', m[0], m[1], at, fs, 3.5 * scale * TS, rn));
      }
      sync(G('ctx'), ctx); sync(G('lbl'), lbl);
    }
    const fromNotes = [];
    const fromNote = () => fromNotes.map(([x, y, t]) => `<text class="from" x="${x}" y="${y}" style="font-size:${20 * scale * TS}px">${t}</text>`).join('');
    const reach = (name, year, color) => { reached.push({ name, year, color }); marks(); };
    const caption = (r, name, year) => { cap.innerHTML = `<b style="color:${r.color}">${r.name}</b> · ${name.replace(/, ([A-Z]{2})$/, ', $1')}${year ? ` · <span>${year}</span>` : ''}`; cap.classList.add('on');
      el.querySelectorAll('.mkey span').forEach(s => s.classList.toggle('on', s.dataset.r === r.name)); };
    const arcs = [];
    const arcBy = (an, bn, color, dur, cls = '') => { arcs.push([an, bn, color, cls]); arc(xy(an), xy(bn), color, dur, cls); };
    const arc = (a, b, color, dur, cls = '') => { const dx = b[0] - a[0], dy = b[1] - a[1], dist = Math.hypot(dx, dy);
      // ocean crossings arch high; overland moves get a gentle bow to one side
      const ocean = cls === 'cross' || cls === 'in', k = ocean ? .12 : .16, lift = ocean ? Math.min(160 * scale, dist * .22) : 0;
      const cx = (a[0] + b[0]) / 2 - dy * k, cy = (a[1] + b[1]) / 2 + dx * k - lift;
      const p = document.createElementNS(NS, 'path'); p.setAttribute('d', `M${a[0]} ${a[1]} Q${cx} ${cy} ${b[0]} ${b[1]}`); p.setAttribute('class', 'arc ' + cls); p.setAttribute('stroke', color);
      G('rt').appendChild(p);
      if (cls === 'in') { p.style.strokeDasharray = '8 8'; return; }
      const len = p.getTotalLength() / scale + 2; if (REDUCED) return;   // non-scaling stroke: dashes are measured on screen
      p.style.strokeDasharray = `${len} ${len}`; p.style.strokeDashoffset = len;
      const an = p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: dur, easing: 'ease-in-out', fill: 'forwards' });
      an.onfinish = () => { p.style.strokeDasharray = 'none'; an.cancel(); }; };

    // act one: the whole ocean and each line's first crossing; act two: every line in close-up; then all of them
    let t = 300;
    const crossing = r => r.stops.findIndex(s => P[s[0]][0] < -50);
    routes.forEach(r => {
      const c = crossing(r);
      later(() => { caption(r, r.stops[0][0], r.stops[0][1]);
        if (r.from) { const [x, y] = xy(r.stops[0][0]); arc([x + 180, y - 30], [x, y], r.color, 0, 'in'); fromNotes.push([x + 40, y - 52, 'from ' + r.from]); }
        reach(r.stops[0][0], r.stops[0][1], r.color); }, t);
      if (c > 0) { for (let i = 1; i <= c; i++) { const d = i === c ? 2200 : 900, s = r.stops[i];
        later(() => arcBy(r.stops[i - 1][0], s[0], r.color, d, i === c ? 'cross' : ''), t); t += REDUCED ? 0 : d; later(() => { caption(r, s[0], s[1]); reach(s[0], s[1], r.color); }, t); } t += REDUCED ? 0 : 500; }
      else t += REDUCED ? 0 : 900;
    });
    // fly towards America, then turn the map the right way up for it: fade, switch projection, redraw, fade back in
    const turnAmerica = () => { if (!projA) return; svg.classList.add('swap');
      setTimeout(() => { if (stopped) return; proj = projA; path = d3.geoPath(proj); scale = 1; inUS = true; setVB(full); america = boxAround(amer);
        G('rt').innerHTML = ''; arcs.forEach(([an, bn, color, cls]) => arc(xy(an), xy(bn), color, 0, cls)); lastAt.clear();
        if (GEO) drawBase(GEO); setVB(america); scale = america[2] / W; marks(); svg.classList.remove('swap'); }, REDUCED ? 0 : 600); };
    later(() => { cap.classList.remove('on'); zoomTo(america, 1800, turnAmerica); }, t); t += REDUCED ? 0 : 3000;
    routes.forEach(r => {
      const am = r.stops.filter(s => P[s[0]][0] < -50); if (!am.length) return;
      const c = Math.max(0, crossing(r));
      later(() => { caption(r, am[0][0], am[0][1]); zoomTo(boxAround(am.map(s => P[s[0]]), projA ? 640 : 230, 1.5, 1.7), 1600); }, t);   // boxAround runs now, in the upright projection t += REDUCED ? 0 : 1900;
      for (let i = c + 1; i < r.stops.length; i++) { const s = r.stops[i], d = 1400;
        later(() => arcBy(r.stops[i - 1][0], s[0], r.color, d), t); t += REDUCED ? 0 : d; later(() => { caption(r, s[0], s[1]); reach(s[0], s[1], r.color); }, t); t += REDUCED ? 0 : 500; }
      t += REDUCED ? 0 : 1100;
    });
    later(() => { cap.innerHTML = side === 'c' ? "Christine's family · <span>every line</span>" : "DeWitt's family · <span>every line</span>"; cap.classList.add('on');
      el.querySelectorAll('.mkey span').forEach(s => s.classList.remove('on')); zoomTo(america, 2000); }, t); t += REDUCED ? 0 : 2400;
    const stop = () => { stopped = true; timers.forEach(clearTimeout); };
    stop.duration = t;
    return stop;
  }
  window.FAMILYVIS = { timeline, map, ROUTES, EVENTS };
})();
