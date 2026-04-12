"use client"

import { useState, useRef, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScoreBadge } from "@/components/prospects/ScoreCard"
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Filter,
  Download,
  Building2,
  Mail,
  Star,
  TrendingUp,
} from "lucide-react"
import type { ImportRow, ScoredImportRow, ScoreEtiqueta, ScoreResponse, ScraperOverviewEntry } from "@/types"
import { processScraperJSON, detectNicho } from "@/lib/import/scraper-mapper"

type Step = "upload" | "scoring" | "review" | "json-preview" | "confirming" | "done"
type FileMode = "excel" | "json"

interface ParsedResult {
  total: number
  duplicates: number
  rows: (ImportRow & { is_duplicate: boolean })[]
}

interface JsonStats {
  total: number
  valid: number
  duplicates_internal: number
  skipped_closed: number
  with_email: number
  with_phone: number
  worth_pursuing: number
  spending_on_ads: number
  by_nicho: Record<string, number>
}

const NICHO_LABELS: Record<string, string> = {
  climatizacion: "Climatización",
  instalaciones: "Instalaciones",
  energia: "Energía",
  aislamiento: "Aislamiento",
  electricidad: "Electricidad",
  pci: "PCI",
  general: "General",
  otro: "Otro",
}

const NICHO_COLORS: Record<string, string> = {
  climatizacion: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  instalaciones: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  energia: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  aislamiento: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  electricidad: "text-purple-400 border-purple-400/30 bg-purple-400/10",
  pci: "text-red-400 border-red-400/30 bg-red-400/10",
  general: "text-gray-400 border-gray-400/30 bg-gray-400/10",
  otro: "text-slate-400 border-slate-400/30 bg-slate-400/10",
}

const PRODUCTOS = [
  { value: 'aisla_partes', label: 'Aisla Partes — Aislamiento de tuberías y conductos' },
  { value: 'partes_insta', label: 'Partes Insta — Fontanería, calefacción, climatización' },
  { value: 'planscan', label: 'Plan Scan — Análisis de planos para instaladores' },
  { value: 'reycode', label: 'Rey Code — Automatización y consultoría IA' },
]

function computeJsonStats(entries: ScraperOverviewEntry[]): JsonStats {
  const seen = new Set<string>()
  let valid = 0
  let duplicates_internal = 0
  let skipped_closed = 0
  let with_email = 0
  let with_phone = 0
  let worth_pursuing = 0
  let spending_on_ads = 0
  const by_nicho: Record<string, number> = {}

  for (const entry of entries) {
    if (!entry.name || !entry.place_id) continue

    if (seen.has(entry.place_id)) {
      duplicates_internal++
      continue
    }
    seen.add(entry.place_id)

    if (entry.is_temporarily_closed) {
      skipped_closed++
      continue
    }

    valid++

    if (entry.emails || entry.recommended_emails) with_email++
    if (entry.phone) with_phone++
    if (entry.is_worth_pursuing) worth_pursuing++
    if (entry.is_spending_on_ads) spending_on_ads++

    const nicho = detectNicho(entry)
    by_nicho[nicho] = (by_nicho[nicho] || 0) + 1
  }

  return {
    total: entries.length,
    valid,
    duplicates_internal,
    skipped_closed,
    with_email,
    with_phone,
    worth_pursuing,
    spending_on_ads,
    by_nicho,
  }
}

export function ImportModal({ onImportComplete }: { onImportComplete?: () => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("upload")
  const [fileMode, setFileMode] = useState<FileMode>("excel")
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState("")

  // Upload step (Excel)
  const [uploading, setUploading] = useState(false)
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Scoring step (Excel)
  const [scoringProgress, setScoringProgress] = useState(0)
  const [scoringTotal, setScoringTotal] = useState(0)
  const [scoringCurrent, setScoringCurrent] = useState("")
  const [scoredRows, setScoredRows] = useState<ScoredImportRow[]>([])

  // Review step (Excel)
  const [scoreFilter, setScoreFilter] = useState<string>("all")
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  // JSON mode state
  const [jsonEntries, setJsonEntries] = useState<ScraperOverviewEntry[]>([])
  const [jsonStats, setJsonStats] = useState<JsonStats | null>(null)
  const [productoObjetivo, setProductoObjetivo] = useState<string>("")

  // JSON pre-import filters
  const [filterEmail, setFilterEmail] = useState(false)
  const [filterPoor, setFilterPoor] = useState(false)

  // Confirm step
  const [confirmResult, setConfirmResult] = useState<{
    inserted: number
    updated: number
    message: string
    nichos?: Record<string, number>
  } | null>(null)

  // Entradas filtradas según filtros activos de pre-importación
  const activeEntries = useMemo(() => {
    if (!filterEmail && !filterPoor) return jsonEntries
    return jsonEntries.filter(entry => {
      if (filterEmail) {
        const hasEmail = (entry.emails && entry.emails.trim()) || (entry.recommended_emails && entry.recommended_emails.trim())
        if (!hasEmail) return false
      }
      if (filterPoor) {
        if (entry.sales_relevance?.toUpperCase().startsWith("POOR")) return false
      }
      return true
    })
  }, [jsonEntries, filterEmail, filterPoor])

  const activeStats = useMemo(() => computeJsonStats(activeEntries), [activeEntries])
  const filtersActive = filterEmail || filterPoor

  function resetState() {
    setStep("upload")
    setFileMode("excel")
    setFileName("")
    setError("")
    setUploading(false)
    setParsedResult(null)
    setScoringProgress(0)
    setScoringTotal(0)
    setScoringCurrent("")
    setScoredRows([])
    setScoreFilter("all")
    setSelectedRows(new Set())
    setJsonEntries([])
    setJsonStats(null)
    setProductoObjetivo("")
    setFilterEmail(false)
    setFilterPoor(false)
    setConfirmResult(null)
  }

  // ── Step 1: Upload ──────────────────────────────────────────

  async function handleFileUpload(file: File) {
    setError("")
    setUploading(true)
    setFileName(file.name)

    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'json') {
      // JSON mode — parse in client
      setFileMode("json")
      try {
        const text = await file.text()
        const data = JSON.parse(text) as ScraperOverviewEntry[]
        if (!Array.isArray(data)) {
          throw new Error('El archivo JSON debe contener un array de empresas')
        }
        const stats = computeJsonStats(data)
        setJsonEntries(data)
        setJsonStats(stats)
        setUploading(false)
        setStep("json-preview")
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al parsear el JSON')
        setUploading(false)
      }
      return
    }

    // Excel/CSV mode — upload to server
    setFileMode("excel")
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/prospects/import", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al procesar el archivo")
      }

      const data: ParsedResult = await res.json()
      setParsedResult(data)
      setUploading(false)

      startScoring(data.rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido")
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  // ── Step 2: Scoring (Excel only) ────────────────────────────

  async function startScoring(rows: (ImportRow & { is_duplicate: boolean })[]) {
    setStep("scoring")
    setScoringTotal(rows.length)
    setScoringProgress(0)

    const scored: ScoredImportRow[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      setScoringCurrent(row.nombre_empresa)
      setScoringProgress(i)

      let scoreResult: ScoreResponse

      try {
        const res = await fetch("/api/prospects/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        })
        scoreResult = await res.json()
      } catch {
        scoreResult = {
          score: 0,
          etiqueta: "Descartar",
          justificacion: "Error al obtener scoring",
        }
      }

      scored.push({
        ...row,
        score_ia: scoreResult.score,
        score_etiqueta: scoreResult.etiqueta,
        score_justificacion: scoreResult.justificacion,
      })
    }

    setScoringProgress(rows.length)
    setScoredRows(scored)

    const initialSelection = new Set<number>()
    scored.forEach((row, idx) => {
      if (!row.is_duplicate && row.score_ia >= 5) {
        initialSelection.add(idx)
      }
    })
    setSelectedRows(initialSelection)

    await new Promise((r) => setTimeout(r, 500))
    setStep("review")
  }

  // ── Step 3: Review (Excel only) ─────────────────────────────

  const filteredRows = scoredRows.filter((row) => {
    if (scoreFilter === "all") return true
    return row.score_etiqueta === scoreFilter
  })

  function toggleRow(globalIdx: number) {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(globalIdx)) {
        next.delete(globalIdx)
      } else {
        next.add(globalIdx)
      }
      return next
    })
  }

  function selectByMinScore(min: number) {
    const next = new Set<number>()
    scoredRows.forEach((row, idx) => {
      if (!row.is_duplicate && row.score_ia >= min) {
        next.add(idx)
      }
    })
    setSelectedRows(next)
  }

  // ── Step 4: Confirm Excel ───────────────────────────────────

  async function handleConfirmExcel() {
    setStep("confirming")
    setError("")

    const rowsToImport = scoredRows.filter((_, idx) => selectedRows.has(idx))

    try {
      const res = await fetch("/api/prospects/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rowsToImport }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al importar")
      }

      setConfirmResult(data)
      setStep("done")
      onImportComplete?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar")
      setStep("review")
    }
  }

  // ── Step JSON Preview: Confirm JSON ─────────────────────────

  async function handleConfirmJson() {
    if (!productoObjetivo) {
      setError("Selecciona un producto objetivo antes de importar")
      return
    }
    setStep("confirming")
    setError("")

    try {
      const res = await fetch("/api/prospects/import-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: activeEntries,
          productoObjetivo,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al importar")
      }

      setConfirmResult({
        inserted: data.insertados,
        updated: data.actualizados,
        message: `${data.duplicados_json} duplicados en JSON · ${data.actualizados} actualizados · ${data.errores?.length || 0} errores`,
        nichos: data.nichos,
      })
      setStep("done")
      onImportComplete?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar")
      setStep("json-preview")
    }
  }

  // ── Dialog title/description helpers ───────────────────────

  function getTitle() {
    if (step === "upload") return "Importar prospectos"
    if (step === "scoring") return "Analizando prospectos con IA..."
    if (step === "review") return "Revisar y confirmar importación"
    if (step === "json-preview") return "Vista previa del JSON"
    if (step === "confirming") return "Importando..."
    if (step === "done") return "Importación completada"
    return ""
  }

  function getDescription() {
    if (step === "upload") return "Sube un archivo Excel, CSV o JSON del scraper"
    if (step === "scoring") return "Evaluando cada empresa con inteligencia artificial"
    if (step === "review") return "Revisa los resultados y selecciona qué empresas importar"
    if (step === "json-preview") return "Estadísticas del archivo · Selecciona el producto objetivo"
    if (step === "confirming") return "Insertando prospectos en la base de datos"
    if (step === "done") return "Proceso finalizado"
    return ""
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) resetState()
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Upload className="h-4 w-4" />
          Importar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {/* ── Upload Step ── */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors hover:border-emerald-500/50 cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Procesando <span className="font-medium text-foreground">{fileName}</span>...
                  </p>
                </>
              ) : (
                <>
                  <div className="flex gap-3 mb-3">
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                    <FileJson className="h-8 w-8 text-emerald-500/70" />
                  </div>
                  <p className="text-sm font-medium">
                    Arrastra un archivo aquí o haz click para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Excel/CSV: .xlsx, .xls, .csv — JSON scraper: .json
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── Scoring Step (Excel) ── */}
        {step === "scoring" && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Analizando: <span className="text-foreground font-medium">{scoringCurrent}</span>
                </span>
                <span className="tabular-nums font-medium">
                  {scoringProgress} / {scoringTotal}
                </span>
              </div>
              <Progress
                value={(scoringProgress / Math.max(scoringTotal, 1)) * 100}
                className="h-2"
                indicatorClassName="bg-emerald-500"
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {parsedResult?.duplicates
                ? `${parsedResult.duplicates} duplicados detectados en la base de datos`
                : "Verificando duplicados y evaluando cada empresa con IA..."}
            </p>
          </div>
        )}

        {/* ── Review Step (Excel) ── */}
        {step === "review" && (
          <div className="flex flex-col min-h-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                {scoredRows.length} empresas analizadas
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium text-emerald-500">
                {selectedRows.size} seleccionadas
              </span>
              {scoredRows.filter((r) => r.is_duplicate).length > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-amber-500">
                    {scoredRows.filter((r) => r.is_duplicate).length} duplicadas
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Select value={scoreFilter} onValueChange={setScoreFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Filtrar score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los scores</SelectItem>
                  <SelectItem value="Alta">Alta (8-10)</SelectItem>
                  <SelectItem value="Media">Media (5-7)</SelectItem>
                  <SelectItem value="Baja">Baja (3-4)</SelectItem>
                  <SelectItem value="Descartar">Descartar (0-2)</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => selectByMinScore(8)} className="text-xs">
                  Solo Alta
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectByMinScore(5)} className="text-xs">
                  Alta + Media
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectByMinScore(0)} className="text-xs">
                  Todas
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedRows(new Set())} className="text-xs">
                  Ninguna
                </Button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <ScrollArea className="flex-1 min-h-0 max-h-[400px] rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40px]" />
                    <TableHead>Empresa</TableHead>
                    <TableHead>Nicho</TableHead>
                    <TableHead>Score IA</TableHead>
                    <TableHead className="hidden lg:table-cell">Justificación</TableHead>
                    <TableHead className="w-[80px]">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => {
                    const globalIdx = scoredRows.indexOf(row)
                    const isSelected = selectedRows.has(globalIdx)

                    return (
                      <TableRow
                        key={globalIdx}
                        className={`cursor-pointer ${row.is_duplicate ? "opacity-50" : ""} ${isSelected ? "bg-emerald-500/5" : ""}`}
                        onClick={() => !row.is_duplicate && toggleRow(globalIdx)}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={row.is_duplicate}
                            onChange={() => toggleRow(globalIdx)}
                            className="rounded border-input"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{row.nombre_empresa}</div>
                          <div className="text-xs text-muted-foreground">{row.email || "Sin email"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {NICHO_LABELS[row.nicho] || row.nicho}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ScoreBadge score={row.score_ia} etiqueta={row.score_etiqueta} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell max-w-[250px]">
                          <p className="text-xs text-muted-foreground line-clamp-2">{row.score_justificacion}</p>
                        </TableCell>
                        <TableCell>
                          {row.is_duplicate ? (
                            <Badge variant="warning" className="text-[10px]">Duplicada</Badge>
                          ) : isSelected ? (
                            <Badge variant="success" className="text-[10px]">Importar</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Omitir</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={resetState}>Cancelar</Button>
              <Button
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleConfirmExcel}
                disabled={selectedRows.size === 0}
              >
                <Download className="h-4 w-4" />
                Importar {selectedRows.size} prospectos
              </Button>
            </div>
          </div>
        )}

        {/* ── JSON Preview Step ── */}
        {step === "json-preview" && jsonStats && (
          <div className="space-y-4">
            {/* Stats grid — muestra activeStats si hay filtros activos */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border bg-card p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  Total en archivo
                </div>
                <p className="text-2xl font-bold">{jsonStats.total}</p>
              </div>
              <div className="rounded-lg border bg-card p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  A importar
                </div>
                <p className="text-2xl font-bold text-emerald-500">{activeStats.valid}</p>
                {filtersActive && jsonStats.valid !== activeStats.valid && (
                  <p className="text-[10px] text-amber-500">{jsonStats.valid} sin filtros</p>
                )}
              </div>
              <div className="rounded-lg border bg-card p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  Con email
                </div>
                <p className="text-2xl font-bold">{activeStats.with_email}</p>
                <p className="text-[10px] text-muted-foreground">
                  {activeStats.valid > 0 ? Math.round((activeStats.with_email / activeStats.valid) * 100) : 0}%
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  Recomendados
                </div>
                <p className="text-2xl font-bold text-green-500">{activeStats.worth_pursuing}</p>
                <p className="text-[10px] text-muted-foreground">is_worth_pursuing</p>
              </div>
            </div>

            {/* Secondary stats */}
            <div className="flex flex-wrap gap-3 text-sm">
              {jsonStats.duplicates_internal > 0 && (
                <span className="text-amber-500">{jsonStats.duplicates_internal} duplicados internos</span>
              )}
              {jsonStats.skipped_closed > 0 && (
                <span className="text-red-400">{jsonStats.skipped_closed} cerrados (omitidos)</span>
              )}
              {jsonStats.spending_on_ads > 0 && (
                <span className="text-purple-400">{jsonStats.spending_on_ads} invierten en Ads</span>
              )}
              <span className="text-muted-foreground">{jsonStats.with_phone} con teléfono</span>
            </div>

            {/* Filtros de importación */}
            <div className="rounded-lg border p-3 space-y-2.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filtros de importación</p>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterEmail}
                  onChange={(e) => setFilterEmail(e.target.checked)}
                  className="rounded border-input h-4 w-4"
                />
                <span className="text-sm">Solo con email</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {jsonStats.total - jsonStats.with_email} sin email descartadas
                </span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterPoor}
                  onChange={(e) => setFilterPoor(e.target.checked)}
                  className="rounded border-input h-4 w-4"
                />
                <span className="text-sm">Excluir POOR del scraper</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  baja relevancia comercial
                </span>
              </label>
              {filtersActive && (
                <p className="text-xs text-amber-500 pt-0.5">
                  {jsonStats.total} total → <span className="font-semibold">{activeStats.valid}</span> tras filtros
                  {" "}({jsonStats.total - activeStats.valid} descartadas)
                </p>
              )}
            </div>

            {/* Nichos breakdown — refleja filtros activos */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Distribución por nicho</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(activeStats.by_nicho)
                  .sort((a, b) => b[1] - a[1])
                  .map(([nicho, count]) => (
                    <span
                      key={nicho}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${NICHO_COLORS[nicho] || NICHO_COLORS.otro}`}
                    >
                      {NICHO_LABELS[nicho] || nicho}
                      <span className="font-bold">{count}</span>
                    </span>
                  ))}
              </div>
            </div>

            {/* Producto objetivo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Producto objetivo <span className="text-red-400">*</span>
              </label>
              <Select value={productoObjetivo} onValueChange={setProductoObjetivo}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="¿Qué producto vas a ofrecer a estas empresas?" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTOS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <Button variant="outline" onClick={resetState}>Cancelar</Button>
              <Button
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleConfirmJson}
                disabled={!productoObjetivo || activeStats.valid === 0}
              >
                <Download className="h-4 w-4" />
                Importar {activeStats.valid} empresas
              </Button>
            </div>
          </div>
        )}

        {/* ── Confirming Step ── */}
        {step === "confirming" && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
            <p className="text-sm text-muted-foreground">
              {fileMode === "json"
                ? `Procesando ${activeEntries.length} registros del scraper...`
                : `Insertando ${selectedRows.size} prospectos en la base de datos...`}
            </p>
          </div>
        )}

        {/* ── Done Step ── */}
        {step === "done" && confirmResult && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold">
                {confirmResult.inserted} prospectos importados
              </p>
              <p className="text-sm text-muted-foreground">{confirmResult.message}</p>
            </div>

            {/* Nichos summary for JSON imports */}
            {confirmResult.nichos && Object.keys(confirmResult.nichos).length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {Object.entries(confirmResult.nichos)
                  .sort((a, b) => b[1] - a[1])
                  .map(([nicho, count]) => (
                    <span
                      key={nicho}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${NICHO_COLORS[nicho] || NICHO_COLORS.otro}`}
                    >
                      {NICHO_LABELS[nicho] || nicho}
                      <span className="font-bold">{count}</span>
                    </span>
                  ))}
              </div>
            )}

            <Button
              className="mt-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setOpen(false)
                resetState()
              }}
            >
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
