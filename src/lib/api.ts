export class ApiError extends Error {
  constructor(message: string, public status = 500, public details?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  const body = await response.json().catch(() => ({})) as { data?: T; error?: { message?: string } }
  if (!response.ok) throw new ApiError(body.error?.message ?? 'The request could not be completed.', response.status)
  return body.data as T
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: { message } }, { status })
}
