import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const SECRET = env.jwtSecret;

export function signToken(payload: any) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET);
}