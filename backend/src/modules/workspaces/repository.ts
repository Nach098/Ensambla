/** SQL de espacios y miembros. Consulta el permiso real de la cuenta y
 * mantiene las operaciones limitadas al identificador del espacio autorizado. */
import type { Database } from '../../database/database.js';
import type { Connection } from '../../database/migrations.js';
import type { WorkspaceRole } from '../auth/types.js';

export interface Workspace {
  id: string;
  name: string;
  role: WorkspaceRole;
  createdAt: string;
}
export interface Membership extends Workspace {
  ownerId: string;
}
export interface Member {
  userId: string;
  email: string;
  displayName: string;
  role: 'editor' | 'viewer';
}

function workspaceFromRow(row: Record<string, unknown>): Membership {
  return {
    id: String(row.id),
    name: String(row.name),
    role: row.role as WorkspaceRole,
    ownerId: String(row.owner_id),
    createdAt: (row.created_at instanceof Date
      ? row.created_at
      : new Date(String(row.created_at))
    ).toISOString(),
  };
}
export function publicWorkspace(workspace: Workspace): Workspace {
  return {
    id: workspace.id,
    name: workspace.name,
    role: workspace.role,
    createdAt: workspace.createdAt,
  };
}

const MEMBERSHIP_QUERY = `SELECT w.*, CASE WHEN w.owner_id = $1 THEN 'owner' ELSE m.role END AS role
  FROM workspaces w LEFT JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = $1
  WHERE (w.owner_id = $1 OR m.user_id = $1)`;

export class WorkspaceRepository {
  constructor(private readonly database: Database) {}

  async list(userId: string): Promise<Workspace[]> {
    const result = await this.database.query(
      `${MEMBERSHIP_QUERY} ORDER BY (w.owner_id = $1) DESC, w.created_at, w.id`,
      [userId],
    );
    return result.rows.map((row) => publicWorkspace(workspaceFromRow(row)));
  }

  async membership(
    userId: string,
    workspaceId: string,
    connection: Connection = this.database,
  ): Promise<Membership | null> {
    const result = await connection.query(`${MEMBERSHIP_QUERY} AND w.id = $2`, [
      userId,
      workspaceId,
    ]);
    return result.rows[0] ? workspaceFromRow(result.rows[0]) : null;
  }

  async members(workspaceId: string, connection: Connection = this.database): Promise<Member[]> {
    const result = await connection.query(
      `SELECT u.id, u.email, u.display_name, m.role FROM workspace_members m
      JOIN users u ON u.id = m.user_id WHERE m.workspace_id = $1 ORDER BY m.created_at, u.id`,
      [workspaceId],
    );
    return result.rows.map((row) => ({
      userId: String(row.id),
      email: String(row.email),
      displayName: String(row.display_name),
      role: row.role as Member['role'],
    }));
  }
}
