import { test, expect } from '@playwright/test';
test('sign in, create prospect, add note, schedule follow-up, move stage, and delete', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page).toHaveURL(/login/);
  await page.getByLabel('Email address').fill(process.env.SEED_ADMIN_EMAIL!);
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in to your workspace' }).click();
  await expect(
    page.getByRole('heading', { name: /Good to see you/ }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
  await page.getByRole('button', { name: 'Add prospect', exact: true }).click();
  const name = `Browser Test ${Date.now()}`;
  await page.getByLabel('Business name *', { exact: true }).fill(name);
  await page
    .getByLabel('Contact person', { exact: true })
    .fill('Browser Contact');
  await page
    .getByRole('button', { name: 'Create prospect', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('link', { name: 'Prospects', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search prospects…' }).fill(name);
  await page.getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'New note' })
    .fill('Follow up about a new website on Friday.');
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await expect(
    page.getByText('Follow up about a new website on Friday.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Follow-up', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByLabel('Notes', { exact: true })
    .fill('Browser follow-up check');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Follow-ups', exact: true }).click();
  await expect(page.getByText('Browser follow-up check')).toBeVisible();
  await page.getByRole('button', { name: /Complete follow-up/ }).click();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Pipeline', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search prospects…' }).fill(name);
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.request().method() === 'PUT' &&
        r.url().includes('/api/prospects/') &&
        r.ok(),
    ),
    page.getByLabel(`Move ${name} to stage`).selectOption('INTERESTED'),
  ]);
  await expect(page.getByLabel(`Move ${name} to stage`)).toBeEnabled();
  await expect(page.getByLabel(`Move ${name} to stage`)).toHaveValue(
    'INTERESTED',
  );
  await page.getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.locator('.detail-badges .status-INTERESTED')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Delete prospect', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete prospect', exact: true })
    .click();
  await expect(page).toHaveURL(/\/prospects$/);
  expect(errors).toEqual([]);
});
test('all workspace pages load, mobile navigation works, and logout protects routes', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(process.env.SEED_ADMIN_EMAIL!);
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in to your workspace' }).click();
  await expect(
    page.getByRole('heading', { name: /Good to see you/ }),
  ).toBeVisible();
  for (const [path, heading] of [
    ['today', 'Make today count.'],
    ['followups', 'Follow-ups'],
    ['meetings', 'Meetings'],
    ['deals', 'Deals'],
    ['clients', 'Clients'],
    ['outreach', 'Outreach'],
    ['analytics', 'Analytics'],
    ['settings', 'Settings'],
  ]) {
    await page.goto(`/${path}`);
    await expect(
      page.getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Good to see you/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('link', { name: 'Prospects', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Prospects', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto('/deals');
  await expect(page).toHaveURL(/login/);
});
