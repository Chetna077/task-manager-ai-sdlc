const test = require('node:test');
const assert = require('node:assert/strict');
const { openDb, TaskRepository } = require('../src/db');

function freshRepo() {
  const db = openDb(':memory:');
  return new TaskRepository(db);
}

test('createTask + getTask round-trip', () => {
  const repo = freshRepo();
  const created = repo.createTask({ title: 'A', description: null, status: 'todo', priority: 'medium', due_date: null });
  const fetched = repo.getTask(created.id);
  assert.equal(fetched.title, 'A');
  assert.equal(fetched.status, 'todo');
});

test('listTasks filters by status', () => {
  const repo = freshRepo();
  repo.createTask({ title: 'A', status: 'todo', priority: 'medium' });
  const b = repo.createTask({ title: 'B', status: 'todo', priority: 'medium' });
  repo.setStatus(b.id, 'done');

  const done = repo.listTasks({ status: 'done' });
  assert.equal(done.length, 1);
  assert.equal(done[0].title, 'B');
});

test('listTasks filters by priority', () => {
  const repo = freshRepo();
  repo.createTask({ title: 'Low one', status: 'todo', priority: 'low' });
  repo.createTask({ title: 'High one', status: 'todo', priority: 'high' });

  const highs = repo.listTasks({ priority: 'high' });
  assert.equal(highs.length, 1);
  assert.equal(highs[0].title, 'High one');
});

test('listTasks search is case-insensitive substring match', () => {
  const repo = freshRepo();
  repo.createTask({ title: 'Write Report', status: 'todo', priority: 'medium' });
  repo.createTask({ title: 'Fix bug', status: 'todo', priority: 'medium' });

  const results = repo.listTasks({ search: 'report' });
  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'Write Report');
});

test('listTasks sorts by priority severity, not alphabetically', () => {
  const repo = freshRepo();
  repo.createTask({ title: 'Low', status: 'todo', priority: 'low' });
  repo.createTask({ title: 'High', status: 'todo', priority: 'high' });
  repo.createTask({ title: 'Medium', status: 'todo', priority: 'medium' });

  const asc = repo.listTasks({ sortBy: 'priority', sortDir: 'asc' }).map((t) => t.priority);
  const desc = repo.listTasks({ sortBy: 'priority', sortDir: 'desc' }).map((t) => t.priority);
  assert.deepEqual(asc, ['low', 'medium', 'high']);
  assert.deepEqual(desc, ['high', 'medium', 'low']);
});

test('listTasks combines search + filter', () => {
  const repo = freshRepo();
  const a = repo.createTask({ title: 'Write report', status: 'todo', priority: 'high' });
  repo.createTask({ title: 'Write email', status: 'todo', priority: 'low' });
  repo.setStatus(a.id, 'in_progress');

  const results = repo.listTasks({ search: 'write', priority: 'high', status: 'in_progress' });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, a.id);
});

test('setStatus supports reopen (done -> todo)', () => {
  const repo = freshRepo();
  const task = repo.createTask({ title: 'A', status: 'done', priority: 'medium' });
  const reopened = repo.setStatus(task.id, 'todo');
  assert.equal(reopened.status, 'todo');
});

test('deleteTask removes the row and returns true', () => {
  const repo = freshRepo();
  const task = repo.createTask({ title: 'A', status: 'todo', priority: 'medium' });
  assert.equal(repo.deleteTask(task.id), true);
  assert.equal(repo.getTask(task.id), null);
});

test('deleteTask returns false for unknown id', () => {
  const repo = freshRepo();
  assert.equal(repo.deleteTask(9999), false);
});

test('listTasks search escapes SQL LIKE wildcards (% and _)', () => {
  const repo = freshRepo();
  // Without escaping, the pattern for searching "50%" is "%50%%" - since %
  // is a wildcard, that matches ANY title containing "50" followed by
  // anything, which would wrongly include "I have 50 apples" too.
  repo.createTask({ title: '50% discount', status: 'todo', priority: 'medium' });
  repo.createTask({ title: 'I have 50 apples', status: 'todo', priority: 'medium' });

  const results = repo.listTasks({ search: '50%' });
  assert.equal(results.length, 1);
  assert.equal(results[0].title, '50% discount');
});

test('tags round-trip as an array and default to empty (SCRUM-12)', () => {
  const repo = freshRepo();
  const a = repo.createTask({ title: 'A', status: 'todo', priority: 'medium', tags: ['work', 'urgent'] });
  const b = repo.createTask({ title: 'B', status: 'todo', priority: 'medium' });
  assert.deepEqual(repo.getTask(a.id).tags, ['work', 'urgent']);
  assert.deepEqual(repo.getTask(b.id).tags, []);
});

test('updateTask replaces tags; omitting tags keeps them', () => {
  const repo = freshRepo();
  const t = repo.createTask({ title: 'A', status: 'todo', priority: 'medium', tags: ['x'] });
  assert.deepEqual(repo.updateTask(t.id, { title: 'A2' }).tags, ['x']);
  assert.deepEqual(repo.updateTask(t.id, { tags: ['y', 'z'] }).tags, ['y', 'z']);
  assert.deepEqual(repo.updateTask(t.id, { tags: [] }).tags, []);
});

test('listTasks filters by exact tag, not substring (SCRUM-13)', () => {
  const repo = freshRepo();
  repo.createTask({ title: 'A', status: 'todo', priority: 'medium', tags: ['work'] });
  repo.createTask({ title: 'B', status: 'todo', priority: 'medium', tags: ['homework', 'work'] });
  repo.createTask({ title: 'C', status: 'todo', priority: 'medium', tags: ['homework'] });

  assert.deepEqual(repo.listTasks({ tag: 'work' }).map((t) => t.title), ['A', 'B']);
  assert.deepEqual(repo.listTasks({ tag: ' WORK ' }).map((t) => t.title), ['A', 'B']);
  assert.equal(repo.listTasks({ tag: 'wor' }).length, 0);
});

test('tag filter combines with search and priority', () => {
  const repo = freshRepo();
  repo.createTask({ title: 'Write report', status: 'todo', priority: 'high', tags: ['work'] });
  repo.createTask({ title: 'Write email', status: 'todo', priority: 'low', tags: ['work'] });
  const r = repo.listTasks({ tag: 'work', search: 'write', priority: 'high' });
  assert.deepEqual(r.map((t) => t.title), ['Write report']);
});

test('openDb migrates a pre-tags database in place without losing rows', () => {
  const os = require('node:os');
  const fs = require('node:fs');
  const path = require('node:path');
  const { DatabaseSync } = require('node:sqlite');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tm-mig-')), 'old.db');
  const old = new DatabaseSync(file);
  old.exec(`CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT,
    status TEXT NOT NULL DEFAULT 'todo', priority TEXT NOT NULL DEFAULT 'medium',
    due_date TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    INSERT INTO tasks (title, created_at, updated_at) VALUES ('legacy', 'x', 'x');`);
  old.close();

  const db = openDb(file);
  const repo = new TaskRepository(db);
  assert.deepEqual(repo.listTasks().map((t) => [t.title, t.tags]), [['legacy', []]]);
  db.close();
  openDb(file).close(); // second open is a no-op (idempotent)
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
});
