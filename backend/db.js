/* ==========================================================================
   BREW BUTTERFLY CAFE — POSTGRESQL DATABASE
   PostgreSQL + Render
   ========================================================================== */

require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('[DATABASE] DATABASE_URL is missing.');
  process.exit(1);
}

const useSSL =
  String(process.env.DATABASE_SSL || 'false').toLowerCase() === 'true';

const pool = new Pool({
  connectionString: DATABASE_URL,

  ssl: useSSL
    ? {
        rejectUnauthorized: false
      }
    : false,

  max: Number(process.env.DB_POOL_MAX || 10),

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000
});

pool.on('error', (error) => {
  console.error('[DATABASE] Unexpected pool error:', error);
});

/* ==========================================================================
   HELPERS
   ========================================================================== */

function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

/* ==========================================================================
   INITIALIZE DATABASE
   ========================================================================== */

async function initDatabase() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    /* ----------------------------------------------------------------------
       USERS
       ---------------------------------------------------------------------- */

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    /* ----------------------------------------------------------------------
       RESERVATIONS
       ---------------------------------------------------------------------- */

    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        guests INTEGER NOT NULL DEFAULT 2,
        date DATE NOT NULL,
        time TEXT NOT NULL,
        occasion TEXT NOT NULL DEFAULT 'Regular Visit',
        notes TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Pending',
        email_sent BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_date
      ON reservations(date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_status
      ON reservations(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_created_at
      ON reservations(created_at DESC)
    `);

    /* ----------------------------------------------------------------------
       MENU
       ---------------------------------------------------------------------- */

    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        cat TEXT NOT NULL,
        name TEXT NOT NULL,
        price NUMERIC(12, 2) NOT NULL DEFAULT 0,
        description TEXT NOT NULL DEFAULT '',
        photo TEXT NOT NULL DEFAULT '',
        veg BOOLEAN NOT NULL DEFAULT FALSE,
        featured BOOLEAN NOT NULL DEFAULT FALSE,
        in_stock BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_menu_category
      ON menu_items(cat)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_menu_stock
      ON menu_items(in_stock)
    `);

    /* ----------------------------------------------------------------------
       DEFAULT ADMIN
       ---------------------------------------------------------------------- */

    const adminUsername =
      String(process.env.ADMIN_USERNAME || 'admin')
        .trim()
        .toLowerCase();

    const adminPassword =
      process.env.ADMIN_PASSWORD;

    if (!adminPassword || adminPassword.length < 8) {
      throw new Error(
        'ADMIN_PASSWORD must exist and contain at least 8 characters.'
      );
    }

    const existingAdmin =
      await client.query(
        `
          SELECT id
          FROM users
          WHERE username = $1
          LIMIT 1
        `,
        [adminUsername]
      );

    if (existingAdmin.rowCount === 0) {
      const passwordHash =
        await bcrypt.hash(adminPassword, 12);

      await client.query(
        `
          INSERT INTO users (
            id,
            username,
            password_hash,
            role
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          makeId('usr'),
          adminUsername,
          passwordHash,
          'admin'
        ]
      );

      console.log(
        `[DATABASE] Admin user "${adminUsername}" created.`
      );
    }

    await client.query('COMMIT');

    console.log('[DATABASE] PostgreSQL initialized successfully.');

  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      '[DATABASE] Initialization failed:',
      error
    );

    throw error;

  } finally {
    client.release();
  }
}

/* ==========================================================================
   DATABASE TEST
   ========================================================================== */

async function testDatabase() {
  const result =
    await pool.query('SELECT NOW() AS now');

  return result.rows[0];
}

/* ==========================================================================
   RESERVATION HELPERS
   ========================================================================== */

const reservationHelpers = {

  async create(reservation) {
    const result =
      await pool.query(
        `
          INSERT INTO reservations (
            id,
            name,
            phone,
            guests,
            date,
            time,
            occasion,
            notes,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9
          )
          RETURNING *
        `,
        [
          reservation.id,
          reservation.name,
          reservation.phone,
          reservation.guests,
          reservation.date,
          reservation.time,
          reservation.occasion,
          reservation.notes || '',
          reservation.status || 'Pending'
        ]
      );

    return result.rows[0];
  },

  async getAll() {
    const result =
      await pool.query(`
        SELECT
          id,
          name,
          phone,
          guests,
          TO_CHAR(date, 'YYYY-MM-DD') AS date,
          time,
          occasion,
          notes,
          status,
          email_sent AS "emailSent",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM reservations
        ORDER BY date ASC, time ASC, created_at DESC
      `);

    return result.rows;
  },

  async count() {
    const result =
      await pool.query(`
        SELECT COUNT(*)::INTEGER AS count
        FROM reservations
      `);

    return result.rows[0].count;
  },

  async countPending() {
    const result =
      await pool.query(`
        SELECT COUNT(*)::INTEGER AS count
        FROM reservations
        WHERE status = 'Pending'
      `);

    return result.rows[0].count;
  },

  async getById(id) {
    const result =
      await pool.query(
        `
          SELECT
            id,
            name,
            phone,
            guests,
            TO_CHAR(date, 'YYYY-MM-DD') AS date,
            time,
            occasion,
            notes,
            status,
            email_sent AS "emailSent",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
          FROM reservations
          WHERE id = $1
          LIMIT 1
        `,
        [id]
      );

    return result.rows[0] || null;
  },

  async updateStatus(id, status) {
    const result =
      await pool.query(
        `
          UPDATE reservations
          SET
            status = $2,
            updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            name,
            phone,
            guests,
            TO_CHAR(date, 'YYYY-MM-DD') AS date,
            time,
            occasion,
            notes,
            status,
            email_sent AS "emailSent",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `,
        [id, status]
      );

    return result.rows[0] || null;
  },

  async delete(id) {
    const result =
      await pool.query(
        `
          DELETE FROM reservations
          WHERE id = $1
          RETURNING id
        `,
        [id]
      );

    return {
      success: result.rowCount > 0,
      id
    };
  },

  async markEmailSent(id) {
    const result =
      await pool.query(
        `
          UPDATE reservations
          SET
            email_sent = TRUE,
            updated_at = NOW()
          WHERE id = $1
          RETURNING id
        `,
        [id]
      );

    return result.rows[0] || null;
  }
};

/* ==========================================================================
   MENU HELPERS
   ========================================================================== */

const menuHelpers = {

  async getAll() {
    const result =
      await pool.query(`
        SELECT
          id,
          cat,
          name,
          price::FLOAT AS price,
          description AS "desc",
          photo,
          veg,
          featured,
          in_stock AS "inStock",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM menu_items
        ORDER BY cat ASC, name ASC
      `);

    return result.rows;
  },

  async getById(id) {
    const result =
      await pool.query(
        `
          SELECT
            id,
            cat,
            name,
            price::FLOAT AS price,
            description AS "desc",
            photo,
            veg,
            featured,
            in_stock AS "inStock",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
          FROM menu_items
          WHERE id = $1
          LIMIT 1
        `,
        [id]
      );

    return result.rows[0] || null;
  },

  async count() {
    const result =
      await pool.query(`
        SELECT COUNT(*)::INTEGER AS count
        FROM menu_items
      `);

    return result.rows[0].count;
  },

  async upsert(item) {
    const id =
      item.id ||
      makeId('menu');

    const result =
      await pool.query(
        `
          INSERT INTO menu_items (
            id,
            cat,
            name,
            price,
            description,
            photo,
            veg,
            featured,
            in_stock
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9
          )
          ON CONFLICT (id)
          DO UPDATE SET
            cat = EXCLUDED.cat,
            name = EXCLUDED.name,
            price = EXCLUDED.price,
            description = EXCLUDED.description,
            photo = EXCLUDED.photo,
            veg = EXCLUDED.veg,
            featured = EXCLUDED.featured,
            in_stock = EXCLUDED.in_stock,
            updated_at = NOW()
          RETURNING
            id,
            cat,
            name,
            price::FLOAT AS price,
            description AS "desc",
            photo,
            veg,
            featured,
            in_stock AS "inStock"
        `,
        [
          id,
          String(item.cat || '').trim(),
          String(item.name || '').trim(),
          Number(item.price) || 0,
          String(item.desc || '').trim(),
          String(item.photo || '').trim(),
          Boolean(item.veg),
          Boolean(item.featured),
          item.inStock !== false
        ]
      );

    return result.rows[0];
  },

  async toggleStock(id) {
    const result =
      await pool.query(
        `
          UPDATE menu_items
          SET
            in_stock = NOT in_stock,
            updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            cat,
            name,
            price::FLOAT AS price,
            description AS "desc",
            photo,
            veg,
            featured,
            in_stock AS "inStock"
        `,
        [id]
      );

    return result.rows[0] || null;
  },

  async delete(id) {
    const result =
      await pool.query(
        `
          DELETE FROM menu_items
          WHERE id = $1
          RETURNING id
        `,
        [id]
      );

    return {
      success: result.rowCount > 0,
      id
    };
  }
};

/* ==========================================================================
   USER HELPERS
   ========================================================================== */

const userHelpers = {

  async findByUsername(username) {
    const result =
      await pool.query(
        `
          SELECT
            id,
            username,
            password_hash,
            role,
            created_at,
            updated_at
          FROM users
          WHERE username = $1
          LIMIT 1
        `,
        [String(username).trim().toLowerCase()]
      );

    return result.rows[0] || null;
  },

  async findById(id) {
    const result =
      await pool.query(
        `
          SELECT
            id,
            username,
            password_hash,
            role
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        [id]
      );

    return result.rows[0] || null;
  },

  async validatePassword(password, passwordHash) {
    return bcrypt.compare(
      password,
      passwordHash
    );
  },

  async updatePassword(id, passwordHash) {
    const result =
      await pool.query(
        `
          UPDATE users
          SET
            password_hash = $2,
            updated_at = NOW()
          WHERE id = $1
          RETURNING id
        `,
        [id, passwordHash]
      );

    return result.rows[0] || null;
  }
};

/* ==========================================================================
   EXPORTS
   ========================================================================== */

module.exports = {
  pool,
  initDatabase,
  testDatabase,
  reservationHelpers,
  menuHelpers,
  userHelpers
};
