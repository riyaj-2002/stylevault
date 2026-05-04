import { getUserFromRequest } from '../../lib/auth.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // GET /api/auth/session or /api/session
  if (req.method === 'GET') {
    const user = getUserFromRequest(req);
    if (user) return res.json({ loggedIn: true, user });
    return res.json({ loggedIn: false });
  }

  // POST /api/auth/logout
  if (req.method === 'POST') {
    res.setHeader('Set-Cookie', 'token=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Lax');
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
