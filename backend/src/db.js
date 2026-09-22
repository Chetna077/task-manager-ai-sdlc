const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const SORT_COLUMNS = { due_date: 'due_date', priority: 'priority', created_at: 'created_at' };

function openDb(dbPath) {
  const isNew = !fs.existsSync(dbPath) || dbPath === ':memory:';
  const db = new DatabaseSync(dbPath);
  if (isNew) {
    const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    db.exec(schema);
  } else {
    const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    db.exec(schema); // idempotent CREATE TABLE/INDEX IF NOT EXISTS
  }
  return db;
}

function nowIso() {
  return new Date().toISOString();
}

class TaskRepository {
  constructor(db) {
    this.db = db;
  }

  listTasks({ search, status, priority, sortBy, sortDir } = {}) {
    const clauses = [];
    const params = [];

    if (search) {
      clauses.push('title LIKE ? COLLATE NOCASE');
      params.push(`%${search}%`);
    }
    if (status) {
      clauses.push('status = ?');
      params.push(status);
    }
    if (priority) {
      clauses.push('priority = ?');
      params.push(priority);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const dir = String(sortDir).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const orderKey = SORT_COLUMNS[sortBy]
      ? sortBy === 'priority'
        ? "CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END"
        : SORT_COLUMNS[sortBy]
      : 'created_at';
    const sql = `SELECT * FROM tasks ${where} ORDER BY ${orderKey} ${dir}, id ASC`;

    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  getTask(id) {
    return this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) || null;
  }

  createTask(data) {
    const ts = nowIso();
    const stmt = this.db.prepare(
      `INSERT INTO tasks (title, description, status, priority, due_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(
      data.title,
      data.description ?? null,
      data.status,
      data.priority,
      data.due_date ?? null,
      ts,
      ts
    );
    return this.getTask(Number(result.lastInsertRowid));
  }

  updateTask(id, data) {
    const existing = this.getTask(id);
    if (!existing) return null;

    const merged = { ...existing, ...data, updated_at: nowIso() };
    const stmt = this.db.prepare(
      `UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, updated_at = ?
       WHERE id = ?`
    );
    stmt.run(
      merged.title,
      merged.description ?? null,
      merged.status,
      merged.priority,
      merged.due_date ?? null,
      merged.updated_at,
      id
    );
    return this.getTask(id);
  }

  setStatus(id, status) {
    const existing = this.getTask(id);
    if (!existing) return null;
    const stmt = this.db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?');
    stmt.run(status, nowIso(), id);
    return this.getTask(id);
  }

  deleteTask(id) {
    const result = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

module.exports = { openDb, TaskRepository };
