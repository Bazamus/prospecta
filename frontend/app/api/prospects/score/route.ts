import { NextRequest, NextResponse } from "next/server"
import { anthropic, CLAUDE_MODEL, MAX_TOKENS_SCORING } from "@/lib/claude"
import type { ScoreResponse } from "@/types"

interface ScoreRequestBody {
  nombre_empresa: string
  categoria_original: string
  nicho: string
  valoracion_google: number | null
  num_resenas: number | null
  web: string
  horario: string
  descripcion: string
  reviews_text: string
  direccion: string
  email: string
  telefono: string
}

// POST /api/prospects/score
// Recibe datos de una empresa y devuelve score IA (0-10), etiqueta y justificación
export async function POST(request: NextRequest) {
  const body: ScoreRequestBody = await request.json()

  // Si no hay API key configurada, devolver score simulado para testing
  if (!anthropic) {
    return NextResponse.json<ScoreResponse>(generateMockScore(body))
  }

  const systemPrompt = `Eres un analizador de prospectos comerciales especializado en ${body.nicho}.
Tu tarea es evaluar si una empresa es un buen candidato para contactarle
y ofrecerle una solución de digitalización para su sector.

Devuelve ÚNICAMENTE un JSON con este formato exacto:
{
  "score": <número entre 0 y 10 con un decimal>,
  "etiqueta": <"Alta" | "Media" | "Baja" | "Descartar">,
  "justificacion": <string de 1-2 frases explicando el razonamiento>
}

Criterios:
- 8-10 (Alta): Empresa del sector, activa, volumen suficiente, tiene web
- 5-7 (Media): Encaje probable pero con incertidumbre
- 3-4 (Baja): Encaje dudoso
- 0-2 (Descartar): Fuera del sector, inactiva o sin datos suficientes

No devuelvas nada más que el JSON. Sin explicaciones adicionales, sin markdown.`

  const empresaData: Record<string, unknown> = {
    nombre: body.nombre_empresa,
    categoria: body.categoria_original,
    nicho_detectado: body.nicho,
    direccion: body.direccion || null,
    tiene_web: !!body.web,
    web: body.web || null,
    valoracion_google: body.valoracion_google,
    num_resenas: body.num_resenas,
    tiene_email: !!body.email,
    tiene_telefono: !!body.telefono,
    horario: body.horario || null,
    descripcion: body.descripcion || null,
  }

  // Añadir reseñas solo si hay
  if (body.reviews_text) {
    empresaData.resenas = body.reviews_text
  }

  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS_SCORING,
      messages: [
        {
          role: "user",
          content: JSON.stringify(empresaData),
        },
      ],
      system: systemPrompt,
    })

    const text =
      response.content[0].type === "text" ? response.content[0].text : ""

    // Extraer JSON de la respuesta (puede venir envuelto en backticks)
    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) {
      console.error("Claude no devolvió JSON válido:", text)
      return NextResponse.json<ScoreResponse>(generateMockScore(body))
    }

    const parsed = JSON.parse(jsonMatch[0]) as ScoreResponse

    // Validar rango
    const score = Math.max(0, Math.min(10, Math.round(parsed.score * 10) / 10))
    const validEtiquetas = ["Alta", "Media", "Baja", "Descartar"] as const
    const etiqueta = validEtiquetas.includes(parsed.etiqueta as typeof validEtiquetas[number])
      ? parsed.etiqueta
      : score >= 8 ? "Alta" : score >= 5 ? "Media" : score >= 3 ? "Baja" : "Descartar"

    return NextResponse.json<ScoreResponse>({
      score,
      etiqueta,
      justificacion: parsed.justificacion || "Sin justificación disponible",
    })
  } catch (error) {
    console.error("Error llamando a Claude API:", error)
    // Fallback a score simulado si Claude falla
    return NextResponse.json<ScoreResponse>(generateMockScore(body))
  }
}

// Score simulado basado en heurísticas simples (para testing sin API key)
function generateMockScore(body: ScoreRequestBody): ScoreResponse {
  let score = 5.0

  // Tiene web → +1.5
  if (body.web) score += 1.5
  // Tiene email → +0.5
  if (body.email) score += 0.5
  // Valoración alta → +1
  if (body.valoracion_google && body.valoracion_google >= 4.0) score += 1.0
  // Muchas reseñas → +1
  if (body.num_resenas && body.num_resenas >= 50) score += 1.0
  // Tiene reseñas → +0.5
  if (body.reviews_text) score += 0.5
  // Tiene horario → +0.5
  if (body.horario) score += 0.5
  // Categoría es "otro" → -2
  if (body.nicho === "otro") score -= 2

  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10))

  const etiqueta = score >= 8 ? "Alta" : score >= 5 ? "Media" : score >= 3 ? "Baja" : "Descartar"

  return {
    score,
    etiqueta: etiqueta as ScoreResponse["etiqueta"],
    justificacion: `[Score simulado] Puntuación basada en heurísticas: ${body.web ? "tiene web" : "sin web"}, ${body.valoracion_google ?? "sin"} rating, ${body.num_resenas ?? 0} reseñas. Configura ANTHROPIC_API_KEY para scoring real con IA.`,
  }
}
