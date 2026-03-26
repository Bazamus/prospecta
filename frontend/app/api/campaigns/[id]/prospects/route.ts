import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

interface Params { params: { id: string } }

// POST /api/campaigns/[id]/prospects — añadir prospectos a campaña
export async function POST(request: NextRequest, { params }: Params) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })
  try {
    const { prospect_ids } = await request.json()
    if (!prospect_ids || prospect_ids.length === 0) return NextResponse.json({ error: "Se requieren prospect_ids" }, { status: 400 })

    let added = 0
    for (const pid of prospect_ids) {
      try {
        await sql`INSERT INTO campaign_prospects (campaign_id, prospect_id) VALUES (${params.id}, ${pid}) ON CONFLICT DO NOTHING`
        added++
      } catch { /* skip duplicates */ }
    }

    return NextResponse.json({ added })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
