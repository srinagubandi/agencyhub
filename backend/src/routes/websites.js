const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

// GET /api/v1/websites?accountId=
router.get('/', async (req, res) => {
  const { accountId } = req.query;
  if (!accountId) return res.status(400).json({ error: 'accountId required' });
  const { rows } = await pool.query(
    'SELECT * FROM websites WHERE account_id=$1 ORDER BY created_at DESC',
    [accountId]
  );
  res.json(rows);
});

// POST /api/v1/websites
router.post('/', requireRole('super_admin', 'manager'), async (req, res) => {
  const { accountId, url, notes } = req.body;
  if (!accountId || !url) return res.status(400).json({ error: 'accountId and url required' });
  const { rows } = await pool.query(
    'INSERT INTO websites (id,account_id,url,notes) VALUES ($1,$2,$3,$4) RETURNING *',
    [uuidv4(), accountId, url, notes || null]
  );

  // System change log
  await pool.query(
    `INSERT INTO change_log_entries (id,entity_type,entity_id,entry_type,author_id,title,body)
     VALUES ($1,'website',$2,'system',$3,'Website added',$4)`,
    [uuidv4(), rows[0].id, req.user.id, `Website '${url}' was added`]
  );

  res.status(201).json(rows[0]);
});

// PATCH /api/v1/websites/:id
router.patch('/:id', requireRole('super_admin', 'manager'), async (req, res) => {
  const { url, notes, isActive } = req.body;
  const { rows } = await pool.query(
    `UPDATE websites SET url=COALESCE($1,url), notes=COALESCE($2,notes), is_active=COALESCE($3,is_active), updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [url, notes, isActive, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// DELETE /api/v1/websites/:id
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  await pool.query('UPDATE websites SET is_active=false WHERE id=$1', [req.params.id]);
  res.json({ message: 'Website deactivated' });
});

module.exports = router;
