export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`${status} ${statusText}`)
    this.name = 'ApiError'
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  query?: Record<string, string | number | null | undefined>
  skipAuthRetry?: boolean
}

function resolveBaseUrl(): string {
  const config = useRuntimeConfig()
  if (import.meta.server) {
    return config.apiInternalUrl || config.public.apiBaseUrl || 'http://localhost:3000'
  }
  return config.public.apiBaseUrl || window.location.origin
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path, resolveBaseUrl())
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

let refreshPromise: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  if (!import.meta.client) return false
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(buildUrl('/api/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        return res.ok
      } catch {
        return false
      } finally {
        setTimeout(() => {
          refreshPromise = null
        }, 0)
      }
    })()
  }
  return refreshPromise
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers, skipAuthRetry, ...init } = options

  const doFetch = () =>
    fetch(buildUrl(path, query), {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

  let res = await doFetch()

  if (res.status === 401 && !skipAuthRetry) {
    const refreshed = await tryRefresh()
    if (refreshed) res = await doFetch()
  }

  let data: unknown = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, res.statusText, data)
  }

  return data as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
