"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  Loader2, CheckCircle2, AlertCircle, Zap, Settings2,
  Eye, EyeOff, Pencil, Trash2, Star, Plus, X, ChevronDown, Palette, Tag,
} from "lucide-react"

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)", models: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-3-5"] },
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { value: "openrouter", label: "OpenRouter", models: ["openai/gpt-4o", "anthropic/claude-sonnet-4-5", "mistralai/mistral-large", "google/gemini-pro", "meta-llama/llama-3-70b-instruct"] },
  { value: "mistral", label: "Mistral", models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "open-mistral-7b"] },
  { value: "deepseek", label: "DeepSeek", models: ["deepseek-chat", "deepseek-coder"] },
]

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic", openai: "OpenAI", openrouter: "OpenRouter", mistral: "Mistral", deepseek: "DeepSeek",
}

interface ConfigRow {
  id: string
  provider: string
  model: string
  api_key_masked: string
  api_url: string | null
  estado: "principal" | "guardada"
  created_at: string
}

const NICHO_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#6B7280"]

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
}

function NichosSection() {
  const [nichos, setNichos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: "", slug: "", color: "#6B7280" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [deleteDialog, setDeleteDialog] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchNichos() {
    try {
      const res = await fetch("/api/settings/nichos")
      if (res.ok) { const json = await res.json(); setNichos(json.data || []) }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchNichos() }, [])

  function startAdd() {
    setAdding(true); setEditingId(null); setForm({ nombre: "", slug: "", color: "#6B7280" }); setError("")
  }
  function startEdit(n: any) {
    setEditingId(n.id); setAdding(true); setForm({ nombre: n.nombre, slug: n.slug, color: n.color || "#6B7280" }); setError("")
  }
  function cancelForm() { setAdding(false); setEditingId(null); setError("") }

  async function handleSave() {
    if (!form.nombre || !form.slug) { setError("Nombre y slug son obligatorios"); return }
    setSaving(true); setError("")
    try {
      const url = editingId ? `/api/settings/nichos/${editingId}` : "/api/settings/nichos"
      const method = editingId ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); return }
      cancelForm(); fetchNichos()
    } catch { setError("Error de conexión") }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/settings/nichos/${id}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json(); setError(d.error || "Error"); setDeleteDialog(null); setDeleting(false); return }
      setDeleteDialog(null); fetchNichos()
    } catch { setError("Error") }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2"><Tag className="h-4 w-4" />Nichos de negocio</h2>
          <p className="text-sm text-muted-foreground">Gestiona los sectores empresariales de prospección</p>
        </div>
        {!adding && <Button variant="outline" size="sm" onClick={startAdd} className="gap-1.5"><Plus className="h-3.5 w-3.5" />Añadir nicho</Button>}
      </div>

      {/* Form */}
      {adding && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">{editingId ? "Editar nicho" : "Nuevo nicho"}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Nombre</label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value, ...(!editingId ? { slug: slugify(e.target.value) } : {}) })} placeholder="Fotovoltaica" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Slug</label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="fotovoltaica" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Color</label>
                <div className="flex gap-1 flex-wrap">
                  {NICHO_COLORS.map((c) => (
                    <button key={c} type="button" className={`h-7 w-7 rounded-md border-2 transition-all ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} onClick={() => setForm({ ...form, color: c })} />
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}{editingId ? "Guardar" : "Crear nicho"}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelForm}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {nichos.map((n) => (
            <div key={n.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: n.color || "#6B7280" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.nombre}</p>
                <p className="text-xs text-muted-foreground">{n.slug} · {n.prospects_count || 0} prospectos</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(n)}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 dark:text-red-400" onClick={() => setDeleteDialog(n)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar nicho</DialogTitle>
            <DialogDescription>
              {deleteDialog?.prospects_count > 0
                ? `No se puede eliminar "${deleteDialog?.nombre}": hay ${deleteDialog?.prospects_count} prospectos asignados.`
                : `¿Eliminar el nicho "${deleteDialog?.nombre}"?`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancelar</Button>
            {(deleteDialog?.prospects_count || 0) === 0 && (
              <Button variant="destructive" onClick={() => handleDelete(deleteDialog.id)} disabled={deleting}>
                {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Eliminar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ModelCombobox({ value, onChange, suggestions }: { value: string; onChange: (v: string) => void; suggestions: string[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = value
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()))
    : suggestions

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Modelo</label>
      <div className="relative" ref={ref}>
        <Input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Escribe o selecciona un modelo..."
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(!open)}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && filtered.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
            <div className="max-h-48 overflow-auto p-1">
              {filtered.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`w-full text-left rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${m === value ? "bg-accent" : ""}`}
                  onClick={() => { onChange(m); setOpen(false) }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">Escribe cualquier modelo o selecciona de las sugerencias</p>
    </div>
  )
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [configs, setConfigs] = useState<ConfigRow[]>([])

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [provider, setProvider] = useState("openai")
  const [model, setModel] = useState("gpt-4o")
  const [apiKey, setApiKey] = useState("")
  const [apiUrl, setApiUrl] = useState("")
  const [showKey, setShowKey] = useState(false)

  // Actions
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  // Dialogs
  const [saveDialog, setSaveDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const currentProvider = PROVIDERS.find((p) => p.value === provider)
  const showApiUrl = provider === "openrouter"
  const principal = configs.find((c) => c.estado === "principal")

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/ai-config")
      if (res.ok) {
        const json = await res.json()
        setConfigs(json.data || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchConfigs() }, [fetchConfigs])

  function resetForm() {
    setEditingId(null)
    setProvider("openai")
    setModel("gpt-4o")
    setApiKey("")
    setApiUrl("")
    setShowKey(false)
    setTestResult(null)
    setMessage(null)
  }

  function loadForEdit(config: ConfigRow) {
    setEditingId(config.id)
    setProvider(config.provider)
    setModel(config.model)
    setApiKey("")
    setApiUrl(config.api_url || "")
    setTestResult(null)
    setMessage(null)
  }

  async function handleTest() {
    if (!apiKey) return
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch("/api/settings/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, api_key: apiKey, api_url: apiUrl || null, test_only: true }),
      })
      setTestResult(await res.json())
    } catch { setTestResult({ ok: false, error: "Error de conexión" }) }
    finally { setTesting(false) }
  }

  async function handleSave(setPrincipal: boolean) {
    setSaving(true); setMessage(null); setSaveDialog(false)
    try {
      if (editingId) {
        // UPDATE existing
        const res = await fetch(`/api/settings/ai-config/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, model, ...(apiKey ? { api_key: apiKey } : {}), api_url: apiUrl || null }),
        })
        if (!res.ok) { setMessage({ text: "Error al actualizar", type: "error" }); return }
        if (setPrincipal) {
          await fetch(`/api/settings/ai-config/${editingId}/set-principal`, { method: "PATCH" })
        }
        setMessage({ text: "Configuración actualizada", type: "success" })
      } else {
        // INSERT new
        const res = await fetch("/api/settings/ai-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, model, api_key: apiKey, api_url: apiUrl || null, set_principal: setPrincipal }),
        })
        if (!res.ok) { const d = await res.json(); setMessage({ text: d.error || "Error", type: "error" }); return }
        setMessage({ text: setPrincipal ? "Guardada como principal" : "Configuración guardada", type: "success" })
      }
      resetForm()
      fetchConfigs()
    } catch { setMessage({ text: "Error de conexión", type: "error" }) }
    finally { setSaving(false) }
  }

  async function handleSetPrincipal(id: string) {
    try {
      await fetch(`/api/settings/ai-config/${id}/set-principal`, { method: "PATCH" })
      fetchConfigs()
    } catch (e) { console.error(e) }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/settings/ai-config/${id}`, { method: "DELETE" })
      if (res.ok) {
        setDeleteDialog(null)
        if (editingId === id) resetForm()
        fetchConfigs()
      }
    } catch (e) { console.error(e) }
    finally { setDeleting(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración IA</h1>
        <p className="text-sm text-muted-foreground">Gestiona los proveedores de inteligencia artificial</p>
      </div>

      {/* Banner proveedor principal */}
      {principal ? (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Proveedor en uso: <span className="text-emerald-600 dark:text-emerald-500">{PROVIDER_LABELS[principal.provider] || principal.provider}</span></p>
            <p className="text-xs text-muted-foreground">Modelo: {principal.model} · Key: {principal.api_key_masked}</p>
          </div>
          <Badge variant="success">Principal</Badge>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Sin proveedor principal</p>
            <p className="text-xs text-muted-foreground">El scoring y la generación de mensajes usarán respuestas simuladas. Configura un proveedor abajo.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Formulario */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingId ? `Editando: ${PROVIDER_LABELS[provider] || provider}` : "Nueva configuración"}
                </CardTitle>
                {editingId && (
                  <Button variant="ghost" size="sm" onClick={resetForm} className="gap-1.5 text-muted-foreground">
                    <X className="h-3.5 w-3.5" />Cancelar edición
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Proveedor</label>
                <Select value={provider} onValueChange={(v) => {
                  setProvider(v)
                  setModel("")
                  setTestResult(null)
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <ModelCombobox
                value={model}
                onChange={setModel}
                suggestions={currentProvider?.models || []}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">API Key {editingId && <span className="text-xs text-muted-foreground">(dejar vacío para mantener la actual)</span>}</label>
                <div className="relative">
                  <Input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={editingId ? "••••••••" : "sk-..."} />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {showApiUrl && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">URL base (opcional)</label>
                  <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://openrouter.ai/api/v1" />
                </div>
              )}

              {testResult && (
                <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${testResult.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"}`}>
                  {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {testResult.ok ? "Conexión exitosa" : testResult.error}
                </div>
              )}

              {message && (
                <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${message.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"}`}>
                  {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {message.text}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleTest} disabled={testing || (!apiKey && !editingId)}>
                  {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  Probar conexión
                </Button>
                {editingId ? (
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSave(false)} disabled={saving || !model}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Guardar cambios
                  </Button>
                ) : (
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setSaveDialog(true)} disabled={saving || !apiKey || !model}>
                    Guardar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configs guardadas */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Configuraciones guardadas ({configs.length})</h2>
          {configs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Settings2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-sm text-muted-foreground">Sin configuraciones</p>
              </CardContent>
            </Card>
          ) : configs.map((config) => (
            <Card key={config.id} className={config.estado === "principal" ? "border-emerald-500/30" : ""}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{PROVIDER_LABELS[config.provider] || config.provider}</span>
                    {config.estado === "principal" ? (
                      <Badge variant="success" className="text-[10px]">Principal</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Guardada</Badge>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Modelo: {config.model}</p>
                  <p>Key: {config.api_key_masked}</p>
                  {config.api_url && <p>URL: {config.api_url}</p>}
                </div>
                <div className="flex gap-1.5">
                  {config.estado !== "principal" && (
                    <Button variant="outline" size="sm" className="text-xs gap-1 flex-1" onClick={() => handleSetPrincipal(config.id)}>
                      <Star className="h-3 w-3" />Usar como principal
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => loadForEdit(config)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1 text-red-600 dark:text-red-400" onClick={() => setDeleteDialog(config.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Sección Nichos ── */}
      <NichosSection />

      {/* Save dialog: ¿establecer como principal? */}
      <Dialog open={saveDialog} onOpenChange={setSaveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Guardar configuración</DialogTitle>
            <DialogDescription>¿Quieres establecer esta configuración como proveedor principal?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSave(true)} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar como principal
            </Button>
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
              Solo guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar configuración</DialogTitle>
            <DialogDescription>
              {configs.find((c) => c.id === deleteDialog)?.estado === "principal"
                ? "Esta es la configuración principal. Si la eliminas, el sistema quedará sin proveedor IA activo."
                : "¿Eliminar esta configuración guardada?"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteDialog && handleDelete(deleteDialog)} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
