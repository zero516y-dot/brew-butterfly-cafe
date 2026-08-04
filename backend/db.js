/* ==========================================================================
   BREW BUTTERFLY CAFE — DATA STORAGE LAYER (PURE JS PERSISTENCE)
   ========================================================================== */

const bcrypt = require('bcryptjs');
const path   = require('path');
const fs     = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const FILE_USERS = path.join(DATA_DIR, 'users.json');
const FILE_MENU  = path.join(DATA_DIR, 'menu.json');
const FILE_RES   = path.join(DATA_DIR, 'reservations.json');

function readJson(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

/* ---------- SEED DEFAULT ADMIN ---------- */
function seedAdmin() {
  let users = readJson(FILE_USERS, []);
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const existing = users.find(u => u.username === adminUser);

  if (!existing) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'BrewButterfly@2026', 10);
    users.push({
      id: 1,
      username: adminUser,
      password_hash: hash,
      role: 'admin',
      created_at: new Date().toISOString()
    });
    writeJson(FILE_USERS, users);
    console.log('[DB] Default admin user seeded into users.json.');
  }
}
seedAdmin();

/* ---------- RESERVATION HELPERS ---------- */
const reservationHelpers = {
  create(data) {
    let items = readJson(FILE_RES, []);
    items.unshift(data);
    writeJson(FILE_RES, items);
    return data;
  },

  getById(id) {
    let items = readJson(FILE_RES, []);
    return items.find(r => r.id === id);
  },

  getAll() {
    return readJson(FILE_RES, []);
  },

  updateStatus(id, status) {
    let items = readJson(FILE_RES, []);
    let target = items.find(r => r.id === id);
    if (target) {
      target.status = status;
      writeJson(FILE_RES, items);
    }
    return target;
  },

  markEmailSent(id) {
    let items = readJson(FILE_RES, []);
    let target = items.find(r => r.id === id);
    if (target) {
      target.email_sent = 1;
      writeJson(FILE_RES, items);
    }
  },

  delete(id) {
    let items = readJson(FILE_RES, []);
    items = items.filter(r => r.id !== id);
    writeJson(FILE_RES, items);
    return { deleted: id };
  },

  count() {
    return readJson(FILE_RES, []).length;
  },

  countPending() {
    return readJson(FILE_RES, []).filter(r => r.status === 'Pending').length;
  }
};

/* ---------- MENU HELPERS ---------- */
const menuHelpers = {
  getAll() {
    return readJson(FILE_MENU, []);
  },

  getById(id) {
    return readJson(FILE_MENU, []).find(m => m.id === id);
  },

  upsert(item) {
    let items = readJson(FILE_MENU, []);
    let index = items.findIndex(m => m.id === item.id);
    if (index >= 0) {
      items[index] = { ...items[index], ...item };
    } else {
      items.unshift(item);
    }
    writeJson(FILE_MENU, items);
    return item;
  },

  delete(id) {
    let items = readJson(FILE_MENU, []);
    items = items.filter(m => m.id !== id);
    writeJson(FILE_MENU, items);
    return { deleted: id };
  },

  count() {
    return readJson(FILE_MENU, []).length;
  },

  toggleStock(id) {
    let items = readJson(FILE_MENU, []);
    let target = items.find(m => m.id === id);
    if (target) {
      target.inStock = !target.inStock;
      writeJson(FILE_MENU, items);
    }
    return target;
  }
};

/* ---------- USER HELPERS ---------- */
const userHelpers = {
  findByUsername(username) {
    return readJson(FILE_USERS, []).find(u => u.username === username);
  },

  validatePassword(plain, hash) {
    return bcrypt.compareSync(plain, hash);
  }
};

module.exports = { reservationHelpers, menuHelpers, userHelpers };
