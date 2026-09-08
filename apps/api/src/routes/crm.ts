import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../middleware/errors.js';
import { authenticate, admin } from '../middleware/auth.js';
import * as c from '../controllers/crm.js';
import { db } from '../db.js';
import { publicUser } from '../services/auth.js';
export const crmRouter = Router();
crmRouter.use(authenticate);
crmRouter.get(
  '/users',
  asyncHandler(async (_req, res) => {
    res.json(
      await db.user.findMany({
        select: publicUser,
        orderBy: { firstName: 'asc' },
      }),
    );
  }),
);
crmRouter.post(
  '/users',
  admin,
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().max(100),
        email: z
          .string()
          .email()
          .transform((s) => s.toLowerCase()),
        password: z.string().min(12).max(200),
        role: z.enum(['ADMIN', 'SALES', 'MARKETING']),
      })
      .parse(req.body);
    const { password, ...rest } = data;
    res.status(201).json(
      await db.user.create({
        data: { ...rest, passwordHash: await bcrypt.hash(password, 12) },
        select: publicUser,
      }),
    );
  }),
);
crmRouter.patch(
  '/settings',
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().max(100),
        dailyProspectTarget: z.coerce.number().int().min(1).max(10000),
        dailyFollowUpTarget: z.coerce.number().int().min(1).max(10000),
        dailyMeetingTarget: z.coerce.number().int().min(1).max(1000),
      })
      .parse(req.body);
    res.json(
      await db.user.update({
        where: { id: req.user.id },
        data,
        select: publicUser,
      }),
    );
  }),
);
crmRouter.get('/dashboard', asyncHandler(c.dashboard));
crmRouter.get('/analytics', asyncHandler(c.dashboard));
crmRouter.post('/prospects/import', asyncHandler(c.importCsv));
crmRouter.get('/prospects', asyncHandler(c.listProspects));
crmRouter.post('/prospects', asyncHandler(c.saveProspect));
crmRouter.get('/prospects/:id', asyncHandler(c.detail));
crmRouter.put('/prospects/:id', asyncHandler(c.saveProspect));
crmRouter.delete('/prospects/:id', admin, asyncHandler(c.deleteProspect));
crmRouter.post('/prospects/:id/notes', asyncHandler(c.addNote));
crmRouter.get(
  '/:kind(followups|meetings|deals|clients|outreach)',
  asyncHandler(c.listRecords),
);
crmRouter.post(
  '/:kind(followups|meetings|deals|outreach)',
  asyncHandler(c.saveRecord),
);
crmRouter.patch(
  '/:kind(followups|meetings|deals|clients|outreach)/:id',
  asyncHandler(c.saveRecord),
);
