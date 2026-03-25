"use client"

import { useState, useMemo } from "react"
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
import {
  MOCK_PROSPECTS,
  MOCK_MESSAGES,
  NICHO_LABELS,
  ESTADO_LABELS,
} from "@/lib/mock-data"
import {
  Search,
  Upload,
  MoreHorizontal,
  Mail,
  MessageCircle,
  Eye,
  ArrowUpDown,
  Filter,
  X,
} from "lucide-react"
import type { Nicho, ScoreEtiqueta, ProspectEstado } from "@/types"

const ESTADO_BADGE_VARIANT: Record<string, "success" | "warning" | "info" | "danger" | "default" | "secondary" | "outline"> = {
  sin_contactar: "secondary",
  contactado: "info",
  respondio: "warning",
  interesado: "success",
  demo_enviada: "success",
  cerrado: "default",
  descartado: "danger",
}

function getLastContact(prospectId: string): string | null {
  const msgs = MOCK_MESSAGES.filter((m) => m.prospect_id === prospectId)
    .sort((a, b) => new Date(b.fecha_envio || b.created_at).getTime() - new Date(a.fecha_envio || a.created_at).getTime())
  if (msgs.length === 0) return null
  return msgs[0].fecha_envio || msgs[0].created_at
}

function getLastChannel(prospectId: string): "email" | "whatsapp" | null {
  const msgs = MOCK_MESSAGES.filter((m) => m.prospect_id === prospectId)
    .sort((a, b) => new Date(b.fecha_envio || b.created_at).getTime() - new Date(a.fecha_envio || a.created_at).getTime())
  if (msgs.length === 0) return null
  return msgs[0].canal
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date("2026-03-25T12:00:00Z")
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Hoy"
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem.`
  return `Hace ${Math.floor(diffDays / 30)} mes.`
}

export default function ProspectsPage() {
  const [search, setSearch] = useState("")
  const [nichoFilter, setNichoFilter] = useState<string>("all")
  const [estadoFilter, setEstadoFilter] = useState<string>("all")
  const [scoreFilter, setScoreFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"score" | "empresa" | "fecha">("score")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const filtered = useMemo(() => {
    let result = [...MOCK_PROSPECTS]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.nombre_empresa.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.contacto_nombre?.toLowerCase().includes(q)
      )
    }
    if (nichoFilter !== "all") result = result.filter((p) => p.nicho === nichoFilter)
    if (estadoFilter !== "all") result = result.filter((p) => p.estado === estadoFilter)
    if (scoreFilter !== "all") result = result.filter((p) => p.score_etiqueta === scoreFilter)

    result.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortBy) {
        case "score":
          return ((a.score_ia || 0) - (b.score_ia || 0)) * dir
        case "empresa":
          return a.nombre_empresa.localeCompare(b.nombre_empresa) * dir
        case "fecha":
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
        default:
          return 0
      }
    })

    return result
  }, [search, nichoFilter, estadoFilter, scoreFilter, sortBy, sortDir])

  const hasFilters = nichoFilter !== "all" || estadoFilter !== "all" || scoreFilter !== "all" || search !== ""

  function toggleSort(field: "score" | "empresa" | "fecha") {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortDir(field === "empresa" ? "asc" : "desc")
    }
  }

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
            {filtered.length} de {MOCK_PROSPECTS.length} empresas
          </p>
        </div>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Upload className="h-4 w-4" />
          Importar Excel
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa, email, contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={nichoFilter} onValueChange={setNichoFilter}>
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

        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
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

        <Select value={scoreFilter} onValueChange={setScoreFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los scores</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Media">Media</SelectItem>
            <SelectItem value="Baja">Baja</SelectItem>
            <SelectItem value="Descartar">Descartar</SelectItem>
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
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("empresa")}
              >
                <div className="flex items-center gap-1">
                  Empresa
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead>Nicho</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("score")}
              >
                <div className="flex items-center gap-1">
                  Score IA
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("fecha")}
              >
                <div className="flex items-center gap-1">
                  Último contacto
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No se encontraron prospectos con los filtros actuales.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((prospect) => {
                const lastContact = getLastContact(prospect.id)
                const lastChannel = getLastChannel(prospect.id)

                return (
                  <TableRow key={prospect.id}>
                    <TableCell>
                      <Link
                        href={`/prospects/${prospect.id}`}
                        className="block hover:underline"
                      >
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
                        {NICHO_LABELS[prospect.nicho]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {prospect.score_ia !== null && prospect.score_etiqueta ? (
                        <ScoreBadge
                          score={prospect.score_ia}
                          etiqueta={prospect.score_etiqueta}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin score</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ESTADO_BADGE_VARIANT[prospect.estado] || "secondary"}>
                        {ESTADO_LABELS[prospect.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lastChannel ? (
                        <div className="flex items-center gap-1.5">
                          {lastChannel === "email" ? (
                            <Mail className="h-3.5 w-3.5 text-blue-400" />
                          ) : (
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                          <span className="text-xs capitalize">{lastChannel}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lastContact ? (
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeDate(lastContact)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/prospects/${prospect.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
