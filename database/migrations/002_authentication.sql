-- Agrega sesiones y límites de intentos a las cuentas existentes.
-- La sesión se reconoce por el hash de un token: el valor de la cookie no se guarda.
ALTER TABLE users ADD COLUMN disabled_at timestamptz;

CREATE TABLE auth_sessions (
  token_hash text PRIMARY KEY CHECK (length(token_hash) = 64),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token text NOT NULL CHECK (length(csrf_token) = 43),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX auth_sessions_expiration_idx ON auth_sessions(expires_at);

-- Compartido por todas las instancias del servidor; no depende de su memoria.
CREATE TABLE auth_rate_limits (
  key_hash text PRIMARY KEY CHECK (length(key_hash) = 64),
  attempts integer NOT NULL CHECK (attempts > 0),
  reset_at timestamptz NOT NULL
);
CREATE INDEX auth_rate_limits_expiration_idx ON auth_rate_limits(reset_at);
