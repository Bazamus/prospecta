import type { Prospect } from "@/types"

interface Props {
  prospects: Prospect[]
}

// TODO: implementar en Fase 1
// - Tabla con columnas: empresa, nicho, score, etiqueta, estado, email, acciones
// - Filtros: por score_etiqueta, nicho, estado
// - Ordenación por score_ia desc
// - Click en fila navega a /prospects/[id]
export function ProspectTable({ prospects }: Props) {
  return <div />
}
