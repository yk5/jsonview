# Modules

Click **Modules** in the toolbar to open the module manager. Modules are plain JavaScript objects that can inject buttons, styles, and logic into the viewer at runtime.

## Built-in module

| Module | Description |
|---|---|
| **Show Levels** | Adds a *levels* input to the toolbar. Enter depth levels (e.g. `0-2,4`) and press Enter or click the button to show only nodes at those depths; ancestors are dimmed. |
| **Schema Folding** | Adds an *Apply Folding ▶* button to the Schema panel header. Clicking it copies the Schema panel's expand/fold state into the Data panel. |

## Writing a module

A module is a JS object literal returned from a self-contained expression:

```js
({
  name: 'My Module',
  description: 'What it does',

  // Functions exported to moduleShared — callable by other modules
  functions: {
    myHelper() { /* ... */ }
  },

  // CSS injected while the module is enabled
  styles: `
    .my-button { color: var(--accent); }
  `,

  // Buttons injected into slots
  // Slots: toolbar, schema.header.left, schema.header.right, data.header.left, data.header.right
  buttons: {
    'data.header.right': `<button id="myBtn" disabled>Do thing</button>`
  },

  // Called when the module is enabled; wire up event listeners here
  init(schemaDom, dataDom, shared) {
    this._handler = () => shared.myHelper();
    document.getElementById('myBtn')?.addEventListener('click', this._handler);
  },

  // Called when the module is disabled; clean up listeners here
  destroy() {
    document.getElementById('myBtn')?.removeEventListener('click', this._handler);
  }
})
```

The `shared` object (`moduleShared`) provides:
- `shared.schemaNodes` — `Map<path, node>` for the Schema tree
- `shared.dataNodes` — `Map<path, node>` for the Data tree
- `shared.activeLevels` — `Set<number> | null` — the currently active depth levels (read/write)
- `shared.setAllExpanded(nodes, expanded)` — expand or collapse all nodes in a tree and clears `activeLevels`
- `shared.dataPathToSchemaPath(path)` — converts a data path (e.g. `$[0].name`) to its schema path (`$[].name`)
- `shared.isAncestorPath(parent, child)` — path ancestry check
- `shared.postLoad` — array of callbacks invoked at the start of each `loadJson` call
- Any `functions` exported by other registered modules

## Module lifecycle

| Action | Effect |
|---|---|
| **Add** | Creates a blank module in disabled state; its inline editor opens automatically |
| **Edit / Apply** | Hot-reloads the module code without a page refresh |
| **Enable / Disable** | Toggle via the switch; injected buttons and styles are added/removed accordingly |
| **Remove** | Destroys the module and removes all its contributions |

## Module examples

### Highlight module

Highlight module lets users to highlight by clicking.

* Click any leaf node (or Ctrl/Cmd-click a container) to highlight it.
* Colors: Schema highlights are shown in purple; data highlights in yellow.
* Highlighting a schema node mirrors the highlight onto all matching data nodes (and vice-versa).

Buttons:

* Schema &#x25BC; (apply highlight folding): leave only highlighted nodes in the schema panel and their parents expanded and fold everything else.
* Schema &#x25B6; (apply schema hightlights to data): similarly but leave nodes and their parents in the data panel, based on the highlights of the schema.
* Data &#x25BC; (apply highlight folding): leave only highlighted nodes in the data panel and their parents expanded and fold everything else.
* Data &#x25C4;: (apply data hightlights to schema): similarly but leave nodes and their parents in the schema panel, based on the highlights of the data.
* A clear button (&#x2715;) on each panel removes its highlights.

Highlights are automatically cleared on every new <code>loadJson</code> call.

<details>
<summary>Module code (click to expand then copy/paste as a new module in the Modules popup):</summary>

```js
({
  name: 'Highlight',
  description: 'Highlight schema nodes (purple) and data nodes (yellow), with cross-panel mirroring and expand helpers',
  styles: `
    :root {
      --clear-hl-color: rgba(252,165,165,0.3);
      --clear-hl-dim:   rgba(252,165,165,0.08);
      --clear-hl-hover: rgba(252,165,165,0.18);
      --hl-schema:        #a78bfa;
      --hl-schema-dim:    rgba(167,139,250,0.1);
      --hl-schema-hover:  rgba(167,139,250,0.18);
      --hl-schema-border: rgba(167,139,250,0.35);
      --highlight:        #fbbf24;
      --highlight-dim:    rgba(251,191,36,0.08);
      --highlight-hover:  rgba(251,191,36,0.18);
      --highlight-border: rgba(251,191,36,0.3);
    }
    .btn-clear-hl {
      padding: 3px 7px;
      font-size: 10px;
      letter-spacing: 0.3px;
      text-transform: none;
      border-color: var(--clear-hl-color);
      color: var(--type-bool);
      background: var(--clear-hl-dim);
    }
    .btn-clear-hl:hover { background: var(--clear-hl-hover); }
    .hl-label {
      font-family: var(--mono);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.5px;
      user-select: none;
      padding: 0 2px;
    }
    .btn-hl-icon {
      padding: 3px 7px;
      font-size: 10px;
      letter-spacing: 0.3px;
      text-transform: none;
      border-color: var(--hl-schema-border);
      color: var(--hl-schema);
      background: var(--hl-schema-dim);
    }
    .btn-hl-icon:hover { background: var(--hl-schema-hover); }
    .hl-label-schema { color: var(--hl-schema); }
    .node-row.highlighted-schema {
      background: var(--hl-schema-dim);
      outline: 1px solid var(--hl-schema-border);
      outline-offset: -1px;
    }
    .node-row.highlighted.highlighted-schema {
      background: linear-gradient(to right, var(--hl-schema-dim) 50%, var(--highlight-dim) 50%);
      outline: 1px solid var(--hl-schema-border);
      outline-offset: -1px;
    }
    .btn-hl-icon-data {
      padding: 3px 7px;
      font-size: 10px;
      letter-spacing: 0.3px;
      text-transform: none;
      border-color: var(--highlight-border);
      color: var(--highlight);
      background: var(--highlight-dim);
    }
    .btn-hl-icon-data:hover { background: var(--highlight-hover); }
    .hl-label-data { color: var(--highlight); }
    .node-row.highlighted {
      background: var(--highlight-dim);
      outline: 1px solid var(--highlight-border);
      outline-offset: -1px;
    }
  `,
  buttons: {
    'schema.header.right': `
      <button class="btn-clear-hl"  id="btnSchemaClearHl"    disabled title="Clear schema highlights">&#x2715;</button>
      <span   class="hl-label hl-label-schema">Highlights</span>
      <button class="btn-hl-icon"   id="btnSchemaHlToSchema" disabled title="Expand highlighted in Schema panel">&#x25BC;</button>
      <button class="btn-hl-icon"   id="btnSchemaHlToData"   disabled title="Expand highlighted in Data panel">&#x25B6;</button>
    `,
    'data.header.left': `
      <button class="btn-hl-icon-data" id="btnDataHlToSchema" disabled title="Expand highlighted in Schema panel">&#x25C4;</button>
      <button class="btn-hl-icon-data" id="btnDataHlToData"   disabled title="Expand highlighted in Data panel">&#x25BC;</button>
      <span   class="hl-label hl-label-data">Highlights</span>
      <button class="btn-clear-hl"     id="btnDataClearHl"    disabled title="Clear data highlights">&#x2715;</button>
    `
  },
  functions: {
    schemaHighlights: new Set(),
    dataHighlights:   new Set(),
    expandToHighlights(nodes, targetPaths) {
      if (targetPaths.size === 0) return;
      var ancestorPaths = new Set();
      nodes.forEach(function(n, p) {
        if (!n.childrenEl) return;
        for (var tp of targetPaths) {
          if (this.isAncestorPath(p, tp)) { ancestorPaths.add(p); break; }
        }
      }.bind(this));
      nodes.forEach(function(n) {
        if (!n.childrenEl) return;
        var expand = ancestorPaths.has(n.path);
        n.childrenEl.classList.toggle('hidden', !expand);
        n.el.querySelector('.toggle')?.classList.toggle('folded', !expand);
      });
    },
    clearSchemaHighlights(schemaDom, dataDom) {
      schemaDom = schemaDom || document.getElementById('schemaTree');
      dataDom   = dataDom   || document.getElementById('dataTree');
      this.schemaHighlights.clear();
      schemaDom.querySelectorAll('.highlighted-schema').forEach(function(el) { el.classList.remove('highlighted-schema'); });
      dataDom.querySelectorAll('.highlighted-schema').forEach(function(el) { el.classList.remove('highlighted-schema'); });
    },
    clearDataHighlights(schemaDom, dataDom) {
      schemaDom = schemaDom || document.getElementById('schemaTree');
      dataDom   = dataDom   || document.getElementById('dataTree');
      this.dataHighlights.clear();
      schemaDom.querySelectorAll('.highlighted').forEach(function(el) { el.classList.remove('highlighted'); });
      dataDom.querySelectorAll('.highlighted').forEach(function(el) { el.classList.remove('highlighted'); });
    },
    toggleSchemaHighlight(schemaPath, row, dataDom) {
      dataDom = dataDom || document.getElementById('dataTree');
      var safePath = schemaPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      if (this.schemaHighlights.has(schemaPath)) {
        this.schemaHighlights.delete(schemaPath);
        row.classList.remove('highlighted-schema');
        dataDom.querySelectorAll('[data-schema-path="' + safePath + '"]')
          .forEach(function(el) { el.classList.remove('highlighted-schema'); });
      } else {
        this.schemaHighlights.add(schemaPath);
        row.classList.add('highlighted-schema');
        var first = null;
        dataDom.querySelectorAll('[data-schema-path="' + safePath + '"]').forEach(function(el) {
          el.classList.add('highlighted-schema');
          if (!first) first = el;
        });
        first?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    },
    toggleHighlight(dataPath, schemaPath, row, schemaDom) {
      schemaDom = schemaDom || document.getElementById('schemaTree');
      var safePath = schemaPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      var dpath = this.dataPathToSchemaPath;
      if (this.dataHighlights.has(dataPath)) {
        this.dataHighlights.delete(dataPath);
        row.classList.remove('highlighted');
        var stillLinked = [...this.dataHighlights].some(function(p) { return dpath(p) === schemaPath; });
        if (!stillLinked) schemaDom.querySelector('[data-schema-path="' + safePath + '"]')?.classList.remove('highlighted');
      } else {
        this.dataHighlights.add(dataPath);
        row.classList.add('highlighted');
        var sn = schemaDom.querySelector('[data-schema-path="' + safePath + '"]');
        if (sn) { sn.classList.add('highlighted'); sn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      }
    },
    applySchemaHlToSchema() {
      this.expandToHighlights(this.schemaNodes, this.schemaHighlights);
    },
    applySchemaHlToData() {
      var targets = new Set();
      var dpath = this.dataPathToSchemaPath;
      var hl = this.schemaHighlights;
      this.dataNodes.forEach(function(_, dp) { if (hl.has(dpath(dp))) targets.add(dp); });
      this.expandToHighlights(this.dataNodes, targets);
    },
    applyDataHlToSchema() {
      var targets = new Set([...this.dataHighlights].map(function(p) { return this.dataPathToSchemaPath(p); }.bind(this)));
      this.expandToHighlights(this.schemaNodes, targets);
    },
    applyDataHlToData() {
      this.expandToHighlights(this.dataNodes, this.dataHighlights);
    },
  },
  init(schemaDom, dataDom, shared) {
    this._schemaDom = schemaDom;
    this._dataDom   = dataDom;
    this._shared    = shared;

    this._postLoadFn = function() {
      shared.schemaHighlights.clear();
      shared.dataHighlights.clear();
    };
    shared.postLoad.push(this._postLoadFn);

    this._schemaClick = (e) => {
      const row = e.target.closest('.node-row');
      if (!row || !schemaDom.contains(row) || !row.dataset.schemaPath) return;
      const isContainer = row.dataset.container === '1';
      if (e.ctrlKey || e.metaKey || !isContainer) {
        e.stopPropagation();
        shared.toggleSchemaHighlight(row.dataset.schemaPath, row, dataDom);
      }
    };
    schemaDom.addEventListener('click', this._schemaClick);

    this._dataClick = (e) => {
      const row = e.target.closest('.node-row');
      if (!row || !dataDom.contains(row) || !row.dataset.path) return;
      const isContainer = row.dataset.container === '1';
      if (e.ctrlKey || e.metaKey || !isContainer) {
        e.stopPropagation();
        shared.toggleHighlight(row.dataset.path, row.dataset.schemaPath, row, schemaDom);
      }
    };
    dataDom.addEventListener('click', this._dataClick);

    const bindBtn = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
    bindBtn('btnSchemaClearHl',    () => shared.clearSchemaHighlights(schemaDom, dataDom));
    bindBtn('btnSchemaHlToSchema', () => shared.applySchemaHlToSchema());
    bindBtn('btnSchemaHlToData',   () => shared.applySchemaHlToData());
    bindBtn('btnDataClearHl',      () => shared.clearDataHighlights(schemaDom, dataDom));
    bindBtn('btnDataHlToSchema',   () => shared.applyDataHlToSchema());
    bindBtn('btnDataHlToData',     () => shared.applyDataHlToData());
  },
  destroy() {
    if (this._shared) {
      this._shared.clearSchemaHighlights(this._schemaDom, this._dataDom);
      this._shared.clearDataHighlights(this._schemaDom, this._dataDom);
      var arr = this._shared.postLoad;
      var idx = arr.indexOf(this._postLoadFn);
      if (idx !== -1) arr.splice(idx, 1);
    }
    this._schemaDom?.removeEventListener('click', this._schemaClick);
    this._dataDom?.removeEventListener('click', this._dataClick);
    delete this._schemaDom;
    delete this._dataDom;
    delete this._shared;
    delete this._postLoadFn;
  },
})
```

</details>

---

### Filter module

Filter module adds a live text-filter input to each panel header.

* Type in the schema input to filter schema rows. A **KT / K / T** button cycles the match target: key-or-type (default), key only, or type badge only (e.g. `array`, `string`).
* Type in the data input to filter data rows. A **KV / K / V** button cycles the match target: key-or-value (default), key only, or value only.
* Non-matching rows are hidden; **ancestor rows** of a match stay visible but are **dimmed** so the tree structure remains readable.
* Matching containers are shown undimmed even if their children don't all match.
* A small **`.*`** toggle button switches between plain-text and regexp matching per panel. Invalid regexps fall back to plain-text (input border turns red as a hint).
* An **`×`** clear button appears at the right of the input when it is non-empty.
* Fold/expand state is preserved — the filter hides nodes without collapsing them.
* Both inputs are cleared automatically on every new `loadJson` call.

<details>
<summary>Module code (click to expand then copy/paste as a new module in the Modules popup):</summary>

```js
({
  name: 'Filter',
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
    // matchTarget: 'kv' | 'k' | 'v'  (ignored for schema panel, which always matches key+type)
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
        if (n && n.childrenEl) {
          n.childrenEl.classList.remove('hidden');
          var toggle = n.el.querySelector('.toggle');
          if (toggle) toggle.classList.remove('folded');
        }
      });
      nodes.forEach(function(n, path) {
        var isMatch    = matched.has(path);
        var isAncestor = ancestors.has(path);
        var visible    = isMatch || isAncestor;
        n.el.classList.toggle('dimmed', isAncestor && !isMatch);
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
```

</details>
