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
