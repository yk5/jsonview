({
  name: 'Protobuf Converter',
  description: 'Edit text proto, convert to JSON, and copy it to load into the viewer.',

  functions: {},

  styles: `
    #pb-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #pb-modal {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      width: min(820px, 94vw);
      height: min(600px, 90vh);
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 40px rgba(0,0,0,0.45);
      overflow: hidden;
    }
    #pb-titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 14px;
      border-bottom: 1px solid var(--border);
      background: var(--surface2);
      flex-shrink: 0;
    }
    #pb-titlebar span {
      font-family: var(--sans);
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }
    #pb-close {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-dim);
      font-size: 18px;
      line-height: 1;
      padding: 2px 6px;
      border-radius: var(--radius);
    }
    #pb-close:hover { background: var(--bg); color: var(--text); }
    #pb-body {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .pb-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .pb-pane + .pb-pane {
      border-left: 1px solid var(--border);
    }
    .pb-pane-label {
      font-family: var(--sans);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-dim);
      padding: 6px 12px 5px;
      border-bottom: 1px solid var(--border);
      background: var(--surface2);
      flex-shrink: 0;
    }
    .pb-pane textarea {
      flex: 1;
      resize: none;
      border: none;
      outline: none;
      padding: 12px 14px;
      font-family: var(--mono);
      font-size: 12px;
      background: var(--bg);
      color: var(--text);
      line-height: 1.65;
      tab-size: 2;
      min-height: 0;
    }
    #pb-json-out {
      color: var(--type-obj);
    }
    #pb-json-out.pb-has-error {
      color: var(--type-bool);
    }
    #pb-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 14px;
      border-top: 1px solid var(--border);
      background: var(--surface2);
      flex-shrink: 0;
    }
    #pb-footer-hint {
      flex: 1;
      font-family: var(--sans);
      font-size: 11.5px;
      color: var(--text-dim);
    }
    .pb-btn {
      font-family: var(--sans);
      font-size: 12px;
      font-weight: 600;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      cursor: pointer;
      padding: 5px 14px;
      background: var(--surface);
      color: var(--text);
      transition: background 0.12s;
      white-space: nowrap;
    }
    .pb-btn:hover { background: var(--bg); }
    .pb-btn:disabled { opacity: 0.4; cursor: default; }
    .pb-btn--accent {
      background: var(--accent);
      border-color: var(--accent-border);
      color: #fff;
    }
    .pb-btn--accent:hover { background: var(--accent-hover); }
    .pb-btn--accent:disabled { background: var(--accent-dim); }
    #pb-copy-flash {
      font-family: var(--sans);
      font-size: 11.5px;
      color: var(--type-obj);
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
    }
    #pb-copy-flash.visible { opacity: 1; }
    .pb-editor-wrap {
      flex: 1;
      display: flex;
      overflow: hidden;
      min-height: 0;
    }
    .pb-line-nums {
      padding: 12px 6px 12px 0;
      width: 40px;
      flex-shrink: 0;
      text-align: right;
      font-family: var(--mono);
      font-size: 12px;
      line-height: 1.65;
      color: var(--text-dim);
      background: var(--surface2);
      border-right: 1px solid var(--border);
      overflow: hidden;
      user-select: none;
      white-space: pre;
    }
  `,

  buttons: {
    toolbar: `<button id="pb-open-btn" class="btn" title="Open Protobuf → JSON converter">Protobuf</button>`
  },

  init(schemaDom, dataDom, shared) {
    this._shared = shared;
    this._openBtn = document.getElementById('pb-open-btn');
    this._onOpen = () => this._openModal();
    this._openBtn?.addEventListener('click', this._onOpen);
  },

  destroy() {
    this._openBtn?.removeEventListener('click', this._onOpen);
    this._closeModal();
  },

  _openModal() {
    if (document.getElementById('pb-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'pb-overlay';
    overlay.innerHTML = `
      <div id="pb-modal" role="dialog" aria-modal="true" aria-label="Protobuf converter">
        <div id="pb-titlebar">
          <span>Protobuf → JSON Converter</span>
          <button id="pb-close" title="Close (Esc)">✕</button>
        </div>
        <div id="pb-body">
          <div class="pb-pane">
            <div class="pb-pane-label">Text Proto</div>
            <div class="pb-editor-wrap">
              <div class="pb-line-nums" id="pb-proto-lines">1</div>
              <textarea id="pb-proto-in" spellcheck="false" placeholder="Paste your text proto here…"></textarea>
            </div>
          </div>
          <div class="pb-pane">
            <div class="pb-pane-label">JSON Output</div>
            <div class="pb-editor-wrap">
              <div class="pb-line-nums" id="pb-json-lines">1</div>
              <textarea id="pb-json-out" spellcheck="false" readonly placeholder="Converted JSON will appear here…"></textarea>
            </div>
          </div>
        </div>
        <div id="pb-footer">
          <span id="pb-footer-hint">Edit proto on the left, then click Convert (or Ctrl/⌘+Enter).</span>
          <span id="pb-copy-flash">Copied!</span>
          <button class="pb-btn" id="pb-close-btn">Close</button>
          <button class="pb-btn" id="pb-copy-btn" disabled>Copy JSON</button>
          <button class="pb-btn pb-btn--accent" id="pb-convert-btn">Convert</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this._overlay = overlay;

    const protoIn  = document.getElementById('pb-proto-in');
    const jsonOut  = document.getElementById('pb-json-out');
    const copyBtn  = document.getElementById('pb-copy-btn');
    const flash    = document.getElementById('pb-copy-flash');
    const hint     = document.getElementById('pb-footer-hint');

    const protoLines = document.getElementById('pb-proto-lines');
    const jsonLines  = document.getElementById('pb-json-lines');
    const updateLines = (ta, el) => {
      const n = (ta.value.match(/\n/g)?.length ?? 0) + 1;
      el.textContent = Array.from({length: n}, (_, i) => i + 1).join('\n');
    };

    if (this._savedProto) { protoIn.value = this._savedProto; updateLines(protoIn, protoLines); }
    protoIn.focus();

    protoIn.addEventListener('input',  () => updateLines(protoIn, protoLines));
    protoIn.addEventListener('scroll', () => { protoLines.scrollTop = protoIn.scrollTop; });
    jsonOut.addEventListener('scroll', () => { jsonLines.scrollTop  = jsonOut.scrollTop; });

    const doConvert = () => {
      this._savedProto = protoIn.value;
      jsonOut.classList.remove('pb-has-error');
      try {
        const obj  = this._parseTextProto(protoIn.value);
        const json = JSON.stringify(obj, null, 2);
        jsonOut.value = json;
        updateLines(jsonOut, jsonLines);
        copyBtn.disabled = false;
        hint.textContent = 'Conversion successful. Copy JSON and paste into the viewer.';
      } catch (e) {
        jsonOut.classList.add('pb-has-error');
        jsonOut.value = 'Error: ' + (e.message ?? String(e));
        updateLines(jsonOut, jsonLines);
        copyBtn.disabled = true;
        hint.textContent = 'Fix the error on the left and try again.';
      }
    };

    const doCopy = () => {
      const text = jsonOut.value;
      if (!text || copyBtn.disabled) return;
      navigator.clipboard?.writeText(text).catch(() => {
        jsonOut.select();
        document.execCommand('copy');
      });
      flash.classList.add('visible');
      if (this._flashTimer) clearTimeout(this._flashTimer);
      this._flashTimer = setTimeout(() => flash.classList.remove('visible'), 1800);
    };

    const doClose = () => this._closeModal();

    this._onConvert = doConvert;
    this._onCopy    = doCopy;
    this._onClose   = doClose;
    this._onOverlay = (e) => { if (e.target === overlay) doClose(); };
    this._onKeyDown = (e) => {
      if (e.key === 'Escape') { doClose(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { doConvert(); }
    };

    document.getElementById('pb-convert-btn').addEventListener('click', this._onConvert);
    copyBtn.addEventListener('click', this._onCopy);
    document.getElementById('pb-close-btn').addEventListener('click', this._onClose);
    document.getElementById('pb-close').addEventListener('click', this._onClose);
    overlay.addEventListener('click', this._onOverlay);
    document.addEventListener('keydown', this._onKeyDown);
  },

  _closeModal() {
    const protoIn = document.getElementById('pb-proto-in');
    if (protoIn) this._savedProto = protoIn.value;
    if (this._flashTimer) { clearTimeout(this._flashTimer); this._flashTimer = null; }
    if (this._onKeyDown) { document.removeEventListener('keydown', this._onKeyDown); this._onKeyDown = null; }
    this._overlay?.remove();
    this._overlay = null;
    this._onConvert = this._onCopy = this._onClose = this._onOverlay = null;
  },

  // ── Text Proto parser ─────────────────────────────────────────────────

  _parseTextProto(src) {
    const { tokens, lines } = this._tokenize(src);
    const p = { tokens, lines, pos: 0 };
    const obj = this._parseBody(p, true);
    if (p.pos < p.tokens.length) {
      throw this._err(p, p.pos,
        'Unexpected token: ' + p.tokens.slice(p.pos, p.pos + 3).join(' '));
    }
    return obj;
  },

  _tokenize(src) {
    const DOUBLE_QUOTED_STRING = /"(?:[^"\\]|\\.)*"/;
    const SINGLE_QUOTED_STRING = /'(?:[^'\\]|\\.)*'/;
    const EXTENSION_NAME       = /\[[\w.\s/]+\]/;
    const PUNCTUATION          = /[{}:<>\[\],;]/;
    const WORD                 = /[^\s{}:<>\[\],;"']+/;
    const COMMENT              = /#[^\n]*/g;

    const TOKEN = new RegExp(
      [
        DOUBLE_QUOTED_STRING.source,
        SINGLE_QUOTED_STRING.source,
        EXTENSION_NAME.source,
        PUNCTUATION.source,
        WORD.source,
      ].join('|'),
      'g'
    );

    const stripped = src.replace(COMMENT, '');
    const tokens = [];
    const lines  = [];

    let scanned = 0;
    let line    = 1;
    let m;

    while ((m = TOKEN.exec(stripped)) !== null) {
      const gap = stripped.slice(scanned, m.index);

      // If the lexer skips non-whitespace characters, it means invalid syntax (e.g. unclosed string)
      if (gap.trim().length > 0) {
        const badCharIndex = gap.search(/\S/);
        const beforeBad = gap.slice(0, badCharIndex);
        const nl = beforeBad.match(/\n/g);
        if (nl) line += nl.length;
        throw new Error('[line ' + line + '] Invalid syntax or unclosed string near "' + gap.trim()[0] + '"');
      }

      // Count newlines in the whitespace gap before this token
      const gapNl = gap.match(/\n/g);
      if (gapNl) line += gapNl.length;

      tokens.push(m[0]);
      lines.push(line);

      // Advance line for newlines INSIDE the matched token, so the next token's line is correct
      const tokNl = m[0].match(/\n/g);
      if (tokNl) line += tokNl.length;

      scanned = m.index + m[0].length;
    }

    // Check for trailing invalid characters after the last valid token
    const tail = stripped.slice(scanned);
    if (tail.trim().length > 0) {
       const badCharIndex = tail.search(/\S/);
       const beforeBad = tail.slice(0, badCharIndex);
       const nl = beforeBad.match(/\n/g);
       if (nl) line += nl.length;
       throw new Error('[line ' + line + '] Invalid syntax near "' + tail.trim()[0] + '"');
    }

    return { tokens, lines };
  },

  _lineAt(p, pos) {
    if (pos < p.lines.length) return p.lines[pos];
    return p.lines[p.lines.length - 1] ?? 1;
  },

  _err(p, pos, msg) {
    return new Error('[line ' + this._lineAt(p, pos) + '] ' + msg);
  },

  _parseBody(p, topLevel) {
    const obj = {};
    while (p.pos < p.tokens.length) {
      const t = p.tokens[p.pos];
      if (!topLevel && (t === '}' || t === '>')) break;

      const keyPos = p.pos;
      const raw    = p.tokens[p.pos++];
      let key = raw;

      // Handle extension fields or reject stray punctuation
      if (raw[0] === '[' && raw[raw.length - 1] === ']') {
        key = raw.slice(1, -1).trim();
      } else if (/[{}:<>\[\],;]/.test(raw)) {
        throw this._err(p, keyPos, 'Expected field name but got "' + raw + '"');
      }

      if (p.tokens[p.pos] === ':') p.pos++;

      if (p.pos >= p.tokens.length) {
        throw this._err(p, keyPos, 'Unexpected end of input after field "' + key + '"');
      }

      const val = this._parseValue(p);

      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
        obj[key].push(val);
      } else {
        obj[key] = val;
      }

      if (p.tokens[p.pos] === ',' || p.tokens[p.pos] === ';') p.pos++;
    }
    return obj;
  },

  _parseValue(p) {
    const t = p.tokens[p.pos];
    if (t === '{' || t === '<') {
      p.pos++;
      const close = t === '{' ? '}' : '>';
      const msg = this._parseBody(p, false);
      if (p.tokens[p.pos] !== close) {
        throw this._err(p, p.pos,
          'Expected "' + close + '" but got "' + (p.tokens[p.pos] ?? '<eof>') + '"');
      }
      p.pos++;
      return msg;
    }
    if (t === '[') {
      p.pos++;
      const arr = [];
      while (p.pos < p.tokens.length && p.tokens[p.pos] !== ']') {
        arr.push(this._parseValue(p));
        if (p.tokens[p.pos] === ',') p.pos++;
      }
      if (p.tokens[p.pos] !== ']') {
        throw this._err(p, p.pos, 'Unterminated array');
      }
      p.pos++;
      return arr;
    }
    return this._parseScalar(p);
  },

  _parseScalar(p) {
    const startPos = p.pos;
    const t = p.tokens[p.pos++];
    if (t === undefined) throw this._err(p, startPos, 'Unexpected end of input');

    if (this._isQuoted(t)) {
      let s = this._unescape(t.slice(1, -1));
      while (p.pos < p.tokens.length && this._isQuoted(p.tokens[p.pos])) {
        s += this._unescape(p.tokens[p.pos].slice(1, -1));
        p.pos++;
      }
      return s;
    }

    const lower = t.toLowerCase();
    if (lower === 'true'  || t === 't') return true;
    if (lower === 'false' || t === 'f') return false;
    if (lower === 'null')               return null;
    if (lower === 'inf'   || lower === 'infinity')    return Infinity;
    if (lower === '-inf'  || lower === '-infinity')   return -Infinity;
    if (lower === '+inf'  || lower === '+infinity')   return Infinity;
    if (lower === 'nan')                              return NaN;

    if (/^[-+]?(?:\d|\.\d)/.test(t)) {
      const n = Number(t);
      if (!isNaN(n)) return n;
      const m = t.match(/^([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/);
      if (m) {
        const n2 = Number(m[1]);
        if (!isNaN(n2)) return n2;
      }
    }

    return t;
  },

  _isQuoted(t) {
    if (!t || t.length < 2) return false;
    const a = t[0], b = t[t.length - 1];
    return (a === '"' && b === '"') || (a === "'" && b === "'");
  },

  _unescape(s) {
    return s.replace(/\\(x[0-9a-fA-F]{1,2}|u[0-9a-fA-F]{4}|[0-7]{1,3}|[^])/g, (_, c) => {
      if (c[0] === 'x') return String.fromCharCode(parseInt(c.slice(1), 16));
      if (c[0] === 'u') return String.fromCharCode(parseInt(c.slice(1), 16));
      if (/^[0-7]+$/.test(c)) return String.fromCharCode(parseInt(c, 8));
      switch (c) {
        case 'n':  return '\n';
        case 't':  return '\t';
        case 'r':  return '\r';
        case 'a':  return '\x07';
        case 'b':  return '\b';
        case 'f':  return '\f';
        case 'v':  return '\v';
        case '\\': return '\\';
        case "'":  return "'";
        case '"':  return '"';
        default:   return c;
      }
    });
  }
})
