const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { PRIORITIES } = require('./validation');

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const SORT_COLUMNS = { due_date: 'due_date', priority: 'priority', created_at: 'created_at' };

// Derived from the shared PRIORITIES enum (low < medium < high) so the sort
// severity can never drift from the enum definition if a tier is added/renamed.
const PRIORITY_CASE_SQL =
  'CASE priority ' +
  PRIORITIES.map((p, i) => `WHEN '${p}' THEN ${i + 1}`).join(' ') +
  ' ELSE 0 END';

// SQLite has no ADD COLUMN IF NOT EXISTS, so each migration is guarded by a
// check for its column. Files live in db/migrations/ and run in order.
const MIGRATIONS = [
  { column: 'tags', file: '001_add_tags.sql' },
  { column: 'archived_at', file: '002_add_archived_at.sql' },
];

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

  // Shared by listTasks and listTasksPage so the page count and the page rows
  // always come from the same WHERE/ORDER BY.
  buildListQuery({ search, status, priority, tag, archived, sortBy, sortDir } = {}) {
    // Active tasks by default; archived === true selects the archived view.
    const clauses = [archived === true ? 'archived_at IS NOT NULL' : 'archived_at IS NULL'];
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
    // id is the final tiebreaker so pages are stable when sort keys collide.
    const orderBy = `ORDER BY ${orderKey} ${dir}, id ASC`;
    return { where, orderBy, params };
  }

  listTasks(filters = {}) {
    const { where, orderBy, params } = this.buildListQuery(filters);
    return this.db
      .prepare(`SELECT * FROM tasks ${where} ${orderBy}`)
      .all(...params)
      .map(toTask);
  }

  // SCRUM-14: one page of the same result set listTasks would return.
  listTasksPage({ page = 1, pageSize = DEFAULT_PAGE_SIZE, ...filters } = {}) {
    const { where, orderBy, params } = this.buildListQuery(filters);
    const total = this.db.prepare(`SELECT COUNT(*) AS n FROM tasks ${where}`).get(...params).n;
    const items = this.db
      .prepare(`SELECT * FROM tasks ${where} ${orderBy} LIMIT ? OFFSET ?`)
      .all(...params, pageSize, (page - 1) * pageSize)
      .map(toTask);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
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

  // Soft delete: keeps the row, so it can be restored. Idempotent - archiving
  // an already-archived task keeps its original archived_at.
  archiveTask(id) {
    const existing = this.getTask(id);
    if (!existing) return null;
    if (!existing.archived_at) {
      const ts = nowIso();
      this.db.prepare('UPDATE tasks SET archived_at = ?, updated_at = ? WHERE id = ?').run(ts, ts, id);
    }
    return this.getTask(id);
  }

  restoreTask(id) {
    const existing = this.getTask(id);
    if (!existing) return null;
    if (existing.archived_at) {
      this.db
        .prepare('UPDATE tasks SET archived_at = NULL, updated_at = ? WHERE id = ?')
        .run(nowIso(), id);
    }
    return this.getTask(id);
  }
}

module.exports = { openDb, TaskRepository, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
