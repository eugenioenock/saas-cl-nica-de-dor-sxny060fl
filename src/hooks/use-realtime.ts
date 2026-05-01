import { useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import type { RecordSubscription } from 'pocketbase'

/**
 * Hook for real-time subscriptions to a PocketBase collection.
 * ALWAYS use this hook instead of subscribing inline.
 * Uses the per-listener UnsubscribeFunc so multiple components
 * can safely subscribe to the same collection without conflicts.
 */
export function useRealtime(
  collectionName: string,
  callback: (data: RecordSubscription<any>) => void,
  enabled: boolean = true,
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    let unsubscribeFn: (() => Promise<void>) | undefined
    let cancelled = false
    let retryTimeout: ReturnType<typeof setTimeout>

    const connect = async () => {
      if (cancelled) return

      try {
        const fn = await pb.collection(collectionName).subscribe('*', (e) => {
          callbackRef.current(e)
        })
        if (cancelled) {
          fn().catch(() => {})
        } else {
          unsubscribeFn = fn
        }
      } catch (error: any) {
        if (cancelled) return

        // If there's an authorization mismatch or another error, retry gracefully
        console.warn(
          `Realtime subscription failed for ${collectionName}, retrying...`,
          error?.message,
        )
        retryTimeout = setTimeout(connect, 2000)
      }
    }

    // Small delay ensures auth state is fully propagated
    // before attempting realtime subscription, preventing 403 errors
    const initialDelay = setTimeout(() => {
      connect()
    }, 50)

    return () => {
      cancelled = true
      clearTimeout(initialDelay)
      clearTimeout(retryTimeout)
      if (unsubscribeFn) {
        unsubscribeFn().catch(() => {})
      }
    }
  }, [collectionName, enabled])
}

export default useRealtime
