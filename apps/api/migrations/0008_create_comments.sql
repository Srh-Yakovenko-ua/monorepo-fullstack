BEGIN;

CREATE TABLE comments (
  id                       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id                  INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  commentator_user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commentator_user_login   TEXT NOT NULL,
  content                  TEXT NOT NULL,
  likes_count              INTEGER NOT NULL DEFAULT 0,
  dislikes_count           INTEGER NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX comments_post_id_created_at_idx ON comments (post_id, created_at DESC);

COMMIT;
