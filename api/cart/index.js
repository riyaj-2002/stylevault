import { getDB } from '../../lib/db.js';
import { getUserFromRequest } from '../../lib/auth.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req) {
  const user = getUserFromRequest(req);
  if (!user) return Response.json({ success: false, message: 'Not logged in' }, { status: 401 });

  const sql = getDB();
  const url = req.url.split('?')[0];
  const action = url.split('/').pop();

  try {
    // GET /api/cart
    if (req.method === 'GET') {
      const cart = await sql`SELECT * FROM cart WHERE user_id = ${user.id}`;
      return Response.json({ success: true, cart });
    }

    const body = await req.json();

    // POST /api/cart/add
    if (action === 'add') {
      const { product_id, product_name, price, image } = body;
      const existing = await sql`SELECT * FROM cart WHERE user_id = ${user.id} AND product_id = ${product_id}`;
      if (existing.length > 0) {
        await sql`UPDATE cart SET quantity = quantity + 1 WHERE user_id = ${user.id} AND product_id = ${product_id}`;
      } else {
        await sql`INSERT INTO cart (user_id, product_id, product_name, price, image) VALUES (${user.id}, ${product_id}, ${product_name}, ${price}, ${image})`;
      }
      return Response.json({ success: true });
    }

    // POST /api/cart/remove
    if (action === 'remove') {
      await sql`DELETE FROM cart WHERE user_id = ${user.id} AND product_id = ${body.product_id}`;
      return Response.json({ success: true });
    }

    // POST /api/cart/clear
    if (action === 'clear') {
      await sql`DELETE FROM cart WHERE user_id = ${user.id}`;
      return Response.json({ success: true });
    }

    return Response.json({ success: false, message: 'Unknown action' });
  } catch (err) {
    return Response.json({ success: false, message: err.message });
  }
}
