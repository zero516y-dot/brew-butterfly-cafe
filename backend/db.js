/* ==========================================================================
   BREW BUTTERFLY CAFE — DATA STORAGE LAYER
   JSON storage for temporary/free hosting.

   IMPORTANT:
   Render Free filesystem is ephemeral.
   This is suitable for testing/current deployment,
   but production should eventually use PostgreSQL/Supabase/Neon.
   ========================================================================== */

const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

/* --------------------------------------------------------------------------
   DATA DIRECTORY
   -------------------------------------------------------------------------- */

const DATA_DIR =
  process.env.DATA_DIR ||
  path.join(__dirname, 'data');

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, {
        recursive: true
      });
    }

    return true;
  } catch (error) {
    console.error(
      '[DB] Could not create data directory:',
      DATA_DIR
    );

    console.error(
      '[DB] Filesystem error:',
      error
    );

    return false;
  }
}

ensureDataDirectory();

/* --------------------------------------------------------------------------
   FILES
   -------------------------------------------------------------------------- */

const FILE_USERS =
  path.join(DATA_DIR, 'users.json');

const FILE_MENU =
  path.join(DATA_DIR, 'menu.json');

const FILE_RES =
  path.join(DATA_DIR, 'reservations.json');

/* --------------------------------------------------------------------------
   READ JSON
   -------------------------------------------------------------------------- */

function readJson(file, fallback = []) {

  try {

    if (!fs.existsSync(file)) {
      return fallback;
    }

    const raw =
      fs.readFileSync(
        file,
        'utf8'
      );

    if (!raw.trim()) {
      return fallback;
    }

    const parsed =
      JSON.parse(raw);

    return parsed;

  } catch (error) {

    console.error(
      '[DB] Could not read JSON:',
      file
    );

    console.error(
      '[DB] Read error:',
      error.message
    );

    return fallback;
  }
}

/* --------------------------------------------------------------------------
   WRITE JSON
   -------------------------------------------------------------------------- */

function writeJson(file, data) {

  try {

    ensureDataDirectory();

    const json =
      JSON.stringify(
        data,
        null,
        2
      );

    /*
     * Write to a temporary file first.
     * This reduces the chance of leaving
     * a corrupted JSON file.
     */

    const tempFile =
      file + '.tmp';

    fs.writeFileSync(
      tempFile,
      json,
      {
        encoding: 'utf8',
        mode: 0o644
      }
    );

    fs.renameSync(
      tempFile,
      file
    );

    return true;

  } catch (error) {

    console.error(
      '[DB] WRITE FAILED'
    );

    console.error(
      '[DB] File:',
      file
    );

    console.error(
      '[DB] Error:',
      error
    );

    throw error;
  }
}

/* ==========================================================================
   ADMIN USER
   ========================================================================== */

function seedAdmin() {

  let users =
    readJson(
      FILE_USERS,
      []
    );

  const adminUser =
    process.env.ADMIN_USERNAME ||
    'admin';

  const adminPassword =
    process.env.ADMIN_PASSWORD ||
    'BrewButterfly@2026';

  const existing =
    users.find(
      user =>
        user.username === adminUser
    );

  if (!existing) {

    const hash =
      bcrypt.hashSync(
        adminPassword,
        10
      );

    users.push({
      id: 1,
      username: adminUser,
      password_hash: hash,
      role: 'admin',
      created_at:
        new Date().toISOString()
    });

    writeJson(
      FILE_USERS,
      users
    );

    console.log(
      '[DB] Admin user created:',
      adminUser
    );
  }
}

seedAdmin();

/* ==========================================================================
   RESERVATION HELPERS
   ========================================================================== */

const reservationHelpers = {

  create(data) {

    const items =
      readJson(
        FILE_RES,
        []
      );

    items.unshift(data);

    writeJson(
      FILE_RES,
      items
    );

    console.log(
      '[DB] Reservation saved:',
      data.id
    );

    return data;
  },

  getById(id) {

    const items =
      readJson(
        FILE_RES,
        []
      );

    return items.find(
      reservation =>
        reservation.id === id
    );
  },

  getAll() {

    return readJson(
      FILE_RES,
      []
    );
  },

  updateStatus(
    id,
    status
  ) {

    const items =
      readJson(
        FILE_RES,
        []
      );

    const target =
      items.find(
        reservation =>
          reservation.id === id
      );

    if (!target) {
      return null;
    }

    target.status =
      status;

    writeJson(
      FILE_RES,
      items
    );

    return target;
  },

  markEmailSent(id) {

    const items =
      readJson(
        FILE_RES,
        []
      );

    const target =
      items.find(
        reservation =>
          reservation.id === id
      );

    if (!target) {
      return null;
    }

    target.email_sent = 1;

    writeJson(
      FILE_RES,
      items
    );

    return target;
  },

  delete(id) {

    const items =
      readJson(
        FILE_RES,
        []
      );

    const filtered =
      items.filter(
        reservation =>
          reservation.id !== id
      );

    writeJson(
      FILE_RES,
      filtered
    );

    return {
      deleted: id
    };
  },

  count() {

    return readJson(
      FILE_RES,
      []
    ).length;
  },

  countPending() {

    return readJson(
      FILE_RES,
      []
    ).filter(
      reservation =>
        reservation.status === 'Pending'
    ).length;
  }
};

/* ==========================================================================
   MENU HELPERS
   ========================================================================== */

const menuHelpers = {

  getAll() {

    return readJson(
      FILE_MENU,
      []
    );
  },

  getById(id) {

    return readJson(
      FILE_MENU,
      []
    ).find(
      item =>
        item.id === id
    );
  },

  upsert(item) {

    const items =
      readJson(
        FILE_MENU,
        []
      );

    const index =
      items.findIndex(
        menuItem =>
          menuItem.id === item.id
      );

    if (index >= 0) {

      items[index] = {
        ...items[index],
        ...item
      };

    } else {

      items.unshift(item);
    }

    writeJson(
      FILE_MENU,
      items
    );

    return item;
  },

  delete(id) {

    const items =
      readJson(
        FILE_MENU,
        []
      );

    const filtered =
      items.filter(
        item =>
          item.id !== id
      );

    writeJson(
      FILE_MENU,
      filtered
    );

    return {
      deleted: id
    };
  },

  count() {

    return readJson(
      FILE_MENU,
      []
    ).length;
  },

  toggleStock(id) {

    const items =
      readJson(
        FILE_MENU,
        []
      );

    const target =
      items.find(
        item =>
          item.id === id
      );

    if (!target) {
      return null;
    }

    target.inStock =
      !target.inStock;

    writeJson(
      FILE_MENU,
      items
    );

    return target;
  }
};

/* ==========================================================================
   USER HELPERS
   ========================================================================== */

const userHelpers = {

  findByUsername(username) {

    return readJson(
      FILE_USERS,
      []
    ).find(
      user =>
        user.username === username
    );
  },

  validatePassword(
    plain,
    hash
  ) {

    return bcrypt.compareSync(
      plain,
      hash
    );
  },

  updatePassword(
    userId,
    passwordHash
  ) {

    const users =
      readJson(
        FILE_USERS,
        []
      );

    const user =
      users.find(
        item =>
          item.id === userId
      );

    if (!user) {
      return null;
    }

    user.password_hash =
      passwordHash;

    writeJson(
      FILE_USERS,
      users
    );

    return user;
  }
};

/* ==========================================================================
   EXPORT
   ========================================================================== */

module.exports = {
  reservationHelpers,
  menuHelpers,
  userHelpers
};
