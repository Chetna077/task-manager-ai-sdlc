// @ts-check
const { test, expect } = require('@playwright/test');

// Implements the Gherkin scenarios in tests/features/*.feature end to end
// against the real running app: create -> edit -> status change -> search -> delete.

// The dev server (and its SQLite file) is shared across every test in this
// file, so each test must clear existing tasks first or state leaks between
// tests (e.g. a task created in one test still being visible in the next).
async function clearAllTasks(request, baseURL) {
  const res = await request.get(`${baseURL}/api/tasks`);
  const tasks = await res.json();
  await Promise.all(tasks.map((t) => request.delete(`${baseURL}/api/tasks/${t.id}`)));
}

test.beforeEach(async ({ page, request, baseURL }) => {
  await clearAllTasks(request, baseURL);
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/');
});

test('create a task', async ({ page }) => {
  await page.fill('#title', 'Write report');
  await page.selectOption('#priority', 'high');
  await page.click('#addForm button[type="submit"]');

  const row = page.locator('.task-row', { hasText: 'Write report' });
  await expect(row).toBeVisible();
  await expect(row.locator('.task-priority')).toHaveText('high');
});

test('rejects an empty title', async ({ page }) => {
  await page.click('#addForm button[type="submit"]');
  // native "required" validation blocks submission; no task should be added
  await expect(page.locator('#emptyState')).toBeVisible();
});

test('edit a task title', async ({ page }) => {
  await page.fill('#title', 'Draft');
  await page.click('#addForm button[type="submit"]');
  await expect(page.locator('.task-row', { hasText: 'Draft' })).toBeVisible();

  await page.click('.task-row >> text=Edit');
  const editInput = page.locator('.task-row input[type="text"]');
  await editInput.fill('Final draft');
  await page.click('.task-row >> text=Save');

  await expect(page.locator('.task-row', { hasText: 'Final draft' })).toBeVisible();
  await expect(page.locator('.task-row', { hasText: 'Draft', hasNotText: 'Final' })).toHaveCount(0);
});

test('advance status to Done then reopen', async ({ page }) => {
  await page.fill('#title', 'Ship feature');
  await page.click('#addForm button[type="submit"]');

  const row = page.locator('.task-row', { hasText: 'Ship feature' });
  await row.locator('.btn-advance').click(); // todo -> in_progress
  await expect(row.locator('.btn-advance')).toHaveText('Done');

  await row.locator('.btn-advance').click(); // in_progress -> done
  await expect(row).toHaveClass(/done/);
  await expect(row.locator('.btn-advance')).toHaveText('Reopen');

  await row.locator('.btn-advance').click(); // reopen -> todo
  await expect(row).not.toHaveClass(/done/);
});

test('search filters the visible list', async ({ page }) => {
  for (const title of ['Write report', 'Fix bug']) {
    await page.fill('#title', title);
    await page.click('#addForm button[type="submit"]');
  }

  await page.fill('#search', 'write');
  await expect(page.locator('.task-row', { hasText: 'Write report' })).toBeVisible();
  await expect(page.locator('.task-row', { hasText: 'Fix bug' })).toHaveCount(0);
});

test('delete removes the task', async ({ page }) => {
  await page.fill('#title', 'Old task');
  await page.click('#addForm button[type="submit"]');
  const row = page.locator('.task-row', { hasText: 'Old task' });
  await expect(row).toBeVisible();

  await row.locator('.btn-delete').click();
  await expect(row).toHaveCount(0);
});
