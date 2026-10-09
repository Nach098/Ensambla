/** Modelos de cuenta y sesión. Separa el usuario público de los datos
 * privados, para no enviar hashes o identificadores de sesión al navegador. */
export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}
export interface Account extends PublicUser {
  passwordHash: string | null;
  disabled: boolean;
}
export interface SessionContext {
  user: PublicUser;
  tokenHash: string;
  csrfToken: string;
}
export interface SessionIssue {
  token: string;
  context: SessionContext;
}
export interface RegisterInput {
  email: string;
  displayName: string;
  password: string;
  workspaceName: string;
}
export interface LoginInput {
  email: string;
  password: string;
}
export type WorkspaceRole = 'owner' | 'editor' | 'viewer';

export function publicUser(account: PublicUser): PublicUser {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    createdAt: account.createdAt,
  };
}
