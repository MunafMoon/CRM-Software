import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { db } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import { authenticate } from '../middleware/auth.js';
import * as auth from '../services/auth.js';
export const authRouter = Router();
const cookie = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 7 * 86400000,
};
authRouter.use((req, _res, next) => {
  if (req.headers.origin && req.headers.origin !== config.WEB_ORIGIN)
    return next(new HttpError(403, 'Origin is not allowed'));
  next();
});
authRouter.post(
  '/login',
  rateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
  }),
  asyncHandler(async (req, res) => {
    const { email, password } = z
      .object({
        email: z
          .string()
          .trim()
          .email()
          .transform((s) => s.toLowerCase()),
        password: z.string().min(1).max(200),
      })
      .parse(req.body);
    const tokens = await auth.login(email, password);
    res
      .cookie('refresh', tokens.refreshToken, cookie)
      .json({ accessToken: tokens.accessToken });
  }),
);
authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    if (!req.cookies.refresh) throw new HttpError(401, 'Please sign in');
    const tokens = await auth.refresh(
      z.string().min(1).parse(req.cookies.refresh),
    );
    res
      .cookie('refresh', tokens.refreshToken, cookie)
      .json({ accessToken: tokens.accessToken });
  }),
);
authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    if (req.cookies.refresh)
      await db.refreshSession.deleteMany({
        where: { tokenHash: auth.hashToken(req.cookies.refresh) },
      });
    res
      .clearCookie('refresh', { ...cookie, maxAge: undefined })
      .status(204)
      .end();
  }),
);
authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(
      await db.user.findUniqueOrThrow({
        where: { id: req.user.id },
        select: auth.publicUser,
      }),
    );
  }),
);
