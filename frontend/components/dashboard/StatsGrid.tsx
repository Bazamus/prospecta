import { Card, CardContent } from "@/components/ui/card"
import { Users, MessageCircle, Star, Monitor } from "lucide-react"

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
              <p
                className={`text-xs font-medium ${
                  changePositive ? "text-emerald-500" : "text-muted-foreground"
                }`}
              >
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
}

export function StatsGrid({ total, respondieron, interesados, demos }: Props) {
  return (
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
  )
}
