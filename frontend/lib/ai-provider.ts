import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { sql } from "@/lib/db/neon"

export interface AIConfig {
  id: string
  provider: "anthropic" | "openai" | "openrouter" | "mistral" | "deepseek"
  model: string
  api_key: string
  api_url: string | null
  estado: "principal" | "guardada"
  created_at?: string
}

export const MAX_TOKENS_SCORING = 300
export const MAX_TOKENS_MESSAGES = 800

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  mistral: "https://api.mistral.ai/v1",
  deepseek: "https://api.deepseek.com",
}

export async function getPrincipalAIConfig(): Promise<AIConfig | null> {
  if (!sql) return null
  try {
    const rows = await sql`SELECT * FROM ai_config WHERE estado = 'principal' LIMIT 1`
    return rows.length > 0 ? (rows[0] as unknown as AIConfig) : null
  } catch {
    return null
  }
}

function getEnvFallbackConfig(): AIConfig | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  return {
    id: "env",
    provider: "anthropic",
    model: "claude-sonnet-4-5-20241022",
    api_key: key,
    api_url: null,
    estado: "principal",
  }
}

export async function callAI(opts: {
  system: string
  user: string
  maxTokens: number
}): Promise<string> {
  const config = (await getPrincipalAIConfig()) || getEnvFallbackConfig()
  if (!config) throw new Error("NO_AI_CONFIG")

  if (config.provider === "anthropic") {
    return callAnthropic(config, opts)
  } else {
    return callOpenAICompatible(config, opts)
  }
}

export async function callAnthropic(
  config: AIConfig,
  opts: { system: string; user: string; maxTokens: number }
): Promise<string> {
  const client = new Anthropic({ apiKey: config.api_key })
  const response = await client.messages.create({
    model: config.model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  })
  return response.content[0].type === "text" ? response.content[0].text : ""
}

export async function callOpenAICompatible(
  config: AIConfig,
  opts: { system: string; user: string; maxTokens: number }
): Promise<string> {
  const baseURL = config.api_url || PROVIDER_BASE_URLS[config.provider] || PROVIDER_BASE_URLS.openai
  const client = new OpenAI({ apiKey: config.api_key, baseURL })
  const response = await client.chat.completions.create({
    model: config.model,
    max_tokens: opts.maxTokens,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  })
  return response.choices[0]?.message?.content || ""
}

export async function testAIConnection(config: Pick<AIConfig, "provider" | "model" | "api_key" | "api_url">): Promise<{ ok: boolean; error?: string }> {
  try {
    const testOpts = { system: "Responde solo con la palabra OK.", user: "Test", maxTokens: 10 }
    const fullConfig = { ...config, id: "", estado: "guardada" as const }
    if (config.provider === "anthropic") {
      await callAnthropic(fullConfig, testOpts)
    } else {
      await callOpenAICompatible(fullConfig, testOpts)
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
