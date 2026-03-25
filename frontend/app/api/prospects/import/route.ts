import { NextRequest, NextResponse } from "next/server"

// POST /api/prospects/import
// Recibe un archivo Excel/CSV, lo parsea, deduplica y lanza scoring IA
export async function POST(request: NextRequest) {
  // TODO: implementar en Fase 1
  // 1. Parsear archivo (xlsx → JSON) con lib/import/parser.ts
  // 2. Mapear categorías a nichos con lib/import/nicho-mapping.ts
  // 3. Deduplicar por email o nombre_empresa contra BD
  // 4. Llamar a /api/prospects/score para cada empresa
  // 5. Devolver tabla de previsualización con scores

  return NextResponse.json({ message: "Not implemented" }, { status: 501 })
}
