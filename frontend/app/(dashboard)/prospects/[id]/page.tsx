interface Props {
  params: { id: string }
}

export default function ProspectDetailPage({ params }: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Detalle del Prospecto</h1>
      {/* ProspectDetail — se implementará en Fase 1 */}
      <p className="text-muted-foreground">ID: {params.id}</p>
    </div>
  )
}
