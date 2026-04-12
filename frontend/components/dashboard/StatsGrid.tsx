import { Card, CardContent } from "@/components/ui/card"
import { Users, MessageCircle, Star, Monitor, Megaphone, ThumbsUp, Mail, Linkedin } from "lucide-react"

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  change?: string
  changePositive?: boolean
}

function StatCard({ title, value, icon, change, changePositive }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tabular-nums">{value}</p>
            {change && (
              <p className={`text-xs font-medium ${changePositive ? "text-emerald-500" : "text-muted-foreground"}`}>
                {change}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface Props {
  total: number
  respondieron: number
  interesados: number
  demos: number
  // V2 métricas
  conAds?: number
  recomendados?: number
  conEmail?: number
  conLinkedin?: number
}

export function StatsGrid({ total, respondieron, interesados, demos, conAds, recomendados, conEmail, conLinkedin }: Props) {
  const hasV2Stats = conAds != null || recomendados != null || conEmail != null || conLinkedin != null

  return (
    <div className="space-y-4">
      {/* Fila 1: métricas de pipeline */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total prospectos"
          value={total}
          icon={<Users className="h-6 w-6 text-blue-400" />}
          change="+4 esta semana"
          changePositive
        />
        <StatCard
          title="Respondieron"
          value={respondieron}
          icon={<MessageCircle className="h-6 w-6 text-indigo-400" />}
          change={`${total > 0 ? Math.round((respondieron / total) * 100) : 0}% del total`}
        />
        <StatCard
          title="Interesados"
          value={interesados}
          icon={<Star className="h-6 w-6 text-amber-400" />}
          change={`${respondieron > 0 ? Math.round((interesados / respondieron) * 100) : 0}% de respuestas`}
          changePositive
        />
        <StatCard
          title="Demos enviadas"
          value={demos}
          icon={<Monitor className="h-6 w-6 text-emerald-400" />}
          change={`${interesados > 0 ? Math.round((demos / interesados) * 100) : 0}% de interesados`}
          changePositive
        />
      </div>

      {/* Fila 2: métricas V2 scraper */}
      {hasV2Stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Invierten en Ads"
            value={conAds ?? 0}
            icon={<Megaphone className="h-6 w-6 text-purple-400" />}
            change={total > 0 ? `${Math.round(((conAds ?? 0) / total) * 100)}% del total` : undefined}
          />
          <StatCard
            title="Recomendados scraper"
            value={recomendados ?? 0}
            icon={<ThumbsUp className="h-6 w-6 text-green-400" />}
            change={total > 0 ? `${Math.round(((recomendados ?? 0) / total) * 100)}% del total` : undefined}
            changePositive
          />
          <StatCard
            title="Con email"
            value={conEmail ?? 0}
            icon={<Mail className="h-6 w-6 text-blue-300" />}
            change={total > 0 ? `${Math.round(((conEmail ?? 0) / total) * 100)}% del total` : undefined}
            changePositive
          />
          <StatCard
            title="Con LinkedIn"
            value={conLinkedin ?? 0}
            icon={<Linkedin className="h-6 w-6 text-blue-500" />}
            change={total > 0 ? `${Math.round(((conLinkedin ?? 0) / total) * 100)}% del total` : undefined}
            changePositive
          />
        </div>
      )}
    </div>
  )
}
