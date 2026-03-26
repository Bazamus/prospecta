"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
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
import { NichoSelect } from "@/components/ui/nicho-select"
import { useNichos } from "@/lib/hooks/use-nichos"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Plus,
  Loader2,
  Users,
  Calendar,
  Target,
  Megaphone,
} from "lucide-react"
import type { Campaign } from "@/types"

const NICHO_LABELS: Record<string, string> = {
  climatizacion: "Climatización",
  instalaciones: "Instalaciones",
  energia: "Energía",
  otro: "Otro",
}

const ESTADO_BADGE: Record<string, "success" | "warning" | "info" | "secondary" | "danger"> = {
  borrador: "secondary",
  activa: "success",
  pausada: "warning",
  finalizada: "info",
}

const CANAL_LABELS: Record<string, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  ambos: "Email + WA",
}

interface CampaignRow extends Campaign {
  prospects_count?: number
  template_nombre?: string
}

export default function CampaignsPage() {
  const { nichoMap } = useNichos()
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [templates, setTemplates] = useState<{ id: string; nombre: string }[]>([])

  // Form fields
  const [form, setForm] = useState({
    nombre: "",
    nicho: "climatizacion",
    canal: "email",
    template_id: "",
    score_minimo: "5.0",
    fecha_inicio: "",
    fecha_fin: "",
  })

  async function fetchCampaigns() {
    try {
      const res = await fetch("/api/campaigns")
      if (res.ok) {
        const json = await res.json()
        setCampaigns(json.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/templates")
      if (res.ok) {
        const json = await res.json()
        setTemplates(json.data.map((t: { id: string; nombre: string }) => ({ id: t.id, nombre: t.nombre })))
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchCampaigns()
    fetchTemplates()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          score_minimo: parseFloat(form.score_minimo),
          template_id: form.template_id || null,
          fecha_inicio: form.fecha_inicio || null,
          fecha_fin: form.fecha_fin || null,
        }),
      })
      if (res.ok) {
        setDialogOpen(false)
        setForm({ nombre: "", nicho: "climatizacion", canal: "email", template_id: "", score_minimo: "5.0", fecha_inicio: "", fecha_fin: "" })
        fetchCampaigns()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  async function toggleEstado(campaign: CampaignRow) {
    const nextEstado = campaign.estado === "activa" ? "pausada" : "activa"
    try {
      await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nextEstado }),
      })
      fetchCampaigns()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campañas</h1>
          <p className="text-sm text-muted-foreground">{campaigns.length} campañas</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" />
              Nueva campaña
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear campaña</DialogTitle>
              <DialogDescription>Define los parámetros de la nueva campaña de prospección</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  required
                  placeholder="Climatización Madrid Q1 2026"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nicho</label>
                  <NichoSelect value={form.nicho} onValueChange={(v) => setForm({ ...form, nicho: v })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Canal</label>
                  <Select value={form.canal} onValueChange={(v) => setForm({ ...form, canal: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="ambos">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Score mínimo</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={form.score_minimo}
                    onChange={(e) => setForm({ ...form, score_minimo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plantilla</label>
                  <Select value={form.template_id || "none"} onValueChange={(v) => setForm({ ...form, template_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin plantilla</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha inicio</label>
                  <Input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha fin</label>
                  <Input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={creating} className="bg-emerald-600 hover:bg-emerald-700">
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Crear campaña
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaign list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No hay campañas. Crea la primera para empezar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:border-emerald-500/30 transition-colors">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{campaign.nombre}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {nichoMap[campaign.nicho]?.nombre || campaign.nicho}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {CANAL_LABELS[campaign.canal] || campaign.canal}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant={ESTADO_BADGE[campaign.estado] || "secondary"} className="ml-2 flex-shrink-0">
                    {campaign.estado}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{campaign.prospects_count ?? 0} prospectos</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Target className="h-3.5 w-3.5" />
                    <span>Score min. {campaign.score_minimo}</span>
                  </div>
                  {campaign.fecha_inicio && (
                    <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(campaign.fecha_inicio).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                        {campaign.fecha_fin && ` — ${new Date(campaign.fecha_fin).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`}
                      </span>
                    </div>
                  )}
                </div>

                {campaign.template_nombre && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    Plantilla: {campaign.template_nombre}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => toggleEstado(campaign)}
                  >
                    {campaign.estado === "activa" ? "Pausar" : "Activar"}
                  </Button>
                  <Link href={`/campaigns/${campaign.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Ver detalle
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
