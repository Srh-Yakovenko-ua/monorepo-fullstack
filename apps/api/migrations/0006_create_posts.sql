BEGIN;

CREATE TABLE posts (
  id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  blog_id             INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  blog_name           TEXT NOT NULL,
  title               TEXT NOT NULL,
  short_description   TEXT NOT NULL,
  content             TEXT NOT NULL,
  likes_count         INTEGER NOT NULL DEFAULT 0,
  dislikes_count      INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX posts_blog_id_idx ON posts (blog_id);

COMMIT;
