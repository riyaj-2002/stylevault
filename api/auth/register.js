import bcrypt from 'bcryptjs';
import { getDB } from '../../lib/db.js';
import { signToken } from '../../lib/auth.js';
import { emailWelcome, notifyOwnerRegister } from '../../utils/email.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const { name, email, password } = await req.json();
  if (!name || !email || !password) {
    return Response.json({ success: false, message: 'All fields required' }, { status: 400 });
  }

  const sql = getDB();
  try {
    const hash = bcrypt.hashSync(password, 10);
    await sql`INSERT INTO users (name, email, password) VALUES (${name}, ${email}, ${hash})`;

    const [user] = await sql`SELECT id, name, email FROM users WHERE email = ${email}`;
    const token = signToken(user);

    emailWelcome(email, name);
    notifyOwnerRegister(name, email);

    return Response.json({ success: true }, {
      headers: { 'Set-Cookie': `token=${token}; HttpOnly; Secure; Path=/; Max-Age=604800; SameSite=Lax` }
    });
  } catch {
    return Response.json({ success: false, message: 'Email already exists' });
  }
}
