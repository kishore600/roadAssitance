import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = verifyToken(token);
    (req as any).user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}