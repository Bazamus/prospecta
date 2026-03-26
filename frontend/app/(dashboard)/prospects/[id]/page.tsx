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
import { ScrollArea } from "@/components/ui/scroll-area"
import { ScoreCard } from "@/components/prospects/ScoreCard"
import { NichoSelect } from "@/components/ui/nicho-select"
import { useNichos } from "@/lib/hooks/use-nichos"
import {
  ArrowLeft, Save, Loader2, Mail, MessageCircle, Phone, Globe,
  MapPin, Star, Zap, Reply, StickyNote, ArrowRightLeft, ExternalLink,
  Pencil, Trash2, Clock, Tag, ImageIcon,
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

const ACTIVITY_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  scoring: { icon: <Zap className="h-3.5 w-3.5" />, color: "bg-violet-500/15 text-violet-700 dark:text-violet-500" },
  email: { icon: <Mail className="h-3.5 w-3.5" />, color: "bg-blue-500/15 text-blue-700 dark:text-blue-500" },
  whatsapp: { icon: <MessageCircle className="h-3.5 w-3.5" />, color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-500" },
  respuesta: { icon: <Reply className="h-3.5 w-3.5" />, color: "bg-amber-500/15 text-amber-700 dark:text-amber-500" },
  nota: { icon: <StickyNote className="h-3.5 w-3.5" />, color: "bg-slate-500/15 text-slate-600 dark:text-slate-400" },
  estado: { icon: <ArrowRightLeft className="h-3.5 w-3.5" />, color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-500" },
}
const MSG_BADGE: Record<string, "success" | "info" | "warning" | "danger" | "secondary"> = {
  pendiente: "secondary", enviado: "info", entregado: "success", abierto: "success", error: "danger",
}

function formatDate(d: string) { return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) }

// Parsea horario "viernes, De 9:00 a 14:00; sábado, Cerrado; ..." en array [{dia, horario}]
function parseHorario(raw: string): { dia: string; horario: string }[] {
  if (!raw) return []
  return raw.split(";").map((block) => {
    const trimmed = block.trim()
    const commaIdx = trimmed.indexOf(",")
    if (commaIdx === -1) return { dia: trimmed, horario: "" }
    const dia = trimmed.slice(0, commaIdx).trim()
    const horario = trimmed.slice(commaIdx + 1).trim().replace(/\s*,\s*/g, " · ").replace(/De /g, "").replace(/El horario podría cambiar/i, "").trim()
    return { dia, horario }
  }).filter((h) => h.dia)
}

// Parsea reseñas del formato "★5: texto | ★4: texto" en array
function parseResenas(raw: string): { stars: number; text: string }[] {
  if (!raw) return []
  return raw.split(" | ").map((r) => {
    const match = r.match(/★(\d):?\s*(.*)/)
    if (!match) return { stars: 0, text: r }
    return { stars: parseInt(match[1]), text: match[2] }
  }).filter((r) => r.text)
}

function StarRating({ stars }: { stars: number }) {
  return <span className="text-amber-500 text-xs">{"★".repeat(stars)}{"☆".repeat(Math.max(0, 5 - stars))}</span>
}

export default function ProspectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { nichoMap } = useNichos()
  const [prospect, setProspect] = useState<Prospect | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [estado, setEstado] = useState("")
  const [notas, setNotas] = useState("")
  const [notasDirty, setNotasDirty] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function load() {
    try {
      const res = await fetch(`/api/prospects/${params.id}`)
      if (!res.ok) { setLoading(false); return }
      const json = await res.json()
      setProspect(json.prospect); setMessages(json.messages || []); setActivity(json.activity || [])
      setEstado(json.prospect.estado); setNotas(json.prospect.notas || "")
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [params.id])

  async function saveEstado(v: string) { setEstado(v); await fetch(`/api/prospects/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: v }) }) }
  async function saveNotas() { setSaving(true); await fetch(`/api/prospects/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notas }) }); setNotasDirty(false); setSaving(false) }

  function openEdit() {
    if (!prospect) return
    setEditForm({ nombre_empresa: prospect.nombre_empresa, nicho: prospect.nicho, email: prospect.email || "", telefono: prospect.telefono || "", direccion: prospect.direccion || "", contacto_nombre: prospect.contacto_nombre || "", contacto_cargo: prospect.contacto_cargo || "", web: prospect.web || "", valoracion_google: prospect.valoracion_google ?? "", num_resenas: prospect.num_resenas ?? "", score_ia: prospect.score_ia ?? "", score_etiqueta: prospect.score_etiqueta || "", score_justificacion: prospect.score_justificacion || "" })
    setEditOpen(true)
  }
  async function handleEditSave() {
    setEditSaving(true)
    const body = { ...editForm, valoracion_google: editForm.valoracion_google === "" ? null : Number(editForm.valoracion_google), num_resenas: editForm.num_resenas === "" ? null : Number(editForm.num_resenas), score_ia: editForm.score_ia === "" ? null : Number(editForm.score_ia), score_etiqueta: editForm.score_etiqueta || null }
    const res = await fetch(`/api/prospects/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (res.ok) { setEditOpen(false); setLoading(true); load() }
    setEditSaving(false)
  }
  async function handleDelete() { setDeleteLoading(true); await fetch(`/api/prospects/${params.id}`, { method: "DELETE" }); router.push("/prospects") }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!prospect) return <div className="space-y-4"><p className="text-muted-foreground">Prospecto no encontrado.</p><Link href="/prospects"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button></Link></div>

  const nichoInfo = nichoMap[prospect.nicho]
  const hasGoogleData = prospect.categoria_google || prospect.horario || prospect.url_maps || prospect.imagen_url
  const horarioRows = parseHorario(prospect.horario || "")
  const resenas = parseResenas(prospect.resenas_texto || "")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/prospects"><Button variant="ghost" size="icon" className="flex-shrink-0"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{prospect.nombre_empresa}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" style={nichoInfo ? { borderColor: nichoInfo.color, color: nichoInfo.color } : undefined}>
                {nichoInfo?.nombre || prospect.nicho}
              </Badge>
              {prospect.contacto_nombre && <span className="text-sm text-muted-foreground truncate">{prospect.contacto_nombre}{prospect.contacto_cargo && ` · ${prospect.contacto_cargo}`}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5"><Pencil className="h-3.5 w-3.5" />Editar</Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-red-600 dark:text-red-400" onClick={() => setDeleteOpen(true)}><Trash2 className="h-3.5 w-3.5" />Eliminar</Button>
          <Link href={`/messages?prospect_id=${prospect.id}`}><Button className="gap-2 bg-emerald-600 hover:bg-emerald-700"><Mail className="h-4 w-4" />Generar mensaje</Button></Link>
        </div>
      </div>

      {/* Two columns: 40% / 60% */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column (40%) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Score Card */}
          {prospect.score_ia !== null && prospect.score_etiqueta && (
            <ScoreCard score={prospect.score_ia} etiqueta={prospect.score_etiqueta} justificacion={prospect.score_justificacion || ""} />
          )}

          {/* Contact data */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Datos de contacto</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {prospect.email && <div className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" /><a href={`mailto:${prospect.email}`} className="hover:underline truncate">{prospect.email}</a></div>}
              {prospect.telefono && <div className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" /><span>{prospect.telefono}</span></div>}
              {prospect.web && <div className="flex items-center gap-2.5"><Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" /><a href={prospect.web.startsWith("http") ? prospect.web : `https://${prospect.web}`} target="_blank" rel="noopener" className="hover:underline truncate flex items-center gap-1">{prospect.web}<ExternalLink className="h-3 w-3" /></a></div>}
              {prospect.direccion && <div className="flex items-center gap-2.5"><MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" /><span className="text-muted-foreground text-xs">{prospect.direccion}</span></div>}
              {prospect.valoracion_google !== null && <div className="flex items-center gap-2.5"><Star className="h-4 w-4 text-amber-500 flex-shrink-0" /><span>{typeof prospect.valoracion_google === "string" ? parseFloat(prospect.valoracion_google).toFixed(1) : prospect.valoracion_google} / 5 ({prospect.num_resenas || 0} reseñas)</span></div>}
            </CardContent>
          </Card>

          {/* Estado + Notas */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Estado y notas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={estado} onValueChange={saveEstado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ESTADO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" placeholder="Añade notas..." value={notas} onChange={(e) => { setNotas(e.target.value); setNotasDirty(true) }} />
              {notasDirty && <Button size="sm" onClick={saveNotas} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Guardar</Button>}
            </CardContent>
          </Card>
        </div>

        {/* Right column (60%) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Google Maps card */}
          {hasGoogleData && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Ficha Google Maps</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {prospect.imagen_url && (
                  <div className="rounded-lg overflow-hidden border -mx-1"><img src={prospect.imagen_url} alt={prospect.nombre_empresa} className="w-full h-40 object-cover" /></div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {prospect.categoria_google && <Badge variant="outline" className="gap-1"><Tag className="h-3 w-3" />{prospect.categoria_google}</Badge>}
                  {prospect.ficha_reclamada !== null && <Badge variant={prospect.ficha_reclamada ? "success" : "secondary"} className="text-[10px]">{prospect.ficha_reclamada ? "Ficha reclamada" : "No reclamada"}</Badge>}
                  {prospect.url_maps && <a href={prospect.url_maps} target="_blank" rel="noopener" className="text-xs hover:underline flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />Ver en Maps<ExternalLink className="h-3 w-3" /></a>}
                </div>
                {/* Horario table */}
                {horarioRows.length > 0 && (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b bg-muted/50"><th className="text-left px-3 py-1.5 font-medium w-[120px]">Día</th><th className="text-left px-3 py-1.5 font-medium">Horario</th></tr></thead>
                      <tbody>
                        {horarioRows.map((h, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-3 py-1.5 capitalize font-medium">{h.dia}</td>
                            <td className="px-3 py-1.5">
                              {h.horario.toLowerCase().includes("cerrado")
                                ? <Badge variant="secondary" className="text-[10px]">Cerrado</Badge>
                                : <span className="text-muted-foreground">{h.horario || "—"}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reseñas */}
          {resenas.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Reseñas ({resenas.length})</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[250px]">
                  <div className="space-y-3 pr-2">
                    {resenas.slice(0, 10).map((r, i) => (
                      <div key={i} className="space-y-1 pb-3 border-b last:border-0 last:pb-0">
                        <StarRating stars={r.stars} />
                        <p className="text-xs text-muted-foreground leading-relaxed">{r.text}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Mensajes enviados ({messages.length})</CardTitle></CardHeader>
            <CardContent>
              {messages.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">Sin mensajes.</p> : (
                <div className="space-y-2.5">{messages.map((msg) => (
                  <div key={msg.id} className="rounded-lg border p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {msg.canal === "email" ? <Mail className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" /> : <MessageCircle className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />}
                        <span className="text-xs font-medium capitalize">{msg.canal}</span>
                        {msg.asunto && <span className="text-xs text-muted-foreground">— {msg.asunto}</span>}
                      </div>
                      <Badge variant={MSG_BADGE[msg.estado_envio] || "secondary"} className="text-[10px]">{msg.estado_envio}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{msg.contenido}</p>
                    <div className="flex gap-3 text-[11px] text-muted-foreground">{msg.fecha_envio && <span>{formatDate(msg.fecha_envio)}</span>}</div>
                  </div>
                ))}</div>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Actividad</CardTitle></CardHeader>
            <CardContent>
              {activity.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">Sin actividad.</p> : (
                <div className="space-y-0.5">{activity.map((item) => {
                  const cfg = ACTIVITY_ICONS[item.tipo] || ACTIVITY_ICONS.nota
                  return (
                    <div key={item.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-secondary/50">
                      <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${cfg.color}`}>{cfg.icon}</div>
                      <div className="flex-1 min-w-0"><p className="text-xs leading-snug">{item.descripcion}</p><p className="text-[10px] text-muted-foreground">{formatDate(item.created_at)}</p></div>
                    </div>
                  )
                })}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar prospecto</DialogTitle><DialogDescription>Modifica los datos de {prospect.nombre_empresa}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-xs font-medium">Nombre empresa</label><Input value={editForm.nombre_empresa || ""} onChange={(e) => setEditForm({ ...editForm, nombre_empresa: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Nicho</label><NichoSelect value={editForm.nicho || ""} onValueChange={(v) => setEditForm({ ...editForm, nicho: v })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-xs font-medium">Email</label><Input value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Teléfono</label><Input value={editForm.telefono || ""} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><label className="text-xs font-medium">Dirección</label><Input value={editForm.direccion || ""} onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-xs font-medium">Contacto nombre</label><Input value={editForm.contacto_nombre || ""} onChange={(e) => setEditForm({ ...editForm, contacto_nombre: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Contacto cargo</label><Input value={editForm.contacto_cargo || ""} onChange={(e) => setEditForm({ ...editForm, contacto_cargo: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><label className="text-xs font-medium">Web</label><Input value={editForm.web || ""} onChange={(e) => setEditForm({ ...editForm, web: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><label className="text-xs font-medium">Valoración Google</label><Input type="number" step="0.1" min="0" max="5" value={editForm.valoracion_google ?? ""} onChange={(e) => setEditForm({ ...editForm, valoracion_google: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Nº reseñas</label><Input type="number" min="0" value={editForm.num_resenas ?? ""} onChange={(e) => setEditForm({ ...editForm, num_resenas: e.target.value })} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Score IA</label><Input type="number" step="0.1" min="0" max="10" value={editForm.score_ia ?? ""} onChange={(e) => setEditForm({ ...editForm, score_ia: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><label className="text-xs font-medium">Etiqueta score</label>
              <Select value={editForm.score_etiqueta || "none"} onValueChange={(v) => setEditForm({ ...editForm, score_etiqueta: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Sin etiqueta</SelectItem><SelectItem value="Alta">Alta</SelectItem><SelectItem value="Media">Media</SelectItem><SelectItem value="Baja">Baja</SelectItem><SelectItem value="Descartar">Descartar</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><label className="text-xs font-medium">Justificación score</label><textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={editForm.score_justificacion || ""} onChange={(e) => setEditForm({ ...editForm, score_justificacion: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEditSave} disabled={editSaving}>{editSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Guardar cambios</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar prospecto</DialogTitle><DialogDescription>Se eliminará "{prospect.nombre_empresa}" y todos sus datos. No se puede deshacer.</DialogDescription></DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>{deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
