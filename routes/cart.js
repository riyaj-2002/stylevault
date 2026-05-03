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
  const { product_id, product_name, price, image, phone_brand, phone_model, case_material } = req.body;
  const user_id = req.session.user.id;
  try {
    const existing = await pool.query(
      'SELECT * FROM cart WHERE user_id = $1 AND product_id = $2 AND phone_brand = $3 AND phone_model = $4 AND case_material = $5',
      [user_id, product_id, phone_brand || '', phone_model || '', case_material || '']
    );
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE cart SET quantity = quantity + 1 WHERE user_id = $1 AND product_id = $2 AND phone_brand = $3 AND phone_model = $4 AND case_material = $5',
        [user_id, product_id, phone_brand || '', phone_model || '', case_material || '']
      );
    } else {
      await pool.query(
        'INSERT INTO cart (user_id, product_id, product_name, price, image, phone_brand, phone_model, case_material) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [user_id, product_id, product_name, price, image, phone_brand || '', phone_model || '', case_material || '']
      );
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
