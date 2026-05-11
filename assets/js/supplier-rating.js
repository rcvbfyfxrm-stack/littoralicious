/**
 * Littoralicious — Supplier Rating
 *
 * Wires a thumbs-up / thumbs-down strip into every <details class="pfold"
 * data-supplier-id="..."> on a Port Call page.
 *
 * - Stores votes in Firestore (`supplier_ratings/{articleId}__{supplierId}`)
 *   so counts are global across visitors.
 * - One vote per browser per supplier (localStorage); clicking again toggles.
 * - On load, counts are fetched and pfolds inside each .sfold__body are
 *   re-ordered by net score (ups - downs, descending). Original order is
 *   preserved as a tiebreaker so unrated entries keep their editorial sort.
 *
 * Page contract:
 *   <body data-article-id="port-call-venice">
 *     <details class="pfold" data-supplier-id="fruttolo"> ...
 *
 * No-op on pages without [data-article-id] or without firebase loaded.
 */
(function () {
    'use strict';

    const ARTICLE_ID = document.body && document.body.dataset
        ? document.body.dataset.articleId : null;
    if (!ARTICLE_ID) return;

    const FIREBASE_OK = typeof firebase !== 'undefined'
        && firebase.firestore
        && typeof db !== 'undefined';
    const STORAGE_KEY = 'littoralicious-supplier-votes';

    function getVotes() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
        catch (_) { return {}; }
    }
    function saveVotes(v) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); }
        catch (_) { /* quota — ignore */ }
    }
    function voteKey(supplierId) { return ARTICLE_ID + '__' + supplierId; }

    function ratingDocRef(supplierId) {
        if (!FIREBASE_OK) return null;
        return db.collection('supplier_ratings').doc(voteKey(supplierId));
    }

    /* ------------------------------------------------------------------ */
    /* UI builders                                                         */
    /* ------------------------------------------------------------------ */

    const SVG_UP   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>';
    const SVG_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>';

    function buildStrip(supplierId) {
        const wrap = document.createElement('div');
        wrap.className = 'sr-strip';
        wrap.dataset.supplierId = supplierId;
        wrap.innerHTML =
              '<span class="sr-prompt">Worth the call?</span>'
            + '<button type="button" class="sr-btn sr-btn--up" data-vote="up" aria-label="Recommend this supplier">'
            +   SVG_UP + '<span class="sr-count" data-count="up">0</span>'
            + '</button>'
            + '<button type="button" class="sr-btn sr-btn--down" data-vote="down" aria-label="Mark this supplier as not recommended">'
            +   SVG_DOWN + '<span class="sr-count" data-count="down">0</span>'
            + '</button>'
            + '<span class="sr-meta is-loading" data-meta>loading…</span>';
        return wrap;
    }

    function setStripCounts(strip, ups, downs, voteState) {
        strip.querySelector('[data-count="up"]').textContent = ups;
        strip.querySelector('[data-count="down"]').textContent = downs;
        const upBtn   = strip.querySelector('.sr-btn--up');
        const downBtn = strip.querySelector('.sr-btn--down');
        upBtn.classList.toggle('is-active',   voteState === 'up');
        downBtn.classList.toggle('is-active', voteState === 'down');
        const meta = strip.querySelector('[data-meta]');
        meta.classList.remove('is-loading');
        const total = ups + downs;
        meta.textContent = total === 0
            ? 'be the first chef to weigh in'
            : total + (total === 1 ? ' chef rated' : ' chefs rated');
    }

    function setRankBadge(pfold, rank) {
        const summary = pfold.querySelector(':scope > summary');
        if (!summary) return;
        let badge = summary.querySelector('.sr-rank');
        if (!rank || rank > 3) {
            if (badge) badge.remove();
            return;
        }
        const label = rank === 1 ? 'top pick' : rank === 2 ? '#2' : '#3';
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'sr-rank';
            // Insert just before the chevron if present, else at end of summary
            const chev = summary.querySelector('.pfold__chev');
            if (chev) summary.insertBefore(badge, chev);
            else summary.appendChild(badge);
        }
        badge.className = 'sr-rank sr-rank--' + rank;
        badge.textContent = '★ ' + label;
    }

    /* ------------------------------------------------------------------ */
    /* Rendering & sorting                                                 */
    /* ------------------------------------------------------------------ */

    /** Re-orders .pfold inside each .sfold__body by net score (desc). */
    function sortPfoldsByScore(scoreMap) {
        document.querySelectorAll('.sfold__body').forEach(function (body) {
            const pfolds = Array.from(body.querySelectorAll(':scope > .pfold[data-supplier-id]'));
            if (pfolds.length < 2) return;

            pfolds.forEach(function (p, i) {
                if (!p.dataset.editorialOrder) p.dataset.editorialOrder = String(i);
            });

            pfolds.sort(function (a, b) {
                const sa = scoreMap[a.dataset.supplierId] || { ups: 0, downs: 0 };
                const sb = scoreMap[b.dataset.supplierId] || { ups: 0, downs: 0 };
                const netA = (sa.ups || 0) - (sa.downs || 0);
                const netB = (sb.ups || 0) - (sb.downs || 0);
                if (netA !== netB) return netB - netA;
                // Tiebreak: editorial order (lower = first)
                return Number(a.dataset.editorialOrder) - Number(b.dataset.editorialOrder);
            });

            // Re-attach in new order. Rank badges only when there are ratings.
            pfolds.forEach(function (p, i) {
                body.appendChild(p);
                const score = scoreMap[p.dataset.supplierId];
                const total = score ? (score.ups || 0) + (score.downs || 0) : 0;
                setRankBadge(p, total > 0 ? (i + 1) : 0);
            });
        });
    }

    /* ------------------------------------------------------------------ */
    /* Vote handler                                                        */
    /* ------------------------------------------------------------------ */

    async function handleVote(supplierId, type, strip, scoreMap) {
        const stored = getVotes();
        const prev = stored[voteKey(supplierId)] || null;

        // Compute optimistic delta
        const cur = scoreMap[supplierId] || { ups: 0, downs: 0 };
        const delta = { ups: 0, downs: 0 };

        if (prev === type) {
            // Toggle off
            delta[type === 'up' ? 'ups' : 'downs'] = -1;
            stored[voteKey(supplierId)] = null;
            delete stored[voteKey(supplierId)];
        } else {
            if (prev) {
                delta[prev === 'up' ? 'ups' : 'downs'] = -1;
            }
            delta[type === 'up' ? 'ups' : 'downs'] = 1;
            stored[voteKey(supplierId)] = type;
        }
        saveVotes(stored);

        cur.ups   = Math.max(0, (cur.ups   || 0) + delta.ups);
        cur.downs = Math.max(0, (cur.downs || 0) + delta.downs);
        scoreMap[supplierId] = cur;

        const newVoteState = stored[voteKey(supplierId)] || null;
        setStripCounts(strip, cur.ups, cur.downs, newVoteState);

        // Persist to Firestore (best-effort)
        const ref = ratingDocRef(supplierId);
        if (!ref) return;
        const upsDelta   = delta.ups;
        const downsDelta = delta.downs;
        try {
            const update = {
                articleId:  ARTICLE_ID,
                supplierId: supplierId,
                updatedAt:  firebase.firestore.FieldValue.serverTimestamp()
            };
            if (upsDelta   !== 0) update.ups   = firebase.firestore.FieldValue.increment(upsDelta);
            if (downsDelta !== 0) update.downs = firebase.firestore.FieldValue.increment(downsDelta);
            await ref.set(update, { merge: true });
        } catch (err) {
            if (window.DEBUG) console.warn('[supplier-rating] write failed', err.message);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Boot                                                                */
    /* ------------------------------------------------------------------ */

    async function init() {
        const pfolds = document.querySelectorAll('.pfold[data-supplier-id]');
        if (!pfolds.length) return;

        const stored = getVotes();
        const scoreMap = {};

        // 1. Inject strips with placeholder counts
        pfolds.forEach(function (pfold) {
            const supplierId = pfold.dataset.supplierId;
            const body = pfold.querySelector(':scope > .pfold__body');
            if (!body || body.querySelector('.sr-strip')) return;
            const strip = buildStrip(supplierId);
            body.appendChild(strip);

            strip.addEventListener('click', function (e) {
                const btn = e.target.closest('.sr-btn');
                if (!btn) return;
                btn.disabled = true;
                handleVote(supplierId, btn.dataset.vote, strip, scoreMap)
                    .finally(function () { btn.disabled = false; });
            });
        });

        // 2. Pull current scores from Firestore
        if (FIREBASE_OK) {
            try {
                const snap = await db.collection('supplier_ratings')
                    .where('articleId', '==', ARTICLE_ID)
                    .get();
                snap.forEach(function (doc) {
                    const d = doc.data() || {};
                    if (!d.supplierId) return;
                    scoreMap[d.supplierId] = { ups: d.ups || 0, downs: d.downs || 0 };
                });
            } catch (err) {
                if (window.DEBUG) console.warn('[supplier-rating] read failed', err.message);
            }
        }

        // 3. Render counts + active state
        pfolds.forEach(function (pfold) {
            const supplierId = pfold.dataset.supplierId;
            const strip = pfold.querySelector('.sr-strip');
            if (!strip) return;
            const score = scoreMap[supplierId] || { ups: 0, downs: 0 };
            const voteState = stored[voteKey(supplierId)] || null;
            setStripCounts(strip, score.ups, score.downs, voteState);
        });

        // 4. Sort + assign rank badges
        sortPfoldsByScore(scoreMap);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
