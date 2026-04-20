({
  name: 'Regex Filter',
  description: 'Live text/regexp filter for schema and data panels; ancestors of matches are dimmed, non-matches are hidden',
  styles: `
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .filter-wrap {
      position: relative;
      display: flex;
      align-items: stretch;
    }
    .filter-wrap:focus-within .filter-kv-btn,
    .filter-wrap:focus-within .filter-input { border-color: var(--accent-border); }
    .filter-input {
      font-family: var(--mono);
      font-size: 11px;
      width: 130px;
      padding: 3px 22px 3px 7px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface2);
      color: var(--text);
      outline: none;
      transition: border-color 0.15s;
    }
    .filter-input:focus { border-color: var(--accent-border); }
    .filter-input::placeholder { color: var(--text-dim); }
    .filter-input.filter-invalid { border-color: rgba(252,165,165,0.6); }
    .filter-clear {
      position: absolute;
      right: 4px;
      padding: 1px 4px;
      font-size: 10px;
      border: none;
      background: transparent;
      color: var(--text-dim);
      cursor: pointer;
      line-height: 1;
      visibility: hidden;
    }
    .filter-clear:hover { color: var(--text); background: transparent; border-color: transparent; }
    .filter-clear.visible { visibility: visible; }
    .filter-re-btn {
      padding: 3px 6px;
      font-size: 10px;
      letter-spacing: 0;
      border-color: var(--border);
      color: var(--text-dim);
    }
    .filter-re-btn.active {
      border-color: var(--accent-border);
      color: var(--accent);
      background: var(--accent-dim);
    }
    .filter-kv-btn {
      padding: 3px 6px;
      font-size: 10px;
      letter-spacing: 0;
      border-color: var(--border);
      border-right: none;
      border-radius: var(--radius) 0 0 var(--radius);
      color: var(--text-dim);
      min-width: 28px;
      text-align: center;
    }
    .filter-kv-btn.active {
      color: var(--accent);
      background: var(--accent-dim);
    }
    .filter-input-kv {
      border-radius: 0 var(--radius) var(--radius) 0;
    }
  `,
  buttons: {
    'schema.header.right': `
      <div class="filter-bar" id="schemaFilterBar">
        <button class="filter-re-btn" id="schemaFilterRe" title="Toggle regexp mode">.*</button>
        <div class="filter-wrap">
          <button class="filter-kv-btn" id="schemaFilterKT" title="KT: match key or type&#10;K: match key only&#10;T: match type only">KT</button>
          <input class="filter-input filter-input-kv" id="schemaFilterInput" placeholder="filter schema…" />
          <button class="filter-clear" id="schemaFilterClear" title="Clear filter">&#x2715;</button>
        </div>
      </div>
    `,
    'data.header.right': `
      <div class="filter-bar" id="dataFilterBar">
        <button class="filter-re-btn" id="dataFilterRe" title="Toggle regexp mode">.*</button>
        <div class="filter-wrap">
          <button class="filter-kv-btn" id="dataFilterKV" title="KV: match key or value&#10;K: match key only&#10;V: match value only">KV</button>
          <input class="filter-input filter-input-kv" id="dataFilterInput" placeholder="filter data…" />
          <button class="filter-clear" id="dataFilterClear" title="Clear filter">&#x2715;</button>
        </div>
      </div>
    `,
  },
  functions: {
    applyFilter(nodes, matcher, isSchema, shared, matchTarget) {
      if (!matcher) {
        nodes.forEach(function(n) {
          n.el.classList.remove('dimmed');
          var wrapper = n.el.parentElement;
          if (wrapper && wrapper.classList.contains('node')) wrapper.style.display = '';
        });
        return;
      }
      var mt = matchTarget || 'kv';
      function getRowText(row) {
        var key   = row.querySelector('.key');
        var value = row.querySelector('.value');
        var type  = row.querySelector('[class*="t-"]');
        var parts = [];
        if (isSchema) {
          if (mt !== 't' && key)  parts.push(key.textContent);
          if (mt !== 'k' && type) parts.push(type.textContent);
        } else {
          if (mt !== 'v' && key)   parts.push(key.textContent);
          if (mt !== 'k' && value) parts.push(value.textContent);
        }
        return parts.join(' ');
      }
      var matched = new Set();
      nodes.forEach(function(n, path) {
        if (matcher.test(getRowText(n.el))) matched.add(path);
      });
      var ancestors = new Set();
      nodes.forEach(function(n, path) {
        if (!n.isContainer) return;
        for (var mp of matched) {
          if (shared.isAncestorPath(path, mp)) { ancestors.add(path); break; }
        }
      });
      ancestors.forEach(function(path) {
        var n = nodes.get(path);
        if (n) shared.setFolded(n, false);
      });
      nodes.forEach(function(n, path) {
        var isMatch    = matched.has(path);
        var isAncestor = ancestors.has(path);
        var visible    = isMatch || isAncestor;
        shared.setDimmed(n, isAncestor && !isMatch);
        var wrapper = n.el.parentElement;
        if (wrapper && wrapper.classList.contains('node')) wrapper.style.display = visible ? '' : 'none';
      });
    },
  },
  init(schemaDom, dataDom, shared) {
    this._shared   = shared;
    this._schemaRe = false;
    this._schemaKT = 'kt';   // 'kt' | 'k' | 't'
    this._dataRe   = false;
    this._dataKV   = 'kv';   // 'kv' | 'k' | 'v'
    var self = this;

    function buildMatcher(pattern, useRe) {
      if (!pattern) return null;
      if (useRe) {
        try { return new RegExp(pattern, 'i'); }
        catch(_) { return null; }
      }
      var lower = pattern.toLowerCase();
      return { test: function(s) { return s.toLowerCase().indexOf(lower) !== -1; } };
    }
    function isValidRe(pattern) {
      try { new RegExp(pattern); return true; } catch(_) { return false; }
    }

    // ── schema filter ──────────────────────────────────
    var schemaInput = document.getElementById('schemaFilterInput');
    var schemaClear = document.getElementById('schemaFilterClear');
    var schemaReBtn = document.getElementById('schemaFilterRe');
    var schemaKTBtn = document.getElementById('schemaFilterKT');

    var KT_CYCLE = { kt: 'k', k: 't', t: 'kt' };
    var KT_TITLE = {
      kt: 'KT: match key or type\nK: match key only\nT: match type only',
      k:  'K: match key only\nKT: match key or type\nT: match type only',
      t:  'T: match type only\nKT: match key or type\nK: match key only',
    };

    function runSchemaFilter() {
      shared.setAllExpanded(shared.schemaNodes, true);
      var pat     = schemaInput.value;
      var useRe   = self._schemaRe;
      var invalid = useRe && pat && !isValidRe(pat);
      schemaInput.classList.toggle('filter-invalid', invalid);
      schemaClear.classList.toggle('visible', pat.length > 0);
      shared.applyFilter(shared.schemaNodes, buildMatcher(pat, useRe), true, shared, self._schemaKT);
    }
    this._schemaInput   = function() { runSchemaFilter(); };
    this._schemaEnter   = function(e) { if (e.key === 'Enter') runSchemaFilter(); };
    this._schemaClear   = function() { schemaInput.value = ''; runSchemaFilter(); };
    this._schemaReClick = function() {
      self._schemaRe = !self._schemaRe;
      schemaReBtn.classList.toggle('active', self._schemaRe);
      runSchemaFilter();
    };
    this._schemaKTClick = function() {
      self._schemaKT = KT_CYCLE[self._schemaKT];
      schemaKTBtn.textContent = self._schemaKT.toUpperCase();
      schemaKTBtn.title = KT_TITLE[self._schemaKT];
      schemaKTBtn.classList.toggle('active', self._schemaKT !== 'kt');
      runSchemaFilter();
    };
    schemaInput.addEventListener('input',   this._schemaInput);
    schemaInput.addEventListener('keydown', this._schemaEnter);
    schemaClear.addEventListener('click', this._schemaClear);
    schemaReBtn.addEventListener('click', this._schemaReClick);
    schemaKTBtn.addEventListener('click', this._schemaKTClick);

    // ── data filter ────────────────────────────────────
    var dataInput  = document.getElementById('dataFilterInput');
    var dataClear  = document.getElementById('dataFilterClear');
    var dataReBtn  = document.getElementById('dataFilterRe');
    var dataKVBtn  = document.getElementById('dataFilterKV');

    var KV_CYCLE = { kv: 'k', k: 'v', v: 'kv' };
    var KV_TITLE = {
      kv: 'KV: match key or value\nK: match key only\nV: match value only',
      k:  'K: match key only\nKV: match key or value\nV: match value only',
      v:  'V: match value only\nKV: match key or value\nK: match key only',
    };

    function runDataFilter() {
      shared.setAllExpanded(shared.dataNodes, true);
      var pat     = dataInput.value;
      var useRe   = self._dataRe;
      var invalid = useRe && pat && !isValidRe(pat);
      dataInput.classList.toggle('filter-invalid', invalid);
      dataClear.classList.toggle('visible', pat.length > 0);
      shared.applyFilter(shared.dataNodes, buildMatcher(pat, useRe), false, shared, self._dataKV);
    }
    this._dataInput   = function() { runDataFilter(); };
    this._dataEnter   = function(e) { if (e.key === 'Enter') runDataFilter(); };
    this._dataClear   = function() { dataInput.value = ''; runDataFilter(); };
    this._dataReClick = function() {
      self._dataRe = !self._dataRe;
      dataReBtn.classList.toggle('active', self._dataRe);
      runDataFilter();
    };
    this._dataKVClick = function() {
      self._dataKV = KV_CYCLE[self._dataKV];
      dataKVBtn.textContent = self._dataKV.toUpperCase();
      dataKVBtn.title = KV_TITLE[self._dataKV];
      dataKVBtn.classList.toggle('active', self._dataKV !== 'kv');
      runDataFilter();
    };
    dataInput.addEventListener('input',   this._dataInput);
    dataInput.addEventListener('keydown', this._dataEnter);
    dataClear.addEventListener('click', this._dataClear);
    dataReBtn.addEventListener('click', this._dataReClick);
    dataKVBtn.addEventListener('click', this._dataKVClick);

    // ── postLoad: reset both inputs on new JSON load ───
    this._postLoadFn = function() {
      schemaInput.value = '';
      dataInput.value   = '';
      schemaInput.classList.remove('filter-invalid');
      dataInput.classList.remove('filter-invalid');
      schemaClear.classList.remove('visible');
      dataClear.classList.remove('visible');
      self._schemaKT = 'kt';
      schemaKTBtn.textContent = 'KT';
      schemaKTBtn.classList.remove('active');
      self._dataKV = 'kv';
      dataKVBtn.textContent = 'KV';
      dataKVBtn.classList.remove('active');
      shared.applyFilter(shared.schemaNodes, null, true,  shared);
      shared.applyFilter(shared.dataNodes,   null, false, shared);
    };
    shared.postLoad.push(this._postLoadFn);
  },

  destroy() {
    if (this._shared) {
      this._shared.applyFilter(this._shared.schemaNodes, null, true,  this._shared);
      this._shared.applyFilter(this._shared.dataNodes,   null, false, this._shared);
      var arr = this._shared.postLoad;
      var idx = arr.indexOf(this._postLoadFn);
      if (idx !== -1) arr.splice(idx, 1);
    }
    [
      { id: 'schemaFilterInput', event: 'input',   handler: this._schemaInput },
      { id: 'schemaFilterInput', event: 'keydown', handler: this._schemaEnter },
      { id: 'schemaFilterClear', event: 'click',   handler: this._schemaClear },
      { id: 'schemaFilterRe',    event: 'click', handler: this._schemaReClick },
      { id: 'schemaFilterKT',    event: 'click', handler: this._schemaKTClick },
      { id: 'dataFilterInput',   event: 'input',   handler: this._dataInput },
      { id: 'dataFilterInput',   event: 'keydown', handler: this._dataEnter },
      { id: 'dataFilterClear',   event: 'click',   handler: this._dataClear },
      { id: 'dataFilterRe',      event: 'click', handler: this._dataReClick },
      { id: 'dataFilterKV',      event: 'click', handler: this._dataKVClick }
    ].forEach(({ id, event, handler }) => {
      document.getElementById(id)?.removeEventListener(event, handler);
    });

    delete this._shared;
    delete this._postLoadFn;
  },
})
