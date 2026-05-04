import bcrypt from 'bcryptjs';
import { getDB } from '../../lib/db.js';
import { signToken } from '../../lib/auth.js';
import { notifyOwnerLogin } from '../../utils/email.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const { email, password } = req.body;
  const sql = getDB();

  try {
    const rows = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (rows.length === 0) return Response.json({ success: false, message: 'User not found' });

    const user = rows[0];
    if (!bcrypt.compareSync(password, user.password)) {
      return Response.json({ success: false, message: 'Wrong password' });
    }

    const token = signToken({ id: user.id, name: user.name, email: user.email });
    notifyOwnerLogin(user.name, user.email);

    return Response.json({ success: true, user: { id: user.id, name: user.name, email: user.email } }, {
      headers: { 'Set-Cookie': `token=${token}; HttpOnly; Secure; Path=/; Max-Age=604800; SameSite=Lax` }
    });
  } catch {
    return Response.json({ success: false, message: 'Login failed' });
  }
}
