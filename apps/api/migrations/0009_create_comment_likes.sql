BEGIN;

CREATE TABLE comment_likes (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  comment_id   INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL CHECK (status IN ('Like', 'Dislike')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX comment_likes_comment_id_status_idx ON comment_likes (comment_id, status);

COMMIT;
