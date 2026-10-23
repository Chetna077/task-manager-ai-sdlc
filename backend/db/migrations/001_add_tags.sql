-- SCRUM-12/13: tags on tasks. Stored as a comma-separated, lowercase string
-- (e.g. 'work,urgent'); the API exposes it as an array. Applied automatically
-- by openDb() to databases that predate the column; safe to run by hand once.
ALTER TABLE tasks ADD COLUMN tags TEXT NOT NULL DEFAULT '';
