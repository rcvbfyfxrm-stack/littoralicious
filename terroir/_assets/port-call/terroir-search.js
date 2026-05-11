/* Terroir search — sticky search bar for Littoralicious terroir briefings.
 *
 * Indexes every <article class="tcard"> + every <details class="sfold"> at load.
 * Renders a dropdown of grouped, ranked results. On click: opens every ancestor
 * <details>, smooth-scrolls, briefly flashes the target card.
 *
 * Self-contained: injects its own styles + DOM. Drop the <script> tag at the
 * bottom of any terroir briefing; the bar appears below the download-bar.
 *
 * Section labels are derived from data-section + a small alias table so
 * "wine" finds drink+tables-worth, "music" finds nights, etc.
 */
(function () {
  if (window.__terroirSearchInit) return;
  window.__terroirSearchInit = true;

  // ---------- Styles ----------
  var css = `
    .terroir-search { position: sticky; top: 44px; z-index: 90;
      background: rgba(250,250,250,0.97); backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--rule, #d7d2c4);
      padding: 10px 16px; }
    .terroir-search__inner { max-width: 820px; margin: 0 auto; position: relative; }
    .terroir-search__input { width: 100%; box-sizing: border-box;
      padding: 10px 38px 10px 36px;
      background: #fff; border: 1px solid var(--rule, #d7d2c4); border-radius: 0;
      font-family: 'Libre Baskerville', Georgia, serif; font-size: 0.95em;
      color: var(--ink, #0a0a0a); transition: border-color 0.15s; outline: none; }
    .terroir-search__input:focus { border-color: var(--sea, #2d4a5e); }
    .terroir-search__icon { position: absolute; left: 12px; top: 50%;
      transform: translateY(-50%); color: var(--ink-3, #6a6a6a); pointer-events: none;
      font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
    .terroir-search__clear { position: absolute; right: 10px; top: 50%;
      transform: translateY(-50%); width: 22px; height: 22px;
      border: none; background: transparent; color: var(--ink-3, #6a6a6a);
      cursor: pointer; font-size: 1.1em; line-height: 1; padding: 0;
      display: none; }
    .terroir-search__clear:hover { color: var(--ink, #0a0a0a); }
    .terroir-search__input:not(:placeholder-shown) ~ .terroir-search__clear { display: block; }

    .terroir-search__hint { display: block; margin-top: 4px;
      font-family: 'JetBrains Mono', monospace; font-size: 0.66em;
      color: var(--ink-3, #6a6a6a); letter-spacing: 0.1em; text-transform: uppercase; }

    .terroir-search__results { position: absolute; left: 0; right: 0; top: 100%;
      margin-top: 6px; background: #fff;
      border: 1px solid var(--rule, #d7d2c4); border-top: 2px solid var(--sea, #2d4a5e);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      max-height: 70vh; overflow-y: auto; display: none; }
    .terroir-search__results.is-open { display: block; }

    .terroir-search__group { padding: 8px 0; }
    .terroir-search__group + .terroir-search__group { border-top: 1px dashed var(--rule, #d7d2c4); }
    .terroir-search__group-head { font-family: 'JetBrains Mono', monospace;
      font-size: 0.66em; letter-spacing: 0.18em; color: var(--sea, #2d4a5e);
      text-transform: uppercase; padding: 4px 14px; }
    .terroir-search__group-count { color: var(--ink-3, #6a6a6a); margin-left: 6px; }
    .terroir-search__hit { display: block; padding: 8px 14px;
      cursor: pointer; user-select: none; transition: background 0.1s;
      border-left: 2px solid transparent; }
    .terroir-search__hit:hover, .terroir-search__hit.is-active {
      background: var(--paper-2, #f2efe8); border-left-color: var(--sea, #2d4a5e); }
    .terroir-search__hit-name { font-family: 'Playfair Display', Georgia, serif;
      font-size: 0.94em; font-weight: 700; color: var(--ink, #0a0a0a); line-height: 1.25; }
    .terroir-search__hit-where { font-family: 'JetBrains Mono', monospace;
      font-size: 0.68em; letter-spacing: 0.06em; color: var(--ink-3, #6a6a6a);
      text-transform: uppercase; margin-top: 2px; }
    .terroir-search__hit-snippet { font-size: 0.82em; line-height: 1.4;
      color: var(--ink-2, #3a3a3a); margin-top: 3px; }
    .terroir-search__hit mark { background: #fff6c2; color: var(--ink, #0a0a0a);
      padding: 0 1px; }
    .terroir-search__empty { padding: 14px;
      font-family: 'Playfair Display', serif; font-style: italic;
      color: var(--ink-3, #6a6a6a); text-align: center; font-size: 0.9em; }

    .is-search-flash { animation: terroir-search-flash 1.6s ease-out; }
    @keyframes terroir-search-flash {
      0% { background: rgba(45,74,94,0.18); box-shadow: 0 0 0 4px rgba(45,74,94,0.18); }
      100% { background: transparent; box-shadow: 0 0 0 0 rgba(45,74,94,0); }
    }

    @media print { .terroir-search { display: none !important; } }
    @media (max-width: 600px) {
      .terroir-search { top: 38px; padding: 8px 10px; }
      .terroir-search__input { font-size: 0.88em; padding-left: 32px; }
      .terroir-search__hint { display: none; }
    }
  `;
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- Section labels & aliases ----------
  var SECTION_LABELS = {
    'dish': '🍽 Eat',
    'drink': '🍷 Drink',
    'pairings': '⚜ Pairings',
    'tables-worth': '⚓ Tables',
    'nights': '🌙 Nights',
    'work': '☕ Work & study',
    'culture': '🏛 Culture',
    'ethnic': '🥙 Ethnic',
    'streetfood': '🍔 Street food',
    'markets': '🥬 Markets',
    'walks': '🚶 Walks',
    'secret-gems': '🗝 Secret gems',
    'three-tables': '⚓ Tables',
    'twentyfour': '🕐 24 hours',
    'when-to-come': '📅 When to come',
    'sources': '📚 Sources'
  };

  // Aliases: query keyword -> section ids that should boost
  var ALIASES = {
    'wine': ['drink', 'tables-worth'],
    'natural': ['drink', 'tables-worth'],
    'cava': ['drink'],
    'sparkling': ['drink'],
    'cocktail': ['nights'],
    'bar': ['nights', 'tables-worth'],
    'music': ['nights'],
    'jazz': ['nights'],
    'club': ['nights'],
    'techno': ['nights'],
    'coffee': ['work', 'drink'],
    'cafe': ['work'],
    'café': ['work'],
    'library': ['work'],
    'study': ['work'],
    'restaurant': ['tables-worth', 'ethnic', 'streetfood'],
    'michelin': ['tables-worth'],
    'tapas': ['tables-worth'],
    'lebanese': ['ethnic'],
    'japanese': ['ethnic'],
    'mexican': ['ethnic'],
    'kebab': ['streetfood', 'ethnic'],
    'burger': ['streetfood'],
    'sandwich': ['streetfood'],
    'market': ['markets'],
    'walk': ['walks'],
    'hike': ['walks'],
    'sunset': ['nights', 'walks', 'secret-gems'],
    'view': ['nights', 'walks', 'secret-gems'],
    'gallery': ['culture', 'secret-gems'],
    'museum': ['culture'],
    'church': ['culture', 'secret-gems'],
    'sea': ['nights', 'walks'],
    'beach': ['nights', 'walks']
  };

  // ---------- Build the search index ----------
  function buildIndex() {
    var index = [];

    // Index tcards
    document.querySelectorAll('article.tcard[data-section]').forEach(function (el) {
      var section = el.getAttribute('data-section');
      if (section === 'tables') return; // hidden inventory
      var name = el.querySelector('.tcard__name');
      var hook = el.querySelector('.tcard__hook');
      var body = el.querySelector('.tcard__body');
      var nameText = name ? name.textContent.trim() : '';
      var hookText = hook ? hook.textContent.trim() : '';
      var bodyText = body ? body.textContent.trim() : '';
      // Try to extract a "where" line (first phrase of hook, before "—")
      var where = '';
      if (hookText) {
        var m = hookText.match(/^(.*?)(?:\s+&mdash;|\s+—|$)/);
        where = m ? m[1].trim() : hookText.split('—')[0].trim();
      }
      index.push({
        type: 'tcard',
        section: section,
        name: nameText,
        where: where.slice(0, 120),
        snippet: (hookText + ' ' + bodyText).slice(0, 280),
        haystack: (nameText + ' ' + hookText + ' ' + bodyText).toLowerCase(),
        el: el
      });
    });

    // Index sfold sections (only ones with id + non-trivial title)
    document.querySelectorAll('details.sfold[id]').forEach(function (el) {
      if (el.style.display === 'none') return;
      var titleEl = el.querySelector('.sfold__title');
      var descEl = el.querySelector('.sfold__desc');
      if (!titleEl) return;
      var t = titleEl.textContent.trim();
      var d = descEl ? descEl.textContent.trim() : '';
      index.push({
        type: 'section',
        section: el.id,
        name: t,
        where: 'Section',
        snippet: d,
        haystack: (t + ' ' + d).toLowerCase(),
        el: el
      });
    });

    return index;
  }

  // ---------- Scoring ----------
  function score(item, tokens, query) {
    var s = 0;
    var hayName = item.name.toLowerCase();
    var haySnippet = item.snippet.toLowerCase();
    tokens.forEach(function (t) {
      if (!t) return;
      // Exact name match
      if (hayName === t) s += 12;
      // Token at start of name
      else if (hayName.indexOf(t) === 0) s += 8;
      // Token anywhere in name
      else if (hayName.indexOf(t) !== -1) s += 5;
      // Token in snippet
      if (haySnippet.indexOf(t) !== -1) s += 1;
    });
    // Alias boost
    var aliasSections = ALIASES[query.trim().toLowerCase()] || [];
    if (aliasSections.indexOf(item.section) !== -1) s += 3;
    // Section type boost: prefer tcards over sections by default
    if (item.type === 'tcard') s += 0.5;
    return s;
  }

  // ---------- Highlight ----------
  function highlight(text, tokens) {
    var out = text;
    tokens.forEach(function (t) {
      if (!t || t.length < 2) return;
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }

  // ---------- Render results ----------
  function render(query, index, container) {
    if (!query || query.length < 2) {
      container.classList.remove('is-open');
      container.innerHTML = '';
      return;
    }
    var tokens = query.toLowerCase().split(/\s+/).filter(function (t) { return t.length >= 2; });
    var matches = index.map(function (item) {
      return { item: item, score: score(item, tokens, query) };
    }).filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 30);

    if (!matches.length) {
      container.innerHTML = '<div class="terroir-search__empty">No match — try fewer or different words (e.g. <em>vermut</em>, <em>sunset</em>, <em>peka</em>, <em>cava</em>).</div>';
      container.classList.add('is-open');
      return;
    }

    // Group by section
    var groups = {};
    matches.forEach(function (r) {
      var k = r.item.section;
      if (!groups[k]) groups[k] = [];
      groups[k].push(r);
    });
    // Stable group order
    var orderedSections = ['tables-worth','dish','drink','pairings','nights','culture','ethnic','streetfood','markets','walks','secret-gems','work','three-tables','twentyfour','seasonal','when-to-come','sources'];
    var orderedKeys = orderedSections.filter(function (k) { return groups[k]; })
      .concat(Object.keys(groups).filter(function (k) { return orderedSections.indexOf(k) === -1; }));

    var html = '';
    orderedKeys.forEach(function (k) {
      var label = SECTION_LABELS[k] || k;
      html += '<div class="terroir-search__group">';
      html += '<div class="terroir-search__group-head">' + label + '<span class="terroir-search__group-count">· ' + groups[k].length + '</span></div>';
      groups[k].forEach(function (r, i) {
        var item = r.item;
        var nameH = highlight(item.name, tokens);
        var snipH = highlight(item.snippet.slice(0, 200), tokens);
        html += '<a class="terroir-search__hit' + (k === orderedKeys[0] && i === 0 ? ' is-active' : '') + '" href="#" data-idx="' + index.indexOf(item) + '">';
        html += '<div class="terroir-search__hit-name">' + nameH + '</div>';
        if (item.where) html += '<div class="terroir-search__hit-where">' + item.where + '</div>';
        if (snipH) html += '<div class="terroir-search__hit-snippet">' + snipH + '…</div>';
        html += '</a>';
      });
      html += '</div>';
    });
    container.innerHTML = html;
    container.classList.add('is-open');
  }

  // ---------- Navigate to a result ----------
  function navigateTo(item) {
    if (!item || !item.el) return;
    // Open every ancestor <details>
    var parent = item.el.parentElement;
    while (parent && parent !== document.body) {
      if (parent.tagName === 'DETAILS' && !parent.open) parent.open = true;
      parent = parent.parentElement;
    }
    // For sfold sections themselves, open
    if (item.el.tagName === 'DETAILS' && !item.el.open) item.el.open = true;
    // Scroll into view
    setTimeout(function () {
      item.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      item.el.classList.add('is-search-flash');
      setTimeout(function () { item.el.classList.remove('is-search-flash'); }, 1700);
    }, 60);
  }

  // ---------- DOM construction ----------
  function init() {
    // Find the download-bar to insert after
    var anchor = document.querySelector('.download-bar');
    if (!anchor) return; // Safety: no download-bar means a non-briefing page; skip.

    // Build index
    var index = buildIndex();

    // Build search bar
    var bar = document.createElement('section');
    bar.className = 'terroir-search';
    bar.setAttribute('aria-label', 'Search this briefing');
    bar.innerHTML =
      '<div class="terroir-search__inner">' +
        '<span class="terroir-search__icon">⌕</span>' +
        '<input class="terroir-search__input" type="search" autocomplete="off" spellcheck="false" placeholder="Search dishes, drinks, tables, walks, gems… (e.g. peka, vermut, sunset)" aria-label="Search this briefing">' +
        '<button class="terroir-search__clear" type="button" aria-label="Clear">×</button>' +
        '<small class="terroir-search__hint">' + index.length + ' entries indexed · Esc to close · Enter to jump</small>' +
        '<div class="terroir-search__results"></div>' +
      '</div>';
    anchor.parentNode.insertBefore(bar, anchor.nextSibling);

    var input = bar.querySelector('.terroir-search__input');
    var results = bar.querySelector('.terroir-search__results');
    var clearBtn = bar.querySelector('.terroir-search__clear');

    // Debounced render
    var timer = null;
    function trigger() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { render(input.value, index, results); }, 90);
    }
    input.addEventListener('input', trigger);
    input.addEventListener('focus', function () {
      if (input.value.length >= 2) render(input.value, index, results);
    });
    clearBtn.addEventListener('click', function () {
      input.value = '';
      results.classList.remove('is-open');
      results.innerHTML = '';
      input.focus();
    });

    // Click on a hit
    results.addEventListener('click', function (e) {
      var hit = e.target.closest('.terroir-search__hit');
      if (!hit) return;
      e.preventDefault();
      var idx = parseInt(hit.dataset.idx, 10);
      var item = index[idx];
      results.classList.remove('is-open');
      input.blur();
      navigateTo(item);
    });

    // Keyboard navigation
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        input.value = '';
        results.classList.remove('is-open');
        input.blur();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        var active = results.querySelector('.terroir-search__hit.is-active');
        if (active) active.click();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var hits = Array.prototype.slice.call(results.querySelectorAll('.terroir-search__hit'));
        if (!hits.length) return;
        var current = results.querySelector('.terroir-search__hit.is-active');
        var ci = current ? hits.indexOf(current) : -1;
        if (current) current.classList.remove('is-active');
        var ni = e.key === 'ArrowDown' ? Math.min(ci + 1, hits.length - 1) : Math.max(ci - 1, 0);
        hits[ni].classList.add('is-active');
        hits[ni].scrollIntoView({ block: 'nearest' });
      }
    });

    // Close dropdown on outside click
    document.addEventListener('click', function (e) {
      if (!bar.contains(e.target)) results.classList.remove('is-open');
    });

    // Cmd/Ctrl + K to focus
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Defer slightly so all sfolds/tcards are in the DOM
    setTimeout(init, 50);
  }
})();
