import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { processScraperJSON } from '@/lib/import/scraper-mapper';
import type { ScraperOverviewEntry } from '@/types';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entries, productoObjetivo } = body as {
      entries: ScraperOverviewEntry[];
      productoObjetivo?: string;
    };

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'Se requiere un array de entries' }, { status: 400 });
    }

    // 1. Procesar y mapear
    const { prospects, duplicates, errors } = processScraperJSON(entries, productoObjetivo);

    // 2. Insertar o actualizar — dos pasos para evitar el índice parcial WHERE place_id IS NOT NULL
    let inserted = 0;
    let updated = 0;

    for (const p of prospects) {
      try {
        // Paso 1: ¿Ya existe este place_id en BD?
        const existing = await sql`
          SELECT id FROM prospects WHERE place_id = ${p.place_id} LIMIT 1
        `;

        if (existing.length > 0) {
          // Paso 2a: UPDATE de campos enriquecidos
          await sql`
            UPDATE prospects SET
              sales_summary      = ${p.sales_summary},
              sales_relevance    = ${p.sales_relevance},
              emails_all         = ${p.emails_all},
              recommended_email  = ${p.recommended_email},
              is_spending_on_ads = ${p.is_spending_on_ads},
              is_worth_pursuing  = ${p.is_worth_pursuing},
              review_keywords    = ${p.review_keywords},
              size_indicators    = ${p.size_indicators},
              updated_at         = now()
            WHERE place_id = ${p.place_id}
          `;
          updated++;
        } else {
          // Paso 2b: INSERT nuevo
          await sql`
            INSERT INTO prospects (
              nombre_empresa, nicho, email, telefono, direccion, web,
              valoracion_google, num_resenas, contacto_nombre,
              place_id, descripcion_gmaps, main_category, categories,
              is_spending_on_ads, sales_summary, sales_relevance, size_indicators,
              is_worth_pursuing, review_keywords, workday_timing, closed_on,
              owner_name, owner_profile_link, linkedin, facebook, instagram,
              twitter, tiktok, youtube, competitors, emails_all, recommended_email,
              gmaps_link, featured_image, query_origin, can_claim, carrier,
              line_type, producto_objetivo
            ) VALUES (
              ${p.nombre_empresa}, ${p.nicho}, ${p.email}, ${p.telefono}, ${p.direccion}, ${p.web},
              ${p.valoracion_google}, ${p.num_resenas}, ${p.contacto_nombre},
              ${p.place_id}, ${p.descripcion_gmaps}, ${p.main_category}, ${p.categories},
              ${p.is_spending_on_ads}, ${p.sales_summary}, ${p.sales_relevance}, ${p.size_indicators},
              ${p.is_worth_pursuing}, ${p.review_keywords}, ${p.workday_timing}, ${p.closed_on},
              ${p.owner_name}, ${p.owner_profile_link}, ${p.linkedin}, ${p.facebook}, ${p.instagram},
              ${p.twitter}, ${p.tiktok}, ${p.youtube}, ${p.competitors}, ${p.emails_all}, ${p.recommended_email},
              ${p.gmaps_link}, ${p.featured_image}, ${p.query_origin}, ${p.can_claim}, ${p.carrier},
              ${p.line_type}, ${p.producto_objetivo}
            )
          `;
          inserted++;
        }
      } catch (dbError: any) {
        console.error(`Error procesando "${p.nombre_empresa}":`, dbError.message);
        errors.push(`Error en ${p.nombre_empresa}: ${dbError.message}`);
      }
    }

    return NextResponse.json({
      total_procesados: entries.length,
      insertados: inserted,
      actualizados: updated,
      duplicados_json: duplicates,
      errores: errors,
      nichos: prospects.reduce((acc, p) => {
        acc[p.nicho] = (acc[p.nicho] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
