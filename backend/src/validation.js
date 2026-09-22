const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

class ValidationError extends Error {}

function isValidIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function validateTaskInput(input, { partial = false } = {}) {
  const out = {};

  if (!partial || input.title !== undefined) {
    const title = String(input.title ?? '').trim();
    if (!title || title.length > 200) {
      throw new ValidationError('title is required and must be 1-200 characters');
    }
    out.title = title;
  }

  if (input.description !== undefined) {
    const description = input.description === null ? null : String(input.description);
    if (description && description.length > 2000) {
      throw new ValidationError('description must be 2000 characters or fewer');
    }
    out.description = description ?? null;
  }

  if (input.priority !== undefined) {
    if (!PRIORITIES.includes(input.priority)) {
      throw new ValidationError(`priority must be one of ${PRIORITIES.join(', ')}`);
    }
    out.priority = input.priority;
  } else if (!partial) {
    out.priority = 'medium';
  }

  if (input.status !== undefined) {
    if (!STATUSES.includes(input.status)) {
      throw new ValidationError(`status must be one of ${STATUSES.join(', ')}`);
    }
    out.status = input.status;
  } else if (!partial) {
    out.status = 'todo';
  }

  if (input.due_date !== undefined) {
    if (input.due_date === null || input.due_date === '') {
      out.due_date = null;
    } else if (!isValidIsoDate(input.due_date)) {
      throw new ValidationError('due_date must be a valid date');
    } else {
      out.due_date = input.due_date;
    }
  }

  return out;
}

module.exports = { validateTaskInput, ValidationError, STATUSES, PRIORITIES };
