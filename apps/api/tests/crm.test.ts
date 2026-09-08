import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { app } from '../src/app.js';
import { db } from '../src/db.js';
import { indiaDay } from '../src/services/reporting.js';
let server: Server;
let base: string;
let token: string;
let cookie: string;
let prospectId: string;
let dealId: string;
let followupId: string;
let salesId: string;
const unique = `Integration ${randomUUID()}`;
const prospect = {
  businessName: unique,
  contactPerson: 'Test Contact',
  email: `${randomUUID()}@example.com`,
  phone: '',
  city: 'Vadodara',
  country: 'India',
  businessCategory: 'Dental Clinic',
  source: 'Referral',
  estimatedValue: 25000,
  priority: 'HIGH',
  status: 'NEW',
};
async function request(
  path: string,
  method = 'GET',
  body?: unknown,
  options: { token?: string; cookie?: string; origin?: string } = {},
) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token !== ''
        ? { Authorization: `Bearer ${options.token || token}` }
        : {}),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.origin ? { Origin: options.origin } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = response.status === 204 ? null : await response.json();
  return { response, data };
}
before(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(async () => {
  const rows = await db.prospect.findMany({
    where: { businessName: { startsWith: unique } },
    select: { id: true },
  });
  for (const p of rows) {
    await db.client.deleteMany({ where: { prospectId: p.id } });
    await db.prospect.delete({ where: { id: p.id } });
  }
  if (salesId) await db.user.delete({ where: { id: salesId } });
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.$disconnect();
});
test('protected routes reject anonymous requests', async () => {
  const r = await request('/prospects', 'GET', undefined, { token: '' });
  assert.equal(r.response.status, 401);
});
test('login, current user, and safe user projection', async () => {
  const bad = await request('/auth/login', 'POST', {
    email: process.env.SEED_ADMIN_EMAIL,
    password: 'incorrect',
  });
  assert.equal(bad.response.status, 401);
  const r = await request('/auth/login', 'POST', {
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  assert.equal(r.response.status, 200);
  token = r.data.accessToken;
  cookie = r.response.headers.get('set-cookie')!.split(';')[0];
  assert.match(r.response.headers.get('set-cookie')!, /HttpOnly/i);
  const me = await request('/auth/me');
  assert.equal(me.data.role, 'ADMIN');
  assert.equal(me.data.passwordHash, undefined);
});
test('refresh rotates and rejects replay; foreign origins rejected', async () => {
  const foreign = await request(
    '/auth/refresh',
    'POST',
    {},
    { cookie, origin: 'https://evil.example' },
  );
  assert.equal(foreign.response.status, 403);
  const old = cookie;
  const r = await request('/auth/refresh', 'POST', {}, { cookie });
  assert.equal(r.response.status, 200);
  token = r.data.accessToken;
  cookie = r.response.headers.get('set-cookie')!.split(';')[0];
  const replay = await request('/auth/refresh', 'POST', {}, { cookie: old });
  assert.equal(replay.response.status, 401);
});
test('prospect CRUD validates and logs activity atomically', async () => {
  const invalid = await request('/prospects', 'POST', {
    ...prospect,
    businessName: '',
    estimatedValue: -1,
  });
  assert.equal(invalid.response.status, 400);
  const created = await request('/prospects', 'POST', prospect);
  assert.equal(created.response.status, 201);
  prospectId = created.data.id;
  const duplicate = await request('/prospects', 'POST', {
    ...prospect,
    email: 'different@example.com',
  });
  assert.equal(duplicate.response.status, 409);
  const detail = await request(`/prospects/${prospectId}`);
  assert.equal(detail.data.activities.length, 1);
  const updated = await request(`/prospects/${prospectId}`, 'PUT', {
    ...prospect,
    status: 'INTERESTED',
  });
  assert.equal(updated.data.status, 'INTERESTED');
  const search = await request(
    `/prospects?search=${encodeURIComponent(unique)}&status=INTERESTED&priority=HIGH&city=Vadodara&source=Referral`,
  );
  assert.equal(search.data.total, 1);
  assert.equal((await request('/prospects?page=-1')).response.status, 400);
});
test('notes persist and invalid foreign keys leave no activity', async () => {
  assert.equal(
    (
      await request(`/prospects/${prospectId}/notes`, 'POST', {
        content: 'Decision-maker prefers email.',
      })
    ).response.status,
    201,
  );
  const detail = await request(`/prospects/${prospectId}`);
  assert.equal(
    detail.data.noteEntries[0].content,
    'Decision-maker prefers email.',
  );
  const bad = await request('/followups', 'POST', {
    prospectId: randomUUID(),
    date: indiaDay(),
    time: '10:00',
    type: 'CALL',
  });
  assert.equal(bad.response.status, 409);
});
test('follow-ups validate dates, reschedule, and complete', async () => {
  const invalid = await request('/followups', 'POST', {
    prospectId,
    date: '2026-02-30',
    time: '25:00',
    type: 'CALL',
  });
  assert.equal(invalid.response.status, 400);
  const r = await request('/followups', 'POST', {
    prospectId,
    date: indiaDay(),
    time: '10:00',
    type: 'EMAIL',
  });
  assert.equal(r.response.status, 201);
  followupId = r.data.id;
  const dashboard = await request('/dashboard');
  assert.ok(
    dashboard.data.todayFollowups.some(
      (f: { id: string }) => f.id === followupId,
    ),
  );
  const scheduled = await request(`/followups/${followupId}`, 'PATCH', {
    date: indiaDay(),
    time: '15:30',
  });
  assert.equal(scheduled.data.time, '15:30');
  const complete = await request(`/followups/${followupId}`, 'PATCH', {
    status: 'COMPLETED',
  });
  assert.ok(complete.data.completedAt);
  const filter = await request(
    `/prospects?search=${encodeURIComponent(unique)}&followupDate=${indiaDay()}`,
  );
  assert.equal(filter.data.total, 1);
});
test('meeting and outreach flows persist and reject unsafe links', async () => {
  const bad = await request('/meetings', 'POST', {
    prospectId,
    title: 'Discovery',
    meetingDate: indiaDay(),
    meetingTime: '11:00',
    meetingType: 'ZOOM',
    meetingLink: 'javascript:alert(1)',
  });
  assert.equal(bad.response.status, 400);
  const r = await request('/meetings', 'POST', {
    prospectId,
    title: 'Discovery',
    meetingDate: indiaDay(),
    meetingTime: '11:00',
    meetingType: 'PHONE',
  });
  assert.equal(r.response.status, 201);
  assert.equal(
    (await request(`/meetings/${r.data.id}`, 'PATCH', { status: 'COMPLETED' }))
      .data.status,
    'COMPLETED',
  );
  const outreach = await request('/outreach', 'POST', {
    prospectId,
    channel: 'EMAIL',
    message: 'Can we discuss your website?',
    response: 'Yes, please.',
    positiveReply: true,
  });
  assert.equal(outreach.response.status, 201);
  assert.ok(outreach.data.responseAt);
});
test('won deals create one client and preserve revenue on repeated updates', async () => {
  const r = await request('/deals', 'POST', {
    prospectId,
    title: 'Website development',
    serviceType: 'Website Development',
    value: 25000,
    status: 'PROPOSAL',
  });
  assert.equal(r.response.status, 201);
  dealId = r.data.id;
  const won = await request(`/deals/${dealId}`, 'PATCH', { status: 'WON' });
  assert.ok(won.data.actualCloseDate);
  await request(`/deals/${dealId}`, 'PATCH', { status: 'WON' });
  let clients = await request('/clients');
  let client = clients.data.find(
    (c: { prospectId: string }) => c.prospectId === prospectId,
  );
  assert.equal(Number(client.projectValue), 25000);
  const next = await request('/deals', 'POST', {
    prospectId,
    title: 'SEO',
    serviceType: 'SEO',
    value: 5000,
    status: 'WON',
  });
  assert.equal(next.response.status, 201);
  clients = await request('/clients');
  client = clients.data.find(
    (c: { prospectId: string }) => c.prospectId === prospectId,
  );
  assert.equal(Number(client.projectValue), 30000);
  assert.equal(
    clients.data.filter(
      (c: { prospectId: string }) => c.prospectId === prospectId,
    ).length,
    1,
  );
  assert.equal((await request(`/prospects/${prospectId}`)).data.status, 'WON');
  assert.equal(
    (await request(`/prospects/${prospectId}`, 'DELETE')).response.status,
    409,
  );
  assert.equal(
    (await request(`/deals/${dealId}`, 'PATCH', { status: 'LOST' })).response
      .status,
    409,
  );
});
test('concurrent won deals retain their combined client value', async () => {
  const results = await Promise.all(
    [2000, 3000].map((value) =>
      request('/deals', 'POST', {
        prospectId,
        title: `Concurrent ${value}`,
        serviceType: 'Maintenance',
        value,
        status: 'WON',
      }),
    ),
  );
  results.forEach((r) => assert.equal(r.response.status, 201));
  const clients = await request('/clients');
  const client = clients.data.find(
    (c: { prospectId: string }) => c.prospectId === prospectId,
  );
  assert.equal(Number(client.projectValue), 35000);
});
test('CSV preview does not insert and commit rejects normalized duplicates', async () => {
  const rows = [
    { ...prospect, businessName: `${unique} CSV`, email: '', status: 'NEW' },
    { ...prospect, businessName: `${unique} CSV`, email: '', status: 'NEW' },
    { businessName: 'Invalid' },
  ];
  const preview = await request('/prospects/import', 'POST', { rows });
  assert.equal(preview.data.valid, 1);
  assert.equal(preview.data.invalid, 1);
  assert.equal(preview.data.duplicates, 1);
  assert.equal(
    (await request(`/prospects?search=${encodeURIComponent(unique + ' CSV')}`))
      .data.total,
    0,
  );
  const commit = await request('/prospects/import', 'POST', {
    rows,
    commit: true,
  });
  assert.equal(commit.data.valid, 1);
  assert.equal(
    (await request('/prospects/import', 'POST', { rows, commit: true })).data
      .valid,
    0,
  );
});
test('non-admin can work prospects but cannot manage users or delete', async () => {
  const email = `${randomUUID()}@example.com`;
  const password = randomUUID();
  const r = await request('/users', 'POST', {
    firstName: 'Test',
    lastName: 'Sales',
    email,
    password,
    role: 'SALES',
  });
  assert.equal(r.response.status, 201);
  salesId = r.data.id;
  const login = await request('/auth/login', 'POST', { email, password });
  const salesToken = login.data.accessToken;
  assert.equal(
    (await request('/users', 'POST', {}, { token: salesToken })).response
      .status,
    403,
  );
  assert.equal(
    (
      await request(`/prospects/${prospectId}`, 'DELETE', undefined, {
        token: salesToken,
      })
    ).response.status,
    403,
  );
  assert.equal(
    (await request('/prospects', 'GET', undefined, { token: salesToken }))
      .response.status,
    200,
  );
});
test('analytics are calculated and logout revokes refresh session', async () => {
  const r = await request('/analytics');
  assert.equal(r.response.status, 200);
  assert.ok(r.data.kpis.revenue >= 30000);
  assert.ok(
    r.data.funnel.find((f: { name: string }) => f.name === 'Clients').value >=
      1,
  );
  assert.equal(
    (await request('/auth/logout', 'POST', {}, { cookie })).response.status,
    204,
  );
  assert.equal(
    (await request('/auth/refresh', 'POST', {}, { cookie })).response.status,
    401,
  );
});
