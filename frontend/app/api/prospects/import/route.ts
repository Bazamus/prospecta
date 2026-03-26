import { NextRequest, NextResponse } from "next/server"
import { parseImportFile } from "@/lib/import/parser"
import { sql } from "@/lib/db/neon"

// POST /api/prospects/import
// Recibe un archivo Excel/CSV via FormData, lo parsea y devuelve las filas
// con detección de duplicados. NO ejecuta scoring — el cliente lo hace por fila
// para poder mostrar progreso en tiempo real.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo" },
        { status: 400 }
      )
    }

    // Validar tipo de archivo
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv",
    ]
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: "Formato no soportado. Usa .xlsx, .xls o .csv" },
        { status: 400 }
      )
    }

    // Parsear archivo
    const buffer = await file.arrayBuffer()
    const rows = parseImportFile(buffer)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "El archivo no contiene datos válidos" },
        { status: 400 }
      )
    }

    // Detección de duplicados contra BD (si hay conexión a Neon)
    let existingEmails: Set<string> = new Set()
    let existingNames: Set<string> = new Set()

    if (sql) {
      try {
        const existing = await sql`
          SELECT LOWER(email) as email, LOWER(nombre_empresa) as nombre
          FROM prospects
          WHERE email IS NOT NULL OR nombre_empresa IS NOT NULL
        `
        existingEmails = new Set(
          existing.filter((r) => r.email).map((r) => r.email as string)
        )
        existingNames = new Set(
          existing.filter((r) => r.nombre).map((r) => r.nombre as string)
        )
      } catch (e) {
        console.warn("No se pudo consultar duplicados en BD:", e)
      }
    }

    // Marcar duplicados
    const rowsWithDuplicates = rows.map((row) => {
      const emailDup = row.email
        ? existingEmails.has(row.email.toLowerCase())
        : false
      const nameDup = existingNames.has(row.nombre_empresa.toLowerCase())

      return {
        ...row,
        is_duplicate: emailDup || nameDup,
      }
    })

    return NextResponse.json({
      total: rowsWithDuplicates.length,
      duplicates: rowsWithDuplicates.filter((r) => r.is_duplicate).length,
      rows: rowsWithDuplicates,
    })
  } catch (error) {
    console.error("Error procesando archivo de importación:", error)
    return NextResponse.json(
      { error: "Error procesando el archivo. Verifica el formato." },
      { status: 500 }
    )
  }
}
