require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOADS_PATH = process.env.UPLOADS_PATH || './uploads';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_PATH));

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../public')));
}

// Public routes
app.use('/api/v1/auth', require('./routes/auth'));

// Protected routes
app.use('/api/v1/users', authMiddleware, require('./routes/users'));
app.use('/api/v1/clients', authMiddleware, require('./routes/clients'));
app.use('/api/v1/accounts', authMiddleware, require('./routes/accounts'));
app.use('/api/v1/websites', authMiddleware, require('./routes/websites'));
app.use('/api/v1/campaigns', authMiddleware, require('./routes/campaigns'));
app.use('/api/v1/time-entries', authMiddleware, require('./routes/timeEntries'));
app.use('/api/v1/change-log', authMiddleware, require('./routes/changeLog'));
app.use('/api/v1/reports', authMiddleware, require('./routes/reports'));
app.use('/api/v1/notifications', authMiddleware, require('./routes/notifications'));
app.use('/api/v1/uploads', authMiddleware, require('./routes/uploads'));
app.use('/api/v1/settings', authMiddleware, require('./routes/settings'));

// SPA fallback
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
  });
}

app.listen(PORT, () => console.log(`🚀 AgencyHub API running on port ${PORT}`));
