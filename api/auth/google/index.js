export const config = { runtime: 'nodejs' };

export default function handler(req, res) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: 'https://stylevault.live/api/auth/callback/google',
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account'
  });
  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
