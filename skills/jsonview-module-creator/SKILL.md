---
name: jsonview-module-creator
description: >
  Create modules for the jsonview JSON Viewer application. Use this skill whenever the user wants
  to create, design, or iterate on a jsonview module — a JavaScript object that extends the
  dual-panel (Schema + Data) JSON tree viewer with buttons, styles, click handlers, and shared
  functions. Trigger on mentions of "jsonview module", "json viewer module", "tree viewer plugin",
  or any request to add interactive features (filtering, highlighting, searching, exporting,
  statistics, diffing, etc.) to the jsonview panels. Also trigger when the user asks to modify
  or debug an existing jsonview module.
---

# jsonview Module Creator Skill

Create JavaScript module objects for the jsonview JSON Viewer application.

## What is a jsonview module?

A self-contained JS object literal `({...})` that plugs into the viewer's module system.
Modules can inject buttons into header slots, add CSS, register shared functions, and
respond to click events on the tree.

## Before writing any code

1. **Read the built-in modules for reference patterns**: the source of truth for
   how modules are structured lives in the jsonview repo. Start with the simple
   examples (`src/modules/blank-template.js`, `src/modules/schema-folding.js`,
   `src/modules/show-levels.js`) and the more advanced ones
   (`src/modules/highlight.js`, `src/modules/regex-filter.js`) for patterns like
   cross-panel mirroring, click handlers on both panels, and live input filtering.
   The user-facing guide at `docs/modules.md` also summarizes the module API.

2. **Understand the user's intent** before writing code:
   - What panels does the action affect? (schema, data, or both)
   - Where should buttons go? (toolbar for global actions, panel headers for panel-scoped actions)
   - Does it need click interaction on tree nodes?
   - Does it need cross-panel mirroring (schema ↔ data)?
   - Should state reset when the user loads new JSON? (almost always yes — register a `postLoad` callback)

3. **Check feasibility against the `shared` API.** If the request needs any
   capability not on `shared` — e.g. mutating/saving the JSON, triggering a
   reload, reading the raw parsed JSON object, writing files, or persisting
   state across page reloads — **stop before writing code** and tell the user
   which part is not possible. Then ask how they want to proceed, offering
   concrete options such as:
   - A scoped-down version that works within module limits (e.g. *highlight*
     or *mark* matching nodes instead of *editing* them)
   - A read-only / visual-only variant of the feature
   - A workflow that uses the existing **Edit** modal so the user applies
     changes manually
   - Dropping that part of the request

   Only proceed to the design conversation once the user confirms a feasible
   direction.

## Design conversation

When the user describes a module idea, first present **design choices** with pros/cons
before writing code. Typical choices include:

- **Button placement**: toolbar vs panel header left/right
- **Interaction mode**: click vs Ctrl/Cmd+click vs live text input
- **Match/filter target**: key only, value only, type only, or combinations
- **Visual feedback**: CSS classes, dimming, hiding, outlines, background colors (see `highlight.js` for outline patterns, `regex-filter.js` for dimming + hide patterns)
- **Scope**: per-panel or cross-panel (schema ↔ data mirroring — see `highlight.js`)

List concrete options with short pros/cons so the user can decide. Then implement
their choices.

## Output format

**Always output the module as a fenced JS code block** that the user can copy and
paste into the jsonview Modules popup (click "Add", then paste into the editor).

The output must be a **single JS object literal** wrapped in parentheses:

```js
({
  name: 'Module Name',
  description: 'What it does',
  functions: { ... },
  styles: `...`,
  buttons: { ... },
  init(schemaDom, dataDom, shared) { ... },
  destroy() { ... }
})
```

All properties except `name` are optional but best practice is to include all.

### Mandatory rules for the output

1. The code must be a valid JS expression — `({...})` — not a statement.
2. Every DOM element created in `buttons` with an `id` must be cleaned up: event
   listeners added in `init` must be removed in `destroy`.
3. If the module registers a `postLoad` callback, `destroy` must remove it from
   `shared.postLoad`.
4. `functions` are merged onto `moduleShared` and `this` inside them refers to
   `moduleShared` — so access `this.schemaNodes`, `this.dataNodes`,
   `this.dataPathToSchemaPath(path)`, `this.isAncestorPath(p, c)`, etc.
   **Nested `function()` callbacks lose this binding** — any callback inside a
   function that calls `this.*` must use `.bind(this)` or capture `this` in a
   variable (e.g. `var self = this`). Arrow functions (`=>`) preserve `this`
   and are the simplest fix.
5. In `init`, `this` refers to the module's `def` object — store references
   (e.g. `this._handler`, `this._shared`) for cleanup in `destroy`.
6. Use CSS custom properties from the viewer (see below) — never hardcode
   colors outside of new module-specific variables declared in `:root`.
7. Button HTML goes into slot strings. Wrap related buttons in a container
   `<div>` if needed; the module system already wraps each slot entry in a
   `.btn-group--tight` div.
8. Buttons are rendered in whatever state your HTML specifies. The viewer does
   not auto-disable or auto-enable module buttons — if a button should be
   disabled until JSON is loaded, manage that yourself (e.g. in `init` and via
   a `postLoad` callback).
9. Use `shared.setAllExpanded(nodes, bool)` to expand all nodes before applying
   filters. Use `shared.activeLevels` (read/write) to get or clear level state.
10. **`shared` is the only viewer API a module can call.** Its properties are
    listed exhaustively in the Module API Reference below. The viewer exposes
    nothing on `window` and no other globals. The `schemaDom` / `dataDom`
    handles passed to `init` are plain DOM elements with no custom methods.
    If a capability you want is not on `shared`, it does not exist — do not
    invent one. Stop and tell the user the task is not possible rather than
    calling an imaginary function.

## Iteration

When the user asks for changes:
- Re-output the **complete** module object (not a diff), so it remains copy-pasteable.
- Briefly note what changed.

---

# Module API Reference

## Lifecycle

| Event | What happens |
|---|---|
| Register | `functions` merged onto `moduleShared` (bound to it) |
| Enable | styles injected, buttons injected into slots, `init()` called |
| Disable | `destroy()` called, buttons removed, styles removed |
| Remove | disable + `functions` removed from `moduleShared` |
| Apply (hot reload) | disable → swap def + re-register functions → re-enable |

**Important**: `functions` persist on `moduleShared` even when the module is disabled.
They are only removed on full removal.

## `shared` object (moduleShared)

Available in `init` as the third argument and in `functions` as `this`:

| Property / Method | Type | Description |
|---|---|---|
| `schemaNodes` | `Map<path, Node>` | All schema tree nodes |
| `dataNodes` | `Map<path, Node>` | All data tree nodes |
| `activeLevels` | `Set<number> \| null` (read/write) | Current level filter; set to `null` to clear |
| `setAllExpanded(nodes, expanded)` | `function` | Expand or collapse all nodes; clears `activeLevels`, removes `.dimmed` from all rows, and restores `display` on all node wrappers (un-hides filtered-out nodes) |
| `setFolded(node, folded)` | `function` | Fold or unfold a single container node (toggles `.hidden` on `childrenEl` and `.folded` on the toggle arrow) |
| `setDimmed(node, dimmed)` | `function` | Dim or undim a single node row (toggles `.dimmed` on the row element) |
| `dataPathToSchemaPath(path)` | `function` | `$[0].name` → `$[].name` |
| `isAncestorPath(parent, child)` | `function` | True if parent is a path ancestor of child |
| `postLoad` | `Array<function>` | Push callbacks here; they are invoked each time the user loads new JSON (before the tree re-renders). This is the only way a module can react to JSON loads. |
| *(module functions)* | varies | Any `functions` registered by any *currently loaded* module |

This table is **exhaustive** — these are the only properties `shared` has,
aside from functions registered by other enabled modules. If what you need
is not here, it does not exist.

## Node map entry shape

```js
{
  el:          HTMLElement,  // the .node-row div
  childrenEl:  HTMLElement | null,  // the .children div (null for leaves)
  path:        string,       // e.g. "$", "$.foo", "$[].bar", "$[0].bar"
  depth:       number,       // 0-based nesting depth
  isContainer: boolean       // true for object/array nodes
}
```

## DOM structure of a node row (.node-row)

Schema rows:
```
<div class="node-row" data-schema-path="$.foo" data-container="0|1" style="--depth:N">
  <span class="toggle [folded] [leaf]">▼</span>
  <span class="key">foo</span>
  <span class="colon">:</span>
  <span class="type-tag t-string">string</span>
</div>
```

Data rows:
```
<div class="node-row" data-path="$[0].foo" data-schema-path="$[].foo" data-container="0|1" style="--depth:N">
  <span class="toggle [folded] [leaf]">▼</span>
  <span class="key">foo</span>
  <span class="colon">:</span>
  <!-- leaf: -->
  <span class="value v-string">"hello"</span>
  <!-- OR container: -->
  <span class="bracket">{</span><span class="count">3 keys</span>
</div>
```

## Button slots

| Slot name | Location |
|---|---|
| `toolbar` | Main header toolbar (right side, next to Load/Edit/Fold/Expand) |
| `schema.header.left` | Schema panel header, left zone |
| `schema.header.right` | Schema panel header, right zone |
| `data.header.left` | Data panel header, left zone |
| `data.header.right` | Data panel header, right zone |

Button HTML is wrapped automatically in `<div class="btn-group--tight">`
(with an id of `mod-slot-<moduleId>-<slot-with-dashes>`). The viewer does not
auto-disable or enable module buttons — they render in whatever state your
HTML specifies.

## CSS custom properties

### Colors
```
--bg, --surface, --surface2, --border
--text, --text-dim
--accent, --accent-dim, --accent-hover, --accent-border
--type-string (#7dd3fc), --type-number (#c4b5fd), --type-bool (#fca5a5)
--type-null (#6b6d7b), --type-obj (#6ee7b7), --type-arr (#fdba74)
```

### Typography & layout
```
--radius: 6px
--mono: 'IBM Plex Mono', monospace
--sans: 'DM Sans', sans-serif
```

### Existing utility classes
```
.dimmed          opacity: 0.3 — use shared.setDimmed(node, bool) instead of toggling directly
.hidden          display: none !important — use shared.setFolded(node, bool) instead of toggling directly
.folded          rotate(-90deg) on .toggle spans — managed by shared.setFolded(node, bool)
```

## Common patterns

### Register a postLoad cleanup callback
```js
init(schemaDom, dataDom, shared) {
  this._postLoadFn = () => { /* reset state */ };
  shared.postLoad.push(this._postLoadFn);
},
destroy() {
  var arr = this._shared?.postLoad;
  if (arr) { var i = arr.indexOf(this._postLoadFn); if (i !== -1) arr.splice(i, 1); }
}
```

### Click handler on tree nodes
```js
init(schemaDom, dataDom, shared) {
  this._click = (e) => {
    const row = e.target.closest('.node-row');
    if (!row) return;
    const isContainer = row.dataset.container === '1';
    // Leaf click or Ctrl/Cmd+click on container:
    if (e.ctrlKey || e.metaKey || !isContainer) {
      e.stopPropagation();
      // do something with row.dataset.path, row.dataset.schemaPath
    }
  };
  dataDom.addEventListener('click', this._click);
},
destroy() {
  this._dataDom?.removeEventListener('click', this._click);
}
```

### Expand ancestors of matched nodes
```js
// In functions (this = moduleShared):
expandToMatches(nodes, matchedPaths) {
  var ancestors = new Set();
  nodes.forEach((n, path) => {
    if (!n.childrenEl) return;
    for (var mp of matchedPaths) {
      if (this.isAncestorPath(path, mp)) { ancestors.add(path); break; }
    }
  });
  nodes.forEach((n, path) => {
    if (!n.childrenEl) return;
    this.setFolded(n, !ancestors.has(path));
  });
}
```

### Hide/show/dim nodes based on a match
```js
nodes.forEach((n, path) => {
  var isMatch    = matchedPaths.has(path);
  var isAncestor = ancestorPaths.has(path);
  var visible    = isMatch || isAncestor;
  shared.setDimmed(n, isAncestor && !isMatch);
  var wrapper = n.el.parentElement;
  if (wrapper?.classList.contains('node')) wrapper.style.display = visible ? '' : 'none';
});
```