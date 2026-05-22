import { useState, useEffect, useCallback, useRef } from 'react'

interface FetchState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
}

/**
 * Generic async data-fetching hook.
 * Re-runs when `key` changes (pass an array of deps, they're JSON-compared).
 */
export function useFetch<T>(
  fetcher: (() => Promise<T>) | null,
  deps: unknown[] = [],
): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    isLoading: fetcher !== null,
    error: null,
  })
  const counterRef = useRef(0)

  const run = useCallback(async () => {
    if (!fetcher) {
      setState({ data: null, isLoading: false, error: null })
      return
    }
    const id = ++counterRef.current
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const data = await fetcher()
      if (id === counterRef.current) {
        setState({ data, isLoading: false, error: null })
      }
    } catch (err) {
      if (id === counterRef.current) {
        setState({
          data: null,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    run()
  }, [run])

  return { ...state, refetch: run }
}
