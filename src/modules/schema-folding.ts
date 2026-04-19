export const SCHEMA_FOLDING_CODE =
`({
  name: 'Schema Folding',
  description: 'Apply Folding copies the Schema panel expand/fold state into the Data panel',
  functions: {
    applySchemaFoldingToData() {
      this.dataNodes.forEach(function(dn, dataPath) {
        if (!dn.childrenEl) return;
        var sn = this.schemaNodes.get(this.dataPathToSchemaPath(dataPath));
        if (!sn?.childrenEl) return;
        var folded = sn.childrenEl.classList.contains('hidden');
        this.setFolded(dn, folded);
      }.bind(this));
    },
  },
  styles: \`
    .btn-apply-schema-folding {
      padding: 3px 9px;
      font-size: 11px;
      letter-spacing: 0.3px;
      text-transform: none;
      border-color: var(--accent-border);
      color: var(--accent);
      background: var(--accent-dim);
    }
    .btn-apply-schema-folding:hover { background: var(--accent-hover); }
  \`,
  buttons: {
    'schema.header.left': \`
      <button class="btn-apply-schema-folding" id="btnApplySchemaFolding"
        title="Copy the Schema panel's expand/fold state into the Data panel">Apply Folding &#x25B6;</button>
    \`
  },
  init(schemaDom, dataDom, shared) {
    this._handler = () => shared.applySchemaFoldingToData();
    document.getElementById('btnApplySchemaFolding')?.addEventListener('click', this._handler);
  },
  destroy() {
    document.getElementById('btnApplySchemaFolding')?.removeEventListener('click', this._handler);
  }
})`;
