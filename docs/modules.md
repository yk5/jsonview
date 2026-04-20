---
---
# Modules

Click **Modules** in the toolbar to open the module manager. Modules are plain JavaScript objects that can inject buttons, styles, and logic into the viewer at runtime.

## Built-in modules

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
    'data.header.right': `<button id="myBtn">Do thing</button>`
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

### Schema Folding module

Schema Folding adds an *Apply Folding ▶* button to the Schema panel header. Clicking it copies the Schema panel's expand/fold state into the Data panel.

<details markdown="1">
<summary>Module code (click to expand then copy/paste as a new module in the Modules popup):</summary>

```js
{% include schema-folding.js %}
```

</details>

---

### Show Levels module

Show Levels adds a *levels* input to the toolbar. Enter depth levels (e.g. `0-2,4`) and press Enter or click **levels** to show only nodes at those depths; ancestor nodes are dimmed.

<details markdown="1">
<summary>Module code (click to expand then copy/paste as a new module in the Modules popup):</summary>

```js
{% include show-levels.js %}
```

</details>

---

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

<details markdown="1">
<summary>Module code (click to expand then copy/paste as a new module in the Modules popup):</summary>

```js
{% include highlight.js %}
```

</details>

---

### Regex Filter module

Regex Filter module adds a live text-filter input to each panel header.

* Type in the schema input to filter schema rows. A **KT / K / T** button cycles the match target: key-or-type (default), key only, or type badge only (e.g. `array`, `string`).
* Type in the data input to filter data rows. A **KV / K / V** button cycles the match target: key-or-value (default), key only, or value only.
* Non-matching rows are hidden; **ancestor rows** of a match stay visible but are **dimmed** so the tree structure remains readable.
* Matching containers are shown undimmed even if their children don't all match.
* A small **`.*`** toggle button switches between plain-text and regexp matching per panel. Invalid regexps fall back to plain-text (input border turns red as a hint).
* An **`×`** clear button appears at the right of the input when it is non-empty.
* Fold/expand state is preserved — the filter hides nodes without collapsing them.
* Both inputs are cleared automatically on every new `loadJson` call.

<details markdown="1">
<summary>Module code (click to expand then copy/paste as a new module in the Modules popup):</summary>

```js
{% include regex-filter.js %}
```

</details>
