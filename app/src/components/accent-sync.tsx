"use client"

import { useEffect } from "react"
import { useAppStore } from "@/lib/state"

export function AccentSync() {
  const accent = useAppStore((state) => state.preferences.accentColor)
  const hydrated = useAppStore((state) => state.hydrated)

  useEffect(() => {
    if (!hydrated) {
      return
    }

    const root = document.documentElement
    root.setAttribute("data-accent", accent)
  }, [accent, hydrated])

  return null
}
