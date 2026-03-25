import * as XLSX from "xlsx"
import { mapCategoriaNicho } from "./nicho-mapping"
import { parseReviewsXml } from "./reviews-parser"
import type { ImportRow } from "@/types"

// TODO: implementar en Fase 1
// Parsea un archivo Excel/CSV al formato ImportRow usando el mapeo de columnas de ARCHITECTURE.md

export function parseImportFile(buffer: ArrayBuffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  return rows.map((row) => ({
    nombre_empresa: String(row["Nombre"] ?? ""),
    nicho: mapCategoriaNicho(String(row["Categoría"] ?? row["Categoria"] ?? "")),
    direccion: [row["Direccion"], row["Localidad"], row["Provincia"]]
      .filter(Boolean)
      .join(", "),
    email: String(row["email"] ?? row["Email"] ?? ""),
    telefono: String(row["Teléfono"] ?? row["Telefono"] ?? ""),
    web: String(row["Website"] ?? row["Web"] ?? ""),
    valoracion_google: Number(row["Rating"] ?? null) || null,
    num_resenas: Number(row["Nº Reviews"] ?? row["Num Reviews"] ?? null) || null,
    reviews_text: parseReviewsXml(String(row["ReviewsText"] ?? "")),
    horario: String(row["Horario"] ?? ""),
    descripcion: String(row["Descripción"] ?? row["Descripcion"] ?? ""),
    categoria_original: String(row["Categoría"] ?? row["Categoria"] ?? ""),
  }))
}
