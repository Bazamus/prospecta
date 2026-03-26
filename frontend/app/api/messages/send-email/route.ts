import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"
import { resend, FROM_EMAIL } from "@/lib/resend"

// POST /api/messages/send-email
export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  const body = await request.json()
  const { prospect_id, campaign_id, asunto, contenido } = body

  if (!prospect_id || !asunto || !contenido) {
    return NextResponse.json({ error: "prospect_id, asunto y contenido son obligatorios" }, { status: 400 })
  }

  try {
    // Obtener email del prospecto
    const prospects = await sql`SELECT email, nombre_empresa FROM prospects WHERE id = ${prospect_id}`
    if (prospects.length === 0) {
      return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })
    }

    const prospect = prospects[0]
    if (!prospect.email) {
      return NextResponse.json({ error: "El prospecto no tiene email" }, { status: 400 })
    }

    let estadoEnvio = "enviado"
    let resendId: string | null = null

    // Enviar vía Resend si está configurado
    if (resend && FROM_EMAIL) {
      try {
        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: prospect.email as string,
          subject: asunto,
          text: contenido,
        })
        resendId = result.data?.id || null
      } catch (e) {
        console.error("Error enviando email vía Resend:", e)
        estadoEnvio = "error"
      }
    } else {
      console.warn("Resend no configurado — email registrado pero no enviado")
    }

    // Insertar mensaje en BD
    const messages = await sql`
      INSERT INTO messages (prospect_id, campaign_id, canal, asunto, contenido, estado_envio, fecha_envio)
      VALUES (${prospect_id}, ${campaign_id || null}, 'email', ${asunto}, ${contenido}, ${estadoEnvio}, NOW())
      RETURNING *
    `

    // Actualizar estado del prospecto si estaba sin contactar
    await sql`
      UPDATE prospects SET estado = 'contactado'
      WHERE id = ${prospect_id} AND estado = 'sin_contactar'
    `

    // Registrar actividad
    await sql`
      INSERT INTO activity_log (prospect_id, tipo, descripcion)
      VALUES (${prospect_id}, 'email', ${`Email enviado a ${prospect.nombre_empresa}: "${asunto}"`})
    `

    return NextResponse.json({
      message: messages[0],
      estado_envio: estadoEnvio,
      resend_id: resendId,
    })
  } catch (error) {
    console.error("Error enviando email:", error)
    return NextResponse.json({ error: "Error al enviar email" }, { status: 500 })
  }
}
