const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('../db/pool');
const { requireRole } = require('../middleware/auth');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

// GET /api/v1/users
router.get('/', requireRole('super_admin', 'manager'), async (req, res) => {
  const { role } = req.query;
  let q = 'SELECT id,email,first_name,last_name,role,photo_url,is_active,created_at FROM users';
  const params = [];
  if (role) { q += ' WHERE role=$1'; params.push(role); }
  q += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// GET /api/v1/users/:id
router.get('/:id', requireRole('super_admin', 'manager'), async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id,email,first_name,last_name,role,photo_url,is_active,created_at FROM users WHERE id=$1',
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

// POST /api/v1/users — invite user
router.post('/', requireRole('super_admin'), async (req, res) => {
  const { email, firstName, lastName, role } = req.body;
  if (!email || !firstName || !lastName || !role) return res.status(400).json({ error: 'All fields required' });
  // super_admin can invite users with any role including super_admin
  if (!['manager', 'worker', 'client', 'super_admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
  if (existing.rows[0]) return res.status(409).json({ error: 'Email already exists' });

  const inviteToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  const { rows } = await pool.query(
    `INSERT INTO users (id,email,first_name,last_name,role,invite_token,invite_token_expires,is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,false) RETURNING id,email,first_name,last_name,role,is_active`,
    [uuidv4(), email.toLowerCase(), firstName, lastName, role, inviteToken, expires]
  );

  const link = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;
  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'You\'ve been invited to Health Scale Digital',
      html: `<p>Hi ${firstName},</p><p>Click <a href="${link}">here</a> to set your password and activate your account. This link expires in 7 days.</p>`,
    });
  } catch (e) {
    console.error('Email error:', e.message);
  }

  res.status(201).json(rows[0]);
});

// PATCH /api/v1/users/:id
router.patch('/:id', requireRole('super_admin'), async (req, res) => {
  const { firstName, lastName, role, isActive } = req.body;
  // Validate role if provided — all roles including super_admin are permitted
  if (role !== undefined && !['manager', 'worker', 'client', 'super_admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const updates = [];
  const params = [];
  let i = 1;
  if (firstName !== undefined) { updates.push(`first_name=$${i++}`); params.push(firstName); }
  if (lastName !== undefined) { updates.push(`last_name=$${i++}`); params.push(lastName); }
  if (role !== undefined) { updates.push(`role=$${i++}`); params.push(role); }
  if (isActive !== undefined) { updates.push(`is_active=$${i++}`); params.push(isActive); }
  updates.push(`updated_at=$${i++}`); params.push(new Date());
  params.push(req.params.id);

  const { rows } = await pool.query(
    `UPDATE users SET ${updates.join(',')} WHERE id=$${i} RETURNING id,email,first_name,last_name,role,is_active`,
    params
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

// DELETE /api/v1/users/:id (deactivate)
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  await pool.query('UPDATE users SET is_active=false WHERE id=$1', [req.params.id]);
  res.json({ message: 'User deactivated' });
});

module.exports = router;
