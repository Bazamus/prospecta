"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ScoreBadge } from "@/components/prospects/ScoreCard"
import { ProspectSelectorModal } from "@/components/campaigns/ProspectSelectorModal"
import { useNichos } from "@/lib/hooks/use-nichos"
import {
  ArrowLeft, Loader2, Pencil, Trash2, Play, Pause, UserPlus, Sparkles,
  Users, MessageCircle, Star, TrendingUp, Mail, X, Eye,
} from "lucide-react"
import type { Campaign, Prospect } from "@/types"

const ESTADO_BADGE: Record<string, "success" | "warning" | "info" | "secondary"> = {
  borrador: "secondary", activa: "success", pausada: "warning", finalizada: "info",
}
const CANAL_LABELS: Record<string, string> = { email: "Email", whatsapp: "WhatsApp", ambos: "Email + WA" }
const P_ESTADO_LABELS: Record<string, string> = { sin_contactar: "Sin contactar", contactado: "Contactado", respondio: "Respondió", interesado: "Interesado", demo_enviada: "Demo enviada", cerrado: "Cerrado", descartado: "Descartado" }
const P_ESTADO_BADGE: Record<string, "success" | "warning" | "info" | "danger" | "secondary"> = { sin_contactar: "secondary", contactado: "info", respondio: "warning", interesado: "success", demo_enviada: "success", cerrado: "info", descartado: "danger" }

function formatDate(d: string | null) { return d ? new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "—" }

interface CampaignDetail extends Campaign {
  template_nombre?: string
  template_instrucciones?: string
}
interface ProspectRow extends Prospect {
  ultimo_contacto?: string | null
  ultimo_canal?: string | null
}

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { nichoMap } = useNichos()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [prospects, setProspects] = useState<ProspectRow[]>([])
  const [stats, setStats] = useState({ total: 0, contactados: 0, respondieron: 0, interesados: 0, sin_contactar: 0, tasa_respuesta: 0 })
  const [loading, setLoading] = useState(true)

  const [selectorOpen, setSelectorOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<string | null>(null)

  async function load() {
    try {
      const res = await fetch(`/api/campaigns/${params.id}`)
      if (!res.ok) { setLoading(false); return }
      const json = await res.json()
      setCampaign(json.campaign); setProspects(json.prospects || []); setStats(json.stats)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [params.id])

  async function toggleEstado() {
    if (!campaign) return
    const next = campaign.estado === "activa" ? "pausada" : "activa"
    await fetch(`/api/campaigns/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: next }) })
    load()
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/campaigns/${params.id}`, { method: "DELETE" })
    router.push("/campaigns")
  }

  async function removeProspect(pid: string) {
    await fetch(`/api/campaigns/${params.id}/prospects/${pid}`, { method: "DELETE" })
    load()
  }

  async function handleGenerateBatch() {
    setGenerating(true); setGenResult(null)
    try {
      const res = await fetch(`/api/campaigns/${params.id}/generate-batch`, { method: "POST" })
      const data = await res.json()
      if (res.ok) setGenResult(`${data.generated} mensajes generados`)
      else setGenResult(data.error || "Error")
    } catch { setGenResult("Error de conexión") }
    finally { setGenerating(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!campaign) return <div className="space-y-4"><p className="text-muted-foreground">Campaña no encontrada.</p><Link href="/campaigns"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button></Link></div>

  const nichoInfo = nichoMap[campaign.nicho]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/campaigns"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{campaign.nombre}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" style={nichoInfo ? { borderColor: nichoInfo.color, color: nichoInfo.color } : undefined}>{nichoInfo?.nombre || campaign.nicho}</Badge>
              <Badge variant={ESTADO_BADGE[campaign.estado]}>{campaign.estado}</Badge>
              <Badge variant="outline">{CANAL_LABELS[campaign.canal]}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={toggleEstado} className="gap-1.5">
            {campaign.estado === "activa" ? <><Pause className="h-3.5 w-3.5" />Pausar</> : <><Play className="h-3.5 w-3.5" />Activar</>}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-red-600 dark:text-red-400" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />Eliminar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Left (35%) */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Resumen</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Score mínimo</span><span className="font-medium">{campaign.score_minimo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fechas</span><span>{formatDate(campaign.fecha_inicio)} — {formatDate(campaign.fecha_fin)}</span></div>
              {campaign.template_nombre && <div className="flex justify-between"><span className="text-muted-foreground">Plantilla</span><span className="truncate ml-2">{campaign.template_nombre}</span></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Estadísticas</CardTitle></CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { label: "Total prospectos", value: stats.total, icon: <Users className="h-4 w-4 text-blue-500" /> },
                { label: "Contactados", value: stats.contactados, icon: <Mail className="h-4 w-4 text-indigo-500" /> },
                { label: "Respondieron", value: stats.respondieron, icon: <MessageCircle className="h-4 w-4 text-amber-500" /> },
                { label: "Interesados", value: stats.interesados, icon: <Star className="h-4 w-4 text-emerald-500" /> },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">{s.icon}<span>{s.label}</span></div>
                  <span className="text-sm font-semibold tabular-nums">{s.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4 text-emerald-500" /><span>Tasa respuesta</span></div>
                <span className="text-sm font-semibold">{stats.tasa_respuesta}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right (65%) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Prospectos ({stats.total})</h2>
            <div className="flex gap-2">
              {stats.sin_contactar > 0 && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerateBatch} disabled={generating}>
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Generar mensajes ({stats.sin_contactar})
                </Button>
              )}
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => setSelectorOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" />Añadir prospectos
              </Button>
            </div>
          </div>

          {genResult && (
            <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${genResult.includes("Error") ? "border-red-500/30 bg-red-500/10 text-red-600" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"}`}>
              {genResult}
              <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={() => setGenResult(null)}><X className="h-3 w-3" /></Button>
            </div>
          )}

          {/* Prospects table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Empresa</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último contacto</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Sin prospectos. Añade prospectos a esta campaña.</TableCell></TableRow>
                ) : prospects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/prospects/${p.id}`} className="hover:underline">
                        <span className="font-medium text-sm">{p.nombre_empresa}</span>
                        {p.contacto_nombre && <span className="text-xs text-muted-foreground ml-1">· {p.contacto_nombre}</span>}
                      </Link>
                    </TableCell>
                    <TableCell>{p.score_ia !== null && p.score_etiqueta ? <ScoreBadge score={p.score_ia} etiqueta={p.score_etiqueta} /> : "—"}</TableCell>
                    <TableCell><Badge variant={P_ESTADO_BADGE[p.estado]}>{P_ESTADO_LABELS[p.estado]}</Badge></TableCell>
                    <TableCell>
                      {p.ultimo_contacto ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {p.ultimo_canal === "email" ? <Mail className="h-3 w-3 text-blue-500" /> : p.ultimo_canal === "whatsapp" ? <MessageCircle className="h-3 w-3 text-emerald-500" /> : null}
                          {formatDate(p.ultimo_contacto)}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link href={`/prospects/${p.id}`}><Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button></Link>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeProspect(p.id)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Selector modal */}
      <ProspectSelectorModal
        campaignId={params.id}
        scoreMinimo={typeof campaign.score_minimo === "string" ? parseFloat(campaign.score_minimo) : campaign.score_minimo}
        excludeIds={prospects.map((p) => p.id)}
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onAdded={load}
      />

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar campaña</DialogTitle><DialogDescription>Se eliminará "{campaign.nombre}" y se desasignarán todos sus prospectos. No se puede deshacer.</DialogDescription></DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
