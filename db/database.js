const Datastore = require('nedb');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_DIR = path.join(__dirname);

// Collections
const leads = new Datastore({ filename: path.join(DB_DIR, 'leads.db'), autoload: true });
const admins = new Datastore({ filename: path.join(DB_DIR, 'admins.db'), autoload: true });
const sessions = new Datastore({ filename: path.join(DB_DIR, 'sessions.db'), autoload: true });

// Indexes
leads.ensureIndex({ fieldName: 'createdAt' });
leads.ensureIndex({ fieldName: 'status' });
admins.ensureIndex({ fieldName: 'username', unique: true });

// Auto-compact every hour
leads.persistence.setAutocompactionInterval(3600000);
admins.persistence.setAutocompactionInterval(3600000);

// Seed default admin if none exists
async function seedAdmin() {
  return new Promise((resolve) => {
    admins.findOne({}, (err, doc) => {
      if (!doc) {
        bcrypt.hash('admin@krm2024', 12, (err, hash) => {
          admins.insert({
            username: 'admin',
            password: hash,
            name: 'KRM Admin',
            email: 'admin@krmbuilders.com',
            createdAt: new Date()
          }, () => {
            console.log('✅ Default admin created: username=admin password=admin@krm2024');
            resolve();
          });
        });
      } else {
        resolve();
      }
    });
  });
}

seedAdmin();

// Helper: promisify nedb
function dbFind(db, query, sort = { createdAt: -1 }, limit = 0) {
  return new Promise((resolve, reject) => {
    let cursor = db.find(query).sort(sort);
    if (limit > 0) cursor = cursor.limit(limit);
    cursor.exec((err, docs) => err ? reject(err) : resolve(docs));
  });
}
function dbFindOne(db, query) {
  return new Promise((res, rej) => db.findOne(query, (e, d) => e ? rej(e) : res(d)));
}
function dbInsert(db, doc) {
  return new Promise((res, rej) => db.insert(doc, (e, d) => e ? rej(e) : res(d)));
}
function dbUpdate(db, query, update, opts = {}) {
  return new Promise((res, rej) => db.update(query, update, opts, (e, n) => e ? rej(e) : res(n)));
}
function dbRemove(db, query, opts = {}) {
  return new Promise((res, rej) => db.remove(query, opts, (e, n) => e ? rej(e) : res(n)));
}
function dbCount(db, query) {
  return new Promise((res, rej) => db.count(query, (e, n) => e ? rej(e) : res(n)));
}

module.exports = {
  leads, admins, sessions,
  dbFind, dbFindOne, dbInsert, dbUpdate, dbRemove, dbCount
};
