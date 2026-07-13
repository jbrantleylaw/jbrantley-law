const router      = require('express').Router();
const pool        = require('../config/db');
const requireAuth = require('../middleware/auth');
const { DOCUMENT_TEMPLATES, generateDocument } = require('../services/documentService');
const { generatePdf } = require('../services/pdfService');
const path = require('path');
const fs   = require('fs');

router.use(requireAuth);

const GEN_DIR = path.join(__dirname, '../generated');

// ── Static data ──────────────────────────────────────────────────────────────

router.get('/templates', (_req, res) => {
  res.json(DOCUMENT_TEMPLATES);
});

// ── Generated documents ───────────────────────────────────────────────────────

router.get('/generated', async (req, res) => {
  try {
    const { matter_id } = req.query;
    const where  = matter_id ? 'WHERE gd.matter_id = $1' : '';
    const params = matter_id ? [matter_id] : [];
    const { rows } = await pool.query(`
      SELECT gd.*, u.name AS created_by_name
      FROM   generated_documents gd
      LEFT JOIN users u ON gd.created_by = u.id
      ${where}
      ORDER  BY gd.created_at DESC
      LIMIT  200
    `, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/generate', async (req, res) => {
  const { templateKey, format = 'docx', data, matter_id, contact_id } = req.body;
  if (!templateKey) return res.status(400).json({ error: 'Template key required' });

  try {
    if (!fs.existsSync(GEN_DIR)) fs.mkdirSync(GEN_DIR, { recursive: true });

    const timestamp = Date.now();
    const ext       = format === 'pdf' ? 'pdf' : 'docx';
    const fileName  = `${templateKey}-${timestamp}.${ext}`;
    const filePath  = path.join(GEN_DIR, fileName);

    if (format === 'pdf') {
      await generatePdf(templateKey, data || {}, filePath);
    } else {
      await generateDocument(templateKey, data || {}, filePath);
    }

    const template = DOCUMENT_TEMPLATES.find(t => t.key === templateKey);
    const docName  = `${template?.name || templateKey} — ${new Date().toLocaleDateString()}`;

    const { rows } = await pool.query(
      `INSERT INTO generated_documents
         (template_key, document_name, document_type, practice_area, file_path, generated_data, matter_id, contact_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [
        templateKey,
        docName,
        ext,
        template?.practiceArea || null,
        filePath,
        JSON.stringify(data || {}),
        matter_id  || null,
        contact_id || null,
        req.user.id,
      ]
    );

    res.json({ id: rows[0].id, fileName, format: ext });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Generation failed: ${err.message}` });
  }
});

router.get('/download/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM generated_documents WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Document not found' });
    if (!fs.existsSync(rows[0].file_path)) return res.status(404).json({ error: 'File not found on disk' });
    res.download(rows[0].file_path, path.basename(rows[0].file_path));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Intake-summary export (called from Intake Hub) ───────────────────────────

router.post('/generate-intake', async (req, res) => {
  const { intakeId, format = 'docx' } = req.body;
  if (!intakeId) return res.status(400).json({ error: 'intakeId required' });

  try {
    const { rows } = await pool.query(`
      SELECT i.*, c.first_name, c.last_name, c.email, c.phone
      FROM   intake_forms i
      LEFT JOIN contacts c ON i.contact_id = c.id
      WHERE  i.id = $1
    `, [intakeId]);
    if (!rows[0]) return res.status(404).json({ error: 'Intake not found' });

    const intake = rows[0];
    if (!fs.existsSync(GEN_DIR)) fs.mkdirSync(GEN_DIR, { recursive: true });

    const ext      = format === 'pdf' ? 'pdf' : 'docx';
    const fileName = `intake-summary-${Date.now()}.${ext}`;
    const filePath = path.join(GEN_DIR, fileName);

    if (format === 'pdf') {
      await generatePdf('intake-summary', intake, filePath);
    } else {
      await generateDocument('intake-summary', intake, filePath);
    }

    const clientName = intake.first_name
      ? `${intake.first_name} ${intake.last_name}`
      : `Intake #${intakeId}`;
    const docName = `Intake Summary — ${clientName} — ${new Date().toLocaleDateString()}`;

    const { rows: saved } = await pool.query(
      `INSERT INTO generated_documents
         (template_key, document_name, document_type, practice_area, file_path, generated_data, contact_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      ['intake-summary', docName, ext, intake.practice_area, filePath,
       JSON.stringify(intake), intake.contact_id || null, req.user.id]
    );

    res.json({ id: saved[0].id, fileName, format: ext });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Generation failed: ${err.message}` });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'attorney') return res.status(403).json({ error: 'Only attorneys can delete documents' });
    const { rows } = await pool.query('DELETE FROM generated_documents WHERE id=$1 RETURNING *', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Document not found' });
    if (rows[0].file_path && fs.existsSync(rows[0].file_path)) fs.unlinkSync(rows[0].file_path);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
