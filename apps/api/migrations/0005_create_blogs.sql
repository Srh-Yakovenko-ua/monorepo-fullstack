BEGIN;

CREATE TABLE blogs (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  website_url     TEXT NOT NULL,
  is_membership   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
