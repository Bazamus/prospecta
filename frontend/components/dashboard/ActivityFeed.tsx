import type { ActivityLog } from "@/types"

interface Props {
  activity: ActivityLog[]
}

// TODO: implementar en Fase 1
// - Feed de actividad reciente con icono por tipo (scoring, email, whatsapp, respuesta, nota)
// - Nombre de empresa vinculado al detalle del prospecto
// - Fecha relativa (hace 2h, ayer, etc.)
export function ActivityFeed({ activity }: Props) {
  return <div />
}
