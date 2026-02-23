const router = require('express').Router();
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

const getDateParams = (query) => {
  const now = new Date();
  const start = query.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = query.endDate || now.toISOString().split('T')[0];
  return { start, end };
};

// GET /api/v1/reports/hours-by-employee
router.get('/hours-by-employee', requireRole('super_admin', 'manager'), async (req, res) => {
  const { start, end } = getDateParams(req.query);
  let extra = '', params = [start, end];

  if (req.user.role === 'manager') {
    extra = `AND EXISTS (
      SELECT 1 FROM campaigns c
      JOIN websites w ON c.id=te.campaign_id AND c.website_id=w.id
      JOIN accounts a ON w.account_id=a.id
      JOIN client_managers cm ON a.client_id=cm.client_id AND cm.manager_id=$3
    )`;
    params.push(req.user.id);
  }

  const { rows } = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.email,
       SUM(te.hours) as total_hours,
       json_agg(json_build_object('client',cl.name,'hours',sub.h)) as by_client
     FROM time_entries te
     JOIN users u ON te.user_id=u.id
     JOIN campaigns c ON te.campaign_id=c.id
     JOIN websites w ON c.website_id=w.id
     JOIN accounts a ON w.account_id=a.id
     JOIN clients cl ON a.client_id=cl.id
     JOIN LATERAL (
       SELECT SUM(te2.hours) as h FROM time_entries te2
       JOIN campaigns c2 ON te2.campaign_id=c2.id
       JOIN websites w2 ON c2.website_id=w2.id
       JOIN accounts a2 ON w2.account_id=a2.id
       WHERE te2.user_id=u.id AND a2.client_id=cl.id AND te2.date BETWEEN $1 AND $2
     ) sub ON true
     WHERE te.date BETWEEN $1 AND $2 ${extra}
     GROUP BY u.id, u.first_name, u.last_name, u.email
     ORDER BY total_hours DESC`,
    params
  );
  res.json(rows);
});

// GET /api/v1/reports/hours-by-client
router.get('/hours-by-client', requireRole('super_admin', 'manager'), async (req, res) => {
  const { start, end } = getDateParams(req.query);
  let extra = '', params = [start, end];

  if (req.user.role === 'manager') {
    extra = `AND cm2.manager_id=$3`;
    params.push(req.user.id);
  }

  const { rows } = await pool.query(
    `SELECT cl.id, cl.name,
       SUM(te.hours) as total_hours,
       json_agg(json_build_object('campaign',c.name,'hours',sub.h,'status',c.status)) as by_campaign
     FROM time_entries te
     JOIN campaigns c ON te.campaign_id=c.id
     JOIN websites w ON c.website_id=w.id
     JOIN accounts a ON w.account_id=a.id
     JOIN clients cl ON a.client_id=cl.id
     ${req.user.role === 'manager' ? 'JOIN client_managers cm2 ON cl.id=cm2.client_id' : ''}
     JOIN LATERAL (
       SELECT SUM(te2.hours) as h FROM time_entries te2
       WHERE te2.campaign_id=c.id AND te2.date BETWEEN $1 AND $2
     ) sub ON true
     WHERE te.date BETWEEN $1 AND $2 ${extra}
     GROUP BY cl.id, cl.name
     ORDER BY total_hours DESC`,
    params
  );
  res.json(rows);
});

// GET /api/v1/reports/hours-by-campaign
router.get('/hours-by-campaign', requireRole('super_admin', 'manager'), async (req, res) => {
  const { start, end } = getDateParams(req.query);
  let extra = '', params = [start, end];

  if (req.user.role === 'manager') {
    extra = `AND cm.manager_id=$3`;
    params.push(req.user.id);
  }

  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.status, c.channel_category, c.platform,
       cl.name as client_name,
       SUM(te.hours) as total_hours
     FROM time_entries te
     JOIN campaigns c ON te.campaign_id=c.id
     JOIN websites w ON c.website_id=w.id
     JOIN accounts a ON w.account_id=a.id
     JOIN clients cl ON a.client_id=cl.id
     ${req.user.role === 'manager' ? 'JOIN client_managers cm ON cl.id=cm.client_id' : ''}
     WHERE te.date BETWEEN $1 AND $2 ${extra}
     GROUP BY c.id, c.name, c.status, c.channel_category, c.platform, cl.name
     ORDER BY total_hours DESC`,
    params
  );
  res.json(rows);
});

// GET /api/v1/reports/my-hours (worker)
router.get('/my-hours', requireRole('worker'), async (req, res) => {
  const { start, end } = getDateParams(req.query);
  const { rows } = await pool.query(
    `SELECT te.*, c.name as campaign_name, cl.name as client_name
     FROM time_entries te
     JOIN campaigns c ON te.campaign_id=c.id
     JOIN websites w ON c.website_id=w.id
     JOIN accounts a ON w.account_id=a.id
     JOIN clients cl ON a.client_id=cl.id
     WHERE te.user_id=$1 AND te.date BETWEEN $2 AND $3
     ORDER BY te.date DESC`,
    [req.user.id, start, end]
  );
  const total = rows.reduce((s, r) => s + parseFloat(r.hours), 0);
  res.json({ entries: rows, totalHours: total });
});

// GET /api/v1/reports/client-portal (client)
router.get('/client-portal', requireRole('client'), async (req, res) => {
  const { start, end } = getDateParams(req.query);

  // Get client record linked to this user
  const clientRes = await pool.query('SELECT id FROM clients WHERE user_id=$1', [req.user.id]);
  if (!clientRes.rows[0]) return res.status(404).json({ error: 'No client linked to this account' });
  const clientId = clientRes.rows[0].id;

  const [hoursResult, campaignResult, teamResult] = await Promise.all([
    pool.query(
      `SELECT SUM(te.hours) as total_hours,
         json_agg(json_build_object('campaign',c.name,'hours',sub.h,'status',c.status)) as by_campaign
       FROM time_entries te
       JOIN campaigns c ON te.campaign_id=c.id
       JOIN websites w ON c.website_id=w.id
       JOIN accounts a ON w.account_id=a.id
       WHERE a.client_id=$1 AND te.date BETWEEN $2 AND $3
       JOIN LATERAL (SELECT SUM(te2.hours) as h FROM time_entries te2 WHERE te2.campaign_id=c.id AND te2.date BETWEEN $2 AND $3) sub ON true`,
      [clientId, start, end]
    ).catch(() =>
      pool.query(
        `SELECT SUM(te.hours) as total_hours FROM time_entries te
         JOIN campaigns c ON te.campaign_id=c.id
         JOIN websites w ON c.website_id=w.id
         JOIN accounts a ON w.account_id=a.id
         WHERE a.client_id=$1 AND te.date BETWEEN $2 AND $3`,
        [clientId, start, end]
      )
    ),
    pool.query(
      `SELECT DISTINCT c.id, c.name, c.status, c.channel_category, c.platform
       FROM campaigns c
       JOIN websites w ON c.website_id=w.id
       JOIN accounts a ON w.account_id=a.id
       WHERE a.client_id=$1 ORDER BY c.name`,
      [clientId]
    ),
    pool.query(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.role
       FROM users u
       JOIN time_entries te ON u.id=te.user_id
       JOIN campaigns c ON te.campaign_id=c.id
       JOIN websites w ON c.website_id=w.id
       JOIN accounts a ON w.account_id=a.id
       WHERE a.client_id=$1`,
      [clientId]
    ),
  ]);

  res.json({
    totalHours: parseFloat(hoursResult.rows[0]?.total_hours || 0),
    campaigns: campaignResult.rows,
    team: teamResult.rows,
  });
});

module.exports = router;
