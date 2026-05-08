import crypto from 'crypto';
import { getDB } from '../lib/db.js';
import { emailOutForShipping, emailDelivered } from '../utils/email.js';

export const config = { runtime: 'nodejs' };

function makeToken(order_id, action) {
  return crypto.createHmac('sha256', process.env.ADMIN_SECRET)
    .update(`${order_id}:${action}`).digest('hex');
}

export { makeToken };

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const token = url.searchParams.get('token');
  const action = url.searchParams.get('action');
  const order_id = url.searchParams.get('order_id');

  if (!token || !order_id || !['ship', 'deliver'].includes(action)) {
    return res.status(400).send(page('❌ Invalid', 'Missing parameters.', '#e53935'));
  }

  const expected = makeToken(order_id, action);
  if (token !== expected) {
    return res.status(403).send(page('❌ Forbidden', 'Invalid or missing token.', '#e53935'));
  }

  const statusMap = { ship: 'shipped', deliver: 'delivered' };
  const newStatus = statusMap[action];
  const sql = getDB();

  const [order] = await sql`
    SELECT o.*, u.name, u.email FROM orders o
    JOIN users u ON o.user_id = u.id WHERE o.id = ${order_id}
  `;

  if (!order) return res.status(404).send(page('❌ Not Found', `Order #${order_id} not found.`, '#e53935'));

  // Guard: don't allow going backwards
  if (action === 'ship' && order.status !== 'paid') {
    return res.send(page('⚠️ Already Updated', `Order #${order_id} is already <strong>${order.status}</strong>.`, '#f57c00'));
  }
  if (action === 'deliver' && order.status !== 'shipped') {
    return res.send(page('⚠️ Already Updated', `Order #${order_id} is already <strong>${order.status}</strong>.`, '#f57c00'));
  }

  await sql`UPDATE orders SET status = ${newStatus} WHERE id = ${order_id}`;

  try {
    if (action === 'ship') await emailOutForShipping(order.email, order.name, order_id);
    else await emailDelivered(order.email, order.name, order_id);
  } catch (e) {
    console.error('Email failed:', e.message);
  }

  const label = action === 'ship' ? '🚚 Marked as Shipped' : '📦 Marked as Delivered';
  return res.send(page(label, `Order <strong>#${order_id}</strong> for <strong>${order.name}</strong> is now <strong>${newStatus}</strong>.<br><br>Customer email sent successfully.`, '#4caf50'));
}

function page(title, msg, color) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title></head>
  <body style="font-family:Segoe UI,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f0eb;margin:0">
    <div style="background:#fff;border-radius:16px;padding:40px 36px;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <h2 style="color:${color};margin-bottom:14px">${title}</h2>
      <p style="color:#555;line-height:1.8">${msg}</p>
      <a href="https://stylevault.live/admin.html" style="display:inline-block;margin-top:20px;background:#5D4037;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">View All Orders</a>
    </div>
  </body></html>`;
}
