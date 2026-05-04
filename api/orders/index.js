import { getDB } from '../../lib/db.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  const adminToken = req.headers['x-admin-secret'];
  if (!adminToken || adminToken !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const sql = getDB();
  const parts = req.url.split('?')[0].split('/').filter(Boolean);

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
