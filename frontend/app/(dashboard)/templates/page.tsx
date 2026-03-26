"use client"

import { useState, useEffect } from "react"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plus,
  Loader2,
  FileText,
  Pencil,
  Eye,
  Trash2,
} from "lucide-react"
import type { Template } from "@/types"

const NICHO_LABELS: Record<string, string> = {
  climatizacion: "Climatización",
  instalaciones: "Instalaciones",
  energia: "Energía",
  otro: "Otro",
}

const TONO_LABELS: Record<string, string> = {
  formal: "Formal",
  cercano: "Cercano",
  tecnico: "Técnico",
}

const emptyForm = {
  nombre: "",
  nicho: "climatizacion",
  producto: "",
  tono: "cercano",
  instrucciones_sistema: "",
  asunto_base: "",
  cuerpo_base: "",
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/templates")
      if (res.ok) {
        const json = await res.json()
        setTemplates(json.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTemplates() }, [])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(t: Template) {
    setEditingId(t.id)
    setForm({
      nombre: t.nombre,
      nicho: t.nicho,
      producto: t.producto,
      tono: t.tono,
      instrucciones_sistema: t.instrucciones_sistema,
      asunto_base: t.asunto_base || "",
      cuerpo_base: t.cuerpo_base || "",
    })
    setDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editingId ? `/api/templates/${editingId}` : "/api/templates"
      const method = editingId ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setDialogOpen(false)
        fetchTemplates()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta plantilla?")) return
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" })
      fetchTemplates()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plantillas</h1>
          <p className="text-sm text-muted-foreground">{templates.length} plantillas de mensajería</p>
        </div>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nueva plantilla
        </Button>
      </div>

      {/* Templates list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No hay plantillas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="hover:border-emerald-500/30 transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm">{t.nombre}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{NICHO_LABELS[t.nicho] || t.nicho}</Badge>
                    <Badge variant="outline" className="text-[10px]">{t.producto}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{TONO_LABELS[t.tono] || t.tono}</Badge>
                  </div>
                </div>

                {t.asunto_base && (
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">Asunto</p>
                    <p className="text-xs truncate">{t.asunto_base}</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground line-clamp-3">{t.instrucciones_sistema}</p>

                <div className="flex gap-1.5 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => { setPreviewTemplate(t); setPreviewOpen(true) }}>
                    <Eye className="h-3 w-3" /> Preview
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={() => openEdit(t)}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs text-red-400 hover:text-red-300 px-2" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar plantilla" : "Crear plantilla"}</DialogTitle>
            <DialogDescription>Define las instrucciones que Claude usará para generar mensajes</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Climatización — Cercano" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nicho</label>
                <Select value={form.nicho} onValueChange={(v) => setForm({ ...form, nicho: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="climatizacion">Climatización</SelectItem>
                    <SelectItem value="instalaciones">Instalaciones</SelectItem>
                    <SelectItem value="energia">Energía</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Producto</label>
                <Input required value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })} placeholder="partes_conductos" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tono</label>
                <Select value={form.tono} onValueChange={(v) => setForm({ ...form, tono: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="cercano">Cercano</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Instrucciones del sistema (system prompt para Claude)</label>
              <textarea
                required
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                value={form.instrucciones_sistema}
                onChange={(e) => setForm({ ...form, instrucciones_sistema: e.target.value })}
                placeholder="Eres un consultor de digitalización especializado en..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Asunto base (email)</label>
              <Input value={form.asunto_base} onChange={(e) => setForm({ ...form, asunto_base: e.target.value })} placeholder="Una herramienta para empresas de..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cuerpo base</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                value={form.cuerpo_base}
                onChange={(e) => setForm({ ...form, cuerpo_base: e.target.value })}
                placeholder="Hola [CONTACTO], he desarrollado una aplicación..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingId ? "Guardar cambios" : "Crear plantilla"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vista previa — System Prompt</DialogTitle>
            <DialogDescription>Esto es lo que recibirá Claude como instrucciones al generar mensajes</DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="outline">{NICHO_LABELS[previewTemplate.nicho]}</Badge>
                <Badge variant="outline">{previewTemplate.producto}</Badge>
                <Badge variant="secondary">{TONO_LABELS[previewTemplate.tono]}</Badge>
              </div>
              <div className="rounded-lg border bg-secondary/30 p-4">
                <p className="text-xs font-mono leading-relaxed whitespace-pre-wrap">
                  {previewTemplate.instrucciones_sistema}
                </p>
              </div>
              {previewTemplate.asunto_base && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Asunto base:</p>
                  <p className="text-sm">{previewTemplate.asunto_base}</p>
                </div>
              )}
              {previewTemplate.cuerpo_base && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Cuerpo base:</p>
                  <p className="text-sm whitespace-pre-wrap">{previewTemplate.cuerpo_base}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
