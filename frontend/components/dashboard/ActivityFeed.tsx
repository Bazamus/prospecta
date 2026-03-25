import type { ActivityLog } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Zap,
  Mail,
  MessageCircle,
  Reply,
  StickyNote,
  ArrowRightLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

const TIPO_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  scoring: {
    icon: <Zap className="h-3.5 w-3.5" />,
    color: "bg-violet-500/15 text-violet-500",
  },
  email: {
    icon: <Mail className="h-3.5 w-3.5" />,
    color: "bg-blue-500/15 text-blue-500",
  },
  whatsapp: {
    icon: <MessageCircle className="h-3.5 w-3.5" />,
    color: "bg-emerald-500/15 text-emerald-500",
  },
  respuesta: {
    icon: <Reply className="h-3.5 w-3.5" />,
    color: "bg-amber-500/15 text-amber-500",
  },
  nota: {
    icon: <StickyNote className="h-3.5 w-3.5" />,
    color: "bg-slate-500/15 text-slate-400",
  },
  estado: {
    icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
    color: "bg-indigo-500/15 text-indigo-500",
  },
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date("2026-03-25T12:00:00Z")
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return "Ahora"
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `Hace ${diffDays} días`
  return `Hace ${Math.floor(diffDays / 7)} sem.`
}

interface Props {
  activity: ActivityLog[]
  limit?: number
}

export function ActivityFeed({ activity, limit = 8 }: Props) {
  const sorted = [...activity]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Actividad reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {sorted.map((item) => {
            const config = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.nota

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/50"
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
                    config.color
                  )}
                >
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{item.descripcion}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatRelativeDate(item.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
