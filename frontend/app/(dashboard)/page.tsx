"use client"

import { useState, useEffect } from "react"
import { StatsGrid } from "@/components/dashboard/StatsGrid"
import { Funnel } from "@/components/dashboard/Funnel"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import type { ActivityLog, Campaign } from "@/types"

const NICHO_LABELS: Record<string, string> = {
  climatizacion: "Climatización", instalaciones: "Instalaciones", energia: "Energía",
  aislamiento: "Aislamiento", electricidad: "Electricidad", pci: "PCI",
  general: "General", otro: "Otro",
}

interface DashboardData {
  stats: {
    total: number; respondieron: number; interesados: number; demos: number
    conAds: number; recomendados: number; conEmail: number; conLinkedin: number
  }
  funnel: { label: string; value: number; color: string }[]
  scoreDistribution: { alta: number; media: number; baja: number; descartar: number }
  categoryDistribution: { category: string; count: number }[]
  activity: ActivityLog[]
  activeCampaigns: (Campaign & { prospects_count?: number })[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [prospectsRes, campaignsRes] = await Promise.all([
          fetch("/api/prospects?limit=1000"),
          fetch("/api/campaigns"),
        ])

        let prospects: any[] = []
        let campaigns: any[] = []

        if (prospectsRes.ok) {
          const json = await prospectsRes.json()
          prospects = json.data || []
        }
        if (campaignsRes.ok) {
          const json = await campaignsRes.json()
          campaigns = json.data || []
        }

        // Pipeline stats
        const total = prospects.length
        const respondieron = prospects.filter((p: any) =>
          ["respondio", "interesado", "demo_enviada", "cerrado"].includes(p.estado)
        ).length
        const interesados = prospects.filter((p: any) =>
          ["interesado", "demo_enviada", "cerrado"].includes(p.estado)
        ).length
        const demos = prospects.filter((p: any) =>
          ["demo_enviada", "cerrado"].includes(p.estado)
        ).length

        // V2 stats
        const conAds = prospects.filter((p: any) => p.is_spending_on_ads).length
        const recomendados = prospects.filter((p: any) => p.is_worth_pursuing).length
        const conEmail = prospects.filter((p: any) => p.email).length
        const conLinkedin = prospects.filter((p: any) => p.linkedin).length

        // Funnel
        const counts: Record<string, number> = {}
        for (const p of prospects) {
          counts[p.estado] = (counts[p.estado] || 0) + 1
        }
        const funnel = [
          { label: "Sin contactar", value: counts["sin_contactar"] || 0, color: "bg-slate-500" },
          { label: "Contactados", value: counts["contactado"] || 0, color: "bg-blue-500" },
          { label: "Respondieron", value: counts["respondio"] || 0, color: "bg-indigo-500" },
          { label: "Interesados", value: counts["interesado"] || 0, color: "bg-amber-500" },
          { label: "Demo enviada", value: counts["demo_enviada"] || 0, color: "bg-emerald-500" },
          { label: "Cerrados", value: counts["cerrado"] || 0, color: "bg-green-500" },
        ]

        // Score distribution
        const scoreDistribution = {
          alta: prospects.filter((p: any) => p.score_etiqueta === "Alta").length,
          media: prospects.filter((p: any) => p.score_etiqueta === "Media").length,
          baja: prospects.filter((p: any) => p.score_etiqueta === "Baja").length,
          descartar: prospects.filter((p: any) => p.score_etiqueta === "Descartar").length,
        }

        // Category distribution (top 10 main_category)
        const catCounts: Record<string, number> = {}
        for (const p of prospects) {
          if (p.main_category) {
            catCounts[p.main_category] = (catCounts[p.main_category] || 0) + 1
          }
        }
        const categoryDistribution = Object.entries(catCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([category, count]) => ({ category, count }))

        // Activity
        let activity: ActivityLog[] = []
        if (prospects.length > 0) {
          try {
            const ids = prospects.slice(0, 5).map((p: any) => p.id)
            const activityPromises = ids.map((id: string) =>
              fetch(`/api/prospects/${id}`).then(r => r.ok ? r.json() : { activity: [] })
            )
            const results = await Promise.all(activityPromises)
            activity = results
              .flatMap((r: any) => r.activity || [])
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 10)
          } catch (e) {
            // Ignore activity errors
          }
        }

        const activeCampaigns = campaigns.filter((c: any) => c.estado === "activa")

        setData({
          stats: { total, respondieron, interesados, demos, conAds, recomendados, conEmail, conLinkedin },
          funnel,
          scoreDistribution,
          categoryDistribution,
          activity,
          activeCampaigns,
        })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-muted-foreground">Error cargando datos.</p>
  }

  const totalProspects = data.stats.total || 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen de actividad comercial</p>
      </div>

      <StatsGrid
        total={data.stats.total}
        respondieron={data.stats.respondieron}
        interesados={data.stats.interesados}
        demos={data.stats.demos}
        conAds={data.stats.conAds}
        recomendados={data.stats.recomendados}
        conEmail={data.stats.conEmail}
        conLinkedin={data.stats.conLinkedin}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-6">
          <Funnel stages={data.funnel} />

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Distribución de score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Alta (8-10)", value: data.scoreDistribution.alta, color: "bg-emerald-500" },
                { label: "Media (5-7)", value: data.scoreDistribution.media, color: "bg-amber-500" },
                { label: "Baja (3-4)", value: data.scoreDistribution.baja, color: "bg-orange-500" },
                { label: "Descartar (0-2)", value: data.scoreDistribution.descartar, color: "bg-red-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="flex-1 text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold tabular-nums">{item.value}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                    {totalProspects > 0 ? Math.round((item.value / totalProspects) * 100) : 0}%
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <ActivityFeed activity={data.activity} />

          {/* Categorías Google Maps */}
          {data.categoryDistribution.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Top categorías Google Maps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {data.categoryDistribution.map((item) => {
                  const pct = Math.round((item.count / totalProspects) * 100)
                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate flex-1 pr-2">{item.category}</span>
                        <span className="font-semibold tabular-nums flex-shrink-0">{item.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{ width: `${Math.min(100, (item.count / (data.categoryDistribution[0]?.count || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Campañas activas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.activeCampaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{campaign.nombre}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {NICHO_LABELS[campaign.nicho] || campaign.nicho}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {campaign.prospects_count ?? 0} prospectos · Score min. {campaign.score_minimo}
                      </span>
                    </div>
                  </div>
                  <Badge variant="success">Activa</Badge>
                </div>
              ))}
              {data.activeCampaigns.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No hay campañas activas</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
