/* The Family Tree channel: chapters built from tree.js (the Ancestry export) and data.js (the vault's stories). */
(() => {
  const T = window.TREE, D = window.FAMILY, $ = id => document.getElementById(id);
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const A = Object.fromEntries(T.ancestors.map(a => [a.k, a]));
  const SP = T.spouse || null, C = SP ? Object.fromEntries(SP.ancestors.map(a => [a.k, a])) : {};
  T.ancestors.forEach(a => { a.side = 'h'; }); if (SP) SP.ancestors.forEach(a => { a.side = 'c'; });
  // birth year from the birth date, else from 'years' only when it starts with one ("?–1679" has none)
  const yearOf = a => { const m = ((a.born || {}).date || '').match(/\d{4}/) || (a.years || '').match(/^(?:b\.\s*)?(\d{4})/); return m ? +(m[1] || m[0]) : null; };
  const TITLE = /^(Rev\.?|Reverend|Sergeant|Sgt\.?|Colonel|Col\.?|Deacon|Dea\.?|Capt\.?|Captain|Lt\.?|Lieutenant|Dr\.?)\s+/i;
  // a note or picture names its person by first name, surname and birth year; someone known only as "Sarah" is
  // named by side and key instead (who: ['h', 2561])
  const matches = (a, [first, sur, y]) => a && (typeof sur === 'number' ? a.side === first && a.k === sur : a.name.replace(TITLE, '').split(/\s+/)[0].toLowerCase().startsWith(first.toLowerCase()) &&
    a.name.toLowerCase().includes(sur.toLowerCase()) && (y ? Math.abs((yearOf(a) || 0) - y) <= 1 : !yearOf(a)));
  // family photographs first, then the period pictures (with their credit)
  const credited = p => ({ src: p.src, cap: p.cap + (p.credit ? `<small class="cr">${p.credit}</small>` : '') });
  // brothers and sisters, oldest first: 'Olive (1907), Vivian (1909) …'; the living by name and birth year only
  const sibs = a => (a && a.siblings || []).map(s => { const y = (s.years.match(/\d{4}/) || [''])[0], first = s.name.replace(/["“”].*?["“”]\s*/g, '').split(/\s+/)[0];
    return `${first}${y ? ` <small>${s.living ? 'b. ' : ''}${y}</small>` : ''}`; }).join(', ');
  const pics = a => (D.gallery || []).filter(g => matches(a, g.who)).sort((x, y) => (x.era ? 1 : 0) - (y.era ? 1 : 0))
    .map(g => ({ src: g.src, cap: g.cap + (g.credit ? `<small class="cr">${g.credit}</small>` : '') }));
  const note = a => (D.notes || []).find(n => matches(a, n.who)) || {};
  // In service: the served list for a side, each matched to its ancestor (earliest war first, as listed in data.js)
  const SV = side => (D.served || []).filter(s => s.side === side).map(s => { const M = side === 'c' ? C : A, k = +Object.keys(M).find(k => matches(M[k], s.who)); return { ...s, k, a: M[k] }; }).filter(s => s.a);
  // a soldier's pictures, the service documents and war scenes first
  const WARPIC = /commission|draft card|enlist|pension|regiment|infantry|cavalry|siege|Gettysburg|Bulge|Havana|Boston|Dorchester|patrol|veteran|PFC|U\.S\. Army|Navy|Sgt/i;
  const svcPics = a => pics(a).sort((x, y) => (WARPIC.test(y.cap) ? 1 : 0) - (WARPIC.test(x.cap) ? 1 : 0));
  const gen = k => Math.floor(Math.log2(k));
  const roman = n => { let s = '', v = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]; for (const [x, r] of v) while (n >= x) { s += r; n -= x; } return s; };
  const kin = k => { const g = gen(k), base = k % 2 ? 'mother' : 'father'; return g === 1 ? base : g === 2 ? 'grand' + base : (g === 3 ? '' : (g - 2) + (g - 2 === 2 ? 'nd' : g - 2 === 3 ? 'rd' : 'th') + ' ') + 'great-grand' + base; };
  // which side of the family a line is on, and the grandparent it comes down through, so far-back relations read
  // plainly: 'on her mother's side, through her grandfather Maurice Wintrode'. Women are named by their own surname.
  const shortName = (M, k) => { const a = M[k]; if (!a) return ''; const w = a.name.replace(/["“”(].*?["”)]/g, '').split(/\s+/).filter(Boolean), sp = M[k ^ 1];
    const last = k % 2 && sp && w.length > 2 && w[w.length - 1] === sp.name.split(/\s+/).pop() ? w[w.length - 2] : w[w.length - 1]; return `${w[0]} ${last}`; };
  const famSide = (side, k) => { const g = gen(k); return g < 1 ? '' : `${(k >> (g - 1)) === 2 ? 'father' : 'mother'}\u2019s side`; };
  const via = (side, k) => { const g = gen(k); if (g < 2) return ''; const her = side === 'c' ? 'her' : 'his', M = side === 'c' ? C : A, gk = k >> (g - 2);
    const par = (k >> (g - 1)) === 2 ? 'father' : 'mother';
    return g === 2 ? `${her === 'her' ? 'Her' : 'His'} ${par}\u2019s ${gk % 2 ? 'mother' : 'father'}` : `On ${her} ${par}\u2019s side, through ${her} grand${gk % 2 ? 'mother' : 'father'} ${shortName(M, gk)}`; };
  const town = p => (p || '').split(',')[0].trim();
  const OLD = /(England|Scotland|Germany|Switzerland|Ireland|Wales|^London\b)/i;

  // --- chapters: DeWitt's side and Christine's side; the menu picks one -------------------------------------------
  const line = []; for (let k = 1; A[k]; k *= 2) line.unshift(k);
  // the timeline's lines for each side (Ahnentafel keys, earliest first)
  const TL = side => {
    const pick = (M, name, color, ks) => { const people = ks.map(k => M[k]).filter(Boolean); return people.length ? { name, color, people } : null; };
    return (side === 'c' ? [pick(C, 'Wintrode', '#d8b46a', [384, 192, 96, 48, 24, 12, 6, 3]), pick(C, 'Fritz', '#8fa6c9', [208, 104, 52, 26, 13]), pick(C, 'Staebell', '#b7c7e6', [216, 108, 54, 27]),
      pick(C, 'Jackson', '#c99a86', [14, 7]), pick(C, 'Maksimow', '#e6d39a', [8, 4, 2, 1])]
      : [{ name: 'Hutchins', color: '#d8b46a', people: line.map(k => A[k]) }, pick(A, 'Bucher', '#c99a86', [112, 56, 28, 14, 7]), pick(A, 'Muir', '#9fbf9f', [60, 30, 15]), pick(A, 'Alden', '#cfd9a8', [4358, 2179, 1089, 544, 272, 136, 68, 34, 17]), pick(A, 'Soule', '#e6d39a', [7832, 3916, 1958, 979, 489, 244, 122, 61]),
        pick(A, 'Snyder', '#8fa6c9', [24, 12, 6]), pick(A, 'Doolittle', '#b7c7e6', [3328, 1664, 832, 416, 208, 104, 52, 26, 13]), pick(A, 'Hammond', '#e0a8c0', [10, 5])]).filter(Boolean);
  };
  const ALL = [];
  const add = (side, c) => ALL.push({ side, ...c });
  add('h', { key: 'intro', title: 'The family tree', pages: [{ kind: 'intro' }] });
  add('h', { key: 'grow', title: 'The living tree', pages: [{ kind: 'vis', vis: 'grow', side: 'h' }] });
  add('h', { key: 'fan', title: 'Every ancestor', pages: [{ kind: 'fan' }] });
  add('h', { key: 'timeline', title: 'Five centuries', pages: [{ kind: 'vis', vis: 'timeline', side: 'h' }] });
  add('h', { key: 'map', title: 'On the map', pages: [{ kind: 'vis', vis: 'map', side: 'h' }] });
  if ((D.book || []).length) add('h', { key: 'book', title: 'From the family book', pages: D.book.map((b, j) => ({ kind: 'book', b: j })) });
  const HS = side => (D.history || []).filter(h => h.side === side);
  const HP = side => HS(side).flatMap((h, j) => [{ kind: 'hist', side, j }].concat(h.map && (D.maps || {})[h.map] ? [{ kind: 'vis', vis: 'event', id: h.map, side }] : []));
  if (HS('h').length) add('h', { key: 'why', title: 'Why they moved', pages: HP('h') });
  add('h', { key: 'hutchins', title: 'The Hutchins line', sub: true, pages: line.map(k => ({ kind: 'person', k, n: line.length - gen(k) })) });
  // branch lines: through a mother into her father's line
  const BRANCHES = [[3, 'Snyder'], [13, 'Doolittle'], [7, 'Bucher'], [15, 'Muir'], [29, 'Follmer'], [5, 'Hammond'], [9, 'Watson'], [17, 'Southworth'], [33, 'Briggs']];
  for (const [via, name] of BRANCHES) {
    const chain = []; for (let k = 2 * via; A[k]; k *= 2) chain.push(k);
    if (A[via] && chain.length) add('h', { key: name, title: `The ${name} line`, pages: [{ kind: 'branch', via, chain, name }] });
  }
  add('h', { key: 'service', title: 'In service', pages: [{ kind: 'service', side: 'h' }, ...SV('h').map((s, j) => ({ kind: 'soldier', side: 'h', j }))] });
  add('h', { key: 'disagree', title: 'Where records disagree', pages: [{ kind: 'disagree' }] });
  add('h', { key: 'open', title: 'Still to find', pages: [{ kind: 'open' }] });
  if (SP) {
    add('c', { key: 'christine', title: "Christine's family", pages: [{ kind: 'cfan' }] });
    add('c', { key: 'cgrow', title: 'Her living tree', pages: [{ kind: 'vis', vis: 'grow', side: 'c' }] });
    add('c', { key: 'ctimeline', title: 'Through the years', pages: [{ kind: 'vis', vis: 'timeline', side: 'c' }] });
    add('c', { key: 'cmap', title: 'Her family on the map', pages: [{ kind: 'vis', vis: 'map', side: 'c' }] });
    if (HS('c').length) add('c', { key: 'cwhy', title: 'Why they moved', pages: HP('c') });
    // her mother's lines first, then her father's: each runs through a parent or grandparent into that person's father's line
    const CB = [[3, 'Wintrode', 'm'], [13, 'Fritz', 'm'], [27, 'Staebell', 'm'], [53, 'Schmidt', 'm'], [7, 'Jackson', 'm'], [15, 'Duffy', 'm'], [1, 'Maksimow', 'f'], [9, 'Kuleshowa', 'f']];
    for (const [via, name, half] of CB) {
      const chain = []; for (let k = 2 * via; C[k]; k *= 2) chain.push(k);
      if (C[via] && chain.length) add('c', { key: 'c' + name, title: `The ${name} line`, half, pages: [{ kind: 'branch', side: 'c', via, chain, name }] });
    }
    if (SV('c').length) add('c', { key: 'cservice', title: 'In service', pages: [{ kind: 'service', side: 'c' }, ...SV('c').map((s, j) => ({ kind: 'soldier', side: 'c', j }))] });
  } else add('c', { key: 'maksimow', title: 'The Maksimow line', pages: [{ kind: 'maksimow' }] });
  let SIDE = 'h', chapters = [], pages = [];
  function setSide(s) { SIDE = s === 'c' && SP ? 'c' : 'h'; chapters = ALL.filter(c => c.side === SIDE); pages = []; chapters.forEach((c, ci) => c.pages.forEach(p => { p.ch = ci; pages.push(p); })); i = 0; }

  let i = 0, paused = false, photoTimer = null, fanTimer = null, started = 0, dwell = 0, mode = 'menu', rtok = 0, visStop = null;

  // --- the contents column -----------------------------------------------------------------------------------
  function trunk() {
    const cur = pages[i], items = [];
    chapters.forEach((c, ci) => {
      const first = pages.findIndex(p => p.ch === ci);
      items.push(`<li class="ch${ci === cur.ch ? ' open' : ''}${ci === cur.ch && !c.sub ? ' on' : ''}" data-p="${first}"><span class="num">${ci + 1}</span><span class="nm">${c.title}</span></li>`);
      if (c.sub && ci === cur.ch) c.pages.forEach(p => {
        const a = A[p.k], idx = pages.indexOf(p);
        items.push(`<li class="${idx === i ? 'on' : ''}" data-p="${idx}"><span class="num">${roman(p.n)}</span><span class="nm">${a.name}${/dewitt/i.test(a.name) ? '<em>✦</em>' : ''}<small>${a.years}</small></span></li>`);
      });
    });
    const ol = $('trunk'); ol.innerHTML = items.join('');
    ol.querySelectorAll('li').forEach(li => li.addEventListener('click', () => go(+li.dataset.p)));
    const on = ol.querySelector('li.on') || ol.querySelector('li.open');
    if (on) { const box = ol.parentElement.clientHeight; ol.style.transform = `translateY(${box / 2 - on.offsetTop - on.offsetHeight / 2}px)`; }
    // phones hide the contents column; the same chapters go in a picker above the page
    const sel = $('chSel');
    sel.innerHTML = chapters.map((c, ci) => `<option value="${pages.findIndex(p => p.ch === ci)}"${ci === cur.ch ? ' selected' : ''}>${ci + 1}. ${c.title}</option>`).join('');
    sel.onchange = () => { go(+sel.value); scrollTo(0, 0); };
  }

  // --- the route strip: birthplaces in order, with the Atlantic where the line crosses it ----------------------
  function route(places, hereIdx) {
    const svg = $('map'), stops = [];
    places.forEach((p, n) => { const t = town(p); if (t && (!stops.length || stops[stops.length - 1].t !== t)) stops.push({ t, old: OLD.test(p), n }); });
    if (stops.length < 2) { svg.innerHTML = ''; return; }
    const sea = stops.findIndex((s, n) => n > 0 && stops[n - 1].old && !s.old);
    const span = stops.length - 1 + (sea > 0 ? 2.4 : 0), xs = stops.map((s, n) => 4 + (n + (sea > 0 && n >= sea ? 2.4 : 0)) * 92 / span);
    let reach = stops.length; if (hereIdx != null) { reach = 0; stops.forEach((s, n) => { if (s.n <= hereIdx) reach = n + 1; }); }
    const Y = 9.5;
    let out = `<line x1="${xs[0]}" y1="${Y}" x2="${xs[xs.length - 1]}" y2="${Y}" stroke="rgba(216,198,144,.18)" stroke-width=".35" stroke-dasharray=".8 .8"/>`;
    if (reach > 1) out += `<line x1="${xs[0]}" y1="${Y}" x2="${xs[reach - 1]}" y2="${Y}" stroke="#d8c690" stroke-width=".5"/>`;
    if (sea > 0) out += `<text class="sea" x="${(xs[sea - 1] + xs[sea]) / 2}" y="${Y - 5.4}" text-anchor="middle">the Atlantic</text>`;
    stops.forEach((s, n) => { const on = n === reach - 1 && hereIdx != null, past = n < reach;
      out += `<circle cx="${xs[n]}" cy="${Y}" r="${on ? 1.3 : .75}" fill="${on ? '#d8c690' : past ? '#b39a5c' : '#2a3450'}" stroke="${past ? 'none' : 'rgba(138,147,173,.6)'}" stroke-width=".2"/>` +
             `<text class="lbl${on ? ' on' : ''}" x="${xs[n]}" y="${n % 2 ? Y - 2.6 : Y + 4.6}" text-anchor="middle">${s.t}</text>`; });
    svg.innerHTML = out;
  }

  // --- photographs ---------------------------------------------------------------------------------------------
  function photos(list, emptyText) {
    clearInterval(photoTimer);
    const el = $('photo');
    if (!list || !list.length) { el.innerHTML = emptyText ? `<div class="none">${emptyText}</div>` : ''; return 0; }
    el.innerHTML = (list.length > 1 ? `<span class="count" id="pc">1 / ${list.length}</span>` : '') +
      list.map((p, k) => `<figure class="${k ? '' : 'on'}"><div class="frame"><img src="${p.src}" alt=""></div><figcaption>${p.cap}</figcaption></figure>`).join('');
    if (list.length > 1) {
      let k = 0; const figs = el.querySelectorAll('figure');
      photoTimer = setInterval(() => { if (paused) return; figs[k].classList.remove('on'); k = (k + 1) % figs.length; figs[k].classList.add('on'); $('pc').textContent = `${k + 1} / ${figs.length}`; }, 7000);
    }
    return list.length;
  }
  const mediaNote = ks => { const t = [...new Set(ks.flatMap(k => (A[k] && A[k].media) || []))].filter(m => !/^photo$/i.test(m));
    return t.length ? `<p class="media"><b>On Ancestry, not yet downloaded:</b> ${t.slice(0, 6).join(' · ')}${t.length > 6 ? ' …' : ''}</p>` : ''; };
  const ev = (label, e) => e && (e.date || e.place) ? `<span>${label}</span> ${[e.date, e.place].filter(Boolean).join(', ')}` : '';

  // --- the fan chart -------------------------------------------------------------------------------------------
  const QUAD = { 4: ['#c9a85f', 'Hutchins · Watson'], 5: ['#9fbf9f', 'Hammond'], 6: ['#8fa6c9', 'Snyder'], 7: ['#c99a86', 'Bucher · Follmer'] };
  const CQUAD = { 4: ['#c9a85f', 'Maksimow'], 5: ['#9fbf9f', 'Hansen'], 6: ['#8fa6c9', 'Wintrode · Fritz · Staebell'], 7: ['#c99a86', 'Jackson · Duffy'] };
  function fan(list = T.ancestors, maxgen = T.maxgen, who = ['DeWitt', 'b. 1985'], quad = QUAD) {
    const G = Math.min(7, maxgen), cx = 500, cy = 478, r0 = 74, W = [0, 78, 74, 64, 56, 46, 38, 32], R0 = g => r0 + W.slice(1, g).reduce((a, b) => a + b, 0);
    let out = `<circle cx="${cx}" cy="${cy}" r="${r0 - 4}" fill="#d8c690"/>` +
      `<text class="t" x="${cx}" y="${cy - 22}" text-anchor="middle" font-size="20">${who[0]}</text><text class="t" x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="13">${who[1]}</text>`;
    for (const a of list) {
      const g = gen(a.k); if (g < 1 || g > G) continue;
      const idx = a.k - 2 ** g, n = 2 ** g, t0 = Math.PI * (1 - idx / n), t1 = Math.PI * (1 - (idx + 1) / n);
      const ri = R0(g), ro = ri + W[g] - 2, q = a.k >> (g - 2 < 0 ? 0 : g - 2);
      const col = g === 1 ? (a.k === 2 ? '#c9a85f' : '#a7b6c9') : (quad[q] || ['#999'])[0];
      const P = (r, t) => `${(cx + r * Math.cos(t)).toFixed(1)} ${(cy - r * Math.sin(t)).toFixed(1)}`;
      const big = t0 - t1 > Math.PI ? 1 : 0;
      const d = `M${P(ri, t0)} A${ri} ${ri} 0 ${big} 1 ${P(ri, t1)} L${P(ro, t1)} A${ro} ${ro} 0 ${big} 0 ${P(ro, t0)} Z`;
      const tm = (t0 + t1) / 2, rm = (ri + ro) / 2, [x, y] = [cx + rm * Math.cos(tm), cy - rm * Math.sin(tm)];
      const td = tm * 180 / Math.PI, deg = g <= 2 ? 90 - td : (td < 90 ? -td : 180 - td);
      const fs = g === 1 ? 17 : g === 2 ? 14 : g === 3 ? 12 : g === 4 ? 10.5 : g === 5 ? 8.5 : 7;
      const nm = a.name.replace(/\s+(unknown|Unknown)$/, '').split(/\s+/), label = g <= 2 ? nm.join(' ') : g === 3 ? (nm.length > 1 ? nm[0] + ' ' + nm[nm.length - 1] : nm[0]) : (a.surname || nm[nm.length - 1]);
      const yrs = g <= 4 ? `<tspan x="0" dy="${fs + 1}" font-size="${fs * .78}" font-weight="500">${a.years}</tspan>` : '';
      out += `<g class="seg" data-g="${g}"><path class="w" d="${d}" fill="${col}"/><text class="t" font-size="${fs}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg.toFixed(1)})" text-anchor="middle"><tspan x="0" dy="${g <= 4 ? -2 : 3}">${label}</tspan>${yrs}</text></g>`;
    }
    return `<svg viewBox="40 30 920 530" preserveAspectRatio="xMidYMid meet" style="position:absolute;inset:0;width:100%;height:100%">${out}</svg>`;
  }

  // on a phone the fan is wider than the screen and scrolls: start it on DeWitt (or Christine), bottom centre
  const centreFan = () => { const f = $('fan'); if (f && f.scrollWidth > f.clientWidth) { f.scrollLeft = (f.scrollWidth - f.clientWidth) / 2; f.scrollTop = f.scrollHeight; } };

  // --- render a page -------------------------------------------------------------------------------------------
  function render() {
    const p = pages[i], c = chapters[p.ch], t = $('text');
    clearInterval(fanTimer); photos(null, ''); if (visStop) { visStop(); visStop = null; }
    const NARR = window.FAMILYNARR; if (NARR) NARR.stop();
    const M = p.side === 'c' ? C : A;
    $('title').innerHTML = p.kind === 'book' ? 'From the <i>family book</i>' : p.kind === 'hist' ? (p.side === 'c' ? "Christine's family: <i>why they moved</i>" : 'Why they <i>moved</i>') : p.kind === 'vis' ? (p.vis === 'event' ? `${D.maps[p.id].title.replace(/, /, ', <i>')}</i>` : p.vis === 'grow' ? (p.side === 'c' ? "Christine's <i>living tree</i>" : 'The <i>living tree</i>') : p.vis === 'map' ? (p.side === 'c' ? "Christine's family <i>on the map</i>" : "DeWitt's family <i>on the map</i>") : (p.side === 'c' ? "Christine's family <i>through the years</i>" : 'Five <i>centuries</i>')) : p.kind === 'maksimow' ? 'The <i>Maksimow</i> line' : p.kind === 'cfan' ? "Christine's <i>family</i>" : p.kind === 'branch' ? `The <i>${p.name}</i> line` : p.kind === 'service' || p.kind === 'soldier' ? (p.side === 'c' ? "Christine's family <i>in service</i>" : 'DeWitt\'s family <i>in service</i>') : 'The <i>Hutchins</i> family';
    $('route').textContent = p.kind === 'book' ? 'The printed genealogy of the Thomas Hutchins family' : p.kind === 'hist' ? 'Where the families went, and why' : p.kind === 'branch' ? (p.side === 'c' ? (p.via === 1 ? "Christine's father's line" : `Christine's ${c.half === 'f' ? "father's" : "mother's"} side · through ${M[p.via].name}`) : `Through ${M[p.via].name}`) : p.kind === 'maksimow' ? "Christine's line"
      : p.kind === 'cfan' || (p.side === 'c' && (p.kind === 'service' || p.kind === 'soldier')) ? `${SP.ancestors.length} direct ancestors · ${SP.maxgen + 1} generations` : `${T.count} people · ${T.maxgen + 1} generations · back to ${T.earliest}`;
    $('motto').innerHTML = `${D.motto}<small>Hutchins motto</small>`;
    trunk();
    $('page').classList.toggle('wide', p.kind === 'fan' || p.kind === 'cfan' || p.kind === 'vis' || p.kind === 'service');
    document.querySelector('.wrap').classList.toggle('full', p.kind === 'vis');
    t.classList.add('fade'); delete t.dataset.hand;
    const tok = ++rtok;   // a quicker key press supersedes this page; drop its late render
    setTimeout(() => {
      if (tok !== rtok) return;
      let n = 0;
      if (p.kind === 'intro') {
        const all = T.ancestors.map(a => (a.born || {}).place || '').join(' | ');
        const origins = ['England', 'Scotland', 'Switzerland', 'Germany', 'Quebec'].filter(c => all.includes(c));
        t.innerHTML = `<p class="gen">From the Ancestry tree and the family record</p><h2 class="who">${T.ancestors.length} direct ancestors</h2>` +
          `<p class="story">From George Hutchins of Broadwindsor, Dorset, born ${T.earliest}, to Stamford — with lines from ${origins.join(', ')}.</p>` +
          `<div class="stats"><div><b>${T.count}</b><span>people in the tree</span></div><div><b>${T.maxgen + 1}</b><span>generations</span></div><div><b>${T.earliest}</b><span>earliest birth</span></div></div>`;
        n = photos([{ src: 'photos/04-barbara-and-dewitt-hutchins.jpg', cap: 'Barbara and DeWitt Hutchins — the grandparents.' }, { src: 'photos/01-allen-john-leslie-sibling-portrait.jpg', cap: 'Allen with his brother John and sister Leslie.' }]);
        route([]);
      } else if (p.kind === 'fan') {
        t.innerHTML = `<div class="fan" id="fan">${fan()}</div>`;
        $('map').innerHTML = '';
        const leg = Object.values(QUAD).map(([col, nm]) => `<span><i style="background:${col}"></i>${nm}</span>`).join('');
        t.insertAdjacentHTML('afterbegin', `<div class="legend fanleg" style="position:absolute;left:0;top:0;z-index:1;flex-direction:column;align-items:flex-start;gap:1.2vmin">${leg}<span style="color:var(--dim);font-style:italic;margin-top:1vmin">Seven generations shown;<br>the Hutchins line runs to 15.</span></div>`); centreFan();
        let g = 0; const segs = () => document.querySelectorAll('#fan .seg');
        const step = () => { g = g % Math.min(7, T.maxgen) + 1; segs().forEach(s => { const sg = +s.dataset.g; s.classList.toggle('dim', sg !== g); s.classList.toggle('hot', sg === g); }); };
        if (!REDUCED) { fanTimer = setInterval(() => { if (!paused) step(); }, 2600); }
        n = 2;
      } else if (p.kind === 'person') {
        const a = A[p.k], s = D.stories[p.k] || {}, sp = A[p.k + 1] && p.k > 1 ? A[p.k + 1] : null, mother = A[2 * p.k + 1];
        const spouse = p.k === 1 ? null : A[p.k ^ 1];
        t.innerHTML = `<p class="gen">Generation ${roman(p.n)}${s.mark ? ' · ' + s.mark : ''}</p><h2 class="who">${a.name}</h2>` +
          `<p class="meta">${a.living ? a.years : [ev('born', a.born), ev('died', a.died)].filter(Boolean).join('<br>')}</p>` +
          (s.role ? `<span class="role">${s.role}</span>` : '') +
          (s.story || note(a).story ? `<p class="story${(s.story || note(a).story).length > 700 ? ' long' : ''}">${s.story || note(a).story}</p>` : '') +
          ((a.siblings || []).length ? `<p class="story sibs"><span>Brothers and sisters</span> ${sibs(a)}</p>` : '') +
          (spouse && !spouse.living ? `<p class="story married">Married <b style="color:var(--paper);font-weight:600">${spouse.name}</b>${spouse.years ? ' (' + spouse.years + ')' : ''}${a.married && a.married.date ? ', ' + a.married.date : ''}${a.married && a.married.place ? ', ' + a.married.place : ''}.</p>` : '') +
          mediaNote([p.k]);
        n = photos([...(s.photos || []), ...pics(a), ...(spouse ? pics(spouse) : [])].filter((x, j, all) => all.findIndex(y => y.src === x.src) === j), 'No photograph yet for this generation.');
        const lineKs = c.pages.map(x => x.k);
        route(lineKs.map(k => (A[k].born || {}).place), lineKs.indexOf(p.k));
      } else if (p.kind === 'branch') {
        const ks = [...p.chain].reverse(), via = M[p.via];
        t.innerHTML = `<p class="gen">${p.side === 'c' ? (p.via === 1 ? "Christine's side" : "Christine's side · through " + via.name) : 'Through ' + via.name}</p><h2 class="who">The ${p.name} line</h2>` +
          `<div class="chain">${ks.map(k => { const a = M[k], w = M[k + 1];
            return `<div><em>${roman(gen(k))}</em><span><b>${a.name}</b><small>${[a.years, (a.born || {}).place].filter(Boolean).join(' · ')}${w ? ` &nbsp;—&nbsp; m. ${w.name}${w.years ? ' (' + w.years + ')' : ''}` : ''}</small></span></div>`; }).join('')}` +
          `<div><em>${roman(gen(p.via))}</em><span><b>${via.name}</b><small>${via.years}${p.side === 'c' ? (p.via === 1 ? '' : " · Christine's " + kin(p.via)) : ' · into the Hutchins line'}</small></span></div></div>` +
          (p.side === 'c' ? '' : mediaNote(ks.concat(ks.map(k => k + 1))));
        const ps = ks.concat(ks.map(k => k + 1), [p.via]).flatMap(k => pics(M[k])).filter((x, j, all) => all.findIndex(y => y.src === x.src) === j);
        n = photos(ps, 'No photographs for this line yet.');
        route(ks.map(k => (M[k].born || {}).place).concat([(via.born || {}).place]));
      } else if (p.kind === 'book') {
        const b = D.book[p.b];
        t.innerHTML = `<p class="gen">${b.kick} · ${p.b + 1} of ${D.book.length}</p><h2 class="who">${b.title}</h2>${NARR ? NARR.button(NARR.key('book', b.title)) : ''}` +
          ((b.lines || []).length ? `<p class="meta">${b.lines.join('<br>')}</p>` : '') + `<p class="story book${b.story.length > 700 ? ' long' : ''}">${b.story}</p>`;
        n = photos(b.photos.map(credited)); route([]);
      } else if (p.kind === 'hist') {
        const hs = HS(p.side), h = hs[p.j];
        t.innerHTML = `<p class="gen">${h.kick} · ${p.j + 1} of ${hs.length}</p><h2 class="who">${h.title}</h2>${NARR ? NARR.button(NARR.key(p.side, h.title)) : ''}` +
          ((h.lines || []).length ? `<p class="meta">${h.lines.join('<br>')}</p>` : '') + `<p class="story book${h.story.length > 700 ? ' long' : ''}">${h.story}</p>`;
        n = photos((h.photos || []).map(credited), h.place); route([]);
      } else if (p.kind === 'vis') {
        t.innerHTML = `<div class="vis" id="vis"></div>`; $('map').innerHTML = '';
        if (window.FAMILYVIS) {
          if (p.vis === 'grow') visStop = window.FAMILYGROW ? FAMILYGROW.grow($('vis'), { side: p.side }) : null;
          else if (p.vis === 'map') visStop = FAMILYVIS.map($('vis'), { side: p.side });
          else if (p.vis === 'event') visStop = FAMILYVIS.event ? FAMILYVIS.event($('vis'), { id: p.id, side: p.side, top: .17 }) : null;
          else visStop = FAMILYVIS.timeline($('vis'), { lines: TL(p.side), from: p.side === 'c' ? 1720 : 1520, events: FAMILYVIS.EVENTS[p.side] });
        }
        n = p.vis === 'grow' ? 7 : 2;
      } else if (p.kind === 'cfan') {
        t.innerHTML = `<div class="fan" id="fan">${fan(SP.ancestors, SP.maxgen, ['Christine', C[1] ? C[1].years : ''], CQUAD)}</div>`;
        $('map').innerHTML = '';
        const leg = Object.values(CQUAD).map(([col, nm]) => `<span><i style="background:${col}"></i>${nm}</span>`).join('');
        t.insertAdjacentHTML('afterbegin', `<div class="legend fanleg" style="position:absolute;left:0;top:0;z-index:1;flex-direction:column;align-items:flex-start;gap:1.2vmin">${leg}<span style="color:var(--dim);font-style:italic;margin-top:1vmin">From Alsace, Bavaria and<br>Pennsylvania to Connecticut.</span></div>`); centreFan();
        let g = 0; const segs = () => document.querySelectorAll('#fan .seg');
        const step = () => { g = g % Math.min(7, SP.maxgen) + 1; segs().forEach(s => { const sg = +s.dataset.g; s.classList.toggle('dim', sg !== g); s.classList.toggle('hot', sg === g); }); };
        if (!REDUCED) { fanTimer = setInterval(() => { if (!paused) step(); }, 2600); }
        n = 2;
      } else if (p.kind === 'service') {
        const L = SV(p.side), wars = [...new Set(L.map(s => s.war))], W = D.wars || {};
        const y0 = p.side === 'c' ? 1760 : 1660, y1 = 1960, X = y => 2 + (y - y0) / (y1 - y0) * 96;
        let lastX = -9; const room = innerWidth < 700 ? 8 : 3.5;   // a phone's labels are wider in these units
        const ticks = wars.map(w => { const y = +((W[w] || '').match(/\d{4}/) || [0])[0]; if (!y) return ''; const x = X(y), lab = x - lastX > room; if (lab) lastX = x;
          return `<circle cx="${x}" cy="5" r=".7" fill="#d8c690"/>` + (lab ? `<text x="${x}" y="2.6" text-anchor="middle">${y}</text>` : ''); }).join('');
        const decades = []; for (let y = Math.ceil(y0 / 50) * 50; y <= y1; y += 50) decades.push(`<line x1="${X(y)}" y1="4.2" x2="${X(y)}" y2="5.8" stroke="rgba(216,198,144,.25)" stroke-width=".15"/>`);
        t.innerHTML = `<p class="gen">${p.side === 'c' ? "Christine's" : "DeWitt's"} ancestors who served · ${L.length}</p><h2 class="who">When and where they served</h2>` +
          `<svg class="svtl" viewBox="0 0 100 7" preserveAspectRatio="none"><line x1="2" y1="5" x2="98" y2="5" stroke="rgba(216,198,144,.35)" stroke-width=".2"/>${decades.join('')}${ticks}</svg>` +
          `<div class="svcgrid">${wars.map(w => `<div class="wc"><div class="wy">${W[w] || ''}</div><div class="wn">${w}</div>${L.map((s, j) => s.war === w ? `<a data-j="${j}"><em>${s.a.name}</em>${s.brief}</a>` : '').join('')}</div>`).join('')}</div>` +
          (p.side === 'h' ? `<p class="media">Also in the wider Hutchins family — ${D.service.filter(([w]) => !/World War/.test(w)).map(([w, y, who]) => `${w}: ${who}`).join(' · ')}.</p>` : '');
        t.querySelectorAll('[data-j]').forEach(el => el.onclick = () => go(pages.findIndex(q => q.kind === 'soldier' && q.side === p.side && q.j === +el.dataset.j)));
        $('map').innerHTML = ''; n = 2;
      } else if (p.kind === 'soldier') {
        const s = SV(p.side)[p.j], a = s.a, whose = p.side === 'c' ? "Christine's " : "DeWitt's ";
        t.innerHTML = `<p class="gen">${s.war} · ${s.when}</p><h2 class="who">${a.name}</h2>` +
          `<p class="meta">${whose}${kin(s.k)}${a.years ? ' · ' + a.years : ''}${s.k > 3 ? `<br><i>${via(p.side, s.k)}</i>` : ''}<br>${s.unit}</p>` +
          `<span class="role">${s.rank}</span><p class="story">${s.did}</p>` + (s.src ? `<p class="media">${s.src}</p>` : '');
        n = photos(svcPics(a), 'No picture yet from his service.');
        route(s.where, s.where.length - 1);
      } else if (p.kind === 'disagree') {
        t.innerHTML = `<p class="gen">The tree and the family record</p><h2 class="who">Where they disagree</h2><div class="list">${D.disagree.map(([w, d]) => `<div><b>${w}</b><span>${d}</span></div>`).join('')}</div>` +
          (T.twins.length ? `<p class="media">Listed twice in the Ancestry tree (merged here): ${T.twins.join(', ')}.</p>` : '');
        route([]);
      } else if (p.kind === 'open') {
        const all = [...new Set(T.ancestors.flatMap(a => a.media))].filter(m => !/^photo$/i.test(m));
        t.innerHTML = `<p class="gen">The Hutchins family</p><h2 class="who">Still to find</h2><div class="list">${D.open.map(q => `<div style="grid-template-columns:1fr"><span>— ${q}</span></div>`).join('')}</div>` +
          `<p class="media"><b>${all.length} photographs and documents</b> are attached on Ancestry but not downloaded: ${all.slice(0, 10).join(' · ')}…</p>`;
        route([]);
      } else {
        t.innerHTML = `<p class="gen">The Maksimow line</p><h2 class="who">Christine Maksimow — Bean.</h2><p class="story">${D.maksimow}</p>`;
        n = photos(null, 'Photographs of Christine’s family will hang here.'); route([]);
      }
      t.classList.remove('fade');
      dwell = p.kind === 'book' ? Math.max(18000, D.book[p.b].story.length * 50, n * 7000) : p.kind === 'fan' || p.kind === 'cfan' ? 20000 : p.kind === 'branch' || p.kind === 'service' ? 16000 + Math.max(0, n - 1) * 7000 : p.kind === 'soldier' ? 14000 + Math.max(0, n - 1) * 7000 : 11000 + Math.max(0, n - 1) * 7000 + (p.kind === 'person' && (D.stories[p.k] || {}).story && D.stories[p.k].story.length > 160 ? 4000 : 0);
      if (!['fan', 'cfan', 'vis'].includes(p.kind)) dwell = Math.max(dwell, 3000 + t.textContent.length * 55);
      if (p.kind === 'vis' && visStop && visStop.duration) dwell = Math.max(dwell, visStop.duration + 1500);   // a map story runs to its end
      started = performance.now();
    }, 450);
  }
  function go(k) { i = (k + pages.length) % pages.length; render(); }
  function chapter(d) { const c = (pages[i].ch + d + chapters.length) % chapters.length; go(pages.findIndex(p => p.ch === c)); }
  // text taller than its column scrolls itself, a little behind the reading pace
  // (until someone scrolls it by hand; a new page or scene hands it back)
  const crawl = (el, f) => {
    if (!el.dataset.crawl) { el.dataset.crawl = 1; ['wheel', 'touchstart', 'pointerdown'].forEach(e => el.addEventListener(e, () => { el.dataset.hand = 1; }, { passive: true })); }
    const over = el.scrollHeight - el.clientHeight; if (over > 4 && !el.dataset.hand) el.scrollTop = over * Math.min(1, Math.max(0, (f - .2) / .65)); };
  function tick(now) {
    requestAnimationFrame(tick);
    if (!paused && dwell && started && $('text')) crawl($('text'), Math.min(1, (now - started) / dwell));
    if (mode !== 'ambient' || paused || REDUCED || !dwell) return;   // browse never advances by itself
    const f = Math.min(1, (now - started) / dwell); $('bar').style.width = (f * 100).toFixed(2) + '%';
    if (f >= 1) { dwell = 0; go(i + 1); }
  }
  addEventListener('keydown', e => {
    if (mode !== 'browse') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); chapter(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); chapter(-1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); paused = !paused; if (!paused) started = performance.now() - (parseFloat($('bar').style.width) || 0) / 100 * dwell; }
  });
  $('prev').onclick = () => go(i - 1); $('next').onclick = () => go(i + 1);
  // browse is manual: step with the arrows; the walkthrough (walk.js) is the film that plays itself
  window.FAMILYAPP = { A, C, SP, pics, sibs, credited, crawl, note, gen, kin, via, famSide, roman, line, TL, SV, setSide: s => { setSide(s); }, side: () => SIDE,
    setMode: m => { mode = m; document.body.dataset.mode = m; dwell = 0; $('bar').style.width = '0'; if (m === 'browse') render(); } };
  const qs = new URLSearchParams(location.search); setSide(qs.get('side') || 'h'); const q = qs.get('p'); i = q ? (+q + pages.length) % pages.length : 0; render(); requestAnimationFrame(tick);
})();
