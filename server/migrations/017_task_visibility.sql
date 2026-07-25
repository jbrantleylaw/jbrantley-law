-- Migration 017: Task visibility and parent task support

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'all';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id INTEGER REFERENCES tasks(id);

-- Set default visibility for all existing tasks
UPDATE tasks SET visibility = 'all' WHERE visibility IS NULL;
