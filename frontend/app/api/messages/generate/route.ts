import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"
import { callAI, MAX_TOKENS_MESSAGES } from "@/lib/ai-provider"

export async function POST(request: NextRequest) {
  if (!sql) return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })

  const body = await request.json()
  const { prospect_id, template_id, canal, instrucciones_extra } = body

  if (!prospect_id) return NextResponse.json({ error: "prospect_id es obligatorio" }, { status: 400 })

  try {
    const prospects = await sql`SELECT * FROM prospects WHERE id = ${prospect_id}`
    if (prospects.length === 0) return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })
    const prospect = prospects[0]

    let template: Record<string, unknown> | null = null
    if (template_id) {
      const t = await sql`SELECT * FROM templates WHERE id = ${template_id}`
      if (t.length > 0) template = t[0]
    }
    if (!template) {
      const t = await sql`SELECT * FROM templates WHERE nicho = ${prospect.nicho} LIMIT 1`
      if (t.length > 0) template = t[0]
    }

    const systemPrompt = template
      ? String(template.instrucciones_sistema)
      : `Eres un consultor de digitalización especializado en el sector ${prospect.nicho}. Genera un mensaje de prospección profesional, breve y personalizado.`

    const isEmail = canal !== "whatsapp"

    const userPrompt = `Genera un mensaje de ${isEmail ? "email" : "WhatsApp"} personalizado para este prospecto:

Empresa: ${prospect.nombre_empresa}
Sector/Nicho: ${prospect.nicho}
${prospect.contacto_nombre ? `Contacto: ${prospect.contacto_nombre}` : "Sin contacto directo"}
${prospect.contacto_cargo ? `Cargo: ${prospect.contacto_cargo}` : ""}
${prospect.web ? `Web: ${prospect.web}` : "Sin web"}
${prospect.valoracion_google ? `Valoración Google: ${prospect.valoracion_google}/5 (${prospect.num_resenas || 0} reseñas)` : ""}
${prospect.score_justificacion ? `Análisis IA: ${prospect.score_justificacion}` : ""}
${instrucciones_extra ? `\nInstrucciones adicionales: ${instrucciones_extra}` : ""}

${isEmail
  ? `Devuelve ÚNICAMENTE un JSON: { "asunto": "...", "contenido": "..." }`
  : `Devuelve ÚNICAMENTE un JSON: { "asunto": "", "contenido": "mensaje breve" }`}

Sin markdown. Solo JSON.`

    try {
      const text = await callAI({ system: systemPrompt, user: userPrompt, maxTokens: MAX_TOKENS_MESSAGES })
      const jsonMatch = text.match(/\{[\s\S]*?\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return NextResponse.json({ asunto: parsed.asunto || "", contenido: parsed.contenido || text })
      }
      return NextResponse.json({ asunto: "", contenido: text })
    } catch (aiError) {
      // Fallback: mensaje simulado si no hay proveedor IA
      const nombre = prospect.contacto_nombre || "equipo"
      return NextResponse.json({
        asunto: isEmail ? `Solución digital para ${prospect.nombre_empresa}` : "",
        contenido: isEmail
          ? `Hola ${nombre},\n\nMe pongo en contacto contigo porque he desarrollado una solución específica para empresas del sector ${prospect.nicho} como ${prospect.nombre_empresa}.\n\n¿Te interesaría ver una demo de 10 minutos?\n\nUn saludo`
          : `Hola ${nombre}, te escribo porque he desarrollado una herramienta para empresas de ${prospect.nicho} como ${prospect.nombre_empresa}. ¿Te interesaría ver una demo rápida?`,
      })
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Error al generar mensaje: ${msg}` }, { status: 500 })
  }
}
