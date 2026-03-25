import type { Message } from "@/types"

interface Props {
  messages: Message[]
}

// TODO: implementar en Fase 1
// - Lista cronológica de mensajes enviados
// - Icono de canal (email / WhatsApp), fecha, estado (badge)
// - Preview del contenido (colapsable)
export function MessageHistory({ messages }: Props) {
  return <div />
}
