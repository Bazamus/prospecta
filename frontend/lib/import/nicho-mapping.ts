import type { Nicho } from "@/types"

// Mapeo de categorías de Google Maps a nichos de la BD
// Configurable sin tocar rutas API ni componentes
const NICHO_MAP: Record<string, Nicho> = {
  // Climatización
  "climatización": "climatizacion",
  "climatizacion": "climatizacion",
  "aire acondicionado": "climatizacion",
  "calefacción": "climatizacion",
  "hvac": "climatizacion",
  "aislamiento térmico": "climatizacion",
  "aislamiento termico": "climatizacion",
  "conductos": "climatizacion",

  // Instalaciones
  "carpintería metálica y de aluminio": "instalaciones",
  "carpinteria metalica y de aluminio": "instalaciones",
  "instalaciones técnicas": "instalaciones",
  "instalaciones tecnicas": "instalaciones",
  "instalador": "instalaciones",
  "fontanería": "instalaciones",
  "fontaneria": "instalaciones",
  "electricidad": "instalaciones",
  "electricista": "instalaciones",

  // Energía
  "gestión energética": "energia",
  "gestion energetica": "energia",
  "energía solar": "energia",
  "energia solar": "energia",
  "placas solares": "energia",
  "paneles solares": "energia",
  "eficiencia energética": "energia",
  "eficiencia energetica": "energia",
}

export function mapCategoriaNicho(categoria: string): Nicho {
  const normalized = categoria.toLowerCase().trim()

  for (const [key, nicho] of Object.entries(NICHO_MAP)) {
    if (normalized.includes(key)) return nicho
  }

  return "otro"
}
