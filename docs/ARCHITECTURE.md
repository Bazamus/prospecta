# Arquitectura y Decisiones Técnicas — ProspectFlow

---

## Decisiones de stack

### ¿Por qué Next.js 14 y no React + Vite?

Las demos existentes (aisla_partes, partes_insta) están en React + Vite y se mantienen así.
ProspectFlow arranca en Next.js 14 por tres razones concretas:

1. **API routes integradas** — el backend de envío de emails, llamadas a Claude API y webhooks de Evolution API viven en el mismo proyecto, sin servidor separado
2. **Middleware de Supabase Auth** — protección de rutas sin configuración adicional
3. **Vercel es el creador de Next.js** — el deploy es prácticamente automático y sin fricciones

### ¿Por qué Supabase y no otra BD?

- Stack ya conocido y en uso en otros proyectos
- Auth integrado, sin necesidad de implementar sistema propio
- Row Level Security nativo — preparado para multitenancy en Fase 4 sin migraciones
- Dashboard visual para gestión directa de datos durante el desarrollo
- Client-side y server-side SDKs para Next.js

### ¿Por qué Claude API para el scoring?

- Capacidad de razonamiento contextual: no es una clasificación por palabras clave, es un análisis real del perfil de la empresa
- La justificación generada es legible y útil para el usuario
- El mismo modelo se reutiliza para generar mensajes, manteniendo coherencia de contexto
- Fácil de ajustar mediante prompt engineering sin tocar código

---

## Estructura de carpetas — Frontend (Next.js 14)

```
frontend/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Layout con sidebar
│   │   ├── page.tsx                # Dashboard principal
│   │   ├── prospects/
│   │   │   ├── page.tsx            # Lista de prospectos
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Detalle de prospecto
│   │   ├── campaigns/
│   │   │   ├── page.tsx            # Lista de campañas
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Detalle de campaña
│   │   ├── messages/
│   │   │   └── page.tsx            # Generador y bandeja
│   │   └── templates/
│   │       └── page.tsx            # Gestión de plantillas
│   └── api/
│       ├── prospects/
│       │   ├── import/route.ts     # POST — importar CSV
│       │   └── score/route.ts      # POST — scoring IA
│       ├── messages/
│       │   ├── generate/route.ts   # POST — generar mensaje IA
│       │   ├── send-email/route.ts # POST — enviar email Resend
│       │   └── send-whatsapp/route.ts # POST — enviar WA Evolution
│       └── webhooks/
│           └── resend/route.ts     # POST — webhooks de Resend
├── components/
│   ├── ui/                         # Componentes Shadcn/ui
│   ├── prospects/
│   │   ├── ProspectTable.tsx
│   │   ├── ProspectDetail.tsx
│   │   ├── ImportModal.tsx
│   │   └── ScoreCard.tsx
│   ├── campaigns/
│   │   ├── CampaignCard.tsx
│   │   └── CampaignForm.tsx
│   ├── messages/
│   │   ├── MessageGenerator.tsx
│   │   └── MessageHistory.tsx
│   └── dashboard/
│       ├── StatsGrid.tsx
│       ├── Funnel.tsx
│       └── ActivityFeed.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Cliente Supabase browser
│   │   └── server.ts               # Cliente Supabase server
│   ├── claude.ts                   # Wrapper Claude API
│   ├── resend.ts                   # Wrapper Resend
│   └── evolution.ts                # Wrapper Evolution API
├── types/
│   └── index.ts                    # Tipos TypeScript globales
└── middleware.ts                   # Auth middleware Supabase
```

---

## Flujo de scoring IA — Detalle técnico

```
Usuario sube CSV
      ↓
API route /api/prospects/import
      ↓
Parseo y validación del CSV
      ↓
Para cada fila → llamada a /api/prospects/score
      ↓
Claude API recibe:
  - System prompt: instrucciones de scoring por nicho
  - User message: datos completos de la empresa en JSON
      ↓
Claude devuelve JSON con:
  {
    "score": 7.8,
    "etiqueta": "Alta",
    "justificacion": "Empresa activa con web propia..."
  }
      ↓
Datos enriquecidos se muestran al usuario para revisión
      ↓
Usuario filtra y confirma importación
      ↓
INSERT en Supabase solo con registros aprobados
```

**Prompt de scoring — estructura:**

```
System: Eres un analizador de prospectos comerciales especializado en [NICHO].
Tu tarea es evaluar si una empresa es un buen candidato para contactar y ofrecerle [PRODUCTO].

Devuelve ÚNICAMENTE un JSON con este formato exacto:
{
  "score": <número entre 0 y 10 con un decimal>,
  "etiqueta": <"Alta" | "Media" | "Baja" | "Descartar">,
  "justificacion": <string de 1-2 frases explicando el razonamiento>
}

Criterios de puntuación:
- 8-10 (Alta): Empresa claramente del sector, activa, con señales de volumen
- 5-7 (Media): Encaje probable pero con incertidumbre
- 3-4 (Baja): Encaje dudoso, contactar solo si no hay mejores opciones
- 0-2 (Descartar): Fuera del sector, inactiva o sin datos suficientes

User: [JSON con los datos de la empresa]
```

---

## Variables de entorno necesarias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Claude API
ANTHROPIC_API_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Evolution API (ya desplegada)
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=

# App
NEXT_PUBLIC_APP_URL=
```

---

## CSV estandarizado — Formato de importación

El CSV de importación debe seguir esta estructura. Las columnas marcadas con * son obligatorias.

```
nombre_empresa*   | text
nicho*            | climatizacion | instalaciones | energia | otro
email*            | email válido
telefono          | texto libre
direccion         | texto libre
contacto_nombre   | texto libre
contacto_cargo    | texto libre
web               | URL
valoracion_google | número decimal (ej: 4.3)
num_resenas       | número entero
notas             | texto libre
```

**Ejemplo de fila:**
```
Climatizaciones Pérez S.L.,climatizacion,info@climaperez.es,+34 963 123 456,Calle Mayor 12 Valencia,Juan Pérez,Gerente,www.climaperez.es,4.3,87,Empresa familiar con 15 años
```

---

## Integraciones externas — Referencias

### Resend
- Docs: https://resend.com/docs
- SDK: `npm install resend`
- Webhook para tracking de aperturas: configurar en dashboard de Resend → endpoint `/api/webhooks/resend`

### Evolution API
- Ya desplegada en VPS EasyPanel
- Instancia configurada en proyectos A360/ACLIMAR
- Endpoint base: variable `EVOLUTION_API_URL`
- Documentación: https://doc.evolution-api.com

### Claude API
- Modelo: `claude-sonnet-4-5` (relación calidad/coste óptima para este caso)
- Max tokens scoring: 300 (respuesta JSON corta)
- Max tokens mensajes: 800
- Docs: https://docs.anthropic.com

---

*ProspectFlow — Arquitectura interna · 2026*
