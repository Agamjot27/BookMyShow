BEGIN;

-- Make password_hash nullable — OTP-only users have no password.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Refresh tokens (one active token per user; revoked on logout or re-login).
CREATE TABLE refresh_tokens (
  token_id   uuid PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash)
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

COMMIT;
