"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { ScoreBadge } from "@/components/prospects/ScoreCard"
import { ImportModal } from "@/components/prospects/ImportModal"
import { NichoSelect } from "@/components/ui/nicho-select"
import { useNichos } from "@/lib/hooks/use-nichos"
import {
  Search, Mail, MessageCircle, Eye, ArrowUpDown, Filter, X,
  ChevronLeft, ChevronRight, Loader2, Upload, Plus, Trash2, Sparkles,
} from "lucide-react"
import type { Prospect, ScoreEtiqueta, Nicho } from "@/types"

const NICHO_LABELS: Record<string, string> = {
  climatizacion: "Climatización", instalaciones: "Instalaciones", energia: "Energía", otro: "Otro",
}
const ESTADO_LABELS: Record<string, string> = {
  sin_contactar: "Sin contactar", contactado: "Contactado", respondio: "Respondió",
  interesado: "Interesado", demo_enviada: "Demo enviada", cerrado: "Cerrado", descartado: "Descartado",
}
const ESTADO_BADGE_VARIANT: Record<string, "success" | "warning" | "info" | "danger" | "default" | "secondary"> = {
  sin_contactar: "secondary", contactado: "info", respondio: "warning",
  interesado: "success", demo_enviada: "success", cerrado: "default", descartado: "danger",
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Hoy"
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `Hace ${diffDays}d`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem.`
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
}

interface ProspectRow extends Prospect { ultimo_canal?: string | null; ultimo_contacto?: string | null }
interface ApiResponse { data: ProspectRow[]; pagination: { page: number; limit: number; total: number; pages: number } }

export default function ProspectsPage() {
  const { nichoMap } = useNichos()
  const [data, setData] = useState<ProspectRow[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [nichoFilter, setNichoFilter] = useState("all")
  const [estadoFilter, setEstadoFilter] = useState("all")
  const [scoreFilter, setScoreFilter] = useState("all")
  const [sortBy, setSortBy] = useState("score_ia")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // Selección múltiple
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Modal añadir
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ nombre_empresa: "", nicho: "instalaciones" as Nicho, email: "", telefono: "", direccion: "", contacto_nombre: "", contacto_cargo: "", web: "", notas: "" })
  const [addScoring, setAddScoring] = useState(false)
  const [addScore, setAddScore] = useState<{ score_ia: number; score_etiqueta: string; score_justificacion: string } | null>(null)
  const [addSaving, setAddSaving] = useState(false)

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchProspects = useCallback(async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", "25")
    params.set("sort", sortBy)
    params.set("dir", sortDir)
    if (nichoFilter !== "all") params.set("nicho", nichoFilter)
    if (estadoFilter !== "all") params.set("estado", estadoFilter)
    if (scoreFilter !== "all") {
      const minScores: Record<string, string> = { Alta: "8", Media: "5", Baja: "3" }
      params.set("score_min", minScores[scoreFilter] || "0")
    }
    if (search) params.set("search", search)
    try {
      const res = await fetch(`/api/prospects?${params}`)
      if (res.ok) { const json: ApiResponse = await res.json(); setData(json.data); setPagination(json.pagination) }
    } catch (e) { console.error(e) }
    finally { setLoading(false); setSelected(new Set()) }
  }, [nichoFilter, estadoFilter, scoreFilter, search, sortBy, sortDir])

  useEffect(() => { fetchProspects(1) }, [fetchProspects])

  function toggleSort(field: string) {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortBy(field); setSortDir(field === "nombre_empresa" ? "asc" : "desc") }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }
  function toggleSelectAll() {
    if (selected.size === data.length) setSelected(new Set())
    else setSelected(new Set(data.map((p) => p.id)))
  }

  async function handleBulkDelete() {
    setDeleting(true)
    try {
      await fetch("/api/prospects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selected) }) })
      setDeleteOpen(false)
      fetchProspects(pagination.page)
    } catch (e) { console.error(e) }
    finally { setDeleting(false) }
  }

  async function handleAddScore() {
    setAddScoring(true)
    try {
      const res = await fetch("/api/prospects/score", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, categoria_original: "", reviews_text: "", descripcion: "", valoracion_google: null, num_resenas: null }),
      })
      if (res.ok) setAddScore(await res.json())
    } catch (e) { console.error(e) }
    finally { setAddScoring(false) }
  }

  async function handleAddSave() {
    setAddSaving(true)
    try {
      const body = { ...addForm, ...(addScore || {}) }
      const res = await fetch("/api/prospects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (res.ok) { setAddOpen(false); setAddForm({ nombre_empresa: "", nicho: "instalaciones", email: "", telefono: "", direccion: "", contacto_nombre: "", contacto_cargo: "", web: "", notas: "" }); setAddScore(null); fetchProspects(1) }
    } catch (e) { console.error(e) }
    finally { setAddSaving(false) }
  }

  const hasFilters = nichoFilter !== "all" || estadoFilter !== "all" || scoreFilter !== "all" || search !== ""

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prospectos</h1>
          <p className="text-sm text-muted-foreground">{pagination.total} empresas en total</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" />Añadir</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Añadir prospecto</DialogTitle>
                <DialogDescription>Introduce los datos del prospecto manualmente</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-xs font-medium">Nombre empresa *</label><Input value={addForm.nombre_empresa} onChange={(e) => setAddForm({ ...addForm, nombre_empresa: e.target.value })} /></div>
                  <div className="space-y-1"><label className="text-xs font-medium">Nicho *</label>
                    <NichoSelect value={addForm.nicho} onValueChange={(v) => setAddForm({ ...addForm, nicho: v as Nicho })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-xs font-medium">Email</label><Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} /></div>
                  <div className="space-y-1"><label className="text-xs font-medium">Teléfono</label><Input value={addForm.telefono} onChange={(e) => setAddForm({ ...addForm, telefono: e.target.value })} /></div>
                </div>
                <div className="space-y-1"><label className="text-xs font-medium">Dirección</label><Input value={addForm.direccion} onChange={(e) => setAddForm({ ...addForm, direccion: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-xs font-medium">Contacto nombre</label><Input value={addForm.contacto_nombre} onChange={(e) => setAddForm({ ...addForm, contacto_nombre: e.target.value })} /></div>
                  <div className="space-y-1"><label className="text-xs font-medium">Contacto cargo</label><Input value={addForm.contacto_cargo} onChange={(e) => setAddForm({ ...addForm, contacto_cargo: e.target.value })} /></div>
                </div>
                <div className="space-y-1"><label className="text-xs font-medium">Web</label><Input value={addForm.web} onChange={(e) => setAddForm({ ...addForm, web: e.target.value })} /></div>
                <div className="space-y-1"><label className="text-xs font-medium">Notas</label><textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={addForm.notas} onChange={(e) => setAddForm({ ...addForm, notas: e.target.value })} /></div>

                {addScore && (
                  <div className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center gap-2"><ScoreBadge score={addScore.score_ia} etiqueta={addScore.score_etiqueta as ScoreEtiqueta} /></div>
                    <p className="text-xs text-muted-foreground">{addScore.score_justificacion}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={handleAddScore} disabled={addScoring || !addForm.nombre_empresa} className="gap-1.5">
                    {addScoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Calcular score IA
                  </Button>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleAddSave} disabled={addSaving || !addForm.nombre_empresa}>
                    {addSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Guardar prospecto
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <ImportModal onImportComplete={() => fetchProspects(1)} />
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-secondary/50 p-3">
          <span className="text-sm font-medium">{selected.size} seleccionados</span>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1.5"><Trash2 className="h-3.5 w-3.5" />Eliminar seleccionados</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Confirmar eliminación</DialogTitle><DialogDescription>Se eliminarán {selected.size} prospectos y todos sus mensajes y actividad asociados. Esta acción no se puede deshacer.</DialogDescription></DialogHeader>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
                <Button variant="destructive" onClick={handleBulkDelete} disabled={deleting}>{deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Eliminar {selected.size}</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Deseleccionar</Button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar empresa, email, contacto..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchProspects(1)} className="pl-9" />
        </div>
        <NichoSelect value={nichoFilter} onValueChange={setNichoFilter} includeAll className="w-[160px]" />
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[170px]"><Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="sin_contactar">Sin contactar</SelectItem><SelectItem value="contactado">Contactado</SelectItem><SelectItem value="respondio">Respondió</SelectItem><SelectItem value="interesado">Interesado</SelectItem><SelectItem value="demo_enviada">Demo enviada</SelectItem><SelectItem value="cerrado">Cerrado</SelectItem><SelectItem value="descartado">Descartado</SelectItem></SelectContent>
        </Select>
        <Select value={scoreFilter} onValueChange={setScoreFilter}>
          <SelectTrigger className="w-[150px]"><Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos los scores</SelectItem><SelectItem value="Alta">Alta (8+)</SelectItem><SelectItem value="Media">Media (5+)</SelectItem><SelectItem value="Baja">Baja (3+)</SelectItem></SelectContent>
        </Select>
        {hasFilters && <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setNichoFilter("all"); setEstadoFilter("all"); setScoreFilter("all") }} className="gap-1.5 text-muted-foreground"><X className="h-3.5 w-3.5" />Limpiar</Button>}
      </div>

      {/* Tabla */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40px]"><input type="checkbox" checked={data.length > 0 && selected.size === data.length} onChange={toggleSelectAll} className="rounded border-input" /></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("nombre_empresa")}><div className="flex items-center gap-1">Empresa<ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" /></div></TableHead>
              <TableHead>Nicho</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("score_ia")}><div className="flex items-center gap-1">Score IA<ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" /></div></TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("updated_at")}><div className="flex items-center gap-1">Último contacto<ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" /></div></TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />Cargando...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">{hasFilters ? "No se encontraron prospectos." : "No hay prospectos. Importa o añade uno."}</TableCell></TableRow>
            ) : data.map((p) => (
              <TableRow key={p.id} className={selected.has(p.id) ? "bg-primary/5" : ""}>
                <TableCell><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded border-input" /></TableCell>
                <TableCell>
                  <Link href={`/prospects/${p.id}`} className="block hover:underline">
                    <div className="font-medium">{p.nombre_empresa}</div>
                    {p.contacto_nombre && <div className="text-xs text-muted-foreground">{p.contacto_nombre}{p.contacto_cargo && ` · ${p.contacto_cargo}`}</div>}
                  </Link>
                </TableCell>
                <TableCell><Badge variant="outline" className="font-normal" style={nichoMap[p.nicho] ? { borderColor: nichoMap[p.nicho].color, color: nichoMap[p.nicho].color } : undefined}>{nichoMap[p.nicho]?.nombre || NICHO_LABELS[p.nicho] || p.nicho}</Badge></TableCell>
                <TableCell>{p.score_ia !== null && p.score_etiqueta ? <ScoreBadge score={p.score_ia} etiqueta={p.score_etiqueta} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                <TableCell><Badge variant={ESTADO_BADGE_VARIANT[p.estado] || "secondary"}>{ESTADO_LABELS[p.estado] || p.estado}</Badge></TableCell>
                <TableCell>{p.ultimo_canal ? <div className="flex items-center gap-1.5">{p.ultimo_canal === "email" ? <Mail className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" /> : <MessageCircle className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />}<span className="text-xs capitalize">{p.ultimo_canal}</span></div> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                <TableCell><span className="text-xs text-muted-foreground">{formatRelativeDate(p.ultimo_contacto || null)}</span></TableCell>
                <TableCell><Link href={`/prospects/${p.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></Link></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {pagination.page} de {pagination.pages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchProspects(pagination.page - 1)}><ChevronLeft className="h-4 w-4 mr-1" />Anterior</Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchProspects(pagination.page + 1)}>Siguiente<ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      )}
    </div>
  )
}
