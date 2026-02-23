const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

// GET /api/v1/time-entries
router.get('/', async (req, res) => {
  const { startDate, endDate, clientId, campaignId, userId } = req.query;
  let where = [];
  const params = [];
  let i = 1;

  if (req.user.role === 'worker') {
    where.push(`te.user_id=$${i++}`);
    params.push(req.user.id);
  } else if (req.user.role === 'manager') {
    where.push(`EXISTS (
      SELECT 1 FROM campaigns c
      JOIN websites w ON c.id=te.campaign_id AND c.website_id=w.id
      JOIN accounts a ON w.account_id=a.id
      JOIN client_managers cm ON a.client_id=cm.client_id AND cm.manager_id=$${i++}
    )`);
    params.push(req.user.id);
  }

  if (startDate) { where.push(`te.date >= $${i++}`); params.push(startDate); }
  if (endDate) { where.push(`te.date <= $${i++}`); params.push(endDate); }
  if (campaignId) { where.push(`te.campaign_id=$${i++}`); params.push(campaignId); }
  if (userId && req.user.role !== 'worker') { where.push(`te.user_id=$${i++}`); params.push(userId); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT te.*,
       u.first_name, u.last_name, u.email,
       c.name as campaign_name, c.status as campaign_status,
       w.url as website_url,
       a.name as account_name,
       cl.name as client_name
     FROM time_entries te
     JOIN users u ON te.user_id=u.id
     JOIN campaigns c ON te.campaign_id=c.id
     JOIN websites w ON c.website_id=w.id
     JOIN accounts a ON w.account_id=a.id
     JOIN clients cl ON a.client_id=cl.id
     ${whereClause}
     ORDER BY te.date DESC, te.created_at DESC`,
    params
  );
  res.json(rows);
});

// POST /api/v1/time-entries
router.post('/', async (req, res) => {
  const { campaignId, date, hours, description } = req.body;
  if (!campaignId || !date || !hours || !description) return res.status(400).json({ error: 'All fields required' });
  if (description.length < 10) return res.status(400).json({ error: 'Description must be at least 10 characters' });
  if (hours < 0.25 || hours > 24) return res.status(400).json({ error: 'Hours must be between 0.25 and 24' });
  if (new Date(date) > new Date()) return res.status(400).json({ error: 'Date cannot be in the future' });

  const { rows } = await pool.query(
    `INSERT INTO time_entries (id,user_id,campaign_id,date,hours,description)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [uuidv4(), req.user.id, campaignId, date, hours, description]
  );

  // System changelog
  const userRes = await pool.query('SELECT first_name,last_name FROM users WHERE id=$1', [req.user.id]);
  const name = `${userRes.rows[0].first_name} ${userRes.rows[0].last_name}`;
  await pool.query(
    `INSERT INTO change_log_entries (id,entity_type,entity_id,entry_type,author_id,title,body)
     VALUES ($1,'campaign',$2,'system',$3,'Hours logged',$4)`,
    [uuidv4(), campaignId, req.user.id, `${hours} hours logged by ${name}`]
  );

  res.status(201).json(rows[0]);
});

// PATCH /api/v1/time-entries/:id
router.patch('/:id', async (req, res) => {
  const { hours, description, date } = req.body;
  const entry = await pool.query('SELECT * FROM time_entries WHERE id=$1', [req.params.id]);
  if (!entry.rows[0]) return res.status(404).json({ error: 'Not found' });

  const isOwner = entry.rows[0].user_id === req.user.id;
  const isSuperAdmin = req.user.role === 'super_admin';
  const entryDate = new Date(entry.rows[0].date).toDateString();
  const today = new Date().toDateString();

  if (!isSuperAdmin && (!isOwner || entryDate !== today)) {
    return res.status(403).json({ error: 'Workers can only edit their own entries logged today' });
  }

  const { rows } = await pool.query(
    `UPDATE time_entries SET
       hours=COALESCE($1,hours), description=COALESCE($2,description),
       date=COALESCE($3,date), updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [hours, description, date, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE /api/v1/time-entries/:id
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  await pool.query('DELETE FROM time_entries WHERE id=$1', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
