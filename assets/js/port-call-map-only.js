/* ====================================================================
   PORT CALL — slim map-only renderer.
   For long-form prose port-call articles that want the interactive map
   without the data-driven card grid (the article already has the prose).

   Page must contain:
     #pcv-map               — big interactive map
     #pcv-legend            — category-toggle button strip (optional)
     #pcv-mini, #pcv-mini-handle, #pcv-mini-map, #pcv-mini-active
                            — sticky right-side foldable mini-map (optional)
   Page must load before this script:
     window.PCV_DATA = { VENUES, COLORS, CAT_LABELS }
     window.PCV_CONFIG = { center: [lat, lng], zoom: 13, cityRadiusKm: 50 }
   ==================================================================== */
(function () {
  function boot() {
    if (typeof L === 'undefined' || !window.PCV_DATA) return;
    const cfg = window.PCV_CONFIG || {};
    const { VENUES, COLORS, CAT_LABELS } = window.PCV_DATA;
    if (!VENUES || !VENUES.length) return;

    const escapeHTML = s => (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const telHref = p => 'tel:' + p.replace(/[^+\d]/g, '');

    // City-bounds — keep the map zoomed on the city itself, not on remote suppliers
    const cityCenter   = cfg.center || [0, 0];
    const cityRadiusKm = cfg.cityRadiusKm || 50;
    const haversineKm  = (a, b) => {
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

    // ====================================================================
    // BIG MAP
    // ====================================================================
    const bigMarkers = {};
    let bigMap = null;

    function initBigMap() {
      const el = document.getElementById('pcv-map');
      if (!el) return;
      bigMap = L.map('pcv-map', { zoomControl: true, scrollWheelZoom: false, attributionControl: true })
        .setView(cfg.center || [0, 0], cfg.zoom || 13);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19, subdomains: 'abcd'
      }).addTo(bigMap);

      const layers = { berth:L.layerGroup(), market:L.layerGroup(), shop:L.layerGroup(), mainland:L.layerGroup(), logistics:L.layerGroup() };
      const order = ['berth','market','shop','mainland','logistics'];
      const numbered = VENUES.slice().sort((a,b) => order.indexOf(a.cat) - order.indexOf(b.cat));

      const TIER_LABEL = { berth_top: 'Top berth', notime: 'No-time pick', several: 'Several-days pick', plenty: 'Plenty-of-time pick' };
      function buildPopup(v, num) {
        const lines = [];
        // Header: Category · tier badge
        const catLabel = CAT_LABELS[v.cat] || v.cat;
        const tierLabel = TIER_LABEL[v.tier];
        lines.push('<span class="pcv-pop-cat">' + escapeHTML(catLabel)
          + (tierLabel ? ' &middot; ' + escapeHTML(tierLabel) : '')
          + (v.badge ? ' &middot; <span style="background:#c4a35a;color:#1a2a3a;padding:1px 5px;font-size:9px;font-weight:700;letter-spacing:0.08em;">' + escapeHTML(v.badge) + '</span>' : '')
          + '</span>');
        // Title
        lines.push('<span class="pcv-pop-title">' + num + '. ' + escapeHTML(v.name) + '</span>');
        // Product tags (colour-pilled)
        if (v.productTags && v.productTags.length) {
          const PRODUCT_COLORS = (window.PCV_DATA && window.PCV_DATA.PRODUCT_COLORS) || {};
          const pills = v.productTags.slice(0, 6).map(t => {
            const c = PRODUCT_COLORS[t] || '#475569';
            return '<span style="display:inline-block;background:' + c + ';color:#fff;font-size:9.5px;font-weight:700;padding:1px 6px;margin:0 3px 3px 0;text-transform:uppercase;letter-spacing:0.05em;">' + escapeHTML(t) + '</span>';
          }).join('');
          lines.push('<div style="margin-bottom:6px;">' + pills + '</div>');
        }
        // Descriptive tags (small caps muted)
        if (v.tags && v.tags.length) {
          lines.push('<span class="pcv-pop-meta" style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">'
            + v.tags.slice(0, 4).map(escapeHTML).join(' &middot; ') + '</span>');
        }
        // Why / description (1–2 sentences)
        if (v.why) {
          const text = v.why.length > 220 ? v.why.slice(0, 215) + '…' : v.why;
          lines.push('<span class="pcv-pop-meta" style="color:#c8c0b4;line-height:1.5;">' + escapeHTML(text) + '</span>');
        }
        // Hours (white-on-navy callout)
        if (v.hours) {
          lines.push('<span class="pcv-pop-meta" style="color:#fafafa;font-family:\'SF Mono\',Consolas,monospace;font-size:11px;background:rgba(196,163,90,0.12);border-left:2px solid #c4a35a;padding:3px 8px;display:block;">⏱ '
            + escapeHTML(v.hours) + '</span>');
        }
        // Address
        if (v.address) {
          lines.push('<span class="pcv-pop-meta" style="font-family:\'SF Mono\',Consolas,monospace;font-size:11px;color:#94a3b8;">📍 ' + escapeHTML(v.address) + '</span>');
        }
        // Phone
        if (v.phone) {
          lines.push('<span class="pcv-pop-meta" style="font-family:\'SF Mono\',Consolas,monospace;font-size:11px;">📞 <a href="' + telHref(v.phone) + '" style="color:#7ba3bd;">' + escapeHTML(v.phone) + '</a></span>');
        }
        // Email
        if (v.email) {
          lines.push('<span class="pcv-pop-meta" style="font-family:\'SF Mono\',Consolas,monospace;font-size:11px;">✉ <a href="mailto:' + escapeHTML(v.email) + '" style="color:#7ba3bd;">' + escapeHTML(v.email) + '</a></span>');
        }
        // Web
        if (v.web) {
          const display = v.web.replace(/^https?:\/\//, '').replace(/\/$/, '');
          lines.push('<span class="pcv-pop-meta" style="font-family:\'SF Mono\',Consolas,monospace;font-size:11px;">🌐 <a href="' + escapeHTML(v.web) + '" target="_blank" rel="noopener" style="color:#7ba3bd;">' + escapeHTML(display) + '</a></span>');
        }
        // Maps deep-link
        if (v.maps) {
          lines.push('<a href="' + escapeHTML(v.maps) + '" target="_blank" rel="noopener" style="display:inline-block;margin-top:4px;color:#c4a35a;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;">Open in Google Maps &rarr;</a>');
        }
        return lines.join('');
      }

      numbered.forEach((v, idx) => {
        const num = idx + 1;
        const icon = L.divIcon({
          className: '',
          html: '<div class="pcv-pin cat-' + v.cat + '">' + num + '</div>',
          iconSize: [28, 28], iconAnchor: [14, 14]
        });
        const marker = L.marker([v.lat, v.lng], { icon: icon, riseOnHover: true });
        marker.bindTooltip(
          '<b>' + escapeHTML(v.short || v.name) + '</b><span class="pcv-label__cta">Click to map</span>',
          { className: 'pcv-label', direction: 'right', offset: [16, 0], permanent: false, opacity: 1 }
        );
        marker.bindPopup(buildPopup(v, num), { maxWidth: 340, minWidth: 280, autoPanPadding: [40, 40] });
        marker.addTo(layers[v.cat] || layers.shop);
        bigMarkers[v.id] = { marker: marker, num: num };
        marker.on('mouseover', () => setActive(v.id));
        marker.on('click',     () => setActive(v.id));
      });

      Object.values(layers).forEach(l => l.addTo(bigMap));
      try {
        const bpts = inCityVenues.length ? inCityVenues : VENUES;
        bigMap.fitBounds(bpts.map(v => [v.lat, v.lng]), { padding: [40, 40], maxZoom: 14 });
      } catch (e) {}
      bigMap.once('focus', () => bigMap.scrollWheelZoom.enable());
      bigMap.on('click',   () => bigMap.scrollWheelZoom.enable());

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
    // STICKY MINI-MAP (foldable, zoomable, hover-light-up)
    // ====================================================================
    let miniMap = null;
    const miniMarkers = {};
    let activeId = null;

    function initMiniMap() {
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
        marker.on('click',     () => focusVenue(v.id, true));
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
        const phoneTxt = v.phone ? '<a href="' + telHref(v.phone) + '">' + escapeHTML(v.phone) + '</a> · ' : '';
        const active = document.getElementById('pcv-mini-active');
        if (active) active.innerHTML =
          '<b>' + (CAT_LABELS[v.cat] || v.cat) + '</b>' +
          '<span><strong style="color:#fafafa">' + escapeHTML(v.name) + '</strong><br>' +
          phoneTxt +
          (v.maps ? '<a href="' + escapeHTML(v.maps) + '" target="_blank" rel="noopener">Open map →</a>' : '') +
          '</span>';
      }
      activeId = id;
    }

    function focusVenue(id, scrollTo) {
      setActive(id);
      if (scrollTo && bigMarkers[id]) {
        const el = document.getElementById('pcv-map');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    function initMiniMapPanel() {
      const panel  = document.getElementById('pcv-mini');
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
      handle.addEventListener('click', () => {
        const collapsed = panel.classList.toggle('is-collapsed');
        handle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        if (!collapsed && miniMap) setTimeout(() => miniMap.invalidateSize(), 320);
      });
    }

    // ----- COLLAPSED-BY-DEFAULT: big inline map only renders on click -----
    let bigMapInitDone = false;
    function ensureBigMap() {
      if (bigMapInitDone) return;
      bigMapInitDone = true;
      initBigMap();
    }
    const wrap = document.querySelector('.pcv-map-wrap');
    if (wrap) {
      wrap.classList.add('is-collapsed');
      const head = wrap.querySelector('.pcv-map-head');
      if (head && !head.querySelector('.pcv-map-toggle')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pcv-map-toggle';
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = 'Show map ▾';
        head.appendChild(btn);
      }
      head && head.addEventListener('click', function (e) {
        // Only the head bar toggles — leave clicks inside the map / legend alone.
        if (e.target.closest('.pcv-legend') || e.target.closest('#pcv-map')) return;
        const collapsed = wrap.classList.toggle('is-collapsed');
        const btn = wrap.querySelector('.pcv-map-toggle');
        if (btn) {
          btn.textContent = collapsed ? 'Show map ▾' : 'Hide map ▴';
          btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        }
        if (!collapsed) {
          ensureBigMap();
          setTimeout(function () { if (bigMap) bigMap.invalidateSize(); }, 80);
        }
      });
    } else {
      // No wrapper found — fall back to the old immediate-init behaviour.
      ensureBigMap();
    }

    initMiniMap();
    initMiniMapPanel();
    wireTextHover();
    wireScrollSpy();

    // ====================================================================
    // TEXT-HOVER-TO-PIN-HIGHLIGHT
    // Hovering any element whose text contains a venue name lights up its
    // pin on both maps in real time — and adds a subtle gold underline so
    // the reader sees that the name is "live" / map-linked.
    // ====================================================================
    function wireTextHover() {
      // Build a name → venue lookup. Match against name, short, and any
      // distinguishing single-word handles (last word of the name).
      const lookup = [];
      VENUES.forEach(v => {
        const handles = new Set();
        if (v.name)  handles.add(v.name);
        if (v.short && v.short !== v.name) handles.add(v.short);
        // Allow a few common abbreviations for stable matches
        if (v.name) {
          const w = v.name.replace(/\(.*?\)/g, '').trim();
          if (w !== v.name) handles.add(w);
        }
        handles.forEach(h => lookup.push({ key: h.toLowerCase(), venue: v }));
      });
      // Sort longest-key first so "Marina Sant'Elena" beats "Sant'Elena"
      lookup.sort((a, b) => b.key.length - a.key.length);

      const candidates = document.querySelectorAll(
        '.article__content p, .article__content li, .article__content td, ' +
        '.article__content .pfold__name, .article__content .pfold__hook, ' +
        '.article__content .tb-col li, .article__content .tb-col h3, ' +
        '.article__content h2, .article__content h3, .article__content h4, ' +
        '.article__content .funfact, .article__content .pullq'
      );

      candidates.forEach(el => {
        // Skip if the element is INSIDE an entry whose own data-id we already
        // handle (avoid double-binding for foldable headings).
        const txt = (el.textContent || '').toLowerCase();
        if (!txt) return;
        let matched = null;
        for (let i = 0; i < lookup.length; i++) {
          if (txt.indexOf(lookup[i].key) !== -1) { matched = lookup[i].venue; break; }
        }
        if (!matched) return;
        el.classList.add('pcv-name-link');
        el.dataset.venueLink = matched.id;
        el.addEventListener('mouseenter', () => {
          setActive(matched.id);
          // Auto-open the side mini-map if collapsed
          const panel = document.getElementById('pcv-mini');
          if (panel && panel.classList.contains('is-collapsed') && !panel.dataset.userClosed) {
            panel.classList.remove('is-collapsed');
            const h = document.getElementById('pcv-mini-handle');
            if (h) h.setAttribute('aria-expanded', 'true');
            setTimeout(() => { if (miniMap) miniMap.invalidateSize(); }, 320);
          }
        });
      });
    }

    // ====================================================================
    // SCROLL-SPY — when a venue's pfold is in view, light up its pin
    // ====================================================================
    function wireScrollSpy() {
      if (!('IntersectionObserver' in window)) return;
      const cards = document.querySelectorAll('details.pfold[id^="p-"]');
      if (!cards.length) return;
      const observed = new Map();
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) observed.set(e.target, e.intersectionRatio);
          else observed.delete(e.target);
        });
        let best = null, bestRatio = 0;
        observed.forEach((ratio, el) => { if (ratio > bestRatio) { best = el; bestRatio = ratio; } });
        if (!best) return;
        // Translate id "p-pesto" → look up venue by short id form
        const pfoldId = best.id.replace(/^p-/, '');
        const v = VENUES.find(x => x.id === pfoldId);
        if (v) setActive(v.id);
      }, { rootMargin: '-30% 0px -45% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
      cards.forEach(c => io.observe(c));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
