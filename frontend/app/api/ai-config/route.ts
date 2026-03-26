import { NextRequest, NextResponse } from "next/server"

// Legacy redirect — las nuevas rutas están en /api/settings/ai-config
// Este archivo mantiene compatibilidad con el test de conexión del ImportModal

export async function GET(request: NextRequest) {
  const res = await fetch(new URL("/api/settings/ai-config", request.url))
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await fetch(new URL("/api/settings/ai-config", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
