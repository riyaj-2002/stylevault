require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cart (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        product_id INT,
        product_name VARCHAR(200),
        price DECIMAL(10,2),
        quantity INT DEFAULT 1,
        image VARCHAR(255),
        phone_brand VARCHAR(100),
        phone_model VARCHAR(100),
        case_material VARCHAR(50)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100),
        mobile VARCHAR(15),
        address1 VARCHAR(200),
        address2 VARCHAR(200),
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        country VARCHAR(100),
        landmark VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        total DECIMAL(10,2),
        shipping DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        razorpay_order_id VARCHAR(100),
        razorpay_payment_id VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id) ON DELETE CASCADE,
        product_id INT,
        product_name VARCHAR(200),
        price DECIMAL(10,2),
        quantity INT,
        image VARCHAR(255),
        phone_brand VARCHAR(100),
        phone_model VARCHAR(100),
        case_material VARCHAR(50)
      )
    `);

    // Add new columns to existing tables if they don't exist yet
    await client.query(`ALTER TABLE cart ADD COLUMN IF NOT EXISTS phone_brand VARCHAR(100)`);
    await client.query(`ALTER TABLE cart ADD COLUMN IF NOT EXISTS phone_model VARCHAR(100)`);
    await client.query(`ALTER TABLE cart ADD COLUMN IF NOT EXISTS case_material VARCHAR(50)`);
    await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS phone_brand VARCHAR(100)`);
    await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS phone_model VARCHAR(100)`);
    await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS case_material VARCHAR(50)`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100)`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100)`);
    // UNIQUE constraint for idempotency — prevents double-processing same payment
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'orders_razorpay_payment_id_key'
        ) THEN
          ALTER TABLE orders ADD CONSTRAINT orders_razorpay_payment_id_key UNIQUE (razorpay_payment_id);
        END IF;
      END $$
    `);

    console.log('Neon DB connected & all tables ready');
  } catch (err) {
    console.error('DB init error:', err);
  } finally {
    client.release();
  }
}

initDB();

module.exports = pool;
