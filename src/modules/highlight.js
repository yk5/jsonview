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
      <button class="btn-clear-hl"  id="btnSchemaClearHl"    title="Clear schema highlights">&#x2715;</button>
      <span   class="hl-label hl-label-schema">Highlights</span>
      <button class="btn-hl-icon"   id="btnSchemaHlToSchema" title="Expand highlighted in Schema panel">&#x25BC;</button>
      <button class="btn-hl-icon"   id="btnSchemaHlToData"   title="Expand highlighted in Data panel">&#x25B6;</button>
    `,
    'data.header.left': `
      <button class="btn-hl-icon-data" id="btnDataHlToSchema" title="Expand highlighted in Schema panel">&#x25C4;</button>
      <button class="btn-hl-icon-data" id="btnDataHlToData"   title="Expand highlighted in Data panel">&#x25BC;</button>
      <span   class="hl-label hl-label-data">Highlights</span>
      <button class="btn-clear-hl"     id="btnDataClearHl"    title="Clear data highlights">&#x2715;</button>
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
        this.setFolded(n, !ancestorPaths.has(n.path));
      }.bind(this));
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
