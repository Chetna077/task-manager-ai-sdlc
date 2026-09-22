const path = require('node:path');
const express = require('express');
const { openDb, TaskRepository } = require('./db');
const { validateTaskInput, ValidationError, STATUSES } = require('./validation');

function createApp(dbPath) {
  const db = openDb(dbPath);
  const repo = new TaskRepository(db);
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'public')));

  app.get('/api/tasks', (req, res) => {
    const { search, status, priority, sortBy, sortDir } = req.query;
    const tasks = repo.listTasks({ search, status, priority, sortBy, sortDir });
    res.json(tasks);
  });

  app.get('/api/tasks/:id', (req, res) => {
    const task = repo.getTask(Number(req.params.id));
    if (!task) return res.status(404).json({ error: 'task not found' });
    res.json(task);
  });

  app.post('/api/tasks', (req, res) => {
    try {
      const data = validateTaskInput(req.body, { partial: false });
      const task = repo.createTask(data);
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
      res.status(500).json({ error: 'internal error' });
    }
  });

  app.put('/api/tasks/:id', (req, res) => {
    try {
      const data = validateTaskInput(req.body, { partial: true });
      const task = repo.updateTask(Number(req.params.id), data);
      if (!task) return res.status(404).json({ error: 'task not found' });
      res.json(task);
    } catch (err) {
      if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
      res.status(500).json({ error: 'internal error' });
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

  app.delete('/api/tasks/:id', (req, res) => {
    const deleted = repo.deleteTask(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'task not found' });
    res.status(204).end();
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
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
