import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db.js';
import { HttpError, asyncHandler } from './errors.js';
declare module 'express-serve-static-core' {
  interface Request {
    user: { id: string; role: string };
  }
}
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token) throw new HttpError(401, 'Please sign in');
    let payload;
    try {
      payload = jwt.verify(token, config.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'folio-crm',
        audience: 'folio-web',
      }) as jwt.JwtPayload;
    } catch {
      throw new HttpError(401, 'Session expired');
    }
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new HttpError(401, 'User no longer exists');
    req.user = { id: user.id, role: user.role };
    next();
  },
);
export const admin = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user.role !== 'ADMIN')
    return next(new HttpError(403, 'Administrator access required'));
  next();
};
