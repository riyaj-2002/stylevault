const express = require('express');
const router = express.Router();
const pool = require('../db');

function auth(req, res, next) {
  if (!req.session.user) return res.json({ success: false, message: 'Not logged in' });
  next();
}

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cart WHERE user_id = $1', [req.session.user.id]);
    res.json({ success: true, cart: result.rows });
  } catch (err) {
    res.json({ success: false });
  }
});

router.post('/add', auth, async (req, res) => {
  const { product_id, product_name, price, image } = req.body;
  const user_id = req.session.user.id;
  try {
    const existing = await pool.query('SELECT * FROM cart WHERE user_id = $1 AND product_id = $2', [user_id, product_id]);
    if (existing.rows.length > 0) {
      await pool.query('UPDATE cart SET quantity = quantity + 1 WHERE user_id = $1 AND product_id = $2', [user_id, product_id]);
    } else {
      await pool.query('INSERT INTO cart (user_id, product_id, product_name, price, image) VALUES ($1, $2, $3, $4, $5)',
        [user_id, product_id, product_name, price, image]);
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

router.post('/remove', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart WHERE user_id = $1 AND product_id = $2', [req.session.user.id, req.body.product_id]);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

router.post('/clear', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart WHERE user_id = $1', [req.session.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

module.exports = router;
