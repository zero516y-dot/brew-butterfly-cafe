const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const databasePath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'brew-butterfly.sqlite');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  guests INTEGER NOT NULL DEFAULT 2,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  occasion TEXT NOT NULL DEFAULT 'Regular Visit',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pending',
  email_sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

CREATE TABLE IF NOT EXISTS menu (
  id TEXT PRIMARY KEY,
  cat TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  desc TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '',
  veg INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  in_stock INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const defaultAdminUser = process.env.ADMIN_USERNAME || 'admin';
const defaultAdminPassword = process.env.ADMIN_PASSWORD;

if (defaultAdminPassword) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(defaultAdminUser);
  if (!existing) {
    const hash = bcrypt.hashSync(defaultAdminPassword, 12);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(defaultAdminUser, hash, 'admin');
    console.log(`[DB] Created admin user "${defaultAdminUser}" from environment.`);
  }
}

function rowToMenu(row) {
  if (!row) return null;
  return {
    id: row.id, cat: row.cat, name: row.name, price: row.price, desc: row.desc,
    photo: row.photo, veg: !!row.veg, featured: !!row.featured, inStock: !!row.in_stock,
    createdAt: row.created_at, updatedAt: row.updated_at
  };
}

function rowToReservation(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, phone: row.phone, guests: row.guests,
    date: row.date, time: row.time, occasion: row.occasion, notes: row.notes,
    status: row.status, emailSent: !!row.email_sent,
    createdAt: row.created_at, updatedAt: row.updated_at
  };
}

const reservationHelpers = {
  create(r) {
    const stmt = db.prepare(`
      INSERT INTO reservations
      (id, name, phone, guests, date, time, occasion, notes, status, email_sent)
      VALUES (@id, @name, @phone, @guests, @date, @time, @occasion, @notes, @status, 0)
    `);
    stmt.run(r);
    return r;
  },
  markEmailSent(id) {
    db.prepare('UPDATE reservations SET email_sent = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  },
  count() {
    return db.prepare('SELECT COUNT(*) AS count FROM reservations').get().count;
  },
  countPending() {
    return db.prepare("SELECT COUNT(*) AS count FROM reservations WHERE status = 'Pending'").get().count;
  },
  getAll() {
    return db.prepare('SELECT * FROM reservations ORDER BY created_at DESC').all().map(rowToReservation);
  },
  updateStatus(id, status) {
    const result = db.prepare('UPDATE reservations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    return result.changes ? rowToReservation(db.prepare('SELECT * FROM reservations WHERE id = ?').get(id)) : null;
  },
  delete(id) {
    const result = db.prepare('DELETE FROM reservations WHERE id = ?').run(id);
    return { deleted: result.changes > 0, id };
  }
};

const menuHelpers = {
  getAll() {
    return db.prepare('SELECT * FROM menu ORDER BY featured DESC, name ASC').all().map(rowToMenu);
  },
  count() {
    return db.prepare('SELECT COUNT(*) AS count FROM menu').get().count;
  },
  getById(id) {
    return rowToMenu(db.prepare('SELECT * FROM menu WHERE id = ?').get(id));
  },
  upsert(item) {
    db.prepare(`
      INSERT INTO menu
      (id, cat, name, price, desc, photo, veg, featured, in_stock)
      VALUES (@id, @cat, @name, @price, @desc, @photo, @veg, @featured, @inStock)
      ON CONFLICT(id) DO UPDATE SET
        cat=excluded.cat, name=excluded.name, price=excluded.price,
        desc=excluded.desc, photo=excluded.photo, veg=excluded.veg,
        featured=excluded.featured, in_stock=excluded.in_stock,
        updated_at=CURRENT_TIMESTAMP
    `).run({
      ...item,
      veg: item.veg ? 1 : 0,
      featured: item.featured ? 1 : 0,
      inStock: item.inStock === false ? 0 : 1
    });
    return menuHelpers.getById(item.id);
  },
  toggleStock(id) {
    db.prepare('UPDATE menu SET in_stock = CASE WHEN in_stock = 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    return menuHelpers.getById(id);
  },
  delete(id) {
    const result = db.prepare('DELETE FROM menu WHERE id = ?').run(id);
    return { deleted: result.changes > 0, id };
  }
};

const userHelpers = {
  findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },
  validatePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  },
  updatePassword(id, hash) {
    return db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
  }
};

module.exports = { db, reservationHelpers, menuHelpers, userHelpers };
