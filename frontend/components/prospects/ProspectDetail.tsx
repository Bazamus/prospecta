import type { Prospect, Message, ActivityLog } from "@/types"

interface Props {
  prospect: Prospect
  messages: Message[]
  activity: ActivityLog[]
}

// TODO: implementar en Fase 1
// - ScoreCard con score, etiqueta y justificación
// - Datos de contacto y estado actual
// - Historial de mensajes enviados (canal, fecha, estado)
// - Log de actividad
// - Selector de estado + notas manuales
// - Botones: generar mensaje email / generar mensaje WA
export function ProspectDetail({ prospect, messages, activity }: Props) {
  return <div />
}
