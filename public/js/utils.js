// ===== Toast Notifications =====
let toastIdCounter = 0;

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const id = ++toastIdCounter;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.id = `toast-${id}`;
  el.textContent = message;
  container.appendChild(el);

  setTimeout(() => {
    const toastEl = document.getElementById(`toast-${id}`);
    if (toastEl) {
      toastEl.classList.add('removing');
      setTimeout(() => {
        if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
      }, 300);
    }
  }, duration);
}

// ===== Audio / Click Sound =====
let audioContext = null;
let isAudioUnlocked = false;
let customSoundUrl = null;
let customSoundVolume = 0.5;
let customSoundAudio = null;

function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

// Play a silent buffer to unlock audio
function unlockAudio() {
  if (isAudioUnlocked) return;
  try {
    initAudioContext();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    gain.gain.value = 0.001;
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.01);
    isAudioUnlocked = true;
  } catch (e) {
    console.warn('[Audio] Unlock failed:', e);
  }
}

// Load sound settings from server
async function loadSoundSettings() {
  try {
    const res = await fetch('/api/settings/sound', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      customSoundUrl = data.sound_url || null;
      customSoundVolume = data.sound_volume || 0.5;
    }
  } catch (e) {
    console.warn('[Audio] Failed to load sound settings:', e);
  }
}

// Play click sound
function playClickSound() {
  const muteCheckbox = document.getElementById('mute-checkbox');
  if (muteCheckbox && muteCheckbox.checked) return; // Muted

  if (customSoundUrl) {
    // Play custom sound
    try {
      if (customSoundAudio) {
        customSoundAudio.pause();
        customSoundAudio.currentTime = 0;
      }
      customSoundAudio = new Audio(customSoundUrl);
      customSoundAudio.volume = customSoundVolume;
      customSoundAudio.play().catch(() => {});
    } catch (e) {
      // Fallback to Web Audio
      playWebAudioBeep();
    }
  } else {
    playWebAudioBeep();
  }
}

// Web Audio beep fallback
function playWebAudioBeep() {
  try {
    initAudioContext();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.06);
  } catch (e) {
    // Audio not available
  }
}

// ===== Formatting =====
function formatDate(dateStr) {
  if (!dateStr) return '';
  // SQLite stores CURRENT_TIMESTAMP as UTC without timezone indicator
  // Append 'Z' to parse as UTC and convert to local time
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${mins}`;
}

// ===== Relative Time =====
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return '刚才';
  if (diffSec < 60) return diffSec + '秒前';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin + '分钟前';
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return diffHour + '小时前';
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return '昨天 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  if (diffDay < 7) return diffDay + '天前';
  if (diffDay < 30) return Math.floor(diffDay / 7) + '周前';
  if (diffDay < 365) return Math.floor(diffDay / 30) + '个月前';
  return Math.floor(diffDay / 365) + '年前';
}

function getDateGroup(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDay = Math.floor((today - dDate) / 86400000);
  if (diffDay === 0) return '今天';
  if (diffDay === 1) return '昨天';
  if (diffDay < 7) return '本周';
  if (diffDay < 30) return Math.floor(diffDay / 7) + '周前';
  return formatDate(dateStr).split(' ')[0];
}

// ===== DOM Helpers =====
function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === 'className') el.className = val;
    else if (key === 'innerHTML') el.innerHTML = val;
    else if (key === 'dataset') Object.assign(el.dataset, val);
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), val);
    else el.setAttribute(key, val);
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child instanceof Node) el.appendChild(child);
  });
  return el;
}

// ===== Escape HTML =====
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== Highlight.js lazy load =====
let highlightJsLoaded = false;

async function loadHighlightJs() {
  if (highlightJsLoaded) return;
  try {
    // Load highlight.js from CDN
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js');
    await loadCSS('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css');
    highlightJsLoaded = true;
  } catch (e) {
    console.warn('[Highlight] Failed to load:', e);
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function loadCSS(href) {
  return new Promise((resolve, reject) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.onload = resolve;
    l.onerror = reject;
    document.head.appendChild(l);
  });
}

// ===== File upload helpers =====
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4'];
const ALLOWED_CODE_TYPES = ['.txt', '.js', '.py', '.html', '.css', '.json'];

function getFileTypeCategory(file) {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) return 'video';
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (ALLOWED_CODE_TYPES.includes(ext)) return 'code';
  return null;
}

function validateFileSize(file, category) {
  const maxSizes = { image: 5 * 1024 * 1024, video: 50 * 1024 * 1024, code: 1024 * 1024 };
  return file.size <= (maxSizes[category] || Infinity);
}

// ===== Format file size =====
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
  return size + ' ' + units[i];
}

// ===== Crop Modal (Cropper.js) =====
/**
 * Open a crop modal for an image file.
 * @param {File} imageFile - The selected image file
 * @param {number} [aspectRatio=1] - Width/height aspect ratio (1 = square)
 * @returns {Promise<Blob|null>} - Cropped image Blob, or null if cancelled
 */
function openCropModal(imageFile, aspectRatio = 1) {
  return new Promise((resolve) => {
    const id = 'crop-' + Date.now();
    const overlay = document.createElement('div');
    overlay.className = 'crop-modal-overlay';
    overlay.id = id;
    overlay.innerHTML = `
      <div class="crop-modal-dialog">
        <div class="crop-modal-header">
          <h3>✂️ 裁剪封面图片</h3>
          <button class="crop-modal-close-btn" id="${id}-close">&times;</button>
        </div>
        <div class="crop-modal-body">
          <img id="${id}-image" style="display:block;max-width:100%;">
        </div>
        <div class="crop-modal-footer">
          <span class="crop-modal-hint">拖拽调整裁剪区域 · 滚轮缩放</span>
          <button class="btn btn-outline" id="${id}-cancel">取消</button>
          <button class="btn btn-primary" id="${id}-confirm">确认裁剪</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    const closeModal = () => {
      overlay.classList.remove('visible');
      overlay.classList.add('closing');
      setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
    };

    // Load image into cropper
    const img = document.getElementById(`${id}-image`);
    const reader = new FileReader();
    let cropper = null;

    reader.onload = (e) => {
      img.src = e.target.result;
      img.onload = () => {
        // Determine appropriate min size based on image dimensions
        const minCropSize = Math.min(img.naturalWidth, img.naturalHeight, 200);
        const cropRatio = aspectRatio > 0 ? aspectRatio : 1;
        cropper = new Cropper(img, {
          aspectRatio: aspectRatio,
          viewMode: 2,
          dragMode: 'move',
          autoCropArea: 0.85,
          cropBoxResizable: true,
          cropBoxMovable: true,
          minCropBoxWidth: minCropSize,
          minCropBoxHeight: minCropSize / cropRatio,
          background: false,
          modal: false,
          guides: true,
          center: true,
          highlight: false,
          toggleDragModeOnDblclick: false,
          zoomable: true,
          rotatable: false,
          scalable: false,
        });
      };
    };
    reader.readAsDataURL(imageFile);

    // Button handlers
    document.getElementById(`${id}-confirm`).addEventListener('click', () => {
      if (!cropper) { resolve(null); closeModal(); return; }
      const canvas = cropper.getCroppedCanvas({
        maxWidth: 1024,
        maxHeight: 1024,
        imageSmoothingQuality: 'high',
      });
      canvas.toBlob((blob) => {
        resolve(blob);
        closeModal();
      }, 'image/jpeg', 0.92);
    });

    document.getElementById(`${id}-cancel`).addEventListener('click', () => {
      resolve(null);
      closeModal();
    });
    document.getElementById(`${id}-close`).addEventListener('click', () => {
      resolve(null);
      closeModal();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { resolve(null); closeModal(); }
    });
  });
}

// ===== Custom Modal Dialogs (replace native confirm/prompt) =====
let _modalIdCounter = 0;

/**
 * Show a custom confirmation dialog.
 * @param {string} message - The confirmation message
 * @param {string} [confirmText='确定'] - Text for confirm button
 * @param {string} [cancelText='取消'] - Text for cancel button
 * @returns {Promise<boolean>} resolves to true if confirmed, false if cancelled
 */
function showConfirm(message, confirmText = '确定', cancelText = '取消') {
  return new Promise((resolve) => {
    const id = ++_modalIdCounter;
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    overlay.id = `custom-modal-${id}`;
    overlay.innerHTML = `
      <div class="custom-modal-dialog confirm-dialog">
        <div class="custom-modal-icon">⚠️</div>
        <div class="custom-modal-message">${escapeHtml(message)}</div>
        <div class="custom-modal-actions">
          <button class="btn btn-outline custom-modal-cancel" data-action="cancel">${escapeHtml(cancelText)}</button>
          <button class="btn btn-primary custom-modal-confirm" data-action="confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // Trigger entrance animation
    requestAnimationFrame(() => overlay.classList.add('visible'));

    const close = (result) => {
      overlay.classList.remove('visible');
      overlay.classList.add('closing');
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(result);
      }, 200);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    overlay.querySelector('.custom-modal-confirm').addEventListener('click', () => close(true));
    overlay.querySelector('.custom-modal-cancel').addEventListener('click', () => close(false));

    // Keyboard support
    const keyHandler = (e) => {
      if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', keyHandler); }
      if (e.key === 'Enter') { close(true); document.removeEventListener('keydown', keyHandler); }
    };
    document.addEventListener('keydown', keyHandler);
  });
}

/**
 * Show a custom prompt dialog for text input.
 * @param {string} message - The prompt message
 * @param {string} [defaultValue=''] - Default input value
 * @param {string} [placeholder=''] - Input placeholder text
 * @param {string} [confirmText='确定'] - Text for confirm button
 * @param {string} [cancelText='取消'] - Text for cancel button
 * @returns {Promise<string|null>} resolves to the input string, or null if cancelled
 */
function showPrompt(message, defaultValue = '', placeholder = '', confirmText = '确定', cancelText = '取消') {
  return new Promise((resolve) => {
    const id = ++_modalIdCounter;
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    overlay.id = `custom-modal-${id}`;
    overlay.innerHTML = `
      <div class="custom-modal-dialog prompt-dialog">
        <div class="custom-modal-message">${escapeHtml(message)}</div>
        <div class="custom-modal-input-wrap">
          <input class="form-input custom-modal-input" type="text" value="${escapeHtml(defaultValue)}" placeholder="${escapeHtml(placeholder)}" autocomplete="off">
        </div>
        <div class="custom-modal-actions">
          <button class="btn btn-outline custom-modal-cancel" data-action="cancel">${escapeHtml(cancelText)}</button>
          <button class="btn btn-primary custom-modal-confirm" data-action="confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // Trigger entrance animation
    requestAnimationFrame(() => overlay.classList.add('visible'));

    const input = overlay.querySelector('.custom-modal-input');
    setTimeout(() => input.focus(), 100);
    input.select();

    const close = (result) => {
      overlay.classList.remove('visible');
      overlay.classList.add('closing');
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(result);
      }, 200);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });
    overlay.querySelector('.custom-modal-confirm').addEventListener('click', () => close(input.value));
    overlay.querySelector('.custom-modal-cancel').addEventListener('click', () => close(null));

    // Keyboard support
    const keyHandler = (e) => {
      if (e.key === 'Escape') { close(null); document.removeEventListener('keydown', keyHandler); }
      if (e.key === 'Enter') { close(input.value); document.removeEventListener('keydown', keyHandler); }
    };
    document.addEventListener('keydown', keyHandler);
  });
}
