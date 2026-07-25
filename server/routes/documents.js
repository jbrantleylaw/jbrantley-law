const router = require('express').Router();
const pool   = require('../config/db');
const requireAuth = require('../middleware/auth');
const activity = require('../utils/activity');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, name);
  },
});

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
];

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, DOCX, JPG, and PNG files are allowed'));
  },
});

router.use(requireAuth);

const BASE = `
  SELECT d.*, m.matter_name, m.matter_number,
    u.name AS uploaded_by_name
  FROM documents d
  LEFT JOIN matters m ON d.matter_id = m.id
  LEFT JOIN users   u ON d.uploaded_by = u.id
`;

router.get('/', async (req, res) => {
  try {
    const { matter_id, contact_id, search } = req.query;
    const where = []; const params = []; let i = 1;
    if (matter_id)  { where.push(`d.matter_id = $${i++}`);  params.push(matter_id); }
    if (contact_id) { where.push(`d.contact_id = $${i++}`); params.push(contact_id); }
    if (search)     { where.push(`d.document_name ILIKE $${i++}`); params.push(`%${search}%`); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await pool.query(`${BASE} ${clause} ORDER BY d.created_at DESC`, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE')
      return res.status(400).json({ error: 'File too large. Maximum size is 25 MB.' });
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File is required' });
  const { document_name, document_type, matter_id } = req.body;
  if (!document_name?.trim()) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Document name is required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO documents (document_name, document_type, file_name, file_path, file_size, mime_type, matter_id, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [document_name.trim(), document_type||null, req.file.filename, req.file.path,
       req.file.size, req.file.mimetype, matter_id||null, req.user.id]
    );
    await activity.log({ event_type:'document_uploaded', description:`Document uploaded: ${document_name.trim()}`, matter_id: matter_id||null, user_id: req.user.id, meta:{ doc_id: rows[0].id } });
    res.status(201).json(rows[0]);
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM documents WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Document not found' });
    const doc = rows[0];
    if (!fs.existsSync(doc.file_path)) return res.status(404).json({ error: 'File not found on disk' });
    const downloadName = doc.document_name + path.extname(doc.file_name);
    res.download(doc.file_path, downloadName);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'attorney') return res.status(403).json({ error: 'Only attorneys can delete documents' });
    const { rows } = await pool.query('DELETE FROM documents WHERE id=$1 RETURNING *', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Document not found' });
    fs.unlink(rows[0].file_path, () => {});
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── Folders ───────────────────────────────────────────────────────────────────

router.get('/folders', async (req, res) => {
  try {
    const { matter_id } = req.query;
    const where = matter_id ? 'WHERE matter_id = $1' : '';
    const params = matter_id ? [matter_id] : [];
    const { rows } = await pool.query(
      `SELECT f.*, u.name AS created_by_name FROM document_folders f LEFT JOIN users u ON f.created_by=u.id ${where} ORDER BY f.name ASC`,
      params
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/folders', async (req, res) => {
  const { name, parent_id, matter_id } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Folder name is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO document_folders (name, parent_id, matter_id, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name.trim(), parent_id || null, matter_id || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/:id/folder', async (req, res) => {
  const { folder_id } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE documents SET folder_id=$1 WHERE id=$2 RETURNING *',
      [folder_id || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Document not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/folders/:id', async (req, res) => {
  if (req.user.role !== 'attorney') return res.status(403).json({ error: 'Attorney access only' });
  try {
    await pool.query('UPDATE documents SET folder_id=NULL WHERE folder_id=$1', [req.params.id]);
    await pool.query('DELETE FROM document_folders WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
