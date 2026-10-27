export type ApiErrorKind = 'network' | 'http' | 'invalid-response' | 'session-expired';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Worth retrying later (no connection, server down) rather than showing as a permanent failure. */
  get isRetryable(): boolean {
    return this.kind === 'network' || (this.status !== null && this.status >= 500);
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
