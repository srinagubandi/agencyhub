const router = require('express').Router();
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

// GET /api/v1/settings
router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM agency_settings LIMIT 1');
  res.json(rows[0] || {});
});

// PATCH /api/v1/settings
router.patch('/', requireRole('super_admin'), async (req, res) => {
  const { companyName } = req.body;
  const { rows } = await pool.query(
    'UPDATE agency_settings SET company_name=COALESCE($1,company_name), updated_at=NOW() RETURNING *',
    [companyName]
  );
  res.json(rows[0]);
});

module.exports = router;
