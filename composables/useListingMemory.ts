type Scope = 'home' | 'nepakarata' | 'episodes'

const FALLBACK_URL: Record<Scope, string> = {
  home: '/',
  nepakarata: '/nep-akarata',
  episodes: '/epizodok',
}

function storageKey(scope: Scope): string {
  return `listing:${scope}`
}

function lastUrlKey(scope: Scope): string {
  return `lastListingUrl:${scope}`
}

export function useListingMemory<TState extends object = Record<string, unknown>>(scope: Scope) {
  const lastUrl = useState<string>(`lastListingUrl-state:${scope}`, () => FALLBACK_URL[scope])

  if (import.meta.client && lastUrl.value === FALLBACK_URL[scope]) {
    try {
      const stored = sessionStorage.getItem(lastUrlKey(scope))
      if (stored) lastUrl.value = stored
    } catch {
      // sessionStorage unavailable; keep fallback
    }
  }

  function save(payload: TState & { scrollY?: number }) {
    if (!import.meta.client) return
    try {
      const data = { ...payload, scrollY: payload.scrollY ?? window.scrollY }
      sessionStorage.setItem(storageKey(scope), JSON.stringify(data))
    } catch {
      // quota or disabled — silently drop
    }
  }

  function read(): (TState & { scrollY: number }) | null {
    if (!import.meta.client) return null
    try {
      const raw = sessionStorage.getItem(storageKey(scope))
      return raw ? (JSON.parse(raw) as TState & { scrollY: number }) : null
    } catch {
      return null
    }
  }

  function clear() {
    if (!import.meta.client) return
    try {
      sessionStorage.removeItem(storageKey(scope))
    } catch {
      // ignore
    }
  }

  function setLastUrl(fullPath: string) {
    lastUrl.value = fullPath
    if (!import.meta.client) return
    try {
      sessionStorage.setItem(lastUrlKey(scope), fullPath)
    } catch {
      // ignore
    }
  }

  return { lastUrl, save, read, clear, setLastUrl }
}
