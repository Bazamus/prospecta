import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

// GET /api/templates — lista de plantillas
export async function GET() {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  try {
    const templates = await sql`
      SELECT * FROM templates ORDER BY nicho, nombre
    `
    return NextResponse.json({ data: templates })
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json({ error: "Error al obtener plantillas" }, { status: 500 })
  }
}

// POST /api/templates — crear plantilla
export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { nombre, nicho, producto, tono, instrucciones_sistema, asunto_base, cuerpo_base } = body

    if (!nombre || !nicho || !producto || !tono || !instrucciones_sistema) {
      return NextResponse.json({ error: "Nombre, nicho, producto, tono e instrucciones son obligatorios" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO templates (nombre, nicho, producto, tono, instrucciones_sistema, asunto_base, cuerpo_base)
      VALUES (${nombre}, ${nicho}, ${producto}, ${tono}, ${instrucciones_sistema}, ${asunto_base || null}, ${cuerpo_base || null})
      RETURNING *
    `

    return NextResponse.json({ template: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating template:", error)
    return NextResponse.json({ error: "Error al crear plantilla" }, { status: 500 })
  }
}
