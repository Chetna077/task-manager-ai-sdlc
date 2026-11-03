// @ts-check
const { test, expect } = require('@playwright/test');

// Implements the Gherkin scenarios in tests/features/*.feature end to end
// against the real running app: create -> edit -> status change -> search -> delete.

// The dev server (and its SQLite file) is shared across every test in this
// file, so each test must clear existing tasks first or state leaks between
// tests (e.g. a task created in one test still being visible in the next).
async function clearAllTasks(request, baseURL) {
  const res = await request.get(`${baseURL}/api/tasks?pageSize=100`);
  const { items } = await res.json();
  await Promise.all(items.map((t) => request.post(`${baseURL}/api/tasks/${t.id}/archive`)));
  // more than one page of leftovers: go again until the active list is empty
  if (items.length === 100) await clearAllTasks(request, baseURL);
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

test('rejects an empty title with an inline error (SCRUM-16)', async ({ page }) => {
  await page.click('#addForm button[type="submit"]');
  // no task is added, the error is shown next to the field, and focus lands on it
  await expect(page.locator('#emptyState')).toBeVisible();
  await expect(page.locator('#titleError')).toHaveText('Title is required.');
  await expect(page.locator('#title')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#title')).toBeFocused();

  // typing clears the error
  await page.fill('#title', 'Now valid');
  await expect(page.locator('#titleError')).toBeHidden();
  await expect(page.locator('#title')).not.toHaveAttribute('aria-invalid', 'true');
});

test('whitespace-only title is rejected inline, also when editing (SCRUM-16)', async ({ page }) => {
  await page.fill('#title', '   ');
  await page.click('#addForm button[type="submit"]');
  await expect(page.locator('#titleError')).toBeVisible();

  await page.fill('#title', 'Editable');
  await page.click('#addForm button[type="submit"]');
  const row = page.locator('.task-row', { hasText: 'Editable' });
  await row.locator('.btn-edit').click();
  await page.getByRole('textbox', { name: 'Edit title' }).fill('');
  await page.click('.task-row >> text=Save');
  await expect(page.locator('.field-error', { hasText: 'Title is required.' }).last()).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Edit title' })).toBeFocused();
});

test('keyboard: Enter saves an edit, Escape cancels it, focus returns to Edit (SCRUM-16)', async ({ page }) => {
  await page.fill('#title', 'Keyboard task');
  await page.click('#addForm button[type="submit"]');
  const row = page.locator('.task-row', { hasText: 'Keyboard task' });

  await row.locator('.btn-edit').focus();
  await page.keyboard.press('Enter');
  const titleInput = page.getByRole('textbox', { name: 'Edit title' });
  await expect(titleInput).toBeFocused(); // focus moves into the editor

  await titleInput.fill('Discarded');
  await page.keyboard.press('Escape');
  await expect(page.locator('.task-row', { hasText: 'Keyboard task' })).toBeVisible();
  await expect(page.locator('.task-row .btn-edit')).toBeFocused();

  await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: 'Edit title' }).fill('Saved by keyboard');
  await page.keyboard.press('Enter');
  await expect(page.locator('.task-row', { hasText: 'Saved by keyboard' })).toBeVisible();
  await expect(page.locator('.task-row .btn-edit')).toBeFocused();
});

test('keyboard: archive with Space and focus lands on the list (SCRUM-16)', async ({ page }) => {
  await page.fill('#title', 'To archive');
  await page.click('#addForm button[type="submit"]');
  await page.locator('.task-row .btn-archive').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.task-row')).toHaveCount(0);
  await expect(page.locator('#taskList')).toBeFocused();
  await expect(page.locator('#liveStatus')).toHaveText('Archived "To archive"');
});

test('skip link is the first tab stop (SCRUM-16)', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
});

test('a failed request shows an error with Retry that re-runs it (SCRUM-16)', async ({ page }) => {
  await page.fill('#title', 'Flaky');
  await page.click('#addForm button[type="submit"]');
  const row = page.locator('.task-row', { hasText: 'Flaky' });
  await expect(row).toBeVisible();

  let failures = 1;
  await page.route('**/api/tasks/*/archive', (route) => {
    if (failures-- > 0) return route.abort();
    return route.continue();
  });

  await row.locator('.btn-archive').click();
  await expect(page.locator('#toast')).toBeVisible();
  await expect(page.locator('#toastMessage')).toContainText('Could not reach the server');
  await expect(row).toBeVisible(); // nothing changed yet

  await page.click('#toastRetry');
  await expect(row).toHaveCount(0);
  await expect(page.locator('#toast')).toBeHidden();
});

test('a 4xx error is shown without Retry and can be dismissed (SCRUM-16)', async ({ page }) => {
  await page.route('**/api/tasks', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"tags are bad"}' });
    }
    return route.continue();
  });
  await page.fill('#title', 'Rejected');
  await page.click('#addForm button[type="submit"]');
  await expect(page.locator('#toastMessage')).toHaveText('tags are bad');
  await expect(page.locator('#toastRetry')).toBeHidden();
  await expect(page.locator('#title')).toHaveValue('Rejected'); // input kept
  await page.click('#toastDismiss');
  await expect(page.locator('#toast')).toBeHidden();
});

test('edit a task title', async ({ page }) => {
  await page.fill('#title', 'Draft');
  await page.click('#addForm button[type="submit"]');
  await expect(page.locator('.task-row', { hasText: 'Draft' })).toBeVisible();

  await page.click('.task-row >> text=Edit');
  const editInput = page.getByRole('textbox', { name: 'Edit title' });
  await editInput.fill('Final draft');
  await page.click('.task-row >> text=Save');

  await expect(page.locator('.task-row', { hasText: 'Final draft' })).toBeVisible();
  await expect(page.locator('.task-row', { hasText: 'Draft', hasNotText: 'Final' })).toHaveCount(0);
});

test('edit a task description (TM-101)', async ({ page }) => {
  await page.fill('#title', 'Plan launch');
  await page.click('#addForm button[type="submit"]');
  const row = page.locator('.task-row', { hasText: 'Plan launch' });
  await expect(row).toBeVisible();

  await row.locator('.btn-edit').click();
  await page.getByRole('textbox', { name: 'Edit description' }).fill('Coordinate with marketing');
  await page.click('.task-row >> text=Save');

  await expect(row.locator('.task-description')).toHaveText('Coordinate with marketing');
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

test('archive hides the task; archived view lists it; restore brings it back (SCRUM-7/8)', async ({ page }) => {
  await page.fill('#title', 'Old task');
  await page.click('#addForm button[type="submit"]');
  const row = page.locator('.task-row', { hasText: 'Old task' });
  await expect(row).toBeVisible();

  await row.locator('.btn-archive').click();
  await expect(row).toHaveCount(0);

  await page.check('#showArchived');
  const archivedRow = page.locator('.task-row', { hasText: 'Old task' });
  await expect(archivedRow).toBeVisible();
  await expect(archivedRow.locator('.btn-edit')).toBeHidden();

  await archivedRow.locator('.btn-restore').click();
  await expect(archivedRow).toHaveCount(0);

  await page.uncheck('#showArchived');
  await expect(page.locator('.task-row', { hasText: 'Old task' })).toBeVisible();
});

test('add tags and filter by tag (SCRUM-12/13)', async ({ page }) => {
  await page.fill('#title', 'Tagged one');
  await page.fill('#tags', 'Work, urgent');
  await page.click('#addForm button[type="submit"]');
  await page.fill('#title', 'Untagged');
  await page.click('#addForm button[type="submit"]');

  const row = page.locator('.task-row', { hasText: 'Tagged one' });
  await expect(row.locator('.tag-chip')).toHaveText(['work', 'urgent']);

  await page.fill('#tagFilter', 'work');
  await expect(page.locator('.task-row', { hasText: 'Untagged' })).toHaveCount(0);
  await expect(row).toBeVisible();
});

test('pagination: next/previous, and filters reset to page 1 (SCRUM-14)', async ({ page, request, baseURL }) => {
  for (let i = 1; i <= 7; i++) {
    await request.post(`${baseURL}/api/tasks`, { data: { title: `Paged ${i}`, tags: i === 7 ? ['last'] : [] } });
  }
  await page.reload();
  await page.selectOption('#pageSize', '5');
  await expect(page.locator('.task-row')).toHaveCount(5);
  await expect(page.locator('#pageInfo')).toHaveText('Page 1 of 2 (7 tasks)');
  await expect(page.locator('#prevPage')).toBeDisabled();

  await page.click('#nextPage');
  await expect(page.locator('.task-row')).toHaveCount(2);
  await expect(page.locator('#nextPage')).toBeDisabled();

  await page.fill('#search', 'paged');
  await expect(page.locator('#pageInfo')).toHaveText('Page 1 of 2 (7 tasks)');
  await page.fill('#tagFilter', 'last');
  await expect(page.locator('#pageInfo')).toHaveText('Page 1 of 1 (1 task)');
});
