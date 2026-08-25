CREATE TABLE site_stats (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO site_stats (key, value, updated_at)
VALUES ('total_views', 0, CURRENT_TIMESTAMP);

