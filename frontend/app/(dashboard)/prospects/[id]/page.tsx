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
  Pencil, Trash2, Clock, Tag, ImageIcon, Linkedin, Facebook, Instagram,
  Twitter, Youtube, TrendingUp, BarChart2, Users, ChevronDown, ChevronUp,
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
  importacion: { icon: <ArrowLeft className="h-3.5 w-3.5" />, color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-500" },
}
const MSG_BADGE: Record<string, "success" | "info" | "warning" | "danger" | "secondary"> = {
  pendiente: "secondary", enviado: "info", entregado: "success", abierto: "success", error: "danger",
}

const PRODUCTO_LABELS: Record<string, string> = {
  aisla_partes: "Aisla Partes",
  partes_insta: "Partes Insta",
  planscan: "Plan Scan",
  reycode: "Rey Code",
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

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

function parseResenas(raw: string): { stars: number; text: string }[] {
  if (!raw) return []
  return raw.split(" | ").map((r) => {
    const match = r.match(/★(\d):?\s*(.*)/)
    if (!match) return { stars: 0, text: r }
    return { stars: parseInt(match[1]), text: match[2] }
  }).filter((r) => r.text)
}

function parseCompetitors(raw: string): { name: string; reviews: string; link?: string }[] {
  if (!raw) return []
  return raw.split(/\n\n+/).map((block) => {
    const nameMatch = block.match(/Name:\s*(.+)/)
    const reviewsMatch = block.match(/Reviews:\s*(.+)/)
    const linkMatch = block.match(/Link:\s*(.+)/)
    return {
      name: nameMatch?.[1]?.trim() || "",
      reviews: reviewsMatch?.[1]?.trim() || "",
      link: linkMatch?.[1]?.trim() !== "No Link" ? linkMatch?.[1]?.trim() : undefined,
    }
  }).filter((c) => c.name)
}

function looksLikeEnglish(text: string | null | undefined): boolean {
  if (!text || text.length < 30) return false
  const lower = text.toLowerCase()
  const en = [" the ", " is ", " are ", " has ", " this ", " that ", " with ", " for ", " and ", " but "].filter(w => lower.includes(w)).length
  const es = [" la ", " el ", " es ", " una ", " que ", " con ", " para ", " pero ", " los ", " las "].filter(w => lower.includes(w)).length
  return en > es && en >= 2
}

function salesRelevanceBadge(relevance: string): { label: string; className: string } {
  const upper = relevance.toUpperCase()
  if (upper.startsWith("GOOD")) return { label: "GOOD", className: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" }
  if (upper.startsWith("POOR")) return { label: "POOR", className: "text-red-400 border-red-400/30 bg-red-400/10" }
  if (upper.startsWith("MODERATE")) return { label: "MODERATE", className: "text-amber-400 border-amber-400/30 bg-amber-400/10" }
  return { label: relevance.split(" ")[0], className: "text-slate-400 border-slate-400/30 bg-slate-400/10" }
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
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [intelEditOpen, setIntelEditOpen] = useState(false)

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

  async function saveEstado(v: string) {
    setEstado(v)
    await fetch(`/api/prospects/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: v }) })
  }
  async function saveNotas() {
    setSaving(true)
    await fetch(`/api/prospects/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notas }) })
    setNotasDirty(false); setSaving(false)
  }

  function openEdit() {
    if (!prospect) return
    setEditForm({
      nombre_empresa: prospect.nombre_empresa, nicho: prospect.nicho,
      email: prospect.email || "", telefono: prospect.telefono || "",
      direccion: prospect.direccion || "", contacto_nombre: prospect.contacto_nombre || "",
      contacto_cargo: prospect.contacto_cargo || "", web: prospect.web || "",
      valoracion_google: prospect.valoracion_google ?? "", num_resenas: prospect.num_resenas ?? "",
      score_ia: prospect.score_ia ?? "", score_etiqueta: prospect.score_etiqueta || "",
      score_justificacion: prospect.score_justificacion || "",
      sales_summary: prospect.sales_summary || "",
      sales_relevance: prospect.sales_relevance || "",
      size_indicators: prospect.size_indicators || "",
    })
    setEditOpen(true)
  }
  async function handleEditSave() {
    setEditSaving(true)
    const body = {
      ...editForm,
      valoracion_google: editForm.valoracion_google === "" ? null : Number(editForm.valoracion_google),
      num_resenas: editForm.num_resenas === "" ? null : Number(editForm.num_resenas),
      score_ia: editForm.score_ia === "" ? null : Number(editForm.score_ia),
      score_etiqueta: editForm.score_etiqueta || null,
    }
    const res = await fetch(`/api/prospects/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (res.ok) { setEditOpen(false); setLoading(true); load() }
    setEditSaving(false)
  }
  async function handleDelete() {
    setDeleteLoading(true)
    await fetch(`/api/prospects/${params.id}`, { method: "DELETE" })
    router.push("/prospects")
  }

  async function handleTranslate() {
    setTranslating(true)
    try {
      const res = await fetch(`/api/prospects/${params.id}/translate`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setProspect((prev) => prev ? {
          ...prev,
          sales_summary: data.sales_summary,
          sales_relevance: data.sales_relevance,
          size_indicators: data.size_indicators,
        } : prev)
      }
    } catch (e) { console.error(e) }
    finally { setTranslating(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!prospect) return <div className="space-y-4"><p className="text-muted-foreground">Prospecto no encontrado.</p><Link href="/prospects"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button></Link></div>

  const nichoInfo = nichoMap[prospect.nicho]
  const hasGoogleData = prospect.categoria_google || prospect.horario || prospect.url_maps || prospect.imagen_url
  const horarioRows = parseHorario(prospect.horario || "")
  const resenas = parseResenas(prospect.resenas_texto || "")

  // V2 derived data
  const hasIntelComercial = prospect.sales_summary || prospect.sales_relevance || prospect.is_spending_on_ads || prospect.is_worth_pursuing || prospect.can_claim
  const socialLinks = [
    { key: "linkedin", url: prospect.linkedin, icon: <Linkedin className="h-4 w-4" />, label: "LinkedIn", color: "text-blue-600 dark:text-blue-400" },
    { key: "facebook", url: prospect.facebook, icon: <Facebook className="h-4 w-4" />, label: "Facebook", color: "text-blue-500 dark:text-blue-300" },
    { key: "instagram", url: prospect.instagram, icon: <Instagram className="h-4 w-4" />, label: "Instagram", color: "text-pink-500 dark:text-pink-400" },
    { key: "twitter", url: prospect.twitter, icon: <Twitter className="h-4 w-4" />, label: "Twitter/X", color: "text-slate-700 dark:text-slate-300" },
    { key: "tiktok", url: prospect.tiktok, icon: <span className="text-sm font-bold">TK</span>, label: "TikTok", color: "text-slate-800 dark:text-slate-200" },
    { key: "youtube", url: prospect.youtube, icon: <Youtube className="h-4 w-4" />, label: "YouTube", color: "text-red-500 dark:text-red-400" },
  ].filter((s) => s.url)
  const hasDigitalProfile = socialLinks.length > 0 || prospect.owner_name || prospect.gmaps_link || prospect.featured_image
  const hasAnalysis = prospect.main_category || prospect.categories || prospect.review_keywords || prospect.size_indicators || prospect.workday_timing || prospect.competitors
  const competitors = parseCompetitors(prospect.competitors || "")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/prospects"><Button variant="ghost" size="icon" className="flex-shrink-0"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{prospect.nombre_empresa}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" style={nichoInfo ? { borderColor: nichoInfo.color, color: nichoInfo.color } : undefined}>
                {nichoInfo?.nombre || prospect.nicho}
              </Badge>
              {prospect.producto_objetivo && (
                <Badge variant="secondary" className="text-[10px]">{PRODUCTO_LABELS[prospect.producto_objetivo] || prospect.producto_objetivo}</Badge>
              )}
              {prospect.contacto_nombre && (
                <span className="text-sm text-muted-foreground truncate">{prospect.contacto_nombre}{prospect.contacto_cargo && ` · ${prospect.contacto_cargo}`}</span>
              )}
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

        {/* ── Left column (40%) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Score Card */}
          {prospect.score_ia !== null && prospect.score_etiqueta && (
            <ScoreCard score={prospect.score_ia} etiqueta={prospect.score_etiqueta} justificacion={prospect.score_justificacion || ""} />
          )}

          {/* ── NUEVA: Inteligencia Comercial ── */}
          {hasIntelComercial && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Inteligencia Comercial
                  </CardTitle>
                  {looksLikeEnglish(prospect.sales_summary) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleTranslate}
                      disabled={translating}
                      className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {translating
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <span>🌐</span>}
                      Traducir
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Badges de señales */}
                <div className="flex flex-wrap gap-2">
                  {prospect.sales_relevance && (() => {
                    const { label, className } = salesRelevanceBadge(prospect.sales_relevance)
                    return (
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}>
                        {label}
                      </span>
                    )
                  })()}
                  {prospect.is_spending_on_ads && (
                    <Badge variant="outline" className="text-purple-400 border-purple-400/30 bg-purple-400/10 text-xs gap-1">
                      💰 Invierte en Ads
                    </Badge>
                  )}
                  {prospect.is_worth_pursuing && (
                    <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10 text-xs gap-1">
                      ✅ Recomendado
                    </Badge>
                  )}
                  {prospect.can_claim && (
                    <Badge variant="outline" className="text-amber-400 border-amber-400/30 bg-amber-400/10 text-xs">
                      Ficha no reclamada
                    </Badge>
                  )}
                </div>

                {/* Sales summary */}
                {prospect.sales_summary && (
                  <div className="space-y-1">
                    <p className={`text-xs text-muted-foreground leading-relaxed ${!summaryExpanded ? "line-clamp-4" : ""}`}>
                      {prospect.sales_summary}
                    </p>
                    {prospect.sales_summary.length > 200 && (
                      <button
                        onClick={() => setSummaryExpanded(!summaryExpanded)}
                        className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400"
                      >
                        {summaryExpanded ? <><ChevronUp className="h-3 w-3" />Menos</> : <><ChevronDown className="h-3 w-3" />Más</>}
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contact data */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Datos de contacto</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {prospect.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a href={`mailto:${prospect.email}`} className="hover:underline truncate">{prospect.email}</a>
                </div>
              )}
              {prospect.emails_all && prospect.emails_all !== prospect.email && (
                <div className="pl-6 space-y-1">
                  {prospect.emails_all.split(",").map((e, i) => {
                    const trimmed = e.trim()
                    if (!trimmed || trimmed === prospect.email) return null
                    return (
                      <div key={i} className="flex items-center gap-1.5">
                        <a href={`mailto:${trimmed}`} className="text-xs text-muted-foreground hover:underline truncate">{trimmed}</a>
                        {prospect.recommended_email?.includes(trimmed) && (
                          <span className="text-[10px] text-emerald-500 font-medium">rec.</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {prospect.telefono && (
                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <span>{prospect.telefono}</span>
                    {(prospect.carrier || prospect.line_type) && (
                      <div className="text-[10px] text-muted-foreground">
                        {[prospect.carrier, prospect.line_type].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {prospect.web && (
                <div className="flex items-center gap-2.5">
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a href={prospect.web.startsWith("http") ? prospect.web : `https://${prospect.web}`} target="_blank" rel="noopener" className="hover:underline truncate flex items-center gap-1">
                    {prospect.web}<ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {prospect.direccion && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground text-xs">{prospect.direccion}</span>
                </div>
              )}
              {prospect.valoracion_google !== null && (
                <div className="flex items-center gap-2.5">
                  <Star className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span>{typeof prospect.valoracion_google === "string" ? parseFloat(prospect.valoracion_google).toFixed(1) : prospect.valoracion_google} / 5 ({prospect.num_resenas || 0} reseñas)</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── NUEVA: Perfil Digital ── */}
          {hasDigitalProfile && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  Perfil Digital
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Featured image */}
                {prospect.featured_image && (
                  <div className="rounded-lg overflow-hidden border -mx-1">
                    <img src={prospect.featured_image} alt={prospect.nombre_empresa} className="w-full h-32 object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement!.style.display = "none" }} />
                  </div>
                )}

                {/* Owner */}
                {prospect.owner_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    {prospect.owner_profile_link ? (
                      <a href={prospect.owner_profile_link} target="_blank" rel="noopener" className="hover:underline flex items-center gap-1 truncate">
                        {prospect.owner_name.replace(" (propietario)", "")}<ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span>{prospect.owner_name.replace(" (propietario)", "")}</span>
                    )}
                  </div>
                )}

                {/* Google Maps button */}
                {prospect.gmaps_link && (
                  <a href={prospect.gmaps_link} target="_blank" rel="noopener">
                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                      <MapPin className="h-3.5 w-3.5" />
                      Ver en Google Maps
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </Button>
                  </a>
                )}

                {/* Social links */}
                {socialLinks.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {socialLinks.map((s) => (
                      <a key={s.key} href={s.url!} target="_blank" rel="noopener"
                        title={s.label}
                        className={`flex items-center justify-center h-8 w-8 rounded-lg border bg-secondary hover:bg-secondary/80 transition-colors ${s.color}`}
                      >
                        {s.icon}
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Estado + Notas */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Estado y notas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={estado} onValueChange={saveEstado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ESTADO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" placeholder="Añade notas..." value={notas} onChange={(e) => { setNotas(e.target.value); setNotasDirty(true) }} />
              {notasDirty && (
                <Button size="sm" onClick={saveNotas} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Guardar
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column (60%) ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* ── NUEVA: Análisis del Negocio ── */}
          {hasAnalysis && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-violet-400" />
                  Análisis del Negocio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Categories */}
                {(prospect.main_category || prospect.categories) && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Categorías Google</p>
                    <div className="flex flex-wrap gap-1.5">
                      {prospect.main_category && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Tag className="h-3 w-3" />{prospect.main_category}
                        </Badge>
                      )}
                      {prospect.categories && prospect.categories !== prospect.main_category && (
                        prospect.categories.split(",").map((cat, i) => {
                          const c = cat.trim()
                          if (!c || c === prospect.main_category) return null
                          return <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Review keywords */}
                {prospect.review_keywords && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Keywords de reseñas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {prospect.review_keywords.split(",").map((kw, i) => (
                        <span key={i} className="inline-flex items-center rounded-full border border-slate-500/20 bg-slate-500/10 px-2 py-0.5 text-xs text-slate-300">
                          {kw.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size indicators */}
                {prospect.size_indicators && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Indicadores de tamaño</p>
                    <ul className="space-y-0.5">
                      {prospect.size_indicators.split(",").map((ind, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5">·</span>{ind.trim()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Workday timing + closed_on */}
                {(prospect.workday_timing || prospect.closed_on) && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Horario de trabajo</p>
                    <div className="rounded-lg border overflow-hidden text-xs">
                      {prospect.workday_timing && (
                        <div className="flex items-center gap-2 px-3 py-2 border-b">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span>{prospect.workday_timing}</span>
                        </div>
                      )}
                      {prospect.closed_on && (
                        <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
                          <span className="text-red-400">✕</span>
                          <span>Cerrado: {prospect.closed_on}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Competitors */}
                {competitors.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Competidores detectados</p>
                    <ul className="space-y-1">
                      {competitors.slice(0, 5).map((c, i) => (
                        <li key={i} className="flex items-center justify-between text-xs rounded-lg border px-2.5 py-1.5">
                          <span className="font-medium truncate">{c.name}</span>
                          <span className="text-muted-foreground flex-shrink-0 ml-2">{c.reviews}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Google Maps card */}
          {hasGoogleData && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Ficha Google Maps</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {prospect.imagen_url && (
                  <div className="rounded-lg overflow-hidden border -mx-1">
                    <img src={prospect.imagen_url} alt={prospect.nombre_empresa} className="w-full h-40 object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement!.style.display = "none" }} />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {prospect.categoria_google && (
                    <Badge variant="outline" className="gap-1"><Tag className="h-3 w-3" />{prospect.categoria_google}</Badge>
                  )}
                  {prospect.ficha_reclamada !== null && (
                    <Badge variant={prospect.ficha_reclamada ? "success" : "secondary"} className="text-[10px]">
                      {prospect.ficha_reclamada ? "Ficha reclamada" : "No reclamada"}
                    </Badge>
                  )}
                  {prospect.url_maps && (
                    <a href={prospect.url_maps} target="_blank" rel="noopener" className="text-xs hover:underline flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />Ver en Maps<ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
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
              {messages.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Sin mensajes.</p>
              ) : (
                <div className="space-y-2.5">
                  {messages.map((msg) => (
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
                      <div className="flex gap-3 text-[11px] text-muted-foreground">
                        {msg.fecha_envio && <span>{formatDate(msg.fecha_envio)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Actividad</CardTitle></CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Sin actividad.</p>
              ) : (
                <div className="space-y-0.5">
                  {activity.map((item) => {
                    const cfg = ACTIVITY_ICONS[item.tipo] || ACTIVITY_ICONS.nota
                    return (
                      <div key={item.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-secondary/50">
                        <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${cfg.color}`}>{cfg.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-snug">{item.descripcion}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(item.created_at)}</p>
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
            <div className="space-y-1">
              <label className="text-xs font-medium">Etiqueta score</label>
              <Select value={editForm.score_etiqueta || "none"} onValueChange={(v) => setEditForm({ ...editForm, score_etiqueta: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin etiqueta</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Baja">Baja</SelectItem>
                  <SelectItem value="Descartar">Descartar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><label className="text-xs font-medium">Justificación score</label><textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={editForm.score_justificacion || ""} onChange={(e) => setEditForm({ ...editForm, score_justificacion: e.target.value })} /></div>
            {/* Sección colapsable: Inteligencia Comercial */}
            <div className="rounded-lg border">
              <button
                type="button"
                onClick={() => setIntelEditOpen(!intelEditOpen)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-secondary/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Inteligencia Comercial
                </span>
                {intelEditOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {intelEditOpen && (
                <div className="border-t px-4 pb-4 pt-3 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Resumen comercial</label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={editForm.sales_summary || ""}
                      onChange={(e) => setEditForm({ ...editForm, sales_summary: e.target.value })}
                      placeholder="Análisis comercial del prospecto..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Relevancia</label>
                    <Input
                      value={editForm.sales_relevance || ""}
                      onChange={(e) => setEditForm({ ...editForm, sales_relevance: e.target.value })}
                      placeholder="ej. BUENA COINCIDENCIA — empresa activa del sector"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Indicadores de tamaño</label>
                    <Input
                      value={editForm.size_indicators || ""}
                      onChange={(e) => setEditForm({ ...editForm, size_indicators: e.target.value })}
                      placeholder="ej. 623 reseñas Google, 4.9 estrellas, presencia en redes"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEditSave} disabled={editSaving}>
                {editSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Guardar cambios
              </Button>
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
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
