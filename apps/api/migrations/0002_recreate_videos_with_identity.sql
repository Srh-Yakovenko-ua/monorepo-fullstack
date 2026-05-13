BEGIN;

DROP TABLE IF EXISTS videos;

CREATE TABLE videos (
  id                     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title                  TEXT NOT NULL,
  author                 TEXT NOT NULL,
  available_resolutions  TEXT[] NOT NULL,
  can_be_downloaded      BOOLEAN NOT NULL DEFAULT FALSE,
  min_age_restriction    INTEGER,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  publication_date       TIMESTAMPTZ NOT NULL
);

COMMIT;
