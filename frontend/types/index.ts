// ============================================================
// Tipos TypeScript globales — Prospecta
// Alineados con el schema de Neon (database/prospecta_schema_neon.sql)
// ============================================================

export type Nicho = "climatizacion" | "instalaciones" | "energia" | "otro"

export type ScoreEtiqueta = "Alta" | "Media" | "Baja" | "Descartar"

export type ProspectEstado =
  | "sin_contactar"
  | "contactado"
  | "respondio"
  | "interesado"
  | "demo_enviada"
  | "cerrado"
  | "descartado"

export type CampaignEstado = "borrador" | "activa" | "pausada" | "finalizada"

export type Canal = "email" | "whatsapp" | "ambos"

export type MessageEstado = "pendiente" | "enviado" | "entregado" | "abierto" | "error"

export type Tono = "formal" | "cercano" | "tecnico"

export type ActivityTipo = "scoring" | "email" | "whatsapp" | "respuesta" | "nota" | "estado" | "importacion"

// ── Entidades de BD ──────────────────────────────────────────

export interface Prospect {
  id: string
  nombre_empresa: string
  nicho: Nicho
  direccion: string | null
  email: string | null
  telefono: string | null
  contacto_nombre: string | null
  contacto_cargo: string | null
  web: string | null
  valoracion_google: number | null
  num_resenas: number | null
  score_ia: number | null
  score_etiqueta: ScoreEtiqueta | null
  score_justificacion: string | null
  estado: ProspectEstado
  notas: string | null
  campaign_id: string | null
  // Campos extendidos (ficha Google Maps) — opcionales, no todos los prospectos los tienen
  horario?: string | null
  categoria_google?: string | null
  ficha_reclamada?: boolean | null
  url_maps?: string | null
  imagen_url?: string | null
  resenas_texto?: string | null
  // Campos V2 — scraper enriquecido
  place_id?: string | null
  descripcion_gmaps?: string | null
  main_category?: string | null
  categories?: string | null
  is_spending_on_ads?: boolean | null
  sales_summary?: string | null
  sales_relevance?: string | null
  size_indicators?: string | null
  is_worth_pursuing?: boolean | null
  review_keywords?: string | null
  workday_timing?: string | null
  closed_on?: string | null
  owner_name?: string | null
  owner_profile_link?: string | null
  linkedin?: string | null
  facebook?: string | null
  instagram?: string | null
  twitter?: string | null
  tiktok?: string | null
  youtube?: string | null
  competitors?: string | null
  emails_all?: string | null
  recommended_email?: string | null
  gmaps_link?: string | null
  featured_image?: string | null
  query_origin?: string | null
  can_claim?: boolean | null
  carrier?: string | null
  line_type?: string | null
  producto_objetivo?: string | null
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  nombre: string
  nicho: Nicho
  canal: Canal
  template_id: string | null
  score_minimo: number
  estado: CampaignEstado
  fecha_inicio: string | null
  fecha_fin: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  prospect_id: string
  campaign_id: string | null
  canal: "email" | "whatsapp"
  asunto: string | null
  contenido: string
  estado_envio: MessageEstado
  fecha_envio: string | null
  fecha_respuesta: string | null
  created_at: string
}

export interface Template {
  id: string
  nombre: string
  nicho: Nicho
  producto: string
  tono: Tono
  instrucciones_sistema: string
  asunto_base: string | null
  cuerpo_base: string | null
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  prospect_id: string | null
  tipo: ActivityTipo
  descripcion: string
  created_at: string
}

// ── Tipos de importación ──────────────────────────────────────

export interface ImportRow {
  nombre_empresa: string
  nicho: Nicho
  direccion: string
  email: string
  telefono: string
  web: string
  valoracion_google: number | null
  num_resenas: number | null
  reviews_text: string
  horario: string
  descripcion: string
  categoria_original: string
  // Campos extendidos de Google Maps
  ficha_reclamada: boolean
  url_maps: string
  imagen_url: string
}

export interface ScoredImportRow extends ImportRow {
  score_ia: number
  score_etiqueta: ScoreEtiqueta
  score_justificacion: string
  is_duplicate: boolean
}

// ── Respuestas de la API ──────────────────────────────────────

export interface ScoreResponse {
  score: number
  etiqueta: ScoreEtiqueta
  justificacion: string
}

export interface GenerateMessageResponse {
  asunto: string
  contenido: string
}

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
