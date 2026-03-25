"use client"

import type { Prospect, Campaign } from "@/types"

interface Props {
  prospect: Prospect
  campaign: Campaign
}

// TODO: implementar en Fase 1
// - Selector de canal (email / WhatsApp)
// - Campo de instrucciones adicionales opcionales
// - Botón "Generar con IA" → llama a POST /api/messages/generate
// - Preview editable del mensaje generado (asunto + cuerpo)
// - Botón "Enviar" → llama a send-email o send-whatsapp según canal
export function MessageGenerator({ prospect, campaign }: Props) {
  return <div />
}
