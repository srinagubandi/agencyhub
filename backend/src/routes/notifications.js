const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

// GET /api/v1/notifications
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  const unreadCount = rows.filter(n => !n.is_read).length;
  res.json({ notifications: rows, unreadCount });
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ message: 'Marked as read' });
});

// PATCH /api/v1/notifications/read-all
router.patch('/read-all', async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.id]);
  res.json({ message: 'All marked as read' });
});

module.exports = router;
