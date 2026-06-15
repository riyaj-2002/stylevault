import crypto from 'crypto';
import { getDB } from '../lib/db.js';
import { getRawBody } from '../lib/rawBody.js';
import { emailOrderPlaced, notifyOwnerOrder } from '../utils/email.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── 1. Verify Razorpay webhook signature ──────────────────────────────────
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing signature' });

  // Collect raw body bytes — required for HMAC to match exactly
  const rawBody = await getRawBody(req);
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const sigBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // ── 2. Parse event ────────────────────────────────────────────────────────
  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (event.event !== 'payment.captured') {
    return res.status(200).json({ received: true }); // Acknowledge non-payment events
  }

  const payment = event.payload?.payment?.entity;
  if (!payment) return res.status(400).json({ error: 'Missing payment entity' });

  const { id: razorpay_payment_id, order_id: razorpay_order_id, amount, status } = payment;

  if (status !== 'captured') return res.status(200).json({ received: true });

  const sql = getDB();

  // ── 3. Idempotency — reject duplicate payment_id ──────────────────────────
  const [existing] = await sql`
    SELECT id FROM orders WHERE razorpay_payment_id = ${razorpay_payment_id}
  `;
  if (existing) return res.status(200).json({ received: true, duplicate: true });

  // ── 4. Find order by razorpay_order_id and validate amount ────────────────
  const [order] = await sql`
    SELECT o.*, u.name, u.email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.razorpay_order_id = ${razorpay_order_id}
  `;

  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Validate: amount paid must match order total (amount is in paise)
  const expectedPaise = Math.round(parseFloat(order.total) * 100);
  if (amount !== expectedPaise) {
    console.error(`Amount mismatch: expected ${expectedPaise}, got ${amount} for order ${order.id}`);
    return res.status(400).json({ error: 'Amount mismatch' });
  }

  // ── 5. Mark order as paid — ONLY here, never from frontend ───────────────
  await sql`
    UPDATE orders
    SET status = 'paid', razorpay_payment_id = ${razorpay_payment_id}
    WHERE id = ${order.id} AND status = 'pending'
  `;

  // ── 5a. Clear cart now that payment is confirmed ──────────────────────────
  await sql`DELETE FROM cart WHERE user_id = ${order.user_id}`;

  // ── 6. Fetch order items and address for confirmation email ─────────────
  const items = await sql`SELECT * FROM order_items WHERE order_id = ${order.id}`;
  const [address] = await sql`SELECT * FROM addresses WHERE user_id = ${order.user_id} ORDER BY created_at DESC LIMIT 1`;

  // ── 7. Send full order confirmation emails (non-blocking) ────────────────
  try {
    await Promise.all([
      emailOrderPlaced(order.email, order.name, order.id, items, address || {}, order.total, order.shipping),
      notifyOwnerOrder(order.id, { name: order.name, email: order.email }, items, address || {}, order.total, order.shipping)
    ]);
  } catch (emailErr) {
    console.error('Email send failed (non-fatal):', emailErr.message);
  }

  return res.status(200).json({ received: true });
}
