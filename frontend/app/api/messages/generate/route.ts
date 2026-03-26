import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"
import { anthropic, CLAUDE_MODEL, MAX_TOKENS_MESSAGES } from "@/lib/claude"

// POST /api/messages/generate
// Genera un mensaje personalizado con Claude API basado en el perfil del prospecto
export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  const body = await request.json()
  const { prospect_id, template_id, canal, instrucciones_extra } = body

  if (!prospect_id) {
    return NextResponse.json({ error: "prospect_id es obligatorio" }, { status: 400 })
  }

  try {
    // Cargar prospecto
    const prospects = await sql`SELECT * FROM prospects WHERE id = ${prospect_id}`
    if (prospects.length === 0) {
      return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })
    }
    const prospect = prospects[0]

    // Cargar plantilla si se indica
    let template: Record<string, unknown> | null = null
    if (template_id) {
      const templates = await sql`SELECT * FROM templates WHERE id = ${template_id}`
      if (templates.length > 0) template = templates[0]
    }

    // Si no hay plantilla específica, buscar una del mismo nicho
    if (!template) {
      const templates = await sql`SELECT * FROM templates WHERE nicho = ${prospect.nicho} LIMIT 1`
      if (templates.length > 0) template = templates[0]
    }

    const systemPrompt = template
      ? String(template.instrucciones_sistema)
      : `Eres un consultor de digitalización especializado en el sector ${prospect.nicho}. Tu objetivo es generar un mensaje de prospección profesional, breve y personalizado para contactar con una empresa y presentarle una solución de digitalización. El mensaje debe ser directo, mostrar que conoces el sector y mencionar el valor de la solución.`

    const isEmail = canal !== "whatsapp"

    const userPrompt = `Genera un mensaje de ${isEmail ? "email" : "WhatsApp"} personalizado para este prospecto:

Empresa: ${prospect.nombre_empresa}
Sector/Nicho: ${prospect.nicho}
${prospect.contacto_nombre ? `Contacto: ${prospect.contacto_nombre}` : "Sin contacto directo identificado"}
${prospect.contacto_cargo ? `Cargo: ${prospect.contacto_cargo}` : ""}
${prospect.web ? `Web: ${prospect.web}` : "Sin web"}
${prospect.valoracion_google ? `Valoración Google: ${prospect.valoracion_google}/5 (${prospect.num_resenas || 0} reseñas)` : ""}
${prospect.score_justificacion ? `Análisis IA: ${prospect.score_justificacion}` : ""}
${instrucciones_extra ? `\nInstrucciones adicionales: ${instrucciones_extra}` : ""}

${isEmail
  ? `Devuelve ÚNICAMENTE un JSON con este formato exacto:
{
  "asunto": "asunto del email",
  "contenido": "cuerpo del email en texto plano"
}`
  : `Devuelve ÚNICAMENTE un JSON con este formato exacto:
{
  "asunto": "",
  "contenido": "mensaje de WhatsApp breve y directo"
}`}

No uses markdown. No añadas explicaciones fuera del JSON.`

    // Si no hay API key, generar mensaje simulado
    if (!anthropic) {
      const nombre = prospect.contacto_nombre || "equipo"
      return NextResponse.json({
        asunto: isEmail ? `Solución digital para ${prospect.nombre_empresa}` : "",
        contenido: isEmail
          ? `Hola ${nombre},\n\nMe pongo en contacto contigo porque he desarrollado una solución específica para empresas del sector ${prospect.nicho} como ${prospect.nombre_empresa}.\n\n¿Te interesaría ver una demo de 10 minutos?\n\nUn saludo`
          : `Hola ${nombre}, te escribo porque he desarrollado una herramienta para empresas de ${prospect.nicho} como ${prospect.nombre_empresa}. ¿Te interesaría ver una demo rápida?`,
      })
    }

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS_MESSAGES,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*?\}/)

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return NextResponse.json({
        asunto: parsed.asunto || "",
        contenido: parsed.contenido || text,
      })
    }

    return NextResponse.json({ asunto: "", contenido: text })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Error generando mensaje:", msg, error)
    return NextResponse.json({ error: `Error al generar mensaje: ${msg}` }, { status: 500 })
  }
}
