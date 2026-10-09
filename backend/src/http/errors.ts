/** Errores esperados de la API. Conserva un código y mensaje públicos;
 * el manejador HTTP oculta detalles internos de SQL y credenciales. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
