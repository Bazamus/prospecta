import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/neon"

interface Params { params: { id: string; prospectId: string } }

// DELETE /api/campaigns/[id]/prospects/[prospectId] — quitar prospecto de campaña
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!sql) return NextResponse.json({ error: "DB no configurada" }, { status: 503 })
  try {
    await sql`DELETE FROM campaign_prospects WHERE campaign_id = ${params.id} AND prospect_id = ${params.prospectId}`
    return NextResponse.json({ removed: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
