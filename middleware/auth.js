// Middleware: require admin login
function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  if (req.path.startsWith('/api/admin') && !req.path.includes('/login')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.redirect('/admin/login');
}

// Middleware: attach admin info to res.locals
function attachAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    res.locals.admin = {
      id: req.session.adminId,
      name: req.session.adminName,
      username: req.session.adminUsername
    };
  }
  next();
}

module.exports = { requireAuth, attachAdmin };
