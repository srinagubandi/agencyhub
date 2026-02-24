const router = require('express').Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

const UPLOADS_PATH = process.env.UPLOADS_PATH || './uploads';
const UPLOADS_BASE_URL = process.env.UPLOADS_BASE_URL || 'http://localhost:3001';

// Ensure upload dirs exist
['agency', 'clients', 'workers'].forEach(dir =>
  fs.mkdirSync(path.join(UPLOADS_PATH, dir), { recursive: true })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP allowed'));
  },
});

const saveImage = async (buffer, subDir, filename, width, height, fit = 'cover') => {
  const outputPath = path.join(UPLOADS_PATH, subDir, `${filename}.webp`);
  const transformer = sharp(buffer).toFormat('webp', { quality: 85 });
  if (height) transformer.resize(width, height, { fit });
  else transformer.resize(width, null, { fit: 'inside', withoutEnlargement: true });
  await transformer.toFile(outputPath);
  return `/uploads/${subDir}/${filename}.webp`;
};

const deleteOldFile = (url) => {
  if (!url) return;
  const filePath = path.join(UPLOADS_PATH, url.replace('/uploads/', ''));
  fs.unlink(filePath, () => {});
};

// POST /api/v1/uploads/agency-logo
router.post('/agency-logo', requireRole('super_admin'), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const old = await pool.query('SELECT logo_url FROM agency_settings LIMIT 1');
  deleteOldFile(old.rows[0]?.logo_url);
  const relUrl = await saveImage(req.file.buffer, 'agency', 'logo', 800, null);
  await pool.query('UPDATE agency_settings SET logo_url=$1, updated_at=NOW()', [relUrl]);
  res.json({ url: `${UPLOADS_BASE_URL}${relUrl}` });
});

// POST /api/v1/uploads/client-logo/:clientId
router.post('/client-logo/:clientId', requireRole('super_admin'), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const old = await pool.query('SELECT logo_url FROM clients WHERE id=$1', [req.params.clientId]);
  deleteOldFile(old.rows[0]?.logo_url);
  // Preserve aspect ratio — pass null for height so saveImage uses 'inside' fit
  // This prevents wide wordmark logos from being cropped into a square
  const relUrl = await saveImage(req.file.buffer, 'clients', req.params.clientId, 600, null);
  await pool.query('UPDATE clients SET logo_url=$1, updated_at=NOW() WHERE id=$2', [relUrl, req.params.clientId]);
  res.json({ url: `${UPLOADS_BASE_URL}${relUrl}` });
});

// POST /api/v1/uploads/worker-photo
router.post('/worker-photo', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const old = await pool.query('SELECT photo_url FROM users WHERE id=$1', [req.user.id]);
  deleteOldFile(old.rows[0]?.photo_url);
  const relUrl = await saveImage(req.file.buffer, 'workers', req.user.id, 256, 256);
  await pool.query('UPDATE users SET photo_url=$1, updated_at=NOW() WHERE id=$2', [relUrl, req.user.id]);
  res.json({ url: `${UPLOADS_BASE_URL}${relUrl}` });
});

module.exports = router;
