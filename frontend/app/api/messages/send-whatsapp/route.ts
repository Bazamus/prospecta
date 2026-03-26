import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"
import { evolutionConfig } from "@/lib/evolution"

// POST /api/messages/send-whatsapp
export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  const body = await request.json()
  const { prospect_id, campaign_id, contenido } = body

  if (!prospect_id || !contenido) {
    return NextResponse.json({ error: "prospect_id y contenido son obligatorios" }, { status: 400 })
  }

  try {
    const prospects = await sql`SELECT telefono, nombre_empresa FROM prospects WHERE id = ${prospect_id}`
    if (prospects.length === 0) {
      return NextResponse.json({ error: "Prospecto no encontrado" }, { status: 404 })
    }

    const prospect = prospects[0]
    if (!prospect.telefono) {
      return NextResponse.json({ error: "El prospecto no tiene teléfono" }, { status: 400 })
    }

    let estadoEnvio = "enviado"

    // Enviar vía Evolution API si está configurado
    if (evolutionConfig.url && evolutionConfig.apiKey && evolutionConfig.instance) {
      try {
        // Limpiar teléfono: quitar espacios, guiones, +
        const phone = String(prospect.telefono).replace(/[\s\-\+\(\)]/g, "")

        const res = await fetch(
          `${evolutionConfig.url}/message/sendText/${evolutionConfig.instance}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: evolutionConfig.apiKey,
            },
            body: JSON.stringify({
              number: phone,
              text: contenido,
            }),
          }
        )

        if (!res.ok) {
          console.error("Evolution API error:", await res.text())
          estadoEnvio = "error"
        }
      } catch (e) {
        console.error("Error enviando WhatsApp vía Evolution:", e)
        estadoEnvio = "error"
      }
    } else {
      console.warn("Evolution API no configurada — mensaje registrado pero no enviado")
    }

    // Insertar mensaje en BD
    const messages = await sql`
      INSERT INTO messages (prospect_id, campaign_id, canal, contenido, estado_envio, fecha_envio)
      VALUES (${prospect_id}, ${campaign_id || null}, 'whatsapp', ${contenido}, ${estadoEnvio}, NOW())
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
      VALUES (${prospect_id}, 'whatsapp', ${`WhatsApp enviado a ${prospect.nombre_empresa}`})
    `

    return NextResponse.json({
      message: messages[0],
      estado_envio: estadoEnvio,
    })
  } catch (error) {
    console.error("Error enviando WhatsApp:", error)
    return NextResponse.json({ error: "Error al enviar WhatsApp" }, { status: 500 })
  }
}
