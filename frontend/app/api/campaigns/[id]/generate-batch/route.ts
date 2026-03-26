import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"
import { callAI, MAX_TOKENS_MESSAGES } from "@/lib/ai-provider"

interface Params { params: { id: string } }

// POST /api/campaigns/[id]/generate-batch — genera mensajes para prospectos sin contactar
export async function POST(request: NextRequest, { params }: Params) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })

  try {
    // Load campaign + template
    const campaigns = await sql`
      SELECT c.*, t.instrucciones_sistema, t.asunto_base, t.tono
      FROM campaigns c LEFT JOIN templates t ON t.id = c.template_id
      WHERE c.id = ${params.id}
    `
    if (campaigns.length === 0) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
    const campaign = campaigns[0]

    // Get uncontacted prospects in this campaign
    const prospects = await sql`
      SELECT p.* FROM prospects p
      INNER JOIN campaign_prospects cp ON cp.prospect_id = p.id
      WHERE cp.campaign_id = ${params.id} AND p.estado = 'sin_contactar'
    `

    if (prospects.length === 0) return NextResponse.json({ error: "No hay prospectos sin contactar" }, { status: 400 })

    const systemPrompt = campaign.instrucciones_sistema
      ? String(campaign.instrucciones_sistema)
      : `Eres un consultor de digitalización especializado en ${campaign.nicho}. Genera un mensaje de prospección breve y personalizado.`

    const isEmail = campaign.canal !== "whatsapp"
    const results: { prospect_id: string; nombre: string; asunto: string; contenido: string }[] = []

    for (const p of prospects) {
      const userPrompt = `Genera un mensaje de ${isEmail ? "email" : "WhatsApp"} para:
Empresa: ${p.nombre_empresa}
${p.contacto_nombre ? `Contacto: ${p.contacto_nombre}` : "Sin contacto"}
${p.web ? `Web: ${p.web}` : ""}
${p.score_justificacion ? `Análisis: ${p.score_justificacion}` : ""}

Devuelve solo JSON: { "asunto": "...", "contenido": "..." }`

      try {
        const text = await callAI({ system: systemPrompt, user: userPrompt, maxTokens: MAX_TOKENS_MESSAGES })
        const match = text.match(/\{[\s\S]*?\}/)
        const parsed = match ? JSON.parse(match[0]) : { asunto: "", contenido: text }

        // Insert message in DB
        await sql`
          INSERT INTO messages (prospect_id, campaign_id, canal, asunto, contenido, estado_envio)
          VALUES (${p.id}, ${params.id}, ${isEmail ? "email" : "whatsapp"}, ${parsed.asunto || null}, ${parsed.contenido || text}, 'pendiente')
        `

        results.push({ prospect_id: p.id, nombre: p.nombre_empresa, asunto: parsed.asunto || "", contenido: parsed.contenido || text })
      } catch {
        // Fallback simple
        const nombre = p.contacto_nombre || "equipo"
        const contenido = `Hola ${nombre}, me pongo en contacto por una solución para empresas de ${campaign.nicho} como ${p.nombre_empresa}.`
        await sql`
          INSERT INTO messages (prospect_id, campaign_id, canal, contenido, estado_envio)
          VALUES (${p.id}, ${params.id}, ${isEmail ? "email" : "whatsapp"}, ${contenido}, 'pendiente')
        `
        results.push({ prospect_id: p.id, nombre: p.nombre_empresa, asunto: "", contenido })
      }
    }

    return NextResponse.json({ generated: results.length, messages: results })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
