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

export type ActivityTipo = "scoring" | "email" | "whatsapp" | "respuesta" | "nota" | "estado"

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
