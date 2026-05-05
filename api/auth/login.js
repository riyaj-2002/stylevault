import bcrypt from 'bcryptjs';
import { getDB } from '../../lib/db.js';
import { signToken } from '../../lib/auth.js';
import { notifyOwnerLogin } from '../../utils/email.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  const sql = getDB();

  try {
    const rows = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (rows.length === 0) return res.json({ success: false, message: 'User not found' });

    const user = rows[0];
    if (!bcrypt.compareSync(password, user.password)) {
      return res.json({ success: false, message: 'Wrong password' });
    }

    const token = signToken({ id: user.id, name: user.name, email: user.email });
    try {
      await notifyOwnerLogin(user.name, user.email);
    } catch (emailErr) {
      console.error('Login notify failed:', emailErr.message);
    }

    res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Secure; Path=/; Max-Age=2592000; SameSite=Lax`);
    return res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch {
    return res.json({ success: false, message: 'Login failed' });
  }
}
