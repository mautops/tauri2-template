import { env } from '@/env'

export interface ApiClientOptions {
  timeout?: number
  headers?: Record<string, string>
}

export class ApiRequestError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

async function request<T>(
  baseUrl: string,
  path: string,
  init: RequestInit,
  options: ApiClientOptions,
): Promise<T> {
  const timeout = options.timeout ?? env.API_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const url = `${baseUrl}${path}`
  const headers: Record<string, string> = {
    ...options.headers,
    ...(init.headers as Record<string, string>),
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      let message = response.statusText
      try {
        const body = await response.json()
        if (body?.message) message = body.message
      } catch {
        // use statusText if body is not JSON
      }
      throw new ApiRequestError(message, response.status)
    }

    return response.json() as Promise<T>
  } finally {
    clearTimeout(timer)
  }
}

export interface ApiClient {
  get<T>(path: string, options?: ApiClientOptions): Promise<T>
  post<T>(path: string, body?: unknown, options?: ApiClientOptions): Promise<T>
  put<T>(path: string, body?: unknown, options?: ApiClientOptions): Promise<T>
  patch<T>(path: string, body?: unknown, options?: ApiClientOptions): Promise<T>
  delete<T>(path: string, options?: ApiClientOptions): Promise<T>
}

export function createApiClient(
  baseUrl: string,
  defaultOptions: ApiClientOptions = {},
): ApiClient {
  const opts = defaultOptions

  return {
    get: <T>(path: string, options: ApiClientOptions = {}) =>
      request<T>(baseUrl, path, { method: 'GET' }, { ...opts, ...options }),

    post: <T>(path: string, body?: unknown, options: ApiClientOptions = {}) =>
      request<T>(
        baseUrl,
        path,
        {
          method: 'POST',
          body: body !== undefined ? JSON.stringify(body) : undefined,
          headers: { 'Content-Type': 'application/json' },
        },
        { ...opts, ...options },
      ),

    put: <T>(path: string, body?: unknown, options: ApiClientOptions = {}) =>
      request<T>(
        baseUrl,
        path,
        {
          method: 'PUT',
          body: body !== undefined ? JSON.stringify(body) : undefined,
          headers: { 'Content-Type': 'application/json' },
        },
        { ...opts, ...options },
      ),

    patch: <T>(path: string, body?: unknown, options: ApiClientOptions = {}) =>
      request<T>(
        baseUrl,
        path,
        {
          method: 'PATCH',
          body: body !== undefined ? JSON.stringify(body) : undefined,
          headers: { 'Content-Type': 'application/json' },
        },
        { ...opts, ...options },
      ),

    delete: <T>(path: string, options: ApiClientOptions = {}) =>
      request<T>(baseUrl, path, { method: 'DELETE' }, { ...opts, ...options }),
  }
}

export const apiClient = createApiClient(env.API_BASE_URL)
