import bcrypt from 'bcryptjs';
import { getDB } from '../../lib/db.js';
import { signToken } from '../../lib/auth.js';
import { emailWelcome, notifyOwnerRegister } from '../../utils/email.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }

  const sql = getDB();
  try {
    const hash = bcrypt.hashSync(password, 10);
    await sql`INSERT INTO users (name, email, password) VALUES (${name}, ${email}, ${hash})`;

    const [user] = await sql`SELECT id, name, email FROM users WHERE email = ${email}`;
    const token = signToken(user);

    try {
      await Promise.all([
        emailWelcome(email, name),
        notifyOwnerRegister(name, email)
      ]);
    } catch (emailErr) {
      console.error('Registration email failed:', emailErr.message);
    }

    res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Secure; Path=/; Max-Age=604800; SameSite=Lax`);
    return res.json({ success: true });
  } catch {
    return res.json({ success: false, message: 'Email already exists' });
  }
}
