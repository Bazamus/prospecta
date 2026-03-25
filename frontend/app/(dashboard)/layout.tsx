export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — se implementará en Fase 1 */}
      <aside className="w-64 border-r flex-shrink-0" />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
