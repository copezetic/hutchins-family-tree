/* Music under the films: public-domain and CC0 recordings from Wikimedia Commons (performers in TRACKS), evened out to
   the same loudness (-20 LUFS) and kept in family/music/. Satie opens the intro; each walkthrough has its own running
   order; pieces crossfade into each other; the menu plays them softly; the tree view, the explorer and the pages are
   quiet. The ♪ button, or the remote's play/pause key, turns it off, and the choice is remembered on this device.
   Phones only allow sound after a tap, so there it starts with the first one. On an iPhone the fades go through Web
   Audio gain nodes, because Safari ignores audio.volume; everywhere else the element volume is enough. */
(() => {
  const $ = id => document.getElementById(id);
  const TRACKS = {
    satie: ['Erik Satie', 'Gymnopédie No. 1', 'Michael Laucke'],
    air: ['J. S. Bach', 'Air on the G String', 'Air Force Strings, U.S. Air Force Band'],
    canon: ['Johann Pachelbel', 'Canon in D', 'Strolling Strings, U.S. Air Force Band'],
    largo: ['Antonín Dvořák', '“Goin’ Home,” from the New World Symphony', 'U.S. Air Force Band'],
    nocturne: ['Frédéric Chopin', 'Nocturne in E-flat, Op. 9 No. 2', 'Frank Lévy'],
    morning: ['Edvard Grieg', 'Morning Mood', 'Musopen Symphony'],
    clair: ['Claude Debussy', 'Clair de lune', 'Laurens Goedhart'],
    pathetique: ['Ludwig van Beethoven', 'Pathétique Sonata, Adagio cantabile', 'Musopen'],
    traumerei: ['Robert Schumann', 'Träumerei', 'Musopen'],
    brahms: ['Johannes Brahms', 'Intermezzo, Op. 118 No. 2', 'Musopen'],
    jesu: ['J. S. Bach', 'Jesu, Joy of Man’s Desiring', 'Orchestra Gli Armonici'],
  };
  const SETS = {
    intro: ['satie', 'clair', 'traumerei'],
    h: ['air', 'largo', 'canon', 'nocturne', 'jesu', 'pathetique', 'clair', 'brahms', 'traumerei', 'morning'],    // the English and American lines
    c: ['morning', 'traumerei', 'brahms', 'clair', 'nocturne', 'jesu', 'air', 'pathetique', 'canon', 'largo'],    // Alsace, Bavaria, Pennsylvania, Russia
    both: ['canon', 'air', 'morning', 'nocturne', 'largo', 'traumerei', 'clair', 'jesu', 'pathetique', 'brahms'],
  };
  const LEVEL = .75, SOFT = .4, XF = 4, DUCK = .28;   // film level, menu level, crossfade seconds, and how far the music drops under the narrator
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let off = false; try { off = localStorage.getItem('family.music') === 'off'; } catch (e) {}

  // two decks to crossfade between; a master level for soft and off
  const decks = [0, 1].map(() => { const el = new Audio(); el.preload = 'auto'; el.setAttribute('playsinline', ''); return { el, lv: 0, to: 0, rate: 0, k: '', g: null }; });
  const M = { lv: 0, to: 0, rate: 0 };
  let want = null, idx = 0, cur = 0, soft = false, ducked = false, blocked = false, ctx = null, timer = 0, toastT = 0;

  function graph() {   // iPhone only, made on a tap
    if (!iOS || ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); const master = ctx.createGain(); master.connect(ctx.destination); M.g = master;
      decks.forEach(d => { const s = ctx.createMediaElementSource(d.el); d.g = ctx.createGain(); s.connect(d.g).connect(master); });
    } catch (e) { ctx = null; }
  }
  const out = () => {
    if (ctx) { M.g.gain.value = M.lv; decks.forEach(d => { d.g.gain.value = d.lv; }); }
    else decks.forEach(d => { d.el.volume = Math.max(0, Math.min(1, d.lv * M.lv)); });
  };
  // every level eases toward its target, 20 steps a second
  function goTo(o, to, secs) { o.to = to; o.rate = Math.max(.001, Math.abs(to - o.lv) / Math.max(1, secs * 20)); if (!timer) timer = setInterval(tick, 50); }
  function tick() {
    let moving = false;
    for (const o of [M, ...decks]) if (o.lv !== o.to) { const d = o.to - o.lv; o.lv = Math.abs(d) <= o.rate ? o.to : o.lv + Math.sign(d) * o.rate; moving = true; }
    decks.forEach((d, j) => { if (!d.el.paused && ((d.lv === 0 && d.to === 0 && (j !== cur || !want)) || (M.lv === 0 && M.to === 0))) d.el.pause(); });
    out(); if (!moving) { clearInterval(timer); timer = 0; }
  }
  const master = () => goTo(M, off || !want ? 0 : (soft ? SOFT : LEVEL) * (ducked ? DUCK : 1), 1.2);

  function next(fade = XF) {
    if (!want) return;
    const list = SETS[want] || SETS.both, k = list[idx++ % list.length];
    const old = decks[cur]; cur ^= 1; const d = decks[cur];
    d.k = k; d.lv = 0; d.to = 0; d.el.src = `music/${k}.m4a?v=1`;
    if (!off) { const p = d.el.play(); if (p && p.catch) p.catch(() => { blocked = true; }); }
    goTo(d, 1, fade); if (old.k) goTo(old, 0, XF);
    master(); show(k);
  }
  decks.forEach((d, j) => {
    d.el.addEventListener('timeupdate', () => { if (j === cur && want && !off && d.el.duration && d.el.duration - d.el.currentTime < XF && d.to === 1) next(); });
    d.el.addEventListener('ended', () => { if (j === cur && want && !off) next(1); });
  });

  // the first tap or key lets the sound start where the browser held it back
  const unlock = () => {
    graph(); if (ctx && ctx.state === 'suspended') ctx.resume();
    if (want && !off && (blocked || decks[cur].el.paused)) { blocked = false; const p = decks[cur].el.play(); if (p && p.catch) p.catch(() => {}); }
  };
  addEventListener('pointerdown', unlock, true); addEventListener('keydown', unlock, true);

  // the ♪ button, with the piece's name for a few seconds whenever one starts
  function show(k) {
    const t = TRACKS[k]; if (!t || off) return;
    $('mTxt').innerHTML = `${t[0]} · ${t[1]}<small>${t[2]}</small>`; $('mNow').classList.add('say');
    clearTimeout(toastT); toastT = setTimeout(() => $('mNow').classList.remove('say'), 7000);
  }
  function toggle() {
    off = !off; try { localStorage.setItem('family.music', off ? 'off' : 'on'); } catch (e) {}
    $('mNow').classList.toggle('off', off); $('mBtn').setAttribute('aria-pressed', String(!off));
    if (off) { master(); $('mNow').classList.remove('say'); }
    else if (want) { graph(); if (ctx && ctx.state === 'suspended') ctx.resume(); next(2); }
  }
  $('mBtn').onclick = e => { e.stopPropagation(); toggle(); };
  $('mNow').addEventListener('pointerdown', e => e.stopPropagation());   // not a tap on the film or the intro
  $('mNow').classList.toggle('off', off); $('mBtn').setAttribute('aria-pressed', String(!off));
  addEventListener('keydown', e => {
    if (e.key === 'MediaPlayPause') { e.preventDefault(); toggle(); }
    else if ((e.key === 'MediaTrackNext' || e.key === 'MediaFastForward') && want && !off) { e.preventDefault(); next(2); }
  });

  window.FAMILYMUSIC = {
    // a set for the intro, a side's walkthrough or both; the same set keeps playing
    play(set, opts = {}) {
      soft = !!opts.soft; $('mNow').hidden = false;
      if (set === want && (decks[cur].k && !decks[cur].el.paused || off || blocked)) { master(); return; }
      want = set; idx = 0; next(set === 'intro' ? 2 : XF);
    },
    // the menu: whatever was playing carries on softly; after a quiet view, the intro's pieces from Clair de lune on
    menu() { soft = true; $('mNow').hidden = false; if (!want) { want = 'intro'; idx = 1; next(3); } else master(); },
    state: () => ({ want, off, soft, blocked, piece: decks[cur].k, paused: decks[cur].el.paused, t: Math.round(decks[cur].el.currentTime), level: +(M.lv * decks[cur].lv).toFixed(2) }),   // for checking without ears
    duck(b) { if (ducked === !!b) return; ducked = !!b; master(); },   // narrate.js: under a reading, and back up after it
    stop() { want = null; decks.forEach(d => goTo(d, 0, 1.5)); master(); $('mNow').classList.remove('say'); $('mNow').hidden = true; },
  };
})();
