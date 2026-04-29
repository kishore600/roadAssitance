import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 🔥 Check Authorization header FIRST (since your frontend uses this)
  let token = null;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
    console.log('✅ Token found in Authorization header');
  }
  
  // If not in header, check cookies as fallback
  if (!token && req.cookies.token) {
    token = req.cookies.token;
    console.log('✅ Token found in cookies');
  }

  if (!token) {
    console.log('❌ No token found in headers or cookies');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user:any = verifyToken(token);
    (req as any).user = user;

    console.log(user)
    
    console.log('✅ Token verified successfully for user:', user.id);
    next();
  } catch (error) {
    console.log('❌ Invalid token:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}