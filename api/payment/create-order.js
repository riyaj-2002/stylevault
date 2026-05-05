import Razorpay from 'razorpay';
import { getDB } from '../../lib/db.js';
import { getUserFromRequest } from '../../lib/auth.js';
import { emailOrderPlaced, notifyOwnerOrder } from '../../utils/email.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ success: false, message: 'Not logged in' });

  const { amount, shipping, address } = req.body;
  if (!amount) return res.status(400).json({ success: false, message: 'Amount required' });

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

  const sql = getDB();

  try {
    // ── 1. Create Razorpay order ─────────────────────────────────────────────
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(parseFloat(amount) * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    });

    // ── 2. Save address ──────────────────────────────────────────────────────
    if (address) {
      await sql`
        INSERT INTO addresses (user_id, name, mobile, address1, address2, city, state, pincode, country, landmark)
        VALUES (${user.id}, ${address.name}, ${address.mobile}, ${address.address1}, ${address.address2},
                ${address.city}, ${address.state}, ${address.pincode}, ${address.country}, ${address.landmark})
      `;
    }

    // ── 3. Save order with razorpay_order_id — status stays 'pending' ────────
    //    Status is ONLY updated to 'paid' by the webhook after signature verification
    const [order] = await sql`
      INSERT INTO orders (user_id, total, shipping, status, razorpay_order_id)
      VALUES (${user.id}, ${amount}, ${shipping || 0}, 'pending', ${rzpOrder.id})
      RETURNING id
    `;
    const order_id = order.id;

    // ── 4. Save order items from cart ────────────────────────────────────────
    const cartItems = await sql`SELECT * FROM cart WHERE user_id = ${user.id}`;
    for (const item of cartItems) {
      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image, phone_brand, phone_model, case_material)
        VALUES (${order_id}, ${item.product_id}, ${item.product_name}, ${item.price}, ${item.quantity},
                ${item.image}, ${item.phone_brand}, ${item.phone_model}, ${item.case_material})
      `;
    }

    // ── 5. Clear cart ────────────────────────────────────────────────────────
    await sql`DELETE FROM cart WHERE user_id = ${user.id}`;

    // ── 6. Send order placed emails (non-blocking) ───────────────────────────
    try {
      await Promise.all([
        emailOrderPlaced(user.email, user.name, order_id, cartItems, address || {}, amount, shipping || 0),
        notifyOwnerOrder(order_id, user, cartItems, address || {}, amount, shipping || 0)
      ]);
    } catch (emailErr) {
      console.error('Order email failed (non-fatal):', emailErr.message);
    }

    // ── 7. Generate QR code ──────────────────────────────────────────────────
    let qr_url = null;
    try {
      const qr = await razorpay.qrCode.create({
        type: 'upi_qr',
        name: 'StyleVault',
        usage: 'single_use',
        fixed_amount: true,
        payment_amount: Math.round(parseFloat(amount) * 100),
        description: `Order #${order_id}`,
        close_by: Math.floor(Date.now() / 1000) + 900 // 15 min expiry
      });
      qr_url = qr.image_url;
    } catch (qrErr) {
      console.error('QR generation failed (non-fatal):', qrErr.message);
    }

    res.json({ success: true, order: rzpOrder, order_id, qr_url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
