const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const pool = require('../db/pool');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name },
    process.env.JWT_SECRET,
    { expiresIn: user.role === 'client' ? '24h' : '8h' }
  );

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1 AND is_active=true', [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({ token: signToken(user), user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name, photoUrl: user.photo_url } });
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email?.toLowerCase()]);
  const user = rows[0];
  // Always return 200 to prevent email enumeration
  if (!user) return res.json({ message: 'If that email exists, a reset link was sent.' });

  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + 3600 * 1000);

  await pool.query('UPDATE users SET reset_token_hash=$1, reset_token_expires=$2 WHERE id=$3', [hash, expires, user.id]);

  const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: 'Reset your Health Scale Digital password',
      html: `<p>Click <a href="${link}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    });
  } catch (e) {
    console.error('Email error:', e.message);
  }

  res.json({ message: 'If that email exists, a reset link was sent.' });
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE reset_token_hash=$1 AND reset_token_expires > NOW()',
    [hash]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Invalid or expired token' });

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    'UPDATE users SET password_hash=$1, reset_token_hash=NULL, reset_token_expires=NULL WHERE id=$2',
    [passwordHash, rows[0].id]
  );
  res.json({ message: 'Password reset successfully' });
});

// POST /api/v1/auth/accept-invite
router.post('/accept-invite', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

  const { rows } = await pool.query(
    'SELECT * FROM users WHERE invite_token=$1 AND invite_token_expires > NOW()',
    [token]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Invalid or expired invite' });

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    'UPDATE users SET password_hash=$1, invite_token=NULL, invite_token_expires=NULL, is_active=true WHERE id=$2',
    [passwordHash, rows[0].id]
  );
  res.json({ token: signToken(rows[0]), user: { id: rows[0].id, email: rows[0].email, role: rows[0].role } });
});

// POST /api/v1/auth/change-password
// Allows any authenticated user to change their own password by providing their current password.
router.post('/change-password', require('../middleware/auth').authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  // Fetch the user's current password hash
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  // Verify current password is correct before allowing change
  const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
  // Hash and save the new password
  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [newHash, req.user.id]);
  res.json({ message: 'Password changed successfully' });
});

// GET /api/v1/auth/me
router.get('/me', require('../middleware/auth').authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id,email,first_name,last_name,role,photo_url,is_active FROM users WHERE id=$1',
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

module.exports = router;
