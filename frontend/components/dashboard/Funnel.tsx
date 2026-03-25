import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface FunnelStage {
  label: string
  value: number
  color: string
}

interface Props {
  stages: FunnelStage[]
}

export function Funnel({ stages }: Props) {
  const maxValue = Math.max(...stages.map((s) => s.value), 1)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Embudo comercial</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage, i) => {
          const prevValue = i > 0 ? stages[i - 1].value : null
          const conversionRate =
            prevValue && prevValue > 0
              ? Math.round((stage.value / prevValue) * 100)
              : null

          return (
            <div key={stage.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{stage.value}</span>
                  {conversionRate !== null && (
                    <span className="text-[10px] text-muted-foreground">
                      ({conversionRate}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", stage.color)}
                  style={{
                    width: `${Math.max((stage.value / maxValue) * 100, stage.value > 0 ? 4 : 0)}%`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
