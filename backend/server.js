const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const os = require('os');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'hcpc-demo-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true }
}));

// Serve frontend and assets
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// --- API ROUTES ---

// Register
app.post('/api/register', async (req, res) => {
  const { first_name, last_name, phone, national_id, email, gender, university, status, password } = req.body;

  if (!first_name || !last_name || !phone || !national_id || !email || !gender || !university || !status || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (db.getUserByEmail(email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = db.createUser({
    first_name, last_name, phone, national_id, email, gender, university, status, password: hashed
  });

  // Auto-login after register
  req.session.userId = user.id;
  req.session.userEmail = user.email;
  res.json({ success: true, id: user.id, message: 'Registered successfully' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  req.session.userId = user.id;
  req.session.userEmail = user.email;
  res.json({ success: true, id: user.id });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Me - current session user
app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = db.getUserById(req.session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(db.toPublic(user));
});

// VULNERABLE: /api/profile/:id checks session exists but NOT ownership
// This is the intentional IDOR for demo purposes
app.get('/api/profile/:id', (req, res) => {
  // Check 1: user must be logged in - this passes
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized - please login first' });
  }
  // VULNERABILITY: Missing Check 2: req.session.userId === req.params.id
  // We intentionally do NOT verify ownership - any logged-in user can fetch any id
  const user = db.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Profile not found' });
  res.json(db.toPublic(user));
});

// Count helper for extraction script demo
app.get('/api/users/count', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ count: db.countUsers() });
});

// --- FRONTEND ROUTES (serve HTML) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../frontend/register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../frontend/login.html')));
app.get('/rules', (req, res) => res.sendFile(path.join(__dirname, '../frontend/rules.html')));
app.get('/profile/:id', (req, res) => res.sendFile(path.join(__dirname, '../frontend/profile.html')));

// 404 for API
app.use('/api/*', (req, res) => res.status(404).json({ error: 'API not found' }));

app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`HCPC Server running at http://${ip}:${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
});
