BEGIN;

CREATE TABLE post_likes (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id      INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_login   TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('Like', 'Dislike')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX post_likes_post_id_status_idx ON post_likes (post_id, status);

COMMIT;
