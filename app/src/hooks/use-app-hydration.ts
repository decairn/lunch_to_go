"use client"

import { useEffect } from "react"
import { useAppStore } from "@/lib/state"

export function useAppHydration() {
  const hydrated = useAppStore((state) => state.hydrated)
  const hydrate = useAppStore((state) => state.actions.hydrate)

  useEffect(() => {
    if (!hydrated) {
      void hydrate()
    }
  }, [hydrate, hydrated])
}
