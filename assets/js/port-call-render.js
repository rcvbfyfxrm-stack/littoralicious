/* ====================================================================
   PORT CALL — shared renderer (any port).
   ====================================================================
   Each port-call article supplies:
     window.PCV_DATA   — { VENUES, COLORS, CAT_LABELS, PRODUCT_COLORS }
     window.PCV_CONFIG — {
        articleId,            // 'port-call-venice'   (Firestore key)
        cardUrl,              // 'port-call-venice-card.html'
        center: [lat, lng],   // big-map default centre
        zoom: 13              // big-map default zoom
     }
   The article HTML must contain:
     #pcv-berths, #pcv-list-notime, #pcv-list-several, #pcv-list-plenty
     #pcv-map, #pcv-legend
     #pcv-mini, #pcv-mini-handle, #pcv-mini-map, #pcv-mini-active
   ==================================================================== */
(function () {
    function boot() {
        const cfg = window.PCV_CONFIG || {};
        if (!window.PCV_DATA) { console.error('PCV_DATA missing'); return; }
        const ARTICLE_ID = cfg.articleId || 'port-call-default';
        const VOTE_KEY   = 'pcv-' + ARTICLE_ID + '-votes';
        const { VENUES, COLORS, CAT_LABELS, PRODUCT_COLORS, WATCHOUTS } = window.PCV_DATA;

        const escapeHTML = s => (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const telHref = p => 'tel:' + p.replace(/[^+\d]/g, '');
        const productPills = (tags) => (tags || []).map(t => {
            const c = (PRODUCT_COLORS || {})[t] || '#444';
            return '<span style="background:' + c + ';">' + escapeHTML(t) + '</span>';
        }).join('');

        // ---------- City-bounds helper -------------------------------------
        // Constrain the map to the city itself; pin remote / online suppliers
        // (Browne Trading from Maine, Snake River from Idaho, etc.) but keep
        // them out of fitBounds so the print card isn't zoomed to the country.
        // PCV_CONFIG can pass `cityRadiusKm` (default 50) — anything further
        // from `center` is treated as a remote supplier unless it has
        // `online: true` already set.
        const cityCenter = cfg.center || [0, 0];
        const cityRadiusKm = cfg.cityRadiusKm || 50;
        const haversineKm = (a, b) => {
            const toRad = d => d * Math.PI / 180;
            const R = 6371;
            const dLat = toRad(b[0] - a[0]);
            const dLng = toRad(b[1] - a[1]);
            const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng/2)**2;
            return 2 * R * Math.asin(Math.sqrt(s));
        };
        VENUES.forEach(v => {
            if (v.online === undefined) {
                v.online = (typeof v.lat === 'number') && haversineKm(cityCenter, [v.lat, v.lng]) > cityRadiusKm;
            }
        });
        const inCityVenues = VENUES.filter(v => !v.online);

        const localVotes = (() => {
            try { return JSON.parse(localStorage.getItem(VOTE_KEY) || '{}'); }
            catch (e) { return {}; }
        })();
        const saveLocalVotes = () => {
            try { localStorage.setItem(VOTE_KEY, JSON.stringify(localVotes)); } catch (e) {}
        };
        const voteCounts = {};
        VENUES.forEach(v => { voteCounts[v.id] = 0; });

        // ---------- Render top-3 berths
        function renderBerths() {
            const target = document.getElementById('pcv-berths');
            if (!target) return;
            const berths = VENUES.filter(v => v.tier === 'berth_top').sort((a,b)=>a.priority-b.priority);
            target.innerHTML = berths.map((v, i) => {
                const tags = (v.tags || []).map(t => '<span>' + escapeHTML(t) + '</span>').join('');
                const meta = [];
                if (v.address) meta.push('Address: ' + escapeHTML(v.address));
                if (v.phone)   meta.push('Phone: <a href="' + telHref(v.phone) + '">' + escapeHTML(v.phone) + '</a>');
                if (v.email)   meta.push('Email: <a href="mailto:' + escapeHTML(v.email) + '">' + escapeHTML(v.email) + '</a>');
                if (v.maps)    meta.push('<a href="' + escapeHTML(v.maps) + '" target="_blank" rel="noopener">Open in Google Maps →</a>');
                const products = productPills(v.productTags);
                return '<div class="pcv-berth" id="venue-' + v.id + '" data-venue-id="' + v.id + '">' +
                    '<span class="pcv-berth__rank">#' + (i+1) + ' &middot; ' + escapeHTML(v.short || v.name) + '</span>' +
                    (v.badge ? '<span class="pcv-berth__badge">' + escapeHTML(v.badge) + '</span>' : '') +
                    '<div class="pcv-berth__name">' + escapeHTML(v.name) + '</div>' +
                    (products ? '<div class="pcv-berth__products">' + products + '</div>' : '') +
                    '<div class="pcv-berth__tags">' + tags + '</div>' +
                    '<p class="pcv-berth__why">' + escapeHTML(v.why) + '</p>' +
                    '<div class="pcv-berth__meta">' + meta.map(m => '<div>' + m + '</div>').join('') + '</div>' +
                    '</div>';
            }).join('');
        }

        // ---------- Render tier card
        function renderCard(v, rank) {
            const userVoted = localVotes[v.id] === true;
            const count = voteCounts[v.id] || 0;
            const badge = v.badge ? '<span class="badge">' + escapeHTML(v.badge) + '</span>' : '';
            const offCity = v.online ? '<span class="badge" style="background:#0ea5e9;color:#fff;">SHIPS IN</span>' : '';
            const tags = (v.tags || []).map(t => '<span>' + escapeHTML(t) + '</span>').join('');
            const products = productPills(v.productTags);
            const meta = [];
            if (v.address) meta.push('<div class="pcv-card__meta-row"><span>Address</span><span>' + escapeHTML(v.address) + '</span></div>');
            if (v.phone)   meta.push('<div class="pcv-card__meta-row"><span>Phone</span><span><a href="' + telHref(v.phone) + '">' + escapeHTML(v.phone) + '</a></span></div>');
            if (v.email)   meta.push('<div class="pcv-card__meta-row"><span>Email</span><span><a href="mailto:' + escapeHTML(v.email) + '">' + escapeHTML(v.email) + '</a></span></div>');
            if (v.hours)   meta.push('<div class="pcv-card__meta-row"><span>Hours</span><span>' + escapeHTML(v.hours) + '</span></div>');
            if (v.web)     meta.push('<div class="pcv-card__meta-row"><span>Web</span><span><a href="' + escapeHTML(v.web) + '" target="_blank" rel="noopener">' + escapeHTML(v.web.replace(/^https?:\/\//,'').replace(/\/$/,'')) + '</a></span></div>');
            if (v.maps)    meta.push('<div class="pcv-card__meta-row"><span>Maps</span><span><a href="' + escapeHTML(v.maps) + '" target="_blank" rel="noopener">Open in Google Maps &rarr;</a></span></div>');
            return '<article class="pcv-card" data-venue-id="' + v.id + '" data-cat="' + v.cat + '" id="venue-' + v.id + '">' +
                '<div class="pcv-card__rank">#' + rank + '</div>' +
                '<div class="pcv-card__body">' +
                    '<div class="pcv-card__cat">' + (CAT_LABELS[v.cat] || v.cat) + '</div>' +
                    '<div class="pcv-card__name">' + escapeHTML(v.name) + badge + offCity + '</div>' +
                    (products ? '<div class="pcv-card__products">' + products + '</div>' : '') +
                    (tags ? '<div class="pcv-card__tags">' + tags + '</div>' : '') +
                    '<div class="pcv-card__why">' + escapeHTML(v.why) + '</div>' +
                    '<div class="pcv-card__meta">' + meta.join('') + '</div>' +
                '</div>' +
                '<div class="pcv-card__vote">' +
                    '<button class="pcv-vote-btn ' + (userVoted ? 'is-voted' : '') + '" data-vote="' + v.id + '" aria-label="Upvote ' + escapeHTML(v.name) + '" title="' + (userVoted ? 'Remove vote' : 'Vote: I used this and it worked') + '">' +
                        (userVoted ? '★' : '☆') +
                    '</button>' +
                    '<span class="count" data-count="' + v.id + '">' + count + '</span>' +
                    '<span class="label">votes</span>' +
                '</div>' +
            '</article>';
        }
        function renderTier(tierKey) {
            const list = VENUES.filter(v => v.tier === tierKey).slice().sort((a, b) => {
                const va = voteCounts[a.id] || 0, vb = voteCounts[b.id] || 0;
                if (vb !== va) return vb - va;
                return a.priority - b.priority;
            });
            const target = document.getElementById('pcv-list-' + tierKey);
            if (!target) return;
            target.innerHTML = list.map((v, i) => renderCard(v, i + 1)).join('');
        }
        function renderAll() {
            renderBerths();
            renderTier('notime');
            renderTier('several');
            renderTier('plenty');
            renderWatchouts();
            wireVoteButtons();
            wireScrollSpy();
            wireHoverHighlight();
        }

        // ---------- Watch-outs (renders into #pcv-watchouts if the page provides it) ----------
        function renderWatchouts() {
            const target = document.getElementById('pcv-watchouts');
            if (!target || !WATCHOUTS || !WATCHOUTS.length) { if (target) target.style.display = 'none'; return; }
            const sevOrder = { high: 0, medium: 1 };
            const SEV_LABEL = { high: 'High · breaks the day', medium: 'Medium · annoying' };
            // Surface only high + medium severity. Low/info-level items live as inline ⚠ caution pills next to suppliers.
            const sorted = WATCHOUTS
                .filter(function (w) { return w.severity === 'high' || w.severity === 'medium'; })
                .sort(function (a, b) { return (sevOrder[a.severity]||9) - (sevOrder[b.severity]||9); });
            target.innerHTML = sorted.map(function (w) {
                return '<div class="pcv-wo sev-' + (w.severity||'info') + '">' +
                    '<div class="pcv-wo__head">' +
                        '<span class="pcv-wo__title">' + escapeHTML(w.title) + '</span>' +
                        '<span class="pcv-wo__sev">' + (SEV_LABEL[w.severity] || 'info') + '</span>' +
                    '</div>' +
                    '<div class="pcv-wo__when">' + escapeHTML(w.when) + '</div>' +
                    '<p class="pcv-wo__what">' + escapeHTML(w.what) + '</p>' +
                    '<div class="pcv-wo__fix"><b>Workaround</b>' + escapeHTML(w.workaround) + '</div>' +
                '</div>';
            }).join('');
        }

        // ---------- Voting (Firestore + localStorage)
        const VOTES_DOC = (typeof db !== 'undefined') ? db.collection('venuevotes').doc(ARTICLE_ID) : null;
        function wireVoteButtons() {
            document.querySelectorAll('.pcv-vote-btn').forEach(btn => {
                btn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    const id = btn.getAttribute('data-vote');
                    const wasVoted = localVotes[id] === true;
                    const delta = wasVoted ? -1 : 1;
                    voteCounts[id] = (voteCounts[id] || 0) + delta;
                    if (wasVoted) { delete localVotes[id]; } else { localVotes[id] = true; }
                    saveLocalVotes();
                    renderAll();
                    if (VOTES_DOC && typeof firebase !== 'undefined' && firebase.firestore) {
                        VOTES_DOC.set({
                            [id]: firebase.firestore.FieldValue.increment(delta)
                        }, { merge: true }).catch(err => console.warn('PCV vote persist failed:', err));
                    }
                });
            });
        }
        function subscribeVotes() {
            if (!VOTES_DOC) return;
            VOTES_DOC.onSnapshot(snap => {
                const data = snap.data() || {};
                let changed = false;
                VENUES.forEach(v => {
                    const remote = typeof data[v.id] === 'number' ? data[v.id] : 0;
                    if (voteCounts[v.id] !== remote) { voteCounts[v.id] = Math.max(0, remote); changed = true; }
                });
                if (changed) renderAll();
            }, err => console.warn('PCV votes subscribe failed:', err));
        }

        // ====================================================================
        // BIG MAP — numbered DivIcon markers, Voyager tiles, hover-to-highlight
        // ====================================================================
        let bigMap = null;
        const bigMarkers = {};

        function initBigMap() {
            if (typeof L === 'undefined') return;
            const mapEl = document.getElementById('pcv-map');
            if (!mapEl) return;
            bigMap = L.map('pcv-map', { zoomControl: true, scrollWheelZoom: false, attributionControl: true })
                .setView(cfg.center || [0, 0], cfg.zoom || 13);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
                maxZoom: 19, subdomains: 'abcd'
            }).addTo(bigMap);

            const layers = { berth:L.layerGroup(), market:L.layerGroup(), shop:L.layerGroup(), mainland:L.layerGroup(), logistics:L.layerGroup() };
            const order = ['berth','market','shop','mainland','logistics'];
            const numbered = VENUES.slice().sort((a,b) => order.indexOf(a.cat) - order.indexOf(b.cat));

            numbered.forEach((v, idx) => {
                const num = idx + 1;
                const icon = L.divIcon({
                    className: '',
                    html: '<div class="pcv-pin cat-' + v.cat + '">' + num + '</div>',
                    iconSize: [28, 28], iconAnchor: [14, 14]
                });
                const marker = L.marker([v.lat, v.lng], { icon: icon, riseOnHover: true });
                marker.bindTooltip(v.short || v.name, {
                    className: 'pcv-label', direction: 'right', offset: [16, 0], permanent: false, opacity: 1
                });
                const phoneRow = v.phone ? '<span class="pcv-pop-meta">Phone: <a href="' + telHref(v.phone) + '">' + escapeHTML(v.phone) + '</a></span>' : '';
                const tagRow = (v.tags && v.tags.length)
                    ? '<span class="pcv-pop-meta" style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8">' + v.tags.slice(0,4).map(escapeHTML).join(' &middot; ') + '</span>' : '';
                marker.bindPopup(
                    '<span class="pcv-pop-cat">' + (CAT_LABELS[v.cat] || v.cat) + '</span>' +
                    '<span class="pcv-pop-title">' + num + '. ' + escapeHTML(v.name) + '</span>' +
                    tagRow + phoneRow +
                    (v.maps ? '<a href="' + escapeHTML(v.maps) + '" target="_blank" rel="noopener">Open in Google Maps &rarr;</a>' : '')
                );
                marker.addTo(layers[v.cat] || layers.shop);
                bigMarkers[v.id] = { marker: marker, num: num };
                marker.on('mouseover', () => setActive(v.id));
                marker.on('click', () => setActive(v.id));
            });

            Object.values(layers).forEach(l => l.addTo(bigMap));
            try {
                const bpts = inCityVenues.length ? inCityVenues : VENUES;
                bigMap.fitBounds(bpts.map(v => [v.lat, v.lng]), { padding: [40, 40], maxZoom: 14 });
            } catch (e) {}
            bigMap.once('focus', () => bigMap.scrollWheelZoom.enable());
            bigMap.on('click', () => bigMap.scrollWheelZoom.enable());

            document.querySelectorAll('#pcv-legend button').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cat = btn.getAttribute('data-cat');
                    const layer = layers[cat];
                    if (!layer) return;
                    if (bigMap.hasLayer(layer)) { bigMap.removeLayer(layer); btn.classList.add('is-off'); }
                    else { bigMap.addLayer(layer); btn.classList.remove('is-off'); }
                });
            });
        }

        // ====================================================================
        // STICKY MINI-MAP — zoomable, hover-light-up, foldable
        // ====================================================================
        let miniMap = null;
        const miniMarkers = {};
        let activeId = null;

        function initMiniMap() {
            if (typeof L === 'undefined') return;
            const el = document.getElementById('pcv-mini-map');
            if (!el) return;
            miniMap = L.map('pcv-mini-map', {
                zoomControl: true, zoomControlOptions: { position: 'topright' },
                scrollWheelZoom: true, doubleClickZoom: true, touchZoom: true,
                dragging: true, attributionControl: false
            }).setView(cfg.center || [0, 0], (cfg.zoom || 13) - 1);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                maxZoom: 19, subdomains: 'abcd'
            }).addTo(miniMap);

            VENUES.forEach(v => {
                const color = COLORS[v.cat] || '#444';
                const marker = L.circleMarker([v.lat, v.lng], {
                    radius: 5, fillColor: color, color: '#0a0a0a',
                    weight: 1, opacity: 0.85, fillOpacity: 0.85
                }).addTo(miniMap);
                marker.on('click', () => focusVenue(v.id, true));
                marker.on('mouseover', () => setActive(v.id));
                miniMarkers[v.id] = marker;
            });
            try {
                const bpts = inCityVenues.length ? inCityVenues : VENUES;
                miniMap.fitBounds(bpts.map(v => [v.lat, v.lng]), { padding: [12, 12], maxZoom: 14 });
            } catch (e) {}
        }

        function setActive(id) {
            if (activeId === id) return;
            if (activeId && miniMarkers[activeId]) {
                const v0 = VENUES.find(v => v.id === activeId);
                if (v0) miniMarkers[activeId].setStyle({
                    radius: 5, fillColor: COLORS[v0.cat] || '#444', color: '#0a0a0a',
                    weight: 1, opacity: 0.85, fillOpacity: 0.85
                });
            }
            if (activeId && bigMarkers[activeId]) {
                const el = bigMarkers[activeId].marker.getElement();
                if (el) { const pin = el.querySelector('.pcv-pin'); if (pin) pin.classList.remove('is-active'); }
            }
            if (activeId) {
                document.querySelectorAll('[data-venue-id="' + activeId + '"]').forEach(c => c.classList.remove('is-hover'));
            }
            if (id && miniMarkers[id]) {
                const v = VENUES.find(x => x.id === id);
                miniMarkers[id].setStyle({
                    radius: 10, fillColor: '#fafafa', color: COLORS[v.cat] || '#444',
                    weight: 3, opacity: 1, fillOpacity: 1
                });
                miniMarkers[id].bringToFront();
                if (miniMap) miniMap.panTo([v.lat, v.lng], { animate: true, duration: 0.6 });
                if (bigMarkers[id]) {
                    const el = bigMarkers[id].marker.getElement();
                    if (el) { const pin = el.querySelector('.pcv-pin'); if (pin) pin.classList.add('is-active'); }
                }
                document.querySelectorAll('[data-venue-id="' + id + '"]').forEach(c => c.classList.add('is-hover'));
                const cardFor = document.querySelector('[data-venue-id="' + id + '"]');
                const rankEl = cardFor ? cardFor.querySelector('.pcv-card__rank') : null;
                const rank = rankEl ? rankEl.textContent : '';
                const phoneTxt = v.phone ? '<a href="' + telHref(v.phone) + '">' + escapeHTML(v.phone) + '</a> · ' : '';
                const active = document.getElementById('pcv-mini-active');
                if (active) active.innerHTML =
                    '<b>' + (rank ? rank + ' · ' : '') + (CAT_LABELS[v.cat] || v.cat) + '</b>' +
                    '<span><strong style="color:#fafafa">' + escapeHTML(v.name) + '</strong><br>' +
                    phoneTxt +
                    (v.maps ? '<a href="' + escapeHTML(v.maps) + '" target="_blank" rel="noopener">Open map →</a>' : '') +
                    '</span>';
            }
            activeId = id;
        }

        function focusVenue(id, scrollTo) {
            setActive(id);
            if (scrollTo) {
                const card = document.getElementById('venue-' + id);
                if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        function wireScrollSpy() {
            if (!('IntersectionObserver' in window)) return;
            const cards = document.querySelectorAll('[data-venue-id]');
            const observed = new Map();
            const io = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    if (e.isIntersecting) observed.set(e.target, e.intersectionRatio);
                    else observed.delete(e.target);
                });
                let best = null, bestRatio = 0;
                observed.forEach((ratio, el) => { if (ratio > bestRatio) { best = el; bestRatio = ratio; } });
                if (best) { setActive(best.getAttribute('data-venue-id')); /* side map stays folded until user clicks/hovers */ }
            }, { rootMargin: '-30% 0px -45% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
            cards.forEach(c => io.observe(c));
        }

        function wireHoverHighlight() {
            const targets = document.querySelectorAll('[data-venue-id]');
            targets.forEach(el => {
                const id = el.getAttribute('data-venue-id');
                el.addEventListener('mouseenter', () => { setActive(id); showMini(); el.classList.add('is-hover'); });
                el.addEventListener('mouseleave', () => { el.classList.remove('is-hover'); });
                el.addEventListener('click', (ev) => {
                    if (ev.target.closest('.pcv-card__vote') || ev.target.closest('a') || ev.target.closest('button')) return;
                    setActive(id); showMini();
                });
            });
        }

        function initMiniMapPanel() {
            const panel = document.getElementById('pcv-mini');
            const handle = document.getElementById('pcv-mini-handle');
            if (!panel || !handle) return;
            const bigMapEl = document.getElementById('pcv-map');
            if (bigMapEl) {
                const showIO = new IntersectionObserver(entries => {
                    entries.forEach(e => {
                        if (e.isIntersecting) panel.classList.add('is-hidden');
                        else panel.classList.remove('is-hidden');
                    });
                }, { rootMargin: '0px', threshold: 0 });
                showIO.observe(bigMapEl);
            }
            handle.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const collapsed = panel.classList.toggle('is-collapsed');
                handle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
                if (collapsed) panel.dataset.userClosed = '1';
                else delete panel.dataset.userClosed;
                if (!collapsed && miniMap) setTimeout(() => miniMap.invalidateSize(), 320);
            });
            // Stop click bubbling from inside the panel so it doesn't auto-close itself
            panel.addEventListener('click', (ev) => ev.stopPropagation());
            // Click anywhere else on the page → fold the side map away
            document.addEventListener('click', () => {
                if (!panel.classList.contains('is-collapsed')) {
                    panel.classList.add('is-collapsed');
                    handle.setAttribute('aria-expanded', 'false');
                }
            });
        }
        function showMini() {
            const panel = document.getElementById('pcv-mini');
            if (!panel) return;
            if (panel.classList.contains('is-collapsed') && !panel.dataset.userClosed) {
                panel.classList.remove('is-collapsed');
                const h = document.getElementById('pcv-mini-handle');
                if (h) h.setAttribute('aria-expanded', 'true');
                setTimeout(() => { if (miniMap) miniMap.invalidateSize(); }, 320);
            }
        }

        renderAll();
        initBigMap();
        initMiniMap();
        initMiniMapPanel();
        subscribeVotes();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
