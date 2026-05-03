const express = require('express');
const router = express.Router();
const pool = require('../db');
const {
  emailOrderPlaced,
  emailPaymentConfirmed,
  emailOutForShipping,
  emailDelivered,
  notifyOwnerOrder,
  notifyOwnerPaymentConfirmed
} = require('../utils/email');

// Called when customer clicks "I Have Paid" — saves order, sends order placed emails
router.post('/confirm', async (req, res) => {
  if (!req.session.user) return res.json({ success: false, message: 'Not logged in' });
  const { total, shipping, address } = req.body;
  const user_id = req.session.user.id;
  const user = req.session.user;

  try {
    // Save address
    if (address) {
      await pool.query(
        `INSERT INTO addresses (user_id, name, mobile, address1, address2, city, state, pincode, country, landmark)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [user_id, address.name, address.mobile, address.address1, address.address2,
         address.city, address.state, address.pincode, address.country, address.landmark]
      );
    }

    // Save order
    const orderResult = await pool.query(
      'INSERT INTO orders (user_id, total, shipping, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [user_id, total, shipping || 0, 'pending']
    );
    const order_id = orderResult.rows[0].id;

    // Save order items
    const cartResult = await pool.query('SELECT * FROM cart WHERE user_id = $1', [user_id]);
    for (const item of cartResult.rows) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image, phone_brand, phone_model, case_material) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [order_id, item.product_id, item.product_name, item.price, item.quantity, item.image, item.phone_brand, item.phone_model, item.case_material]
      );
    }

    // Clear cart
    await pool.query('DELETE FROM cart WHERE user_id = $1', [user_id]);

    // Send emails — order placed (automatic)
    emailOrderPlaced(user.email, user.name, order_id, cartResult.rows, address || {}, total, shipping || 0);
    notifyOwnerOrder(order_id, user, cartResult.rows, address || {}, total, shipping || 0);

    res.json({ success: true, order_id });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// Called manually from admin panel — confirms payment
router.post('/payment-confirmed', async (req, res) => {
  const { order_id } = req.body;
  try {
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', ['paid', order_id]);
    const orderResult = await pool.query(
      `SELECT o.*, u.name, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = $1`,
      [order_id]
    );
    const order = orderResult.rows[0];
    emailPaymentConfirmed(order.email, order.name, order_id, order.total);
    notifyOwnerPaymentConfirmed(order_id, order.name, order.email, order.total);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// Called manually from admin panel — marks as shipped
router.post('/ship', async (req, res) => {
  const { order_id } = req.body;
  try {
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', ['shipped', order_id]);
    const orderResult = await pool.query(
      `SELECT o.*, u.name, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = $1`,
      [order_id]
    );
    const order = orderResult.rows[0];
    emailOutForShipping(order.email, order.name, order_id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// Called manually from admin panel — marks as delivered
router.post('/delivered', async (req, res) => {
  const { order_id } = req.body;
  try {
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', ['delivered', order_id]);
    const orderResult = await pool.query(
      `SELECT o.*, u.name, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = $1`,
      [order_id]
    );
    const order = orderResult.rows[0];
    emailDelivered(order.email, order.name, order_id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

module.exports = router;
