import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"
import { callAI, MAX_TOKENS_SCORING } from "@/lib/ai-provider"

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })

  const rows = await sql`SELECT * FROM prospects WHERE id = ${params.id}`
  if (rows.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  const p = rows[0]

  const nicho = p.nicho || "general"
  const producto = p.producto_objetivo || "soluciones de digitalización"

  const systemPrompt = `Eres un analizador de prospectos comerciales especializado en ${nicho}.
Tu tarea es evaluar si una empresa es un buen candidato para contactarle y ofrecerle ${producto}.

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

Señales positivas: is_spending_on_ads=true, review_keywords del sector, categoría principal coincide, tiene contacto directo, LinkedIn activo
Señales negativas: categoría "Reformas" o "Tienda", sales_relevance="POOR", review_keywords de otro sector, sin web ni email

No devuelvas nada más que el JSON. Sin explicaciones adicionales, sin markdown.`

  const empresaData: Record<string, unknown> = {
    nombre: p.nombre_empresa,
    nicho_detectado: nicho,
    tiene_web: !!p.web,
    web: p.web || null,
    valoracion_google: p.valoracion_google,
    num_resenas: p.num_resenas,
    tiene_email: !!p.email,
    tiene_telefono: !!p.telefono,
    tiene_linkedin: !!p.linkedin,
  }

  if (p.categoria_google) empresaData.categoria = p.categoria_google
  if (p.horario) empresaData.horario = p.horario
  if (p.resenas_texto) empresaData.resenas = (p.resenas_texto as string).slice(0, 500)
  if (p.main_category) empresaData.categoria_principal = p.main_category
  if (p.categories) empresaData.categorias = p.categories
  if (p.descripcion_gmaps) empresaData.descripcion = p.descripcion_gmaps
  if (p.sales_summary) empresaData.sales_summary = p.sales_summary
  if (p.sales_relevance) empresaData.sales_relevance = p.sales_relevance
  if (p.size_indicators) empresaData.size_indicators = p.size_indicators
  if (p.review_keywords) empresaData.review_keywords = p.review_keywords
  if (p.is_spending_on_ads != null) empresaData.is_spending_on_ads = p.is_spending_on_ads
  if (p.is_worth_pursuing != null) empresaData.is_worth_pursuing = p.is_worth_pursuing

  let score_ia: number
  let score_etiqueta: string
  let score_justificacion: string

  try {
    const text = await callAI({
      system: systemPrompt,
      user: JSON.stringify(empresaData),
      maxTokens: MAX_TOKENS_SCORING,
    })

    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) throw new Error("No JSON in response")

    const parsed = JSON.parse(jsonMatch[0])
    score_ia = Math.max(0, Math.min(10, Math.round(parsed.score * 10) / 10))
    const validEtiquetas = ["Alta", "Media", "Baja", "Descartar"]
    score_etiqueta = validEtiquetas.includes(parsed.etiqueta)
      ? parsed.etiqueta
      : score_ia >= 8 ? "Alta" : score_ia >= 5 ? "Media" : score_ia >= 3 ? "Baja" : "Descartar"
    score_justificacion = parsed.justificacion || "Sin justificación"
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg !== "NO_AI_CONFIG") console.error("Error scoring:", msg)

    // Mock fallback
    let s = 5.0
    if (p.web) s += 1.5
    if (p.email) s += 0.5
    if (p.valoracion_google && Number(p.valoracion_google) >= 4.0) s += 1.0
    if (p.num_resenas && Number(p.num_resenas) >= 50) s += 1.0
    if (p.is_spending_on_ads) s += 0.5
    if (p.is_worth_pursuing) s += 1.0
    if ((p.sales_relevance as string)?.toUpperCase().startsWith("POOR")) s -= 2.0
    if (p.linkedin) s += 0.5
    if (p.nicho === "otro") s -= 2
    s = Math.max(0, Math.min(10, Math.round(s * 10) / 10))
    score_ia = s
    score_etiqueta = s >= 8 ? "Alta" : s >= 5 ? "Media" : s >= 3 ? "Baja" : "Descartar"
    score_justificacion = `[Score simulado] ${p.web ? "tiene web" : "sin web"}, ${p.valoracion_google ?? "sin"} rating. Configura un proveedor IA en Configuración para scoring real.`
  }

  await sql`
    UPDATE prospects
    SET score_ia = ${score_ia}, score_etiqueta = ${score_etiqueta}, score_justificacion = ${score_justificacion}, updated_at = now()
    WHERE id = ${params.id}
  `

  await sql`
    INSERT INTO activity_log (prospect_id, tipo, descripcion)
    VALUES (${params.id}, 'scoring', ${`Score IA: ${score_ia}/10 (${score_etiqueta}) — ${score_justificacion}`})
  `

  return NextResponse.json({ score_ia, score_etiqueta, score_justificacion })
}
