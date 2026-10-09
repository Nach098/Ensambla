-- Modelo inicial: cuentas, espacios y aplicaciones configurables.
-- No crea cuentas ni importa datos locales automáticamente.
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email = lower(trim(email)) AND length(email) BETWEEN 3 AND 254),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  password_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);

CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workspaces_owner_idx ON workspaces(owner_id);

CREATE TABLE workspace_members (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX workspace_members_user_idx ON workspace_members(user_id);
-- El propietario se determina por workspaces.owner_id. El límite de tres
-- colaboradores deberá aplicarse transaccionalmente al implementar invitaciones.

CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  definition jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(definition) = 'object'),
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id)
);
CREATE INDEX applications_workspace_idx ON applications(workspace_id);
-- definition contendrá tablas/campos, bloques, pantallas, categorías y reglas.
-- Los registros del negocio viven fuera de esa definición.

CREATE TABLE app_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  application_id uuid NOT NULL,
  key text NOT NULL CHECK (key ~ '^[a-z][a-z0-9_]{0,63}$'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  fields jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(fields) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, application_id) REFERENCES applications(workspace_id, id) ON DELETE CASCADE,
  UNIQUE (application_id, key),
  UNIQUE (workspace_id, application_id, id)
);

CREATE TABLE app_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  application_id uuid NOT NULL,
  collection_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(data) = 'object'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, application_id, collection_id)
    REFERENCES app_collections(workspace_id, application_id, id) ON DELETE CASCADE
);
CREATE INDEX app_records_collection_idx ON app_records(workspace_id, application_id, collection_id);
-- Las claves compuestas impiden vincular registros entre espacios distintos.
-- La API deberá validar permisos y tipos de campos en TODAS las operaciones.
