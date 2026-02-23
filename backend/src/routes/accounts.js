const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

// GET /api/v1/accounts?clientId=
router.get('/', async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: 'clientId required' });
  const { rows } = await pool.query(
    'SELECT * FROM accounts WHERE client_id=$1 ORDER BY created_at DESC',
    [clientId]
  );
  res.json(rows);
});

// POST /api/v1/accounts
router.post('/', requireRole('super_admin', 'manager'), async (req, res) => {
  const { clientId, name, notes } = req.body;
  if (!clientId || !name) return res.status(400).json({ error: 'clientId and name required' });
  const { rows } = await pool.query(
    'INSERT INTO accounts (id,client_id,name,notes) VALUES ($1,$2,$3,$4) RETURNING *',
    [uuidv4(), clientId, name, notes || null]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/v1/accounts/:id
router.patch('/:id', requireRole('super_admin', 'manager'), async (req, res) => {
  const { name, notes, isActive } = req.body;
  const { rows } = await pool.query(
    `UPDATE accounts SET name=COALESCE($1,name), notes=COALESCE($2,notes), is_active=COALESCE($3,is_active), updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [name, notes, isActive, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// DELETE /api/v1/accounts/:id
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  await pool.query('UPDATE accounts SET is_active=false WHERE id=$1', [req.params.id]);
  res.json({ message: 'Account deactivated' });
});

module.exports = router;
