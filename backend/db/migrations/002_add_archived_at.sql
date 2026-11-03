-- SCRUM-7/8: archive instead of hard delete. NULL = active; an ISO timestamp
-- means the task is archived (hidden from the default list, restorable).
ALTER TABLE tasks ADD COLUMN archived_at TEXT;
