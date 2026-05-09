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
  let action, order_id, authorized = false;

  if (req.method === 'POST') {
    // Admin panel: verify x-admin-secret header
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret && adminSecret === process.env.ADMIN_SECRET) authorized = true;
    action = req.body?.action;
    order_id = req.body?.order_id;
  } else {
    // Email links: verify HMAC token in query string
    const url = new URL(req.url, `https://${req.headers.host}`);
    const token = url.searchParams.get('token');
    action = url.searchParams.get('action');
    order_id = url.searchParams.get('order_id');
    if (token && order_id && action && token === makeToken(order_id, action)) authorized = true;
  }

  if (!authorized) {
    const html = req.method === 'GET';
    return res.status(403)[html ? 'send' : 'json'](
      html ? page('❌ Forbidden', 'Invalid or missing token.', '#e53935')
           : { success: false, message: 'Forbidden' }
    );
  }

  if (!order_id || !['ship', 'deliver'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Missing order_id or action' });
  }

  const statusMap = { ship: 'shipped', deliver: 'delivered' };
  const newStatus = statusMap[action];
  const sql = getDB();

  const [order] = await sql`
    SELECT o.*, u.name, u.email FROM orders o
    JOIN users u ON o.user_id = u.id WHERE o.id = ${order_id}
  `;

  if (!order) {
    const isPost = req.method === 'POST';
    return res.status(404)[isPost ? 'json' : 'send'](
      isPost ? { success: false, message: 'Order not found' } : page('❌ Not Found', `Order #${order_id} not found.`, '#e53935')
    );
  }

  const isPost = req.method === 'POST';

  if (action === 'ship' && order.status !== 'paid') {
    return res[isPost ? 'json' : 'send'](
      isPost ? { success: false, message: `Order is already ${order.status}` } : page('⚠️ Already Updated', `Order #${order_id} is already <strong>${order.status}</strong>.`, '#f57c00')
    );
  }
  if (action === 'deliver' && order.status !== 'shipped') {
    return res[isPost ? 'json' : 'send'](
      isPost ? { success: false, message: `Order is already ${order.status}` } : page('⚠️ Already Updated', `Order #${order_id} is already <strong>${order.status}</strong>.`, '#f57c00')
    );
  }

  await sql`UPDATE orders SET status = ${newStatus} WHERE id = ${order_id}`;

  try {
    if (action === 'ship') await emailOutForShipping(order.email, order.name, order_id);
    else await emailDelivered(order.email, order.name, order_id);
  } catch (e) {
    console.error('Email failed:', e.message);
  }

  const label = action === 'ship' ? '🚚 Marked as Shipped' : '📦 Marked as Delivered';
  return res[isPost ? 'json' : 'send'](
    isPost ? { success: true, status: newStatus } : page(label, `Order <strong>#${order_id}</strong> for <strong>${order.name}</strong> is now <strong>${newStatus}</strong>.<br><br>Customer email sent successfully.`, '#4caf50')
  );
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
