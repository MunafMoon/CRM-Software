import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { config } from '../config.js';
import { HttpError } from '../middleware/errors.js';
export const publicUser = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  dailyProspectTarget: true,
  dailyFollowUpTarget: true,
  dailyMeetingTarget: true,
} as const;
export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const access = (id: string) =>
  jwt.sign({}, config.JWT_SECRET, {
    subject: id,
    expiresIn: '15m',
    algorithm: 'HS256',
    issuer: 'folio-crm',
    audience: 'folio-web',
  });
export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    throw new HttpError(401, 'Email or password is incorrect');
  const token = randomBytes(48).toString('hex');
  await db.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  return { accessToken: access(user.id), refreshToken: token };
}
export async function refresh(token: string) {
  const tokenHash = hashToken(token);
  const next = randomBytes(48).toString('hex');
  const userId = await db.$transaction(async (tx) => {
    const old = await tx.refreshSession.findUnique({ where: { tokenHash } });
    if (!old || old.expiresAt < new Date())
      throw new HttpError(401, 'Please sign in again');
    const removed = await tx.refreshSession.deleteMany({
      where: { id: old.id },
    });
    if (removed.count !== 1)
      throw new HttpError(401, 'Session already refreshed');
    await tx.refreshSession.create({
      data: {
        userId: old.userId,
        tokenHash: hashToken(next),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    return old.userId;
  });
  return { accessToken: access(userId), refreshToken: next };
}
