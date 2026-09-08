import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import * as service from '../services/crm.js';
import { report } from '../services/reporting.js';
import { statuses, date } from '../validation.js';
const filters = z.object({
  search: z.string().max(200).optional(),
  status: z.enum(statuses).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'HOT']).optional(),
  businessCategory: z.string().optional(),
  city: z.string().optional(),
  source: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  createdFrom: date.optional(),
  createdTo: date.optional(),
  followupDate: date.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(25),
});
export async function listProspects(req: Request, res: Response) {
  const q = filters.parse(req.query);
  const where: Prisma.ProspectWhereInput = {
    status: q.status,
    priority: q.priority,
    businessCategory: q.businessCategory,
    city: q.city ? { contains: q.city, mode: 'insensitive' } : undefined,
    source: q.source,
    assignedTo: q.assignedTo,
    createdAt:
      q.createdFrom || q.createdTo
        ? {
            gte: q.createdFrom,
            lte: q.createdTo
              ? new Date(q.createdTo.getTime() + 86400000 - 1)
              : undefined,
          }
        : undefined,
    followups: q.followupDate ? { some: { date: q.followupDate } } : undefined,
    OR: q.search
      ? ['businessName', 'contactPerson', 'email', 'phone', 'city'].map(
          (k) => ({ [k]: { contains: q.search, mode: 'insensitive' } }),
        )
      : undefined,
  };
  const [items, total] = await db.$transaction([
    db.prospect.findMany({
      where,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    db.prospect.count({ where }),
  ]);
  res.json({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
}
export async function detail(req: Request, res: Response) {
  res.json(
    await db.prospect.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        activities: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        noteEntries: {
          include: { user: { select: { firstName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        followups: { orderBy: { date: 'asc' } },
        meetings: { orderBy: { meetingDate: 'asc' } },
        deals: true,
        client: true,
        outreach: { orderBy: { sentAt: 'desc' } },
      },
    }),
  );
}
export async function saveProspect(req: Request, res: Response) {
  res
    .status(req.params.id ? 200 : 201)
    .json(await service.saveProspect(req.body, req.user.id, req.params.id));
}
export async function deleteProspect(req: Request, res: Response) {
  await service.removeProspect(req.params.id);
  res.status(204).end();
}
export async function listRecords(req: Request, res: Response) {
  res.json(await service.listRecords(req.params.kind));
}
export async function saveRecord(req: Request, res: Response) {
  res
    .status(req.params.id ? 200 : 201)
    .json(
      await service.saveRecord(
        req.params.kind,
        req.body,
        req.user.id,
        req.params.id,
      ),
    );
}
export async function addNote(req: Request, res: Response) {
  const { content } = z
    .object({ content: z.string().trim().min(1).max(10000) })
    .parse(req.body);
  res.status(201).json(
    await db.$transaction(async (tx) => {
      const note = await tx.note.create({
        data: { content, prospectId: req.params.id, userId: req.user.id },
      });
      await service.activity(
        tx,
        req.params.id,
        req.user.id,
        'NOTE_ADDED',
        'Note added',
      );
      return note;
    }),
  );
}
export async function importCsv(req: Request, res: Response) {
  const { rows, commit } = z
    .object({
      rows: z.array(z.unknown()).min(1).max(1000),
      commit: z.boolean().default(false),
    })
    .parse(req.body);
  res.json(await service.importProspects(rows, req.user.id, commit));
}
export async function dashboard(req: Request, res: Response) {
  res.json(await report(req.user.id));
}
