require('dotenv').config();
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../db');
const {
  emailOrderPlaced,
  notifyOwnerOrder
} = require('../utils/email');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay order
router.post('/create-order', async (req, res) => {
  const { amount } = req.body;
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(parseFloat(amount) * 100),
      currency: 'INR',
      receipt: `order_${Date.now()}`
    });
    res.json({ success: true, order });
  } catch (err) {
    console.error('Razorpay create order error:', err);
    res.json({ success: false, message: err.message });
  }
});

// Verify payment and save order
router.post('/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, total, shipping, address } = req.body;

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.json({ success: false, message: 'Payment verification failed' });
  }

  // If not logged in, still confirm payment success to frontend
  if (!req.session.user) {
    return res.json({ success: true, order_id: null });
  }

  const user = req.session.user;

  try {
    // Save address
    if (address) {
      await pool.query(
        `INSERT INTO addresses (user_id, name, mobile, address1, address2, city, state, pincode, country, landmark)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [user.id, address.name, address.mobile, address.address1, address.address2,
         address.city, address.state, address.pincode, address.country, address.landmark]
      );
    }

    // Save order
    const orderResult = await pool.query(
      'INSERT INTO orders (user_id, total, shipping, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [user.id, total, shipping || 0, 'pending']
    );
    const order_id = orderResult.rows[0].id;

    // Save order items from cart
    const cartResult = await pool.query('SELECT * FROM cart WHERE user_id = $1', [user.id]);
    for (const item of cartResult.rows) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image) VALUES ($1,$2,$3,$4,$5,$6)',
        [order_id, item.product_id, item.product_name, item.price, item.quantity, item.image]
      );
    }

    // Clear cart
    await pool.query('DELETE FROM cart WHERE user_id = $1', [user.id]);

    // Send emails
    emailOrderPlaced(user.email, user.name, order_id, cartResult.rows, address || {}, total, shipping || 0);
    notifyOwnerOrder(order_id, user, cartResult.rows, address || {}, total, shipping || 0);

    res.json({ success: true, order_id });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// TEST ONLY — simulate successful order without real payment
router.post('/test-order', async (req, res) => {
  if (!req.session.user) return res.json({ success: false, message: 'Not logged in' });
  const { total, shipping, address } = req.body;
  const user = req.session.user;
  try {
    if (address) {
      await pool.query(
        `INSERT INTO addresses (user_id, name, mobile, address1, address2, city, state, pincode, country, landmark)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [user.id, address.name, address.mobile, address.address1, address.address2,
         address.city, address.state, address.pincode, address.country, address.landmark]
      );
    }
    const orderResult = await pool.query(
      'INSERT INTO orders (user_id, total, shipping, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [user.id, total, shipping || 0, 'pending']
    );
    const order_id = orderResult.rows[0].id;
    const cartResult = await pool.query('SELECT * FROM cart WHERE user_id = $1', [user.id]);
    for (const item of cartResult.rows) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image) VALUES ($1,$2,$3,$4,$5,$6)',
        [order_id, item.product_id, item.product_name, item.price, item.quantity, item.image]
      );
    }
    await pool.query('DELETE FROM cart WHERE user_id = $1', [user.id]);
    emailOrderPlaced(user.email, user.name, order_id, cartResult.rows, address || {}, total, shipping || 0);
    notifyOwnerOrder(order_id, user, cartResult.rows, address || {}, total, shipping || 0);
    res.json({ success: true, order_id });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

module.exports = router;
