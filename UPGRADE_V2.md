# PROSPECTA — UPGRADE V2: Integración Google Maps Scraper Enriquecido
## Spec Técnico Ejecutable · Abril 2026

---

## Contexto

Prospecta ha cambiado de fuente de datos. El scraper anterior generaba CSVs simples con campos básicos.
El nuevo scraper (Google Maps Extractor + Business Enrichment API) genera JSONs con 46 campos por empresa,
incluyendo pre-scoring IA, redes sociales, análisis de relevancia comercial, keywords de reseñas y más.

Este documento contiene TODAS las instrucciones para adaptar Prospecta al nuevo formato.
Repositorio: `github.com/Bazamus/prospecta` — branch: `feat/scraper-v2`
Stack: Next.js 14, Tailwind, Shadcn/ui, NextAuth, Neon (PostgreSQL), Vercel.

---

## BLOQUE 1: Migración SQL (Neon)

Ejecutar esta migración en Neon SQL Editor. NO borrar datos existentes.

```sql
-- ============================================
-- Migración V2 — Nuevos campos scraper enriquecido
-- ============================================

-- 1. Nuevos campos en prospects
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS place_id             text,
  ADD COLUMN IF NOT EXISTS descripcion_gmaps    text,
  ADD COLUMN IF NOT EXISTS main_category        text,
  ADD COLUMN IF NOT EXISTS categories           text,
  ADD COLUMN IF NOT EXISTS is_spending_on_ads   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sales_summary        text,
  ADD COLUMN IF NOT EXISTS sales_relevance      text,
  ADD COLUMN IF NOT EXISTS size_indicators      text,
  ADD COLUMN IF NOT EXISTS is_worth_pursuing    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_keywords      text,
  ADD COLUMN IF NOT EXISTS workday_timing       text,
  ADD COLUMN IF NOT EXISTS closed_on            text,
  ADD COLUMN IF NOT EXISTS owner_name           text,
  ADD COLUMN IF NOT EXISTS owner_profile_link   text,
  ADD COLUMN IF NOT EXISTS linkedin             text,
  ADD COLUMN IF NOT EXISTS facebook             text,
  ADD COLUMN IF NOT EXISTS instagram            text,
  ADD COLUMN IF NOT EXISTS twitter              text,
  ADD COLUMN IF NOT EXISTS tiktok               text,
  ADD COLUMN IF NOT EXISTS youtube              text,
  ADD COLUMN IF NOT EXISTS competitors          text,
  ADD COLUMN IF NOT EXISTS emails_all           text,
  ADD COLUMN IF NOT EXISTS recommended_email    text,
  ADD COLUMN IF NOT EXISTS gmaps_link           text,
  ADD COLUMN IF NOT EXISTS featured_image       text,
  ADD COLUMN IF NOT EXISTS query_origin         text,
  ADD COLUMN IF NOT EXISTS can_claim            boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS carrier              text,
  ADD COLUMN IF NOT EXISTS line_type            text,
  ADD COLUMN IF NOT EXISTS producto_objetivo    text;

-- 2. Índice para deduplicación por place_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospects_place_id ON prospects(place_id) WHERE place_id IS NOT NULL;

-- 3. Ampliar constraint de nicho (nuevos nichos para PlanScan y ReyCode)
ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_nicho_check;
ALTER TABLE prospects ADD CONSTRAINT prospects_nicho_check
  CHECK (nicho IN ('climatizacion', 'instalaciones', 'energia', 'aislamiento', 'electricidad', 'pci', 'general', 'otro'));

-- 4. Nuevos tipos en activity_log
ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_tipo_check;
ALTER TABLE activity_log ADD CONSTRAINT activity_log_tipo_check
  CHECK (tipo IN ('scoring', 'email', 'whatsapp', 'respuesta', 'nota', 'estado', 'importacion'));
```

---

## BLOQUE 2: TypeScript Types

Actualizar `types/index.ts`. Añadir estos tipos SIN eliminar los existentes:

```typescript
// === Tipos para importación JSON del scraper ===

export interface ScraperOverviewEntry {
  place_id: string;
  name: string;
  description: string | null;
  is_spending_on_ads: boolean;
  reviews: number | null;
  rating: number | null;
  competitors: string | null;
  website: string | null;
  phone: string | null;
  can_claim: boolean;
  emails: string | null;           // comma-separated
  phones: string | null;           // comma-separated
  recommended_emails: string | null; // comma-separated
  emails_with_sources: string | null;
  phones_with_sources: string | null;
  recommended_emails_with_sources: string | null;
  failed_emails: string | null;
  linkedin: string | null;
  twitter: string | null;
  facebook: string | null;
  youtube: string | null;
  instagram: string | null;
  tiktok: string | null;
  github: string | null;
  snapchat: string | null;
  is_worth_pursuing: boolean;
  sales_summary: string | null;
  size_indicators: string | null;
  sales_relevance: string | null;
  is_valid_number: boolean | null;
  line_type: string | null;
  carrier: string | null;
  credit_cost: number | null;
  enrichment_error: string | null;
  owner_name: string | null;
  owner_profile_link: string | null;
  featured_image: string | null;
  main_category: string | null;
  categories: string | null;       // comma-separated
  workday_timing: string | null;
  is_temporarily_closed: boolean;
  closed_on: string | null;
  address: string | null;
  review_keywords: string | null;  // comma-separated
  link: string | null;
  query: string | null;
}

export interface ProspectFromScraper {
  // Campos directos BD
  nombre_empresa: string;
  nicho: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  web: string | null;
  valoracion_google: number | null;
  num_resenas: number | null;
  contacto_nombre: string | null;
  // Campos enriquecidos
  place_id: string;
  descripcion_gmaps: string | null;
  main_category: string | null;
  categories: string | null;
  is_spending_on_ads: boolean;
  sales_summary: string | null;
  sales_relevance: string | null;
  size_indicators: string | null;
  is_worth_pursuing: boolean;
  review_keywords: string | null;
  workday_timing: string | null;
  closed_on: string | null;
  owner_name: string | null;
  owner_profile_link: string | null;
  linkedin: string | null;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  tiktok: string | null;
  youtube: string | null;
  competitors: string | null;
  emails_all: string | null;
  recommended_email: string | null;
  gmaps_link: string | null;
  featured_image: string | null;
  query_origin: string | null;
  can_claim: boolean;
  carrier: string | null;
  line_type: string | null;
  producto_objetivo: string | null;
}

export type NichoType = 'climatizacion' | 'instalaciones' | 'energia' | 'aislamiento' | 'electricidad' | 'pci' | 'general' | 'otro';
```

---

## BLOQUE 3: Mapeo JSON → Prospecta

Crear archivo `lib/import/scraper-mapper.ts`:

```typescript
import { ScraperOverviewEntry, ProspectFromScraper, NichoType } from '@/types';

/**
 * Mapeo de categoría principal de Google Maps → nicho de Prospecta
 */
const CATEGORY_TO_NICHO: Record<string, NichoType> = {
  // Aislamiento
  'Empresa de aislamientos': 'aislamiento',
  'Contratista de revestimientos': 'aislamiento',
  'Servicio de impermeabilización': 'aislamiento',
  'Tienda de materiales de aislamiento': 'aislamiento',
  // Climatización
  'Empresa de climatización': 'climatizacion',
  'Contratista de aire acondicionado': 'climatizacion',
  'Servicio de reparación de aire acondicionado': 'climatizacion',
  'Tienda aire acondicionado': 'climatizacion',
  'Empresa de calefacción': 'climatizacion',
  'Proveedor de equipos de calefacción': 'climatizacion',
  'Servicio de limpieza de conductos de aire': 'climatizacion',
  // Instalaciones
  'Fontanero': 'instalaciones',
  'Contratista general': 'instalaciones',
  'Contratista': 'instalaciones',
  'Calderería industrial': 'instalaciones',
  'Constructor': 'instalaciones',
  // Energía
  'Proveedor de equipos de energía solar': 'energia',
  'Proveedor de sistemas solares de agua caliente': 'energia',
  // Electricidad
  'Electricista': 'electricidad',
  'Servicio de instalación eléctrica': 'electricidad',
  // PCI
  'Servicio de seguridad contra incendios': 'pci',
};

/**
 * Detecta el nicho a partir de la categoría principal y las subcategorías.
 * Intenta main_category primero, luego busca en categories.
 */
export function detectNicho(entry: ScraperOverviewEntry): NichoType {
  // 1. Intento directo por main_category
  if (entry.main_category && CATEGORY_TO_NICHO[entry.main_category]) {
    return CATEGORY_TO_NICHO[entry.main_category];
  }

  // 2. Buscar en subcategorías
  if (entry.categories) {
    const cats = entry.categories.split(',').map(c => c.trim());
    for (const cat of cats) {
      if (CATEGORY_TO_NICHO[cat]) {
        return CATEGORY_TO_NICHO[cat];
      }
    }
  }

  // 3. Búsqueda por keywords en nombre o descripción
  const text = `${entry.name} ${entry.description || ''} ${entry.main_category || ''}`.toLowerCase();
  if (text.includes('aisla') || text.includes('calorifug') || text.includes('impermeabil')) return 'aislamiento';
  if (text.includes('climatiz') || text.includes('aire acondicionado') || text.includes('hvac') || text.includes('calefacc')) return 'climatizacion';
  if (text.includes('fontaner') || text.includes('plomer') || text.includes('instalador')) return 'instalaciones';
  if (text.includes('electric')) return 'electricidad';
  if (text.includes('solar') || text.includes('energé') || text.includes('energet')) return 'energia';
  if (text.includes('incendio') || text.includes('pci') || text.includes('extintor')) return 'pci';

  return 'otro';
}

/**
 * Extrae el mejor email disponible.
 * Prioridad: recommended_emails > primer email de emails > null
 */
function extractBestEmail(entry: ScraperOverviewEntry): string | null {
  if (entry.recommended_emails) {
    const first = entry.recommended_emails.split(',')[0].trim();
    if (first && first.includes('@')) return first;
  }
  if (entry.emails) {
    const first = entry.emails.split(',')[0].trim();
    if (first && first.includes('@')) return first;
  }
  return null;
}

/**
 * Transforma una entrada del scraper al formato de Prospecta.
 */
export function mapScraperToProspect(
  entry: ScraperOverviewEntry,
  productoObjetivo?: string
): ProspectFromScraper {
  return {
    nombre_empresa: entry.name,
    nicho: detectNicho(entry),
    email: extractBestEmail(entry),
    telefono: entry.phone || null,
    direccion: entry.address || null,
    web: entry.website || null,
    valoracion_google: entry.rating || null,
    num_resenas: entry.reviews || null,
    contacto_nombre: entry.owner_name?.replace(' (propietario)', '').trim() || null,
    // Campos enriquecidos
    place_id: entry.place_id,
    descripcion_gmaps: entry.description || null,
    main_category: entry.main_category || null,
    categories: entry.categories || null,
    is_spending_on_ads: entry.is_spending_on_ads || false,
    sales_summary: entry.sales_summary || null,
    sales_relevance: entry.sales_relevance || null,
    size_indicators: entry.size_indicators || null,
    is_worth_pursuing: entry.is_worth_pursuing || false,
    review_keywords: entry.review_keywords || null,
    workday_timing: entry.workday_timing || null,
    closed_on: entry.closed_on || null,
    owner_name: entry.owner_name || null,
    owner_profile_link: entry.owner_profile_link || null,
    linkedin: entry.linkedin || null,
    facebook: entry.facebook || null,
    instagram: entry.instagram || null,
    twitter: entry.twitter || null,
    tiktok: entry.tiktok || null,
    youtube: entry.youtube || null,
    competitors: entry.competitors || null,
    emails_all: entry.emails || null,
    recommended_email: entry.recommended_emails || null,
    gmaps_link: entry.link || null,
    featured_image: entry.featured_image || null,
    query_origin: entry.query || null,
    can_claim: entry.can_claim || false,
    carrier: entry.carrier || null,
    line_type: entry.line_type || null,
    producto_objetivo: productoObjetivo || null,
  };
}

/**
 * Procesa un array completo del JSON overview del scraper.
 * Deduplica por place_id, filtra entradas sin nombre.
 */
export function processScraperJSON(
  entries: ScraperOverviewEntry[],
  productoObjetivo?: string
): { prospects: ProspectFromScraper[]; duplicates: number; errors: string[] } {
  const seen = new Set<string>();
  const prospects: ProspectFromScraper[] = [];
  const errors: string[] = [];
  let duplicates = 0;

  for (const entry of entries) {
    // Validación mínima
    if (!entry.name || !entry.place_id) {
      errors.push(`Entrada sin nombre o place_id: ${JSON.stringify(entry).slice(0, 100)}`);
      continue;
    }

    // Deduplicación por place_id
    if (seen.has(entry.place_id)) {
      duplicates++;
      continue;
    }
    seen.add(entry.place_id);

    // Filtrar cerrados permanentemente
    if (entry.is_temporarily_closed) continue;

    prospects.push(mapScraperToProspect(entry, productoObjetivo));
  }

  return { prospects, duplicates, errors };
}
```

---

## BLOQUE 4: API Route — Importación JSON

Crear archivo `app/api/prospects/import-json/route.ts`:

```typescript
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

    // 2. Insertar en BD con ON CONFLICT para deduplicar contra existentes
    let inserted = 0;
    let skipped = 0;

    for (const p of prospects) {
      try {
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
          ON CONFLICT (place_id) DO UPDATE SET
            sales_summary = EXCLUDED.sales_summary,
            sales_relevance = EXCLUDED.sales_relevance,
            emails_all = EXCLUDED.emails_all,
            recommended_email = EXCLUDED.recommended_email,
            updated_at = now()
        `;
        inserted++;
      } catch (dbError: any) {
        // Email duplicado u otro error de constraint
        if (dbError.message?.includes('unique') || dbError.message?.includes('duplicate')) {
          skipped++;
        } else {
          errors.push(`Error insertando ${p.nombre_empresa}: ${dbError.message}`);
        }
      }
    }

    return NextResponse.json({
      total_procesados: entries.length,
      insertados: inserted,
      duplicados_json: duplicates,
      duplicados_bd: skipped,
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
```

---

## BLOQUE 5: Componente ImportModal actualizado

Modificar `components/prospects/ImportModal.tsx`.
Mantener la funcionalidad Excel/CSV existente. Añadir pestaña/modo JSON.

### Cambios clave:
1. Aceptar `.json` además de `.xlsx, .xls, .csv`
2. Detectar formato por extensión del archivo
3. Para JSON: parsear en cliente, mostrar preview con conteo por nicho y estadísticas
4. Añadir selector de "Producto objetivo" (dropdown: Aisla Partes, Partes Insta, Plan Scan, Rey Code)
5. Enviar a `/api/prospects/import-json` en vez de `/api/prospects/import`

### Preview del JSON antes de importar:
Mostrar:
- Total de empresas en el archivo
- Desglose por nicho detectado (con badges de color)
- Empresas con email vs sin email
- Empresas marcadas "GOOD" por el scraper vs "POOR"
- Duplicados detectados
- Botón "Importar X empresas" (solo las no duplicadas)

### Selector de producto objetivo:
```typescript
const PRODUCTOS = [
  { value: 'aisla_partes', label: 'Aisla Partes — Aislamiento de tuberías y conductos' },
  { value: 'partes_insta', label: 'Partes Insta — Fontanería, calefacción, climatización' },
  { value: 'planscan', label: 'Plan Scan — Análisis de planos para instaladores' },
  { value: 'reycode', label: 'Rey Code — Automatización y consultoría IA' },
];
```

---

## BLOQUE 6: Página de detalle de prospecto — Rediseño

Modificar `components/prospects/ProspectDetail.tsx` y `app/(dashboard)/prospects/[id]/page.tsx`.

### Layout actual (mantener):
- Header con nombre, nicho badge, score, justificación
- Datos de contacto (teléfono, email, web, dirección)
- Estado y notas
- Reseñas
- Mensajes enviados
- Actividad

### Nuevas secciones a AÑADIR:

#### Sección: "Inteligencia Comercial" (después del score)
Card con:
- `sales_summary` — texto completo del análisis del scraper
- `sales_relevance` — con badge de color (GOOD=verde, POOR=rojo, otro=amarillo)
- `is_spending_on_ads` — badge "Invierte en Ads" si true
- `is_worth_pursuing` — badge "Recomendado" si true
- `can_claim` — badge "Ficha no reclamada" si true (oportunidad)

#### Sección: "Perfil Digital" (después de datos de contacto)
Card con iconos y links directos:
- LinkedIn, Facebook, Instagram, Twitter, TikTok, YouTube (solo mostrar los que existen)
- `owner_name` con link a `owner_profile_link`
- Botón "Ver en Google Maps" → `gmaps_link`
- Imagen de la ficha si `featured_image` existe

#### Sección: "Análisis del Negocio"
Card con:
- `main_category` y `categories` como badges
- `review_keywords` como tags/chips
- `size_indicators` como lista
- `workday_timing` + `closed_on` en formato tabla
- `competitors` parseado y mostrado como lista con nombre y nº reviews

#### Sección: "Datos de Contacto" (ampliar la existente)
- Mostrar `emails_all` como lista expandible (email principal destacado)
- `recommended_email` con badge "Recomendado por IA"
- `carrier` y `line_type` junto al teléfono

---

## BLOQUE 7: Scoring IA — Prompt enriquecido

Modificar `lib/claude.ts` — función de scoring.

El prompt actual recibe datos básicos. Ahora debe incluir los campos enriquecidos del scraper.
Esto mejora drásticamente la precisión del scoring porque Claude tiene contexto previo.

### Nuevo prompt de scoring:

```
System: Eres un analizador de prospectos comerciales especializado en {NICHO}.
Tu tarea es evaluar si una empresa es un buen candidato para contactarle
y ofrecerle {PRODUCTO}.

IMPORTANTE: Recibes datos enriquecidos que incluyen un pre-análisis de otra IA.
Úsalo como referencia pero haz tu propia evaluación independiente.

Devuelve ÚNICAMENTE un JSON:
{
  "score": <0-10 con un decimal>,
  "etiqueta": <"Alta" | "Media" | "Baja" | "Descartar">,
  "justificacion": <1-2 frases>
}

Criterios:
- 8-10 (Alta): Empresa del sector, activa, con volumen, tiene web, categoría encaja
- 5-7 (Media): Encaje probable pero con incertidumbre sobre el sector exacto
- 3-4 (Baja): Encaje dudoso, sector tangencial
- 0-2 (Descartar): Fuera del sector, tienda de materiales (no instalador), cerrada

Señales positivas: is_spending_on_ads=true, review_keywords del sector,
  categoría principal coincide, tiene contacto directo, LinkedIn activo
Señales negativas: categoría "Reformas" o "Tienda", sales_relevance="POOR",
  review_keywords de otro sector, sin web ni email

User: {JSON con TODOS los campos disponibles del prospecto}
```

### Datos a enviar en el user message:
```json
{
  "nombre": "...",
  "categoria_principal": "...",
  "categorias": "...",
  "rating": 4.7,
  "num_resenas": 237,
  "web": "...",
  "horario": "...",
  "descripcion": "...",
  "review_keywords": "...",
  "sales_summary": "...",
  "sales_relevance": "...",
  "is_spending_on_ads": true,
  "size_indicators": "...",
  "tiene_linkedin": true,
  "tiene_email": true
}
```

NO enviar: place_id, links completos, emails, teléfonos, competitors (no aportan al scoring y gastan tokens).

---

## BLOQUE 8: Lista de prospectos — Columnas nuevas

Modificar `components/prospects/ProspectTable.tsx`.

### Columnas a añadir (opcionales, toggle en UI):
- `main_category` — Categoría Google
- `is_spending_on_ads` — Icono 💰 si true
- `is_worth_pursuing` — Icono ✅ si true
- `producto_objetivo` — Badge con producto

### Filtros nuevos:
- Por `producto_objetivo`
- Por `is_spending_on_ads` (checkbox)
- Por `is_worth_pursuing` (checkbox)
- Por `main_category` (dropdown multi-select)

---

## BLOQUE 9: Dashboard — Métricas actualizadas

Añadir a `components/dashboard/StatsGrid.tsx`:

- **Nuevas cards de métricas:**
  - "Invierten en Ads" — count de is_spending_on_ads=true
  - "Recomendados por scraper" — count de is_worth_pursuing=true
  - "Con email verificado" — count de email IS NOT NULL
  - "Con LinkedIn" — count de linkedin IS NOT NULL

- **Nuevo gráfico:** Distribución por categoría Google Maps (top 10 main_category)

---

## EJEMPLO REAL — Entrada del scraper

Este es un registro real del JSON overview para referencia:

```json
{
  "place_id": "ChIJDeTYBblJQg0RMB56w0NAdkU",
  "name": "AISLAHOME Madrid",
  "description": "Somos una empresa especializada en aislamiento térmico y acústico de viviendas sin obra...",
  "is_spending_on_ads": false,
  "reviews": 623,
  "rating": 4.9,
  "competitors": "Name: PoliurMadrid 2010 s.l.\nReviews: 400 reviews\n\nName: Aisleficiente\nReviews: 169 reviews",
  "website": "http://aislahome.es/",
  "phone": "911 51 80 10",
  "can_claim": false,
  "emails": "info@aislahome.es, asilva@aislahome.es",
  "recommended_emails": "",
  "linkedin": "https://www.linkedin.com/company/aislahome",
  "facebook": "https://www.facebook.com/aislahome",
  "instagram": "https://www.instagram.com/aislahome_iberia",
  "tiktok": "https://www.tiktok.com/@aislahome",
  "is_worth_pursuing": false,
  "sales_summary": "AISLAHOME Madrid is a well-established thermal and acoustic insulation company...",
  "size_indicators": "623 Google reviews, 4.9 star rating, Active presence across multiple platforms",
  "sales_relevance": "MODERATE MATCH WITH CAVEATS - While AISLAHOME has strong indicators...",
  "owner_name": "AISLAHOME Madrid (propietario)",
  "main_category": "Empresa de aislamientos",
  "categories": "Empresa de aislamientos",
  "workday_timing": "9:00–14:00, 16:00–19:00",
  "closed_on": "sábado, domingo",
  "address": "C. del Pico Sta. Catalina, 27, 28970 Humanes de Madrid, Madrid",
  "review_keywords": "vivienda, técnico, presupuesto, lana de roca, aislamiento acústico",
  "link": "https://www.google.com/maps/place/AISLAHOME+Madrid/...",
  "query": "empresa de aislamientos térmicos in madrid"
}
```

**Resultado esperado tras mapeo:**
- `nicho`: "aislamiento" (por main_category = "Empresa de aislamientos")
- `email`: "info@aislahome.es" (primer email, no hay recommended)
- `contacto_nombre`: "AISLAHOME Madrid" (owner_name sin " (propietario)")
- `producto_objetivo`: "aisla_partes" (seleccionado en importación)

---

## NOTAS DE IMPLEMENTACIÓN

1. **Branch**: Crear `feat/scraper-v2` desde `main`. PR cuando esté listo.
2. **Migración**: Ejecutar el SQL del Bloque 1 en Neon ANTES de desplegar el código.
3. **Backward compatible**: El importador Excel/CSV existente NO se toca. El JSON es una opción nueva en paralelo.
4. **Orden de implementación sugerido**:
   - Migración SQL (Bloque 1)
   - Types (Bloque 2)
   - Mapper (Bloque 3)
   - API route (Bloque 4)
   - ImportModal (Bloque 5)
   - ProspectDetail (Bloque 6)
   - Scoring enriquecido (Bloque 7)
   - ProspectTable (Bloque 8)
   - Dashboard (Bloque 9)
5. **Testing**: Tras Bloque 4, probar con `curl` contra el JSON real (1.976 empresas).
6. **El archivo JSON de test** está en: `all-task-1-overview.json` (8MB, 1.976 empresas).

---

*Prospecta UPGRADE V2 — Spec técnico · Abril 2026*
