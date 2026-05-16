BEGIN;

CREATE TABLE users (
  id                                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email                             TEXT NOT NULL UNIQUE,
  login                             TEXT NOT NULL UNIQUE,
  password_hash                     TEXT NOT NULL,
  role                              TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  email_confirmation_code           TEXT,
  email_confirmation_expires_at     TIMESTAMPTZ,
  email_is_confirmed                BOOLEAN NOT NULL DEFAULT TRUE,
  password_recovery_code            TEXT,
  password_recovery_expires_at      TIMESTAMPTZ,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX users_email_confirmation_code_idx
  ON users (email_confirmation_code)
  WHERE email_confirmation_code IS NOT NULL;

CREATE INDEX users_password_recovery_code_idx
  ON users (password_recovery_code)
  WHERE password_recovery_code IS NOT NULL;

COMMIT;
