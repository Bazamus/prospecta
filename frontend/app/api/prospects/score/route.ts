import { NextRequest, NextResponse } from "next/server"
import { callAI, MAX_TOKENS_SCORING } from "@/lib/ai-provider"
import type { ScoreResponse } from "@/types"

interface ScoreRequestBody {
  nombre_empresa: string
  categoria_original?: string
  nicho: string
  valoracion_google: number | null
  num_resenas: number | null
  web?: string
  horario?: string
  descripcion?: string
  reviews_text?: string
  direccion?: string
  email?: string
  telefono?: string
  // Campos enriquecidos V2
  main_category?: string | null
  categories?: string | null
  sales_summary?: string | null
  sales_relevance?: string | null
  size_indicators?: string | null
  is_spending_on_ads?: boolean | null
  is_worth_pursuing?: boolean | null
  review_keywords?: string | null
  linkedin?: string | null
  producto_objetivo?: string | null
  descripcion_gmaps?: string | null
}

export async function POST(request: NextRequest) {
  const body: ScoreRequestBody = await request.json()

  const nicho = body.nicho || "general"
  const producto = body.producto_objetivo || "soluciones de digitalización"

  const systemPrompt = `Eres un analizador de prospectos comerciales especializado en ${nicho}.
Tu tarea es evaluar si una empresa es un buen candidato para contactarle
y ofrecerle ${producto}.

IMPORTANTE: Recibes datos enriquecidos que pueden incluir un pre-análisis de otra IA.
Úsalo como referencia pero haz tu propia evaluación independiente.

Devuelve ÚNICAMENTE un JSON con este formato exacto:
{
  "score": <número entre 0 y 10 con un decimal>,
  "etiqueta": <"Alta" | "Media" | "Baja" | "Descartar">,
  "justificacion": <string de 1-2 frases explicando el razonamiento>
}

Criterios:
- 8-10 (Alta): Empresa del sector, activa, volumen suficiente, tiene web, categoría encaja
- 5-7 (Media): Encaje probable pero con incertidumbre
- 3-4 (Baja): Encaje dudoso, sector tangencial
- 0-2 (Descartar): Fuera del sector, tienda de materiales (no instalador), cerrada

Señales positivas: is_spending_on_ads=true, review_keywords del sector,
  categoría principal coincide, tiene contacto directo, LinkedIn activo
Señales negativas: categoría "Reformas" o "Tienda", sales_relevance="POOR",
  review_keywords de otro sector, sin web ni email

No devuelvas nada más que el JSON. Sin explicaciones adicionales, sin markdown.`

  const empresaData: Record<string, unknown> = {
    nombre: body.nombre_empresa,
    nicho_detectado: nicho,
    tiene_web: !!(body.web),
    web: body.web || null,
    valoracion_google: body.valoracion_google,
    num_resenas: body.num_resenas,
    tiene_email: !!(body.email),
    tiene_telefono: !!(body.telefono),
    tiene_linkedin: !!(body.linkedin),
  }

  // Campos clásicos (Excel/CSV)
  if (body.categoria_original) empresaData.categoria = body.categoria_original
  if (body.horario) empresaData.horario = body.horario
  if (body.descripcion) empresaData.descripcion = body.descripcion
  if (body.reviews_text) empresaData.resenas = body.reviews_text

  // Campos enriquecidos V2 (scraper)
  if (body.main_category) empresaData.categoria_principal = body.main_category
  if (body.categories) empresaData.categorias = body.categories
  if (body.descripcion_gmaps) empresaData.descripcion = body.descripcion_gmaps
  if (body.sales_summary) empresaData.sales_summary = body.sales_summary
  if (body.sales_relevance) empresaData.sales_relevance = body.sales_relevance
  if (body.size_indicators) empresaData.size_indicators = body.size_indicators
  if (body.review_keywords) empresaData.review_keywords = body.review_keywords
  if (body.is_spending_on_ads != null) empresaData.is_spending_on_ads = body.is_spending_on_ads
  if (body.is_worth_pursuing != null) empresaData.is_worth_pursuing = body.is_worth_pursuing

  try {
    const text = await callAI({
      system: systemPrompt,
      user: JSON.stringify(empresaData),
      maxTokens: MAX_TOKENS_SCORING,
    })

    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) {
      return NextResponse.json<ScoreResponse>(generateMockScore(body))
    }

    const parsed = JSON.parse(jsonMatch[0]) as ScoreResponse
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
    const msg = error instanceof Error ? error.message : String(error)
    if (msg === "NO_AI_CONFIG") {
      return NextResponse.json<ScoreResponse>(generateMockScore(body))
    }
    console.error("Error scoring:", msg)
    return NextResponse.json<ScoreResponse>(generateMockScore(body))
  }
}

function generateMockScore(body: ScoreRequestBody): ScoreResponse {
  let score = 5.0
  if (body.web) score += 1.5
  if (body.email) score += 0.5
  if (body.valoracion_google && body.valoracion_google >= 4.0) score += 1.0
  if (body.num_resenas && body.num_resenas >= 50) score += 1.0
  if (body.reviews_text) score += 0.5
  if (body.horario) score += 0.5
  // V2 signals
  if (body.is_spending_on_ads) score += 0.5
  if (body.is_worth_pursuing) score += 1.0
  if (body.sales_relevance?.toUpperCase().startsWith("POOR")) score -= 2.0
  if (body.linkedin) score += 0.5
  if (body.nicho === "otro") score -= 2
  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10))
  const etiqueta = score >= 8 ? "Alta" : score >= 5 ? "Media" : score >= 3 ? "Baja" : "Descartar"
  return {
    score,
    etiqueta: etiqueta as ScoreResponse["etiqueta"],
    justificacion: `[Score simulado] ${body.web ? "tiene web" : "sin web"}, ${body.valoracion_google ?? "sin"} rating, ${body.num_resenas ?? 0} reseñas. Configura un proveedor IA en Configuración para scoring real.`,
  }
}
