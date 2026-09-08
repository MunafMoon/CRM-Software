import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import { HttpError } from '../middleware/errors.js';
import {
  normalizeProspect,
  prospectSchema,
  followupSchema,
  meetingSchema,
  dealSchema,
  outreachSchema,
} from '../validation.js';
type Tx = Prisma.TransactionClient;
async function lockProspect(tx: Tx, id: string) {
  // Serialize changes to one prospect so concurrent wins cannot lose client revenue.
  await tx.$queryRaw`SELECT id FROM "Prospect" WHERE id = ${id} FOR UPDATE`;
}
export function activity(
  tx: Tx,
  prospectId: string,
  userId: string,
  activityType: string,
  description: string,
) {
  return tx.activity.create({
    data: { prospectId, userId, activityType, description },
  });
}
export async function syncClient(tx: Tx, prospectId: string) {
  const p = await tx.prospect.findUniqueOrThrow({
    where: { id: prospectId },
    include: { deals: { where: { status: 'WON' } } },
  });
  if (!p.deals.length) return;
  const values = {
    businessName: p.businessName,
    contactPerson: p.contactPerson,
    email: p.email,
    phone: p.phone,
    services: [...new Set(p.deals.map((d) => d.serviceType))],
    projectValue: p.deals.reduce(
      (n, d) => n.add(d.value),
      new Prisma.Decimal(0),
    ),
  };
  await tx.client.upsert({
    where: { prospectId },
    create: { ...values, prospectId },
    update: values,
  });
  await tx.prospect.update({
    where: { id: prospectId },
    data: { status: 'WON' },
  });
}
export async function saveProspect(body: unknown, userId: string, id?: string) {
  const parsed = prospectSchema.parse(body);
  const data = normalizeProspect(parsed);
  return db.$transaction(async (tx) => {
    if (id) await lockProspect(tx, id);
    const old = id
      ? await tx.prospect.findUniqueOrThrow({ where: { id } })
      : null;
    if (
      old?.status === 'WON' &&
      data.status !== 'WON' &&
      (await tx.client.findUnique({ where: { prospectId: id } }))
    )
      throw new HttpError(
        409,
        'A converted client cannot be moved back. Manage their client status instead.',
      );
    const p = id
      ? await tx.prospect.update({
          where: { id },
          data: { ...data, assignedTo: data.assignedTo || old!.assignedTo },
        })
      : await tx.prospect.create({
          data: { ...data, assignedTo: data.assignedTo || userId },
        });
    await activity(
      tx,
      p.id,
      userId,
      !id
        ? 'PROSPECT_CREATED'
        : old?.status !== p.status
          ? 'STATUS_CHANGED'
          : 'PROSPECT_UPDATED',
      !id
        ? 'Prospect created'
        : old?.status !== p.status
          ? `Status changed from ${old?.status} to ${p.status}`
          : 'Business information updated',
    );
    if (p.status === 'WON') {
      if (
        !(await tx.deal.findFirst({
          where: { prospectId: p.id, status: 'WON' },
        }))
      ) {
        await tx.deal.create({
          data: {
            prospectId: p.id,
            title: `${p.businessName} engagement`,
            serviceType: 'Custom',
            value: p.estimatedValue,
            status: 'WON',
            actualCloseDate: new Date(),
          },
        });
      }
      await syncClient(tx, p.id);
    }
    return p;
  });
}
export async function removeProspect(id: string) {
  if (await db.client.findUnique({ where: { prospectId: id } }))
    throw new HttpError(
      409,
      'This prospect is a client and cannot be deleted.',
    );
  await db.prospect.delete({ where: { id } });
}
const include = {
  prospect: { select: { id: true, businessName: true, contactPerson: true } },
};
export async function listRecords(kind: string) {
  switch (kind) {
    case 'followups':
      return db.followUp.findMany({
        include,
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        take: 1000,
      });
    case 'meetings':
      return db.meeting.findMany({
        include,
        orderBy: [{ meetingDate: 'asc' }, { meetingTime: 'asc' }],
        take: 1000,
      });
    case 'deals':
      return db.deal.findMany({
        include,
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
    case 'clients':
      return db.client.findMany({
        include,
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
    case 'outreach':
      return db.outreach.findMany({
        include,
        orderBy: { sentAt: 'desc' },
        take: 1000,
      });
    default:
      throw new HttpError(404, 'Unknown resource');
  }
}
export async function saveRecord(
  kind: string,
  body: unknown,
  userId: string,
  id?: string,
) {
  return db.$transaction(async (tx) => {
    let result: { prospectId: string };
    let description = '';
    switch (kind) {
      case 'followups': {
        const data = (
          id
            ? followupSchema.partial().omit({ prospectId: true })
            : followupSchema
        ).parse(body);
        const completedAt =
          data.status === 'COMPLETED'
            ? new Date()
            : data.status
              ? null
              : undefined;
        result = id
          ? await tx.followUp.update({
              where: { id },
              data: { ...data, completedAt },
            })
          : await tx.followUp.create({
              data: {
                ...data,
                completedAt,
              } as Prisma.FollowUpUncheckedCreateInput,
            });
        description = id
          ? `Follow-up ${data.status?.toLowerCase() || 'rescheduled'}`
          : 'Follow-up scheduled';
        break;
      }
      case 'meetings': {
        const data = (
          id
            ? meetingSchema.partial().omit({ prospectId: true })
            : meetingSchema
        ).parse(body);
        result = id
          ? await tx.meeting.update({ where: { id }, data })
          : await tx.meeting.create({
              data: data as Prisma.MeetingUncheckedCreateInput,
            });
        description = id ? 'Meeting updated' : 'Meeting scheduled';
        break;
      }
      case 'deals': {
        const data = (
          id ? dealSchema.partial().omit({ prospectId: true }) : dealSchema
        ).parse(body);
        const existing = id
          ? await tx.deal.findUniqueOrThrow({ where: { id } })
          : null;
        await lockProspect(
          tx,
          existing?.prospectId || (data as { prospectId: string }).prospectId,
        );
        const old = id
          ? await tx.deal.findUniqueOrThrow({ where: { id } })
          : null;
        if (old?.status === 'WON' && data.status && data.status !== 'WON')
          throw new HttpError(
            409,
            'Won deals are locked to preserve booked revenue.',
          );
        result = id
          ? await tx.deal.update({
              where: { id },
              data: {
                ...data,
                actualCloseDate:
                  data.status === 'WON'
                    ? old?.actualCloseDate || new Date()
                    : undefined,
              },
            })
          : await tx.deal.create({
              data: {
                ...data,
                actualCloseDate: data.status === 'WON' ? new Date() : null,
              } as Prisma.DealUncheckedCreateInput,
            });
        await syncClient(tx, result.prospectId);
        description =
          data.status === 'WON'
            ? 'Deal won · client created or updated'
            : data.status === 'PROPOSAL'
              ? 'Proposal sent'
              : id
                ? 'Deal updated'
                : 'Deal created';
        break;
      }
      case 'outreach': {
        const data = outreachSchema.parse(body);
        if (data.response && !data.responseAt) data.responseAt = new Date();
        result = id
          ? await tx.outreach.update({ where: { id }, data })
          : await tx.outreach.create({ data });
        description = `${data.channel} outreach ${id ? 'updated' : 'recorded'}`;
        break;
      }
      case 'clients': {
        if (!id)
          throw new HttpError(400, 'Clients are created by winning deals');
        const data = z
          .object({
            status: z.enum(['ACTIVE', 'INACTIVE', 'COMPLETED']).optional(),
            monthlyRetainer: z.coerce
              .number()
              .min(0)
              .max(999999999999)
              .optional(),
          })
          .parse(body);
        result = await tx.client.update({ where: { id }, data });
        description = 'Client updated';
        break;
      }
      default:
        throw new HttpError(404, 'Unknown resource');
    }
    await activity(
      tx,
      result.prospectId,
      userId,
      kind.toUpperCase(),
      description,
    );
    return result;
  });
}
export async function importProspects(
  rows: unknown[],
  userId: string,
  commit: boolean,
) {
  if (rows.length > 1000)
    throw new HttpError(400, 'Import at most 1,000 rows at a time');
  const seen = new Set<string>();
  const results: { row: number; status: string; message?: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const parsed = prospectSchema.safeParse(rows[i]);
    if (!parsed.success) {
      results.push({
        row: i + 2,
        status: 'invalid',
        message: parsed.error.issues
          .map((x) => `${x.path.join('.')}: ${x.message}`)
          .join('; '),
      });
      continue;
    }
    const data = normalizeProspect(parsed.data);
    const keys = [
      `business:${data.businessKey}`,
      data.email && `email:${data.email}`,
      data.phone && `phone:${data.phone}`,
      data.website && `website:${data.website}`,
    ].filter(Boolean) as string[];
    const exists =
      keys.some((k) => seen.has(k)) ||
      (await db.prospect.findFirst({
        where: {
          OR: [
            { businessKey: data.businessKey },
            ...(data.email ? [{ email: data.email }] : []),
            ...(data.phone ? [{ phone: data.phone }] : []),
            ...(data.website ? [{ website: data.website }] : []),
          ],
        },
      }));
    keys.forEach((k) => seen.add(k));
    if (exists) {
      results.push({ row: i + 2, status: 'duplicate' });
      continue;
    }
    if (commit) {
      try {
        await saveProspect(parsed.data, userId);
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          results.push({ row: i + 2, status: 'duplicate' });
          continue;
        }
        throw e;
      }
    }
    results.push({ row: i + 2, status: 'valid' });
  }
  return {
    results,
    valid: results.filter((x) => x.status === 'valid').length,
    invalid: results.filter((x) => x.status === 'invalid').length,
    duplicates: results.filter((x) => x.status === 'duplicate').length,
    committed: commit,
  };
}
