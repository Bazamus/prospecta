import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"
import { testAIConnection } from "@/lib/ai-provider"

// GET /api/settings/ai-config — lista todas las configs (keys enmascaradas)
export async function GET() {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })
  try {
    const rows = await sql`SELECT * FROM ai_config ORDER BY CASE WHEN estado = 'principal' THEN 0 ELSE 1 END, created_at DESC`
    const masked = rows.map((r) => ({
      ...r,
      api_key_masked: r.api_key ? `${String(r.api_key).slice(0, 8)}...${String(r.api_key).slice(-4)}` : "",
      api_key: undefined,
    }))
    return NextResponse.json({ data: masked })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST /api/settings/ai-config — crear nueva config
export async function POST(request: NextRequest) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })

  const body = await request.json()
  const { provider, model, api_key, api_url, test_only, set_principal } = body

  if (!provider || !model || !api_key) {
    return NextResponse.json({ error: "Provider, model y API key son obligatorios" }, { status: 400 })
  }

  // Test de conexión sin guardar
  if (test_only) {
    const result = await testAIConnection({ provider, model, api_key, api_url: api_url || null })
    return NextResponse.json(result)
  }

  try {
    const estado = set_principal ? "principal" : "guardada"

    // Si se establece como principal, desactivar la anterior
    if (set_principal) {
      await sql`UPDATE ai_config SET estado = 'guardada' WHERE estado = 'principal'`
    }

    const rows = await sql`
      INSERT INTO ai_config (provider, model, api_key, api_url, estado)
      VALUES (${provider}, ${model}, ${api_key}, ${api_url || null}, ${estado})
      RETURNING id, provider, model, estado, api_url, created_at
    `

    return NextResponse.json({ config: rows[0] }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
