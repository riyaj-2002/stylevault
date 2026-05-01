const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.total, o.shipping, o.status, o.created_at,
             u.name, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    res.json({ success: true, orders: result.rows });
  } catch (err) {
    res.json({ success: false });
  }
});

router.get('/:id/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
    res.json({ success: true, items: result.rows });
  } catch (err) {
    res.json({ success: false });
  }
});

router.get('/:id/address', async (req, res) => {
  try {
    const orderResult = await pool.query('SELECT user_id FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) return res.json({ success: false });
    const result = await pool.query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [orderResult.rows[0].user_id]
    );
    res.json({ success: true, address: result.rows[0] });
  } catch (err) {
    res.json({ success: false });
  }
});

module.exports = router;
