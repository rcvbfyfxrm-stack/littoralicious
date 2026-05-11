/* Port Call printable field card — shared renderer.
   Reads window.PCV_DATA + window.PCV_CONFIG. */
(function () {
    function boot() {
        const cfg = window.PCV_CONFIG || {};
        if (!window.PCV_DATA) { console.error('PCV_DATA missing'); return; }
        const { VENUES, COLORS, CAT_LABELS, PRODUCT_COLORS } = window.PCV_DATA;
        const CAT_ORDER = ['berth','market','shop','mainland','logistics'];
        const CAT_GROUP_LABELS = {
            berth:    'Berths & Marinas',
            market:   'Markets & Direct Supply',
            shop:     'Specialty Shops & Wine',
            mainland: 'Mainland / Bulk',
            logistics:'Logistics'
        };
        const escapeHTML = s => (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        const telHref = p => 'tel:' + p.replace(/[^+\d]/g, '');

        // City-bounds: same logic as the article renderer
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
            if (v.online === undefined) v.online = haversineKm(cityCenter, [v.lat, v.lng]) > cityRadiusKm;
        });
        const inCityVenues = VENUES.filter(v => !v.online);
        const productPills = (tags) => (tags || []).map(t => {
            const c = (PRODUCT_COLORS || {})[t] || '#444';
            return '<span style="background:' + c + ';">' + escapeHTML(t) + '</span>';
        }).join('');

        // Set port name in header / title
        document.querySelectorAll('[data-port-name]').forEach(el => { el.textContent = cfg.portName || 'Port Call'; });
        const dateEl = document.getElementById('card-date');
        if (dateEl) dateEl.textContent = 'Updated ' + new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

        // Stable numbering (berths first, then markets, shops, mainland, logistics)
        const numbered = VENUES.slice().sort((a,b) => CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat));
        const numByID = {};
        numbered.forEach((v, i) => { numByID[v.id] = i + 1; });

        // ---- Top-3 berths
        function renderBerths() {
            const target = document.getElementById('card-berths');
            if (!target) return;
            const berths = VENUES.filter(v => v.tier === 'berth_top').sort((a,b)=>a.priority-b.priority);
            target.innerHTML = berths.map((v, i) => {
                const tags = (v.tags || []).slice(0,4).map(t => '<i>' + escapeHTML(t) + '</i>').join('');
                const meta = [];
                if (v.address) meta.push('<div><b>Addr</b> ' + escapeHTML(v.address) + '</div>');
                if (v.phone)   meta.push('<div><b>Tel</b> ' + escapeHTML(v.phone) + '</div>');
                if (v.email)   meta.push('<div><b>Email</b> ' + escapeHTML(v.email) + '</div>');
                if (v.hours)   meta.push('<div><b>Hrs</b> ' + escapeHTML(v.hours) + '</div>');
                if (v.web)     meta.push('<div><b>Web</b> ' + escapeHTML(v.web.replace(/^https?:\/\//,'').replace(/\/$/,'')) + '</div>');
                const products = productPills(v.productTags);
                return '<div class="berth">' +
                    '<span class="berth__rank">#' + (i+1) + ' · pin ' + numByID[v.id] + '</span>' +
                    (v.badge ? '<div><span class="berth__badge">' + escapeHTML(v.badge) + '</span></div>' : '') +
                    '<div class="berth__name">' + escapeHTML(v.name) + '</div>' +
                    (products ? '<div class="berth__products">' + products + '</div>' : '') +
                    '<div class="berth__tags">' + tags + '</div>' +
                    '<div class="berth__meta">' + meta.join('') + '</div>' +
                    '</div>';
            }).join('');
        }

        // ---- Address book
        function renderBook() {
            const target = document.getElementById('card-book');
            if (!target) return;
            const html = CAT_ORDER.map(cat => {
                const items = numbered.filter(v => v.cat === cat);
                if (!items.length) return '';
                return items.map(v => {
                    const tags = (v.tags || []).join(' · ');
                    const lines = [];
                    if (v.address) lines.push('<div><b>Addr</b> ' + escapeHTML(v.address) + '</div>');
                    if (v.phone)   lines.push('<div><b>Tel</b> <a href="' + telHref(v.phone) + '">' + escapeHTML(v.phone) + '</a></div>');
                    if (v.email)   lines.push('<div><b>Email</b> <a href="mailto:' + escapeHTML(v.email) + '">' + escapeHTML(v.email) + '</a></div>');
                    if (v.hours)   lines.push('<div><b>Hrs</b> ' + escapeHTML(v.hours) + '</div>');
                    if (v.web)     lines.push('<div><b>Web</b> ' + escapeHTML(v.web.replace(/^https?:\/\//,'').replace(/\/$/,'')) + '</div>');
                    const products = productPills(v.productTags);
                    const numCell = v.online
                        ? '<span class="book__num" style="background:#0ea5e9;" title="Ships in">↦</span>'
                        : '<span class="book__num">' + numByID[v.id] + '</span>';
                    return '<div class="book__group">' +
                        '<span class="book__cat">' + escapeHTML(CAT_GROUP_LABELS[cat] || cat) + '</span>' +
                        '<div class="book__name">' + numCell + escapeHTML(v.name) + (v.online ? ' <em style="color:#0ea5e9;font-style:normal;font-size:9px;letter-spacing:0.08em;text-transform:uppercase;">Ships in</em>' : '') + '</div>' +
                        (products ? '<div class="book__products">' + products + '</div>' : '') +
                        (tags ? '<div class="book__tags">' + escapeHTML(tags) + '</div>' : '') +
                        '<div class="book__lines">' + lines.join('') + '</div>' +
                        '</div>';
                }).join('');
            }).join('');
            target.innerHTML = html;
        }

        // ---- Map (Voyager tiles, numbered DivIcon)
        function initMap() {
            if (typeof L === 'undefined') return;
            const el = document.getElementById('card-map');
            if (!el) return;
            const map = L.map('card-map', {
                zoomControl: false, scrollWheelZoom: false, dragging: false,
                doubleClickZoom: false, touchZoom: false, attributionControl: true
            });
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OSM &copy; CARTO',
                maxZoom: 19, subdomains: 'abcd'
            }).addTo(map);
            // Only pin in-city venues on the printed map. Out-of-city
            // suppliers (online / ships in) are listed in the address book
            // with a "ships in" note rather than crowding a tiny printed map.
            inCityVenues.forEach(v => {
                const icon = L.divIcon({
                    className: '',
                    html: '<div style="background:#1a2a3a;color:#fff;border:2px solid '
                        + (COLORS[v.cat] || '#444') + ';border-radius:50%;width:22px;height:22px;'
                        + 'display:flex;align-items:center;justify-content:center;'
                        + 'font:700 11px/1 ui-monospace,SF Mono,Consolas,monospace;'
                        + 'box-shadow:0 1px 3px rgba(0,0,0,0.4);">' + numByID[v.id] + '</div>',
                    iconSize: [22, 22], iconAnchor: [11, 11]
                });
                L.marker([v.lat, v.lng], { icon: icon }).addTo(map);
            });
            try {
                const bpts = inCityVenues.length ? inCityVenues : VENUES;
                map.fitBounds(bpts.map(v => [v.lat, v.lng]), { padding: [18, 18], maxZoom: 14 });
            } catch(e){}
            setTimeout(() => map.invalidateSize(), 200);
        }

        renderBerths();
        renderBook();
        initMap();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
