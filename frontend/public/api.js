/** Cliente HTTP del mismo origen. Envía la cookie automáticamente y mantiene
 * el token CSRF sólo en memoria; transforma errores sin reintentar escrituras. */
export class ApiClientError extends Error {
  constructor(message, status = 0, code = 'NETWORK_ERROR') {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

export function createApiClient({
  fetchFn = globalThis.fetch.bind(globalThis),
  onSessionExpired = () => {},
} = {}) {
  let csrfToken = '';
  async function request(path, { method = 'GET', body } = {}) {
    if (!path.startsWith('/api/')) throw new Error('La API debe usar el mismo origen de Ensambla.');
    const mutation = !['GET', 'HEAD'].includes(method);
    const headers = { Accept: 'application/json' };
    if (mutation) {
      headers['Content-Type'] = 'application/json';
      headers['X-Ensambla-Request'] = '1';
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    }
    let response;
    try {
      response = await fetchFn(path, {
        method,
        headers,
        credentials: 'same-origin',
        cache: 'no-store',
        ...(mutation ? { body: JSON.stringify(body ?? {}) } : {}),
      });
    } catch {
      throw new ApiClientError('No pudimos conectar. Revisá tu conexión y volvé a intentar.');
    }
    if (response.status === 204) return null;
    let data;
    try {
      data = await response.json();
    } catch {
      throw new ApiClientError(
        'El servidor no devolvió una respuesta válida.',
        response.status,
        'INVALID_RESPONSE',
      );
    }
    if (!response.ok) {
      const error = new ApiClientError(
        data.error?.message || 'No se pudo completar la solicitud.',
        response.status,
        data.error?.code || 'REQUEST_FAILED',
      );
      if (error.code === 'SESSION_REQUIRED') {
        csrfToken = '';
        onSessionExpired();
      }
      throw error;
    }
    return data;
  }
  return {
    request,
    setCsrf: (token) => {
      csrfToken = typeof token === 'string' ? token : '';
    },
  };
}
