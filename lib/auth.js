import jwt from 'jsonwebtoken';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.SESSION_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.SESSION_SECRET);
  } catch {
    return null;
  }
}

export function getUserFromRequest(req) {
  let cookie = '';
  let auth = '';

  if (typeof req.headers.get === 'function') {
    cookie = req.headers.get('cookie') || '';
    auth = req.headers.get('authorization') || '';
  } else {
    cookie = req.headers['cookie'] || '';
    auth = req.headers['authorization'] || '';
  }

  if (auth.startsWith('Bearer ')) return verifyToken(auth.slice(7));

  const match = cookie.match(/token=([^;]+)/);
  if (match) return verifyToken(match[1]);

  return null;
}
