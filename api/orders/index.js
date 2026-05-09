import { getDB } from '../../lib/db.js';
import { getUserFromRequest } from '../../lib/auth.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  const sql = getDB();
  const parts = req.url.split('?')[0].split('/').filter(Boolean);

  // ── Customize routes (user session, no admin token needed) ──────────────
  if (parts.includes('customize') && req.method === 'POST') {
    const user = getUserFromRequest(req);
    if (!user) return res.status(401).json({ success: false, message: 'Not logged in' });

    const { type, phone_brand, phone_model, case_material, price,
            design_id, design_name, modifications } = req.body;

    await sql`
      CREATE TABLE IF NOT EXISTS customize_type1 (
        id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL,
        user_name TEXT, user_email TEXT,
        phone_brand TEXT NOT NULL, phone_model TEXT NOT NULL,
        case_material TEXT NOT NULL, price INTEGER NOT NULL,
        status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS customize_type2 (
        id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL,
        user_name TEXT, user_email TEXT,
        design_id INTEGER, design_name TEXT,
        phone_brand TEXT NOT NULL, phone_model TEXT NOT NULL,
        case_material TEXT NOT NULL, modifications TEXT,
        price INTEGER NOT NULL, status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    try {
      if (type === '1') {
        if (!phone_brand || !phone_model || !case_material || !price)
          return res.status(400).json({ success: false, message: 'Missing required fields' });
        const [row] = await sql`
          INSERT INTO customize_type1 (user_id, user_name, user_email, phone_brand, phone_model, case_material, price)
          VALUES (${user.id}, ${user.name}, ${user.email}, ${phone_brand}, ${phone_model}, ${case_material}, ${price})
          RETURNING id
        `;
        return res.json({ success: true, id: row.id });
      }
      if (type === '2') {
        if (!phone_brand || !phone_model || !case_material || !price)
          return res.status(400).json({ success: false, message: 'Missing required fields' });
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

  // ── Admin-only order routes ─────────────────────────────────────────────────
  const adminToken = req.headers['x-admin-secret'];
  if (!adminToken || adminToken !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    if (parts.length === 2) {
      const orders = await sql`
        SELECT o.id, o.total, o.shipping, o.status, o.created_at, u.name, u.email
        FROM orders o JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `;
      return res.json({ success: true, orders });
    }

    const id = parts[2];

    if (parts[3] === 'items') {
      const items = await sql`SELECT * FROM order_items WHERE order_id = ${id}`;
      return res.json({ success: true, items });
    }

    if (parts[3] === 'address') {
      const [order] = await sql`SELECT user_id FROM orders WHERE id = ${id}`;
      if (!order) return res.json({ success: false });
      const [address] = await sql`SELECT * FROM addresses WHERE user_id = ${order.user_id} ORDER BY created_at DESC LIMIT 1`;
      return res.json({ success: true, address });
    }

    return res.status(404).json({ success: false, message: 'Not found' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
