/** Endpoints de espacios y accesos. Exige sesión y CSRF antes de delegar
 * al servicio, que decide los permisos usando los datos del servidor. */
import { Router } from 'express';
import type { Config } from '../../config.js';
import type { Database } from '../../database/database.js';
import { uuidInput } from '../../http/validation.js';
import { requireSession, sessionContext } from '../auth/middleware.js';
import type { AuthService } from '../auth/service.js';
import { RateLimiter } from '../auth/rate-limiter.js';
import { WorkspaceService } from './service.js';
import { newMemberInput, roleChangeInput, workspaceNameInput } from './validation.js';

export function workspaceRoutes(database: Database, config: Config, auth: AuthService): Router {
  const router = Router();
  const workspaces = new WorkspaceService(database);
  const limiter = new RateLimiter(database);
  router.use(requireSession(auth.sessions, config));
  router.use(async (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      await limiter.hit('workspace-mutation', sessionContext(res).user.id, 60, 900);
    }
    next();
  });
  router.get('/', async (_req, res) =>
    res.json({ workspaces: await workspaces.list(sessionContext(res).user.id) }),
  );
  router.get('/:workspaceId', async (req, res) =>
    res.json({
      workspace: await workspaces.get(
        sessionContext(res).user.id,
        uuidInput(req.params.workspaceId),
      ),
    }),
  );
  router.patch('/:workspaceId', async (req, res) =>
    res.json({
      workspace: await workspaces.rename(
        sessionContext(res).user.id,
        uuidInput(req.params.workspaceId),
        workspaceNameInput(req.body),
      ),
    }),
  );
  router.get('/:workspaceId/members', async (req, res) =>
    res.json({
      members: await workspaces.members(
        sessionContext(res).user.id,
        uuidInput(req.params.workspaceId),
      ),
    }),
  );
  router.post('/:workspaceId/members', async (req, res) => {
    const input = newMemberInput(req.body);
    const member = await workspaces.addMember(
      sessionContext(res).user.id,
      uuidInput(req.params.workspaceId),
      input.email,
      input.role,
    );
    res.status(201).json({ member });
  });
  router.patch('/:workspaceId/members/:userId', async (req, res) => {
    await workspaces.changeRole(
      sessionContext(res).user.id,
      uuidInput(req.params.workspaceId),
      uuidInput(req.params.userId),
      roleChangeInput(req.body),
    );
    res.status(204).end();
  });
  router.delete('/:workspaceId/members/:userId', async (req, res) => {
    await workspaces.removeMember(
      sessionContext(res).user.id,
      uuidInput(req.params.workspaceId),
      uuidInput(req.params.userId),
    );
    res.status(204).end();
  });
  return router;
}
