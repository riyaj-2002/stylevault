import { getDB } from '../../lib/db.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const sql = getDB();
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean); // ['api','orders','5','items']

  try {
    // GET /api/orders
    if (parts.length === 2) {
      const orders = await sql`
        SELECT o.id, o.total, o.shipping, o.status, o.created_at, u.name, u.email
        FROM orders o JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `;
      return Response.json({ success: true, orders });
    }

    const id = parts[2];

    // GET /api/orders/:id/items
    if (parts[3] === 'items') {
      const items = await sql`SELECT * FROM order_items WHERE order_id = ${id}`;
      return Response.json({ success: true, items });
    }

    // GET /api/orders/:id/address
    if (parts[3] === 'address') {
      const [order] = await sql`SELECT user_id FROM orders WHERE id = ${id}`;
      if (!order) return Response.json({ success: false });
      const [address] = await sql`SELECT * FROM addresses WHERE user_id = ${order.user_id} ORDER BY created_at DESC LIMIT 1`;
      return Response.json({ success: true, address });
    }

    return Response.json({ success: false, message: 'Not found' }, { status: 404 });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
