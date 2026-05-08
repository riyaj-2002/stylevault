import crypto from 'crypto';
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.FROM_EMAIL;
const OWNER = process.env.OWNER_EMAIL;
const SITE = 'https://stylevault.live';

function actionToken(order_id, action) {
  return crypto.createHmac('sha256', process.env.ADMIN_SECRET)
    .update(`${order_id}:${action}`).digest('hex');
}

async function sendEmail(to, subject, html) {
  if (!to || !FROM) {
    console.error('sendEmail: missing to:', to, 'FROM:', FROM);
    return;
  }
  console.log('sendEmail: attempting to send to:', to, 'subject:', subject, 'from:', FROM);
  const result = await resend.emails.send({ from: FROM, to, subject, html });
  if (result.error) {
    console.error('Resend error:', JSON.stringify(result.error));
  } else {
    console.log('Resend success, id:', result.data?.id);
  }
}

const btn = (text, url, color = '#9575cd') =>
  `<a href="${url}" style="display:inline-block;margin-top:20px;background:${color};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem;">${text}</a>`;

const footer = `<p style="color:#aaa;font-size:0.82rem;margin-top:28px;border-top:1px solid #f0eaf8;padding-top:14px;">StyleVault — express yourself, one case at a time.</p>`;

// ─── CUSTOMER EMAILS ─────────────────────────────────────────────

async function emailWelcome(to, name) {
  await sendEmail(to, '🎉 Welcome to StyleVault!', `
    <div style="font-family:Segoe UI,sans-serif;max-width:520px;margin:auto;padding:30px;background:#fff;border-radius:12px;border:1px solid #e8e0f0">
      <h2 style="color:#9575cd">Welcome to StyleVault, ${name}! 🎉</h2>
      <p style="color:#555;line-height:1.8">You've successfully registered. We're so glad you're here!</p>
      <p style="color:#555;line-height:1.8">Browse our collections and find a case that's truly <strong>you</strong>.</p>
      ${btn('Shop Now →', `${SITE}/collections.html`)}
      ${footer}
    </div>
  `);
}

async function emailOrderPlaced(to, name, order_id, items, address, subtotal, shipping) {
  const itemsHTML = items.map(i => `
    <tr>
      <td style="padding:8px 0;color:#3a2a4a;font-size:0.9rem">${i.product_name}</td>
      <td style="padding:8px 0;color:#555;font-size:0.9rem;text-align:center">${i.quantity}</td>
      <td style="padding:8px 0;color:#9575cd;font-weight:700;font-size:0.9rem;text-align:right">₹${(i.price * i.quantity).toFixed(2)}</td>
    </tr>
  `).join('');
  const total = parseFloat(subtotal) + parseFloat(shipping || 0);
  await sendEmail(to, `📦 Order Placed — StyleVault #${order_id}`, `
    <div style="font-family:Segoe UI,sans-serif;max-width:520px;margin:auto;padding:30px;background:#fff;border-radius:12px;border:1px solid #e8e0f0">
      <h2 style="color:#9575cd">Order Placed Successfully! 📦</h2>
      <p style="color:#555">Hi ${name}, we've received your order. We'll notify you once payment is confirmed.</p>
      <p style="color:#555"><strong>Order ID:</strong> #${order_id}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="border-bottom:2px solid #e8e0f0">
          <th style="text-align:left;padding:8px 0;color:#3a2a4a;font-size:0.85rem">Item</th>
          <th style="text-align:center;padding:8px 0;color:#3a2a4a;font-size:0.85rem">Qty</th>
          <th style="text-align:right;padding:8px 0;color:#3a2a4a;font-size:0.85rem">Price</th>
        </tr>
        ${itemsHTML}
        <tr style="border-top:2px solid #e8e0f0">
          <td colspan="2" style="padding:8px 0;color:#555;font-size:0.9rem">Shipping</td>
          <td style="padding:8px 0;color:${shipping > 0 ? '#e53935' : '#4caf50'};font-weight:700;text-align:right;font-size:0.9rem">${shipping > 0 ? '₹' + shipping : 'Free'}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:8px 0;color:#3a2a4a;font-weight:700">Total</td>
          <td style="padding:8px 0;color:#9575cd;font-weight:700;text-align:right">₹${total.toFixed(2)}</td>
        </tr>
      </table>
      <div style="background:#f3eeff;border-radius:10px;padding:14px;margin-top:8px">
        <p style="color:#3a2a4a;font-weight:700;margin:0 0 6px">Shipping To:</p>
        <p style="color:#555;margin:0;line-height:1.8;font-size:0.9rem">
          ${address.name}<br>${address.mobile ? '+91 ' + address.mobile + '<br>' : ''}
          ${address.address1}<br>${address.address2 ? address.address2 + '<br>' : ''}
          ${address.city}, ${address.state} — ${address.pincode}<br>${address.country}
        </p>
      </div>
      ${btn('Continue Shopping →', `${SITE}/collections.html`)}
      ${footer}
    </div>
  `);
}

async function emailPaymentConfirmed(to, name, order_id, total) {
  await sendEmail(to, `✅ Payment Confirmed — StyleVault #${order_id}`, `
    <div style="font-family:Segoe UI,sans-serif;max-width:520px;margin:auto;padding:30px;background:#fff;border-radius:12px;border:1px solid #e8e0f0">
      <h2 style="color:#4caf50">Payment Confirmed! ✅</h2>
      <p style="color:#555">Hi ${name}, we've confirmed your payment of <strong>₹${total}</strong> for Order <strong>#${order_id}</strong>.</p>
      <p style="color:#555">Your order is now being prepared and will be shipped soon!</p>
      ${btn('Shop More →', `${SITE}/collections.html`, '#4caf50')}
      ${footer}
    </div>
  `);
}

async function emailOutForShipping(to, name, order_id) {
  await sendEmail(to, `🚚 Your Order is Out for Shipping — #${order_id}`, `
    <div style="font-family:Segoe UI,sans-serif;max-width:520px;margin:auto;padding:30px;background:#fff;border-radius:12px;border:1px solid #e8e0f0">
      <h2 style="color:#9575cd">Your Order is On the Way! 🚚</h2>
      <p style="color:#555">Hi ${name}, your StyleVault order <strong>#${order_id}</strong> has been shipped!</p>
      <p style="color:#555">Expected delivery: <strong>5–7 business days</strong></p>
      <p style="color:#555">For queries, reach us at <a href="mailto:stylevault.0426@gmail.com" style="color:#9575cd">stylevault.0426@gmail.com</a> or <a href="https://instagram.com/stylevault_4" style="color:#9575cd">@stylevault_4</a></p>
      ${btn('Visit StyleVault →', `${SITE}/index.html`)}
      ${footer}
    </div>
  `);
}

async function emailDelivered(to, name, order_id) {
  await sendEmail(to, `📦 Order Delivered — StyleVault #${order_id}`, `
    <div style="font-family:Segoe UI,sans-serif;max-width:520px;margin:auto;padding:30px;background:#fff;border-radius:12px;border:1px solid #e8e0f0">
      <h2 style="color:#9575cd">Your Order Has Been Delivered! 📦</h2>
      <p style="color:#555">Hi ${name}, your StyleVault order <strong>#${order_id}</strong> has been delivered. We hope you love it!</p>
      <p style="color:#555">If there's any issue, contact us within <strong>48 hours</strong> with an unboxing video.</p>
      <p style="color:#555">Thank you for shopping with StyleVault 💜</p>
      ${btn('Shop Again →', `${SITE}/collections.html`)}
      ${footer}
    </div>
  `);
}

// ─── OWNER NOTIFICATIONS ─────────────────────────────────────────

async function notifyOwnerRegister(name, email) {
  await sendEmail(OWNER, `🆕 New Registration — ${name}`, `
    <div style="font-family:Segoe UI,sans-serif;max-width:520px;margin:auto;padding:30px;background:#fff;border-radius:12px;border:1px solid #e8e0f0">
      <h2 style="color:#9575cd">New Customer Registered 🆕</h2>
      <p style="color:#555"><strong>Name:</strong> ${name}</p>
      <p style="color:#555"><strong>Email:</strong> ${email}</p>
      ${btn('View on Neon →', 'https://console.neon.tech', '#3a2a4a')}
      ${footer}
    </div>
  `);
}

async function notifyOwnerLogin(name, email) {
  await sendEmail(OWNER, `🔐 Customer Login — ${name}`, `
    <div style="font-family:Segoe UI,sans-serif;max-width:520px;margin:auto;padding:30px;background:#fff;border-radius:12px;border:1px solid #e8e0f0">
      <h2 style="color:#9575cd">Customer Logged In 🔐</h2>
      <p style="color:#555"><strong>Name:</strong> ${name}</p>
      <p style="color:#555"><strong>Email:</strong> ${email}</p>
      ${btn('View Website →', `${SITE}/index.html`, '#3a2a4a')}
      ${footer}
    </div>
  `);
}

async function notifyOwnerOrder(order_id, user, items, address, subtotal, shipping) {
  const itemsHTML = items.map(i => `<li style="color:#555;font-size:0.9rem;margin-bottom:6px">${i.product_name} x${i.quantity} — ₹${(i.price * i.quantity).toFixed(2)}</li>`).join('');
  const total = parseFloat(subtotal) + parseFloat(shipping || 0);
  const BASE = `https://stylevault.live/api/order-action?order_id=${order_id}`;
  const shipToken = actionToken(order_id, 'ship');
  await sendEmail(OWNER, `🛒 New Order #${order_id} — ₹${total.toFixed(2)}`, `
    <div style="font-family:Segoe UI,sans-serif;max-width:520px;margin:auto;padding:30px;background:#fff;border-radius:12px;border:1px solid #e8e0f0">
      <h2 style="color:#9575cd">New Order Received 🛒</h2>
      <p style="color:#555"><strong>Order ID:</strong> #${order_id}</p>
      <p style="color:#555"><strong>Customer:</strong> ${user.name} (${user.email})</p>
      <p style="color:#3a2a4a;font-weight:700;margin-top:16px">Items:</p>
      <ul style="padding-left:18px">${itemsHTML}</ul>
      <p style="color:#555"><strong>Shipping:</strong> ${shipping > 0 ? '₹' + shipping : 'Free'}</p>
      <p style="color:#9575cd;font-weight:700;font-size:1.1rem">Total: ₹${total.toFixed(2)}</p>
      <div style="background:#f3eeff;border-radius:10px;padding:14px;margin-top:8px">
        <p style="color:#3a2a4a;font-weight:700;margin:0 0 6px">Ship To:</p>
        <p style="color:#555;margin:0;line-height:1.8;font-size:0.9rem">
          ${address.name}<br>${address.mobile ? '+91 ' + address.mobile + '<br>' : ''}
          ${address.address1}<br>${address.address2 ? address.address2 + '<br>' : ''}
          ${address.city}, ${address.state} — ${address.pincode}<br>${address.country}
        </p>
      </div>
      <div style="margin-top:24px">
        <a href="${BASE}&action=ship&token=${shipToken}" style="display:inline-block;text-align:center;background:#1565c0;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem">🚚 Mark as Shipped</a>
      </div>
      ${footer}
    </div>
  `);
}

async function notifyOwnerPaymentConfirmed(order_id, name, email, total) {
  const BASE = `https://stylevault.live/api/order-action?order_id=${order_id}`;
  const shipToken = actionToken(order_id, 'ship');
  const deliverToken = actionToken(order_id, 'deliver');
  await sendEmail(OWNER, `💰 Payment Confirmed — Order #${order_id}`, `
    <div style="font-family:Segoe UI,sans-serif;max-width:520px;margin:auto;padding:30px;background:#fff;border-radius:12px;border:1px solid #e8e0f0">
      <h2 style="color:#4caf50">Payment Confirmed 💰</h2>
      <p style="color:#555"><strong>Order ID:</strong> #${order_id}</p>
      <p style="color:#555"><strong>Customer:</strong> ${name} (${email})</p>
      <p style="color:#9575cd;font-weight:700;font-size:1.1rem">Amount: ₹${total}</p>
      <div style="margin-top:24px;display:flex;gap:12px">
        <a href="${BASE}&action=ship&token=${shipToken}" style="flex:1;display:inline-block;text-align:center;background:#1565c0;color:#fff;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem">🚚 Mark as Shipped</a>
        <a href="${BASE}&action=deliver&token=${deliverToken}" style="flex:1;display:inline-block;text-align:center;background:#6a1b9a;color:#fff;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem">📦 Mark as Delivered</a>
      </div>
      ${footer}
    </div>
  `);
}

export {
  emailWelcome,
  emailOrderPlaced,
  emailPaymentConfirmed,
  emailOutForShipping,
  emailDelivered,
  notifyOwnerRegister,
  notifyOwnerLogin,
  notifyOwnerOrder,
  notifyOwnerPaymentConfirmed
};
