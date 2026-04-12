import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/neon'
import { callAI } from '@/lib/ai-provider'

interface RouteParams {
  params: { id: string }
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  if (!sql) return NextResponse.json({ error: 'DB no configurada' }, { status: 503 })

  try {
    // Obtener valores actuales de la BD
    const rows = await sql`
      SELECT sales_summary, sales_relevance, size_indicators
      FROM prospects WHERE id = ${params.id}
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const { sales_summary, sales_relevance, size_indicators } = rows[0]

    const toTranslate = {
      sales_summary: sales_summary || null,
      sales_relevance: sales_relevance || null,
      size_indicators: size_indicators || null,
    }

    const text = await callAI({
      system: `Traduce estos textos al español. Mantén el formato y la estructura original.
Devuelve ÚNICAMENTE un JSON válido con exactamente estas claves: sales_summary, sales_relevance, size_indicators.
Si algún valor es null, devuélvelo como null.
No añadas explicaciones ni markdown.`,
      user: JSON.stringify(toTranslate),
      maxTokens: 1200,
    })

    // Parsear respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Respuesta de IA no válida' }, { status: 500 })
    }

    const translated = JSON.parse(jsonMatch[0])

    const newSummary = translated.sales_summary || sales_summary
    const newRelevance = translated.sales_relevance || sales_relevance
    const newIndicators = translated.size_indicators || size_indicators

    // Guardar en BD
    await sql`
      UPDATE prospects SET
        sales_summary   = ${newSummary},
        sales_relevance = ${newRelevance},
        size_indicators = ${newIndicators},
        updated_at      = now()
      WHERE id = ${params.id}
    `

    return NextResponse.json({
      sales_summary: newSummary,
      sales_relevance: newRelevance,
      size_indicators: newIndicators,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
