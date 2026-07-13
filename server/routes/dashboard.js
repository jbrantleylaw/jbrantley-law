const router = require('express').Router();
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const [stats, solDeadlines, recentMatters, statusBreakdown] = await Promise.all([

      pool.query(`
        SELECT
          COUNT(*)                                                                       AS total_matters,
          COUNT(*) FILTER (WHERE status = 'open')                                       AS open_matters,
          COUNT(*) FILTER (WHERE status = 'pending')                                    AS pending_matters,
          COUNT(*) FILTER (WHERE open_date >= DATE_TRUNC('month', CURRENT_DATE))        AS opened_this_month,
          COUNT(*) FILTER (
            WHERE sol_date IS NOT NULL
              AND sol_date <= CURRENT_DATE + INTERVAL '30 days'
              AND status NOT IN ('closed', 'inactive')
          )                                                                              AS sol_due_30,
          COUNT(*) FILTER (
            WHERE sol_date IS NOT NULL
              AND sol_date < CURRENT_DATE
              AND status NOT IN ('closed', 'inactive')
          )                                                                              AS sol_overdue,
          (SELECT COUNT(*) FROM contacts)                                                AS total_contacts
        FROM matters
      `),

      pool.query(`
        SELECT
          m.id, m.matter_number, m.matter_name, m.sol_date, m.status, m.practice_area,
          CONCAT(c.first_name, ' ', c.last_name) AS client_name
        FROM matters m
        LEFT JOIN contacts c ON m.client_id = c.id
        WHERE m.sol_date IS NOT NULL
          AND m.status NOT IN ('closed', 'inactive')
        ORDER BY m.sol_date ASC
        LIMIT 20
      `),

      pool.query(`
        SELECT
          m.id, m.matter_number, m.matter_name, m.status, m.practice_area, m.open_date, m.created_at,
          CONCAT(c.first_name, ' ', c.last_name) AS client_name
        FROM matters m
        LEFT JOIN contacts c ON m.client_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 6
      `),

      pool.query(`SELECT status, COUNT(*) AS count FROM matters GROUP BY status`),
    ]);

    res.json({
      stats:            stats.rows[0],
      sol_deadlines:    solDeadlines.rows,
      recent_matters:   recentMatters.rows,
      status_breakdown: statusBreakdown.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
