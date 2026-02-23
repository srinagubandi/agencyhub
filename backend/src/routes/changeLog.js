const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

// GET /api/v1/change-log?entityType=&entityId=
router.get('/', async (req, res) => {
  const { entityType, entityId } = req.query;
  let where = [];
  const params = [];
  let i = 1;

  if (entityType) { where.push(`cl.entity_type=$${i++}`); params.push(entityType); }
  if (entityId) { where.push(`cl.entity_id=$${i++}`); params.push(entityId); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT cl.*,
       u.first_name, u.last_name
     FROM change_log_entries cl
     LEFT JOIN users u ON cl.author_id=u.id
     ${whereClause}
     ORDER BY cl.created_at DESC
     LIMIT 200`,
    params
  );
  res.json(rows);
});

// POST /api/v1/change-log — manual entry
router.post('/', async (req, res) => {
  const { entityType, entityId, title, body } = req.body;
  if (!entityType || !entityId || !title || !body) return res.status(400).json({ error: 'All fields required' });
  if (!['website', 'campaign'].includes(entityType)) return res.status(400).json({ error: 'Invalid entityType' });
  if (title.length > 200) return res.status(400).json({ error: 'Title max 200 chars' });

  const { rows } = await pool.query(
    `INSERT INTO change_log_entries (id,entity_type,entity_id,entry_type,author_id,title,body)
     VALUES ($1,$2,$3,'manual',$4,$5,$6) RETURNING *`,
    [uuidv4(), entityType, entityId, req.user.id, title, body]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;
