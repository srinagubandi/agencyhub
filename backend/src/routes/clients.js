const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

// Helper: check manager has access to client
const managerHasAccess = async (managerId, clientId) => {
  const { rows } = await pool.query(
    'SELECT 1 FROM client_managers WHERE manager_id=$1 AND client_id=$2',
    [managerId, clientId]
  );
  return rows.length > 0;
};

// GET /api/v1/clients
router.get('/', async (req, res) => {
  let q, params = [];
  if (req.user.role === 'super_admin') {
    q = `SELECT c.*,
           json_agg(DISTINCT jsonb_build_object('id',u.id,'firstName',u.first_name,'lastName',u.last_name)) FILTER (WHERE u.id IS NOT NULL) as managers
         FROM clients c
         LEFT JOIN client_managers cm ON c.id=cm.client_id
         LEFT JOIN users u ON cm.manager_id=u.id
         GROUP BY c.id ORDER BY c.created_at DESC`;
  } else if (req.user.role === 'manager') {
    q = `SELECT c.*,
           json_agg(DISTINCT jsonb_build_object('id',u.id,'firstName',u.first_name,'lastName',u.last_name)) FILTER (WHERE u.id IS NOT NULL) as managers
         FROM clients c
         JOIN client_managers cm2 ON c.id=cm2.client_id AND cm2.manager_id=$1
         LEFT JOIN client_managers cm ON c.id=cm.client_id
         LEFT JOIN users u ON cm.manager_id=u.id
         GROUP BY c.id ORDER BY c.created_at DESC`;
    params = [req.user.id];
  } else if (req.user.role === 'client') {
    q = `SELECT c.* FROM clients c JOIN users u ON c.user_id=u.id WHERE u.id=$1`;
    params = [req.user.id];
  } else {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// GET /api/v1/clients/:id
router.get('/:id', async (req, res) => {
  if (req.user.role === 'manager') {
    const ok = await managerHasAccess(req.user.id, req.params.id);
    if (!ok) return res.status(403).json({ error: 'Forbidden' });
  }
  const { rows } = await pool.query(
    `SELECT c.*,
       json_agg(DISTINCT jsonb_build_object('id',u.id,'firstName',u.first_name,'lastName',u.last_name)) FILTER (WHERE u.id IS NOT NULL) as managers
     FROM clients c
     LEFT JOIN client_managers cm ON c.id=cm.client_id
     LEFT JOIN users u ON cm.manager_id=u.id
     WHERE c.id=$1 GROUP BY c.id`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// POST /api/v1/clients
router.post('/', requireRole('super_admin'), async (req, res) => {
  const { name, userId } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await pool.query(
    'INSERT INTO clients (id,name,user_id) VALUES ($1,$2,$3) RETURNING *',
    [uuidv4(), name, userId || null]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/v1/clients/:id
router.patch('/:id', requireRole('super_admin'), async (req, res) => {
  const { name, isActive, userId } = req.body;
  const { rows } = await pool.query(
    `UPDATE clients SET
       name=COALESCE($1,name),
       is_active=COALESCE($2,is_active),
       user_id=COALESCE($3,user_id),
       updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [name, isActive, userId, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// DELETE /api/v1/clients/:id
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  await pool.query('UPDATE clients SET is_active=false WHERE id=$1', [req.params.id]);
  res.json({ message: 'Client deactivated' });
});

// POST /api/v1/clients/:id/managers
router.post('/:id/managers', requireRole('super_admin'), async (req, res) => {
  const { managerId } = req.body;
  await pool.query(
    'INSERT INTO client_managers (client_id,manager_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [req.params.id, managerId]
  );
  res.json({ message: 'Manager assigned' });
});

// DELETE /api/v1/clients/:id/managers/:managerId
router.delete('/:id/managers/:managerId', requireRole('super_admin'), async (req, res) => {
  await pool.query('DELETE FROM client_managers WHERE client_id=$1 AND manager_id=$2', [req.params.id, req.params.managerId]);
  res.json({ message: 'Manager removed' });
});

module.exports = router;
