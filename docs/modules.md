# Modules

Click **Modules** in the toolbar to open the module manager. Modules are plain JavaScript objects that can inject buttons, styles, and logic into the viewer at runtime.

## Built-in module

| Module | Description |
|---|---|
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

  // Buttons injected into panel header slots
  // Slots: schema.header.left, schema.header.right, data.header.left, data.header.right
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
