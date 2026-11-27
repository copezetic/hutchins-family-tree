/* Narration: a recorded reading of each history chapter and each page of the family book, made with
   scripts/family-voice.py and kept in family/voice/ (voice.js lists the clips and their lengths). In the films a
   chapter is read aloud as it plays, the music drops under the voice, and the scene waits for the reading to end.
   On the chapter pages a Listen button plays the same clip. The voice button turns narration off; the choice is
   remembered on this device. */
(() => {
  const V = window.FAMILYVOICE || { v: 0, clips: {} }, CLIPS = V.clips || {};
  const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const key = (kind, title) => `${kind}-${slug(title)}`;
  const el = new Audio(); el.preload = 'auto'; el.setAttribute('playsinline', '');
  let off = false; try { off = localStorage.getItem('family.voice') === 'off'; } catch (e) {}
  let cur = null, tok = 0, hooks = {}, cues = null; const CUES = {};
  const duck = b => { const m = window.FAMILYMUSIC; if (m && m.duck) m.duck(b); };
  const mark = () => {
    document.querySelectorAll('button.listen').forEach(b => { const on = cur === b.dataset.k; b.classList.toggle('on', on); b.innerHTML = on ? '■ Stop' : '▶ Listen'; });
    const vb = document.getElementById('vBtn'); if (vb) { vb.classList.toggle('off', off); vb.setAttribute('aria-pressed', String(!off)); }
  };
  function stop() { tok++; if (cur) { el.pause(); duck(false); } cur = null; hooks = {}; cues = null; mark(); }
  // the captions: [[seconds, text], …] beside each clip, fetched when it first plays
  function loadCues(k, mine) {
    if (CUES[k]) { cues = CUES[k]; return; }
    fetch(`voice/${CLIPS[k][0]}.json?v=${V.v}`).then(r => r.ok ? r.json() : []).then(c => { CUES[k] = c; if (mine === tok) cues = c; }).catch(() => {});
  }
  // play a clip; onstart(seconds) once the sound is really running, onend when it finishes by itself
  function play(k, h = {}, force = false) {
    stop(); const c = CLIPS[k]; if (!c || (off && !force)) return false;
    const mine = ++tok; cur = k; hooks = h; loadCues(k, mine); el.src = `voice/${c[0]}.m4a?v=${V.v}`;
    const p = el.play(); const ok = () => { if (mine !== tok) return; duck(true); mark(); if (h.onstart) h.onstart(c[1]); };
    if (p && p.then) p.then(ok).catch(() => { if (mine === tok) { cur = null; cues = null; mark(); if (h.onfail) h.onfail(); } }); else ok();
    return true;
  }
  el.addEventListener('ended', () => { const h = hooks; duck(false); cur = null; hooks = {}; cues = null; mark(); if (h.onend) h.onend(); });
  function toggle() { off = !off; try { localStorage.setItem('family.voice', off ? 'off' : 'on'); } catch (e) {} if (off) stop(); mark(); }
  // Listen buttons on the chapter pages, and the voice button over the films
  addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button.listen'); if (b) { e.stopPropagation(); if (cur === b.dataset.k) stop(); else play(b.dataset.k, {}, true); return; }
    if (e.target.closest && e.target.closest('#vBtn')) { e.stopPropagation(); toggle(); }
  }, true);
  addEventListener('DOMContentLoaded', () => {
    const vb = document.getElementById('vBtn');
    if (vb) { if (!Object.keys(CLIPS).length) vb.remove(); else vb.addEventListener('pointerdown', e => e.stopPropagation()); }   // not a tap on the film
    mark();
  });
  window.FAMILYNARR = {
    isOff: () => off,
    // the caption being spoken now ('' between them, and while the title is read)
    cue() { if (!cur || !cues) return ''; const t = el.currentTime; let s = ''; for (const c of cues) { if (c[0] <= t) s = c[1]; else break; } return s; },
    key, has: k => !!CLIPS[k], dur: k => (CLIPS[k] || [])[1] || 0, play, stop, toggle,
    pause(b) { if (!cur) return; if (b) el.pause(); else { const p = el.play(); if (p && p.catch) p.catch(() => {}); } },
    button: k => CLIPS[k] ? `<button class="listen" data-k="${k}">▶ Listen</button>` : '',
    state: () => ({ off, cur, t: +el.currentTime.toFixed(1), paused: el.paused, clips: Object.keys(CLIPS).length }),   // for checking without ears
  };
})();
