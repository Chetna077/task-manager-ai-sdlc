const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/server');

async function withServer(fn) {
  const { app, db } = createApp(':memory:');
  const server = app.listen(0);
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    await fn(base);
  } finally {
    server.close();
    db.close();
  }
}

test('POST /api/tasks creates a task; GET /api/tasks lists it', async () => {
  await withServer(async (base) => {
    const createRes = await fetch(`${base}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Write report', priority: 'high' }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.title, 'Write report');
    assert.equal(created.status, 'todo');

    const listRes = await fetch(`${base}/api/tasks`);
    const list = await listRes.json();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, created.id);
  });
});

test('POST /api/tasks rejects empty title with 400', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error);
  });
});

test('PUT /api/tasks/:id updates a task', async () => {
  await withServer(async (base) => {
    const created = await (await fetch(`${base}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Original' }),
    })).json();

    const updateRes = await fetch(`${base}/api/tasks/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated', priority: 'high' }),
    });
    assert.equal(updateRes.status, 200);
    const updated = await updateRes.json();
    assert.equal(updated.title, 'Updated');
    assert.equal(updated.priority, 'high');
  });
});

test('PUT /api/tasks/:id persists a description edit (TM-101)', async () => {
  await withServer(async (base) => {
    const created = await (await fetch(`${base}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Original', description: 'first draft' }),
    })).json();
    assert.equal(created.description, 'first draft');

    const updateRes = await fetch(`${base}/api/tasks/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'revised draft' }),
    });
    const updated = await updateRes.json();
    assert.equal(updated.description, 'revised draft');
    assert.equal(updated.title, 'Original');
  });
});

test('PUT /api/tasks/:id on unknown id returns 404', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/tasks/9999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x' }),
    });
    assert.equal(res.status, 404);
  });
});

test('PATCH /api/tasks/:id/status moves done -> todo (reopen)', async () => {
  await withServer(async (base) => {
    const created = await (await fetch(`${base}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'A' }),
    })).json();

    await fetch(`${base}/api/tasks/${created.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });

    const reopenRes = await fetch(`${base}/api/tasks/${created.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'todo' }),
    });
    const reopened = await reopenRes.json();
    assert.equal(reopened.status, 'todo');
  });
});

test('DELETE /api/tasks/:id removes the task', async () => {
  await withServer(async (base) => {
    const created = await (await fetch(`${base}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'A' }),
    })).json();

    const delRes = await fetch(`${base}/api/tasks/${created.id}`, { method: 'DELETE' });
    assert.equal(delRes.status, 204);

    const getRes = await fetch(`${base}/api/tasks/${created.id}`);
    assert.equal(getRes.status, 404);
  });
});

test('GET /api/tasks?search= filters by title substring', async () => {
  await withServer(async (base) => {
    await fetch(`${base}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Write report' }),
    });
    await fetch(`${base}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Fix bug' }),
    });

    const res = await fetch(`${base}/api/tasks?search=report`);
    const results = await res.json();
    assert.equal(results.length, 1);
    assert.equal(results[0].title, 'Write report');
  });
});

test('GET /api/tasks tolerates a repeated query key instead of erroring', async () => {
  await withServer(async (base) => {
    await fetch(`${base}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'A', status: 'todo' }),
    });

    // ?status=todo&status=done makes Express parse status as an array;
    // the route must normalize this instead of passing an array to SQLite.
    const res = await fetch(`${base}/api/tasks?status=todo&status=done`);
    assert.equal(res.status, 200);
    const results = await res.json();
    assert.equal(results.length, 1);
  });
});
