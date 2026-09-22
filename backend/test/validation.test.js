const test = require('node:test');
const assert = require('node:assert/strict');
const { validateTaskInput, ValidationError } = require('../src/validation');

test('accepts a minimal valid task and applies defaults', () => {
  const out = validateTaskInput({ title: 'Write report' });
  assert.equal(out.title, 'Write report');
  assert.equal(out.priority, 'medium');
  assert.equal(out.status, 'todo');
});

test('rejects empty title', () => {
  assert.throws(() => validateTaskInput({ title: '   ' }), ValidationError);
});

test('rejects title over 200 chars', () => {
  assert.throws(() => validateTaskInput({ title: 'x'.repeat(201) }), ValidationError);
});

test('rejects invalid priority', () => {
  assert.throws(() => validateTaskInput({ title: 'a', priority: 'urgent' }), ValidationError);
});

test('rejects invalid status', () => {
  assert.throws(() => validateTaskInput({ title: 'a', status: 'blocked' }), ValidationError);
});

test('rejects invalid due_date', () => {
  assert.throws(() => validateTaskInput({ title: 'a', due_date: 'not-a-date' }), ValidationError);
});

test('accepts null due_date to clear it (partial update)', () => {
  const out = validateTaskInput({ due_date: null }, { partial: true });
  assert.equal(out.due_date, null);
});

test('partial update omits fields not provided', () => {
  const out = validateTaskInput({ priority: 'high' }, { partial: true });
  assert.deepEqual(out, { priority: 'high' });
});
