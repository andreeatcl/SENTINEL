CREATE TABLE event_batches (
  country TEXT NOT NULL,
  day TEXT NOT NULL,
  cursor TEXT NOT NULL,
  rows TEXT NOT NULL,
  PRIMARY KEY (country, day, cursor)
) WITHOUT ROWID;

CREATE TABLE ingest_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) WITHOUT ROWID;
