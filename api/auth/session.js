import { getUserFromRequest } from '../../lib/auth.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req) {
  const path = req.url.split('?')[0];

  // GET /api/auth/session
  if (req.method === 'GET') {
    const user = getUserFromRequest(req);
    if (user) return Response.json({ loggedIn: true, user });
    return Response.json({ loggedIn: false });
  }

  // POST /api/auth/logout
  if (req.method === 'POST') {
    return Response.json({ success: true }, {
      headers: { 'Set-Cookie': 'token=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Lax' }
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
