"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
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
import {
  Loader2,
  Sparkles,
  Send,
  Mail,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react"
import type { Prospect, Template } from "@/types"

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <MessagesContent />
    </Suspense>
  )
}

function MessagesContent() {
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get("prospect_id")

  const [prospects, setProspects] = useState<Prospect[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [selectedProspect, setSelectedProspect] = useState<string>(preselectedId || "")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("auto")
  const [canal, setCanal] = useState<"email" | "whatsapp">("email")
  const [instrucciones, setInstrucciones] = useState("")

  // Generated message
  const [generating, setGenerating] = useState(false)
  const [asunto, setAsunto] = useState("")
  const [contenido, setContenido] = useState("")
  const [generated, setGenerated] = useState(false)

  // Send state
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const [pRes, tRes] = await Promise.all([
          fetch("/api/prospects?limit=500&sort=nombre_empresa&dir=asc"),
          fetch("/api/templates"),
        ])
        if (pRes.ok) {
          const json = await pRes.json()
          setProspects(json.data || [])
        }
        if (tRes.ok) {
          const json = await tRes.json()
          setTemplates(json.data || [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Auto-generate when prospect is preselected
  useEffect(() => {
    if (preselectedId && !loading && prospects.length > 0 && !generated) {
      handleGenerate()
    }
  }, [preselectedId, loading, prospects.length])

  const currentProspect = prospects.find((p) => p.id === selectedProspect)

  async function handleGenerate() {
    if (!selectedProspect) return
    setGenerating(true)
    setSent(false)
    setSendError("")

    try {
      const res = await fetch("/api/messages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect_id: selectedProspect,
          template_id: selectedTemplate === "auto" ? null : selectedTemplate,
          canal,
          instrucciones_extra: instrucciones || null,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setAsunto(data.asunto || "")
        setContenido(data.contenido || "")
        setGenerated(true)
      } else {
        setSendError(data.error || "Error al generar mensaje")
      }
    } catch (e) {
      setSendError("Error de conexión al generar mensaje")
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSend() {
    if (!selectedProspect || !contenido) return
    setSending(true)
    setSendError("")

    const endpoint = canal === "email" ? "/api/messages/send-email" : "/api/messages/send-whatsapp"
    const body = canal === "email"
      ? { prospect_id: selectedProspect, asunto, contenido }
      : { prospect_id: selectedProspect, contenido }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setSendError(data.error || "Error al enviar")
      } else {
        setSent(true)
      }
    } catch (e) {
      setSendError("Error de conexión")
    } finally {
      setSending(false)
    }
  }

  function handleReset() {
    setAsunto("")
    setContenido("")
    setGenerated(false)
    setSent(false)
    setSendError("")
    setInstrucciones("")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Generador de mensajes</h1>
        <p className="text-sm text-muted-foreground">
          Genera mensajes personalizados con IA y envíalos por email o WhatsApp
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Panel izquierdo: configuración */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prospecto */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Prospecto</label>
                <Select value={selectedProspect || "placeholder"} onValueChange={(v) => { setSelectedProspect(v === "placeholder" ? "" : v); setGenerated(false); setSent(false) }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un prospecto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>Selecciona un prospecto</SelectItem>
                    {prospects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre_empresa} {p.score_ia ? `(${p.score_ia})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Info del prospecto seleccionado */}
              {currentProspect && (
                <div className="rounded-lg border p-3 space-y-1 text-sm">
                  <p className="font-medium">{currentProspect.nombre_empresa}</p>
                  {currentProspect.contacto_nombre && (
                    <p className="text-muted-foreground">{currentProspect.contacto_nombre}{currentProspect.contacto_cargo && ` · ${currentProspect.contacto_cargo}`}</p>
                  )}
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {currentProspect.email && <span>{currentProspect.email}</span>}
                    {currentProspect.telefono && <span>{currentProspect.telefono}</span>}
                  </div>
                </div>
              )}

              {/* Canal */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Canal</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={canal === "email" ? "default" : "outline"}
                    size="sm"
                    className={`flex-1 gap-2 ${canal === "email" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                    onClick={() => { setCanal("email"); setGenerated(false) }}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant={canal === "whatsapp" ? "default" : "outline"}
                    size="sm"
                    className={`flex-1 gap-2 ${canal === "whatsapp" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                    onClick={() => { setCanal("whatsapp"); setGenerated(false) }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </div>
              </div>

              {/* Plantilla */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Plantilla</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automática (según nicho)</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Instrucciones extra */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Instrucciones adicionales (opcional)</label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  placeholder="Ej: Mencionar que tenemos una promoción especial..."
                  value={instrucciones}
                  onChange={(e) => setInstrucciones(e.target.value)}
                />
              </div>

              {/* Botón generar */}
              <Button
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                disabled={!selectedProspect || generating}
                onClick={handleGenerate}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generating ? "Generando..." : "Generar con IA"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Panel derecho: mensaje generado */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {sent ? "Mensaje enviado" : generated ? "Mensaje generado" : "Vista previa"}
                </CardTitle>
                {generated && !sent && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerate} disabled={generating}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      Regenerar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReset}>
                      Limpiar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!generated && !generating ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
                  <Sparkles className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">Selecciona un prospecto y genera un mensaje con IA</p>
                  {sendError && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 max-w-md">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {sendError}
                    </div>
                  )}
                </div>
              ) : generating ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-3" />
                  <p className="text-sm text-muted-foreground">Generando mensaje personalizado...</p>
                </div>
              ) : sent ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  <p className="text-sm font-medium">
                    {canal === "email" ? "Email enviado correctamente" : "WhatsApp enviado correctamente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentProspect?.nombre_empresa}
                  </p>
                  <Button variant="outline" size="sm" onClick={handleReset} className="mt-2">
                    Generar otro mensaje
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Asunto (solo email) */}
                  {canal === "email" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Asunto</label>
                      <Input
                        value={asunto}
                        onChange={(e) => setAsunto(e.target.value)}
                        placeholder="Asunto del email"
                      />
                    </div>
                  )}

                  {/* Contenido */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {canal === "email" ? "Cuerpo del email" : "Mensaje WhatsApp"}
                    </label>
                    <textarea
                      className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                      value={contenido}
                      onChange={(e) => setContenido(e.target.value)}
                    />
                  </div>

                  {/* Error */}
                  {sendError && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {sendError}
                    </div>
                  )}

                  {/* Botón enviar */}
                  <Button
                    className={`w-full gap-2 ${
                      canal === "email"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                    disabled={sending || !contenido}
                    onClick={handleSend}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {sending
                      ? "Enviando..."
                      : canal === "email"
                        ? `Enviar email a ${currentProspect?.email || "..."}`
                        : `Enviar WhatsApp a ${currentProspect?.telefono || "..."}`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
