import type { ScoreEtiqueta } from "@/types"

interface Props {
  score: number
  etiqueta: ScoreEtiqueta
  justificacion: string
}

// TODO: implementar en Fase 1
// - Score numérico grande (ej. 8.4 / 10)
// - Badge de etiqueta con color (Alta=verde, Media=amarillo, Baja=naranja, Descartar=rojo)
// - Párrafo de justificación
export function ScoreCard({ score, etiqueta, justificacion }: Props) {
  return <div />
}
