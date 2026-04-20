# JSON Viewer

A single-file, zero-dependency JSON viewer that runs in the browser. It renders any JSON file as an interactive tree with a side-by-side schema inference panel.

The live version can be seen in [https://yk5.github.io/jsonview/viewer.html](https://yk5.github.io/jsonview/viewer.html).

The GitHub project is [yk5/jsonview](https://github.com/yk5/jsonview)  
GitHub page is [https://yk5.github.io/jsonview/](https://yk5.github.io/jsonview/)

## Features

- **Dual-panel view** — Schema panel (inferred structure) alongside a Data panel (actual values)
- **Interactive tree** — Click any object or array node to collapse/expand it
- **Fold / Expand All** — Collapse or expand every node at once
- **Level filtering** — Show only specific depth levels using range syntax (e.g. `0-2,4`)
- **File loading** — Load a `.json` file from disk via the Load button
- **Built-in editor** — Edit or paste raw JSON directly in the browser with:
  - Line numbers
  - Format (pretty-print) button
  - Inline parse error display
  - `Tab` key indentation support
  - `Ctrl`/`Cmd` + `Enter` to apply
- **Module system** — Extend the viewer with custom JavaScript modules (see [Modules](https://yk5.github.io/jsonview/modules.html))
- **Resizable panels** — Drag the divider between Schema and Data panels
- **Dark theme** — Dark UI with syntax-colored type tags (string, number, boolean, null, object, array)

## Usage

### Online

The live version is at [https://yk5.github.io/jsonview/viewer.html](https://yk5.github.io/jsonview/viewer.html).

### Local development

```bash
npm install
npm run build       # produces src/viewer.html
npm run dev         # rebuild on every save (watch mode)
npm run typecheck   # TypeScript type checking
npm test            # run unit tests
```

Open `src/viewer.html` in a browser after building.

### Using the viewer

1. Click **Load** to open a `.json` file, or click **Edit** to paste JSON manually.
2. Browse the **Schema** panel to see the inferred structure of the data.
3. Browse the **Data** panel to explore actual values.
4. Use **Fold All** / **Expand All** to control tree visibility.
5. Type a level range (e.g. `0-2,4`) in the levels input and press Enter or click **levels** to filter by depth.

## Type colors

| Type    | Color  |
|---------|--------|
| string  | blue   |
| number  | purple |
| boolean | red    |
| null    | gray   |
| object  | green  |
| array   | orange |
