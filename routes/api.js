const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { leads, admins, dbFind, dbFindOne, dbInsert, dbUpdate, dbRemove, dbCount } = require('../db/database');

// ─── Rate limiters ───────────────────────────────────────────
const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: 'Too many submissions. Please try again later.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts.' }
});

// ─── PUBLIC: Submit lead ─────────────────────────────────────
router.post('/leads', leadLimiter, async (req, res) => {
  try {
    const { fname, lname, phone, email, service, message } = req.body;
    
    // Validation
    if (!fname || !phone || !service) {
      return res.status(400).json({ error: 'Name, phone, and service are required.' });
    }
    if (phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: 'Please provide a valid phone number.' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const lead = {
      fname: fname.trim().slice(0, 60),
      lname: (lname || '').trim().slice(0, 60),
      phone: phone.trim().slice(0, 20),
      email: (email || '').trim().toLowerCase().slice(0, 100),
      service: service.trim().slice(0, 60),
      message: (message || '').trim().slice(0, 1000),
      status: 'new',         // new | contacted | closed
      priority: 'normal',    // normal | high | urgent
      notes: '',
      ip: req.ip,
      source: req.headers['referer'] || 'direct',
      userAgent: (req.headers['user-agent'] || '').slice(0, 200),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const saved = await dbInsert(leads, lead);
    
    res.json({
      success: true,
      message: 'Thank you! We\'ll contact you within 24 hours.',
      id: saved._id
    });
  } catch (err) {
    console.error('Lead error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─── ADMIN: Login (username + password only, no session) ──────
router.post('/admin/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required.' });
    }

    const admin = await dbFindOne(admins, { username: username.trim().toLowerCase() });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Return success — client stores credentials and sends them with each request
    res.json({ success: true, name: admin.name });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── ADMIN: Logout (client-side only — just clears localStorage) ─
router.post('/admin/logout', (req, res) => {
  res.json({ success: true });
});

// ─── ADMIN: Dashboard stats ───────────────────────────────────
router.get('/admin/stats', requireAdminAPI, async (req, res) => {
  try {
    const [total, newLeads, contacted, closed] = await Promise.all([
      dbCount(leads, {}),
      dbCount(leads, { status: 'new' }),
      dbCount(leads, { status: 'contacted' }),
      dbCount(leads, { status: 'closed' })
    ]);

    // Service breakdown
    const allLeads = await dbFind(leads, {});
    const serviceCounts = {};
    allLeads.forEach(l => {
      serviceCounts[l.service] = (serviceCounts[l.service] || 0) + 1;
    });

    // Last 7 days daily counts
    const now = new Date();
    const daily = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.setHours(0,0,0,0));
      const dayEnd = new Date(d.setHours(23,59,59,999));
      const count = allLeads.filter(l => {
        const t = new Date(l.createdAt);
        return t >= dayStart && t <= dayEnd;
      }).length;
      daily.push({ date: dayStart.toISOString().split('T')[0], count });
    }

    // Recent 5 leads
    const recent = await dbFind(leads, {}, { createdAt: -1 }, 5);

    res.json({ total, newLeads, contacted, closed, serviceCounts, daily, recent });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── ADMIN: Get all leads (with filter/search/pagination) ─────
router.get('/admin/leads', requireAdminAPI, async (req, res) => {
  try {
    const { status, search, service, page = 1, limit = 20 } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;
    if (service && service !== 'all') query.service = service;

    let allLeads = await dbFind(leads, query);

    // Search filter (in-memory for NeDB)
    if (search) {
      const s = search.toLowerCase();
      allLeads = allLeads.filter(l =>
        (l.fname + ' ' + l.lname).toLowerCase().includes(s) ||
        l.phone.includes(s) ||
        (l.email || '').toLowerCase().includes(s) ||
        (l.message || '').toLowerCase().includes(s)
      );
    }

    const total = allLeads.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = allLeads.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      leads: paginated,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Leads fetch error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── ADMIN: Get single lead ────────────────────────────────────
router.get('/admin/leads/:id', requireAdminAPI, async (req, res) => {
  try {
    const lead = await dbFindOne(leads, { _id: req.params.id });
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── ADMIN: Update lead status/notes/priority ─────────────────
router.patch('/admin/leads/:id', requireAdminAPI, async (req, res) => {
  try {
    const { status, notes, priority } = req.body;
    const update = { $set: { updatedAt: new Date() } };
    if (status) update.$set.status = status;
    if (notes !== undefined) update.$set.notes = notes;
    if (priority) update.$set.priority = priority;
    
    await dbUpdate(leads, { _id: req.params.id }, update);
    const updated = await dbFindOne(leads, { _id: req.params.id });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── ADMIN: Delete lead ────────────────────────────────────────
router.delete('/admin/leads/:id', requireAdminAPI, async (req, res) => {
  try {
    await dbRemove(leads, { _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── ADMIN: Export leads as CSV ───────────────────────────────
router.get('/admin/export/csv', requireAdminAPI, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status && status !== 'all' ? { status } : {};
    const data = await dbFind(leads, query);

    const headers = ['ID','Name','Phone','Email','Service','Message','Status','Priority','Notes','Submitted'];
    const rows = data.map(l => [
      l._id,
      `${l.fname} ${l.lname}`.trim(),
      l.phone,
      l.email || '',
      l.service,
      (l.message || '').replace(/,/g, ';').replace(/\n/g, ' '),
      l.status,
      l.priority,
      (l.notes || '').replace(/,/g, ';'),
      new Date(l.createdAt).toLocaleString('en-IN')
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="krm-leads-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── ADMIN: Change password ────────────────────────────────────
router.post('/admin/change-password', requireAdminAPI, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    const admin = req.admin; // set by requireAdminAPI middleware
    const match = await bcrypt.compare(currentPassword, admin.password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
    const hash = await bcrypt.hash(newPassword, 12);
    await dbUpdate(admins, { _id: admin._id }, { $set: { password: hash } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Helper middleware for API routes — Basic Auth (username:password in Authorization header)
async function requireAdminAPI(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }
  try {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    if (sep < 0) return res.status(401).json({ error: 'Unauthorized.' });
    const username = decoded.slice(0, sep).trim().toLowerCase();
    const password = decoded.slice(sep + 1);
    const admin = await dbFindOne(admins, { username });
    if (!admin) return res.status(401).json({ error: 'Unauthorized.' });
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ error: 'Unauthorized.' });
    req.admin = admin;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized.' });
  }
}

module.exports = router;
