/* Terroir pin-hover — ties [data-pin="<id>"] spans/cards to map markers/areas.
 * Supported pin id prefixes:
 *   p-...  → a venue marker (existing behavior)
 *   n-...  → a neighborhood (highlights a circle area on hover)
 *   w-...  → a walk start point (highlights a marker on hover)
 *   l-...  → a landmark / cultural point (highlights a marker on hover)
 *
 * Single-map model (May 2026 redesign): there is exactly ONE Leaflet instance,
 * the floating "terroir-mini" map. It is closed by default and opens via the
 * always-visible "Show map" toggle. State persists in localStorage
 * ('terroir-map-open' boolean — default false).
 */
(function () {

  var KEY = 'terroir-map-open';

  function isOpen() {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }

  function setOpenState(open) {
    var mini = document.getElementById('terroir-mini');
    var toggle = document.getElementById('terroir-mini-toggle');
    if (!mini) return;
    if (open) {
      mini.classList.add('is-visible');
      if (toggle) toggle.style.display = 'none';
      // Force a Leaflet redraw the first time we show it
      if (window.__terroirMap) {
        try { setTimeout(function () { window.__terroirMap.invalidateSize(); }, 50); } catch (e) {}
      }
    } else {
      mini.classList.remove('is-visible');
      if (toggle) toggle.style.display = '';
    }
    try { localStorage.setItem(KEY, open ? '1' : '0'); } catch (e) {}
  }

  // ---------- Map open/close toggle ----------
  function wireMapToggle() {
    var mini = document.getElementById('terroir-mini');
    var toggle = document.getElementById('terroir-mini-toggle');
    var closeBtn = document.getElementById('terroir-mini-close');
    if (!mini || !toggle) return;

    setOpenState(isOpen());

    if (closeBtn) {
      closeBtn.textContent = '×';
      closeBtn.setAttribute('aria-label', 'Close map');
      closeBtn.addEventListener('click', function () { setOpenState(false); });
    }
    toggle.addEventListener('click', function () { setOpenState(true); });
  }

  // ---------- Closed-map hint popup ----------
  // When the map is closed, hovering a [data-pin] element shows a small
  // floating tooltip near the cursor that says "Open map to see". Click it
  // (or the pin itself) to open the map.
  function isFrenchPage() {
    var l = (document.documentElement.lang || '').toLowerCase();
    return l === 'fr' || l.indexOf('fr-') === 0;
  }
  function getHintEl() {
    var el = document.getElementById('terroir-pin-hint');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'terroir-pin-hint';
    el.className = 'terroir-pin-hint';
    el.setAttribute('role', 'tooltip');
    el.innerHTML = (isFrenchPage()
      ? 'Ouvrir la carte pour voir'
      : 'Open map to see') +
      ' <span class="terroir-pin-hint__arrow">&rarr;</span>';
    el.addEventListener('click', function () {
      setOpenState(true);
      hideHint();
    });
    document.body.appendChild(el);
    return el;
  }
  function positionHint(el, x, y) {
    var w = el.offsetWidth  || 200;
    var h = el.offsetHeight || 32;
    var left = x + 14;
    var top  = y - h - 10;
    if (left + w > window.innerWidth  - 8) left = Math.max(8, x - w - 14);
    if (top  < 8)                           top  = y + 18;
    if (top  + h > window.innerHeight - 8)  top  = window.innerHeight - h - 8;
    el.style.left = left + 'px';
    el.style.top  = top  + 'px';
  }
  function showHint(x, y) {
    var el = getHintEl();
    positionHint(el, x, y);
    el.classList.add('is-visible');
  }
  function moveHint(x, y) {
    var el = document.getElementById('terroir-pin-hint');
    if (el && el.classList.contains('is-visible')) positionHint(el, x, y);
  }
  function hideHint() {
    var el = document.getElementById('terroir-pin-hint');
    if (el) el.classList.remove('is-visible');
  }
  // Hide hint as soon as the map opens (e.g. via toggle click)
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && (t.id === 'terroir-mini-toggle' || (t.closest && t.closest('#terroir-mini')))) {
      hideHint();
    }
  });

  // ---------- Neighborhood + Walk + Landmark + Work area drawing ----------
  function drawAreasOnMap() {
    var map = window.__terroirMap;
    var data = window.PCV_DATA;
    if (!map || !data) return;

    // NEIGHBORHOODS as soft circles (drawn faintly, glow on hover)
    window.__terroirNeighborhoods = window.__terroirNeighborhoods || {};
    var neighborhoods = data.NEIGHBORHOODS || [];
    neighborhoods.forEach(function (n) {
      if (!n || !n.center || n.center.length !== 2) return;
      var c = L.circle(n.center, {
        radius: n.radius || 300,
        color: '#5b8a9a',
        weight: 1,
        fillColor: '#5b8a9a',
        fillOpacity: 0.05,
        interactive: false
      }).addTo(map);
      window.__terroirNeighborhoods[n.id] = c;
    });

    // WALKS as start markers (small green diamonds), hover-only opacity
    window.__terroirWalks = window.__terroirWalks || {};
    var walks = data.WALKS || [];
    walks.forEach(function (w) {
      if (!w || !w.start || w.start.length !== 2) return;
      var icon = L.divIcon({
        className: '',
        html: '<div style="background:#3a6a45;width:11px;height:11px;border:2px solid #fff;'
            + 'box-shadow:0 0 0 1px #3a6a45,0 1px 4px rgba(0,0,0,0.4);transform:rotate(45deg);"></div>',
        iconSize: [14, 14], iconAnchor: [7, 7]
      });
      var m = L.marker(w.start, { icon: icon, opacity: 0, riseOnHover: true });
      m.bindTooltip('Walk start: ' + (w.name || w.id), { direction: 'right', offset: [10, 0] });
      m.on('mouseover', function () { m.setOpacity(1); });
      m.on('mouseout', function () { m.setOpacity(0); });
      m.addTo(map);
      window.__terroirWalks[w.id] = m;
    });

    // LANDMARKS as small ochre triangles, always visible (cultural anchor points)
    window.__terroirLandmarks = window.__terroirLandmarks || {};
    var landmarks = data.LANDMARKS || [];
    landmarks.forEach(function (l) {
      if (!l || !l.coords || l.coords.length !== 2) return;
      var icon = L.divIcon({
        className: '',
        html: '<div style="width:0;height:0;border-left:7px solid transparent;'
            + 'border-right:7px solid transparent;border-bottom:11px solid #8a6a2e;'
            + 'filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4));"></div>',
        iconSize: [14, 14], iconAnchor: [7, 11]
      });
      var m = L.marker(l.coords, { icon: icon, opacity: 0.6, riseOnHover: true });
      m.bindTooltip(l.name || l.id, { direction: 'right', offset: [10, 0] });
      m.on('mouseover', function () { m.setOpacity(1); });
      m.on('mouseout', function () { m.setOpacity(0.6); });
      if (l.maps_url) {
        m.bindPopup('<b>' + (l.name || l.id) + '</b><br>'
          + '<a href="' + l.maps_url + '" target="_blank" rel="noopener">Open in Google Maps →</a>');
      }
      m.addTo(map);
      window.__terroirLandmarks[l.id] = m;
    });

    // WORK SPOTS as small purple squares, hover-only opacity (registered in __terroirMarkers
    // so existing card-hover behavior wires them automatically)
    window.__terroirMarkers = window.__terroirMarkers || {};
    var work = data.WORK_SPOTS || [];
    work.forEach(function (w) {
      if (!w || !w.start || w.start.length !== 2) return;
      var icon = L.divIcon({
        className: '',
        html: '<div style="background:#5a3a6a;width:10px;height:10px;border:2px solid #fff;'
            + 'box-shadow:0 0 0 1px #5a3a6a,0 1px 4px rgba(0,0,0,0.4);"></div>',
        iconSize: [14, 14], iconAnchor: [7, 7]
      });
      var m = L.marker(w.start, { icon: icon, opacity: 0, riseOnHover: true });
      m.bindTooltip(w.name || w.id, { direction: 'right', offset: [10, 0] });
      m.on('mouseover', function () { m.setOpacity(1); });
      m.on('mouseout', function () { m.setOpacity(0); });
      m.addTo(map);
      window.__terroirMarkers[w.id] = m;
    });
  }

  // ---------- Wire spans + cards to markers / areas ----------
  function tryWire() {
    var map = window.__terroirMap;
    var markers = window.__terroirMarkers;
    var neighborhoods = window.__terroirNeighborhoods || {};
    var walks = window.__terroirWalks || {};
    var landmarks = window.__terroirLandmarks || {};
    if (!map || !markers) return false;

    // Venue marker lookup: the prose markup uses ids like "p-v01-..." but the
    // marker map is keyed on the raw venue id "v01-..." (work spots already
    // include the "p-" prefix in their id, so the direct lookup hits first).
    function findVenueMarker(id) {
      var m = markers[id];
      if (m) return m;
      if (/^p-v/.test(id)) return markers[id.substring(2)] || null;
      return null;
    }

    // Hover-pin effects are gated on the map being OPEN. If the map is closed,
    // hover shows the "Open map to see" hint instead (wired further down).
    // Click still works regardless — see the click handler below.
    function activate(id) {
      if (!id || !isOpen()) return;
      var ch = id.charAt(0);
      if (ch === 'n') {
        var c = neighborhoods[id];
        if (c && c._path) c._path.classList.add('is-pin-area-active');
        return;
      }
      if (ch === 'w') {
        var w = walks[id];
        if (w) { w.setOpacity(1); if (w._icon) w._icon.classList.add('is-pin-active'); }
        return;
      }
      if (ch === 'l') {
        var l = landmarks[id];
        if (l) { l.setOpacity(1); if (l._icon) l._icon.classList.add('is-pin-active'); }
        return;
      }
      var m = findVenueMarker(id);
      if (m) {
        if (id.indexOf('p-work-') === 0) m.setOpacity(1);
        if (m._icon) m._icon.classList.add('is-pin-active');
      }
    }
    function deactivate(id) {
      if (!id) return;
      var ch = id.charAt(0);
      if (ch === 'n') {
        var c = neighborhoods[id];
        if (c && c._path) c._path.classList.remove('is-pin-area-active');
        return;
      }
      if (ch === 'w') {
        var w = walks[id];
        if (w) { w.setOpacity(0); if (w._icon) w._icon.classList.remove('is-pin-active'); }
        return;
      }
      if (ch === 'l') {
        var l = landmarks[id];
        if (l) { l.setOpacity(0.6); if (l._icon) l._icon.classList.remove('is-pin-active'); }
        return;
      }
      var m = findVenueMarker(id);
      if (m) {
        if (id.indexOf('p-work-') === 0) m.setOpacity(0);
        if (m._icon) m._icon.classList.remove('is-pin-active');
      }
    }
    // Find the article entry matching this pin id and scroll to it.
    // Tries common id patterns: #venue-{id-without-prefix}, #{id}, #w-{id}, etc.
    function scrollToEntry(id) {
      if (!id) return false;
      var candidates = [
        '#venue-' + id.replace(/^p-/, ''),
        '#' + id,
        '#w-' + id.replace(/^w-/, ''),
        '#l-' + id.replace(/^l-/, ''),
        '#n-' + id.replace(/^n-/, '')
      ];
      for (var i = 0; i < candidates.length; i++) {
        var el = document.querySelector(candidates[i]);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Brief highlight on the target so the user sees where they landed
          el.classList.add('is-entry-flash');
          setTimeout(function (e) {
            return function () { e.classList.remove('is-entry-flash'); };
          }(el), 1800);
          return true;
        }
      }
      return false;
    }
    function focusOn(id) {
      if (!id) return;
      var ch = id.charAt(0);
      if (ch === 'n') {
        var c = neighborhoods[id];
        if (c) { map.setView(c.getLatLng(), Math.max(map.getZoom(), 14), { animate: true }); }
        return;
      }
      if (ch === 'w') {
        var w = walks[id];
        if (w) { map.setView(w.getLatLng(), Math.max(map.getZoom(), 14), { animate: true }); w.setOpacity(1); }
        return;
      }
      if (ch === 'l') {
        var l = landmarks[id];
        if (l) { map.setView(l.getLatLng(), Math.max(map.getZoom(), 14), { animate: true }); l.openPopup(); l.setOpacity(1); }
        return;
      }
      var m = findVenueMarker(id);
      if (m) { map.setView(m.getLatLng(), Math.max(map.getZoom(), 14), { animate: true }); m.openPopup(); }
    }

    document.querySelectorAll('[data-pin]').forEach(function (sp) {
      var id = sp.getAttribute('data-pin');
      sp.addEventListener('mouseenter', function (e) {
        if (isOpen()) {
          activate(id);
        } else {
          showHint(e.clientX, e.clientY);
        }
      });
      sp.addEventListener('mousemove', function (e) {
        if (!isOpen()) moveHint(e.clientX, e.clientY);
      });
      sp.addEventListener('mouseleave', function () {
        deactivate(id);
        hideHint();
      });
      sp.addEventListener('click', function (e) {
        // Click behavior: open the map (if closed) AND scroll to the
        // matching article entry (if one exists). The map opens so the
        // user has spatial context; the article scrolls so they read more.
        var wasOpen = isOpen();
        if (!wasOpen) setOpenState(true);
        hideHint();
        focusOn(id);
        // Pulse the pin briefly
        setTimeout(function () { activate(id); }, 200);
        setTimeout(function () { deactivate(id); }, 1800);
        // Try to scroll to the article entry; if found, prevent the default
        // anchor-jump so the smooth scroll wins.
        var found = scrollToEntry(id);
        if (found || sp.tagName !== 'A') e.preventDefault();
      });
    });

    document.querySelectorAll('.tcard[data-venue-id]').forEach(function (card) {
      var id = card.dataset.venueId;
      card.addEventListener('mouseenter', function (e) {
        if (isOpen()) {
          activate(id);
        } else {
          showHint(e.clientX, e.clientY);
        }
      });
      card.addEventListener('mousemove', function (e) {
        if (!isOpen()) moveHint(e.clientX, e.clientY);
      });
      card.addEventListener('mouseleave', function () {
        deactivate(id);
        hideHint();
      });
    });

    return true;
  }

  function start() {
    wireMapToggle();
    drawAreasOnMap();
    var tries = 0;
    var iv = setInterval(function () {
      tries += 1;
      if (tryWire() || tries > 60) {
        clearInterval(iv);
      }
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
