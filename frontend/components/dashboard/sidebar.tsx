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
import { ThemeToggle } from "@/components/theme-toggle"
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
      <aside className="flex h-full w-64 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))]">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[hsl(var(--sidebar-foreground))]">
            Prospecta
          </span>
        </div>

        <Separator className="bg-[hsl(var(--sidebar-border))]" />

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
                        ? "bg-emerald-600/15 text-emerald-600 dark:text-emerald-500"
                        : "text-muted-foreground hover:bg-[hsl(var(--sidebar-accent))] hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {item.label}
                    {item.label === "WhatsApp" && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600/20 px-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-500">
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

        <Separator className="bg-[hsl(var(--sidebar-border))]" />

        {/* Footer — usuario + theme toggle */}
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600/20 text-sm font-semibold text-emerald-600 dark:text-emerald-500">
            D
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-[hsl(var(--sidebar-foreground))]">David</p>
            <p className="truncate text-xs text-muted-foreground">Freelance</p>
          </div>
          <ThemeToggle />
          <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
