import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { db } from '../../apps/api/src/db';

const names: string[] = [];
const emails: string[] = [];
test.afterEach(async () => {
  const records = await db.prospect.findMany({
    where: { businessName: { in: names.splice(0) } },
  });
  for (const record of records) {
    await db.client.deleteMany({ where: { prospectId: record.id } });
    await db.prospect.delete({ where: { id: record.id } });
  }
  await db.user.deleteMany({ where: { email: { in: emails.splice(0) } } });
});
test.afterAll(async () => {
  await db.$disconnect();
});
async function login(
  page: Page,
  email = process.env.SEED_ADMIN_EMAIL!,
  password = process.env.SEED_ADMIN_PASSWORD!,
) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in to your workspace' }).click();
  await expect(
    page.getByRole('heading', { name: /Good to see you/ }),
  ).toBeVisible();
}
test('CSV preview validates rows and commits only unique valid prospects', async ({
  page,
}) => {
  const name = `E2E Import ${randomUUID()}`;
  names.push(name);
  await login(page);
  await page.goto('/prospects');
  await page.getByRole('button', { name: 'Import CSV' }).click();
  const csv = `Business Name,Category,City,Source\n${name},Dental Clinic,Vadodara,Referral\n${name},Dental Clinic,Vadodara,Referral\nMissing category,,Vadodara,Referral\n`;
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'prospects.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
  await page.getByRole('button', { name: 'Validate CSV' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('1 Valid', { exact: true })).toBeVisible();
  await expect(dialog.getByText('1 Invalid', { exact: true })).toBeVisible();
  await expect(dialog.getByText('1 Duplicates', { exact: true })).toBeVisible();
  expect(await db.prospect.count({ where: { businessName: name } })).toBe(0);
  await page.getByRole('button', { name: 'Import 1 valid rows' }).click();
  await expect(
    dialog.getByText('Imported 1 prospects successfully.'),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('textbox', { name: /Search prospects/ }).fill(name);
  await expect(page.getByRole('link', { name, exact: true })).toHaveCount(1);
  expect(await db.prospect.count({ where: { businessName: name } })).toBe(1);
});
test('winning a proposal creates a client and allows retainer updates', async ({
  page,
}) => {
  const name = `E2E Client ${randomUUID()}`;
  names.push(name);
  await login(page);
  await page.getByRole('button', { name: 'Add prospect', exact: true }).click();
  await page.getByLabel('Business name *', { exact: true }).fill(name);
  await page
    .getByRole('button', { name: 'Create prospect', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/prospects');
  await page.getByRole('textbox', { name: /Search prospects/ }).fill(name);
  await page.getByRole('link', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Deal', exact: true }).click();
  await page.getByLabel('Deal title *').fill('Website engagement');
  await page.getByLabel('Deal value').fill('42000');
  await page.getByLabel('Stage', { exact: true }).selectOption('PROPOSAL');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/deals');
  await page.getByRole('textbox', { name: /Search deals/ }).fill(name);
  await page
    .getByRole('row')
    .filter({ hasText: name })
    .getByRole('button', { name: 'Edit deals' })
    .click();
  await page.getByLabel('Stage', { exact: true }).selectOption('WON');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/clients');
  await page.getByRole('textbox', { name: /Search clients/ }).fill(name);
  const row = page.getByRole('row').filter({ hasText: name });
  await expect(row).toHaveCount(1);
  await expect(row.getByText('₹42,000', { exact: true })).toBeVisible();
  await row.getByRole('button', { name: 'Edit clients' }).click();
  await page.getByLabel('Monthly retainer').fill('5000');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await page.getByRole('textbox', { name: /Search clients/ }).fill(name);
  await expect(row.getByText('₹5,000', { exact: true })).toBeVisible();
});
test('administrator creates a sales member who can sign in without admin controls', async ({
  page,
}) => {
  const email = `e2e-${randomUUID()}@example.com`;
  emails.push(email);
  const password = randomUUID();
  await login(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Add member' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('First name', { exact: true }).fill('Sales tester');
  await dialog.getByLabel('Last name', { exact: true }).fill('E2E');
  await dialog.getByLabel('Email', { exact: true }).fill(email);
  await dialog.getByLabel('Initial password').fill(password);
  await dialog.getByLabel('Role', { exact: true }).selectOption('SALES');
  await dialog.getByRole('button', { name: 'Create member' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole('cell', { name: email, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await login(page, email, password);
  await page.goto('/settings');
  await expect(
    page.getByRole('heading', { name: 'Settings', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add member' })).toHaveCount(0);
});
