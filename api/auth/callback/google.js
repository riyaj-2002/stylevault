import { getDB } from '../../../lib/db.js';
import { signToken } from '../../../lib/auth.js';
import { emailWelcome, notifyOwnerRegister } from '../../../utils/email.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  const url = new URL(req.url, 'https://stylevault.live');
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) return res.redirect(302, '/login.html?error=google_denied');

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'https://stylevault.live/api/auth/callback/google',
        grant_type: 'authorization_code'
      })
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      console.error('Google token error:', JSON.stringify(tokens));
      return res.redirect(302, '/login.html?error=token_failed');
    }

    // 2. Fetch Google profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const { name, email, picture } = await profileRes.json();
    if (!email) return res.redirect(302, '/login.html?error=no_email');

    // 3. Upsert user in Neon DB
    const sql = getDB();
    let [user] = await sql`SELECT id, name, email FROM users WHERE email = ${email}`;

    if (!user) {
      // New user — insert and send welcome email
      [user] = await sql`
        INSERT INTO users (name, email, password, picture)
        VALUES (${name}, ${email}, '', ${picture || null})
        RETURNING id, name, email
      `;
      try {
        await Promise.all([emailWelcome(email, name), notifyOwnerRegister(name, email)]);
      } catch (e) {
        console.error('Welcome email failed:', e.message);
      }
    } else {
      // Existing user — update picture
      await sql`UPDATE users SET picture = ${picture || null} WHERE id = ${user.id}`;
    }

    // 4. Set JWT cookie and redirect to collections
    const token = signToken({ id: user.id, name: user.name, email: user.email });
    res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Secure; Path=/; Max-Age=2592000; SameSite=Lax`);
    return res.redirect(302, '/collections.html');

  } catch (err) {
    console.error('Google OAuth error:', err.message);
    return res.redirect(302, '/login.html?error=server_error');
  }
}
