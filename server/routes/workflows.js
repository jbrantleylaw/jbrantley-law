const router = require('express').Router();
const pool   = require('../config/db');
const requireAuth = require('../middleware/auth');

const MASTER_TEMPLATES = [
  {
    name: 'MVA Motor Vehicle Accident',
    description: 'Standard workflow for motor vehicle accident personal injury cases',
    practice_area: 'Personal Injury',
    phases: [
      { name: 'Intake & Investigation', tasks: [
        { name: 'Collect accident report and photos', days_offset: 0 },
        { name: 'Order medical records', days_offset: 2 },
        { name: 'Send preservation letter to insurance', days_offset: 3 },
        { name: 'Interview client and witnesses', days_offset: 5 },
      ]},
      { name: 'Treatment & Documentation', tasks: [
        { name: 'Monitor client treatment progress', days_offset: 14 },
        { name: 'Obtain wage loss documentation', days_offset: 21 },
        { name: 'Confirm MMI or end of treatment', days_offset: 90 },
      ]},
      { name: 'Demand & Negotiation', tasks: [
        { name: 'Compile demand package', days_offset: 100 },
        { name: 'Send demand letter to insurer', days_offset: 105 },
        { name: 'Negotiate settlement', days_offset: 120 },
      ]},
      { name: 'Resolution', tasks: [
        { name: 'Prepare settlement agreement', days_offset: 135 },
        { name: 'Obtain client signature on release', days_offset: 140 },
        { name: 'Disburse settlement funds', days_offset: 150 },
      ]},
    ],
  },
  {
    name: 'Federal Trademark',
    description: 'USPTO trademark application and prosecution workflow',
    practice_area: 'Intellectual Property',
    phases: [
      { name: 'Clearance Search', tasks: [
        { name: 'Conduct knockout search', days_offset: 0 },
        { name: 'Full clearance search and opinion', days_offset: 7 },
        { name: 'Advise client on risk level', days_offset: 10 },
      ]},
      { name: 'Application Filing', tasks: [
        { name: 'Identify goods/services and class', days_offset: 14 },
        { name: 'Prepare and file USPTO application', days_offset: 21 },
        { name: 'Confirm filing receipt', days_offset: 22 },
      ]},
      { name: 'Prosecution', tasks: [
        { name: 'Monitor application status', days_offset: 90 },
        { name: 'Respond to Office Actions if issued', days_offset: 120 },
        { name: 'Address publication opposition period', days_offset: 300 },
      ]},
      { name: 'Registration', tasks: [
        { name: 'File Statement of Use if ITU', days_offset: 365 },
        { name: 'Confirm registration certificate', days_offset: 400 },
        { name: 'Docket maintenance deadlines', days_offset: 405 },
      ]},
    ],
  },
  {
    name: 'Estate Planning',
    description: 'Comprehensive estate plan drafting and execution',
    practice_area: 'Estate Planning',
    phases: [
      { name: 'Discovery', tasks: [
        { name: 'Initial estate planning questionnaire', days_offset: 0 },
        { name: 'Review existing documents', days_offset: 3 },
        { name: 'Identify assets and beneficiaries', days_offset: 7 },
      ]},
      { name: 'Drafting', tasks: [
        { name: 'Draft revocable living trust', days_offset: 14 },
        { name: 'Draft pour-over will', days_offset: 14 },
        { name: 'Draft financial power of attorney', days_offset: 14 },
        { name: 'Draft healthcare directive', days_offset: 14 },
        { name: 'Client review of draft documents', days_offset: 21 },
      ]},
      { name: 'Execution', tasks: [
        { name: 'Schedule signing appointment', days_offset: 28 },
        { name: 'Execute documents with notary/witnesses', days_offset: 30 },
        { name: 'Fund trust with real property deed', days_offset: 35 },
        { name: 'Update beneficiary designations', days_offset: 40 },
      ]},
    ],
  },
  {
    name: 'Business Formation',
    description: 'LLC or corporation formation and startup compliance',
    practice_area: 'Business',
    phases: [
      { name: 'Entity Selection', tasks: [
        { name: 'Advise on entity type (LLC vs Corp)', days_offset: 0 },
        { name: 'Name availability search', days_offset: 2 },
        { name: 'Confirm registered agent', days_offset: 3 },
      ]},
      { name: 'Formation Filing', tasks: [
        { name: 'Prepare and file Articles/Certificate', days_offset: 5 },
        { name: 'Obtain EIN from IRS', days_offset: 8 },
        { name: 'Open business bank account guidance', days_offset: 10 },
      ]},
      { name: 'Governance Documents', tasks: [
        { name: 'Draft Operating Agreement or Bylaws', days_offset: 12 },
        { name: 'Prepare initial resolutions', days_offset: 14 },
        { name: 'Issue membership interests/shares', days_offset: 16 },
      ]},
      { name: 'Compliance', tasks: [
        { name: 'Register for state/local licenses', days_offset: 20 },
        { name: 'Advise on BOI reporting (FinCEN)', days_offset: 21 },
        { name: 'Provide compliance calendar to client', days_offset: 25 },
      ]},
    ],
  },
  {
    name: 'Government Contracting',
    description: 'Federal contract bid preparation and award support',
    practice_area: 'Government Contracting',
    phases: [
      { name: 'Eligibility & Registration', tasks: [
        { name: 'Confirm SAM.gov registration active', days_offset: 0 },
        { name: 'Verify applicable certifications (8a, SDVOSB, etc.)', days_offset: 2 },
        { name: 'Review solicitation requirements', days_offset: 3 },
      ]},
      { name: 'Proposal Preparation', tasks: [
        { name: 'Analyze RFP/RFQ requirements', days_offset: 5 },
        { name: 'Draft technical volume', days_offset: 10 },
        { name: 'Prepare past performance section', days_offset: 12 },
        { name: 'Review price/cost volume', days_offset: 14 },
      ]},
      { name: 'Submission & Award', tasks: [
        { name: 'Final proposal review and submission', days_offset: 16 },
        { name: 'Confirm receipt by contracting officer', days_offset: 17 },
        { name: 'Respond to agency questions if any', days_offset: 25 },
        { name: 'Award notification and debrief if needed', days_offset: 60 },
      ]},
    ],
  },
];

// ── Ensure tables exist (idempotent, runs on startup) ────────────────────────
async function ensureWorkflowTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        practice_area TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_template_phases (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0
      )`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_template_tasks (
        id SERIAL PRIMARY KEY,
        phase_id INTEGER NOT NULL REFERENCES workflow_template_phases(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        days_offset INTEGER DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0
      )`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matter_workflows (
        id SERIAL PRIMARY KEY,
        matter_id INTEGER NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
        template_id INTEGER REFERENCES workflow_templates(id),
        name TEXT NOT NULL,
        started_at TIMESTAMPTZ DEFAULT NOW()
      )`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matter_workflow_phases (
        id SERIAL PRIMARY KEY,
        matter_workflow_id INTEGER NOT NULL REFERENCES matter_workflows(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        completed_at TIMESTAMPTZ
      )`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matter_workflow_tasks (
        id SERIAL PRIMARY KEY,
        matter_workflow_phase_id INTEGER NOT NULL REFERENCES matter_workflow_phases(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        due_date DATE,
        completed_at TIMESTAMPTZ,
        position INTEGER NOT NULL DEFAULT 0
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_matter_workflows_matter ON matter_workflows(matter_id)`);
  } catch (err) {
    console.error('Workflow table setup error:', err.message);
  }
}

// ── Five canonical master templates ──────────────────────────────────────────
const FIVE_MASTER_TEMPLATES = [
  {
    name: 'MVA — Motor Vehicle Accident',
    description: 'Full MVA workflow from intake through fund disbursement.',
    practice_area: 'Personal Injury TX',
    phases: [
      { name: 'Intake and Retention', tasks: [
        { name: 'Complete intake form', days_offset: 0 },
        { name: 'Run conflict check', days_offset: 0 },
        { name: 'Evaluate liability and damages', days_offset: 1 },
        { name: 'Send contingency fee agreement', days_offset: 2 },
        { name: 'Obtain signed HIPAA authorizations', days_offset: 3 },
      ]},
      { name: 'Investigation', tasks: [
        { name: 'Obtain police report', days_offset: 7 },
        { name: 'Gather photos and video', days_offset: 7 },
        { name: 'Request all medical records', days_offset: 7 },
        { name: 'Document lost wages', days_offset: 14 },
        { name: 'Identify all insurance policies', days_offset: 7 },
        { name: 'Send representation letter to insurance', days_offset: 5 },
      ]},
      { name: 'Demand and Negotiation', tasks: [
        { name: 'Calculate special and general damages', days_offset: 90 },
        { name: 'Draft demand letter', days_offset: 95 },
        { name: 'Send demand letter', days_offset: 100 },
        { name: 'Negotiate with adjuster', days_offset: 120 },
      ]},
      { name: 'Resolution', tasks: [
        { name: 'Evaluate settlement offer', days_offset: 150 },
        { name: 'File suit if necessary within SOL', days_offset: 160 },
        { name: 'Execute settlement agreement', days_offset: 180 },
        { name: 'Satisfy all liens', days_offset: 185 },
      ]},
      { name: 'Closeout', tasks: [
        { name: 'Distribute settlement funds', days_offset: 190 },
        { name: 'Send final accounting to client', days_offset: 195 },
        { name: 'Close matter', days_offset: 200 },
      ]},
    ],
  },
  {
    name: 'Federal Trademark',
    description: 'USPTO trademark application from intake through registration.',
    practice_area: 'Federal Trademark',
    phases: [
      { name: 'Intake and Conflict Check', tasks: [
        { name: 'Run USPTO TESS search', days_offset: 0 },
        { name: 'Run TM TKO search', days_offset: 0 },
        { name: 'Confirm use in commerce or ITU basis', days_offset: 1 },
        { name: 'Complete conflict check', days_offset: 1 },
        { name: 'Send engagement letter', days_offset: 2 },
      ]},
      { name: 'Search Opinion', tasks: [
        { name: 'Conduct comprehensive trademark search', days_offset: 5 },
        { name: 'Draft search opinion memo', days_offset: 10 },
        { name: 'Client approval of opinion', days_offset: 14 },
      ]},
      { name: 'Application Filing', tasks: [
        { name: 'Prepare specimens if use-based', days_offset: 16 },
        { name: 'Draft and file USPTO application', days_offset: 18 },
        { name: 'Send filing confirmation to client', days_offset: 18 },
        { name: 'Docket response deadline', days_offset: 18 },
      ]},
      { name: 'Prosecution', tasks: [
        { name: 'Monitor for office actions', days_offset: 90 },
        { name: 'Respond to USPTO office actions', days_offset: 90 },
        { name: 'Respond to oppositions if any', days_offset: 90 },
      ]},
      { name: 'Registration and Closeout', tasks: [
        { name: 'Confirm registration certificate', days_offset: 365 },
        { name: 'Docket Section 8 and 15 deadlines', days_offset: 365 },
        { name: 'Docket renewal deadline', days_offset: 365 },
        { name: 'Advise client on maintenance', days_offset: 365 },
        { name: 'Close matter', days_offset: 370 },
      ]},
    ],
  },
  {
    name: 'Estate Planning',
    description: 'Will and directive package from intake through document execution.',
    practice_area: 'Estate Planning',
    phases: [
      { name: 'Intake and Planning', tasks: [
        { name: 'Complete estate planning intake', days_offset: 0 },
        { name: 'Identify assets, beneficiaries, and goals', days_offset: 1 },
        { name: 'Determine documents needed', days_offset: 2 },
      ]},
      { name: 'Drafting', tasks: [
        { name: 'Draft will', days_offset: 7 },
        { name: 'Draft healthcare directive', days_offset: 7 },
        { name: 'Draft power of attorney', days_offset: 7 },
      ]},
      { name: 'Execution', tasks: [
        { name: 'Schedule signing ceremony', days_offset: 14 },
        { name: 'Confirm witnesses and notary', days_offset: 16 },
        { name: 'Schedule Proof.com session if remote', days_offset: 16 },
        { name: 'Execute all documents per state law', days_offset: 18 },
      ]},
      { name: 'Closeout', tasks: [
        { name: 'Deliver certified copies to client', days_offset: 21 },
        { name: 'Advise on asset titling', days_offset: 21 },
        { name: 'Close matter', days_offset: 25 },
      ]},
    ],
  },
  {
    name: 'Business Formation',
    description: 'Entity formation from intake through compliance package delivery.',
    practice_area: 'Business Formation',
    phases: [
      { name: 'Intake', tasks: [
        { name: 'Complete formation intake', days_offset: 0 },
        { name: 'Run name availability search at SOS', days_offset: 0 },
        { name: 'Send engagement letter', days_offset: 1 },
      ]},
      { name: 'Formation', tasks: [
        { name: 'Draft operating agreement or bylaws', days_offset: 5 },
        { name: 'File formation documents with state', days_offset: 7 },
        { name: 'Obtain EIN from IRS', days_offset: 10 },
        { name: 'Set up Northwest Registered Agent', days_offset: 7 },
      ]},
      { name: 'Compliance', tasks: [
        { name: 'Open business bank account guidance', days_offset: 14 },
        { name: 'Initial resolutions and meeting minutes', days_offset: 14 },
      ]},
      { name: 'Closeout', tasks: [
        { name: 'Deliver formation package to client', days_offset: 21 },
        { name: 'Close matter', days_offset: 25 },
      ]},
    ],
  },
  {
    name: 'Government Contracting',
    description: 'SAM.gov, proposal support, and contract performance through closeout.',
    practice_area: 'Government Contracting',
    phases: [
      { name: 'Assessment', tasks: [
        { name: 'Confirm SAM.gov status', days_offset: 0 },
        { name: 'Review certifications and NAICS', days_offset: 1 },
        { name: 'Identify opportunity and agency', days_offset: 2 },
      ]},
      { name: 'Registration', tasks: [
        { name: 'Complete or remediate SAM.gov registration', days_offset: 5 },
        { name: 'Confirm active status and expiration date', days_offset: 10 },
      ]},
      { name: 'Proposal Support', tasks: [
        { name: 'Review solicitation (RFP, RFQ, or IFB)', days_offset: 14 },
        { name: 'Advise on compliance and certifications', days_offset: 16 },
        { name: 'Review proposal before submission', days_offset: 20 },
      ]},
      { name: 'Award and Performance', tasks: [
        { name: 'Review contract terms', days_offset: 30 },
        { name: 'Advise on performance obligations', days_offset: 32 },
        { name: 'Flag scope or modification issues', days_offset: 32 },
      ]},
      { name: 'Closeout', tasks: [
        { name: 'Confirm deliverables accepted', days_offset: 200 },
        { name: 'Archive contract file', days_offset: 205 },
        { name: 'Close matter', days_offset: 210 },
      ]},
    ],
  },
];

async function seedMasterTemplates() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) AS count FROM workflow_templates');
    if (parseInt(rows[0].count, 10) > 0) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let ti = 0; ti < MASTER_TEMPLATES.length; ti++) {
        const tmpl = MASTER_TEMPLATES[ti];
        const { rows: [t] } = await client.query(
          `INSERT INTO workflow_templates (name, description, practice_area)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id`,
          [tmpl.name, tmpl.description, tmpl.practice_area]
        );
        if (!t) continue;
        for (let pi = 0; pi < tmpl.phases.length; pi++) {
          const phase = tmpl.phases[pi];
          const { rows: [p] } = await client.query(
            `INSERT INTO workflow_template_phases (template_id, name, position)
             VALUES ($1,$2,$3) RETURNING id`,
            [t.id, phase.name, pi]
          );
          for (let ki = 0; ki < phase.tasks.length; ki++) {
            const task = phase.tasks[ki];
            await client.query(
              `INSERT INTO workflow_template_tasks (phase_id, name, days_offset, position)
               VALUES ($1,$2,$3,$4)`,
              [p.id, task.name, task.days_offset, ki]
            );
          }
        }
      }
      await client.query('COMMIT');
      console.log('Workflow master templates seeded.');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Workflow seed rollback:', err.message);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Workflow seed skipped:', err.message);
  }
}

ensureWorkflowTables().then(() => seedMasterTemplates());

router.use(requireAuth);

// ── GET / — all templates with phases and tasks ───────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows: templates } = await pool.query('SELECT * FROM workflow_templates ORDER BY name');
    for (const t of templates) {
      const { rows: phases } = await pool.query(
        'SELECT * FROM workflow_template_phases WHERE template_id=$1 ORDER BY position', [t.id]
      );
      for (const p of phases) {
        const { rows: tasks } = await pool.query(
          'SELECT * FROM workflow_template_tasks WHERE phase_id=$1 ORDER BY position', [p.id]
        );
        p.tasks = tasks;
      }
      t.phases = phases;
    }
    res.json(templates);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ── POST /seed — load 5 canonical templates ───────────────────────────────────
router.post('/seed', async (req, res) => {
  try {
    const { rows: existing } = await pool.query('SELECT COUNT(*) AS c FROM workflow_templates');
    if (parseInt(existing[0].c, 10) > 0)
      return res.json({ message: 'Templates already exist' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let ti = 0; ti < FIVE_MASTER_TEMPLATES.length; ti++) {
        const tmpl = FIVE_MASTER_TEMPLATES[ti];
        const { rows: [t] } = await client.query(
          `INSERT INTO workflow_templates (name, description, practice_area) VALUES ($1,$2,$3) RETURNING id`,
          [tmpl.name, tmpl.description, tmpl.practice_area]
        );
        for (let pi = 0; pi < tmpl.phases.length; pi++) {
          const phase = tmpl.phases[pi];
          const { rows: [p] } = await client.query(
            `INSERT INTO workflow_template_phases (template_id, name, position) VALUES ($1,$2,$3) RETURNING id`,
            [t.id, phase.name, pi]
          );
          for (let ki = 0; ki < phase.tasks.length; ki++) {
            const task = phase.tasks[ki];
            await client.query(
              `INSERT INTO workflow_template_tasks (phase_id, name, days_offset, position) VALUES ($1,$2,$3,$4)`,
              [p.id, task.name, task.days_offset, ki]
            );
          }
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally { client.release(); }

    // Return the seeded templates
    const { rows: templates } = await pool.query('SELECT * FROM workflow_templates ORDER BY name');
    for (const t of templates) {
      const { rows: phases } = await pool.query(
        'SELECT * FROM workflow_template_phases WHERE template_id=$1 ORDER BY position', [t.id]
      );
      for (const p of phases) {
        const { rows: tasks } = await pool.query(
          'SELECT * FROM workflow_template_tasks WHERE phase_id=$1 ORDER BY position', [p.id]
        );
        p.tasks = tasks;
      }
      t.phases = phases;
    }
    res.json({ templates });
  } catch (err) {
    console.error('Workflow seed error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Templates ─────────────────────────────────────────────────────────────────

router.get('/templates', async (req, res) => {
  try {
    const { rows: templates } = await pool.query(
      'SELECT * FROM workflow_templates ORDER BY name'
    );
    for (const t of templates) {
      const { rows: phases } = await pool.query(
        'SELECT * FROM workflow_template_phases WHERE template_id=$1 ORDER BY position',
        [t.id]
      );
      for (const p of phases) {
        const { rows: tasks } = await pool.query(
          'SELECT * FROM workflow_template_tasks WHERE phase_id=$1 ORDER BY position',
          [p.id]
        );
        p.tasks = tasks;
      }
      t.phases = phases;
    }
    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/templates', async (req, res) => {
  const { name, description, practice_area, phases = [] } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [t] } = await client.query(
      'INSERT INTO workflow_templates (name, description, practice_area) VALUES ($1,$2,$3) RETURNING *',
      [name.trim(), description || null, practice_area || null]
    );
    for (let pi = 0; pi < phases.length; pi++) {
      const phase = phases[pi];
      const { rows: [p] } = await client.query(
        'INSERT INTO workflow_template_phases (template_id, name, position) VALUES ($1,$2,$3) RETURNING *',
        [t.id, phase.name, pi]
      );
      for (let ti = 0; ti < (phase.tasks || []).length; ti++) {
        const task = phase.tasks[ti];
        await client.query(
          'INSERT INTO workflow_template_tasks (phase_id, name, description, days_offset, position) VALUES ($1,$2,$3,$4,$5)',
          [p.id, task.name, task.description || null, task.days_offset || 0, ti]
        );
      }
    }
    await client.query('COMMIT');
    res.status(201).json(t);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.put('/templates/:id', async (req, res) => {
  const { name, description, practice_area, phases = [] } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [t] } = await client.query(
      'UPDATE workflow_templates SET name=$1, description=$2, practice_area=$3 WHERE id=$4 RETURNING *',
      [name.trim(), description || null, practice_area || null, req.params.id]
    );
    if (!t) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    await client.query('DELETE FROM workflow_template_phases WHERE template_id=$1', [req.params.id]);
    for (let pi = 0; pi < phases.length; pi++) {
      const phase = phases[pi];
      const { rows: [p] } = await client.query(
        'INSERT INTO workflow_template_phases (template_id, name, position) VALUES ($1,$2,$3) RETURNING *',
        [t.id, phase.name, pi]
      );
      for (let ti = 0; ti < (phase.tasks || []).length; ti++) {
        const task = phase.tasks[ti];
        await client.query(
          'INSERT INTO workflow_template_tasks (phase_id, name, description, days_offset, position) VALUES ($1,$2,$3,$4,$5)',
          [p.id, task.name, task.description || null, task.days_offset || 0, ti]
        );
      }
    }
    await client.query('COMMIT');
    res.json(t);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM workflow_templates WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Matter Workflows ──────────────────────────────────────────────────────────

router.get('/matter/:matter_id', async (req, res) => {
  try {
    const { rows: workflows } = await pool.query(
      'SELECT * FROM matter_workflows WHERE matter_id=$1 ORDER BY started_at',
      [req.params.matter_id]
    );
    for (const w of workflows) {
      const { rows: phases } = await pool.query(
        'SELECT * FROM matter_workflow_phases WHERE matter_workflow_id=$1 ORDER BY position',
        [w.id]
      );
      for (const p of phases) {
        const { rows: tasks } = await pool.query(
          'SELECT * FROM matter_workflow_tasks WHERE matter_workflow_phase_id=$1 ORDER BY position',
          [p.id]
        );
        p.tasks = tasks;
      }
      w.phases = phases;
    }
    res.json(workflows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/matter/:matter_id/from-template/:template_id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [tmpl] } = await client.query(
      'SELECT * FROM workflow_templates WHERE id=$1', [req.params.template_id]
    );
    if (!tmpl) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Template not found' }); }

    const startDate = new Date();
    const { rows: [mw] } = await client.query(
      'INSERT INTO matter_workflows (matter_id, template_id, name) VALUES ($1,$2,$3) RETURNING *',
      [req.params.matter_id, tmpl.id, tmpl.name]
    );

    const { rows: phases } = await client.query(
      'SELECT * FROM workflow_template_phases WHERE template_id=$1 ORDER BY position', [tmpl.id]
    );
    for (const phase of phases) {
      const { rows: [mp] } = await client.query(
        'INSERT INTO matter_workflow_phases (matter_workflow_id, name, position) VALUES ($1,$2,$3) RETURNING *',
        [mw.id, phase.name, phase.position]
      );
      const { rows: tasks } = await client.query(
        'SELECT * FROM workflow_template_tasks WHERE phase_id=$1 ORDER BY position', [phase.id]
      );
      for (const task of tasks) {
        const due = new Date(startDate);
        due.setDate(due.getDate() + (task.days_offset || 0));
        await client.query(
          'INSERT INTO matter_workflow_tasks (matter_workflow_phase_id, name, description, due_date, position) VALUES ($1,$2,$3,$4,$5)',
          [mp.id, task.name, task.description, due.toISOString().slice(0,10), task.position]
        );
      }
    }
    await client.query('COMMIT');
    res.status(201).json(mw);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.patch('/workflow-tasks/:task_id/complete', async (req, res) => {
  try {
    const { rows: [t] } = await pool.query(
      'UPDATE matter_workflow_tasks SET completed_at = CASE WHEN completed_at IS NULL THEN NOW() ELSE NULL END WHERE id=$1 RETURNING *',
      [req.params.task_id]
    );
    res.json(t);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/matter-workflows/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM matter_workflows WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Reorder endpoints ─────────────────────────────────────────────────────────

router.put('/phases/reorder', async (req, res) => {
  const { phase_ids } = req.body;
  if (!Array.isArray(phase_ids)) return res.status(400).json({ error: 'phase_ids array required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < phase_ids.length; i++) {
      await client.query('UPDATE workflow_template_phases SET position=$1 WHERE id=$2', [i, phase_ids[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.put('/phases/:id/tasks/reorder', async (req, res) => {
  const { task_ids } = req.body;
  if (!Array.isArray(task_ids)) return res.status(400).json({ error: 'task_ids array required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < task_ids.length; i++) {
      await client.query('UPDATE workflow_template_tasks SET position=$1 WHERE id=$2', [i, task_ids[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.put('/matter-workflow-tasks/reorder', async (req, res) => {
  const { task_ids } = req.body;
  if (!Array.isArray(task_ids)) return res.status(400).json({ error: 'task_ids array required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < task_ids.length; i++) {
      await client.query('UPDATE matter_workflow_tasks SET position=$1 WHERE id=$2', [i, task_ids[i]]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
