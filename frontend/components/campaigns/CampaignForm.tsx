"use client"

import type { Template } from "@/types"

interface Props {
  templates: Template[]
  onSuccess?: () => void
}

// TODO: implementar en Fase 1
// Campos: nombre, nicho (select), canal (email/whatsapp/ambos), template_id (select),
//         score_minimo (slider 0-10), fecha_inicio, fecha_fin
export function CampaignForm({ templates, onSuccess }: Props) {
  return <div />
}
