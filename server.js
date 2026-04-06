require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security & Performance Middleware ───────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://wa.me"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(cors({ origin: false }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── API Routes ───────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Admin Panel ──────────────────────────────────────────────
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// ─── SEO: Sitemap.xml ─────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
  const host = `${req.protocol}://${req.get('host')}`;
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${host}/</loc></url>
</urlset>`;
  res.setHeader('Content-Type', 'application/xml');
  res.send(sitemap);
});

// ─── SEO: Robots.txt ──────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  const host = `${req.protocol}://${req.get('host')}`;
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${host}/sitemap.xml`);
});

// ─── React Build (IMPORTANT PART) ─────────────────────────────

// 👉 Change 'dist' to 'build' if your folder name is build
const buildPath = path.join(__dirname, 'dist');

app.use(express.static(buildPath));

// React routes
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// ─── Start server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
🚀 Server running at http://localhost:${PORT}

🌐 Website: http://localhost:${PORT}
🔐 Admin:   http://localhost:${PORT}/admin
`);
});

module.exports = app;
