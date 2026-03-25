import { NextRequest, NextResponse } from "next/server"

// POST /api/prospects/score
// Recibe datos de una empresa y devuelve score IA (0-10), etiqueta y justificación
export async function POST(request: NextRequest) {
  // TODO: implementar en Fase 1
  // 1. Recibir datos de empresa (nombre, categoría, rating, reseñas, web, horario, reviewsText)
  // 2. Llamar a Claude API via lib/claude.ts con prompt de scoring
  // 3. Devolver { score, etiqueta, justificacion }

  return NextResponse.json({ message: "Not implemented" }, { status: 501 })
}
