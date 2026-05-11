/* Terroir voting — Firestore-backed with localStorage anti-double-vote.
 * Reads the same Firebase config as littoralicious/assets/js/firebase-config.js.
 * Graceful degradation: if Firestore is blocked by rules, counts stay at 0 client-side.
 *
 * Markup expected (the generator emits this):
 *   <button class="tcard__votes" data-venue-id="v01-foo" data-section="tables">
 *     <span class="star">★</span> <span class="count">0</span> VOTES
 *   </button>
 *
 * Each .tcard sits inside an element with data-section-id="tables" (the section
 * that owns it). After votes load, we sort cards within each section by count
 * desc, ties keep original order, then re-render rank numbers (#1, #2, …).
 */
(function () {
  const SLUG = (window.PCV_CONFIG && window.PCV_CONFIG.articleId) || 'terroir-default';
  const STORAGE_KEY = 'terroir-vote:' + SLUG;
  const COL = 'terroir_votes';

  // ---------- Firebase init (idempotent — page may also load it) ----------
  const firebaseConfig = {
    apiKey: 'AIzaSyBIbFq4FtYsoz3_GAoQaJAOynaaouooYFE',
    authDomain: 'littoralicious-web-eceed.firebaseapp.com',
    projectId: 'littoralicious-web-eceed',
    storageBucket: 'littoralicious-web-eceed.firebasestorage.app',
    messagingSenderId: '1024688297116',
    appId: '1:1024688297116:web:e208f3c7f71019268ec959',
  };

  let db = null;
  function ensureDb() {
    if (db) return db;
    try {
      if (typeof firebase === 'undefined') return null;
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      return db;
    } catch (e) {
      console.warn('[terroir-votes] Firebase init failed; running offline:', e);
      return null;
    }
  }

  // ---------- localStorage flags (one vote per browser per venue) ----------
  function getVoted() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (_) { return {}; }
  }
  function setVoted(map) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch (_) {}
  }

  // ---------- Public API ----------
  const counts = {}; // venueId -> count

  async function loadCounts() {
    const buttons = document.querySelectorAll('.tcard__votes[data-venue-id]');
    if (!buttons.length) return;
    const fdb = ensureDb();

    if (!fdb) {
      buttons.forEach(b => updateButton(b, 0));
      return;
    }

    const slugCol = fdb.collection(COL).doc(SLUG).collection('venues');
    try {
      const snap = await slugCol.get();
      snap.forEach(doc => { counts[doc.id] = (doc.data() || {}).count || 0; });
    } catch (e) {
      console.warn('[terroir-votes] read blocked or failed:', e.message || e);
    }

    const voted = getVoted();
    buttons.forEach(btn => {
      const id = btn.getAttribute('data-venue-id');
      const c = counts[id] || 0;
      updateButton(btn, c, !!voted[id]);
    });

    sortAllSections();
  }

  function updateButton(btn, count, hasVoted) {
    const cspan = btn.querySelector('.count');
    if (cspan) cspan.textContent = count;
    if (hasVoted) btn.classList.add('has-voted');
  }

  async function castVote(btn) {
    const id = btn.getAttribute('data-venue-id');
    if (!id) return;
    const voted = getVoted();
    if (voted[id]) return; // already voted

    voted[id] = Date.now();
    setVoted(voted);

    counts[id] = (counts[id] || 0) + 1;
    updateButton(btn, counts[id], true);
    sortSection(btn.closest('[data-section-id]'));

    const fdb = ensureDb();
    if (!fdb) return;
    try {
      const ref = fdb.collection(COL).doc(SLUG).collection('venues').doc(id);
      await ref.set({
        count: firebase.firestore.FieldValue.increment(1),
        lastVote: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      // rules likely block writes — keep optimistic UI
      console.warn('[terroir-votes] write blocked (rules need update):', e.message || e);
    }
  }

  function sortSection(sectionEl) {
    if (!sectionEl) return;
    const list = sectionEl.querySelector('[data-tcard-list]') || sectionEl;
    const cards = Array.from(list.querySelectorAll(':scope > .tcard'));
    if (!cards.length) return;

    cards.forEach((c, i) => {
      if (c.dataset.origIndex === undefined) c.dataset.origIndex = String(i);
    });

    cards.sort((a, b) => {
      const ia = parseInt(a.dataset.origIndex, 10);
      const ib = parseInt(b.dataset.origIndex, 10);
      const ca = counts[a.dataset.venueId] || 0;
      const cb = counts[b.dataset.venueId] || 0;
      if (cb !== ca) return cb - ca;
      return ia - ib;
    });

    cards.forEach((c, i) => {
      list.appendChild(c);
      const r = c.querySelector('.tcard__rank');
      if (r) r.textContent = '#' + (i + 1);
    });
  }

  function sortAllSections() {
    document.querySelectorAll('[data-section-id]').forEach(sortSection);
  }

  // ---------- Wire up ----------
  document.addEventListener('click', e => {
    const btn = e.target.closest('.tcard__votes');
    if (btn) { e.preventDefault(); castVote(btn); }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCounts);
  } else {
    loadCounts();
  }

  window.TerroirVotes = { loadCounts, sortAllSections, counts };
})();
