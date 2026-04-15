/* =============================================
   ImgConvert Pro — app.js
   ============================================= */

// ── State ──────────────────────────────────────
const state = {
  currentPage: 'dashboard',
  dashFile: null,
  mainFile: null,
  batchFiles: [],
  compressFile: null,
  currentDataURL: null,
  currentFmt: 'png',
  history: JSON.parse(localStorage.getItem('imgConvertHistory') || '[]'),
  totalConverted: parseInt(localStorage.getItem('totalConverted') || '0'),
  darkMode: localStorage.getItem('darkMode') !== 'false',
  autoDownload: localStorage.getItem('autoDownload') !== 'false',
};

// ── DOM Refs ────────────────────────────────────
const $ = id => document.getElementById(id);
const sidebar       = document.querySelector('.sidebar');
const menuBtn       = $('menuBtn');
const sidebarToggle = $('sidebarToggle');
const themeToggle   = $('themeToggle');
const toastContainer = $('toastContainer');

// ── Init ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  renderStats();
  renderRecentList();
  renderHistory();
  bindNav();
  bindDashConvert();
  bindMainConvert();
  bindBatch();
  bindCompress();
  bindSettings();
  bindGlobalDrag();
});

/* ══════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════ */
function bindNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
      if (window.innerWidth <= 700) sidebar.classList.remove('mobile-open');
    });
  });

  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
  });

  themeToggle.addEventListener('click', () => {
    state.darkMode = !state.darkMode;
    localStorage.setItem('darkMode', state.darkMode);
    applyTheme();
  });
}

function navigateTo(page) {
  state.currentPage = page;

  document.querySelectorAll('.nav-item').forEach(i => {
    i.classList.toggle('active', i.dataset.page === page);
  });

  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });

  const labels = {
    dashboard: 'Dashboard',
    convert: 'Convert Image',
    history: 'History',
    batch: 'Batch Convert',
    compress: 'Compress',
    settings: 'Settings',
  };

  $('breadcrumbText').textContent = labels[page] || page;
}

/* ══════════════════════════════════════════════
   THEME
══════════════════════════════════════════════ */
function applyTheme() {
  document.body.classList.toggle('light', !state.darkMode);
  themeToggle.innerHTML = state.darkMode
    ? '<i class="fa-solid fa-moon"></i>'
    : '<i class="fa-solid fa-sun"></i>';

  const toggle = $('darkModeToggle');
  if (toggle) toggle.classList.toggle('active', state.darkMode);
}

/* ══════════════════════════════════════════════
   STATS
══════════════════════════════════════════════ */
function renderStats() {
  animateCount('totalConverted', state.totalConverted);
  animateCount('totalFiles', state.history.length);
}

function animateCount(id, target) {
  const el = $(id);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 40);
}

/* ══════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════ */
function toast(msg, type = 'info', duration = 3000) {
  const icons = { success: 'circle-check', error: 'circle-xmark', info: 'circle-info' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid fa-${icons[type]}"></i><span>${msg}</span>`;
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'none';
    t.style.opacity = '0';
    t.style.transform = 'translateX(40px)';
    t.style.transition = '0.3s ease';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

/* ══════════════════════════════════════════════
   FILE UTILITIES
══════════════════════════════════════════════ */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getImageMeta(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight, url });
    };
    img.src = url;
  });
}

function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ══════════════════════════════════════════════
   CORE CONVERTER
══════════════════════════════════════════════ */
async function convertImage(file, format, quality = 0.9, resizeW = 0, resizeH = 0) {
  const dataURL = await readFileAsDataURL(file);

  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (resizeW || resizeH) {
        if ($('keepRatio') && $('keepRatio').checked) {
          const ratio = w / h;
          if (resizeW && !resizeH) { h = Math.round(resizeW / ratio); w = resizeW; }
          else if (resizeH && !resizeW) { w = Math.round(resizeH * ratio); h = resizeH; }
          else { w = resizeW; h = resizeH; }
        } else {
          w = resizeW || w;
          h = resizeH || h;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      if (format === 'jpeg') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
      }

      ctx.drawImage(img, 0, 0, w, h);

      if (format === 'dataurl') {
        resolve({ dataURL: canvas.toDataURL('image/png'), format: 'dataurl', w, h });
        return;
      }

      const mime = `image/${format}`;
      const result = canvas.toDataURL(mime, quality);
      resolve({ dataURL: result, format, w, h });
    };
    img.src = dataURL;
  });
}

/* ══════════════════════════════════════════════
   DASHBOARD QUICK CONVERT
══════════════════════════════════════════════ */
function bindDashConvert() {
  const dropZone  = $('dashDropZone');
  const fileInput = $('dashFileInput');
  const convertBtn = $('dashConvertBtn');

  setupDropZone(dropZone, fileInput, file => {
    state.dashFile = file;
    convertBtn.disabled = false;
    toast(`Loaded: ${file.name}`, 'info');
  });

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.currentFmt = chip.dataset.fmt;
    });
  });

  convertBtn.addEventListener('click', async () => {
    if (!state.dashFile) return;
    convertBtn.disabled = true;
    convertBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Converting...';

    try {
      const result = await convertImage(state.dashFile, state.currentFmt, 0.9);
      const ext = state.currentFmt === 'jpeg' ? 'jpg' : state.currentFmt === 'dataurl' ? 'txt' : state.currentFmt;
      const name = `converted_${Date.now()}.${ext}`;

      if (state.currentFmt !== 'dataurl') {
        downloadDataURL(result.dataURL, name);
      } else {
        navigator.clipboard.writeText(result.dataURL).catch(() => {});
        toast('Data URL copied to clipboard!', 'success');
      }

      recordHistory(state.dashFile, state.currentFmt, result);
      toast(`Converted to ${state.currentFmt.toUpperCase()} successfully!`, 'success');
      navigateTo('convert');
    } catch (e) {
      toast('Conversion failed. Please try another file.', 'error');
    }

    convertBtn.disabled = false;
    convertBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Convert Now';
  });

  $('clearHistory').addEventListener('click', () => {
    state.history = [];
    localStorage.setItem('imgConvertHistory', JSON.stringify(state.history));
    renderRecentList();
    toast('History cleared', 'info');
  });
}

/* ══════════════════════════════════════════════
   MAIN CONVERT PAGE
══════════════════════════════════════════════ */
function bindMainConvert() {
  const dropZone   = $('mainDropZone');
  const fileInput  = $('mainFileInput');
  const convertBtn = $('mainConvertBtn');
  const removeFile = $('removeFile');

  setupDropZone(dropZone, fileInput, async file => {
    state.mainFile = file;
    convertBtn.disabled = false;

    const meta = await getImageMeta(file);
    $('previewImg').src = meta.url;
    $('fileMeta').innerHTML =
      `📄 <b>${file.name}</b><br>` +
      `📐 ${meta.w} × ${meta.h} px<br>` +
      `💾 ${formatBytes(file.size)}`;

    $('previewSection').style.display = 'block';
    dropZone.style.display = 'none';
    $('resultCard').style.display = 'none';
  });

  removeFile.addEventListener('click', () => {
    state.mainFile = null;
    convertBtn.disabled = true;
    $('previewSection').style.display = 'none';
    dropZone.style.display = 'flex';
  });

  $('qualityRange').addEventListener('input', function () {
    $('qualityVal').textContent = this.value;
  });

  $('resizeW').addEventListener('input', syncResize);
  $('resizeH').addEventListener('input', syncResize);

  convertBtn.addEventListener('click', async () => {
    if (!state.mainFile) return;

    convertBtn.disabled = true;
    convertBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing…';

    const fmt     = document.querySelector('input[name="fmt"]:checked').value;
    const quality = parseInt($('qualityRange').value) / 100;
    const resizeW = parseInt($('resizeW').value) || 0;
    const resizeH = parseInt($('resizeH').value) || 0;

    try {
      const result = await convertImage(state.mainFile, fmt, quality, resizeW, resizeH);
      state.currentDataURL = result.dataURL;

      const origSize = state.mainFile.size;
      const b64 = result.dataURL.split(',')[1] || '';
      const newSize = Math.round(b64.length * 3 / 4);

      $('resultImg').src = result.dataURL;
      $('resultMeta').innerHTML =
        `📐 ${result.w} × ${result.h} px<br>` +
        `💾 ${formatBytes(newSize)}<br>` +
        `📉 ${origSize > 0 ? Math.round((1 - newSize / origSize) * 100) : 0}% size change`;

      $('resultCard').style.display = 'block';
      $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      $('urlBox').style.display = 'none';

      const ext = fmt === 'jpeg' ? 'jpg' : fmt === 'dataurl' ? 'txt' : fmt;
      const name = `converted_${Date.now()}.${ext}`;

      $('downloadBtn').onclick = () => downloadDataURL(result.dataURL, name);

      if (state.autoDownload && fmt !== 'dataurl') downloadDataURL(result.dataURL, name);

      $('copyUrlBtn').onclick = () => {
        const urlBox = $('urlBox');
        urlBox.style.display = urlBox.style.display === 'none' ? 'flex' : 'none';
        $('urlText').value = result.dataURL;
      };

      $('copyUrlInner').onclick = () => {
        navigator.clipboard.writeText(result.dataURL)
          .then(() => toast('Data URL copied!', 'success'))
          .catch(() => {
            $('urlText').select();
            document.execCommand('copy');
            toast('Copied!', 'success');
          });
      };

      recordHistory(state.mainFile, fmt, result);
      toast(`Converted to ${fmt.toUpperCase()}!`, 'success');

    } catch (err) {
      toast('Conversion failed.', 'error');
    }

    convertBtn.disabled = false;
    convertBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Convert';
  });
}

function syncResize() {
  if (!$('keepRatio').checked || !state.mainFile) return;
  // Aspect ratio sync is handled at conversion time
}

/* ══════════════════════════════════════════════
   BATCH CONVERT
══════════════════════════════════════════════ */
function bindBatch() {
  const dropZone  = $('batchDropZone');
  const fileInput = $('batchFileInput');
  const batchList = $('batchList');
  const batchControls = $('batchControls');
  const convertBtn = $('batchConvertBtn');

  const addFiles = files => {
    [...files].forEach(f => {
      if (!f.type.startsWith('image/')) return;
      state.batchFiles.push({ file: f, status: 'pending', result: null });
    });
    renderBatchList();
    batchControls.style.display = state.batchFiles.length ? 'flex' : 'none';
  };

  setupDropZone(dropZone, fileInput, null, addFiles);
  fileInput.addEventListener('change', () => addFiles(fileInput.files));

  function renderBatchList() {
    batchList.innerHTML = '';
    state.batchFiles.forEach((item, i) => {
      const url = URL.createObjectURL(item.file);
      const div = document.createElement('div');
      div.className = 'batch-item';
      div.innerHTML = `
        <img src="${url}" alt=""/>
        <span class="batch-name">${item.file.name}</span>
        <span class="batch-size">${formatBytes(item.file.size)}</span>
        <span class="batch-status ${item.status === 'done' ? 'done' : ''}">${
          item.status === 'pending' ? 'Pending' :
          item.status === 'done' ? '✓ Done' : '⚠ Error'
        }</span>
      `;
      batchList.appendChild(div);
    });
  }

  convertBtn.addEventListener('click', async () => {
    const fmt = $('batchFmt').value;
    convertBtn.disabled = true;
    convertBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Converting...';

    for (let i = 0; i < state.batchFiles.length; i++) {
      const item = state.batchFiles[i];
      if (item.status === 'done') continue;
      try {
        const result = await convertImage(item.file, fmt, 0.9);
        const ext = fmt === 'jpeg' ? 'jpg' : fmt;
        downloadDataURL(result.dataURL, `converted_${i}_${Date.now()}.${ext}`);
        item.status = 'done';
        item.result = result;
        recordHistory(item.file, fmt, result);
      } catch {
        item.status = 'error';
      }
      renderBatchList();
    }

    toast(`Batch complete! ${state.batchFiles.length} files processed.`, 'success');
    convertBtn.disabled = false;
    convertBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Convert All';
  });
}

/* ══════════════════════════════════════════════
   COMPRESS
══════════════════════════════════════════════ */
function bindCompress() {
  const dropZone  = $('compressDropZone');
  const fileInput = $('compressFileInput');
  let compressedDataURL = null;

  setupDropZone(dropZone, fileInput, async file => {
    state.compressFile = file;
    const origSize = file.size;

    // Compress at 60% quality JPEG
    const result = await convertImage(file, 'jpeg', 0.6);
    compressedDataURL = result.dataURL;

    const b64 = result.dataURL.split(',')[1] || '';
    const newSize = Math.round(b64.length * 3 / 4);
    const saved = Math.round((1 - newSize / origSize) * 100);

    $('origSize').textContent = formatBytes(origSize);
    $('compSize').textContent = formatBytes(newSize);
    $('savedPct').textContent = `${Math.max(0, saved)}%`;
    $('compressResult').style.display = 'block';

    toast(`Compressed! Saved ${Math.max(0, saved)}% of size.`, 'success');
  });

  $('downloadCompressed').addEventListener('click', () => {
    if (!compressedDataURL) return;
    downloadDataURL(compressedDataURL, `compressed_${Date.now()}.jpg`);
  });
}

/* ══════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════ */
function bindSettings() {
  $('defaultQuality').addEventListener('input', function () {
    $('defaultQualityVal').textContent = this.value;
  });

  $('darkModeToggle').addEventListener('click', () => {
    state.darkMode = !state.darkMode;
    localStorage.setItem('darkMode', state.darkMode);
    applyTheme();
  });

  $('autoDownload').addEventListener('click', () => {
    state.autoDownload = !state.autoDownload;
    $('autoDownload').classList.toggle('active', state.autoDownload);
    localStorage.setItem('autoDownload', state.autoDownload);
    toast(`Auto-download ${state.autoDownload ? 'enabled' : 'disabled'}`, 'info');
  });
}

/* ══════════════════════════════════════════════
   HISTORY
══════════════════════════════════════════════ */
function recordHistory(file, fmt, result) {
  state.totalConverted++;
  localStorage.setItem('totalConverted', state.totalConverted);

  const entry = {
    id: Date.now(),
    name: file.name,
    fmt: fmt.toUpperCase(),
    size: file.size,
    w: result.w,
    h: result.h,
    thumb: result.dataURL,
    date: new Date().toLocaleString(),
    dataURL: result.dataURL,
  };

  state.history.unshift(entry);
  if (state.history.length > 50) state.history.pop();
  localStorage.setItem('imgConvertHistory', JSON.stringify(state.history));

  renderRecentList();
  renderHistory();
  renderStats();
}

function renderRecentList() {
  const container = $('recentList');
  if (!container) return;

  if (state.history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-inbox"></i>
        <p>No conversions yet</p>
      </div>`;
    return;
  }

  container.innerHTML = state.history.slice(0, 5).map(item => `
    <div class="recent-item">
      <img class="recent-thumb" src="${item.thumb}" alt="" onerror="this.style.display='none'"/>
      <div class="recent-info">
        <strong>${item.name}</strong>
        <span>${item.date}</span>
      </div>
      <span class="recent-badge">${item.fmt}</span>
    </div>
  `).join('');
}

function renderHistory() {
  const container = $('historyTable');
  if (!container) return;

  if (state.history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-inbox"></i>
        <p>No history yet</p>
      </div>`;
    return;
  }

  container.innerHTML = state.history.map(item => `
    <div class="history-row">
      <img src="${item.thumb}" alt="" onerror="this.style.display='none'"/>
      <span class="col-name" title="${item.name}">${item.name}</span>
      <span class="col-fmt">${item.fmt}</span>
      <span class="col-size">${formatBytes(item.size)}</span>
      <span class="col-date">${item.date}</span>
      <span class="col-dl">
        <button class="btn btn-ghost btn-sm" onclick="downloadDataURL('${item.dataURL}', '${item.name}')">
          <i class="fa-solid fa-download"></i>
        </button>
      </span>
    </div>
  `).join('');

  $('clearHistoryFull').onclick = () => {
    state.history = [];
    state.totalConverted = 0;
    localStorage.setItem('imgConvertHistory', '[]');
    localStorage.setItem('totalConverted', '0');
    renderHistory();
    renderRecentList();
    renderStats();
    toast('History cleared', 'info');
  };
}

/* ══════════════════════════════════════════════
   DROP ZONE HELPER
══════════════════════════════════════════════ */
function setupDropZone(dropEl, inputEl, onSingle, onMultiple) {
  if (!dropEl) return;

  ['dragenter', 'dragover'].forEach(ev => {
    dropEl.addEventListener(ev, e => {
      e.preventDefault();
      dropEl.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(ev => {
    dropEl.addEventListener(ev, e => {
      e.preventDefault();
      dropEl.classList.remove('drag-over');
    });
  });

  dropEl.addEventListener('drop', e => {
    const files = e.dataTransfer.files;
    if (!files.length) return;
    if (onMultiple) { onMultiple(files); return; }
    if (onSingle && files[0].type.startsWith('image/')) onSingle(files[0]);
    else toast('Please drop a valid image file.', 'error');
  });

  if (inputEl) {
    inputEl.addEventListener('change', () => {
      if (!inputEl.files.length) return;
      if (onMultiple) { onMultiple(inputEl.files); return; }
      if (onSingle) onSingle(inputEl.files[0]);
    });
  }

  dropEl.addEventListener('click', e => {
    if (e.target.tagName === 'LABEL' || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    inputEl && inputEl.click();
  });
}

/* ══════════════════════════════════════════════
   DOWNLOAD
══════════════════════════════════════════════ */
function downloadDataURL(dataURL, filename) {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ══════════════════════════════════════════════
   GLOBAL DRAG PREVENTION
══════════════════════════════════════════════ */
function bindGlobalDrag() {
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => e.preventDefault());
}
