/* ====================================================================
   Port Call — proximity picker + section product chips.
   Self-mounts on any port-call article that exposes window.PCV_DATA.

   Two features in one file:

   1) Section product chips
      Walks every <details class="sfold">, finds the .pfold cards
      inside, aggregates their venue.productTags, and injects a small
      colour-pilled chip strip into each section's summary so a folded
      article still tells you what's inside at a glance.

   2) Berth picker (proximity re-rank)
      Mounts a row of chips for every cat:'berth' venue. Picking one
      sets it as the "I am here" anchor and:
        - drops a distance pill onto every pfold (Haversine, walking
          / tender / car hint),
        - finds the closest supplier per product category and shows a
          "Closest for each staple" panel above the article,
        - tags each best-in-category supplier with a gold BEST badge
          inside its summary.
      Choice persists in localStorage per-article so the chef returns
      to the same view next visit.

   Loaded after port-call-venice-data.js (or the equivalent), AFTER
   port-call-search.js so the picker can mount above the search bar.
   ==================================================================== */
(function () {
    'use strict';

    var STORAGE_KEY = 'littoralicious-pc-anchor:' +
        (window.PCV_CONFIG && window.PCV_CONFIG.articleId ? window.PCV_CONFIG.articleId : 'default');

    // Product categories that aren't useful in the "closest for each staple"
    // grid — the chef has already picked a berth, doesn't need a closest
    // berth recommendation.
    var SKIP_BEST_TAGS = { 'Berth': 1, 'Anchorage': 1, 'Refit': 1, 'Logistics': 1 };

    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    function el(html) {
        var d = document.createElement('div');
        d.innerHTML = html.trim();
        return d.firstElementChild;
    }

    function escapeHtml(s) {
        return (s || '').replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function haversineKm(a, b) {
        var toRad = function (d) { return d * Math.PI / 180; };
        var R = 6371;
        var dLat = toRad(b[0] - a[0]);
        var dLng = toRad(b[1] - a[1]);
        var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * R * Math.asin(Math.sqrt(s));
    }

    function formatDistance(km) {
        if (km < 1) return Math.round(km * 1000) + ' m';
        if (km < 10) return km.toFixed(1) + ' km';
        return Math.round(km) + ' km';
    }

    // Yacht-chef context: with a loaded carrello on foot it's ~4 km/h, a
    // tender or water-taxi cruise averages ~25 km/h door-to-door, a road
    // run is ~30 km/h once parking and traffic are accounted for.
    function travelHint(km) {
        if (km <= 1.5) return Math.round(km / 4 * 60) + ' min on foot';
        if (km <= 8)   return Math.round(km / 25 * 60) + ' min by tender';
        return Math.round(km / 30 * 60) + ' min by car';
    }

    // Build a tel: URL — keep the leading + if present so international
    // dial works on iOS / Android.
    function telHref(phone) {
        if (!phone) return '';
        var hasPlus = phone.charAt(0) === '+';
        var digits = phone.replace(/[^\d]/g, '');
        if (!digits) return '';
        return 'tel:' + (hasPlus ? '+' : '') + digits;
    }

    // wa.me URLs need a digits-only number with no leading +.
    function waHref(phone) {
        if (!phone) return '';
        var digits = phone.replace(/[^\d]/g, '');
        if (!digits) return '';
        return 'https://wa.me/' + digits;
    }

    // Map every venue.id → { venue, pfold (DOM <details>) }.
    function buildVenueIndex() {
        if (!window.PCV_DATA || !window.PCV_DATA.VENUES) return null;
        var index = {};
        window.PCV_DATA.VENUES.forEach(function (v) {
            var pf = document.getElementById('p-' + v.id);
            if (!pf) {
                pf = document.querySelector('[data-supplier-id="' + v.id + '"]');
            }
            index[v.id] = { venue: v, pfold: pf };
        });
        return index;
    }

    // -----------------------------------------------------------------
    // 1) Section product chips
    // -----------------------------------------------------------------
    function decorateSections(index) {
        var PRODUCT_COLORS = (window.PCV_DATA && window.PCV_DATA.PRODUCT_COLORS) || {};
        var sfolds = document.querySelectorAll('details.sfold');

        sfolds.forEach(function (sf) {
            // .pfold is the supplier card; .tb-col is a top-3 berth tile.
            var entries = sf.querySelectorAll('.pfold, .tb-col');
            if (!entries.length) return;

            var counts = {};
            entries.forEach(function (entry) {
                var id = (entry.id || '').replace(/^p-/, '');
                if (!id || !index[id] || !index[id].venue.productTags) return;
                index[id].venue.productTags.forEach(function (t) {
                    counts[t] = (counts[t] || 0) + 1;
                });
            });
            var tags = Object.keys(counts);
            if (!tags.length) return;
            tags.sort(function (a, b) { return counts[b] - counts[a]; });

            var chipsHtml = tags.map(function (t) {
                var c = PRODUCT_COLORS[t] || '#475569';
                return '<span class="sfold__chip" style="background:' + c + ';">' +
                       escapeHtml(t) +
                       (counts[t] > 1 ? ' <em>×' + counts[t] + '</em>' : '') +
                       '</span>';
            }).join('');

            var wrap = sf.querySelector('.sfold__titlewrap');
            if (!wrap) return;
            var chipBox = el('<div class="sfold__chips" aria-hidden="true">' + chipsHtml + '</div>');
            wrap.appendChild(chipBox);
        });
    }

    // -----------------------------------------------------------------
    // 2) Berth picker
    // -----------------------------------------------------------------
    function mountPicker(index) {
        // Mount above the search bar if it exists, otherwise above the map.
        var searchBar = document.querySelector('.pcs-wrap');
        var mapWrap = document.querySelector('.pcv-map-wrap');
        var anchorEl = searchBar || mapWrap;
        if (!anchorEl) return;

        var berths = window.PCV_DATA.VENUES.filter(function (v) {
            return v.cat === 'berth' && typeof v.lat === 'number' && typeof v.lng === 'number';
        });
        if (!berths.length) return;

        // Order: top tier (the marquee three) first, then plenty/anchorages.
        berths.sort(function (a, b) {
            var ta = a.tier === 'berth_top' ? 0 : 1;
            var tb = b.tier === 'berth_top' ? 0 : 1;
            if (ta !== tb) return ta - tb;
            return (a.priority || 99) - (b.priority || 99);
        });

        var bar = el(
            '<section class="pcp-wrap" role="group" aria-label="Pick your berth">' +
              '<div class="pcp-head">' +
                '<strong>⚓ Where are you berthed?</strong>' +
                '<span>Pick yours — every supplier re-ranks by real distance from your boat.</span>' +
              '</div>' +
              '<div class="pcp-row" id="pcp-row"></div>' +
              '<div class="pcp-status" id="pcp-status">Showing the chef\'s default ranking. Pick a berth to re-rank by proximity.</div>' +
              '<div class="pcp-best" id="pcp-best" hidden></div>' +
            '</section>'
        );
        anchorEl.parentNode.insertBefore(bar, anchorEl);

        var row     = bar.querySelector('#pcp-row');
        var statusEl = bar.querySelector('#pcp-status');
        var bestEl  = bar.querySelector('#pcp-best');

        berths.forEach(function (b) {
            var name = b.short || b.name;
            var chip = el(
                '<button type="button" class="pcp-chip" data-id="' + escapeHtml(b.id) + '">' +
                  '<span class="pcp-chip__name">' + escapeHtml(name) + '</span>' +
                  (b.badge ? '<span class="pcp-chip__badge">' + escapeHtml(b.badge) + '</span>' : '') +
                '</button>'
            );
            row.appendChild(chip);
        });
        var clearChip = el('<button type="button" class="pcp-chip pcp-chip--clear" data-id="">Clear</button>');
        row.appendChild(clearChip);

        function clearAnnotations() {
            document.querySelectorAll('.pcp-dist').forEach(function (n) { n.remove(); });
            document.querySelectorAll('.pcp-best-badge').forEach(function (n) { n.remove(); });
            document.querySelectorAll('.pfold.is-best, .tb-col.is-here').forEach(function (n) {
                n.classList.remove('is-best');
                n.classList.remove('is-here');
            });
        }

        function applyAnchor(id) {
            clearAnnotations();
            bestEl.hidden = true;
            bestEl.innerHTML = '';

            row.querySelectorAll('.pcp-chip').forEach(function (c) {
                c.classList.toggle('is-on', c.getAttribute('data-id') === id && id !== '');
            });

            if (!id || !index[id]) {
                statusEl.textContent = "Showing the chef's default ranking. Pick a berth to re-rank by proximity.";
                try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
                return;
            }
            try { localStorage.setItem(STORAGE_KEY, id); } catch (e) {}

            var anchorVenue = index[id].venue;
            var anchorCoords = [anchorVenue.lat, anchorVenue.lng];

            // Mark the picked berth in the three-berths grid.
            var anchorPfold = index[id].pfold;
            if (anchorPfold) anchorPfold.classList.add('is-here');

            // Distance pill on every supplier.
            var venues = window.PCV_DATA.VENUES;
            var distList = [];
            venues.forEach(function (v) {
                if (v.id === id) return;
                if (typeof v.lat !== 'number' || typeof v.lng !== 'number') return;
                var km = haversineKm(anchorCoords, [v.lat, v.lng]);
                v.__dist = km;
                distList.push(v);

                var pf = index[v.id] && index[v.id].pfold;
                if (!pf) return;
                var pillHtml = '<span class="pcp-dist" title="From ' +
                    escapeHtml(anchorVenue.short || anchorVenue.name) +
                    '">📍 ' + formatDistance(km) +
                    ' <em>· ' + travelHint(km) + '</em></span>';
                var hook = pf.querySelector('.pfold__hook');
                if (hook) {
                    hook.insertAdjacentHTML('beforeend', ' ' + pillHtml);
                } else {
                    var sub = pf.querySelector('.subtitle');
                    if (sub) sub.insertAdjacentHTML('beforeend', ' ' + pillHtml);
                }
            });
            distList.sort(function (a, b) { return a.__dist - b.__dist; });

            // Closest supplier per product category.
            var bestPerTag = {};
            distList.forEach(function (v) {
                if (!v.productTags) return;
                v.productTags.forEach(function (t) {
                    if (SKIP_BEST_TAGS[t]) return;
                    if (!bestPerTag[t]) bestPerTag[t] = v;
                });
            });
            var bestList = Object.keys(bestPerTag).sort(function (a, b) {
                return bestPerTag[a].__dist - bestPerTag[b].__dist;
            });

            var PRODUCT_COLORS = (window.PCV_DATA && window.PCV_DATA.PRODUCT_COLORS) || {};

            if (bestList.length) {
                var html = '<div class="pcp-best__head">CLOSEST FOR EACH STAPLE FROM <b>' +
                           escapeHtml(anchorVenue.short || anchorVenue.name) + '</b></div>' +
                           '<div class="pcp-best__grid">';
                bestList.slice(0, 12).forEach(function (t) {
                    var v = bestPerTag[t];
                    var c = PRODUCT_COLORS[t] || '#475569';
                    var pf = index[v.id] && index[v.id].pfold;
                    var targetId = (pf && pf.id) ? pf.id : '';

                    // Action row: Call / WhatsApp / Maps. Each is a real
                    // link so taps work on touch devices.
                    var actions = '';
                    if (v.phone) {
                        actions += '<a class="pcp-best__action pcp-best__action--call" ' +
                                   'href="' + escapeHtml(telHref(v.phone)) + '" ' +
                                   'title="Call ' + escapeHtml(v.phone) + '">' +
                                   '<span class="pcp-best__icon" aria-hidden="true">📞</span>' +
                                   '<span class="pcp-best__lbl">Call</span></a>';
                    }
                    if (v.whatsapp) {
                        actions += '<a class="pcp-best__action pcp-best__action--wa" ' +
                                   'href="' + escapeHtml(waHref(v.whatsapp)) + '" ' +
                                   'target="_blank" rel="noopener" ' +
                                   'title="WhatsApp ' + escapeHtml(v.whatsapp) + '">' +
                                   '<span class="pcp-best__icon" aria-hidden="true">💬</span>' +
                                   '<span class="pcp-best__lbl">WhatsApp</span></a>';
                    }
                    if (v.maps) {
                        actions += '<a class="pcp-best__action pcp-best__action--map" ' +
                                   'href="' + escapeHtml(v.maps) + '" ' +
                                   'target="_blank" rel="noopener" ' +
                                   'title="Open in Google Maps">' +
                                   '<span class="pcp-best__icon" aria-hidden="true">📍</span>' +
                                   '<span class="pcp-best__lbl">Maps</span></a>';
                    }

                    html += '<div class="pcp-best__cell" ' +
                              'data-target="' + escapeHtml(targetId) + '" ' +
                              'role="button" tabindex="0" ' +
                              'aria-label="Jump to ' + escapeHtml(v.name) + ' section">' +
                              '<span class="pcp-best__chip" style="background:' + c + ';">' +
                                escapeHtml(t) +
                              '</span>' +
                              '<span class="pcp-best__name">' + escapeHtml(v.short || v.name) + '</span>' +
                              '<span class="pcp-best__dist">' +
                                escapeHtml(formatDistance(v.__dist)) + ' · ' + escapeHtml(travelHint(v.__dist)) +
                              '</span>' +
                              (actions ? '<div class="pcp-best__actions">' + actions + '</div>' : '') +
                            '</div>';

                    // Tag the supplier's pfold with a gold BEST badge inline.
                    if (pf) {
                        pf.classList.add('is-best');
                        var nameEl = pf.querySelector('.pfold__name');
                        if (nameEl && !nameEl.querySelector('.pcp-best-badge')) {
                            var badgeHtml = '<span class="pcp-best-badge">BEST · ' +
                                            escapeHtml(t.toUpperCase()) + '</span> ';
                            nameEl.insertAdjacentHTML('afterbegin', badgeHtml);
                        }
                    }
                });
                html += '</div>';
                bestEl.innerHTML = html;
                bestEl.hidden = false;
            }

            statusEl.innerHTML = '<b>Re-ranked from ' +
                escapeHtml(anchorVenue.short || anchorVenue.name) +
                '</b> · every supplier shows distance, walk/tender/car estimate, and the closest pick per category is tagged BEST.';
        }

        row.addEventListener('click', function (e) {
            var t = e.target.closest('.pcp-chip');
            if (!t) return;
            var id = t.getAttribute('data-id');
            var current = '';
            try { current = localStorage.getItem(STORAGE_KEY) || ''; } catch (err) {}
            if (id && id === current) id = ''; // toggle off
            applyAnchor(id);
        });

        function jumpToCell(cell) {
            var target = cell.getAttribute('data-target');
            var pf = target ? document.getElementById(target) : null;
            if (!pf) return;
            var p = pf;
            while (p) {
                if (p.tagName && p.tagName.toLowerCase() === 'details') p.open = true;
                p = p.parentElement;
            }
            pf.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        bestEl.addEventListener('click', function (e) {
            // Action links handle themselves (tel:, wa.me, maps URLs).
            if (e.target.closest('.pcp-best__action')) return;
            var c = e.target.closest('.pcp-best__cell');
            if (!c) return;
            e.preventDefault();
            jumpToCell(c);
        });

        bestEl.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            if (e.target.closest('.pcp-best__action')) return;
            var c = e.target.closest('.pcp-best__cell');
            if (!c) return;
            e.preventDefault();
            jumpToCell(c);
        });

        // Restore prior choice.
        var saved = '';
        try { saved = localStorage.getItem(STORAGE_KEY) || ''; } catch (e) {}
        if (saved && index[saved]) applyAnchor(saved);
        else applyAnchor('');
    }

    ready(function () {
        var index = buildVenueIndex();
        if (!index) return;
        decorateSections(index);
        mountPicker(index);
    });
})();
