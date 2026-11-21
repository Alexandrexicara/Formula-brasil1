import jwt from 'jsonwebtoken';
export function issueToken(player) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({ sub: player.id, username: player.username }, process.env.JWT_SECRET, { expiresIn: '7d', issuer: 'formula-brasil1' });
}
export function authenticateToken(token) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.verify(token, process.env.JWT_SECRET, { issuer: 'formula-brasil1' });
}
export function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try { req.player = authenticateToken(token); next(); }
  catch { res.status(401).json({ error: 'Sessão inválida ou expirada.' }); }
}
