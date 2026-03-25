import { neon } from "@neondatabase/serverless"

function getDbClient() {
  const url = process.env.DATABASE_URL
  if (!url || url.includes("user:password@host")) {
    console.warn("DATABASE_URL no configurada — las queries a BD fallarán")
    return null
  }
  return neon(url)
}

export const sql = getDbClient()
