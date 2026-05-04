import { getDB } from '../../lib/db.js';
import { getUserFromRequest } from '../../lib/auth.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = getUserFromRequest(req);
  if (!session) return res.status(401).json({ success: false, message: 'Not logged in' });

  const sql = getDB();
  const [user] = await sql`SELECT id, name, email, created_at FROM users WHERE id = ${session.id}`;
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  return res.json({ success: true, user });
}
