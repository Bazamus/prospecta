import * as XLSX from "xlsx"
import { mapCategoriaNicho } from "./nicho-mapping"
import { parseReviewsXml } from "./reviews-parser"
import type { ImportRow } from "@/types"

// Elimina BOM y espacios invisibles de las claves del objeto
function cleanKeys(row: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    // Eliminar BOM (\uFEFF), ZWNBSP, y espacios leading/trailing
    const cleanKey = key.replace(/^\uFEFF/, "").replace(/^\u200B/, "").trim()
    cleaned[cleanKey] = value
  }
  return cleaned
}

// Lee un valor de una fila Excel probando varias variantes del nombre de columna
function readField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key]
    if (val !== undefined && val !== null && String(val) !== "undefined" && String(val) !== "") {
      return String(val).trim()
    }
  }
  return ""
}

function readNumber(row: Record<string, unknown>, ...keys: string[]): number | null {
  const raw = readField(row, ...keys)
  if (!raw) return null
  // Soportar coma como separador decimal ("4,7" → 4.7)
  const normalized = raw.replace(",", ".")
  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
}

export function parseImportFile(buffer: ArrayBuffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  return rows
    .map((rawRow): ImportRow | null => {
      const row = cleanKeys(rawRow)

      const nombre = readField(row, "Nombre", "nombre", "nombre_empresa", "Empresa")
      if (!nombre) return null

      // Filtrar entradas ocultas de herramientas de pago
      if (nombre.includes("Visible in Paid Version")) return null

      const direccionParts = [
        readField(row, "Direccion", "Dirección", "direccion"),
        readField(row, "Localidad", "localidad", "Ciudad", "ciudad"),
        readField(row, "Provincia", "provincia"),
      ].filter(Boolean)

      const categoriaOriginal = readField(row, "Categoría", "Categoria", "categoria", "Categoría principal")
      const email = readField(row, "email", "Email", "EMAIL", "Correo", "correo")

      // Filtrar emails ocultos de herramientas de pago
      const emailClean = email.includes("Visible in Paid Version") ? "" : email

      return {
        nombre_empresa: nombre,
        nicho: mapCategoriaNicho(categoriaOriginal),
        direccion: direccionParts.join(", "),
        email: emailClean,
        telefono: readField(row, "Teléfono", "Telefono", "telefono", "Phone", "phone"),
        web: readField(row, "Website", "website", "Web", "web", "URL", "url"),
        valoracion_google: readNumber(row, "Rating", "rating", "Valoración", "valoracion"),
        num_resenas: readNumber(row, "Nº Reviews", "Num Reviews", "num_resenas", "Reviews", "reviews"),
        reviews_text: parseReviewsXml(readField(row, "ReviewsText", "reviewsText", "Reviews Text")),
        horario: readField(row, "Horario", "horario", "Schedule", "Horarios"),
        descripcion: readField(row, "Descripción", "Descripcion", "descripcion", "Description"),
        categoria_original: categoriaOriginal,
      }
    })
    .filter((row): row is ImportRow => row !== null)
}
