BEGIN;

CREATE TABLE sessions (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id       TEXT NOT NULL,
  token_jti       TEXT NOT NULL,
  ip              TEXT NOT NULL,
  title           TEXT NOT NULL,
  last_active_at  TIMESTAMPTZ NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  UNIQUE (device_id, user_id)
);

CREATE INDEX sessions_user_id_idx    ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

COMMIT;
