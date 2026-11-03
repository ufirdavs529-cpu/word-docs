/* =================================================================
   Microsoft Word Web Clone — Full Application Logic
   Supports: Node.js REST API / Python SQLite / PHP+MySQL backends
   Falls back to localStorage when offline.
================================================================= */
'use strict';

// ────────────────────────────────────────────────────────────────
// APPLICATION STATE
// ────────────────────────────────────────────────────────────────
const state = {
  docId: 'doc-default',
  title: 'Hujjat2',
  content: '',
  dirty: false,
  autosave: true,
  readOnly: false,
  zoom: 100,
  theme: 'dark',
  viewMode: 'print',
  pageColor: '#ffffff',
  watermark: '',
  fontColor: '#ff0000',
  highlightColor: '#ffff00',
  speechSynth: window.speechSynthesis,
  utterance: null,
  speaking: false,

  // Page settings
  margins: 'normal',
  orientation: 'portrait',
  pageSize: 'a4',

  // Stored data for undo history (browser native handles undo/redo)
  savedAt: null,
};

// ────────────────────────────────────────────────────────────────
// DOM SHORTCUTS
// ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const editor = $('docEditor');
const a4Page = $('a4Page');
const titleInput = $('docTitleInput');
const autosaveCheck = $('autosaveCheck');
const autosaveStatus = $('autosaveStatus');
const sbSaveStatus = $('sbSaveStatus');
const sbWords = $('sbWords');
const sbChars = $('sbChars');
const sbPage = $('sbPage');
const zoomSlider = $('zoomSlider');
const zoomLabel = $('zoomLabel');

// ────────────────────────────────────────────────────────────────
// BOOT
// ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildRuler();
  buildTableGrid();
  buildSymbolGrid();
  buildColorPalettes();
  initRibbonTabs();
  initNavSidebarTabs();
  initKeyboardShortcuts();
  initContextMenu();
  initFontControls();
  initStylesGallery();
  initBackstage();
  initImageInsert();
  loadDocument(state.docId);
  updateHeaderDate();

  // Editor events
  editor.addEventListener('input', onEditorChange);
  editor.addEventListener('keyup', updateStats);
  editor.addEventListener('mouseup', updateStats);
  editor.addEventListener('selectionchange', () => updateActiveFormatBtns());

  // Autosave loop
  setInterval(() => {
    if (state.dirty && state.autosave) saveDocument(false);
  }, 3000);

  // Nav search live
  $('navSearchInput').addEventListener('input', e => {
    const q = e.target.value.trim();
    if (q) doNavSearch(q);
    else clearNavSearch();
  });
});

// ────────────────────────────────────────────────────────────────
// BACKEND API — with localStorage fallback
// ────────────────────────────────────────────────────────────────
async function loadDocument(id) {
  setSaveStatus('Yuklanmoqda...', '#f59e0b');
  try {
    const r = await fetch(`/api/documents/${id}`);
    if (!r.ok) throw new Error(r.statusText);
    const data = await r.json();
    if (data.success && data.document) {
      applyDocData(data.document);
      setSaveStatus('Saqlandi ✓', '#5cb85c');
      return;
    }
    throw new Error('bad response');
  } catch {
    // Fallback to localStorage
    const local = localStorage.getItem(`word_doc_${id}`);
    if (local) {
      applyDocData(JSON.parse(local));
      setSaveStatus('Lokal ✓', '#60a5fa');
    } else {
      // First launch — set default content
      editor.innerHTML = getDefaultContent();
      setSaveStatus('Yangi hujjat', '#aaa');
    }
  }
  updateStats();
  updateHeadingsTree();
}

function applyDocData(doc) {
  state.docId = doc.id || state.docId;
  state.title = doc.title || 'Hujjat2';
  titleInput.value = state.title;
  editor.innerHTML = doc.content || getDefaultContent();

  if (doc.settings) {
    const s = doc.settings;
    if (s.pageColor) setPageColor(s.pageColor, false);
    if (s.watermark) setWatermarkText(s.watermark, false);
    if (s.orientation) applyOrientation(s.orientation, false);
    if (s.margins) applyMargins(s.margins, false);
    if (s.pageSize) applyPageSize(s.pageSize, false);
  }

  state.dirty = false;
  updateStats();
  updateHeadingsTree();
}

async function saveDocument(showToast = true) {
  state.content = editor.innerHTML;
  state.title = titleInput.value.trim() || 'Hujjat2';

  const payload = {
    id: state.docId,
    title: state.title,
    content: state.content,
    wordCount: countWords(),
    settings: {
      pageColor: state.pageColor,
      watermark: state.watermark,
      orientation: state.orientation,
      margins: state.margins,
      pageSize: state.pageSize,
    }
  };

  setSaveStatus('Saqlanmoqda...', '#f59e0b');

  try {
    const r = await fetch(`/api/documents/${state.docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error();
    state.dirty = false;
    state.savedAt = new Date();
    localStorage.setItem(`word_doc_${state.docId}`, JSON.stringify(payload));
    setSaveStatus('Saqlandi ✓', '#5cb85c');
    if (showToast) showToastMsg('Hujjat serverga saqlandi!', 'success');
  } catch {
    // Fallback to localStorage
    localStorage.setItem(`word_doc_${state.docId}`, JSON.stringify(payload));
    state.dirty = false;
    setSaveStatus('Lokal ✓', '#60a5fa');
    if (showToast) showToastMsg('Lokal saqlandi (server offline)', 'success');
  }
}

async function createDocument(title, content, settings) {
  const payload = { title, content: content || '<p><br></p>', settings: settings || {} };
  try {
    const r = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    if (data.success && data.document) return data.document;
    throw new Error();
  } catch {
    const id = 'doc-' + Date.now();
    const doc = { id, ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    localStorage.setItem(`word_doc_${id}`, JSON.stringify(doc));
    return doc;
  }
}

async function loadDocumentsList() {
  try {
    const r = await fetch('/api/documents');
    const data = await r.json();
    if (data.success) return data.documents;
    throw new Error();
  } catch {
    // Gather from localStorage
    const docs = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('word_doc_')) {
        try { docs.push(JSON.parse(localStorage.getItem(key))); } catch {}
      }
    }
    return docs.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }
}

async function deleteDocument(id) {
  try {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
  } catch {}
  localStorage.removeItem(`word_doc_${id}`);
}

// ────────────────────────────────────────────────────────────────
// EDITOR EVENTS
// ────────────────────────────────────────────────────────────────
function onEditorChange() {
  state.dirty = true;
  setSaveStatus('O\'zgartirildi...', '#f59e0b');
  updateStats();
  updateHeadingsTree();
  // Debounced thumbnail update
  clearTimeout(onEditorChange._t);
  onEditorChange._t = setTimeout(updatePageThumbnail, 1500);
}

function setSaveStatus(text, color) {
  autosaveStatus.textContent = text;
  autosaveStatus.style.color = color || '#5cb85c';
  sbSaveStatus.textContent = text;
  sbSaveStatus.style.color = color || '#fff';
}

// ────────────────────────────────────────────────────────────────
// EXECCOMMAND WRAPPERS
// ────────────────────────────────────────────────────────────────
function execCmd(cmd, value) {
  editor.focus();
  document.execCommand(cmd, false, value || null);
  onEditorChange();
  updateActiveFormatBtns();
}

async function doPaste() {
  editor.focus();
  try {
    const text = await navigator.clipboard.readText();
    document.execCommand('insertText', false, text);
  } catch {
    showToastMsg('Ctrl+V dan foydalaning', 'error');
  }
}

function updateActiveFormatBtns() {
  const cmds = ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript',
                'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
                'insertUnorderedList', 'insertOrderedList'];
  cmds.forEach(cmd => {
    const el = document.getElementById('btn' + cmd.charAt(0).toUpperCase() + cmd.slice(1));
    if (el) el.classList.toggle('pressed', document.queryCommandState(cmd));
  });
}

// ────────────────────────────────────────────────────────────────
// FONT CONTROLS
// ────────────────────────────────────────────────────────────────
function initFontControls() {
  $('fontFamily').addEventListener('change', e => execCmd('fontName', e.target.value));
  $('fontSize').addEventListener('change', e => execCmd('fontSize', e.target.value));
}

function changeFontSize(delta) {
  const sel = $('fontSize');
  const newIdx = Math.max(0, Math.min(sel.options.length - 1, sel.selectedIndex + delta));
  sel.selectedIndex = newIdx;
  execCmd('fontSize', sel.options[newIdx].value);
}

// ────────────────────────────────────────────────────────────────
// STYLES GALLERY
// ────────────────────────────────────────────────────────────────
function initStylesGallery() {
  document.querySelectorAll('.style-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.style-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      execCmd('formatBlock', '<' + card.dataset.block + '>');
    });
  });
}

// ────────────────────────────────────────────────────────────────
// COLOR PALETTES
// ────────────────────────────────────────────────────────────────
const OFFICE_COLORS = [
  '#ffffff','#000000','#e7e6e6','#44546a','#4472c4','#ed7d31','#a9d18e','#ff0000',
  '#ffd966','#92d050','#00b0f0','#7030a0','#c9211e','#f4b942','#4e9a06','#1565c0',
  '#ff6600','#cc3399','#66ff00','#0099cc','#cc00ff','#ff9900','#009933','#990000',
  '#003366','#336600','#660066','#ff6699','#99ff00','#00ccff','#cc99ff','#ff9966',
];

function buildColorPalettes() {
  buildPaletteInEl('hlPalette', applyHighlight, state.highlightColor);
  buildPaletteInEl('fcPalette', applyFontColor, state.fontColor);

  $('btnHighlight').addEventListener('click', e => {
    e.stopPropagation();
    togglePalette('hlPalette', e.target);
  });
  $('btnFontColor').addEventListener('click', e => {
    e.stopPropagation();
    togglePalette('fcPalette', e.target);
  });
  $('btnShading').addEventListener('click', e => {
    e.stopPropagation();
    // Simple: apply same as highlight but to block
    const color = prompt('Фон блока (цвет, например #ffffcc):', '#ffffcc');
    if (color) {
      const sel = window.getSelection();
      if (sel.rangeCount) {
        const range = sel.getRangeAt(0);
        let node = range.startContainer;
        if (node.nodeType === 3) node = node.parentNode;
        const block = node.closest('p,div,h1,h2,h3,li') || node;
        if (block) block.style.backgroundColor = color;
        onEditorChange();
      }
    }
  });
  document.addEventListener('click', closePalettes);
}

function buildPaletteInEl(id, applyFn, initColor) {
  const el = $(id);
  const title = document.createElement('div');
  title.className = 'cpop-title';
  title.textContent = 'Тема';
  el.appendChild(title);
  const grid = document.createElement('div');
  grid.className = 'cpop-grid';
  OFFICE_COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'cpop-swatch';
    sw.style.background = c;
    sw.title = c;
    sw.addEventListener('click', e => { e.stopPropagation(); applyFn(c); closePalettes(); });
    grid.appendChild(sw);
  });
  el.appendChild(grid);
  const customRow = document.createElement('div');
  customRow.className = 'cpop-custom-row';
  customRow.innerHTML = '+ Другие цвета...';
  customRow.addEventListener('click', e => {
    e.stopPropagation();
    const inp = document.createElement('input');
    inp.type = 'color';
    inp.value = initColor;
    inp.addEventListener('input', ee => applyFn(ee.target.value));
    inp.click();
    closePalettes();
  });
  el.appendChild(customRow);
}

function togglePalette(id, trigger) {
  const el = $(id);
  closePalettes();
  if (!el.classList.contains('open')) {
    const rect = trigger.getBoundingClientRect();
    el.style.top = (rect.bottom + 4) + 'px';
    el.style.left = rect.left + 'px';
    el.classList.add('open');
  }
}

function closePalettes() {
  document.querySelectorAll('.color-palette-pop').forEach(p => p.classList.remove('open'));
}

function applyHighlight(color) {
  state.highlightColor = color;
  $('highlightBar').style.background = color;
  execCmd('hiliteColor', color);
}

function applyFontColor(color) {
  state.fontColor = color;
  $('fontColorBar').style.background = color;
  execCmd('foreColor', color);
}

// ────────────────────────────────────────────────────────────────
// RIBBON TABS
// ────────────────────────────────────────────────────────────────
function initRibbonTabs() {
  document.querySelectorAll('.rtab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.ribbon-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = $('panel-' + tab.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });

  // Collapse ribbon
  $('btnCollapseRibbon').addEventListener('click', () => {
    const rb = $('ribbonBody');
    const hidden = rb.style.display === 'none';
    rb.style.display = hidden ? 'flex' : 'none';
    $('btnCollapseRibbon').textContent = hidden ? '⌃' : '⌄';
  });
}

// ────────────────────────────────────────────────────────────────
// RULER
// ────────────────────────────────────────────────────────────────
function buildRuler() {
  const rc = $('rulerContent');
  if (!rc) return;
  // Margin shades
  const lm = document.createElement('div');
  lm.className = 'ruler-margin-shade';
  lm.style.cssText = 'left:0;width:96px';
  const rm = document.createElement('div');
  rm.className = 'ruler-margin-shade';
  rm.style.cssText = 'right:0;width:96px';
  rc.appendChild(lm);
  rc.appendChild(rm);
  // Ticks & numbers (21cm = 794px, 1cm = 37.81px)
  for (let mm = 0; mm <= 210; mm += 5) {
    const px = mm * (794 / 210);
    const tick = document.createElement('div');
    tick.className = 'rtick ' + (mm % 10 === 0 ? 'maj' : 'min');
    tick.style.left = px + 'px';
    rc.appendChild(tick);
    if (mm % 10 === 0 && mm > 0 && mm < 210) {
      const num = document.createElement('div');
      num.className = 'rnum';
      num.style.left = px + 'px';
      num.textContent = mm / 10;
      rc.appendChild(num);
    }
  }
}

// ────────────────────────────────────────────────────────────────
// TABLE GRID PICKER
// ────────────────────────────────────────────────────────────────
function buildTableGrid() {
  const pop = $('tableGridPop');
  const cellsDiv = document.createElement('div');
  cellsDiv.className = 'tg-cells';
  const dimDiv = document.createElement('div');
  dimDiv.className = 'tg-dim';
  dimDiv.textContent = '1×1';
  const customBtn = document.createElement('button');
  customBtn.className = 'tg-custom-btn';
  customBtn.textContent = '⚙ Вставить таблицу...';
  customBtn.onclick = () => { pop.classList.remove('visible'); openModal('modalInsertTable'); };

  let hoverR = 1, hoverC = 1;
  for (let r = 1; r <= 8; r++) {
    for (let c = 1; c <= 10; c++) {
      const cell = document.createElement('div');
      cell.className = 'tg-cell';
      cell.addEventListener('mouseover', () => {
        hoverR = r; hoverC = c;
        updateGridHL(cellsDiv, r, c);
        dimDiv.textContent = c + '×' + r + ' Jadval';
      });
      cell.addEventListener('click', () => {
        insertTable(r, c);
        pop.classList.remove('visible');
      });
      cellsDiv.appendChild(cell);
    }
  }
  pop.appendChild(cellsDiv);
  pop.appendChild(dimDiv);
  pop.appendChild(customBtn);

  // Toggle on caret click
  $('tableCaret').addEventListener('click', e => {
    e.stopPropagation();
    const rect = $('tableBtn').getBoundingClientRect();
    pop.style.top = rect.bottom + 'px';
    pop.style.left = rect.left + 'px';
    pop.classList.toggle('visible');
  });
  $('tableMainBtn').addEventListener('click', e => {
    e.stopPropagation();
    const rect = $('tableBtn').getBoundingClientRect();
    pop.style.top = rect.bottom + 'px';
    pop.style.left = rect.left + 'px';
    pop.classList.toggle('visible');
  });

  document.addEventListener('click', () => pop.classList.remove('visible'));
}

function updateGridHL(parent, maxR, maxC) {
  const cells = parent.querySelectorAll('.tg-cell');
  let idx = 0;
  for (let r = 1; r <= 8; r++) {
    for (let c = 1; c <= 10; c++) {
      cells[idx].classList.toggle('hl', r <= maxR && c <= maxC);
      idx++;
    }
  }
}

function insertTable(rows, cols) {
  let html = '<table style="width:100%;border-collapse:collapse;margin:10pt 0"><thead><tr>';
  for (let c = 0; c < cols; c++) {
    html += `<th style="border:1px solid #bbb;padding:6px 10px;background:#f2f2f2;font-weight:600;text-align:left">Колонка ${c + 1}</th>`;
  }
  html += '</tr></thead><tbody>';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      html += `<td style="border:1px solid #bbb;padding:6px 10px">Ячейка</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table><p><br></p>';
  insertHtmlAtCursor(html);
  showToastMsg(`${cols}×${rows} jadval kiritildi`);
}

function insertTableFromModal() {
  const rows = parseInt($('tblRows').value) || 3;
  const cols = parseInt($('tblCols').value) || 4;
  closeModal('modalInsertTable');
  insertTable(rows, cols);
}

// ────────────────────────────────────────────────────────────────
// SYMBOLS
// ────────────────────────────────────────────────────────────────
const SYMBOLS = ['Ω','π','∑','√','∞','α','β','γ','δ','θ','λ','μ','σ','φ','ψ','ω',
                 '©','®','™','€','£','¥','¢','°','±','×','÷','≠','≤','≥','≈','∈',
                 '♥','★','✓','✗','→','←','↑','↓','⇒','⇐','∀','∃','∅','∇','∂','∫'];

function buildSymbolGrid() {
  const grid = $('symbolGrid');
  SYMBOLS.forEach(sym => {
    const btn = document.createElement('button');
    btn.className = 'sym-btn';
    btn.textContent = sym;
    btn.title = sym;
    btn.addEventListener('click', () => {
      insertHtmlAtCursor(sym);
      closeModal('modalSymbols');
    });
    grid.appendChild(btn);
  });
}

// ────────────────────────────────────────────────────────────────
// INSERT HELPERS
// ────────────────────────────────────────────────────────────────
function insertHtmlAtCursor(html) {
  editor.focus();
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const frag = range.createContextualFragment(html);
    const lastNode = frag.lastChild;
    range.insertNode(frag);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } else {
    editor.innerHTML += html;
  }
  onEditorChange();
}

function insertBlankPage() {
  insertPageBreak();
}

function insertPageBreak() {
  insertHtmlAtCursor('<div class="page-break-marker">── Разрыв страницы ──</div><p><br></p>');
  showToastMsg('Разрыв страницы добавлен');
}

function insertHyperlink() {
  const text = $('linkText').value.trim();
  const url = $('linkUrl').value.trim();
  if (!url) return;
  const display = text || url;
  insertHtmlAtCursor(`<a href="${url}" target="_blank">${display}</a>`);
  closeModal('modalHyperlink');
}

function insertDateTime() {
  const d = new Date();
  const fmt = d.toLocaleString('uz-UZ', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
  insertHtmlAtCursor(`<b>${fmt}</b>`);
}

function insertTextBox() {
  insertHtmlAtCursor(`<div style="border:1px solid #2b579a;background:#f0f6ff;padding:14px;margin:12pt 0;border-radius:3px"><p style="margin:0;font-weight:600;color:#2b579a">📌 Текстовое поле</p><p style="margin:4px 0 0">Введите текст здесь...</p></div><p><br></p>`);
}

function insertOnlineImg() {
  const url = prompt('Введите URL изображения:', 'https://via.placeholder.com/400x200');
  if (url) insertHtmlAtCursor(`<img src="${url}" style="max-width:100%;height:auto;margin:8pt 0" alt="Изображение"><p><br></p>`);
}

function insertPageNumber() {
  insertHtmlAtCursor(`<p style="text-align:center"><span class="page-num">1</span></p>`);
}

function insertFootnote() {
  const num = editor.querySelectorAll('.footnote-ref').length + 1;
  insertHtmlAtCursor(`<sup class="footnote-ref" style="color:#2b579a;font-weight:700;cursor:pointer">[${num}]</sup>`);
  // Add to footer area
  let area = editor.querySelector('.footnotes-area');
  if (!area) {
    area = document.createElement('div');
    area.className = 'footnotes-area';
    area.style.cssText = 'border-top:1px solid #ccc;margin-top:30pt;padding-top:8pt;font-size:9pt;color:#555';
    editor.appendChild(area);
  }
  const note = document.createElement('p');
  note.innerHTML = `<sup>[${num}]</sup> Текст сноски...`;
  area.appendChild(note);
  showToastMsg(`Сноска [${num}] добавлена`);
  onEditorChange();
}

function generateTOC() {
  const heads = editor.querySelectorAll('h1,h2,h3');
  if (!heads.length) { showToastMsg('Нет заголовков для оглавления!', 'error'); return; }
  let html = `<div style="background:#f0f6ff;border:1px solid #2b579a;padding:18px;margin:14pt 0;border-radius:3px"><h2 style="color:#2b579a;margin-top:0;border-bottom:1px solid #2b579a;padding-bottom:6px">Оглавление</h2><ul style="list-style:none;padding:0">`;
  heads.forEach((h, i) => {
    h.id = 'toc-h-' + i;
    const indent = h.tagName === 'H1' ? '0' : h.tagName === 'H2' ? '16px' : '32px';
    const weight = h.tagName === 'H1' ? '700' : '400';
    html += `<li style="margin-left:${indent};margin-bottom:5px;font-weight:${weight}"><a href="#toc-h-${i}" style="color:#2b579a;text-decoration:none;border-bottom:1px dotted #aaa">${h.textContent}</a></li>`;
  });
  html += '</ul></div><p><br></p>';
  insertHtmlAtCursor(html);
  showToastMsg('Оглавление создано!');
}

function editHeaderFooter(which) {
  const text = prompt(which === 'header' ? 'Текст верхнего колонтитула:' : 'Текст нижнего колонтитула:', '');
  if (text !== null) {
    if (which === 'header') $('headerTitle').textContent = text;
    else $('footerPageNum').textContent = text;
    onEditorChange();
  }
}

// ────────────────────────────────────────────────────────────────
// IMAGE INSERT
// ────────────────────────────────────────────────────────────────
function initImageInsert() {
  const fileInput = $('imgFileInput');
  $('btnInsertImg').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      // Try uploading to backend
      try {
        const r = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, dataUrl: reader.result })
        });
        const data = await r.json();
        if (data.success && data.url) {
          insertHtmlAtCursor(`<img src="${data.url}" style="max-width:100%;height:auto;margin:8pt 0" alt="${file.name}"><p><br></p>`);
          showToastMsg('Рисунок загружен на сервер!');
          return;
        }
      } catch {}
      // Fallback: embed base64
      insertHtmlAtCursor(`<img src="${reader.result}" style="max-width:100%;height:auto;margin:8pt 0" alt="${file.name}"><p><br></p>`);
      showToastMsg('Рисунок вставлен');
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });

  // Load local file (Open backstage)
  $('localFileInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.innerHTML = reader.result;
      titleInput.value = file.name.replace(/\.[^.]+$/, '');
      state.title = titleInput.value;
      closeBackstage();
      showToastMsg('Файл открыт: ' + file.name);
      onEditorChange();
    };
    reader.readAsText(file);
    $('localFileInput').value = '';
  });
}

// ────────────────────────────────────────────────────────────────
// PAGE SETTINGS
// ────────────────────────────────────────────────────────────────
function setPageColor(color, dirty = true) {
  state.pageColor = color;
  a4Page.style.backgroundColor = color;
  if (dirty) onEditorChange();
}

function applyMargins(val, dirty = true) {
  state.margins = val;
  const map = { normal: '96px', narrow: '48px', moderate: '72px', wide: '140px' };
  const p = map[val] || '96px';
  a4Page.style.padding = p;
  if (dirty) onEditorChange();
}

function applyOrientation(val, dirty = true) {
  state.orientation = val;
  if (val === 'landscape') {
    a4Page.style.width = '1123px';
    a4Page.style.minHeight = '794px';
  } else {
    a4Page.style.width = '794px';
    a4Page.style.minHeight = '1123px';
  }
  if (dirty) onEditorChange();
}

function applyPageSize(val, dirty = true) {
  state.pageSize = val;
  const sizes = { a4: [794, 1123], letter: [816, 1056], a5: [559, 794], legal: [816, 1344] };
  const [w, h] = sizes[val] || sizes.a4;
  a4Page.style.width = w + 'px';
  a4Page.style.minHeight = h + 'px';
  if (dirty) onEditorChange();
}

function togglePilcrow() {
  document.querySelectorAll('.doc-editor br').forEach(br => {
    br.style.display = br.style.display === 'inline-block' ? '' : 'inline-block';
  });
}

function setLineSpacing(val) {
  editor.style.lineHeight = val;
  onEditorChange();
}

// ────────────────────────────────────────────────────────────────
// WATERMARK
// ────────────────────────────────────────────────────────────────
function setWatermarkText(text, dirty = true) {
  state.watermark = text;
  $('pageWatermark').textContent = text;
  if (dirty) onEditorChange();
}

function applyWatermark() {
  const preset = $('watermarkPreset').value;
  const custom = $('watermarkCustom').value.trim();
  setWatermarkText(custom || preset);
  closeModal('modalWatermark');
  showToastMsg(state.watermark ? 'Подложка: ' + state.watermark : 'Подложка убрана');
}

function clearWatermark() {
  setWatermarkText('');
  closeModal('modalWatermark');
  showToastMsg('Подложка убрана');
}

// ────────────────────────────────────────────────────────────────
// ZOOM & VIEW MODE
// ────────────────────────────────────────────────────────────────
function setZoom(val) {
  val = Math.max(50, Math.min(200, Math.round(val / 5) * 5));
  state.zoom = val;
  zoomSlider.value = val;
  zoomLabel.textContent = val + '%';
  a4Page.style.transform = `scale(${val / 100})`;
}

function setViewMode(mode) {
  state.viewMode = mode;
  document.querySelectorAll('#viewPrintLayout,#viewWeb,#viewFocus').forEach(b => b.classList.remove('active'));
  if (mode === 'web') {
    a4Page.style.width = '96%';
    a4Page.style.minHeight = 'auto';
    a4Page.style.boxShadow = 'none';
    $('viewWeb').classList.add('active');
  } else if (mode === 'focus') {
    const els = ['.titlebar', '.ribbon-tabs-row', '#ribbonBody', '.ruler-row', '.nav-sidebar', '.statusbar'];
    els.forEach(s => { const el = document.querySelector(s); if (el) el.style.display = 'none'; });
    $('viewFocus').classList.add('active');
    const hint = document.createElement('div');
    hint.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:6px 14px;border-radius:16px;font-size:11px;z-index:9999';
    hint.textContent = 'ESC — выйти из режима фокуса';
    document.body.appendChild(hint);
    const esc = e => { if (e.key === 'Escape') { els.forEach(s => { const el = document.querySelector(s); if (el) el.style.display = ''; }); hint.remove(); setViewMode('print'); document.removeEventListener('keydown', esc); }};
    document.addEventListener('keydown', esc);
  } else {
    applyOrientation(state.orientation, false);
    applyPageSize(state.pageSize, false);
    a4Page.style.boxShadow = '';
    $('viewPrintLayout').classList.add('active');
  }
}

function toggleRuler(show) {
  $('rulerRow').style.display = show ? 'flex' : 'none';
  $('rulerSpacerLeft').classList.toggle('visible', show);
}

function toggleNavPanel(show) {
  const nb = $('navSidebar');
  const spacer = $('rulerSpacerLeft');
  if (show) {
    nb.classList.remove('hidden');
    spacer.classList.add('visible');
  } else {
    nb.classList.add('hidden');
    spacer.classList.remove('visible');
  }
  $('chkNavigation').checked = show;
}

// ────────────────────────────────────────────────────────────────
// NAVIGATION SIDEBAR
// ────────────────────────────────────────────────────────────────
function initNavSidebarTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.nav-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $('navpane-' + tab.dataset.navtab).classList.add('active');
      if (tab.dataset.navtab === 'pages') updatePageThumbnail();
    });
  });
}

function updateHeadingsTree() {
  const container = $('headingsTree');
  const heads = editor.querySelectorAll('h1,h2,h3');
  if (!heads.length) { container.innerHTML = '<p class="nav-empty-msg">Нет заголовков</p>'; return; }
  container.innerHTML = '';
  heads.forEach((h, i) => {
    const item = document.createElement('div');
    item.className = 'nav-heading ' + h.tagName.toLowerCase();
    item.textContent = h.textContent;
    item.addEventListener('click', () => {
      h.scrollIntoView({ behavior: 'smooth', block: 'center' });
      h.style.outline = '2px solid #6e8abf';
      setTimeout(() => h.style.outline = '', 1500);
    });
    container.appendChild(item);
  });
}

function updatePageThumbnail() {
  const thumb = $('pageThumbnail');
  if (thumb) thumb.innerHTML = editor.innerHTML.substring(0, 600);
}

function doNavSearch(q) {
  const container = $('searchResultsList');
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const matches = [];
  editor.querySelectorAll('p,h1,h2,h3,li,td').forEach(el => {
    if (el.textContent.match(regex)) matches.push(el);
  });
  if (!matches.length) { container.innerHTML = `<p class="nav-empty-msg">Не найдено: "${q}"</p>`; return; }
  container.innerHTML = `<div style="font-size:11px;color:#6e8abf;font-weight:600;margin-bottom:6px">${matches.length} результатов</div>`;
  matches.slice(0, 25).forEach(el => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = el.textContent.replace(regex, '<mark>$&</mark>');
    item.addEventListener('click', () => { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.background = '#fffde7'; setTimeout(() => el.style.background = '', 2000); });
    container.appendChild(item);
  });
  // Highlight in document
  editor.querySelectorAll('.search-highlight').forEach(el => { el.outerHTML = el.innerHTML; });
}

function clearNavSearch() {
  $('searchResultsList').innerHTML = '<p class="nav-empty-msg">Введите текст для поиска</p>';
}

// ────────────────────────────────────────────────────────────────
// FIND & REPLACE
// ────────────────────────────────────────────────────────────────
function findNext() {
  const q = $('findInput').value;
  if (!q) return;
  window.find(q, $('matchCase').checked);
}

function replaceOne() {
  const find = $('findInput').value;
  const replace = $('replaceInput').value;
  if (!find) return;
  if (window.find(find, $('matchCase').checked)) {
    document.execCommand('insertText', false, replace);
    onEditorChange();
    showToastMsg('1 замена выполнена');
  }
}

function replaceAll() {
  const find = $('findInput').value;
  const replace = $('replaceInput').value;
  if (!find) return;
  const flags = 'g' + ($('matchCase').checked ? '' : 'i');
  const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  const count = (editor.innerHTML.match(regex) || []).length;
  editor.innerHTML = editor.innerHTML.replace(regex, replace);
  onEditorChange();
  closeModal('modalFindReplace');
  showToastMsg(`${count} замен выполнено`);
}

// ────────────────────────────────────────────────────────────────
// STATISTICS
// ────────────────────────────────────────────────────────────────
function countWords() {
  const text = editor.innerText.trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function updateStats() {
  const text = editor.innerText || '';
  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const chars = text.length;
  sbWords.textContent = words + ' слов';
  sbChars.textContent = chars + ' симв.';

  // Word count modal props
  const paras = editor.querySelectorAll('p,h1,h2,h3,li').length;
  const lines = Math.ceil(chars / 80) || 0;
  $('statWords').textContent = words;
  $('statCharsNo').textContent = text.replace(/\s/g, '').length;
  $('statCharsWith').textContent = chars;
  $('statParas').textContent = paras;
  $('statLines').textContent = lines;
  $('statPages').textContent = Math.max(1, Math.ceil(chars / 3000));

  // Backstage info
  $('infoPropWords').textContent = words;
  $('infoPropChars').textContent = chars;
  $('infoPropSize').textContent = Math.round(chars * 1.5 / 1024) + ' KB';
  $('infoPropUpdated').textContent = state.savedAt ? state.savedAt.toLocaleString('uz-UZ') : '—';
}

function updateHeaderDate() {
  const d = new Date();
  $('headerDate').textContent = d.toLocaleDateString('uz-UZ', { day:'2-digit', month:'long', year:'numeric' });
}

// ────────────────────────────────────────────────────────────────
// SPELL CHECK (browser native)
// ────────────────────────────────────────────────────────────────
function spellCheck() {
  editor.spellcheck = !editor.spellcheck;
  showToastMsg('Правописание: ' + (editor.spellcheck ? 'включено' : 'выключено'));
}

// ────────────────────────────────────────────────────────────────
// READ ALOUD
// ────────────────────────────────────────────────────────────────
function toggleReadAloud() {
  const synth = state.speechSynth;
  if (!synth) { showToastMsg('Web Speech API недоступен', 'error'); return; }
  if (state.speaking && !synth.paused) {
    synth.pause();
    state.speaking = false;
    $('btnReadAloud').querySelector('span').textContent = 'Пауза';
    return;
  }
  if (synth.paused) {
    synth.resume();
    state.speaking = true;
    $('btnReadAloud').querySelector('span').textContent = 'Вслух';
    return;
  }
  synth.cancel();
  const sel = window.getSelection().toString();
  const text = sel || editor.innerText;
  if (!text.trim()) return;
  const utt = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const v = voices.find(v => v.lang.startsWith('ru') || v.lang.startsWith('en')) || voices[0];
  if (v) utt.voice = v;
  utt.rate = 1; utt.pitch = 1;
  utt.onend = () => { state.speaking = false; $('btnReadAloud').querySelector('span').textContent = 'Вслух'; };
  synth.speak(utt);
  state.speaking = true;
  showToastMsg('🔊 Читаю вслух...');
}

// ────────────────────────────────────────────────────────────────
// READ-ONLY MODE
// ────────────────────────────────────────────────────────────────
function toggleReadOnly() {
  state.readOnly = !state.readOnly;
  editor.contentEditable = !state.readOnly;
  $('readOnlyLabel').textContent = state.readOnly ? 'Снять защиту' : 'Защита';
  showToastMsg(state.readOnly ? 'Документ защищён (только чтение)' : 'Редактирование включено');
}

// ────────────────────────────────────────────────────────────────
// EXPORT
// ────────────────────────────────────────────────────────────────
function exportDoc() {
  const filename = (state.title || 'Hujjat2') + '.doc';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${state.title}</title></head><body>${editor.innerHTML}</body></html>`;
  const blob = new Blob(['\uFEFF', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  // #region agent log
  fetch('http://127.0.0.1:7718/ingest/b8a8cff1-9ba6-4b83-a256-72f6843bac3c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1d474e'},body:JSON.stringify({sessionId:'1d474e',runId:'download',hypothesisId:'A',location:'app.js:exportDoc',message:'Word download triggered',data:{filename,bytes:blob.size,title:state.title},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  showToastMsg('Word (.doc) yuklab olindi: ' + filename);
}

function downloadCurrentDocument() {
  exportDoc();
}

function exportTxt() {
  const blob = new Blob([editor.innerText], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = state.title + '.txt';
  a.click();
  URL.revokeObjectURL(a.href);
  showToastMsg('Текст (.txt) yuklab olindi!');
}

// ────────────────────────────────────────────────────────────────
// BACKSTAGE
// ────────────────────────────────────────────────────────────────
function initBackstage() {
  $('btnFileTab').addEventListener('click', openBackstage);
  $('bsBackBtn').addEventListener('click', closeBackstage);
  $('bsCloseBtn').addEventListener('click', closeBackstage);
  $('bsSaveBtn').addEventListener('click', () => { saveDocument(true); closeBackstage(); });
  $('bsDownloadBtn').addEventListener('click', () => { exportDoc(); closeBackstage(); });
  $('bsPrintBtn').addEventListener('click', () => { closeBackstage(); window.print(); });

  document.querySelectorAll('.bs-nav-item[data-bspane]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.bs-nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.bs-pane').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      $('bspane-' + item.dataset.bspane).classList.add('active');
      if (item.dataset.bspane === 'open') loadBackstageDocList();
    });
  });

  // Templates
  document.querySelectorAll('.tmpl-card[data-tmpl]').forEach(card => {
    card.addEventListener('click', () => applyTemplate(card.dataset.tmpl));
  });

  // Save As
  document.getElementById('bspane-saveas').querySelector('button').onclick = saveAsNewDoc;
}

function openBackstage() {
  $('backstage').classList.add('open');
  updateStats();
  loadBackstageDocList();
}

function closeBackstage() {
  $('backstage').classList.remove('open');
}

async function loadBackstageDocList() {
  const tbody = $('recentDocsBody');
  tbody.innerHTML = '<tr><td colspan="4" style="color:#999;text-align:center">Yuklanmoqda...</td></tr>';
  const docs = await loadDocumentsList();
  if (!docs.length) { tbody.innerHTML = '<tr><td colspan="4" style="color:#999;text-align:center">Hujjatlar yo\'q</td></tr>'; return; }
  tbody.innerHTML = '';
  docs.forEach(doc => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>📄 ${esc(doc.title)}</b></td>
      <td>${doc.updatedAt ? new Date(doc.updatedAt).toLocaleString('uz-UZ') : '—'}</td>
      <td>${doc.wordCount || doc.word_count || 0}</td>
      <td>
        <button onclick="openDocFromList('${doc.id}')" style="background:#2b579a;color:#fff;padding:3px 10px;border-radius:2px;font-size:11px">Ochish</button>
        <button onclick="downloadDocFromList('${doc.id}')" style="background:#107c10;color:#fff;padding:3px 10px;border-radius:2px;font-size:11px;margin-left:4px">Yuklab olish</button>
        <button onclick="delDocFromList('${doc.id}',this)" style="background:#d83b01;color:#fff;padding:3px 8px;border-radius:2px;font-size:11px;margin-left:4px">O'chirish</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

window.openDocFromList = async function(id) {
  await loadDocument(id);
  closeBackstage();
  showToastMsg('Hujjat ochildi!');
};

window.downloadDocFromList = async function(id) {
  await loadDocument(id);
  exportDoc();
  showToastMsg('Hujjat yuklab olindi');
};

window.delDocFromList = async function(id, btn) {
  if (!confirm('O\'chirishni tasdiqlaysizmi?')) return;
  await deleteDocument(id);
  btn.closest('tr').remove();
  showToastMsg('Hujjat o\'chirildi');
};

async function saveAsNewDoc() {
  const title = $('saveAsTitle').value.trim() || 'Yangi hujjat';
  const doc = await createDocument(title, editor.innerHTML, { pageColor: state.pageColor });
  state.docId = doc.id;
  state.title = title;
  titleInput.value = title;
  closeBackstage();
  showToastMsg('Yangi nusxa saqlandi: ' + title);
}

function applyTemplate(type) {
  const templates = {
    blank: { title: 'Yangi hujjat', content: '<p><br></p>' },
    resume: {
      title: 'Rezyume - AliCom',
      content: `<h1 style="text-align:center;color:#2b579a;margin-bottom:4px">ALICOM</h1><p style="text-align:center;color:#555;font-size:13px">Senior Software Engineer | Toshkent, O'zbekiston</p><hr style="border:none;border-top:2px solid #2b579a;margin:14px 0"><h2>Aloqa</h2><p>📧 alicom@example.uz | 📱 +998 90 123 45 67 | 🔗 linkedin.com/in/alicom</p><h2>Kasbiy tajriba</h2><p><b>Senior Developer</b> — Global Tech (2022–hozir)</p><ul><li>Node.js, Python, React bilan katta loyihalar yaratish</li><li>40+ dasturchilar jamoasiga rahbarlik qilish</li></ul><h2>Ta'lim</h2><p><b>Axborot texnologiyalari bakalavri</b> — TATU (2018–2022)</p><h2>Ko'nikmalar</h2><p>JavaScript · Python · Node.js · MySQL · PostgreSQL · Docker · Git · AWS</p>`
    },
    report: {
      title: 'Loyiha Hisoboti 2026',
      content: `<h1 style="text-align:center;color:#2b579a">2026-YIL STRATEGIK RIVOJLANISH HISOBOTI</h1><p style="text-align:center;color:#777;font-style:italic">Tayyorladi: AliCom Tahlil Bo'limi | Sana: Noyabr 2026</p><hr style="margin:18px 0"><h2>1. Kirish va Umumiy Xulosa</h2><p>Ushbu hisobot kompaniyaning 2026-yil strategik rivojlanish yo'nalishlari, moliyaviy ko'rsatkichlari va texnologik yangilanishlarini qamrab oladi.</p><h2>2. Asosiy Ko'rsatkichlar</h2><table style="width:100%;border-collapse:collapse;margin:12px 0"><tr style="background:#2b579a;color:#fff"><th style="padding:8px;border:1px solid #bbb">Ko'rsatkich</th><th style="padding:8px;border:1px solid #bbb">2025</th><th style="padding:8px;border:1px solid #bbb">2026 (Reja)</th><th style="padding:8px;border:1px solid #bbb">O'sish</th></tr><tr><td style="padding:8px;border:1px solid #ccc">Foydalanuvchilar</td><td style="padding:8px;border:1px solid #ccc">50,000</td><td style="padding:8px;border:1px solid #ccc">120,000</td><td style="padding:8px;border:1px solid #ccc;color:green;font-weight:700">+140%</td></tr><tr style="background:#f9f9f9"><td style="padding:8px;border:1px solid #ccc">Daromad</td><td style="padding:8px;border:1px solid #ccc">$500K</td><td style="padding:8px;border:1px solid #ccc">$1.2M</td><td style="padding:8px;border:1px solid #ccc;color:green;font-weight:700">+140%</td></tr></table><h2>3. Xulosalar</h2><p>Kompaniya rivojlanish sur'ati kutilgan natijalardan ikki baravar yuqori.</p>`
    },
    letter: {
      title: 'Rasmiy Xat',
      content: `<p style="text-align:right;color:#555">Toshkent, 03-Noyabr 2026-yil</p><p><b>Kimga:</b> «INNOVATSIYA» MCHJ Bosh Direktoriga,<br><b>Kimdan:</b> «ALICOM TECH» MChJ Bosh Muhandisidan</p><h2 style="text-align:center;color:#2b579a;margin:24px 0 16px">HAMKORLIK TAKLIFI BO'YICHA RASMIY MUROJAAT</h2><p>Hurmatli hamkasblar,</p><p>Sizning kompaniyangiz erishgan yutuqlarni yuksak qadrlaymiz va ushbu xat orqali strategik hamkorlikni taklif qilamiz. Birgalikda yangi avlod texnologiyalarini joriy etish nafaqat bozor ulushimizni oshiradi, balki iqtisodiy samaradorlikni sezilarli yaxshilaydi.</p><p>Loyiha bo'yicha batafsil ma'lumot uchun uchrashuvni tayinlashni taklif qilamiz.</p><br><p>Hurmat va ehtirom bilan,</p><p><b>Ali Vais</b><br>Bosh Muhandis, AliCom Tech<br>📱 +998 90 123 45 67</p>`
    }
  };
  const tmpl = templates[type] || templates.blank;
  state.docId = 'doc-' + Date.now();
  state.title = tmpl.title;
  titleInput.value = tmpl.title;
  editor.innerHTML = tmpl.content;
  closeBackstage();
  onEditorChange();
  showToastMsg('"' + tmpl.title + '" shabloni qo\'llanildi');
}

// ────────────────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ────────────────────────────────────────────────────────────────
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
      e.preventDefault(); $('globalSearchInput').focus();
    }
    if (!(e.ctrlKey || e.metaKey)) return;
    switch (e.key.toLowerCase()) {
      case 's': e.preventDefault(); saveDocument(true); break;
      case 'f': e.preventDefault(); openModal('modalFindReplace'); break;
      case 'h': e.preventDefault(); openModal('modalFindReplace'); break;
      case 'k': e.preventDefault(); openModal('modalHyperlink'); break;
      case 'p': e.preventDefault(); window.print(); break;
      case 'enter': e.preventDefault(); insertPageBreak(); break;
    }
  });

  // AutoSave toggle
  $('autosaveCheck').addEventListener('change', e => {
    state.autosave = e.target.checked;
    showToastMsg('Avtosaqlash: ' + (state.autosave ? 'Yoqildi' : 'O\'chirildi'));
  });

  // Title input save on Enter
  titleInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); editor.focus(); }});
  titleInput.addEventListener('change', () => { state.title = titleInput.value.trim() || 'Hujjat2'; state.dirty = true; });

  // QA buttons
  $('qaUndo').addEventListener('click', () => execCmd('undo'));
  $('qaRedo').addEventListener('click', () => execCmd('redo'));
  $('qaSave').addEventListener('click', () => saveDocument(true));
  $('qaPrint').addEventListener('click', () => window.print());
  $('qaDownload').addEventListener('click', downloadCurrentDocument);
  $('btnDownload').addEventListener('click', downloadCurrentDocument);

  // Theme
  $('btnTheme').addEventListener('click', toggleTheme);

  // Zoom slider
  zoomSlider.addEventListener('input', e => setZoom(parseInt(e.target.value)));
}

function toggleTheme() {
  const isDark = !document.body.classList.contains('light-mode');
  document.body.classList.toggle('light-mode', isDark);
  $('btnTheme').textContent = isDark ? '🌙' : '☀️';
  showToastMsg(isDark ? 'Светлая тема' : 'Тёмная тема');
}

// ────────────────────────────────────────────────────────────────
// CONTEXT MENU
// ────────────────────────────────────────────────────────────────
function initContextMenu() {
  const menu = $('ctxMenu');
  editor.addEventListener('contextmenu', e => {
    e.preventDefault();
    menu.style.left = Math.min(e.pageX, window.innerWidth - 190) + 'px';
    menu.style.top = Math.min(e.pageY, window.innerHeight - 260) + 'px';
    menu.classList.add('open');
  });
  document.addEventListener('click', () => menu.classList.remove('open'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') menu.classList.remove('open'); });
}

// ────────────────────────────────────────────────────────────────
// MODAL HELPERS
// ────────────────────────────────────────────────────────────────
window.openModal = function(id) {
  const el = $(id);
  if (el) { el.classList.add('open'); if (id === 'modalWordCount') updateStats(); }
};
window.closeModal = function(id) {
  const el = $(id);
  if (el) el.classList.remove('open');
};

// Close on backdrop click
document.querySelectorAll('.modal-bg').forEach(bg => {
  bg.addEventListener('click', e => { if (e.target === bg) bg.classList.remove('open'); });
});

// ────────────────────────────────────────────────────────────────
// TOAST
// ────────────────────────────────────────────────────────────────
let toastTimer;
function showToastMsg(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' toast-' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ────────────────────────────────────────────────────────────────
// MISC
// ────────────────────────────────────────────────────────────────
function esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getDefaultContent() {
  return `<h1 style="text-align:center;color:#2b579a;margin-bottom:4px">Microsoft Word — Professional Web Clone</h1>
<p style="text-align:center;color:#666;font-style:italic;margin-bottom:18px">Frontend + Node.js / Python / PHP+MySQL Backend</p>
<hr style="border:none;border-top:2px solid #2b579a;margin-bottom:22px">
<h2>1. Bu nima?</h2>
<p>Ushbu ilova <b>Microsoft Word 365/2021</b> dasturining to'liq veb-klonidir. Ribbon lentasi, navigatsiya paneli, haqiqiy A4 varaq, backend API va avtomatik saqlash tizimi mavjud.</p>
<h2>2. Asosiy imkoniyatlar</h2>
<ul>
  <li><b>Shrift formatlash:</b> Qalin, Qiya, Tagiga chizilgan, Ranglar, o'lchamlar</li>
  <li><b>Jadvallar:</b> Vizual panjara orqali kiritish yoki maxsus dialog</li>
  <li><b>Rasmlar:</b> Kompyuterdan yuklash yoki URL orqali qo'yish</li>
  <li><b>Backend:</b> Node.js (port 3000), Python (port 8000), PHP+MySQL</li>
  <li><b>Eksport:</b> Word (.doc), Matn (.txt), PDF (Chop etish)</li>
</ul>
<h2>3. Namuna jadval</h2>
<table style="width:100%;border-collapse:collapse;margin:12px 0">
  <tr style="background:#2b579a;color:#fff">
    <th style="padding:8px 12px;border:1px solid #aaa">Texnologiya</th>
    <th style="padding:8px 12px;border:1px solid #aaa">Port</th>
    <th style="padding:8px 12px;border:1px solid #aaa">Baza</th>
    <th style="padding:8px 12px;border:1px solid #aaa">Holati</th>
  </tr>
  <tr>
    <td style="padding:8px 12px;border:1px solid #ccc">Node.js</td>
    <td style="padding:8px 12px;border:1px solid #ccc">3000</td>
    <td style="padding:8px 12px;border:1px solid #ccc">JSON fayllar</td>
    <td style="padding:8px 12px;border:1px solid #ccc;color:green;font-weight:700">✓ Aktiv</td>
  </tr>
  <tr style="background:#f9f9f9">
    <td style="padding:8px 12px;border:1px solid #ccc">Python SQLite</td>
    <td style="padding:8px 12px;border:1px solid #ccc">8000</td>
    <td style="padding:8px 12px;border:1px solid #ccc">SQLite (.db)</td>
    <td style="padding:8px 12px;border:1px solid #ccc;color:green;font-weight:700">✓ Aktiv</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;border:1px solid #ccc">PHP + MySQL</td>
    <td style="padding:8px 12px;border:1px solid #ccc">80</td>
    <td style="padding:8px 12px;border:1px solid #ccc">MySQL word_db</td>
    <td style="padding:8px 12px;border:1px solid #ccc;color:green;font-weight:700">✓ Aktiv</td>
  </tr>
</table>
<h2>4. Boshlash</h2>
<p>Barcha matnni o'chirib, o'z hujjatingizni yozishni boshlang. <b>Ctrl+S</b> — saqlash, <b>Ctrl+Z</b> — bekor qilish. Fayl → Yangi — yangi shablon tanlash.</p>`;
}
