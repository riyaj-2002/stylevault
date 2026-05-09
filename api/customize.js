import { getDB } from '../lib/db.js';
import { getUserFromRequest } from '../lib/auth.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, message: 'Not logged in' });

  const { type } = req.body;
  const sql = getDB();

  // ── Create tables if not exist ────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS customize_type1 (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL,
      user_name     TEXT,
      user_email    TEXT,
      phone_brand   TEXT NOT NULL,
      phone_model   TEXT NOT NULL,
      case_material TEXT NOT NULL,
      price         INTEGER NOT NULL,
      status        TEXT DEFAULT 'pending',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS customize_type2 (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL,
      user_name     TEXT,
      user_email    TEXT,
      design_id     INTEGER,
      design_name   TEXT,
      phone_brand   TEXT NOT NULL,
      phone_model   TEXT NOT NULL,
      case_material TEXT NOT NULL,
      modifications TEXT,
      price         INTEGER NOT NULL,
      status        TEXT DEFAULT 'pending',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  try {
    if (type === '1') {
      const { phone_brand, phone_model, case_material, price } = req.body;
      if (!phone_brand || !phone_model || !case_material || !price) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      const [row] = await sql`
        INSERT INTO customize_type1 (user_id, user_name, user_email, phone_brand, phone_model, case_material, price)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${phone_brand}, ${phone_model}, ${case_material}, ${price})
        RETURNING id
      `;
      return res.json({ success: true, id: row.id });
    }

    if (type === '2') {
      const { design_id, design_name, phone_brand, phone_model, case_material, modifications, price } = req.body;
      if (!phone_brand || !phone_model || !case_material || !price) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      const [row] = await sql`
        INSERT INTO customize_type2 (user_id, user_name, user_email, design_id, design_name, phone_brand, phone_model, case_material, modifications, price)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${design_id || null}, ${design_name || null}, ${phone_brand}, ${phone_model}, ${case_material}, ${modifications || null}, ${price})
        RETURNING id
      `;
      return res.json({ success: true, id: row.id });
    }

    return res.status(400).json({ success: false, message: 'Invalid type' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
