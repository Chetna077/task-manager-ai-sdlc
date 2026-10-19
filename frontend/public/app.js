const el = (id) => document.getElementById(id);

const state = {
  search: '',
  status: '',
  priority: '',
  tag: '',
  archived: false,
  sortBy: 'created_at',
  sortDir: 'asc',
};

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const NEXT_STATUS = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
const ADVANCE_LABEL = { todo: 'Start', in_progress: 'Done', done: 'Reopen' };

function showToast(message) {
  const toast = el('toast');
  toast.textContent = message;
  toast.hidden = false;
}

function hideToast() {
  el('toast').hidden = true;
}

async function apiFetch(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch (err) {
    showToast('Could not reach the server. Please try again.');
    throw err;
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      /* ignore body parse failure */
    }
    showToast(message);
    throw new Error(message);
  }
  hideToast();
  return res;
}

function buildQuery() {
  const params = new URLSearchParams();
  if (state.search) params.set('search', state.search);
  if (state.status) params.set('status', state.status);
  if (state.priority) params.set('priority', state.priority);
  if (state.tag) params.set('tag', state.tag);
  if (state.archived) params.set('archived', 'true');
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
    toggle.addEventListener('change', () => setStatus(task.id, toggle.checked ? 'done' : 'todo'));

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
        loadTasks();
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

    node.querySelector('.btn-edit').addEventListener('click', () => startEdit(task));

    const advanceBtn = node.querySelector('.btn-advance');
    advanceBtn.textContent = ADVANCE_LABEL[task.status];
    advanceBtn.setAttribute('aria-label', `${ADVANCE_LABEL[task.status]} "${task.title}"`);
    advanceBtn.addEventListener('click', () => setStatus(task.id, NEXT_STATUS[task.status]));

    const archiveBtn = node.querySelector('.btn-archive');
    archiveBtn.setAttribute('aria-label', `Archive "${task.title}"`);
    archiveBtn.addEventListener('click', () => archiveTask(task.id));

    const restoreBtn = node.querySelector('.btn-restore');
    restoreBtn.setAttribute('aria-label', `Restore "${task.title}"`);
    restoreBtn.addEventListener('click', () => restoreTask(task.id));

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
  const tasks = await res.json();
  // Ignore this response if a newer loadTasks() call has started since we
  // began - otherwise a slow response for an earlier keystroke can overwrite
  // the list with stale results after a faster, more recent request landed.
  if (requestId !== loadTasksSequence) return;
  renderTasks(tasks);
}

async function setStatus(id, status) {
  await apiFetch(`/api/tasks/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  await loadTasks();
}

async function archiveTask(id) {
  await apiFetch(`/api/tasks/${id}/archive`, { method: 'POST' });
  await loadTasks();
}

async function restoreTask(id) {
  await apiFetch(`/api/tasks/${id}/restore`, { method: 'POST' });
  await loadTasks();
}

function startEdit(task) {
  const row = document.querySelector(`.task-row[data-id="${task.id}"]`);
  row.innerHTML = '';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = task.title;
  titleInput.setAttribute('aria-label', 'Edit title');
  titleInput.maxLength = 200;

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

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', async () => {
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
    await loadTasks();
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', loadTasks);

  row.append(titleInput, descriptionInput, dueInput, tagsInput, prioritySelect, saveBtn, cancelBtn);
}

function wireControls() {
  el('search').addEventListener('input', (e) => {
    state.search = e.target.value;
    loadTasks();
  });
  el('statusFilter').addEventListener('change', (e) => {
    state.status = e.target.value;
    loadTasks();
  });
  el('priorityFilter').addEventListener('change', (e) => {
    state.priority = e.target.value;
    loadTasks();
  });
  el('tagFilter').addEventListener('input', (e) => {
    state.tag = e.target.value.trim();
    loadTasks();
  });
  el('showArchived').addEventListener('change', (e) => {
    state.archived = e.target.checked;
    el('addForm').hidden = state.archived;
    loadTasks();
  });
  el('sortBy').addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    loadTasks();
  });
  el('sortDir').addEventListener('change', (e) => {
    state.sortDir = e.target.value;
    loadTasks();
  });

  el('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = el('title').value;
    const description = el('description').value || null;
    const due_date = el('dueDate').value || null;
    const priority = el('priority').value;
    const tags = parseTags(el('tags').value);
    await apiFetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, due_date, priority, tags }),
    });
    e.target.reset();
    el('priority').value = 'medium';
    await loadTasks();
  });
}

wireControls();
loadTasks();
