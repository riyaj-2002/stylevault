const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { emailWelcome, notifyOwnerRegister, notifyOwnerLogin } = require('../utils/email');

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  try {
    await pool.query('INSERT INTO users (name, email, password) VALUES ($1, $2, $3)', [name, email, hash]);
    emailWelcome(email, name);
    notifyOwnerRegister(name, email);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Email already exists' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.json({ success: false, message: 'User not found' });
    const user = result.rows[0];
    if (!bcrypt.compareSync(password, user.password)) return res.json({ success: false, message: 'Wrong password' });
    req.session.user = { id: user.id, name: user.name, email: user.email };
    notifyOwnerLogin(user.name, user.email);
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    res.json({ success: false, message: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

module.exports = router;
