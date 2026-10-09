/** Casos de uso de espacios y colaboradores. Relee permisos en cada solicitud
 * y bloquea el espacio en las transacciones para respetar el máximo de tres accesos. */
import type { Database } from '../../database/database.js';
import type { Connection } from '../../database/migrations.js';
import { ApiError } from '../../http/errors.js';
import { requirePermission } from './permissions.js';
import type { Permission } from './permissions.js';
import { publicWorkspace, WorkspaceRepository } from './repository.js';
import type { Member, Membership, Workspace } from './repository.js';
import type { MemberRole } from './validation.js';

export class WorkspaceService {
  readonly repository: WorkspaceRepository;
  constructor(private readonly database: Database) {
    this.repository = new WorkspaceRepository(database);
  }

  async access(
    userId: string,
    workspaceId: string,
    permission: Permission,
    connection: Connection = this.database,
  ): Promise<Membership> {
    const membership = await this.repository.membership(userId, workspaceId, connection);
    if (!membership)
      throw new ApiError(404, 'NOT_FOUND', 'El espacio no existe o no tenés acceso.');
    requirePermission(membership.role, permission);
    return membership;
  }

  async list(userId: string): Promise<Workspace[]> {
    return this.repository.list(userId);
  }
  async get(userId: string, workspaceId: string): Promise<Workspace> {
    return publicWorkspace(await this.access(userId, workspaceId, 'read'));
  }
  async members(userId: string, workspaceId: string): Promise<Member[]> {
    await this.access(userId, workspaceId, 'manage_members');
    return this.repository.members(workspaceId);
  }

  private async locked<T>(
    userId: string,
    workspaceId: string,
    permission: Permission,
    work: (connection: Connection, membership: Membership) => Promise<T>,
  ): Promise<T> {
    // Evita bloquear un espacio ajeno sólo por adivinar su UUID.
    await this.access(userId, workspaceId, permission);
    return this.database.transaction(async (connection) => {
      await connection.query('SELECT id FROM workspaces WHERE id = $1 FOR UPDATE', [workspaceId]);
      const membership = await this.access(userId, workspaceId, permission, connection);
      return work(connection, membership);
    });
  }

  async rename(userId: string, workspaceId: string, name: string): Promise<Workspace> {
    return this.locked(userId, workspaceId, 'edit', async (connection, membership) => {
      await connection.query('UPDATE workspaces SET name = $2 WHERE id = $1', [workspaceId, name]);
      return publicWorkspace({ ...membership, name });
    });
  }

  async addMember(
    userId: string,
    workspaceId: string,
    email: string,
    role: MemberRole,
  ): Promise<Member> {
    return this.locked(userId, workspaceId, 'manage_members', async (connection, membership) => {
      const target = (
        await connection.query(
          'SELECT id, email, display_name FROM users WHERE email = $1 AND disabled_at IS NULL',
          [email],
        )
      ).rows[0];
      if (!target)
        throw new ApiError(
          404,
          'ACCOUNT_NOT_FOUND',
          'Esa persona necesita crear su cuenta antes de sumarse.',
        );
      if (target.id === membership.ownerId)
        throw new ApiError(400, 'OWNER_MEMBER', 'El propietario ya tiene acceso completo.');
      const members = await this.repository.members(workspaceId, connection);
      if (members.some((member) => member.userId === target.id))
        throw new ApiError(409, 'ALREADY_MEMBER', 'Esta cuenta ya tiene acceso al espacio.');
      if (members.length >= 3)
        throw new ApiError(409, 'MEMBER_LIMIT', 'El espacio admite hasta tres colaboradores.');
      await connection.query(
        'INSERT INTO workspace_members(workspace_id, user_id, role) VALUES ($1, $2, $3)',
        [workspaceId, target.id, role],
      );
      return {
        userId: String(target.id),
        email: String(target.email),
        displayName: String(target.display_name),
        role,
      };
    });
  }

  async changeRole(
    userId: string,
    workspaceId: string,
    targetId: string,
    role: MemberRole,
  ): Promise<void> {
    await this.locked(userId, workspaceId, 'manage_members', async (connection) => {
      const result = await connection.query(
        'UPDATE workspace_members SET role = $3 WHERE workspace_id = $1 AND user_id = $2 RETURNING user_id',
        [workspaceId, targetId, role],
      );
      if (!result.rows[0])
        throw new ApiError(404, 'NOT_FOUND', 'El acceso no existe en este espacio.');
    });
  }

  async removeMember(userId: string, workspaceId: string, targetId: string): Promise<void> {
    await this.locked(userId, workspaceId, 'manage_members', async (connection) => {
      const result = await connection.query(
        'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 RETURNING user_id',
        [workspaceId, targetId],
      );
      if (!result.rows[0])
        throw new ApiError(404, 'NOT_FOUND', 'El acceso no existe en este espacio.');
    });
  }
}
