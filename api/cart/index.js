import { getDB } from '../../lib/db.js';
import { getUserFromRequest } from '../../lib/auth.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, message: 'Not logged in' });

  const sql = getDB();
  const action = req.url.split('?')[0].split('/').pop();

  try {
    if (req.method === 'GET') {
      const cart = await sql`SELECT * FROM cart WHERE user_id = ${user.id}`;
      return res.json({ success: true, cart });
    }

    const body = req.body;

    if (action === 'add') {
      const { product_id, product_name, price, image } = body;
      const existing = await sql`SELECT * FROM cart WHERE user_id = ${user.id} AND product_id = ${product_id}`;
      if (existing.length > 0) {
        await sql`UPDATE cart SET quantity = quantity + 1 WHERE user_id = ${user.id} AND product_id = ${product_id}`;
      } else {
        await sql`INSERT INTO cart (user_id, product_id, product_name, price, image) VALUES (${user.id}, ${product_id}, ${product_name}, ${price}, ${image})`;
      }
      return res.json({ success: true });
    }

    if (action === 'remove') {
      await sql`DELETE FROM cart WHERE user_id = ${user.id} AND product_id = ${body.product_id}`;
      return res.json({ success: true });
    }

    if (action === 'clear') {
      await sql`DELETE FROM cart WHERE user_id = ${user.id}`;
      return res.json({ success: true });
    }

    return res.json({ success: false, message: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
