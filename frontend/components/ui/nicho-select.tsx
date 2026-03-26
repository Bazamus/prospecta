"use client"

import { useNichos } from "@/lib/hooks/use-nichos"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface Props {
  value: string
  onValueChange: (v: string) => void
  includeAll?: boolean
  allLabel?: string
  className?: string
}

export function NichoSelect({ value, onValueChange, includeAll, allLabel = "Todos los nichos", className }: Props) {
  const { nichos } = useNichos()

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}><SelectValue /></SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">{allLabel}</SelectItem>}
        {nichos.filter((n) => n.activo).map((n) => (
          <SelectItem key={n.slug} value={n.slug}>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: n.color }} />
              {n.nombre}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
