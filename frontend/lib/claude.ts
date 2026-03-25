import Anthropic from "@anthropic-ai/sdk"

function getAnthropicClient() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    console.warn("ANTHROPIC_API_KEY no configurada — las llamadas a Claude fallarán")
    return null
  }
  return new Anthropic({ apiKey: key })
}

export const anthropic = getAnthropicClient()

// Modelo y límites según ARCHITECTURE.md
export const CLAUDE_MODEL = "claude-sonnet-4-5"
export const MAX_TOKENS_SCORING = 300
export const MAX_TOKENS_MESSAGES = 800
