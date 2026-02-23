const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

const createChangeLog = async (entityId, authorId, title, body) => {
  await pool.query(
    `INSERT INTO change_log_entries (id,entity_type,entity_id,entry_type,author_id,title,body)
     VALUES ($1,'campaign',$2,'system',$3,$4,$5)`,
    [uuidv4(), entityId, authorId, title, body]
  );
};

// GET /api/v1/campaigns?websiteId= OR ?workerId=
router.get('/', async (req, res) => {
  const { websiteId, workerId } = req.query;
  let q, params;

  if (workerId || req.user.role === 'worker') {
    const wid = workerId || req.user.id;
    q = `SELECT c.*, w.url as website_url
         FROM campaigns c
         JOIN websites w ON c.website_id=w.id
         JOIN campaign_workers cw ON c.id=cw.campaign_id
         WHERE cw.worker_id=$1 ORDER BY c.created_at DESC`;
    params = [wid];
  } else if (websiteId) {
    q = `SELECT c.*,
           json_agg(DISTINCT jsonb_build_object('id',u.id,'firstName',u.first_name,'lastName',u.last_name)) FILTER (WHERE u.id IS NOT NULL) as workers
         FROM campaigns c
         LEFT JOIN campaign_workers cw ON c.id=cw.campaign_id
         LEFT JOIN users u ON cw.worker_id=u.id
         WHERE c.website_id=$1 GROUP BY c.id ORDER BY c.created_at DESC`;
    params = [websiteId];
  } else {
    return res.status(400).json({ error: 'websiteId or workerId required' });
  }

  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// GET /api/v1/campaigns/:id
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*,
       json_agg(DISTINCT jsonb_build_object('id',u.id,'firstName',u.first_name,'lastName',u.last_name)) FILTER (WHERE u.id IS NOT NULL) as workers
     FROM campaigns c
     LEFT JOIN campaign_workers cw ON c.id=cw.campaign_id
     LEFT JOIN users u ON cw.worker_id=u.id
     WHERE c.id=$1 GROUP BY c.id`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// POST /api/v1/campaigns
router.post('/', requireRole('super_admin', 'manager'), async (req, res) => {
  const { websiteId, name, channelCategory, platform, notes } = req.body;
  if (!websiteId || !name) return res.status(400).json({ error: 'websiteId and name required' });
  const { rows } = await pool.query(
    `INSERT INTO campaigns (id,website_id,name,channel_category,platform,notes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [uuidv4(), websiteId, name, channelCategory || null, platform || null, notes || null]
  );
  await createChangeLog(rows[0].id, req.user.id, 'Campaign created', `Campaign '${name}' (${channelCategory || ''}) was created`);
  res.status(201).json(rows[0]);
});

// PATCH /api/v1/campaigns/:id
router.patch('/:id', requireRole('super_admin', 'manager'), async (req, res) => {
  const { name, channelCategory, platform, status, notes } = req.body;

  const old = await pool.query('SELECT status FROM campaigns WHERE id=$1', [req.params.id]);
  const { rows } = await pool.query(
    `UPDATE campaigns SET
       name=COALESCE($1,name), channel_category=COALESCE($2,channel_category),
       platform=COALESCE($3,platform), status=COALESCE($4,status),
       notes=COALESCE($5,notes), updated_at=NOW()
     WHERE id=$6 RETURNING *`,
    [name, channelCategory, platform, status, notes, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });

  if (status && old.rows[0] && old.rows[0].status !== status) {
    await createChangeLog(rows[0].id, req.user.id, 'Status changed',
      `Campaign status changed from ${old.rows[0].status} to ${status}`);
  }
  res.json(rows[0]);
});

// DELETE /api/v1/campaigns/:id
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  await pool.query('UPDATE campaigns SET status=\'completed\' WHERE id=$1', [req.params.id]);
  res.json({ message: 'Campaign completed' });
});

// POST /api/v1/campaigns/:id/workers
router.post('/:id/workers', requireRole('super_admin', 'manager'), async (req, res) => {
  const { workerId } = req.body;
  await pool.query(
    'INSERT INTO campaign_workers (campaign_id,worker_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [req.params.id, workerId]
  );
  const user = await pool.query('SELECT first_name,last_name FROM users WHERE id=$1', [workerId]);
  if (user.rows[0]) {
    const name = `${user.rows[0].first_name} ${user.rows[0].last_name}`;
    await createChangeLog(req.params.id, req.user.id, 'Worker assigned', `${name} was assigned to this campaign`);
  }
  res.json({ message: 'Worker assigned' });
});

// DELETE /api/v1/campaigns/:id/workers/:workerId
router.delete('/:id/workers/:workerId', requireRole('super_admin', 'manager'), async (req, res) => {
  await pool.query('DELETE FROM campaign_workers WHERE campaign_id=$1 AND worker_id=$2', [req.params.id, req.params.workerId]);
  res.json({ message: 'Worker removed' });
});

module.exports = router;
