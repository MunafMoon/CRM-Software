import { db } from '../db.js';
export function indiaDay() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export async function report(userId: string) {
  const [prospects, followups, meetings, deals, outreach, activities, user] =
    await Promise.all([
      db.prospect.findMany({ orderBy: { createdAt: 'desc' } }),
      db.followUp.findMany({
        include: { prospect: true },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
      }),
      db.meeting.findMany({
        include: { prospect: true },
        orderBy: { meetingDate: 'asc' },
      }),
      db.deal.findMany({ include: { prospect: true } }),
      db.outreach.findMany(),
      db.activity.findMany({
        include: {
          prospect: true,
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      db.user.findUniqueOrThrow({ where: { id: userId } }),
    ]);
  const today = indiaDay();
  const dayStart = new Date(`${today}T00:00:00+05:30`);
  const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
  const week = new Date(dayStart);
  week.setUTCDate(week.getUTCDate() - 6);
  const counts = Object.fromEntries(
    [
      'NEW',
      'RESEARCHED',
      'CONTACTED',
      'FOLLOW_UP',
      'REPLIED',
      'INTERESTED',
      'MEETING_SCHEDULED',
      'PROPOSAL_SENT',
      'NEGOTIATION',
      'WON',
      'LOST',
    ].map((s) => [s, prospects.filter((p) => p.status === s).length]),
  );
  const touched = new Set(outreach.map((o) => o.prospectId));
  prospects
    .filter((p) => !['NEW', 'RESEARCHED'].includes(p.status))
    .forEach((p) => touched.add(p.id));
  const replied = new Set(
    outreach.filter((o) => o.response).map((o) => o.prospectId),
  );
  prospects
    .filter((p) =>
      [
        'REPLIED',
        'INTERESTED',
        'MEETING_SCHEDULED',
        'PROPOSAL_SENT',
        'NEGOTIATION',
        'WON',
      ].includes(p.status),
    )
    .forEach((p) => replied.add(p.id));
  const met = new Set(meetings.map((m) => m.prospectId));
  const proposed = new Set(
    deals
      .filter((d) => ['PROPOSAL', 'NEGOTIATION', 'WON'].includes(d.status))
      .map((d) => d.prospectId),
  );
  const won = new Set(
    deals.filter((d) => d.status === 'WON').map((d) => d.prospectId),
  );
  const rate = (a: number, b: number) =>
    b ? Math.round((a / b) * 1000) / 10 : 0;
  const revenue = deals
    .filter((d) => d.status === 'WON')
    .reduce((n, d) => n + Number(d.value), 0);
  const group = (key: 'source' | 'businessCategory') =>
    Object.entries(
      prospects.reduce(
        (acc, p) => {
          const k = p[key];
          acc[k] ??= { count: 0, won: 0, revenue: 0 };
          acc[k].count++;
          if (won.has(p.id)) acc[k].won++;
          acc[k].revenue += deals
            .filter((d) => d.prospectId === p.id && d.status === 'WON')
            .reduce((n, d) => n + Number(d.value), 0);
          return acc;
        },
        {} as Record<string, { count: number; won: number; revenue: number }>,
      ),
    )
      .map(([name, data]) => ({ name, ...data }))
      .sort(
        (a, b) => b.revenue - a.revenue || b.won - a.won || b.count - a.count,
      );
  return {
    today,
    kpis: {
      total: prospects.length,
      newThisWeek: prospects.filter((p) => p.createdAt >= week).length,
      contacted: touched.size,
      followupsToday: followups.filter(
        (f) => f.status === 'PENDING' && dateOnly(f.date) === today,
      ).length,
      meetings: meetings.filter(
        (m) => m.status === 'SCHEDULED' && dateOnly(m.meetingDate) >= today,
      ).length,
      proposals: deals.filter((d) => d.status === 'PROPOSAL').length,
      won: won.size,
      lost: counts.LOST,
      pipeline: deals
        .filter((d) => !['WON', 'LOST'].includes(d.status))
        .reduce((n, d) => n + Number(d.value), 0),
      revenue,
    },
    counts,
    funnel: [
      { name: 'Prospects', value: prospects.length },
      { name: 'Contacted', value: touched.size },
      { name: 'Replies', value: replied.size },
      { name: 'Meetings', value: met.size },
      { name: 'Proposals', value: proposed.size },
      { name: 'Clients', value: won.size },
    ],
    rates: {
      contact: rate(touched.size, prospects.length),
      response: rate(replied.size, touched.size),
      meeting: rate(met.size, touched.size),
      proposal: rate(proposed.size, met.size),
      close: rate(won.size, proposed.size),
      conversion: rate(won.size, prospects.length),
    },
    bySource: group('source'),
    byCategory: group('businessCategory'),
    monthlyRevenue: Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - 5 + i);
      const month = d.toISOString().slice(0, 7);
      return {
        month,
        value: deals
          .filter(
            (x) =>
              x.status === 'WON' &&
              x.actualCloseDate?.toISOString().startsWith(month),
          )
          .reduce((n, x) => n + Number(x.value), 0),
      };
    }),
    outreachStats: {
      ...Object.fromEntries(
        ['EMAIL', 'WHATSAPP', 'LINKEDIN', 'PHONE', 'INSTAGRAM'].map(
          (channel) => [
            channel,
            outreach.filter((o) => o.channel === channel).length,
          ],
        ),
      ),
      replies: outreach.filter((o) => o.response).length,
      positive: outreach.filter((o) => o.positiveReply).length,
      meetings: outreach.filter((o) => o.meetingGenerated).length,
    },
    activities,
    recentProspects: prospects.slice(0, 5),
    todayFollowups: followups.filter(
      (f) => f.status === 'PENDING' && dateOnly(f.date) === today,
    ),
    overdueFollowups: followups.filter(
      (f) => f.status === 'PENDING' && dateOnly(f.date) < today,
    ),
    upcomingFollowups: followups
      .filter((f) => f.status === 'PENDING' && dateOnly(f.date) > today)
      .slice(0, 10),
    todayMeetings: meetings.filter(
      (m) => m.status === 'SCHEDULED' && dateOnly(m.meetingDate) === today,
    ),
    newProspects: prospects
      .filter((p) => ['NEW', 'RESEARCHED'].includes(p.status))
      .slice(0, 10),
    interestedProspects: prospects.filter((p) => p.status === 'INTERESTED'),
    pendingProposals: deals.filter((d) => d.status === 'PROPOSAL'),
    targets: {
      prospects: {
        target: user.dailyProspectTarget,
        done: new Set(
          outreach.filter((o) => o.sentAt >= dayStart).map((o) => o.prospectId),
        ).size,
      },
      followups: {
        target: user.dailyFollowUpTarget,
        done: followups.filter(
          (f) => f.completedAt && f.completedAt >= dayStart,
        ).length,
      },
      meetings: {
        target: user.dailyMeetingTarget,
        done: meetings.filter((m) => m.createdAt >= dayStart).length,
      },
    },
  };
}
