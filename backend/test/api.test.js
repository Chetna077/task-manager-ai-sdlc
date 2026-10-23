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
    const list = (await listRes.json()).items;
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

test('DELETE /api/tasks/:id archives instead of hard deleting (SCRUM-7)', async () => {
  await withServer(async (base) => {
    const created = await (await fetch(`${base}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'A' }),
    })).json();

    const delRes = await fetch(`${base}/api/tasks/${created.id}`, { method: 'DELETE' });
    assert.equal(delRes.status, 204);

    assert.equal((await (await fetch(`${base}/api/tasks`)).json()).items.length, 0);
    const got = await fetch(`${base}/api/tasks/${created.id}`);
    assert.equal(got.status, 200);
    assert.ok((await got.json()).archived_at);
  });
});

test('DELETE on unknown id returns 404', async () => {
  await withServer(async (base) => {
    assert.equal((await fetch(`${base}/api/tasks/9999`, { method: 'DELETE' })).status, 404);
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
    const results = (await res.json()).items;
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
    const results = (await res.json()).items;
    assert.equal(results.length, 1);
  });
});

const postJson = (base, body) =>
  fetch(`${base}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('POST/PUT accept tags and GET ?tag= filters on them (SCRUM-12/13)', async () => {
  await withServer(async (base) => {
    const created = await (await postJson(base, { title: 'A', tags: ['Work', 'urgent'] })).json();
    assert.deepEqual(created.tags, ['work', 'urgent']);
    await postJson(base, { title: 'B', tags: ['home'] });
    await postJson(base, { title: 'C' });

    const work = (await (await fetch(`${base}/api/tasks?tag=work`)).json()).items;
    assert.deepEqual(work.map((t) => t.title), ['A']);

    const put = await fetch(`${base}/api/tasks/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: ['home'] }),
    });
    assert.deepEqual((await put.json()).tags, ['home']);
    const home = (await (await fetch(`${base}/api/tasks?tag=home`)).json()).items;
    assert.equal(home.length, 2);
  });
});

test('POST /api/tasks rejects invalid tags with 400', async () => {
  await withServer(async (base) => {
    const res = await postJson(base, { title: 'A', tags: ['x'.repeat(31)] });
    assert.equal(res.status, 400);
  });
});

test('archive -> archived view -> restore round trip (SCRUM-7/8)', async () => {
  await withServer(async (base) => {
    const created = await (await postJson(base, { title: 'Keep me', tags: ['x'] })).json();
    await postJson(base, { title: 'Other' });

    const archRes = await fetch(`${base}/api/tasks/${created.id}/archive`, { method: 'POST' });
    assert.equal(archRes.status, 200);
    assert.ok((await archRes.json()).archived_at);

    const active = (await (await fetch(`${base}/api/tasks`)).json()).items;
    assert.deepEqual(active.map((t) => t.title), ['Other']);
    const archived = (await (await fetch(`${base}/api/tasks?archived=true`)).json()).items;
    assert.deepEqual(archived.map((t) => t.title), ['Keep me']);

    const restRes = await fetch(`${base}/api/tasks/${created.id}/restore`, { method: 'POST' });
    assert.equal(restRes.status, 200);
    assert.equal((await restRes.json()).archived_at, null);
    assert.equal((await (await fetch(`${base}/api/tasks`)).json()).items.length, 2);
    assert.equal((await (await fetch(`${base}/api/tasks?archived=true`)).json()).items.length, 0);
  });
});

test('archive/restore on unknown id return 404', async () => {
  await withServer(async (base) => {
    assert.equal((await fetch(`${base}/api/tasks/9999/archive`, { method: 'POST' })).status, 404);
    assert.equal((await fetch(`${base}/api/tasks/9999/restore`, { method: 'POST' })).status, 404);
  });
});

async function seed(base, n) {
  for (let i = 1; i <= n; i++) {
    await postJson(base, {
      title: `Task ${String(i).padStart(2, '0')}`,
      priority: ['low', 'medium', 'high'][i % 3],
      tags: i % 2 ? ['odd'] : ['even'],
    });
  }
}

test('GET /api/tasks returns a paginated envelope with defaults (SCRUM-14)', async () => {
  await withServer(async (base) => {
    await seed(base, 25);
    const body = await (await fetch(`${base}/api/tasks`)).json();
    assert.equal(body.items.length, 10);
    assert.equal(body.total, 25);
    assert.equal(body.page, 1);
    assert.equal(body.pageSize, 10);
    assert.equal(body.totalPages, 3);
  });
});

test('pages are disjoint, ordered, and cover every task; last page is partial', async () => {
  await withServer(async (base) => {
    await seed(base, 25);
    const titles = [];
    for (const page of [1, 2, 3]) {
      const body = await (await fetch(`${base}/api/tasks?page=${page}&pageSize=10&sortBy=priority&sortDir=desc`)).json();
      titles.push(...body.items.map((t) => t.title));
      if (page === 3) assert.equal(body.items.length, 5);
    }
    assert.equal(titles.length, 25);
    assert.equal(new Set(titles).size, 25);
  });
});

test('pagination works with search, filter and sort together (SCRUM-14)', async () => {
  await withServer(async (base) => {
    await seed(base, 25);
    const q = 'search=task&tag=odd&priority=high&sortBy=created_at&sortDir=desc&pageSize=2';
    const p1 = await (await fetch(`${base}/api/tasks?${q}&page=1`)).json();
    const all = await (await fetch(`${base}/api/tasks?${q.replace('pageSize=2', 'pageSize=100')}`)).json();
    assert.ok(all.total > 2);
    assert.equal(p1.total, all.total);
    assert.equal(p1.totalPages, Math.ceil(all.total / 2));
    assert.deepEqual(p1.items.map((t) => t.id), all.items.slice(0, 2).map((t) => t.id));
    for (const t of all.items) {
      assert.deepEqual([t.priority, t.tags], ['high', ['odd']]);
    }
    const p2 = await (await fetch(`${base}/api/tasks?${q}&page=2`)).json();
    assert.deepEqual(p2.items.map((t) => t.id), all.items.slice(2, 4).map((t) => t.id));
  });
});

test('page past the end returns empty items but correct totals; empty set has 0 pages', async () => {
  await withServer(async (base) => {
    await seed(base, 3);
    const past = await (await fetch(`${base}/api/tasks?page=9&pageSize=2`)).json();
    assert.deepEqual([past.items.length, past.total, past.totalPages], [0, 3, 2]);
    const none = await (await fetch(`${base}/api/tasks?search=zzz`)).json();
    assert.deepEqual([none.items.length, none.total, none.totalPages], [0, 0, 0]);
  });
});

test('invalid page / pageSize return 400', async () => {
  await withServer(async (base) => {
    for (const qs of ['page=0', 'page=-1', 'page=abc', 'page=1.5', 'pageSize=0', 'pageSize=101', 'pageSize=x']) {
      const res = await fetch(`${base}/api/tasks?${qs}`);
      assert.equal(res.status, 400, qs);
      assert.ok((await res.json()).error);
    }
  });
});

test('pagination applies inside the archived view too', async () => {
  await withServer(async (base) => {
    await seed(base, 5);
    const ids = (await (await fetch(`${base}/api/tasks?pageSize=100`)).json()).items.map((t) => t.id);
    for (const id of ids) await fetch(`${base}/api/tasks/${id}/archive`, { method: 'POST' });
    const body = await (await fetch(`${base}/api/tasks?archived=true&pageSize=2&page=3`)).json();
    assert.deepEqual([body.items.length, body.total, body.totalPages], [1, 5, 3]);
  });
});
