({
  name: 'Show Levels',
  description: 'Filter both panels to show only nodes at specified depth levels (e.g. 0-2,4)',
  functions: {
    parseLevels(input) {
      var levels = new Set();
      input.split(',').forEach(function(part) {
        var trimmed = part.trim();
        if (!trimmed) return;
        var range = trimmed.split('-').map(function(s) { return parseInt(s.trim(), 10); });
        if (range.length === 1 && !isNaN(range[0])) {
          levels.add(range[0]);
        } else if (range.length === 2 && !isNaN(range[0]) && !isNaN(range[1])) {
          for (var i = range[0]; i <= range[1]; i++) levels.add(i);
        }
      });
      return levels;
    },
    applyLevels(nodes, levels) {
      this.activeLevels = levels;
      var activePaths = new Set();
      nodes.forEach(function(n, path) { if (levels.has(n.depth)) activePaths.add(path); });
      var ancestorPaths = new Set();
      nodes.forEach(function(n, path) {
        if (!n.childrenEl) return;
        for (var ap of activePaths) {
          if (this.isAncestorPath(path, ap)) { ancestorPaths.add(path); break; }
        }
      }.bind(this));
      nodes.forEach(function(n, path) {
        var isActive   = activePaths.has(path);
        var isAncestor = ancestorPaths.has(path);
        this.setDimmed(n, isAncestor && !isActive);
        if (n.childrenEl) this.setFolded(n, !isAncestor);
        var wrapper = n.el.parentElement;
        if (wrapper?.classList.contains('node')) wrapper.style.display = (isActive || isAncestor) ? '' : 'none';
      }.bind(this));
    },
  },
  styles: `
    .level-group {
      display: flex;
      align-items: stretch;
    }
    .level-input {
      font-family: var(--mono);
      font-size: 12px;
      width: 100px;
      padding: 6px 10px;
      border: 1px solid var(--border);
      border-right: none;
      border-radius: var(--radius) 0 0 var(--radius);
      background: var(--surface2);
      color: var(--text);
      outline: none;
      transition: border-color 0.15s;
    }
    .level-input:focus { border-color: var(--accent-border); }
    .level-input::placeholder { color: var(--text-dim); }
    .btn-levels {
      border-radius: 0 var(--radius) var(--radius) 0;
      border-left: none;
    }
    .level-group:focus-within .level-input,
    .level-group:focus-within .btn-levels { border-color: var(--accent-border); }
  `,
  buttons: {
    'toolbar': `
      <div class="level-group">
        <input class="level-input" id="levelInput" placeholder="e.g. 0-2,4">
        <button id="btnLevels" class="btn-levels">levels</button>
      </div>
    `
  },
  init(schemaDom, dataDom, shared) {
    this._shared = shared;
    this._input  = document.getElementById('levelInput');
    this._btn    = document.getElementById('btnLevels');
    this._click  = () => {
      var levels = shared.parseLevels(this._input.value);
      if (levels.size === 0) return;
      shared.applyLevels(shared.schemaNodes, levels);
      shared.applyLevels(shared.dataNodes,   levels);
    };
    this._keydown = (e) => { if (e.key === 'Enter') this._btn.click(); };
    this._btn.addEventListener('click',   this._click);
    this._input.addEventListener('keydown', this._keydown);
    this._postLoadFn = () => { this._input.value = ''; };
    shared.postLoad.push(this._postLoadFn);
  },
  destroy() {
    this._btn?.removeEventListener('click',   this._click);
    this._input?.removeEventListener('keydown', this._keydown);
    var arr = this._shared?.postLoad;
    if (arr) { var i = arr.indexOf(this._postLoadFn); if (i !== -1) arr.splice(i, 1); }
    delete this._shared; delete this._input; delete this._btn;
  },
})
