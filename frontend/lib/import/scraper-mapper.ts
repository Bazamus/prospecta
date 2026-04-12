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
