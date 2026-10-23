const el = (id) => document.getElementById(id);

const state = {
  search: '',
  status: '',
  priority: '',
  tag: '',
  archived: false,
  page: 1,
  pageSize: 10,
  sortBy: 'created_at',
  sortDir: 'asc',
};

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const NEXT_STATUS = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
const ADVANCE_LABEL = { todo: 'Start', in_progress: 'Done', done: 'Reopen' };

// Network failures and 5xx are worth retrying; a 4xx means the request itself
// was rejected, so repeating it unchanged would fail the same way.
class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.retryable = status === 0 || status >= 500;
  }
}

let toastRetry = null;

function showToast(message, retry) {
  el('toastMessage').textContent = message;
  toastRetry = retry || null;
  el('toastRetry').hidden = !retry;
  el('toast').hidden = false;
}

function hideToast() {
  toastRetry = null;
  el('toast').hidden = true;
}

// Polite announcement for screen readers (no visual change).
function announce(message) {
  const live = el('liveStatus');
  live.textContent = '';
  // set on the next tick so repeated identical messages are re-announced
  setTimeout(() => {
    live.textContent = message;
  }, 50);
}

async function apiFetch(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new ApiError('Could not reach the server. Please try again.', 0);
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      /* ignore body parse failure */
    }
    throw new ApiError(message, res.status);
  }
  return res;
}

// Runs a user-triggered action. On failure shows the error, with a Retry
// button (when retrying can help) that re-runs the same action. Resolves to
// true on success so callers can chain UI follow-ups.
async function run(action) {
  try {
    await action();
    hideToast();
    return true;
  } catch (err) {
    showToast(err.message, err.retryable ? () => run(action) : null);
    return false;
  }
}

function buildQuery() {
  const params = new URLSearchParams();
  if (state.search) params.set('search', state.search);
  if (state.status) params.set('status', state.status);
  if (state.priority) params.set('priority', state.priority);
  if (state.tag) params.set('tag', state.tag);
  if (state.archived) params.set('archived', 'true');
  params.set('page', String(state.page));
  params.set('pageSize', String(state.pageSize));
  params.set('sortBy', state.sortBy);
  params.set('sortDir', state.sortDir);
  return params.toString();
}

function parseTags(text) {
  return text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function todayLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isOverdue(task) {
  if (!task.due_date || task.status === 'done') return false;
  // Compare plain date strings (both YYYY-MM-DD) rather than Date objects,
  // since new Date('YYYY-MM-DD') parses as UTC while new Date() is local -
  // mixing the two misflags "due today" as overdue depending on timezone.
  return task.due_date.slice(0, 10) < todayLocalDateString();
}

// After a re-render the element the user acted on may be gone; put focus on a
// sensible target instead of dropping it to <body>.
let pendingFocus = null;

function restoreFocus() {
  if (!pendingFocus) return;
  const target = document.querySelector(pendingFocus) || el('taskList');
  pendingFocus = null;
  target.focus();
}

const rowSelector = (id, child) => `.task-row[data-id="${id}"] ${child}`;

function renderTasks(tasks) {
  const list = el('taskList');
  const empty = el('emptyState');
  list.innerHTML = '';

  if (tasks.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const template = el('taskRowTemplate');
  for (const task of tasks) {
    const node = template.content.cloneNode(true);
    const row = node.querySelector('.task-row');
    row.dataset.id = task.id;
    if (task.status === 'done') row.classList.add('done');

    const toggle = node.querySelector('.task-done-toggle');
    toggle.checked = task.status === 'done';
    toggle.setAttribute('aria-label', `Mark "${task.title}" done`);
    toggle.addEventListener('change', () =>
      setStatus(task.id, toggle.checked ? 'done' : 'todo', '.task-done-toggle')
    );

    node.querySelector('.task-title').textContent = task.title;
    node.querySelector('.task-description').textContent = task.description || '';
    node.querySelector('.task-status').textContent = STATUS_LABELS[task.status];

    const priorityEl = node.querySelector('.task-priority');
    priorityEl.textContent = task.priority;

    const tagsEl = node.querySelector('.task-tags');
    for (const tag of task.tags || []) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'tag-chip';
      chip.textContent = tag;
      chip.setAttribute('aria-label', `Filter by tag ${tag}`);
      chip.addEventListener('click', () => {
        state.tag = tag;
        el('tagFilter').value = tag;
        resetAndLoad();
      });
      tagsEl.appendChild(chip);
    }

    const dueEl = node.querySelector('.task-due');
    if (task.due_date) {
      dueEl.textContent = `Due ${task.due_date}`;
      if (isOverdue(task)) {
        dueEl.classList.add('overdue');
        dueEl.textContent += ' (overdue)';
      }
    }

    const editBtn = node.querySelector('.btn-edit');
    editBtn.setAttribute('aria-label', `Edit "${task.title}"`);
    editBtn.addEventListener('click', () => startEdit(task));

    const advanceBtn = node.querySelector('.btn-advance');
    advanceBtn.textContent = ADVANCE_LABEL[task.status];
    advanceBtn.setAttribute('aria-label', `${ADVANCE_LABEL[task.status]} "${task.title}"`);
    advanceBtn.addEventListener('click', () => setStatus(task.id, NEXT_STATUS[task.status], '.btn-advance'));

    const archiveBtn = node.querySelector('.btn-archive');
    archiveBtn.setAttribute('aria-label', `Archive "${task.title}"`);
    archiveBtn.addEventListener('click', () => archiveTask(task));

    const restoreBtn = node.querySelector('.btn-restore');
    restoreBtn.setAttribute('aria-label', `Restore "${task.title}"`);
    restoreBtn.addEventListener('click', () => restoreTask(task));

    // Archived tasks are read-only apart from Restore; active ones can't be restored.
    if (state.archived) {
      row.classList.add('archived');
      for (const sel of ['.btn-edit', '.btn-advance', '.btn-archive']) node.querySelector(sel).hidden = true;
      toggle.disabled = true;
    } else {
      restoreBtn.hidden = true;
    }

    list.appendChild(node);
  }
}

let loadTasksSequence = 0;

async function loadTasks() {
  const requestId = ++loadTasksSequence;
  const res = await apiFetch(`/api/tasks?${buildQuery()}`);
  const body = await res.json();
  // Ignore this response if a newer loadTasks() call has started since we
  // began - otherwise a slow response for an earlier keystroke can overwrite
  // the list with stale results after a faster, more recent request landed.
  if (requestId !== loadTasksSequence) return;

  // The last page can vanish (e.g. its only task was archived); step back
  // to the new last page instead of showing an empty list.
  if (body.items.length === 0 && body.total > 0 && state.page > body.totalPages) {
    state.page = body.totalPages;
    return loadTasks();
  }
  renderTasks(body.items);
  renderPager(body);
  restoreFocus();
}

// Entry point for user-driven reloads: errors surface as a retryable toast.
function reload() {
  return run(loadTasks);
}

function renderPager({ page, totalPages, total }) {
  const pager = el('pager');
  pager.hidden = total === 0;
  el('pageInfo').textContent = `Page ${page} of ${totalPages} (${total} task${total === 1 ? '' : 's'})`;
  el('prevPage').disabled = page <= 1;
  el('nextPage').disabled = page >= totalPages;
}

// Any change to search/filter/sort/view starts again from page 1.
function resetAndLoad() {
  state.page = 1;
  return reload();
}

function setStatus(id, status, focusChild) {
  return run(async () => {
    await apiFetch(`/api/tasks/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    pendingFocus = rowSelector(id, focusChild);
    await loadTasks();
    announce(`Status set to ${STATUS_LABELS[status]}`);
  });
}

// The acted-on button leaves the list, so focus moves to the list itself.
function archiveTask(task) {
  return run(async () => {
    await apiFetch(`/api/tasks/${task.id}/archive`, { method: 'POST' });
    pendingFocus = '#taskList';
    await loadTasks();
    announce(`Archived "${task.title}"`);
  });
}

function restoreTask(task) {
  return run(async () => {
    await apiFetch(`/api/tasks/${task.id}/restore`, { method: 'POST' });
    pendingFocus = '#taskList';
    await loadTasks();
    announce(`Restored "${task.title}"`);
  });
}

function titleError(value) {
  const title = value.trim();
  if (!title) return 'Title is required.';
  if (title.length > 200) return 'Title must be 200 characters or fewer.';
  return '';
}

// Shows/clears an inline error and keeps aria-invalid in sync on the input.
function setFieldError(input, errorEl, message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function startEdit(task) {
  const row = document.querySelector(`.task-row[data-id="${task.id}"]`);
  row.innerHTML = '';

  const titleErrorId = `edit-title-error-${task.id}`;

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = task.title;
  titleInput.setAttribute('aria-label', 'Edit title');
  titleInput.setAttribute('aria-required', 'true');
  titleInput.setAttribute('aria-describedby', titleErrorId);
  titleInput.maxLength = 200;

  const titleErrorEl = document.createElement('span');
  titleErrorEl.id = titleErrorId;
  titleErrorEl.className = 'field-error';
  titleErrorEl.setAttribute('role', 'alert');
  titleErrorEl.hidden = true;
  titleInput.addEventListener('input', () => setFieldError(titleInput, titleErrorEl, ''));

  const descriptionInput = document.createElement('input');
  descriptionInput.type = 'text';
  descriptionInput.value = task.description || '';
  descriptionInput.setAttribute('aria-label', 'Edit description');
  descriptionInput.maxLength = 2000;

  const dueInput = document.createElement('input');
  dueInput.type = 'date';
  dueInput.value = task.due_date || '';
  dueInput.setAttribute('aria-label', 'Edit due date');

  const tagsInput = document.createElement('input');
  tagsInput.type = 'text';
  tagsInput.value = (task.tags || []).join(', ');
  tagsInput.setAttribute('aria-label', 'Edit tags');

  const prioritySelect = document.createElement('select');
  prioritySelect.setAttribute('aria-label', 'Edit priority');
  for (const p of ['low', 'medium', 'high']) {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    if (p === task.priority) opt.selected = true;
    prioritySelect.appendChild(opt);
  }

  const save = async () => {
    const message = titleError(titleInput.value);
    setFieldError(titleInput, titleErrorEl, message);
    if (message) {
      titleInput.focus();
      return;
    }
    await run(async () => {
      await apiFetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleInput.value,
          description: descriptionInput.value || null,
          due_date: dueInput.value || null,
          priority: prioritySelect.value,
          tags: parseTags(tagsInput.value),
        }),
      });
      pendingFocus = rowSelector(task.id, '.btn-edit');
      await loadTasks();
      announce('Task saved');
    });
  };

  const cancel = () => {
    pendingFocus = rowSelector(task.id, '.btn-edit');
    reload();
  };

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', save);

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', cancel);

  // Keyboard: Enter in a text/date field saves, Escape anywhere in the row cancels.
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault();
      save();
    }
  });

  row.append(titleInput, titleErrorEl, descriptionInput, dueInput, tagsInput, prioritySelect, saveBtn, cancelBtn);
  titleInput.focus();
}

function wireControls() {
  el('search').addEventListener('input', (e) => {
    state.search = e.target.value;
    resetAndLoad();
  });
  el('statusFilter').addEventListener('change', (e) => {
    state.status = e.target.value;
    resetAndLoad();
  });
  el('priorityFilter').addEventListener('change', (e) => {
    state.priority = e.target.value;
    resetAndLoad();
  });
  el('tagFilter').addEventListener('input', (e) => {
    state.tag = e.target.value.trim();
    resetAndLoad();
  });
  el('showArchived').addEventListener('change', (e) => {
    state.archived = e.target.checked;
    el('addForm').hidden = state.archived;
    resetAndLoad();
  });
  el('sortBy').addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    resetAndLoad();
  });
  el('sortDir').addEventListener('change', (e) => {
    state.sortDir = e.target.value;
    resetAndLoad();
  });

  el('pageSize').addEventListener('change', (e) => {
    state.pageSize = Number(e.target.value);
    resetAndLoad();
  });
  el('prevPage').addEventListener('click', () => {
    state.page -= 1;
    reload();
  });
  el('nextPage').addEventListener('click', () => {
    state.page += 1;
    reload();
  });

  el('toastRetry').addEventListener('click', () => {
    if (toastRetry) toastRetry();
  });
  el('toastDismiss').addEventListener('click', hideToast);

  const titleEl = el('title');
  const titleErrorEl = el('titleError');
  titleEl.addEventListener('blur', () => {
    // only flag a value that is wrong; an untouched empty field stays quiet
    if (titleEl.value) setFieldError(titleEl, titleErrorEl, titleError(titleEl.value));
  });
  titleEl.addEventListener('input', () => setFieldError(titleEl, titleErrorEl, ''));

  el('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const message = titleError(titleEl.value);
    setFieldError(titleEl, titleErrorEl, message);
    if (message) {
      titleEl.focus();
      return;
    }
    const ok = await run(async () => {
      await apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleEl.value,
          description: el('description').value || null,
          due_date: el('dueDate').value || null,
          priority: el('priority').value,
          tags: parseTags(el('tags').value),
        }),
      });
      await loadTasks();
    });
    if (ok) {
      form.reset();
      el('priority').value = 'medium';
      announce('Task added');
      titleEl.focus();
    }
  });
}

wireControls();
reload();
