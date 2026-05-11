/* ====================================================================
   DRAFT MODE — annotation overlay for in-review articles.

   Activates only when ?draft=1 is present in the URL. No-op otherwise.

   What it does:
     • Adds a top banner: "DRAFT MODE — click any paragraph to annotate"
     • Marks every <p>, <h2>, <h3>, <li> inside .article__content as click-to-annotate
     • Click → modal with textarea AND a stylus/finger handwriting canvas
     • Save to localStorage (per-article, per-block); both text and sketch optional
     • Annotated blocks get a numbered margin marker
     • End of article: "Your Notes" summary listing every annotation (text + sketch)
     • Buttons: Copy as Markdown, Email to me, Clear all notes for this article
     • "Back to Drafts" sticky link top-right

   Handwriting (added 2026-05-09):
     • Canvas inside the modal, full-width, 320px tall (responsive)
     • Pointer Events API — works with stylus on reMarkable / Boox / iPad / Wacom,
       and with mouse / finger on any device
     • Tools: Pen / Eraser / thickness Fine/Med/Bold / Undo / Clear
     • "Pen-only" toggle ignores finger touches (palm rejection on e-ink tablets)
     • Strokes captured as arrays of points; rendered live to canvas; serialised
       to SVG on save and stored alongside the typed note
     • Sketches render inline (as SVG <img>) in the end-of-article summary

   Storage shape:
     localStorage["llcs-draft-notes-<slug>"] = {
       "<idx>": {
         text: "...",
         sketch: "<svg ...>...</svg>",     // optional
         strokes: [{points:[[x,y],...], w:3}, ...],  // raw, for re-edit
         at: "ISO date",
         excerpt: "first 200 chars"
       }
     }
     localStorage["llcs-draft-newsletter-selection"] = ["<slug>", "<slug>"]
     localStorage["llcs-draft-penonly"] = "1" | "0"
==================================================================== */
(function () {
  'use strict';

  if (!new URLSearchParams(window.location.search).has('draft')) return;

  const SLUG = (window.location.pathname.split('/').pop() || '').replace(/\.html$/, '');
  const NOTES_KEY = 'llcs-draft-notes-' + SLUG;
  const PENONLY_KEY = 'llcs-draft-penonly';

  // Canvas authoring dimensions — strokes are stored at this scale and
  // rendered into an SVG with this viewBox. The on-screen canvas is
  // resized responsively but coordinates are normalised to this space.
  const CANVAS_W = 600;
  const CANVAS_H = 320;

  function getNotes() {
    try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function setNotes(n) { localStorage.setItem(NOTES_KEY, JSON.stringify(n)); }
  function clearAllNotes() { localStorage.removeItem(NOTES_KEY); }

  function getPenOnly() { return localStorage.getItem(PENONLY_KEY) === '1'; }
  function setPenOnly(v) { localStorage.setItem(PENONLY_KEY, v ? '1' : '0'); }

  const escapeHTML = s => (s || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function init() {
    document.documentElement.classList.add('draft-mode');
    injectStyles();
    injectBanner();
    annotateBlocks();
    renderNotesSummary();
  }

  // ---------- Styles (self-contained, no external CSS dependency) ----------
  function injectStyles() {
    if (document.getElementById('draft-mode-styles')) return;
    const css = `
      html.draft-mode body { padding-top: 56px; }
      .dm-banner {
        position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
        background: #1a1a1a; color: #fafafa;
        padding: 10px 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px; letter-spacing: 0.04em;
        display: flex; justify-content: space-between; align-items: center;
        border-bottom: 2px solid #c4a35a;
      }
      .dm-banner__left { display: flex; align-items: center; gap: 16px; }
      .dm-banner__pulse {
        width: 8px; height: 8px; background: #c4a35a;
        animation: dmPulse 1.6s ease-in-out infinite;
      }
      @keyframes dmPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      .dm-banner__title { font-weight: 700; text-transform: uppercase; }
      .dm-banner__hint { color: #a3a3a3; font-size: 12px; }
      .dm-banner__right { display: flex; gap: 10px; }
      .dm-banner a, .dm-banner button {
        background: transparent; color: #fafafa; border: 1px solid #555;
        padding: 5px 12px; font-size: 12px; text-decoration: none;
        cursor: pointer; font-family: inherit;
      }
      .dm-banner a:hover, .dm-banner button:hover { background: #c4a35a; color: #1a1a1a; border-color: #c4a35a; }
      .dm-banner__count { background: #c4a35a; color: #1a1a1a; padding: 2px 8px; font-weight: 700; font-size: 11px; }

      .dm-annotatable { position: relative; cursor: text; transition: background 0.15s; }
      .dm-annotatable:hover { background: rgba(196, 163, 90, 0.08); outline: 1px dashed rgba(196,163,90,0.4); outline-offset: 2px; }
      .dm-annotatable.dm-has-note { background: rgba(196, 163, 90, 0.12); border-left: 3px solid #c4a35a; padding-left: 12px; margin-left: -15px; }
      .dm-annotatable.dm-has-note:hover { background: rgba(196, 163, 90, 0.18); }
      .dm-marker {
        position: absolute; left: -42px; top: 4px;
        background: #c4a35a; color: #1a1a1a;
        font-family: 'SF Mono', Consolas, monospace; font-size: 11px; font-weight: 700;
        width: 24px; height: 24px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 0;
      }
      @media (max-width: 900px) { .dm-marker { left: -32px; width: 18px; height: 18px; font-size: 9px; } }

      /* ---- Modal (taller now, scrolls on small screens) ---- */
      .dm-modal-bg { position: fixed; inset: 0; background: rgba(10,10,10,0.6); z-index: 10000; display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px; overflow-y: auto; }
      .dm-modal {
        background: #fafafa; max-width: 720px; width: 100%; padding: 22px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        border-top: 4px solid #c4a35a;
        max-height: calc(100vh - 80px); overflow-y: auto;
      }
      .dm-modal__cat { font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #6b7280; margin-bottom: 8px; }
      .dm-modal__excerpt { font-family: Georgia, serif; font-style: italic; font-size: 14px; color: #4a4a4a; padding: 10px 14px; border-left: 3px solid #c4a35a; background: rgba(196,163,90,0.06); margin-bottom: 16px; }
      .dm-modal__textarea { width: 100%; box-sizing: border-box; min-height: 80px; padding: 12px; font-family: Georgia, serif; font-size: 15px; line-height: 1.5; border: 1px solid #c4a35a; resize: vertical; }
      .dm-modal__textarea:focus { outline: none; border-color: #1a1a1a; }

      /* ---- Drawing area ---- */
      .dm-draw { margin-top: 14px; }
      .dm-draw__bar {
        display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
        padding: 8px 0; font-size: 12px;
        border-bottom: 1px solid #e2e2e2;
      }
      .dm-draw__label {
        font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em;
        color: #6b7280; margin-right: 6px;
      }
      .dm-draw__bar button, .dm-draw__bar select {
        background: #fafafa; color: #1a1a1a;
        border: 1px solid #c8c8c8;
        padding: 7px 11px; font-size: 12px;
        font-family: inherit; cursor: pointer;
        min-height: 32px; min-width: 36px;
      }
      .dm-draw__bar button:hover, .dm-draw__bar select:hover { border-color: #1a1a1a; }
      .dm-draw__bar button.dm-tool--active {
        background: #1a1a1a; color: #fafafa; border-color: #1a1a1a;
      }
      .dm-draw__bar select { padding: 6px 10px; }
      .dm-draw__penonly {
        margin-left: auto; display: flex; align-items: center; gap: 6px;
        font-size: 12px; color: #4a4a4a; cursor: pointer;
      }
      .dm-draw__penonly input { width: 16px; height: 16px; cursor: pointer; }

      .dm-canvas-wrap {
        position: relative; margin-top: 8px;
        background: #fafafa;
        border: 1px solid #c4a35a;
        /* lined paper feel — every 32px line, light grey */
        background-image: repeating-linear-gradient(
          to bottom,
          transparent 0 31px,
          rgba(196,163,90,0.18) 31px 32px
        );
      }
      .dm-canvas {
        display: block; width: 100%;
        touch-action: none; /* critical: prevent scroll while drawing */
        cursor: crosshair;
      }
      .dm-canvas-wrap.dm-eraser .dm-canvas { cursor: cell; }

      .dm-draw__hint {
        font-size: 11px; color: #6b7280; margin-top: 6px;
        font-family: 'SF Mono', Consolas, monospace; letter-spacing: 0.04em;
      }
      .dm-draw__hint b { color: #1a1a1a; }

      .dm-modal__actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px; flex-wrap: wrap; }
      .dm-modal__actions button { padding: 9px 18px; font-size: 13px; font-family: inherit; cursor: pointer; border: 1px solid #1a1a1a; background: transparent; min-height: 40px; }
      .dm-modal__actions button.dm-primary { background: #1a1a1a; color: #fafafa; }
      .dm-modal__actions button.dm-danger { color: #b91c1c; border-color: #b91c1c; }
      .dm-modal__actions button:hover { background: #c4a35a; color: #1a1a1a; border-color: #c4a35a; }
      .dm-modal__actions button.dm-primary:hover { background: #c4a35a; color: #1a1a1a; }

      /* ---- End-of-article summary ---- */
      .dm-summary {
        margin: 80px auto 60px; max-width: 70ch; padding: 32px 24px;
        background: #1a1a1a; color: #fafafa;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .dm-summary__head { border-bottom: 1px solid #555; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 12px; }
      .dm-summary__title { font-family: Georgia, serif; font-size: 28px; margin: 0; font-weight: 400; }
      .dm-summary__count { background: #c4a35a; color: #1a1a1a; padding: 4px 12px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; }
      .dm-summary__hint { color: #a3a3a3; font-size: 13px; margin: 0 0 24px; }
      .dm-summary__empty { color: #777; font-style: italic; padding: 24px 0; }
      .dm-note { padding: 16px 0; border-bottom: 1px solid #333; }
      .dm-note:last-child { border-bottom: none; }
      .dm-note__num { color: #c4a35a; font-family: 'SF Mono', Consolas, monospace; font-size: 12px; font-weight: 700; }
      .dm-note__excerpt { font-family: Georgia, serif; font-style: italic; color: #a3a3a3; font-size: 14px; line-height: 1.5; margin: 6px 0 10px; }
      .dm-note__text { font-size: 15px; line-height: 1.6; white-space: pre-wrap; margin-bottom: 8px; }
      .dm-note__sketch {
        background: #fafafa; padding: 6px;
        margin: 10px 0;
        max-width: 100%;
      }
      .dm-note__sketch svg, .dm-note__sketch img { display: block; width: 100%; height: auto; max-height: 320px; }
      .dm-note__sketch-tag {
        display: inline-block; background: #c4a35a; color: #1a1a1a;
        font-family: 'SF Mono', Consolas, monospace; font-size: 10px; font-weight: 700;
        padding: 2px 8px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px;
      }
      .dm-note__when { color: #777; font-size: 11px; font-family: 'SF Mono', Consolas, monospace; margin-top: 8px; }
      .dm-summary__actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 28px; padding-top: 20px; border-top: 1px solid #555; }
      .dm-summary__actions button, .dm-summary__actions a {
        background: transparent; color: #fafafa; border: 1px solid #fafafa;
        padding: 8px 16px; font-size: 13px; font-family: inherit; text-decoration: none; cursor: pointer;
      }
      .dm-summary__actions button:hover, .dm-summary__actions a:hover { background: #c4a35a; color: #1a1a1a; border-color: #c4a35a; }
      .dm-summary__actions .dm-danger { color: #ef9696; border-color: #b91c1c; }
      .dm-summary__actions .dm-danger:hover { background: #b91c1c; color: #fafafa; border-color: #b91c1c; }

      .dm-flash { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1a1a1a; color: #fafafa; padding: 10px 20px; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; z-index: 10001; border-left: 3px solid #c4a35a; }

      @media (max-width: 600px) {
        .dm-modal { padding: 16px; }
        .dm-draw__penonly { margin-left: 0; width: 100%; padding-top: 4px; }
      }
    `;
    const style = document.createElement('style');
    style.id = 'draft-mode-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------- Banner ----------
  function injectBanner() {
    const bar = document.createElement('div');
    bar.className = 'dm-banner';
    bar.innerHTML =
      '<div class="dm-banner__left">' +
        '<span class="dm-banner__pulse"></span>' +
        '<span class="dm-banner__title">Draft Mode</span>' +
        '<span class="dm-banner__hint">Tap any paragraph · Type or sketch · Saved locally</span>' +
        '<span class="dm-banner__count" id="dm-count">0 notes</span>' +
      '</div>' +
      '<div class="dm-banner__right">' +
        '<a href="../draft.html">← Drafts</a>' +
      '</div>';
    document.body.insertBefore(bar, document.body.firstChild);
    refreshCount();
  }

  function refreshCount() {
    const el = document.getElementById('dm-count');
    if (!el) return;
    const n = Object.keys(getNotes()).length;
    el.textContent = n + (n === 1 ? ' note' : ' notes');
  }

  // ---------- Annotation wiring ----------
  function annotateBlocks() {
    const container =
      document.querySelector('.article__content') ||
      document.querySelector('.article-content') ||
      document.querySelector('article') ||
      document.querySelector('main');
    if (!container) return;

    const selector = 'p, h2, h3, h4, li, blockquote';
    const all = Array.from(container.querySelectorAll(selector));
    const blocks = all.filter(el => {
      if (!el.textContent.trim()) return false;
      if (el.closest('.pc-quicknav, .article__meta, header.masthead, footer, aside, nav, .dm-skip')) return false;
      if (el.parentElement && el.parentElement.classList.contains('dm-annotatable')) return false;
      return true;
    });

    const notes = getNotes();
    blocks.forEach((el, idx) => {
      el.dataset.dmIdx = String(idx);
      el.classList.add('dm-annotatable');
      el.addEventListener('click', onBlockClick);
      if (notes[idx]) markAnnotated(el, idx);
    });
  }

  function onBlockClick(e) {
    if (e.target.closest('a, button, summary')) return;
    const sel = window.getSelection();
    if (sel && sel.toString().length > 3) return;
    e.preventDefault();
    e.stopPropagation();
    openNoteModal(this, parseInt(this.dataset.dmIdx, 10));
  }

  function markAnnotated(el, idx) {
    el.classList.add('dm-has-note');
    if (el.querySelector('.dm-marker')) return;
    const marker = document.createElement('span');
    marker.className = 'dm-marker';
    marker.textContent = String(idx + 1);
    marker.title = 'Annotated. Click to edit.';
    el.insertBefore(marker, el.firstChild);
  }

  function unmarkAnnotated(el) {
    el.classList.remove('dm-has-note');
    const m = el.querySelector('.dm-marker');
    if (m) m.remove();
  }

  // ===================================================================
  // Drawing engine — Pointer Events, palm rejection, undo, SVG export
  // ===================================================================

  function makeDrawingEngine(canvas, wrap) {
    const ctx = canvas.getContext('2d');
    let strokes = [];           // [{points: [[x,y]], w: 3, erase: bool}]
    let active = null;          // current stroke being drawn
    let tool = 'pen';           // 'pen' | 'eraser'
    let width = 3;
    let penOnly = getPenOnly();

    function setSize() {
      // High-DPI canvas: backing store at devicePixelRatio,
      // visual size at CSS pixels. Coordinates always in CSS pixels.
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssW = Math.max(1, Math.floor(rect.width));
      const cssH = CANVAS_H;
      canvas.style.height = cssH + 'px';
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Store CSS dims for normalisation
      canvas._cssW = cssW;
      canvas._cssH = cssH;
      redraw();
    }

    function getPos(e) {
      const r = canvas.getBoundingClientRect();
      return [
        Math.max(0, Math.min(canvas._cssW, e.clientX - r.left)),
        Math.max(0, Math.min(canvas._cssH, e.clientY - r.top))
      ];
    }

    function shouldAcceptPointer(e) {
      // Stylus and mouse always accepted; touch only if pen-only is off
      if (e.pointerType === 'touch' && penOnly) return false;
      return true;
    }

    function onPointerDown(e) {
      if (!shouldAcceptPointer(e)) return;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      const [x, y] = getPos(e);
      if (tool === 'eraser') {
        active = { points: [[x, y]], w: width * 4, erase: true };
      } else {
        active = { points: [[x, y]], w: width, erase: false };
      }
      strokes.push(active);
      drawStroke(active, true);
    }

    function onPointerMove(e) {
      if (!active) return;
      if (!shouldAcceptPointer(e)) return;
      const [x, y] = getPos(e);
      const last = active.points[active.points.length - 1];
      // Tiny-move filter: skip points <0.7px from previous
      if (Math.hypot(x - last[0], y - last[1]) < 0.7) return;
      active.points.push([x, y]);
      drawStroke(active, true);
      if (tool === 'eraser') applyEraserHits(active);
    }

    function onPointerUp(e) {
      if (!active) return;
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      // Single click should still leave a tiny dot
      if (active.points.length === 1) {
        const [x, y] = active.points[0];
        active.points.push([x + 0.1, y + 0.1]);
      }
      // After eraser stroke: prune erased strokes
      if (tool === 'eraser') {
        // Keep only non-erased; also drop the eraser stroke itself
        strokes = strokes.filter(s => !s.erase && !s._dead);
        redraw();
      }
      active = null;
    }

    function applyEraserHits(eraserStroke) {
      const ePts = eraserStroke.points;
      const r2 = (eraserStroke.w / 2) * (eraserStroke.w / 2);
      for (const s of strokes) {
        if (s === eraserStroke || s.erase || s._dead) continue;
        for (const p of s.points) {
          for (const ep of ePts) {
            const dx = p[0] - ep[0], dy = p[1] - ep[1];
            if (dx * dx + dy * dy < r2) { s._dead = true; break; }
          }
          if (s._dead) break;
        }
      }
    }

    function drawStroke(s, incremental) {
      if (s._dead || s.erase) return;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = s.w;
      const pts = s.points;
      if (incremental && pts.length >= 2) {
        // Just draw the latest segment for performance (e-ink)
        ctx.beginPath();
        ctx.moveTo(pts[pts.length - 2][0], pts[pts.length - 2][1]);
        ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        ctx.stroke();
      } else if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0][0], pts[0][1], s.w / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      }
    }

    function redraw() {
      ctx.clearRect(0, 0, canvas._cssW, canvas._cssH);
      strokes.filter(s => !s._dead && !s.erase).forEach(s => drawStroke(s, false));
    }

    function undo() {
      // Drop the last non-dead, non-erase stroke
      for (let i = strokes.length - 1; i >= 0; i--) {
        if (!strokes[i]._dead && !strokes[i].erase) { strokes.splice(i, 1); break; }
      }
      redraw();
    }

    function clear() {
      strokes = [];
      redraw();
    }

    function isEmpty() {
      return strokes.filter(s => !s._dead && !s.erase).length === 0;
    }

    /**
     * Serialise live strokes into:
     *  - rawStrokes: array kept for re-edit
     *  - svg: a stand-alone <svg> string for inline rendering
     */
    function serialise() {
      const live = strokes.filter(s => !s._dead && !s.erase);
      if (!live.length) return { strokes: null, svg: null };
      const rawStrokes = live.map(s => ({
        points: s.points.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]),
        w: s.w
      }));
      // Normalise to authoring viewBox (CANVAS_W × CANVAS_H)
      const sx = CANVAS_W / canvas._cssW;
      const sy = CANVAS_H / canvas._cssH;
      const polys = rawStrokes.map(s => {
        const d = s.points.map(([x, y]) =>
          (Math.round(x * sx * 10) / 10) + ',' + (Math.round(y * sy * 10) / 10)
        ).join(' ');
        return '<polyline points="' + d + '" fill="none" stroke="#1a1a1a" stroke-width="' +
          (s.w * Math.min(sx, sy)).toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round"/>';
      }).join('');
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + CANVAS_W + ' ' + CANVAS_H +
        '" width="' + CANVAS_W + '" height="' + CANVAS_H + '">' +
        '<rect width="100%" height="100%" fill="#fafafa"/>' + polys + '</svg>';
      return { strokes: rawStrokes, svg };
    }

    /**
     * Re-load a saved sketch into the canvas for editing. Strokes were
     * stored at canvas-CSS-pixel scale (the resolution at save time);
     * we re-draw at the same coordinates and rely on the CSS scale to
     * make it visually consistent.
     */
    function load(savedStrokes) {
      strokes = (savedStrokes || []).map(s => ({
        points: s.points.map(p => [p[0], p[1]]),
        w: s.w
      }));
      redraw();
    }

    // Public surface
    function setTool(t) {
      tool = t;
      wrap.classList.toggle('dm-eraser', t === 'eraser');
    }
    function setWidth(w) { width = w; }
    function setPenOnlyFlag(v) { penOnly = !!v; setPenOnly(v); }

    // Wire events
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);
    // Suppress context menu on long-press / right click during drawing
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Resize
    setSize();
    const ro = new ResizeObserver(() => setSize());
    ro.observe(wrap);

    return {
      undo, clear, isEmpty, serialise, load,
      setTool, setWidth, setPenOnlyFlag,
      destroy: () => { ro.disconnect(); }
    };
  }

  // ---------- Modal ----------
  function openNoteModal(el, idx) {
    const notes = getNotes();
    const existing = notes[idx];
    const excerpt = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    const penOnly = getPenOnly();

    const bg = document.createElement('div');
    bg.className = 'dm-modal-bg';
    bg.innerHTML =
      '<div class="dm-modal" role="dialog" aria-label="Add or edit note">' +
        '<div class="dm-modal__cat">' + (existing ? 'Edit Note · #' + (idx + 1) : 'New Note · #' + (idx + 1)) + '</div>' +
        '<div class="dm-modal__excerpt">' + escapeHTML(excerpt) + (excerpt.length === 240 ? '…' : '') + '</div>' +
        '<textarea class="dm-modal__textarea" placeholder="Type a note here, or sketch below."></textarea>' +
        '<div class="dm-draw">' +
          '<div class="dm-draw__bar">' +
            '<span class="dm-draw__label">Sketch</span>' +
            '<button type="button" data-tool="pen" class="dm-tool dm-tool--active" aria-pressed="true">✎ Pen</button>' +
            '<button type="button" data-tool="eraser" class="dm-tool" aria-pressed="false">⌫ Eraser</button>' +
            '<select class="dm-thickness" aria-label="Pen thickness">' +
              '<option value="2">Fine</option>' +
              '<option value="3" selected>Medium</option>' +
              '<option value="6">Bold</option>' +
            '</select>' +
            '<button type="button" data-act="undo" title="Undo last stroke">↶ Undo</button>' +
            '<button type="button" data-act="clear" title="Clear sketch">Clear</button>' +
            '<label class="dm-draw__penonly" title="Ignore finger touches — useful on e-ink tablets to prevent palm marks">' +
              '<input type="checkbox" id="dm-penonly"' + (penOnly ? ' checked' : '') + '> Pen only' +
            '</label>' +
          '</div>' +
          '<div class="dm-canvas-wrap" id="dm-canvas-wrap">' +
            '<canvas class="dm-canvas" id="dm-canvas"></canvas>' +
          '</div>' +
          '<div class="dm-draw__hint">Stylus, finger, or mouse. <b>Pen only</b> blocks finger touches for palm rejection. <b>Cmd/Ctrl + Enter</b> saves.</div>' +
        '</div>' +
        '<div class="dm-modal__actions">' +
          (existing ? '<button class="dm-danger" data-act="delete">Delete</button>' : '') +
          '<button data-act="cancel">Cancel</button>' +
          '<button class="dm-primary" data-act="save">Save</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(bg);
    const ta = bg.querySelector('.dm-modal__textarea');
    const canvas = bg.querySelector('#dm-canvas');
    const wrap = bg.querySelector('#dm-canvas-wrap');

    let engine = null;
    // Defer engine construction until canvas has measured width
    setTimeout(() => {
      engine = makeDrawingEngine(canvas, wrap);
      if (existing && existing.strokes) engine.load(existing.strokes);
    }, 30);

    if (existing) ta.value = existing.text || '';
    setTimeout(() => ta.focus(), 50);

    // Toolbar wiring
    const tools = bg.querySelectorAll('[data-tool]');
    tools.forEach(b => {
      b.addEventListener('click', () => {
        tools.forEach(x => {
          x.classList.remove('dm-tool--active');
          x.setAttribute('aria-pressed', 'false');
        });
        b.classList.add('dm-tool--active');
        b.setAttribute('aria-pressed', 'true');
        if (engine) engine.setTool(b.dataset.tool);
      });
    });
    bg.querySelector('.dm-thickness').addEventListener('change', e => {
      if (engine) engine.setWidth(parseFloat(e.target.value));
    });
    bg.querySelector('[data-act="undo"]').addEventListener('click', () => engine && engine.undo());
    bg.querySelector('[data-act="clear"]').addEventListener('click', () => {
      if (!engine) return;
      if (engine.isEmpty() || confirm('Clear the sketch on this note?')) engine.clear();
    });
    bg.querySelector('#dm-penonly').addEventListener('change', e => {
      if (engine) engine.setPenOnlyFlag(e.target.checked);
    });

    function close() { if (engine) engine.destroy(); bg.remove(); }
    bg.addEventListener('click', e => { if (e.target === bg) close(); });
    bg.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveAndClose();
    });

    function saveAndClose() {
      const txt = ta.value.trim();
      const sk = engine ? engine.serialise() : { strokes: null, svg: null };
      const allNotes = getNotes();
      if (!txt && !sk.svg) {
        delete allNotes[idx];
        unmarkAnnotated(el);
      } else {
        allNotes[idx] = {
          text: txt,
          sketch: sk.svg || null,
          strokes: sk.strokes || null,
          at: new Date().toISOString(),
          excerpt: excerpt
        };
        markAnnotated(el, idx);
      }
      setNotes(allNotes);
      refreshCount();
      renderNotesSummary();
      flash((txt || sk.svg) ? 'Note saved' : 'Note removed');
      close();
    }

    bg.addEventListener('click', e => {
      const act = e.target.dataset && e.target.dataset.act;
      if (act === 'save') saveAndClose();
      else if (act === 'cancel') close();
      else if (act === 'delete') {
        const allNotes = getNotes();
        delete allNotes[idx];
        setNotes(allNotes);
        unmarkAnnotated(el);
        refreshCount();
        renderNotesSummary();
        flash('Note removed');
        close();
      }
    });
  }

  function flash(msg) {
    const f = document.createElement('div');
    f.className = 'dm-flash';
    f.textContent = msg;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1600);
  }

  // ---------- End-of-article summary ----------
  function renderNotesSummary() {
    const old = document.getElementById('dm-summary');
    if (old) old.remove();

    const notes = getNotes();
    const entries = Object.keys(notes)
      .map(k => Object.assign({ idx: parseInt(k, 10) }, notes[k]))
      .sort((a, b) => a.idx - b.idx);

    const summary = document.createElement('section');
    summary.className = 'dm-summary';
    summary.id = 'dm-summary';

    const sketchCount = entries.filter(n => n.sketch).length;
    const countLabel = entries.length + ' annotation' + (entries.length === 1 ? '' : 's') +
      (sketchCount ? ' · ' + sketchCount + ' sketch' + (sketchCount === 1 ? '' : 'es') : '');

    let inner =
      '<div class="dm-summary__head">' +
        '<h2 class="dm-summary__title">Your Notes</h2>' +
        '<span class="dm-summary__count">' + countLabel + '</span>' +
      '</div>' +
      '<p class="dm-summary__hint">Click any annotated paragraph above to edit or delete its note. Notes live in this browser only.</p>';

    if (!entries.length) {
      inner += '<div class="dm-summary__empty">No notes yet. Click any paragraph to add one.</div>';
    } else {
      inner += entries.map(n => {
        let body = '';
        if (n.text) body += '<div class="dm-note__text">' + escapeHTML(n.text) + '</div>';
        if (n.sketch) {
          body += '<div class="dm-note__sketch-tag">Sketch</div>';
          // Inline SVG (already a stand-alone svg string)
          body += '<div class="dm-note__sketch">' + n.sketch + '</div>';
        }
        return '<div class="dm-note">' +
          '<span class="dm-note__num">#' + (n.idx + 1) + '</span>' +
          '<div class="dm-note__excerpt">"' + escapeHTML(n.excerpt) + (n.excerpt.length >= 240 ? '…' : '') + '"</div>' +
          body +
          '<div class="dm-note__when">' + new Date(n.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) + '</div>' +
        '</div>';
      }).join('');
    }

    inner +=
      '<div class="dm-summary__actions">' +
        '<button data-act="copy">Copy as Markdown</button>' +
        '<button data-act="export-html">Download HTML (with sketches)</button>' +
        '<a id="dm-mailto" href="#">Email to me</a>' +
        '<button class="dm-danger" data-act="clear">Clear all notes</button>' +
      '</div>';

    summary.innerHTML = inner;

    const target =
      document.querySelector('.article__content') ||
      document.querySelector('.article-content') ||
      document.querySelector('article') ||
      document.querySelector('main');
    if (target) target.appendChild(summary);
    else document.body.appendChild(summary);

    summary.addEventListener('click', e => {
      const act = e.target.dataset && e.target.dataset.act;
      if (act === 'copy') {
        const md = buildMarkdown(entries);
        copyToClipboard(md).then(() => flash('Markdown copied to clipboard')).catch(() => flash('Copy failed — select + Cmd-C from console'));
      } else if (act === 'export-html') {
        downloadHTML(entries);
      } else if (act === 'clear') {
        if (confirm('Delete all notes for this article? This cannot be undone.')) {
          clearAllNotes();
          document.querySelectorAll('.dm-has-note').forEach(unmarkAnnotated);
          refreshCount();
          renderNotesSummary();
          flash('All notes cleared');
        }
      }
    });

    const mailto = summary.querySelector('#dm-mailto');
    if (mailto) {
      const subj = 'Draft notes — ' + (document.title || SLUG);
      const body = buildMarkdown(entries);
      mailto.href = 'mailto:arnaudcallier@pm.me?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body.slice(0, 1800));
    }
  }

  function buildMarkdown(entries) {
    const head = '# Draft Notes — ' + (document.title || SLUG) + '\n\n' +
      'Article: ' + window.location.origin + window.location.pathname + '\n' +
      'Notes: ' + entries.length + ' · Generated: ' + new Date().toLocaleString('en-GB') + '\n\n---\n\n';
    if (!entries.length) return head + '_No notes._\n';
    return head + entries.map(n =>
      '## #' + (n.idx + 1) + '\n\n' +
      '> ' + n.excerpt.replace(/\n/g, ' ') + (n.excerpt.length >= 240 ? '…' : '') + '\n\n' +
      (n.text ? n.text + '\n\n' : '') +
      (n.sketch ? '_[Sketch attached — open the article in Draft Mode to view, or use Download HTML for the full export.]_\n\n' : '') +
      '_Saved: ' + new Date(n.at).toLocaleString('en-GB') + '_\n'
    ).join('\n---\n\n');
  }

  /**
   * Stand-alone HTML export with sketches inlined as SVG.
   * Saves to disk via download attr.
   */
  function downloadHTML(entries) {
    const title = (document.title || SLUG).replace(/ — LITTORALICIOUS$/, '');
    const css =
      'body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1a1a1a;line-height:1.5}' +
      'h1{font-size:24px;margin-bottom:6px}' +
      '.meta{font-family:-apple-system,sans-serif;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.1em;margin-bottom:32px}' +
      '.note{padding:18px 0;border-bottom:1px solid #ddd}' +
      '.note__num{font-family:Consolas,monospace;color:#c4a35a;font-weight:700;font-size:13px}' +
      '.note__excerpt{font-style:italic;color:#666;margin:6px 0 12px;padding-left:14px;border-left:3px solid #c4a35a}' +
      '.note__text{margin:8px 0;white-space:pre-wrap}' +
      '.note__sketch{margin:10px 0;background:#fafafa;border:1px solid #e2e2e2;padding:6px}' +
      '.note__sketch svg{display:block;width:100%;height:auto;max-width:600px}' +
      '.note__when{font-family:Consolas,monospace;font-size:11px;color:#888;margin-top:8px}';
    const body = !entries.length
      ? '<p><em>No notes.</em></p>'
      : entries.map(n =>
          '<div class="note">' +
            '<span class="note__num">#' + (n.idx + 1) + '</span>' +
            '<div class="note__excerpt">"' + escapeHTML(n.excerpt) + (n.excerpt.length >= 240 ? '…' : '') + '"</div>' +
            (n.text ? '<div class="note__text">' + escapeHTML(n.text) + '</div>' : '') +
            (n.sketch ? '<div class="note__sketch">' + n.sketch + '</div>' : '') +
            '<div class="note__when">Saved: ' + new Date(n.at).toLocaleString('en-GB') + '</div>' +
          '</div>'
        ).join('');
    const html =
      '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Draft Notes — ' + escapeHTML(title) + '</title>' +
      '<style>' + css + '</style></head><body>' +
      '<h1>Draft Notes — ' + escapeHTML(title) + '</h1>' +
      '<div class="meta">' + entries.length + ' annotation' + (entries.length === 1 ? '' : 's') +
      ' · ' + entries.filter(n => n.sketch).length + ' sketch' + (entries.filter(n => n.sketch).length === 1 ? '' : 'es') +
      ' · Generated ' + new Date().toLocaleString('en-GB') +
      '<br>Source: ' + escapeHTML(window.location.href.replace(/\?draft=1.*/, '')) + '</div>' +
      body + '</body></html>';
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'draft-notes-' + SLUG + '-' + new Date().toISOString().slice(0, 10) + '.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 100);
    flash('HTML downloaded');
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
        resolve();
      } catch (e) { reject(e); }
    });
  }

  // ---------- Boot ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
