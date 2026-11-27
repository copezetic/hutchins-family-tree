/* Explore the tree: walk the pedigree with the remote. ▲ goes to the father, ◀ ▶ swap between the two parents (or,
   at DeWitt and Christine, between the two of them), ▼ comes back down the line toward the start. OK steps through
   the person's photographs. Grandparents show above, so you can see where ▲ leads. */
(() => {
  const F = window.FAMILYAPP, D = window.FAMILY, $ = id => document.getElementById(id);
  const { A, C, SP, pics, note, gen, kin } = F;
  const T = { h: A, c: C };
  let side = 'h', k = 1, ph = 0, on = false, timer = null, lock = false;
  const TOUCH = matchMedia('(pointer: coarse)').matches;

  const yr = a => { const m = ((a.born || {}).date || a.years || '').match(/\d{4}/); return m ? m[0] : ''; };
  const place = a => a && !a.living && a.born && a.born.place ? a.born.place.split(',').slice(0, 2).join(',') : '';
  const label = (s, kk) => kk === 1 ? (s === 'h' ? 'DeWitt' : 'Christine') : (s === 'h' ? "DeWitt's " : "Christine's ") + kin(kk);
  const photosOf = (s, kk) => { const a = T[s][kk]; if (!a) return [];
    const own = s === 'h' && D.stories[kk] && D.stories[kk].photos || [];
    return [...own, ...pics(a)].filter((x, j, all) => all.findIndex(y => y.src === x.src) === j); };
  const storyOf = (s, kk) => { const a = T[s][kk]; return (s === 'h' && D.stories[kk] && D.stories[kk].story) || note(a).story || ''; };

  function card(s, kk, cls) {
    const a = T[s][kk];
    if (!a) return `<div class="xc ${cls} empty"><span>${kk % 2 ? 'Mother' : 'Father'}</span><small>not yet found</small></div>`;
    const p = photosOf(s, kk).find(x => !/\/era\//.test(x.src));
    return `<div class="xc ${cls}" data-s="${s}" data-k="${kk}">${p ? `<i style="background-image:url('${p.src}')"></i>` : ''}<b>${a.name}</b><small>${a.years || ''}</small></div>`;
  }
  function render(dir) {
    const M = T[side], a = M[k]; if (!a) return;
    const ps = photosOf(side, k); ph = Math.min(ph, Math.max(0, ps.length - 1));
    const fa = 2 * k, mo = 2 * k + 1;
    const spouse = k === 1 ? (side === 'h' ? (SP ? ['c', 1] : null) : ['h', 1]) : [side, k ^ 1];
    const child = k > 1 ? k >> 1 : null;
    $('xGrand').innerHTML = [2 * fa, 2 * fa + 1, 2 * mo, 2 * mo + 1].map(g => card(side, g, 'g')).join('');
    $('xParents').innerHTML = card(side, fa, 'p') + card(side, mo, 'p');
    const p = ps[ph];
    $('xMain').innerHTML =
      `<div class="xph">${p ? `<img src="${p.src}" alt=""><p>${p.cap}${ps.length > 1 ? ` <em>${ph + 1} / ${ps.length} · ${TOUCH ? 'tap' : 'OK'} for next</em>` : ''}</p>` : `<div class="xnone">${place(a) ? place(a).split(',')[0] : 'No photograph yet'}</div>`}</div>` +
      `<div class="xtx"><p class="kick">${label(side, k)}</p>${k > 3 ? `<p class="via">${F.via(side, k)}</p>` : ''}<h2>${a.name}</h2>` +
      `<p class="meta">${a.living ? (yr(a) ? 'Born ' + yr(a) : '') : [a.born && (a.born.date || a.born.place) ? `<span>born</span> ${[a.born.date, place(a)].filter(Boolean).join(', ')}` : '', a.died && (a.died.date || a.died.place) ? `<span>died</span> ${[a.died.date, (a.died.place || '').split(',').slice(0, 2).join(',')].filter(Boolean).join(', ')}` : ''].filter(Boolean).join('<br>')}</p>` +
      ((a.siblings || []).length ? `<p class="sb"><span>Brothers and sisters</span> ${F.sibs(a)}</p>` : '') +
      (storyOf(side, k) ? `<p class="st${storyOf(side, k).length > 600 ? ' long' : ''}">${storyOf(side, k)}</p>` : '') + `</div>`;
    $('xSide').innerHTML = spouse && T[spouse[0]][spouse[1]] ? `<span>${k === 1 ? 'married to' : 'with'}</span>` + card(spouse[0], spouse[1], 's') : '';
    $('xDown').innerHTML = child ? `<span>▼ back to</span>${card(side, child, 'd')}` : '';
    $('xPath').textContent = (side === 'h' ? 'DeWitt' : 'Christine') + (k > 1 ? ' · ' + Math.floor(Math.log2(k)) + ' generations up' : '');
    document.querySelectorAll('#explore .xc[data-k]').forEach(el => el.onclick = () => go(el.dataset.s, +el.dataset.k));
    const im = $('xMain').querySelector('.xph img');   // a tap on the photograph shows the next one
    if (im && ps.length > 1) { im.style.cursor = 'pointer'; im.onclick = () => { ph = (ph + 1) % ps.length; render(); }; }
    // motion: the main card slides in from the direction travelled; the cards around it settle in; the backdrop
    // is the person's own photograph, blurred; the small tree in the corner lights the line from the start
    if (dir) {
      const m = $('xMain'); m.classList.remove('a-up', 'a-down', 'a-side'); void m.offsetWidth; m.classList.add('a-' + dir);
      ['xGrand', 'xParents', 'xSide', 'xDown'].forEach(id => { const el = $(id); el.classList.remove('a'); void el.offsetWidth; el.classList.add('a'); });
    }
    const bgp = ps.find(x => !/\/era\//.test(x.src)) || ps[0];
    $('xBg').style.backgroundImage = bgp ? `url('${bgp.src}')` : ''; $('xBg').classList.toggle('on', !!bgp);
    if (window.FAMILYGROW) $('xMini').innerHTML = window.FAMILYGROW.mini(side, k);
    clearInterval(timer);
    if (ps.length > 1) timer = setInterval(() => { ph = (ph + 1) % ps.length; render(); }, 9000);
  }
  function go(s, kk, dir) { if (!T[s][kk]) return; dir = dir || (s === side && gen(kk) !== gen(k) ? (kk > k ? 'up' : 'down') : 'side'); side = s; k = kk; ph = 0; render(dir);
    if ($('explore').scrollTop > 0) $('explore').scrollTo({ top: 0, behavior: 'smooth' }); }   // a phone scrolls; start the new person at the top
  function key(e) {
    if (!on) return;
    const M = T[side];
    if (e.key === 'ArrowUp') { const first = lock && side === 'c' && k === 1 ? [3, 2] : [2 * k, 2 * k + 1]; const to = first.find(x => M[x]); if (to) go(side, to, 'up'); }
    else if (e.key === 'ArrowDown') { if (k > 1) go(side, k >> 1, 'down'); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (k === 1) { if (!lock) { if (side === 'h' && SP) go('c', 1); else go('h', 1); } }
      else if (M[k ^ 1]) go(side, k ^ 1);
    }
    else if (e.key === 'Enter' || e.key === ' ') { ph++; const n = photosOf(side, k).length; if (ph >= n) ph = 0; render(); }
    else return;
    e.preventDefault(); e.stopImmediatePropagation();
  }
  addEventListener('keydown', key, true);
  window.FAMILYEXPLORE = {
    open(s) { on = true; lock = !!s; if (s) { side = s === 'c' && SP ? 'c' : 'h'; k = 1; ph = 0; } $('explore').classList.add('on'); F.setMode('explore'); render('up'); },
    close() { on = false; clearInterval(timer); $('explore').classList.remove('on'); },
  };
})();
