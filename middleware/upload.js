const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure uploads directory exists
const uploadsDir = path.resolve('./uploads');
const soundsDir = path.resolve('./uploads/sounds');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(soundsDir)) fs.mkdirSync(soundsDir, { recursive: true });

// File type validation
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_TYPES = ['video/mp4'];
const CODE_TYPES = ['text/plain', 'text/javascript', 'text/html', 'text/css', 'application/json', 'text/x-python'];
const SOUND_TYPES = ['audio/mpeg', 'audio/mp3'];

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const VIDEO_EXT = ['.mp4'];
const CODE_EXT = ['.txt', '.js', '.py', '.html', '.css', '.json'];
const SOUND_EXT = ['.mp3'];

function checkExtension(filename, allowedExts) {
  const ext = path.extname(filename).toLowerCase();
  return allowedExts.includes(ext);
}

// General file upload (images, videos, code)
const generalStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = uuidv4() + ext;
    cb(null, safeName);
  }
});

function generalFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (IMAGE_TYPES.includes(mime) && IMAGE_EXT.includes(ext)) {
    return cb(null, true);
  }
  if (VIDEO_TYPES.includes(mime) && VIDEO_EXT.includes(ext)) {
    return cb(null, true);
  }
  if (CODE_TYPES.includes(mime) && CODE_EXT.includes(ext)) {
    return cb(null, true);
  }
  cb(new Error(`不支持的文件类型: ${mime} (${ext})`));
}

const generalUpload = multer({
  storage: generalStorage,
  fileFilter: generalFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max (covers largest - video)
  }
});

// Sound file upload
const soundStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, soundsDir),
  filename: (req, file, cb) => {
    cb(null, 'click.mp3');
  }
});

function soundFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();
  if (SOUND_TYPES.includes(mime) && SOUND_EXT.includes(ext)) {
    return cb(null, true);
  }
  cb(new Error('仅支持 MP3 格式音频文件'));
}

const soundUpload = multer({
  storage: soundStorage,
  fileFilter: soundFileFilter,
  limits: { fileSize: 500 * 1024 } // 500KB
});

module.exports = { generalUpload, soundUpload, uploadsDir, soundsDir };
