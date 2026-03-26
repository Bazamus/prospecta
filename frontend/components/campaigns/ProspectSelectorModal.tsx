"use client"

import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ScoreBadge } from "@/components/prospects/ScoreCard"
import { useNichos } from "@/lib/hooks/use-nichos"
import { Loader2, Search, UserPlus } from "lucide-react"
import type { Prospect } from "@/types"

interface Props {
  campaignId: string
  scoreMinimo: number
  excludeIds: string[]
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdded: () => void
}

export function ProspectSelectorModal({ campaignId, scoreMinimo, excludeIds, open, onOpenChange, onAdded }: Props) {
  const { nichoMap } = useNichos()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true); setSelected(new Set())
    fetch(`/api/prospects?limit=500&score_min=${scoreMinimo}&sort=score_ia&dir=desc`)
      .then((r) => r.json())
      .then((json) => {
        const available = (json.data || []).filter((p: Prospect) => !excludeIds.includes(p.id))
        setProspects(available)
      })
      .finally(() => setLoading(false))
  }, [open, scoreMinimo, excludeIds])

  const filtered = search
    ? prospects.filter((p) => p.nombre_empresa.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()))
    : prospects

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  async function handleAdd() {
    setAdding(true)
    try {
      await fetch(`/api/campaigns/${campaignId}/prospects`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect_ids: Array.from(selected) }),
      })
      onOpenChange(false)
      onAdded()
    } catch (e) { console.error(e) }
    finally { setAdding(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Añadir prospectos a la campaña</DialogTitle>
          <DialogDescription>Score mínimo: {scoreMinimo} · {prospects.length} disponibles</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="info">{selected.size} seleccionados</Badge>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="text-xs">Deseleccionar</Button>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0 max-h-[400px] border rounded-lg">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay prospectos disponibles con score {">="} {scoreMinimo}</p>
          ) : (
            <div className="divide-y">
              {filtered.map((p) => (
                <div key={p.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-secondary/50 ${selected.has(p.id) ? "bg-emerald-500/5" : ""}`} onClick={() => toggle(p.id)}>
                  <input type="checkbox" checked={selected.has(p.id)} readOnly className="rounded border-input" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.nombre_empresa}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.email || "Sin email"}{p.contacto_nombre && ` · ${p.contacto_nombre}`}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] flex-shrink-0" style={nichoMap[p.nicho] ? { borderColor: nichoMap[p.nicho].color, color: nichoMap[p.nicho].color } : undefined}>
                    {nichoMap[p.nicho]?.nombre || p.nicho}
                  </Badge>
                  {p.score_ia !== null && p.score_etiqueta && <ScoreBadge score={p.score_ia} etiqueta={p.score_etiqueta} />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={handleAdd} disabled={adding || selected.size === 0}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Añadir {selected.size > 0 ? selected.size : ""} prospectos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
