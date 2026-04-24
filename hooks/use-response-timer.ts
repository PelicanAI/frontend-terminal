"use client"

import { useState, useEffect, useRef } from 'react'

/**
 * Tracks elapsed time during API response loading.
 * Starts when isLoading becomes true, stops when false.
 * Updates every 100ms for smooth display.
 * 
 * @param isLoading - Whether a response is currently loading
 * @returns Elapsed seconds since loading started
 */
export function useResponseTimer(isLoading: boolean): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isLoading) {
      // Start timing
      startTimeRef.current = Date.now()
      setElapsedSeconds(0)
      
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Number(((Date.now() - startTimeRef.current) / 1000).toFixed(1))
          setElapsedSeconds(elapsed)
        }
      }, 100) // Update frequently for smooth display
    } else {
      // Stop timing
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      startTimeRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isLoading])

  return elapsedSeconds
}
