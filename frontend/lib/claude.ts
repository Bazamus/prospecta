import Anthropic from "@anthropic-ai/sdk"

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY no está definida en las variables de entorno")
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Modelo y límites según ARCHITECTURE.md
export const CLAUDE_MODEL = "claude-sonnet-4-5"
export const MAX_TOKENS_SCORING = 300
export const MAX_TOKENS_MESSAGES = 800

// TODO: implementar en Fase 1
// - scoringProspect(data): llama a Claude con el prompt de scoring y devuelve { score, etiqueta, justificacion }
// - generateMessage(data): genera mensaje personalizado para un prospecto
