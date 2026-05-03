import { getDB } from '../../lib/db.js';
import { emailPaymentConfirmed, emailOutForShipping, emailDelivered, notifyOwnerPaymentConfirmed } from '../../utils/email.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Admin-only: verify secret token ──────────────────────────────────────
  const adminToken = req.headers['x-admin-secret'];
  if (!adminToken || adminToken !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { order_id, action } = req.body;
  if (!order_id || !action) return res.status(400).json({ success: false });

  const statusMap = { ship: 'shipped', deliver: 'delivered' };
  const status = statusMap[action];
  // 'confirm' (paid) is intentionally excluded — only webhook can set 'paid'
  if (!status) return res.status(400).json({ success: false, message: 'Invalid action' });

  const sql = getDB();
  try {
    await sql`UPDATE orders SET status = ${status} WHERE id = ${order_id}`;
    const [order] = await sql`
      SELECT o.*, u.name, u.email FROM orders o
      JOIN users u ON o.user_id = u.id WHERE o.id = ${order_id}
    `;

    try {
      if (action === 'ship') await emailOutForShipping(order.email, order.name, order_id);
      else if (action === 'deliver') await emailDelivered(order.email, order.name, order_id);
    } catch (emailErr) {
      console.error('Email failed (non-fatal):', emailErr.message);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
