// Evolution API — ya desplegada en VPS
// Docs: https://doc.evolution-api.com

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? ""
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? ""
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE ?? ""

// TODO: implementar en Fase 1
// - sendWhatsApp({ phone, message }): envía mensaje vía Evolution API
//   POST {EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}
//   Headers: { apikey: EVOLUTION_API_KEY }
//   Body: { number: phone, text: message }

export const evolutionConfig = {
  url: EVOLUTION_API_URL,
  apiKey: EVOLUTION_API_KEY,
  instance: EVOLUTION_INSTANCE,
}
