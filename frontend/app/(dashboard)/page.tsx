import { StatsGrid } from "@/components/dashboard/StatsGrid"
import { Funnel } from "@/components/dashboard/Funnel"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  getMockStats,
  getMockFunnelData,
  MOCK_ACTIVITY,
  MOCK_CAMPAIGNS,
  MOCK_PROSPECTS,
  NICHO_LABELS,
} from "@/lib/mock-data"

export default function DashboardPage() {
  const stats = getMockStats()
  const funnel = getMockFunnelData()

  const activeCampaigns = MOCK_CAMPAIGNS.filter((c) => c.estado === "activa")

  // Score distribution for mini chart
  const scoreDistribution = {
    alta: MOCK_PROSPECTS.filter((p) => p.score_etiqueta === "Alta").length,
    media: MOCK_PROSPECTS.filter((p) => p.score_etiqueta === "Media").length,
    baja: MOCK_PROSPECTS.filter((p) => p.score_etiqueta === "Baja").length,
    descartar: MOCK_PROSPECTS.filter((p) => p.score_etiqueta === "Descartar").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de actividad comercial
        </p>
      </div>

      {/* KPIs */}
      <StatsGrid
        total={stats.total}
        respondieron={stats.respondieron}
        interesados={stats.interesados}
        demos={stats.demos}
      />

      {/* Fila principal: Embudo + Actividad */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-6">
          <Funnel stages={funnel} />

          {/* Distribución de scores */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Distribución de score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Alta (8-10)", value: scoreDistribution.alta, color: "bg-emerald-500", total: MOCK_PROSPECTS.length },
                { label: "Media (5-7)", value: scoreDistribution.media, color: "bg-amber-500", total: MOCK_PROSPECTS.length },
                { label: "Baja (3-4)", value: scoreDistribution.baja, color: "bg-orange-500", total: MOCK_PROSPECTS.length },
                { label: "Descartar (0-2)", value: scoreDistribution.descartar, color: "bg-red-500", total: MOCK_PROSPECTS.length },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="flex-1 text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold tabular-nums">{item.value}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                    {item.total > 0 ? Math.round((item.value / item.total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <ActivityFeed activity={MOCK_ACTIVITY} />

          {/* Campañas activas */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Campañas activas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeCampaigns.map((campaign) => {
                const prospectsCount = MOCK_PROSPECTS.filter(
                  (p) => p.campaign_id === campaign.id
                ).length

                return (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{campaign.nombre}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {NICHO_LABELS[campaign.nicho]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {prospectsCount} prospectos · Score min. {campaign.score_minimo}
                        </span>
                      </div>
                    </div>
                    <Badge variant="success">Activa</Badge>
                  </div>
                )
              })}
              {activeCampaigns.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay campañas activas
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
