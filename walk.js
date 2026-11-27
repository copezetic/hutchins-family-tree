/* The walkthrough: the family told as a film, earliest first: the Hutchins line from Dorset, the families that
   married in, Christine's lines from Alsace, Bavaria and Pennsylvania, and the two families meeting. Built from
   tree.js and data.js through window.FAMILYAPP; app.js keeps the browse pages. */
(() => {
  const F = window.FAMILYAPP, T = window.TREE, D = window.FAMILY, $ = id => document.getElementById(id);
  const { A, C, SP, pics, note, gen, kin, roman, line } = F;   // SP: Christine's tree (TREE.spouse)
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches, TOUCH = matchMedia('(pointer: coarse)').matches;
  const chars = s => (s || '').replace(/<[^>]+>/g, '').length;
  const yr = a => { const m = ((a.born || {}).date || a.years || '').match(/\d{4}/); return m ? m[0] : ''; };
  const town = p => (p || '').split(',').slice(0, 2).join(',').trim();
  const uniq = list => list.filter((x, j) => list.findIndex(y => y.src === x.src) === j);

  // one scene per couple: the line's man (or woman) at k, the spouse at k ^ 1
  function couple(M, k, side) {
    const a = M[k], w = M[k ^ 1]; if (!a) return null;
    const story = (side === 'h' && D.stories[k] && D.stories[k].story) || [note(a).story, w && note(w).story].filter(Boolean).join(' ');
    const lines = [a, w].filter(Boolean).map(p => p.living ? `${p.name}${yr(p) ? ', born ' + yr(p) : ''}` :
      [p.name, [p.years, town((p.born || {}).place)].filter(Boolean).join(' · ')].filter(Boolean).join(' — '));
    const marr = a.married && a.married.date && !a.living ? `Married ${a.married.date}${a.married.place ? ', ' + town(a.married.place) : ''}.` : '';
    const auto = !story && !a.living ? [(a.born || {}).place ? `Born in ${town(a.born.place)}${yr(a) ? ', ' + yr(a) : ''}.` : '', marr].filter(Boolean).join(' ') : '';
    const photos = uniq([...((side === 'h' && D.stories[k] && D.stories[k].photos) || []), ...pics(a), ...(w ? pics(w) : [])]);
    const kick = side === 'h' ? `Generation ${roman(line.length - gen(k))} · DeWitt's ${k === 1 ? 'self' : kin(k)}` : `Christine's ${kin(k)}`;
    const place = a.living ? '' : ((a.born || {}).place || '').split(',')[0].trim();
    const via = k > 3 ? F.via(side, k) : '';
    return { type: 'people', kick, via, name: a.name + (w ? ` <i>&amp;</i> ${w.name}` : ''), lines, story: story || auto, photos, place };
  }

  const FV = () => window.FAMILYVIS || {};
  // the history chapters that play before a generation (or, on DeWitt's side, before a branch line)
  const HIST = (side, at) => (D.history || []).filter(h => h.side === side && h.at === at)
    .flatMap(h => [{ type: 'people', chapter: true, voice: window.FAMILYNARR && window.FAMILYNARR.key(side, h.title), kick: h.kick, name: h.title, lines: h.lines || [], story: h.story, photos: (h.photos || []).map(F.credited), place: h.place }]
      // a chapter with an event map plays it next: the place close up, with the family pins
      .concat(h.map && (D.maps || {})[h.map] ? [{ type: 'vis', vis: 'event', id: h.map, side, kick: 'On the ground', title: D.maps[h.map].title, dwell: 1000 }] : []));
  function hScenes(withTitle) {
    const S = [];
    if (withTitle) S.push({ type: 'title', kick: 'The Hutchins Family Tree', title: "DeWitt's side",
      sub: `The Hutchins line, ${T.maxgen + 1} generations back to Dorset in ${T.earliest}, and the Snyders, Buchers, Hammonds and Watsons who married in.` });
    S.push({ type: 'vis', vis: 'grow', side: 'h', kick: 'Every ancestor', title: 'The family tree, growing', dwell: 50000 });
    S.push({ type: 'vis', vis: 'timeline', side: 'h', kick: 'Five centuries', title: "DeWitt's family on one line", dwell: 22000 });
    if ((D.book || []).length) {
      S.push({ type: 'title', kick: 'Prologue', title: 'From the family book', sub: 'Before Salem: the name, the arms, Thomas of London and the first Hutchinses in America.' });
      for (const b of D.book) S.push({ type: 'people', voice: window.FAMILYNARR && window.FAMILYNARR.key('book', b.title), kick: b.kick, name: b.title, lines: b.lines || [], story: b.story, photos: b.photos.map(F.credited) });
    }
    S.push({ type: 'title', kick: "DeWitt's father's side", title: 'The Hutchins line', sub: 'From Broadwindsor, Dorset, to Stamford, Connecticut.' });
    S.push({ type: 'vis', vis: 'map', side: 'h', kick: 'On the map', title: 'Dorset to Connecticut', dwell: 40000, say: `Every line of DeWitt’s family, on one map. The Hutchinses leave Broadwindsor for Salem after 1712, and move by generations through Dudley and Pomfret to Vermont, Malone and Fort Covington, on the Canadian line. The Watsons come from Dalserf in Scotland to Trout River, Quebec. The Southworths start at Leiden, among the Pilgrims, and go by Plymouth, Duxbury, Little Compton and Mansfield to Bangor, New York. The Soules cross on the Mayflower in 1620; their descendants reach Wayne County, Pennsylvania. The Buchers come from Switzerland to Milton and Watsontown, in Pennsylvania. The Snyders are at DeWitt, New York, by 1849, and the Hammonds at Olean. All of them end in one household, at Stamford, Connecticut.` });
    for (const k of line) if (k !== 1) S.push(...HIST('h', k), couple(A, k, 'h'));
    const BR = [[3, 'Snyder'], [13, 'Doolittle'], [7, 'Bucher'], [15, 'Muir'], [5, 'Hammond'], [9, 'Watson'], [17, 'Southworth']].filter(([v]) => A[v] && A[2 * v]);
    if (BR.length) {
      S.push({ type: 'title', kick: 'The families that married in', title: 'Snyder, Doolittle, Bucher, Muir, Hammond, Watson', sub: "His mother's lines from Lorraine, Connecticut, Switzerland and Scotland, and his grandmothers' from Vermont, Ireland, Bavaria and the Clyde." });
      for (const [v, nm] of BR) {
        const ks = []; for (let k = 2 * v; A[k]; k *= 2) ks.unshift(k);
        S.push(...HIST('h', nm), { type: 'people', kick: `Through ${A[v].name}`, name: `The ${nm} line`,
          lines: ks.slice(-4).map(k => `${A[k].name} — ${[A[k].years, town((A[k].born || {}).place)].filter(Boolean).join(' · ')}`),
          story: `${ks.length} generation${ks.length > 1 ? 's' : ''}, from ${A[ks[0]].name}${(A[ks[0]].born || {}).place ? ' of ' + town(A[ks[0]].born.place) : ''}.`,
          photos: uniq(ks.concat([v]).flatMap(k => pics(A[k]))) });
      }
    }
    if (A[4358] || A[7832] || A[7836]) {
      S.push({ type: 'title', kick: 'Both sides', title: 'The Mayflower', sub: 'Five passengers of 1620. On his father\'s side John Alden, Priscilla Mullins and her father William, through the Southworths of Duxbury; on his mother\'s, George Soule and Francis Eaton.' });
      if (A[4358]) {
        S.push({ type: 'title', kick: "DeWitt's father's side", title: 'Alden and Southworth', sub: 'From the Mayflower and the Leiden exiles to Bangor, New York: Grace Southworth, who married into the Hutchinses, was ten generations down from John and Priscilla Alden.' });
        for (const k of [8718, 4358, 2178, 4352, 2176, 1088, 544, 272, 136, 68]) if (A[k]) S.push(couple(A, k, 'h'));
      }
      if (A[7832] || A[7836]) {
        S.push({ type: 'title', kick: "DeWitt's mother's side", title: 'Soule and Eaton', sub: 'Through the Muirs and the Stephenses, two more passengers of 1620: George Soule and Francis Eaton. Their great-granddaughter Hannah Soule was born at Dartmouth in 1694.' });
        for (const k of [7832, 7836, 3916, 3918, 1958, 978]) if (A[k]) S.push(couple(A, k, 'h'));
      }
    }
    // the Puritans of the 1630s, who are otherwise only in browse: Boston, Hartford, Medfield, Dedham, Wallingford, Salem
    const PUR = [4364, 4366, 2182, 5140, 3328, 8200].filter(k => A[k]);
    if (PUR.length) {
      S.push({ type: 'title', kick: "DeWitt's colonial ancestors", title: 'The Puritans', sub: 'The ministers of Boston, Hartford and Medfield, a man killed at Bloody Brook, a founder of Wallingford, and two Quakers driven out of Salem.' });
      S.push(...HIST('h', 'Puritans'));
      for (const k of PUR) S.push(couple(A, k, 'h'));
    }
    return S;
  }
  function cScenes(withTitle) {
    const S = []; if (!SP) return S;
    if (withTitle) S.push({ type: 'title', kick: 'The Hutchins Family Tree', title: "Christine's side",
      sub: `${SP.maxgen + 1} generations: her mother's family from Pennsylvania, Alsace, Bavaria and Brooklyn, then her father's from Russia.` });
    S.push({ type: 'vis', vis: 'grow', side: 'c', kick: 'Every ancestor', title: "Christine's family, growing", dwell: 42000 });
    S.push({ type: 'vis', vis: 'timeline', side: 'c', kick: 'Through the years', title: "Christine's family on one line", dwell: 20000 });
    S.push({ type: 'vis', vis: 'map', side: 'c', kick: 'On the map', title: 'Every road to Connecticut', dwell: 45000, say: `Every road Christine’s family took. The Wintrodes leave Bammental, near Heidelberg, land at Philadelphia in 1732, and settle at Frederick, Littlestown and Gettysburg before going west to Illinois, Iowa and South Dakota. The Fritzes come from Alsace to Tiffin, Ohio, and on to Iowa; the Staebells and Phillipses from the Alsatian village of Stundwiller to Freeport, Illinois; the Schmitts from Bavaria. The Jacksons come east from St. Louis to Hoboken and Brooklyn, where the Duffys already are. Last come the Maksimows: from Luga, in Russia, to Weener and Varel in Germany, and in 1956 from Hamburg to Paterson, New Jersey. Every road ends in Connecticut.` });
    S.push({ type: 'title', kick: "Christine's mother's side", title: 'Wintrode, Fritz, Staebell, Jackson',
      sub: 'Pennsylvania Germans from Gettysburg country back to a Revolutionary patriot, Alsatians and Bavarians who farmed Iowa and South Dakota, and the Jacksons and Duffys of Hoboken and Brooklyn.' });
    // the Wintrodes from the Revolutionary patriot down; the Alsatian and Bavarian families; the two lines meeting; the Jacksons
    for (const k of [384, 192, 194, 96, 196, 98, 48, 50, 24, 216, 218, 108, 220, 222, 110, 54, 208, 210, 104, 106, 52, 26, 12, 28, 14, 6]) if (C[k]) S.push(...HIST('c', k), couple(C, k, 'c'));
    S.push({ type: 'title', kick: "Christine's father's side", title: 'The Maksimows', sub: 'From Russia, through a displaced-persons camp in Germany, to New Jersey in 1956.' });
    for (const k of [18, 8, 10, 4]) if (C[k]) S.push(...HIST('c', k), couple(C, k, 'c'));
    if (C[2]) S.push(couple(C, 2, 'c'));
    return S;
  }
  function build(mode) {
    const m = SP && SP.married && SP.married.date ? SP.married.date : '19 August';
    if (mode === 'h') return [...hScenes(true), { type: 'title', kick: 'Generation ' + roman(line.length), title: 'DeWitt Hutchins', sub: 'Private banking. Married Christine Maksimow.' }].filter(Boolean);
    if (mode === 'c') return [...cScenes(true), { type: 'title', kick: 'Today', title: 'Christine', sub: 'Born in Southbury, Connecticut. Founder of Beurre Creamery; married DeWitt Hutchins.' }].filter(Boolean);
    return [{ type: 'title', kick: 'The family tree', title: 'The Hutchins Family Tree', sub: "Christine's family first, her mother's side and then her father's; then DeWitt's." },
      { type: 'vis', vis: 'pair', kick: 'Two families, one tree', title: 'DeWitt <i>&amp;</i> Christine', dwell: 52000 },
      ...cScenes(true), ...hScenes(true),
      { type: 'title', kick: 'Today', title: 'DeWitt <i>&amp;</i> Christine', sub: `Married on ${m}: two family trees, ${T.ancestors.length + (SP ? SP.ancestors.length : 0)} ancestors, joined.` }].filter(Boolean);
  }

  let scenes = [], n = 0, paused = false, started = 0, dwell = 0, timer = null, on = false;
  let visStop = null, sayT = 0, openT = 0, capNow = '', docOn = false;
  const plain = s => (s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
  // every title card and every couple has a reading too, keyed by its words
  // the spoken opening of each film: an introduction over a run of the family's own photographs
  const OPEN = { both: `This is the story of two families, and of how they came to be one. The first begins with George Hutchins, in the Dorset village of Broadwindsor in ${T.earliest}, and comes down ${T.maxgen + 1} generations: to Salem, through the Revolution, and north to the Canadian line of New York. The second is Christine’s. Her people were Palatine farmers who landed at Philadelphia in 1732; Alsatians and Bavarians who went west to the prairie; the Jacksons and Duffys of Brooklyn; and a family from Luga, in Russia, uprooted by the war, who reached Paterson, New Jersey, in 1956. Among DeWitt’s ancestors are five passengers on the Mayflower and men who stood at Bunker Hill and Saratoga. Both families were at Gettysburg: one man wounded in the fighting, the other family farming the ground it was fought over. Most of them left little behind: a line in a parish register, a name in a census, a stone. This film gathers what can still be known of them. Christine’s family comes first, then DeWitt’s.`,
    h: `This is the story of DeWitt Hutchins’s family. It begins with George Hutchins, in the Dorset village of Broadwindsor in ${T.earliest}, and comes down ${T.maxgen + 1} generations: to Salem in Massachusetts, through the Revolution, and north to Vermont and the Canadian line of New York. Along the way other families married in: the Southworths, down from the Mayflower; the Watsons, from Lanarkshire by way of Quebec; the Snyders, the Doolittles, the Buchers, the Muirs and the Hammonds. Among them are five passengers on the Mayflower, men who stood at Bunker Hill and Saratoga, and a soldier wounded at Gettysburg. Most of them left little behind: a line in a parish register, a name in a census, a stone. This film gathers what can still be known of them.`,
    c: `This is the story of Christine’s family. On her mother’s side are the Wintrodes, Palatine farmers who landed at Philadelphia in 1732 and settled in the Pennsylvania border country near Gettysburg; the Fritzes and Staebells, from Alsace and Bavaria, who went west to the prairie; and the Jacksons and Duffys of Brooklyn. On her father’s side are the Maksimows, of Luga in Russia, uprooted by the war, who spent years in the displaced-persons camps of Germany and reached Paterson, New Jersey, in 1956. Most of them left little behind: a line in a parish register, a name in a census, a stone. This film gathers what can still be known of them.` };
  function opened(md, list) {
    // the portraits from the intro's collage that belong to this film's people
    const base = x => x.split('/').pop(), mine = new Set(list.flatMap(s => (s.photos || []).map(p => base(p.src))));
    const own = (D.collage || []).filter(c => mine.has(base(c.src))).map(c => ({ src: c.src, cap: c.label }));
    const pick = own.filter((p, j, all) => all.length <= 9 || Math.floor(j * 9 / all.length) !== Math.floor((j - 1) * 9 / all.length)).slice(0, 9);
    const first = { type: 'people', opening: true, voice: 't-opening-' + md, kick: 'A family history', name: md === 'c' ? 'Christine’s Family' : md === 'h' ? 'DeWitt’s Family' : 'The Hutchins Family Tree', lines: [], story: OPEN[md], photos: pick };
    return [first, ...(list[0] && list[0].type === 'title' ? list.slice(1) : list)];
  }
  const voiced = list => list.map(s => s.voice ? s : s.type === 'vis' ? (s.say ? { ...s, voice: 'v-' + s.vis + '-' + s.side } : s) : { ...s, voice: NARR.key(s.type === 'title' ? 't' : 'p', plain(s.type === 'title' ? s.kick + ' ' + s.title : s.name)) });
  const NARR = window.FAMILYNARR || { key() {}, has() { return false; }, play() {}, stop() {}, pause() {} };   // narrate.js: the chapters read aloud
  function show() {
    const sc = scenes[n], el = $('story');
    clearTimeout(sayT); clearTimeout(openT); NARR.stop(); capNow = ''; docOn = false; $('sCap').textContent = ''; $('sCap').classList.remove('on');
    clearInterval(timer); if (visStop) { visStop(); visStop = null; } $('sVis').innerHTML = '';
    if (sc.type === 'vis') {
      el.className = 'film on vis'; $('sPhoto').innerHTML = ''; $('sMark').textContent = '';
      $('sText').innerHTML = `<p class="kick">${sc.kick}</p><h2>${sc.title}</h2>`;
      $('sCount').textContent = `${n + 1} / ${scenes.length}`;
      visStop = sc.vis === 'pair' ? (window.FAMILYGROW ? window.FAMILYGROW.grow($('sVis'), { pair: true, growMs: 20000 }) : null)
        : sc.vis === 'grow' ? (window.FAMILYGROW ? window.FAMILYGROW.grow($('sVis'), { side: sc.side }) : null)
        : sc.vis === 'map' ? window.FAMILYVIS.map($('sVis'), { side: sc.side })
        : sc.vis === 'event' ? (window.FAMILYVIS.event ? window.FAMILYVIS.event($('sVis'), { id: sc.id, side: sc.side,
            // each step of a battle map is read aloud, and the step waits for the reading
            voice: NARR.isOff && !NARR.isOff() ? { dur: j => NARR.dur(`m-${sc.id}-${j}`) * 1000, play: j => { if (on && scenes[n] === sc) NARR.play(`m-${sc.id}-${j}`); } } : null }) : null)
        : window.FAMILYVIS.timeline($('sVis'), { lines: F.TL(sc.side), from: sc.side === 'c' ? 1720 : 1520, events: window.FAMILYVIS.EVENTS[sc.side], sweep: sc.dwell - 3000 });
      dwell = Math.max(sc.dwell, visStop && visStop.duration ? visStop.duration + 2500 : 0); started = performance.now();
      // the journey maps have one reading over the whole scene
      if (sc.voice && NARR.has(sc.voice)) sayT = setTimeout(() => { if (on && scenes[n] === sc) NARR.play(sc.voice, { onstart: secs => { dwell = Math.max(dwell, performance.now() - started + secs * 1000 + 2500); } }); }, 1500);
      return;
    }
    // the documentary look, when the scene will be read aloud: the picture fills the screen, the name opens the scene
    // and then sits in a corner, and the story runs as captions in time with the voice
    docOn = sc.type === 'people' && !!sc.voice && NARR.has(sc.voice) && !NARR.isOff();
    el.className = 'film on ' + sc.type + (sc.chapter ? ' chapter' : '') + (docOn ? ' doc open' : '');
    if (docOn) openT = setTimeout(() => { el.classList.add('closing'); openT = setTimeout(() => el.classList.remove('open', 'closing'), 650); }, 3600);
    const ph = sc.photos || [];
    // paced for reading: about 60 ms a character of story (a slow reading pace on a television across the room),
    // never less than the photographs need, which then share the time evenly
    dwell = sc.dwell || (sc.type === 'title' ? Math.max(6000, 2500 + chars(sc.sub) * 55)
      : Math.max(9000, 4500 + chars(sc.story) * 60 + (sc.lines || []).length * 1500, ph.length * 6500));
    $('sPhoto').innerHTML = ph.map((p, j) => `<figure class="${j ? '' : 'on'}" style="--bg:url('${encodeURI(p.src)}')"><img src="${p.src}" alt=""><figcaption>${p.cap}</figcaption></figure>`).join('');
    $('story').classList.toggle('nophoto', !ph.length);
    $('sMark').textContent = !ph.length && sc.place ? sc.place : '';
    $('sText').innerHTML = sc.type === 'title'
      ? `<p class="kick">${sc.kick}</p><h2>${sc.title}</h2><p class="sub">${sc.sub}</p>`
      : `<p class="kick">${sc.kick}</p>${sc.via ? `<p class="via">${sc.via}</p>` : ''}<h2>${sc.name}</h2>${sc.lines.map(l => `<p class="ln">${l}</p>`).join('')}${sc.story ? `<p class="sub${sc.story.length > 600 ? ' long' : ''}">${sc.story}</p>` : ''}`;
    $('sCount').textContent = `${n + 1} / ${scenes.length}`; $('sText').scrollTop = 0; delete $('sText').dataset.hand;
    let j = 0; const figs = $('sPhoto').querySelectorAll('figure');
    const cycle = () => { clearInterval(timer); const per = Math.max(sc.opening ? 4500 : 6500, dwell / Math.max(1, ph.length)); $('sPhoto').style.setProperty('--kb', Math.round(per + 2500) + 'ms');
      if (ph.length > 1) timer = setInterval(() => { if (paused) return; figs[j].classList.remove('on'); j = (j + 1) % figs.length; figs[j].classList.add('on'); }, per); };
    cycle(); started = performance.now();
    // a chapter with a recording is read aloud: the scene then lasts as long as the reading, plus a breath
    if (sc.voice && NARR.has(sc.voice)) sayT = setTimeout(() => { if (on && !paused && scenes[n] === sc) NARR.play(sc.voice, {
      onstart: secs => { const need = performance.now() - started + secs * 1000 + 2500; dwell = docOn ? Math.max(need, sc.opening ? 0 : ph.length * 6500, 9000) : Math.max(dwell, need); if (docOn) cycle(); },
      onfail: () => { if (scenes[n] === sc) { docOn = false; clearTimeout(openT); el.classList.remove('doc', 'open', 'closing'); } } }); }, 1100);
  }
  function step(d) { n = Math.max(0, Math.min(scenes.length - 1, n + d)); show(); }
  function tick(now) {
    requestAnimationFrame(tick);
    if (!on || paused || !dwell) return;
    const f = Math.min(1, (now - started) / dwell); $('sBar').style.width = (f * 100).toFixed(2) + '%';
    if (scenes[n] && scenes[n].type !== 'vis' && !docOn) F.crawl($('sText'), f);
    if (docOn) { const c = NARR.cue(), cap = $('sCap'); if (c !== capNow) { capNow = c; cap.classList.remove('on'); if (c) { cap.textContent = c; void cap.offsetWidth; cap.classList.add('on'); } } }
    if (f >= 1) { if (n < scenes.length - 1) step(1); else { dwell = 0; setTimeout(() => on && menu(), 6000); } }
  }
  // the menu: first a side (or both), then what to do with it
  const SIDES = { h: "DeWitt's side", c: "Christine's side" };
  let level = 'top', mside = 'h', mode = 'both';
  // the two sides, and a slim third choice beneath them for the whole film
  const TOP = [['h', "<i>◆</i>DeWitt's Side", 'The Hutchins line back to Dorset in 1532, the family book, and the Snyders, Buchers, Hammonds and Watsons.'],
    ['c', "<i>◆</i>Christine's Side", "Her mother's family first, the Wintrodes, Fritzes, Staebells and Jacksons, then her father's, the Maksimows."],
    ['both', '<i>▶</i>Or watch both sides as one film', '']];
  const SUB = [['ped', '<i>☷</i>The family tree', TOUCH ? 'Every ancestor on one screen, the way Ancestry shows it. Search any name; tap anyone for their story.' : 'Every ancestor on one screen, the way Ancestry shows it. Search any name; OK on anyone for their story.'],
    ['walk', '<i>▶</i>Watch the walkthrough', `The film: the timeline, the map, every generation with its photographs. ${TOUCH ? 'Tap to move on.' : 'OK pauses.'}`],
    ['tree', '<i>⌘</i>Walk the tree', TOUCH ? 'One person at a time, big photographs: tap a parent to climb back through the generations.' : 'One person at a time with the remote: ▲ to a parent, ◀ ▶ across, ▼ back down.'],
    ['browse', '<i>☰</i>Browse the chapters', 'The lines, the timeline, the map and the records, one page at a time.']];
  function drawMenu() {
    const list = level === 'top' ? TOP : SUB;
    $('mKick').textContent = level === 'top' ? 'The family tree' : 'The Hutchins Family Tree';
    $('mTitle').innerHTML = level === 'top' ? 'The <i>Hutchins</i> Family Tree' : (mside === 'c' ? "Christine's <i>Side</i>" : "DeWitt's <i>Side</i>");
    $('mSub').textContent = level === 'top' ? "DeWitt's family back to Dorset in 1532, and Christine's back to Alsace, Bavaria, Pennsylvania and Russia." : TOP.find(t => t[0] === mside)[2];
    $('mOpts').innerHTML = list.map(([t, b, sp]) => `<button${t === 'both' ? ' class="slim"' : ''}><b>${b}</b><span>${sp}</span></button>`).join('');
    $('mOpts').classList.toggle('two', level === 'top'); $('mOpts').classList.toggle('four', level !== 'top'); $('menu').classList.toggle('side', level !== 'top');
    $('mKeys').textContent = level === 'top' ? '◀ ▶ choose · OK open' : '◀ ▶ choose · OK start · Back: both sides';
    opts().forEach((b, j) => { b.onclick = () => choose(j); b.onmouseenter = () => focus(j); });
  }
  const MUSIC = window.FAMILYMUSIC || { play() {}, menu() {}, stop() {} };   // music.js: classical music under the films
  function start(md) { clearTimeout(idle); treeBg('off'); on = true; paused = false; mode = md; scenes = voiced(opened(md, build(md))); n = 0; $('menu').classList.remove('on'); F.setMode('walk'); MUSIC.play(md); show(); }
  function stop() { on = false; clearInterval(timer); clearTimeout(sayT); clearTimeout(openT); NARR.stop(); if (visStop) { visStop(); visStop = null; } $('story').className = 'film'; }
  // the intro: a collage of family photographs tossed onto the table, with the title over them; then the chronicle,
  // a sepia plate for each moment in the families' history (data.js chronicle); then the menu. A tap (or ▶) moves
  // on a step, ◀ goes back, OK or Skip goes straight to the menu. The grown tree is kept for the main page, dimmed
  // behind the menu, and switched off while a film, the explorer or the pages are showing.
  const FEATURE = (D.chronicle || []).flatMap(c => c.who);
  let treeStop = null, introOn = false, chronT = null, istep = -1;
  function treeBg(st) {
    const el = $('intro'); if (!el || !window.FAMILYGROW) return false;
    clearTimeout(chronT);
    if (st === 'off') { if (treeStop) { treeStop(); treeStop = null; } el.className = 'intro off'; return true; }
    if (st === 'intro') { introOn = true; MUSIC.play('intro');
      $('iSub').textContent = `${T.ancestors.length + (SP ? SP.ancestors.length : 0)} ancestors · Dorset, Plymouth Colony, Lorraine, Alsace, Bavaria, Scotland and Russia`;
      $('iGo').textContent = TOUCH ? 'Tap to continue' : '▶ continue · OK skips to the menu';
      const q = new URLSearchParams(location.search).get('chron');
      if (q != null || !(D.collage || []).length) { istep = Math.max(0, Math.min(CH.length - 1, +q || 0)); el.className = 'intro chron'; chronicle(istep); }
      else collage();
      return true; }
    el.className = 'intro bg'; if (!treeStop) treeStop = window.FAMILYGROW.grow($('iTree'), { pair: true, growMs: 1, tour: false, quiet: true, feature: FEATURE });
    return true;
  }
  // --- the collage: prints dealt onto a loose grid that fits the screen, each tipped a little, landing in random order
  const PILE = D.collage || [], rnd = (j, s) => { const x = Math.sin(j * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
  const TOSS = REDUCED ? 0 : 230;   // ms between prints landing
  function layoutPile() {
    const box = $('iCol'), prints = box.querySelectorAll('.print'); if (!prints.length) return;
    const W = innerWidth, H = innerHeight, n = prints.length, cols = Math.max(3, Math.round(Math.sqrt(n * W / H))), rows = Math.ceil(n / cols);
    const cw = W / cols, ch = H / rows;
    prints.forEach((p, j) => {
      const c = j % cols, r = Math.floor(j / cols), a = +p.dataset.a;
      const w = Math.min(cw * 1.3, ch * 1.3 * a) * (a > 1.2 ? 1.12 : 1);   // the white border is a share of the print, not the screen
      p.style.width = w.toFixed(0) + 'px'; p.style.setProperty('--pp', (w * .045).toFixed(1) + 'px'); p.style.setProperty('--pf', Math.max(10, Math.min(17, w * .07)).toFixed(1) + 'px');
      p.style.left = ((c + .5 + (r % 2 ? .25 : -.1) + (rnd(j, 1) - .5) * .4) * cw).toFixed(0) + 'px';
      p.style.top = ((r + .5 + (rnd(j, 2) - .5) * .35) * ch).toFixed(0) + 'px';
    });
  }
  function collage() {
    const el = $('intro'), box = $('iCol'); istep = -1; clearTimeout(chronT);
    el.className = 'intro col';
    const order = PILE.map((p, j) => [rnd(j, 7), p]).sort((x, y) => x[0] - y[0]).map(x => x[1]);   // shuffled, the same every time
    box.innerHTML = `<div class="pile">${order.map((p, j) => `<figure class="print" data-a="${p.a}" style="--r:${((rnd(j, 3) - .5) * 16).toFixed(1)}deg;` +
      `--fr:${((rnd(j, 4) - .5) * 50).toFixed(1)}deg;--fx:${((rnd(j, 5) - .5) * 60).toFixed(0)}vw;--fy:${((rnd(j, 6) - .5) * 50).toFixed(0)}vh;z-index:${Math.floor(rnd(j, 8) * 50)}">` +
      `<img src="${p.src}" alt=""><figcaption>${p.label}</figcaption></figure>`).join('')}</div>`;
    layoutPile();
    const prints = [...box.querySelectorAll('.print')], land = prints.map((p, j) => [rnd(j, 9), p]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
    // deal once the photographs are in (or after 2.5 s), so no print lands blank
    const imgs = [...box.querySelectorAll('img')], gen0 = ++dealGen;
    const loaded = im => im.complete ? null : new Promise(r => { im.onload = im.onerror = r; });
    Promise.race([Promise.all(imgs.map(loaded)), new Promise(r => setTimeout(r, 2500))]).then(() => {
      if (!introOn || istep >= 0 || gen0 !== dealGen || el.classList.contains('titled')) return;
      land.forEach((p, j) => { p.style.animationDelay = (200 + j * TOSS) + 'ms'; p.classList.add('on'); });
      chronT = setTimeout(() => { if (!introOn) return; el.classList.add('titled'); chronT = setTimeout(() => introOn && introNext(), REDUCED ? 6000 : 8000); }, 200 + land.length * TOSS + 600);
    });
  }
  let dealGen = 0;
  addEventListener('resize', () => { if (introOn && istep < 0) layoutPile(); });
  function introNext() {
    if (!introOn) return; clearTimeout(chronT);
    const el = $('intro');
    if (istep < 0 && !el.classList.contains('titled')) {   // still dealing: land them all now and show the title
      $('iCol').querySelectorAll('.print').forEach(p => { p.style.animationDelay = '0ms'; p.classList.add('on'); }); el.classList.add('titled');
      chronT = setTimeout(() => introOn && introNext(), REDUCED ? 6000 : 8000); return; }
    istep++;
    if (istep >= CH.length) return endIntro();
    if (istep === 0 && el.classList.contains('col')) {   // the collage fades out, the first plate fades in
      el.classList.add('leave'); chronT = setTimeout(() => { if (!introOn) return; el.className = 'intro chron'; chronicle(0); }, REDUCED ? 0 : 900); return; }
    chronicle(istep);
  }
  function introPrev() {
    if (!introOn) return; clearTimeout(chronT);
    if (istep > 0) { istep--; chronicle(istep); } else if (istep === 0) collage();
  }
  const CH = D.chronicle || [], y0 = 1500, y1 = 2000, pos = y => (((+String(y).match(/\d{4}/)) - y0) / (y1 - y0) * 100).toFixed(2);
  function kinOf([side, k]) { const M = side === 'c' ? C : A, a = M[k]; return a ? `${a.name}, ${side === 'c' ? "Christine's" : "DeWitt's"} ${kin(k)}` : ''; }
  function chronicle(i) {
    const box = $('iChron'); if (!box) return;
    if (!box.dataset.built) {
      box.dataset.built = 1; CH.forEach(c => { const im = new Image(); im.src = c.img; });   // load every plate up front
      box.innerHTML = `<div class="cplates"></div><div class="cribbon"><i></i>${CH.map((c, j) => `<b style="left:${pos(c.year)}%" data-j="${j}"></b>`).join('')}` +
        `<span style="left:0">1500</span><span style="left:50%">1750</span><span style="left:100%">today</span></div><div class="cgrain"></div>`;
    }
    const plates = box.querySelector('.cplates');
    const c = CH[i], who = c.who.map(kinOf).filter(Boolean);
    const el = document.createElement('div'); el.className = 'cplate';
    el.innerHTML = `<div class="cpic${c.fit === 'contain' ? ' whole' : ''}"><img src="${c.img}" alt=""></div>` +
      `<div class="ctext"><p class="cy">${c.year}</p><h2>${c.title}</h2><p class="cs">${c.text}</p>${who.length ? `<p class="ck">${who.join('<br>')}</p>` : ''}</div>`;
    plates.appendChild(el); void el.offsetWidth; el.classList.add('on');
    [...plates.children].slice(0, -1).forEach(o => { o.classList.remove('on'); o.classList.add('out'); setTimeout(() => o.remove(), 1200); });
    box.querySelectorAll('.cribbon b').forEach(b => b.classList.toggle('on', +b.dataset.j === i));
    box.querySelector('.cribbon i').style.width = pos(c.year) + '%';
    chronT = setTimeout(() => introOn && introNext(), Math.max(REDUCED ? 6000 : 8500, 3000 + chars(c.text) * 60));
  }
  function endIntro() { introOn = false; clearTimeout(chronT); menu(); }
  if ($('intro')) { $('intro').onclick = e => { if (e.target.closest('.iskip')) return; introNext(); }; $('iSkip').onclick = () => introOn && endIntro(); }
  // the Lobby button only for someone who came from the Dewplex; family opening a shared link don't need it
  const lob = document.querySelector('.lobby');
  if (lob && window.top === window && !/\/tv(\/|\?|#|$)/.test(document.referrer)) lob.remove();
  let idle = null;   // left on the menu, the TV starts a film by itself
  function menu(lv) { stop(); window.FAMILYEXPLORE && window.FAMILYEXPLORE.close(); window.FAMILYPED && window.FAMILYPED.close(); F.setMode('menu'); treeBg('bg'); MUSIC.menu();
    if (lv) level = lv; drawMenu(); $('menu').classList.add('on'); focus(0); clearTimeout(idle);
    idle = setTimeout(() => $('menu').classList.contains('on') && start(level === 'top' ? 'both' : mside), 45000); }
  let sel = 0; const opts = () => [...document.querySelectorAll('#menu .opts button')];
  function focus(k) { clearTimeout(idle); sel = k; opts().forEach((b, j) => b.classList.toggle('sel', j === k)); opts()[k] && opts()[k].focus({ preventScroll: true }); }
  function choose(k) {
    if (level === 'top') { const t = TOP[k][0]; if (t === 'both') return start('both'); mside = t; level = 'side'; drawMenu(); focus(0); return; }
    const what = SUB[k][0]; if (what === 'walk') return start(mside);
    MUSIC.stop();   // the tree view, the explorer and the pages are for reading
    $('menu').classList.remove('on'); stop(); treeBg('off');
    if (what === 'ped') window.FAMILYPED.open(mside); else if (what === 'tree') window.FAMILYEXPLORE.open(mside); else { F.setSide(mside); F.setMode('browse'); }
  }
  // Back: from a film, the explorer or the pages to the menu it came from; from a side's menu to the top
  const back = () => menu(mode === 'both' && on ? 'top' : level);
  window.FAMILYMENU = back;   // the tree view's own Menu button

  addEventListener('keydown', e => {
    if (introOn) { e.preventDefault(); e.stopImmediatePropagation();
      if (e.key === 'ArrowRight') introNext(); else if (e.key === 'ArrowLeft') introPrev(); else endIntro(); return; }
    if ($('menu').classList.contains('on')) {
      const nOpt = opts().length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); focus((sel + nOpt - 1) % nOpt); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); focus((sel + 1) % nOpt); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(sel); }
      else if ((e.key === 'Escape' || e.key === 'Backspace') && level === 'side') { e.preventDefault(); level = 'top'; drawMenu(); focus(mside === 'c' ? 1 : 0); }
      e.stopImmediatePropagation(); return;
    }
    if (on) {
      if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Enter' || e.key === ' ') { paused = !paused; $('story').classList.toggle('paused', paused); NARR.pause(paused); if (!paused) started = performance.now() - (parseFloat($('sBar').style.width) || 0) / 100 * dwell; }
      else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'ArrowUp' || e.key === 'ArrowDown') back();
      else return;
      e.preventDefault(); e.stopImmediatePropagation(); return;
    }
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'm') { e.preventDefault(); e.stopImmediatePropagation(); back(); }
  }, true);
  $('sMenu').onclick = back; $('toMenu').onclick = back;
  // a tap on the film: the left third goes back a scene, anywhere else goes on
  $('story').addEventListener('click', e => { if (e.target.closest('button')) return; step(e.clientX < innerWidth / 3 ? -1 : 1); });
  $('mBack').onclick = () => { level = 'top'; drawMenu(); focus(mside === 'c' ? 1 : 0); };

  const q = new URLSearchParams(location.search);
  const qs = q.get('side'); if (qs === 'h' || qs === 'c') { mside = qs; level = 'side'; }
  if (q.get('scenes') != null) {   // scripts/family-voice.py: every scene that is read aloud, as the film builds them
    const all = []; for (const m of ['both', 'h', 'c']) { mode = m; all.push(...voiced(opened(m, build(m))).map(s => s.type === 'vis' ? { voice: s.voice, type: 'vis', title: '', story: s.say } : s)); }
    for (const [id, mp] of Object.entries(D.maps || {})) (mp.steps || []).forEach((st, j) => all.push({ voice: `m-${id}-${j}`, type: 'vis', title: '', story: st.t }));
    const pre = document.createElement('pre'); pre.id = 'scenesJson';
    pre.textContent = JSON.stringify(all.filter(s => s.voice).map(s => ({ voice: s.voice, type: s.type, chapter: !!s.chapter, title: plain(s.type === 'title' ? s.title : s.type === 'vis' ? '' : s.name), sub: plain(s.sub || ''), story: plain(s.story || '') })));
    document.body.appendChild(pre);
  }
  if (q.get('walk') != null) start(qs === 'h' || qs === 'c' ? qs : 'both');
  else if (q.get('ped') != null) {   // ?ped=h4358 opens the tree view on that person (the view keeps the address up to date)
    const m = (q.get('ped') || '').match(/^([hc])(\d*)$/); if (m) mside = m[1]; level = 'side'; drawMenu(); treeBg('off'); window.FAMILYPED.open(mside, m && m[2] ? +m[2] : 1); }
  else if (q.get('tree') != null) { level = 'side'; drawMenu(); choose(SUB.findIndex(x => x[0] === 'tree')); }
  else if (q.get('p') != null) { level = 'side'; drawMenu(); choose(SUB.findIndex(x => x[0] === 'browse')); }
  else if (!treeBg('intro')) menu();
  requestAnimationFrame(tick);
})();
