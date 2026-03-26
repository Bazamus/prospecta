"use client"

import { useState, useEffect } from "react"

export interface Nicho {
  id: string
  nombre: string
  slug: string
  color: string
  activo: boolean
  prospects_count?: number
}

let cachedNichos: Nicho[] | null = null

export function useNichos() {
  const [nichos, setNichos] = useState<Nicho[]>(cachedNichos || [])
  const [loading, setLoading] = useState(!cachedNichos)

  useEffect(() => {
    if (cachedNichos) return
    fetch("/api/settings/nichos")
      .then((r) => r.json())
      .then((data) => {
        const list = data.data || []
        cachedNichos = list
        setNichos(list)
      })
      .finally(() => setLoading(false))
  }, [])

  function refresh() {
    cachedNichos = null
    setLoading(true)
    fetch("/api/settings/nichos")
      .then((r) => r.json())
      .then((data) => {
        const list = data.data || []
        cachedNichos = list
        setNichos(list)
      })
      .finally(() => setLoading(false))
  }

  const nichoMap: Record<string, Nicho> = {}
  for (const n of nichos) nichoMap[n.slug] = n

  return { nichos, nichoMap, loading, refresh }
}
