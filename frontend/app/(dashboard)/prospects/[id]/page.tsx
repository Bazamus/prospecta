"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import { ScoreCard } from "@/components/prospects/ScoreCard"
import {
  ArrowLeft,
  Save,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Globe,
  MapPin,
  Building2,
  Star,
  Zap,
  Reply,
  StickyNote,
  ArrowRightLeft,
  ExternalLink,
} from "lucide-react"
import type { Prospect, Message, ActivityLog } from "@/types"

const ESTADO_OPTIONS = [
  { value: "sin_contactar", label: "Sin contactar" },
  { value: "contactado", label: "Contactado" },
  { value: "respondio", label: "Respondió" },
  { value: "interesado", label: "Interesado" },
  { value: "demo_enviada", label: "Demo enviada" },
  { value: "cerrado", label: "Cerrado" },
  { value: "descartado", label: "Descartado" },
]

const NICHO_LABELS: Record<string, string> = {
  climatizacion: "Climatización",
  instalaciones: "Instalaciones",
  energia: "Energía",
  otro: "Otro",
}

const ACTIVITY_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  scoring: { icon: <Zap className="h-3.5 w-3.5" />, color: "bg-violet-500/15 text-violet-500" },
  email: { icon: <Mail className="h-3.5 w-3.5" />, color: "bg-blue-500/15 text-blue-700 dark:text-blue-500" },
  whatsapp: { icon: <MessageCircle className="h-3.5 w-3.5" />, color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-500" },
  respuesta: { icon: <Reply className="h-3.5 w-3.5" />, color: "bg-amber-500/15 text-amber-500" },
  nota: { icon: <StickyNote className="h-3.5 w-3.5" />, color: "bg-slate-500/15 text-slate-400" },
  estado: { icon: <ArrowRightLeft className="h-3.5 w-3.5" />, color: "bg-indigo-500/15 text-indigo-500" },
}

const MSG_ESTADO_BADGE: Record<string, "success" | "info" | "warning" | "danger" | "secondary"> = {
  pendiente: "secondary",
  enviado: "info",
  entregado: "success",
  abierto: "success",
  error: "danger",
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface Props {
  params: { id: string }
}

export default function ProspectDetailPage({ params }: Props) {
  const router = useRouter()
  const [prospect, setProspect] = useState<Prospect | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [estado, setEstado] = useState("")
  const [notas, setNotas] = useState("")
  const [notasDirty, setNotasDirty] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/prospects/${params.id}`)
        if (!res.ok) { setLoading(false); return }
        const json = await res.json()
        setProspect(json.prospect)
        setMessages(json.messages || [])
        setActivity(json.activity || [])
        setEstado(json.prospect.estado)
        setNotas(json.prospect.notas || "")
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  async function handleSaveEstado(newEstado: string) {
    setEstado(newEstado)
    setSaving(true)
    try {
      await fetch(`/api/prospects/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: newEstado }),
      })
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveNotas() {
    setSaving(true)
    try {
      await fetch(`/api/prospects/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas }),
      })
      setNotasDirty(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!prospect) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Prospecto no encontrado.</p>
        <Link href="/prospects">
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/prospects">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{prospect.nombre_empresa}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{NICHO_LABELS[prospect.nicho] || prospect.nicho}</Badge>
              {prospect.contacto_nombre && (
                <span className="text-sm text-muted-foreground">
                  {prospect.contacto_nombre}{prospect.contacto_cargo && ` · ${prospect.contacto_cargo}`}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link href={`/messages?prospect_id=${prospect.id}`}>
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Mail className="h-4 w-4" />
            Generar mensaje
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna izquierda: Score + Datos + Estado */}
        <div className="lg:col-span-1 space-y-6">
          {/* Score Card */}
          {prospect.score_ia !== null && prospect.score_etiqueta && (
            <ScoreCard
              score={prospect.score_ia}
              etiqueta={prospect.score_etiqueta}
              justificacion={prospect.score_justificacion || ""}
            />
          )}

          {/* Datos de contacto */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Datos de contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {prospect.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a href={`mailto:${prospect.email}`} className="hover:underline truncate">{prospect.email}</a>
                </div>
              )}
              {prospect.telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{prospect.telefono}</span>
                </div>
              )}
              {prospect.web && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a href={prospect.web.startsWith("http") ? prospect.web : `https://${prospect.web}`} target="_blank" rel="noopener" className="hover:underline truncate flex items-center gap-1">
                    {prospect.web} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {prospect.direccion && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{prospect.direccion}</span>
                </div>
              )}
              {prospect.valoracion_google !== null && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <span>{prospect.valoracion_google} / 5 ({prospect.num_resenas || 0} reseñas)</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estado */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={estado} onValueChange={handleSaveEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notas</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  placeholder="Añade notas sobre este prospecto..."
                  value={notas}
                  onChange={(e) => { setNotas(e.target.value); setNotasDirty(true) }}
                />
                {notasDirty && (
                  <Button size="sm" onClick={handleSaveNotas} disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Guardar notas
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: Mensajes + Actividad */}
        <div className="lg:col-span-2 space-y-6">
          {/* Historial de mensajes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mensajes enviados ({messages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No se han enviado mensajes a este prospecto.
                </p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {msg.canal === "email" ? (
                            <Mail className="h-4 w-4 text-blue-400" />
                          ) : (
                            <MessageCircle className="h-4 w-4 text-emerald-400" />
                          )}
                          <span className="text-sm font-medium capitalize">{msg.canal}</span>
                          {msg.asunto && (
                            <span className="text-sm text-muted-foreground">— {msg.asunto}</span>
                          )}
                        </div>
                        <Badge variant={MSG_ESTADO_BADGE[msg.estado_envio] || "secondary"} className="text-[10px]">
                          {msg.estado_envio}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{msg.contenido}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        {msg.fecha_envio && <span>Enviado: {formatDate(msg.fecha_envio)}</span>}
                        {msg.fecha_respuesta && <span>Respuesta: {formatDate(msg.fecha_respuesta)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial de actividad */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Sin actividad registrada.
                </p>
              ) : (
                <div className="space-y-1">
                  {activity.map((item) => {
                    const cfg = ACTIVITY_ICONS[item.tipo] || ACTIVITY_ICONS.nota
                    return (
                      <div key={item.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-secondary/50">
                        <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${cfg.color}`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">{item.descripcion}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
