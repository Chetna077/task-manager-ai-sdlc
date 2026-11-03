const path = require('node:path');
const express = require('express');
const { openDb, TaskRepository, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('./db');
const { validateTaskInput, ValidationError, STATUSES } = require('./validation');

function createApp(dbPath) {
  const db = openDb(dbPath);
  const repo = new TaskRepository(db);
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'public')));

  app.get('/api/tasks', (req, res) => {
    // Query params can arrive as arrays if a key is repeated (?status=a&status=b);
    // take the first value so listTasks always gets a plain string or undefined.
    const asString = (v) => (Array.isArray(v) ? v[0] : v);
    const { search, status, priority, tag, archived, sortBy, sortDir } = req.query;
    // Absent -> default; present but not a positive integer (or pageSize over
    // the cap) -> 400 rather than silently returning a different page.
    const parsePositiveInt = (raw, fallback, max) => {
      if (raw === undefined || raw === '') return fallback;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || (max && n > max)) return null;
      return n;
    };
    const page = parsePositiveInt(asString(req.query.page), 1);
    const pageSize = parsePositiveInt(asString(req.query.pageSize), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    if (page === null) return res.status(400).json({ error: 'page must be a positive integer' });
    if (pageSize === null) {
      return res.status(400).json({ error: `pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}` });
    }

    const result = repo.listTasksPage({
      page,
      pageSize,
      search: asString(search),
      status: asString(status),
      priority: asString(priority),
      tag: asString(tag),
      archived: asString(archived) === 'true',
      sortBy: asString(sortBy),
      sortDir: asString(sortDir),
    });
    res.json(result);
  });

  app.get('/api/tasks/:id', (req, res) => {
    const task = repo.getTask(Number(req.params.id));
    if (!task) return res.status(404).json({ error: 'task not found' });
    res.json(task);
  });

  app.post('/api/tasks', (req, res, next) => {
    try {
      const data = validateTaskInput(req.body, { partial: false });
      const task = repo.createTask(data);
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
      next(err);
    }
  });

  app.put('/api/tasks/:id', (req, res, next) => {
    try {
      const data = validateTaskInput(req.body, { partial: true });
      const task = repo.updateTask(Number(req.params.id), data);
      if (!task) return res.status(404).json({ error: 'task not found' });
      res.json(task);
    } catch (err) {
      if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
      next(err);
    }
  });

  app.patch('/api/tasks/:id/status', (req, res) => {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
    }
    const task = repo.setStatus(Number(req.params.id), status);
    if (!task) return res.status(404).json({ error: 'task not found' });
    res.json(task);
  });

  // Archive/restore replace hard delete (SCRUM-7/8). DELETE is kept as an alias
  // of archive so existing clients keep working; nothing removes rows any more.
  const archive = (req, res) => {
    const task = repo.archiveTask(Number(req.params.id));
    if (!task) return res.status(404).json({ error: 'task not found' });
    res.json(task);
  };
  app.post('/api/tasks/:id/archive', archive);
  app.delete('/api/tasks/:id', (req, res) => {
    const task = repo.archiveTask(Number(req.params.id));
    if (!task) return res.status(404).json({ error: 'task not found' });
    res.status(204).end();
  });

  app.post('/api/tasks/:id/restore', (req, res) => {
    const task = repo.restoreTask(Number(req.params.id));
    if (!task) return res.status(404).json({ error: 'task not found' });
    res.json(task);
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  });

  return { app, db };
}

if (require.main === module) {
  const dbPath = process.env.TASKS_DB_PATH
    ? path.resolve(process.env.TASKS_DB_PATH)
    : path.join(__dirname, '..', 'db', 'tasks.db');
  const { app } = createApp(dbPath);
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Task Manager listening on http://localhost:${port}`);
  });
}

module.exports = { createApp };
