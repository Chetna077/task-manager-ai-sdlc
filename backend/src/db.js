const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { PRIORITIES } = require('./validation');

const SORT_COLUMNS = { due_date: 'due_date', priority: 'priority', created_at: 'created_at' };

// Derived from the shared PRIORITIES enum (low < medium < high) so the sort
// severity can never drift from the enum definition if a tier is added/renamed.
const PRIORITY_CASE_SQL =
  'CASE priority ' +
  PRIORITIES.map((p, i) => `WHEN '${p}' THEN ${i + 1}`).join(' ') +
  ' ELSE 0 END';

// SQLite has no ADD COLUMN IF NOT EXISTS, so each migration is guarded by a
// check for its column. Files live in db/migrations/ and run in order.
const MIGRATIONS = [{ column: 'tags', file: '001_add_tags.sql' }];

function migrate(db) {
  const exists = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'tasks'")
    .get();
  if (!exists) return; // fresh DB: schema.sql creates the current table
  const columns = db.prepare('PRAGMA table_info(tasks)').all().map((c) => c.name);
  for (const m of MIGRATIONS) {
    if (columns.includes(m.column)) continue;
    db.exec(fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', m.file), 'utf8'));
  }
}

function openDb(dbPath) {
  const db = new DatabaseSync(dbPath);
  migrate(db);
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  db.exec(schema); // idempotent CREATE TABLE/INDEX IF NOT EXISTS - safe on existing DBs too
  return db;
}

// tags are stored as 'a,b' text; the API exposes them as an array.
function toTask(row) {
  if (!row) return null;
  return { ...row, tags: row.tags ? row.tags.split(',') : [] };
}

function nowIso() {
  return new Date().toISOString();
}

class TaskRepository {
  constructor(db) {
    this.db = db;
  }

  listTasks({ search, status, priority, tag, sortBy, sortDir } = {}) {
    const clauses = [];
    const params = [];

    if (search) {
      const escaped = search.replace(/[\\%_]/g, (ch) => `\\${ch}`);
      clauses.push("title LIKE ? ESCAPE '\\' COLLATE NOCASE");
      params.push(`%${escaped}%`);
    }
    if (status) {
      clauses.push('status = ?');
      params.push(status);
    }
    if (priority) {
      clauses.push('priority = ?');
      params.push(priority);
    }

    if (tag) {
      // exact tag match: wrap both sides in commas so 'work' never matches 'homework'
      clauses.push("instr(',' || tags || ',', ?) > 0");
      params.push(`,${String(tag).trim().toLowerCase()},`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const dir = String(sortDir).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const orderKey = SORT_COLUMNS[sortBy]
      ? sortBy === 'priority'
        ? PRIORITY_CASE_SQL
        : SORT_COLUMNS[sortBy]
      : 'created_at';
    const sql = `SELECT * FROM tasks ${where} ORDER BY ${orderKey} ${dir}, id ASC`;

    const stmt = this.db.prepare(sql);
    return stmt.all(...params).map(toTask);
  }

  getTask(id) {
    return toTask(this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
  }

  createTask(data) {
    const ts = nowIso();
    const stmt = this.db.prepare(
      `INSERT INTO tasks (title, description, status, priority, due_date, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(
      data.title,
      data.description ?? null,
      data.status,
      data.priority,
      data.due_date ?? null,
      (data.tags ?? []).join(','),
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
      `UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, tags = ?, updated_at = ?
       WHERE id = ?`
    );
    stmt.run(
      merged.title,
      merged.description ?? null,
      merged.status,
      merged.priority,
      merged.due_date ?? null,
      (merged.tags ?? []).join(','),
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
