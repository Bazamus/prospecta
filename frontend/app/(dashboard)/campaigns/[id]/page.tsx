interface Props {
  params: { id: string }
}

export default function CampaignDetailPage({ params }: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Detalle de Campaña</h1>
      {/* Detalle con prospectos y mensajes — se implementará en Fase 1 */}
      <p className="text-muted-foreground">ID: {params.id}</p>
    </div>
  )
}
