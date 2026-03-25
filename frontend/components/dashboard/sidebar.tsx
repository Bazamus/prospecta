"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Mail,
  MessageCircle,
  FileText,
  Zap,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/prospects", label: "Prospectos", icon: Users },
  { href: "/campaigns", label: "Campañas", icon: Megaphone },
  { href: "/messages", label: "Mensajes", icon: Mail },
  { href: "/messages?canal=whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/templates", label: "Plantillas", icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className="flex h-full w-64 flex-col border-r"
        style={{
          backgroundColor: "hsl(var(--sidebar))",
          borderColor: "hsl(var(--sidebar-border))",
        }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Prospecta</span>
        </div>

        <Separator style={{ backgroundColor: "hsl(var(--sidebar-border))" }} />

        {/* Navegación */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href.split("?")[0])
            const Icon = item.icon

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-emerald-600/15 text-emerald-500"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    style={
                      !isActive
                        ? { ["--tw-bg-opacity" as string]: "0.05" }
                        : undefined
                    }
                    onMouseEnter={(e) => {
                      if (!isActive)
                        e.currentTarget.style.backgroundColor =
                          "hsl(var(--sidebar-accent))"
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        e.currentTarget.style.backgroundColor = "transparent"
                    }}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {item.label}
                    {item.label === "WhatsApp" && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600/20 px-1.5 text-[10px] font-semibold text-emerald-500">
                        3
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="hidden lg:hidden">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        <Separator style={{ backgroundColor: "hsl(var(--sidebar-border))" }} />

        {/* Footer — usuario */}
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600/20 text-sm font-semibold text-emerald-500">
            D
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">David</p>
            <p className="truncate text-xs text-muted-foreground">Freelance</p>
          </div>
          <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
