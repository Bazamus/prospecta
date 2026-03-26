"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScoreBadge } from "@/components/prospects/ScoreCard"
import { ImportModal } from "@/components/prospects/ImportModal"
import {
  Search,
  MoreHorizontal,
  Mail,
  MessageCircle,
  Eye,
  ArrowUpDown,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import type { Prospect, ScoreEtiqueta } from "@/types"

const NICHO_LABELS: Record<string, string> = {
  climatizacion: "Climatización",
  instalaciones: "Instalaciones",
  energia: "Energía",
  otro: "Otro",
}

const ESTADO_LABELS: Record<string, string> = {
  sin_contactar: "Sin contactar",
  contactado: "Contactado",
  respondio: "Respondió",
  interesado: "Interesado",
  demo_enviada: "Demo enviada",
  cerrado: "Cerrado",
  descartado: "Descartado",
}

const ESTADO_BADGE_VARIANT: Record<string, "success" | "warning" | "info" | "danger" | "default" | "secondary"> = {
  sin_contactar: "secondary",
  contactado: "info",
  respondio: "warning",
  interesado: "success",
  demo_enviada: "success",
  cerrado: "default",
  descartado: "danger",
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Hoy"
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `Hace ${diffDays}d`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem.`
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
}

interface ProspectRow extends Prospect {
  ultimo_canal?: string | null
  ultimo_contacto?: string | null
}

interface ApiResponse {
  data: ProspectRow[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export default function ProspectsPage() {
  const [data, setData] = useState<ProspectRow[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [nichoFilter, setNichoFilter] = useState("all")
  const [estadoFilter, setEstadoFilter] = useState("all")
  const [scoreFilter, setScoreFilter] = useState("all")
  const [sortBy, setSortBy] = useState("score_ia")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

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
      const minScores: Record<string, string> = { Alta: "8", Media: "5", Baja: "3", Descartar: "0" }
      params.set("score_min", minScores[scoreFilter] || "0")
    }
    if (search) params.set("search", search)

    try {
      const res = await fetch(`/api/prospects?${params}`)
      if (res.ok) {
        const json: ApiResponse = await res.json()
        setData(json.data)
        setPagination(json.pagination)
      }
    } catch (e) {
      console.error("Error fetching prospects:", e)
    } finally {
      setLoading(false)
    }
  }, [nichoFilter, estadoFilter, scoreFilter, search, sortBy, sortDir])

  useEffect(() => {
    fetchProspects(1)
  }, [fetchProspects])

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortDir(field === "nombre_empresa" ? "asc" : "desc")
    }
  }

  const hasFilters = nichoFilter !== "all" || estadoFilter !== "all" || scoreFilter !== "all" || search !== ""

  function clearFilters() {
    setSearch("")
    setNichoFilter("all")
    setEstadoFilter("all")
    setScoreFilter("all")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prospectos</h1>
          <p className="text-sm text-muted-foreground">
            {pagination.total} empresas en total
          </p>
        </div>
        <ImportModal onImportComplete={() => fetchProspects(1)} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa, email, contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchProspects(1)}
            className="pl-9"
          />
        </div>

        <Select value={nichoFilter} onValueChange={(v) => { setNichoFilter(v) }}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Nicho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los nichos</SelectItem>
            <SelectItem value="climatizacion">Climatización</SelectItem>
            <SelectItem value="instalaciones">Instalaciones</SelectItem>
            <SelectItem value="energia">Energía</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>

        <Select value={estadoFilter} onValueChange={(v) => { setEstadoFilter(v) }}>
          <SelectTrigger className="w-[170px]">
            <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="sin_contactar">Sin contactar</SelectItem>
            <SelectItem value="contactado">Contactado</SelectItem>
            <SelectItem value="respondio">Respondió</SelectItem>
            <SelectItem value="interesado">Interesado</SelectItem>
            <SelectItem value="demo_enviada">Demo enviada</SelectItem>
            <SelectItem value="cerrado">Cerrado</SelectItem>
            <SelectItem value="descartado">Descartado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={scoreFilter} onValueChange={(v) => { setScoreFilter(v) }}>
          <SelectTrigger className="w-[150px]">
            <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los scores</SelectItem>
            <SelectItem value="Alta">Alta (8+)</SelectItem>
            <SelectItem value="Media">Media (5+)</SelectItem>
            <SelectItem value="Baja">Baja (3+)</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("nombre_empresa")}>
                <div className="flex items-center gap-1">
                  Empresa
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead>Nicho</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("score_ia")}>
                <div className="flex items-center gap-1">
                  Score IA
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("updated_at")}>
                <div className="flex items-center gap-1">
                  Último contacto
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                  Cargando prospectos...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {hasFilters
                    ? "No se encontraron prospectos con los filtros actuales."
                    : "No hay prospectos. Importa un archivo Excel para empezar."}
                </TableCell>
              </TableRow>
            ) : (
              data.map((prospect) => (
                <TableRow key={prospect.id}>
                  <TableCell>
                    <Link href={`/prospects/${prospect.id}`} className="block hover:underline">
                      <div className="font-medium">{prospect.nombre_empresa}</div>
                      {prospect.contacto_nombre && (
                        <div className="text-xs text-muted-foreground">
                          {prospect.contacto_nombre}
                          {prospect.contacto_cargo && ` · ${prospect.contacto_cargo}`}
                        </div>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {NICHO_LABELS[prospect.nicho] || prospect.nicho}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {prospect.score_ia !== null && prospect.score_etiqueta ? (
                      <ScoreBadge score={prospect.score_ia} etiqueta={prospect.score_etiqueta} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin score</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_BADGE_VARIANT[prospect.estado] || "secondary"}>
                      {ESTADO_LABELS[prospect.estado] || prospect.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {prospect.ultimo_canal ? (
                      <div className="flex items-center gap-1.5">
                        {prospect.ultimo_canal === "email" ? (
                          <Mail className="h-3.5 w-3.5 text-blue-400" />
                        ) : (
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                        <span className="text-xs capitalize">{prospect.ultimo_canal}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeDate(prospect.ultimo_contacto || null)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/prospects/${prospect.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchProspects(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchProspects(pagination.page + 1)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
