"use client"

import { useState, useRef, useCallback } from "react"
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
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Filter,
  Download,
} from "lucide-react"
import type { ImportRow, ScoredImportRow, ScoreEtiqueta, ScoreResponse } from "@/types"

type Step = "upload" | "scoring" | "review" | "confirming" | "done"

interface ParsedResult {
  total: number
  duplicates: number
  rows: (ImportRow & { is_duplicate: boolean })[]
}

const NICHO_LABELS: Record<string, string> = {
  climatizacion: "Climatización",
  instalaciones: "Instalaciones",
  energia: "Energía",
  otro: "Otro",
}

export function ImportModal({ onImportComplete }: { onImportComplete?: () => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("upload")
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState("")

  // Upload step
  const [uploading, setUploading] = useState(false)
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Scoring step
  const [scoringProgress, setScoringProgress] = useState(0)
  const [scoringTotal, setScoringTotal] = useState(0)
  const [scoringCurrent, setScoringCurrent] = useState("")
  const [scoredRows, setScoredRows] = useState<ScoredImportRow[]>([])

  // Review step
  const [scoreFilter, setScoreFilter] = useState<string>("all")
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  // Confirm step
  const [confirmResult, setConfirmResult] = useState<{
    inserted: number
    skipped: number
    message: string
  } | null>(null)

  function resetState() {
    setStep("upload")
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
    setConfirmResult(null)
  }

  // ── Step 1: Upload ──────────────────────────────────────────

  async function handleFileUpload(file: File) {
    setError("")
    setUploading(true)
    setFileName(file.name)

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

      // Iniciar scoring automáticamente
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

  // ── Step 2: Scoring ─────────────────────────────────────────

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

    // Pre-seleccionar filas no duplicadas con score >= 5
    const initialSelection = new Set<number>()
    scored.forEach((row, idx) => {
      if (!row.is_duplicate && row.score_ia >= 5) {
        initialSelection.add(idx)
      }
    })
    setSelectedRows(initialSelection)

    // Pequeña pausa para que se vea el 100%
    await new Promise((r) => setTimeout(r, 500))
    setStep("review")
  }

  // ── Step 3: Review ──────────────────────────────────────────

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

  // ── Step 4: Confirm ─────────────────────────────────────────

  async function handleConfirm() {
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
          Importar Excel
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Importar prospectos"}
            {step === "scoring" && "Analizando prospectos con IA..."}
            {step === "review" && "Revisar y confirmar importación"}
            {step === "confirming" && "Importando..."}
            {step === "done" && "Importación completada"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Sube un archivo Excel o CSV con datos de empresas"}
            {step === "scoring" && "Evaluando cada empresa con inteligencia artificial"}
            {step === "review" && "Revisa los resultados y selecciona qué empresas importar"}
            {step === "confirming" && "Insertando prospectos en la base de datos"}
            {step === "done" && "Proceso finalizado"}
          </DialogDescription>
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
                  <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">
                    Arrastra un archivo Excel aquí o haz click para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formatos: .xlsx, .xls, .csv
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
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

        {/* ── Scoring Step ── */}
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

        {/* ── Review Step ── */}
        {step === "review" && (
          <div className="flex flex-col min-h-0 flex-1 space-y-4">
            {/* Stats bar */}
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

            {/* Filters */}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectByMinScore(8)}
                  className="text-xs"
                >
                  Solo Alta
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectByMinScore(5)}
                  className="text-xs"
                >
                  Alta + Media
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectByMinScore(0)}
                  className="text-xs"
                >
                  Todas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRows(new Set())}
                  className="text-xs"
                >
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

            {/* Table */}
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
                        className={`cursor-pointer ${
                          row.is_duplicate ? "opacity-50" : ""
                        } ${isSelected ? "bg-emerald-500/5" : ""}`}
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
                          <div className="text-xs text-muted-foreground">
                            {row.email || "Sin email"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {NICHO_LABELS[row.nicho] || row.nicho}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ScoreBadge
                            score={row.score_ia}
                            etiqueta={row.score_etiqueta}
                          />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell max-w-[250px]">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {row.score_justificacion}
                          </p>
                        </TableCell>
                        <TableCell>
                          {row.is_duplicate ? (
                            <Badge variant="warning" className="text-[10px]">
                              Duplicada
                            </Badge>
                          ) : isSelected ? (
                            <Badge variant="success" className="text-[10px]">
                              Importar
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Omitir
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={resetState}>
                Cancelar
              </Button>
              <Button
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleConfirm}
                disabled={selectedRows.size === 0}
              >
                <Download className="h-4 w-4" />
                Importar {selectedRows.size} prospectos
              </Button>
            </div>
          </div>
        )}

        {/* ── Confirming Step ── */}
        {step === "confirming" && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
            <p className="text-sm text-muted-foreground">
              Insertando {selectedRows.size} prospectos en la base de datos...
            </p>
          </div>
        )}

        {/* ── Done Step ── */}
        {step === "done" && confirmResult && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold">
                {confirmResult.inserted} prospectos importados
              </p>
              <p className="text-sm text-muted-foreground">
                {confirmResult.message}
              </p>
            </div>
            <Button
              className="mt-4 bg-emerald-600 hover:bg-emerald-700"
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
