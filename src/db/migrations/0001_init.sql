-- Migration number: 0001
CREATE TABLE users (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  token_hash       TEXT NOT NULL UNIQUE,
  packs_available  INTEGER NOT NULL DEFAULT 3 CHECK (packs_available >= 0),
  last_refill_date TEXT,
  packs_since_hit  INTEGER NOT NULL DEFAULT 0,
  total_packs      INTEGER NOT NULL DEFAULT 0,
  favorites        TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE owned (
  user_id         TEXT NOT NULL,
  set_id          TEXT NOT NULL,
  card_n          TEXT NOT NULL,
  count_normal    INTEGER NOT NULL DEFAULT 0,
  count_reverse   INTEGER NOT NULL DEFAULT 0,
  first_pulled_at TEXT NOT NULL,
  PRIMARY KEY (user_id, set_id, card_n)
);

CREATE TABLE packs (
  id        TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL,
  set_id    TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  cards     TEXT NOT NULL,
  hit       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX packs_by_user ON packs (user_id, opened_at DESC);
