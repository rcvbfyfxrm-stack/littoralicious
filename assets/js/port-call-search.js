/* ====================================================================
   Port Call — supplier search.
   Self-mounts above the .pcv-map-wrap on any port-call article.
   Indexes every .pfold (supplier card) by all its text + section title,
   filters live as you type. Multi-term: space- or comma-separated,
   AND-matched, case-insensitive.
   Quick-tags below the input are common chef searches (fish, bread,
   charcuterie, produce, wine, butcher...). Click to toggle.
   ==================================================================== */
(function () {
    'use strict';

    // Quick-tags chefs reach for. Each tag is a label + the search term it
    // injects. Term may include synonyms separated by | to widen the match
    // (we OR-match across alternates within a single tag, AND across tags).
    var TAGS = [
        { label: 'Fish',        term: 'fish|pescheria|pescaria|poisson|seafood|ittica|cuttlefish|branzino|orata|moeche' },
        { label: 'Meat',        term: 'meat|butcher|macelleria|beef|pork|lamb|wagyu|charcuterie' },
        { label: 'Bread',       term: 'bread|bakery|panaderia|boulangerie|pane|panificio' },
        { label: 'Charcuterie', term: 'charcuterie|prosciutto|salumi|cured|deli' },
        { label: 'Cheese',      term: 'cheese|parmigiano|fromage|formaggio|caseificio|mozzarella' },
        { label: 'Produce',     term: 'produce|vegetable|fruit|verdura|legumi|frutta|erbaria|fruttolo' },
        { label: 'Wine',        term: 'wine|vino|cantina|prosecco|champagne|cellar' },
        { label: 'Market',      term: 'market|mercato|pescheria|erbaria|rialto|tržnica' },
        { label: 'Agent',       term: 'agent|agency|yacht agent|broker|customs' },
        { label: 'Water taxi',  term: 'water taxi|motoscafi|taxi|transfer' },
        { label: 'Wholesale',   term: 'wholesale|hypermarket|supermarket|esselunga|coop|carrefour|metro|ipercoop' },
        { label: 'Mainland',    term: 'mainland|mestre|marghera|inland' }
    ];

    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    function el(html) {
        var d = document.createElement('div');
        d.innerHTML = html.trim();
        return d.firstElementChild;
    }

    // Strip diacritics so "tržnica" and "trznica" both match.
    function norm(s) {
        return (s || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Split user input into AND-terms, each of which may itself be an
    // OR-list separated by |.
    function parseQuery(q) {
        return norm(q)
            .split(/[\s,]+/)
            .filter(Boolean)
            .map(function (t) { return t.split('|').filter(Boolean); });
    }

    function matches(haystack, terms) {
        if (!terms.length) return true;
        return terms.every(function (alts) {
            return alts.some(function (a) { return haystack.indexOf(a) !== -1; });
        });
    }

    function buildIndex() {
        var pfolds = Array.prototype.slice.call(document.querySelectorAll('.pfold'));
        return pfolds.map(function (pf) {
            var section = pf.closest('.sfold');
            var sectionTitle = section ? (section.querySelector('.sfold__title') || {}).textContent || '' : '';
            var name = (pf.querySelector('.pfold__name') || {}).textContent || '';
            var hook = (pf.querySelector('.pfold__hook') || {}).textContent || '';
            var text = pf.textContent || '';
            return {
                el: pf,
                section: section,
                sectionTitle: sectionTitle.trim(),
                name: name.trim(),
                hook: hook.trim(),
                hay: norm(sectionTitle + ' ' + text)
            };
        });
    }

    function highlight(text, terms) {
        if (!terms.length) return escapeHtml(text);
        var ntext = norm(text);
        // Find any term-alternate hit and wrap the original-cased slice.
        var spans = [];
        terms.forEach(function (alts) {
            alts.forEach(function (a) {
                if (!a) return;
                var idx = 0;
                while ((idx = ntext.indexOf(a, idx)) !== -1) {
                    spans.push([idx, idx + a.length]);
                    idx += a.length;
                }
            });
        });
        if (!spans.length) return escapeHtml(text);
        spans.sort(function (a, b) { return a[0] - b[0]; });
        // Merge overlaps.
        var merged = [spans[0]];
        for (var i = 1; i < spans.length; i++) {
            var last = merged[merged.length - 1];
            if (spans[i][0] <= last[1]) last[1] = Math.max(last[1], spans[i][1]);
            else merged.push(spans[i]);
        }
        var out = ''; var cursor = 0;
        merged.forEach(function (s) {
            out += escapeHtml(text.slice(cursor, s[0]));
            out += '<mark>' + escapeHtml(text.slice(s[0], s[1])) + '</mark>';
            cursor = s[1];
        });
        out += escapeHtml(text.slice(cursor));
        return out;
    }

    function escapeHtml(s) {
        return (s || '').replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function mount() {
        var anchor = document.querySelector('.pcv-map-wrap');
        if (!anchor) return; // not a port-call article
        var index = buildIndex();
        if (!index.length) return;

        var bar = el(
            '<section class="pcs-wrap" role="search" aria-label="Search suppliers in this port">' +
              '<div class="pcs-head">' +
                '<strong>Find a supplier</strong>' +
                '<span>type "bread", "fish", "charcuterie" — or several at once</span>' +
              '</div>' +
              '<div class="pcs-bar">' +
                '<input type="search" class="pcs-input" id="pcs-input" ' +
                  'placeholder="bread, fish, wine, butcher…" autocomplete="off" ' +
                  'aria-label="Search suppliers">' +
                '<button type="button" class="pcs-clear" id="pcs-clear" hidden>Clear</button>' +
              '</div>' +
              '<div class="pcs-tags" id="pcs-tags"></div>' +
              '<div class="pcs-status" id="pcs-status"><b>' + index.length + '</b> suppliers indexed</div>' +
              '<div class="pcs-results" id="pcs-results" hidden></div>' +
            '</section>'
        );
        anchor.parentNode.insertBefore(bar, anchor);

        var input    = bar.querySelector('#pcs-input');
        var clearBtn = bar.querySelector('#pcs-clear');
        var tagsBox  = bar.querySelector('#pcs-tags');
        var status   = bar.querySelector('#pcs-status');
        var results  = bar.querySelector('#pcs-results');

        // Render tag chips.
        TAGS.forEach(function (t) {
            var c = el('<button type="button" class="pcs-tag" data-term="' + escapeHtml(t.term) + '">' +
                escapeHtml(t.label) + '</button>');
            tagsBox.appendChild(c);
        });

        var state = { q: '', activeTags: {} };

        function composedQuery() {
            var parts = [];
            if (state.q.trim()) parts.push(state.q.trim());
            Object.keys(state.activeTags).forEach(function (k) {
                if (state.activeTags[k]) parts.push(k);
            });
            return parts.join(' ');
        }

        function apply() {
            var rawQ = composedQuery();
            var terms = parseQuery(rawQ);

            // Filter pfolds.
            var hits = [];
            index.forEach(function (entry) {
                var hit = matches(entry.hay, terms);
                entry.el.classList.toggle('pcs-hide', !hit && terms.length > 0);
                if (hit) hits.push(entry);
            });

            // Mark sections with zero hits.
            var sections = {};
            index.forEach(function (entry) {
                if (!entry.section) return;
                var id = entry.section.id || entry.sectionTitle;
                if (!sections[id]) sections[id] = { el: entry.section, hit: 0, total: 0 };
                sections[id].total++;
            });
            hits.forEach(function (entry) {
                if (!entry.section) return;
                var id = entry.section.id || entry.sectionTitle;
                if (sections[id]) sections[id].hit++;
            });
            Object.keys(sections).forEach(function (id) {
                var s = sections[id];
                s.el.classList.toggle('pcs-empty', terms.length > 0 && s.hit === 0);
                // Auto-open sections that have at least one hit while searching.
                if (terms.length > 0 && s.hit > 0 && !s.el.open) s.el.open = true;
            });

            // Status + results dropdown.
            clearBtn.hidden = (rawQ === '');
            if (terms.length === 0) {
                status.innerHTML = '<b>' + index.length + '</b> suppliers indexed';
                results.hidden = true;
                results.innerHTML = '';
                return;
            }
            status.innerHTML = '<b>' + hits.length + '</b> of ' + index.length +
                ' supplier' + (hits.length === 1 ? '' : 's') +
                ' match · <em style="color:#94a3b8">' + escapeHtml(rawQ) + '</em>';

            // Render top-12 results dropdown.
            var top = hits.slice(0, 12);
            results.innerHTML = top.map(function (h) {
                return '<a class="pcs-result" data-target="' + escapeHtml(h.el.id || '') + '">' +
                    '<div class="pcs-result__name">' +
                        '<span class="pcs-result__section">' + escapeHtml(h.sectionTitle) + '</span>' +
                        highlight(h.name, terms) +
                    '</div>' +
                    '<div class="pcs-result__hook">' + highlight(h.hook, terms) + '</div>' +
                  '</a>';
            }).join('');
            results.hidden = top.length === 0;
        }

        function jumpTo(id) {
            if (!id) return;
            var pf = document.getElementById(id);
            if (!pf) return;
            // Open the supplier card.
            if (pf.tagName.toLowerCase() === 'details') pf.open = true;
            // Open all parent <details> chain.
            var p = pf.parentElement;
            while (p) {
                if (p.tagName && p.tagName.toLowerCase() === 'details') p.open = true;
                p = p.parentElement;
            }
            pf.scrollIntoView({ behavior: 'smooth', block: 'center' });
            pf.classList.remove('pcs-flash');
            // restart animation
            void pf.offsetWidth;
            pf.classList.add('pcs-flash');
        }

        // Events.
        var debounce;
        input.addEventListener('input', function () {
            clearTimeout(debounce);
            debounce = setTimeout(function () {
                state.q = input.value;
                apply();
            }, 80);
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                var first = results.querySelector('.pcs-result');
                if (first) jumpTo(first.getAttribute('data-target'));
            } else if (e.key === 'Escape') {
                input.value = '';
                state.q = '';
                Object.keys(state.activeTags).forEach(function (k) { state.activeTags[k] = false; });
                tagsBox.querySelectorAll('.pcs-tag.is-on').forEach(function (t) { t.classList.remove('is-on'); });
                apply();
            }
        });
        clearBtn.addEventListener('click', function () {
            input.value = '';
            state.q = '';
            Object.keys(state.activeTags).forEach(function (k) { state.activeTags[k] = false; });
            tagsBox.querySelectorAll('.pcs-tag.is-on').forEach(function (t) { t.classList.remove('is-on'); });
            apply();
            input.focus();
        });
        tagsBox.addEventListener('click', function (e) {
            var t = e.target.closest('.pcs-tag');
            if (!t) return;
            var term = t.getAttribute('data-term');
            state.activeTags[term] = !state.activeTags[term];
            t.classList.toggle('is-on', state.activeTags[term]);
            apply();
        });
        results.addEventListener('click', function (e) {
            var r = e.target.closest('.pcs-result');
            if (!r) return;
            e.preventDefault();
            jumpTo(r.getAttribute('data-target'));
        });

        apply();
    }

    ready(mount);
})();
