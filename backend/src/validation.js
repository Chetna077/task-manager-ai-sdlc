const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

class ValidationError extends Error {}

// Accepts an array of strings or a comma-separated string; returns a
// trimmed, lowercased, de-duplicated array. Commas are the storage separator,
// so they cannot appear inside a tag.
function normalizeTags(raw) {
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  const out = [];
  for (const item of list) {
    if (typeof item !== 'string') throw new ValidationError('tags must be strings');
    const tag = item.trim().toLowerCase();
    if (!tag) continue;
    if (tag.length > MAX_TAG_LENGTH || tag.includes(',')) {
      throw new ValidationError(`each tag must be 1-${MAX_TAG_LENGTH} characters and not contain commas`);
    }
    if (!out.includes(tag)) out.push(tag);
  }
  if (out.length > MAX_TAGS) throw new ValidationError(`a task can have at most ${MAX_TAGS} tags`);
  return out;
}

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

  if (input.tags !== undefined) {
    out.tags = input.tags === null ? [] : normalizeTags(input.tags);
  }

  return out;
}

module.exports = {
  validateTaskInput,
  normalizeTags,
  ValidationError,
  STATUSES,
  PRIORITIES,
  MAX_TAGS,
  MAX_TAG_LENGTH,
};
