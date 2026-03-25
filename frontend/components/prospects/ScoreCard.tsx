import type { ScoreEtiqueta } from "@/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface Props {
  score: number
  etiqueta: ScoreEtiqueta
  justificacion: string
  compact?: boolean
}

const ETIQUETA_CONFIG: Record<
  ScoreEtiqueta,
  { variant: "success" | "warning" | "danger" | "destructive"; bg: string }
> = {
  Alta: { variant: "success", bg: "bg-emerald-500" },
  Media: { variant: "warning", bg: "bg-amber-500" },
  Baja: { variant: "danger", bg: "bg-orange-500" },
  Descartar: { variant: "destructive", bg: "bg-red-500" },
}

function ScoreIcon({ etiqueta }: { etiqueta: ScoreEtiqueta }) {
  switch (etiqueta) {
    case "Alta":
      return <TrendingUp className="h-4 w-4 text-emerald-500" />
    case "Media":
      return <Minus className="h-4 w-4 text-amber-500" />
    case "Baja":
    case "Descartar":
      return <TrendingDown className="h-4 w-4 text-red-500" />
  }
}

export function ScoreBadge({ score, etiqueta }: { score: number; etiqueta: ScoreEtiqueta }) {
  const config = ETIQUETA_CONFIG[etiqueta]
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <div
          className={cn("h-2 w-2 rounded-full", config.bg)}
        />
        <span className="text-sm font-semibold tabular-nums">{score.toFixed(1)}</span>
      </div>
      <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">
        {etiqueta}
      </Badge>
    </div>
  )
}

export function ScoreCard({ score, etiqueta, justificacion, compact = false }: Props) {
  const config = ETIQUETA_CONFIG[etiqueta]

  if (compact) {
    return <ScoreBadge score={score} etiqueta={etiqueta} />
  }

  return (
    <Card className="overflow-hidden">
      <div className={cn("h-1", config.bg)} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold tabular-nums tracking-tight">
                {score.toFixed(1)}
              </span>
              <span className="text-lg text-muted-foreground">/10</span>
              <Badge variant={config.variant} className="ml-1">
                {etiqueta}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {justificacion}
            </p>
          </div>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
            <ScoreIcon etiqueta={etiqueta} />
          </div>
        </div>

        {/* Barra visual del score */}
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full transition-all", config.bg)}
              style={{ width: `${(score / 10) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
