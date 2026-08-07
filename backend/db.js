/* ==========================================================================
   BREW BUTTERFLY CAFE — PostgreSQL DATABASE
   Render PostgreSQL + node-postgres
   ========================================================================== */

require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('[DATABASE] DATABASE_URL is missing.');
}

function envBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return String(value).toLowerCase() === 'true';
}

const isProduction =
  String(process.env.NODE_ENV || 'development').toLowerCase() ===
  'production';

const useSSL = envBoolean(
  process.env.DATABASE_SSL,
  isProduction
);

const pool = new Pool({
  connectionString: DATABASE_URL,

  ssl: useSSL
    ? {
        rejectUnauthorized: false
      }
    : false,

  max: Math.max(
    1,
    Number(process.env.DB_POOL_MAX || 10)
  ),

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000
});

pool.on('error', (error) => {
  console.error('[DATABASE] Unexpected PostgreSQL pool error:', error);
});

/* ==========================================================================
   HELPERS
   ========================================================================== */

function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function cleanString(value, maxLength = 500) {
  return String(value ?? '')
    .trim()
    .slice(0, maxLength);
}

/* ==========================================================================
   TEST DATABASE
   ========================================================================== */

async function testDatabase() {
  const result = await pool.query(`
    SELECT
      NOW() AS now,
      current_database() AS database
  `);

  return result.rows[0];
}

/* ==========================================================================
   FULL MENU SEED (matches the public JS menu)
   ========================================================================== */

const MENU_SEED = [
  // Breakfast
  ['bk-boiled-egg', 'breakfast', 'Boiled Egg', 40, 'Perfectly boiled eggs with pepper and salt.'],
  ['bk-chana', 'breakfast', 'Chana', 50, 'Flavourful spiced chickpea bowl.', true],
  ['bk-plain-omlette', 'breakfast', 'Plain Omlette', 50, 'Soft fluffy three-egg omelette.'],
  // Burger
  ['bg-chicken-burger', 'burger', 'Chicken Burger', 150, 'Juicy chicken patty with house mayonnaise.'],
  ['bg-double-chicken-burger', 'burger', 'Double Chicken Burger', 200, 'Twin patties, cheese, lettuce and signature sauce.', false, true],
  // Chowmein
  ['cm-buff', 'chowmein', 'Buff Chowmein', 160, 'Wok-tossed noodles with spiced buff chunks.'],
  ['cm-chicken', 'chowmein', 'Chicken Chowmein', 180, 'Stir-fried noodles with tender chicken strips.', false, true],
  ['cm-veg', 'chowmein', 'Veg Chowmein', 130, 'Fresh vegetable noodles tossed on high heat.', true],
  // Cigarettes
  ['cig-24-carat-surya', 'cigarettes', '24 Carat Surya', 30, 'Classic Surya premium pack.'],
  ['cig-fusion', 'cigarettes', 'Fusion', 30, 'Smooth Surya Fusion stick.'],
  ['cig-shikhar-ice', 'cigarettes', 'Shikhar Ice', 30, 'Fresh menthol Shikhar Ice.'],
  ['cig-surya-light', 'cigarettes', 'Surya Light', 30, 'Light, smoother blend.'],
  ['cig-surya-red', 'cigarettes', 'Surya Red', 35, 'Full-flavoured Surya Red.'],
  // Cold Drinks
  ['cd-coke', 'cold-drinks', 'Coke', 70, 'Ice-cold classic Coca-Cola.'],
  ['cd-cold-coffee', 'cold-drinks', 'Cold Coffee', 150, 'Creamy blended iced coffee.', true, true],
  ['cd-fanta', 'cold-drinks', 'Fanta', 70, 'Zesty fizzy orange Fanta.'],
  ['cd-peach-iced', 'cold-drinks', 'Peach Iced', 150, 'Refreshing peach iced tea.'],
  ['cd-sprite', 'cold-drinks', 'Sprite', 70, 'Crisp lemon-lime Sprite.'],
  // Energy
  ['en-redbull-220', 'energy', 'Red Bull 220ml', 130, 'Original Red Bull, 220ml.'],
  ['en-redbull-330', 'energy', 'Red Bull 330ml', 150, 'Original Red Bull, 330ml.'],
  ['en-xtreme', 'energy', 'Xtreme', 145, 'High-voltage Xtreme energy drink.'],
  // Hookah
  ['hk-cloud-coil', 'hookah', 'Cloud Coil', 70, 'Quick cloud session, smooth pull.'],
  ['hk-cloud-double-apple', 'hookah', 'Cloud Double Apple', 400, 'Classic sweet anise double apple.'],
  ['hk-cloud-icy-mango', 'hookah', 'Cloud Icy Mango', 500, 'Chilled mango shisha with heavy clouds.', false, true],
  ['hk-cloud-lady-killer', 'hookah', 'Cloud Lady Killer', 500, 'Bold fruity cloud blend.'],
  ['hk-cloud-mango', 'hookah', 'Cloud Mango', 400, 'Sweet ripe mango cloud hookah.'],
  ['hk-cloud-mint', 'hookah', 'Cloud Mint', 400, 'Fresh cooling mint cloud.'],
  ['hk-cloud-mix-favor', 'hookah', 'Cloud Mix Favor', 500, 'Custom mixed-favour cloud session.'],
  ['hk-cloud-strawberry', 'hookah', 'Cloud Strawberry', 500, 'Juicy strawberry cloud hookah.'],
  ['hk-double-apple-normal', 'hookah', 'Double Apple (Normal)', 350, 'Timeless double apple, regular setup.'],
  ['hk-iced-pipe', 'hookah', 'Iced Pipe', 75, 'Cool iced-pipe session.'],
  ['hk-icy-mango-normal', 'hookah', 'Icy Mango (Normal)', 450, 'Menthol-chilled mango, regular setup.'],
  ['hk-mango-normal', 'hookah', 'Mango (Normal)', 350, 'Sweet mango, regular setup.'],
  ['hk-normal-coil', 'hookah', 'Normal Coil', 30, 'Quick regular coil session.'],
  ['hk-normal-lady-killer', 'hookah', 'Normal Lady Killer', 400, 'Lady Killer blend, regular setup.'],
  ['hk-normal-mint', 'hookah', 'Normal Mint', 350, 'Pure fresh mint, regular setup.'],
  // Lassi
  ['ls-banana', 'lassi', 'Banana Lassi', 140, 'Rich curd blended with fresh banana.', true, true],
  ['ls-plain', 'lassi', 'Plain Lassi', 110, 'Traditional creamy yoghurt lassi.', true],
  ['ls-sweet', 'lassi', 'Sweet Lassi', 130, 'Chilled sweetened yoghurt drink.', true],
  // Momo
  ['mm-c-chicken', 'momo', 'C Chicken Momo', 200, 'Chicken dumplings in sweet-spicy chilli sauce.'],
  ['mm-c-buff', 'momo', 'C. Buff Momo', 180, 'Buff momo in garlic chilli gravy.'],
  ['mm-chicken-kurkure', 'momo', 'Chicken Kurkure Momo', 240, 'Crunchy coated fried chicken momo.', false, true],
  ['mm-buff-kurkure', 'momo', 'Kurkure Buff Momo', 210, 'Crispy golden kurkure buff momo.'],
  ['mm-steam-chicken', 'momo', 'Steam Chicken Momo', 180, 'Juicy minced chicken steamed in thin dough.'],
  ['mm-steam-buff', 'momo', 'Steam Buff Momo', 160, 'Classic steamed buff momo.'],
  // Snacks
  ['sn-buff-sausage', 'snacks', 'Buff Sausage', 50, 'Grilled spiced buff sausage.'],
  ['sn-chau-chau-sadheko', 'snacks', 'Chau Chau Sadheko', 85, 'Spicy wok-tossed noodles.'],
  ['sn-chicken-lollipop', 'snacks', 'Chicken Lollipop', 120, 'Crispy golden chicken lollipops.', false, true],
  ['sn-chicken-sausage', 'snacks', 'Chicken Sausage', 60, 'Juicy grilled chicken sausage.'],
  ['sn-peanut-sadheko', 'snacks', 'Peanut Sadheko', 100, 'Spiced roasted peanuts.', true],
  // Special
  ['sp-butterfly-pea-tea', 'special', 'Butterfly Pea Tea', 180, 'Signature colour-shifting butterfly pea tea.', true, true],
  ['sp-egg-burger', 'special', 'Egg Burger', 80, 'Toasted bun with fried egg and cheese.', false, true],
  // Tea & Coffee
  ['tc-black-coffee', 'tea-coffee', 'Black Coffee', 50, 'Dark roast brewed black.', true],
  ['tc-black-tea', 'tea-coffee', 'Black Tea', 30, 'Strong classic black tea.', true],
  ['tc-honey-ginger', 'tea-coffee', 'Hot With Honey And Ginger', 100, 'Soothing ginger with mountain honey.', true],
  ['tc-hot-lemon', 'tea-coffee', 'Hot Lemon', 40, 'Fresh lemon in hot water.', true],
  ['tc-hot-lemon-honey', 'tea-coffee', 'Hot Lemon With Honey', 80, 'Warm lemon with organic honey.', true],
  ['tc-lemon-tea', 'tea-coffee', 'Lemon Tea', 40, 'Bright citrus lemon tea.', true],
  ['tc-masala-tea', 'tea-coffee', 'Masala Tea', 55, 'Milk tea with cardamom, ginger and cinnamon.', true, true],
  ['tc-milk-coffee', 'tea-coffee', 'Milk Coffee', 90, 'Creamy steamed-milk coffee.', true],
  ['tc-milk-tea', 'tea-coffee', 'Milk Tea', 40, 'Comforting sweet milk tea.', true],
  ['tc-peach-tea', 'tea-coffee', 'Peach Tea', 70, 'Fragrant peach tea.', true]
];

async function seedMenuIfEmpty(client) {
  const existing = await client.query(`
    SELECT COUNT(*)::INTEGER AS count
    FROM menu_items
  `);

  if (existing.rows[0].count > 0) {
    console.log(
      `[DATABASE] Menu already has ${existing.rows[0].count} items; skipping seed.`
    );
    return;
  }

  for (const row of MENU_SEED) {
    const [
      id,
      cat,
      name,
      price,
      desc,
      veg,
      featured
    ] = row;

    await client.query(
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
        VALUES ($1, $2, $3, $4, $5, '', $6, $7, TRUE)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        id,
        cat,
        name,
        price,
        desc || '',
        Boolean(veg),
        Boolean(featured)
      ]
    );
  }

  console.log(
    `[DATABASE] Seeded ${MENU_SEED.length} menu items.`
  );
}

/* ==========================================================================
   INITIALIZE DATABASE
   ========================================================================== */

async function initDatabase() {
  const client = await pool.connect();

  try {
    console.log('[DATABASE] Initializing PostgreSQL...');

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

    /*
     * These make the database compatible with an older installation
     * where the table may already exist.
     */
    await client.query(`
      ALTER TABLE reservations
      ADD COLUMN IF NOT EXISTS email_sent BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await client.query(`
      ALTER TABLE reservations
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      ALTER TABLE menu_items
      ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE menu_items
      ADD COLUMN IF NOT EXISTS photo TEXT NOT NULL DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE menu_items
      ADD COLUMN IF NOT EXISTS veg BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await client.query(`
      ALTER TABLE menu_items
      ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await client.query(`
      ALTER TABLE menu_items
      ADD COLUMN IF NOT EXISTS in_stock BOOLEAN NOT NULL DEFAULT TRUE
    `);

    await client.query(`
      ALTER TABLE menu_items
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

    await client.query(`
      ALTER TABLE menu_items
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
       SEED FULL MENU
       ---------------------------------------------------------------------- */

    await seedMenuIfEmpty(client);

    /* ----------------------------------------------------------------------
       ADMIN USER
       ---------------------------------------------------------------------- */


    const adminUsername = cleanString(
      process.env.ADMIN_USERNAME || 'admin',
      100
    ).toLowerCase();

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      throw new Error(
        '[DATABASE] ADMIN_PASSWORD is missing.'
      );
    }

    if (adminPassword.length < 8) {
      throw new Error(
        '[DATABASE] ADMIN_PASSWORD must contain at least 8 characters.'
      );
    }

    const existingAdmin = await client.query(
      `
        SELECT id
        FROM users
        WHERE username = $1
        LIMIT 1
      `,
      [adminUsername]
    );

    if (existingAdmin.rowCount === 0) {
      const passwordHash = await bcrypt.hash(
        adminPassword,
        12
      );

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
        `[DATABASE] Admin "${adminUsername}" created.`
      );
    } else {
      console.log(
        `[DATABASE] Admin "${adminUsername}" already exists.`
      );
    }

    await client.query('COMMIT');

    console.log(
      '[DATABASE] PostgreSQL initialized successfully.'
    );

    return true;
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
   RESERVATION HELPERS
   ========================================================================== */

const reservationHelpers = {
  async create(reservation) {
    const result = await pool.query(
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
        cleanString(reservation.name, 200),
        cleanString(reservation.phone, 50),
        reservation.guests,
        reservation.date,
        cleanString(reservation.time, 100),
        cleanString(
          reservation.occasion || 'Regular Visit',
          200
        ),
        cleanString(reservation.notes || '', 500),
        reservation.status || 'Pending'
      ]
    );

    return result.rows[0];
  },

  async getAll() {
    const result = await pool.query(`
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
    const result = await pool.query(`
      SELECT COUNT(*)::INTEGER AS count
      FROM reservations
    `);

    return result.rows[0].count;
  },

  async countPending() {
    const result = await pool.query(`
      SELECT COUNT(*)::INTEGER AS count
      FROM reservations
      WHERE status = 'Pending'
    `);

    return result.rows[0].count;
  },

  async getById(id) {
    const result = await pool.query(
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
    const result = await pool.query(
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
    const result = await pool.query(
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
    const result = await pool.query(
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
    const result = await pool.query(`
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
    const result = await pool.query(
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
    const result = await pool.query(`
      SELECT COUNT(*)::INTEGER AS count
      FROM menu_items
    `);

    return result.rows[0].count;
  },

  async upsert(item) {
    const id =
      item.id ||
      makeId('menu');

    const result = await pool.query(
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
          in_stock AS "inStock",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        id,
        cleanString(item.cat, 100),
        cleanString(item.name, 200),
        Number(item.price) || 0,
        cleanString(item.desc || item.description, 500),
        cleanString(item.photo, 3000000),
        Boolean(item.veg),
        Boolean(item.featured),
        item.inStock !== false
      ]
    );

    return result.rows[0];
  },

  async toggleStock(id) {
    const result = await pool.query(
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
          in_stock AS "inStock",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [id]
    );

    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await pool.query(
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
    const result = await pool.query(
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
      [
        cleanString(username, 100).toLowerCase()
      ]
    );

    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await pool.query(
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
    const result = await pool.query(
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
  initDatabase: initDatabase,
  testDatabase: testDatabase,
  reservationHelpers: reservationHelpers,
  menuHelpers: menuHelpers,
  userHelpers: userHelpers
};
module.exports.default = module.exports;
