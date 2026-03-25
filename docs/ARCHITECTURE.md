# Arquitectura y Decisiones Técnicas — Prospecta

---

## Decisiones de stack

### ¿Por qué Next.js 14 y no React + Vite?

Las demos existentes (aisla_partes, partes_insta) están en React + Vite y se mantienen así.
Prospecta arranca en Next.js 14 por tres razones concretas:

1. **API routes integradas** — el backend de envío de emails, llamadas a Claude API y webhooks de Evolution API viven en el mismo proyecto, sin servidor separado
2. **NextAuth** — protección de rutas con sesión simple, sin dependencia de Supabase Auth
3. **Vercel es el creador de Next.js** — el deploy es prácticamente automático y sin fricciones

### ¿Por qué Neon y no Supabase?

- Supabase cobra por proyecto adicional en plan Pro — inviable para múltiples demos
- Neon ofrece hasta 10 proyectos gratuitos en PostgreSQL 17
- Compatible 100% con el schema SQL existente
- Sin límite de proyectos en desarrollo — ideal para escalar demos por nicho
- Conexión directa desde Next.js via `@neondatabase/serverless` o `pg`

### ¿Por qué Claude API para el scoring?

- Capacidad de razonamiento contextual: no es una clasificación por palabras clave, es un análisis real del perfil de la empresa
- La justificación generada es legible y útil para el usuario
- El mismo modelo se reutiliza para generar mensajes, manteniendo coherencia de contexto
- Puede analizar el XML de reseñas de Google Maps para extraer señales cualitativas
- Fácil de ajustar mediante prompt engineering sin tocar código

---

## Formato de importación CSV/Excel — Referencia

El archivo de referencia es `docs/ejemplo_import.xlsx` — formato con **una fila por negocio**.

### Columnas disponibles y su uso

| Columna Excel | Campo en BD | Uso |
|---------------|-------------|-----|
| Nombre | `nombre_empresa` | Obligatorio |
| Categoría | `nicho` | Mapeo automático por categoría |
| Rating | `valoracion_google` | Input scoring IA |
| Nº Reviews | `num_resenas` | Input scoring IA |
| ReviewsText | — | Input scoring IA (XML con reseñas) |
| Horario | — | Input scoring IA (negocio activo/inactivo) |
| Descripción | — | Input scoring IA |
| Direccion | `direccion` | Dirección completa |
| Localidad | parte de `direccion` | Segmentación geográfica |
| Provincia | parte de `direccion` | Segmentación geográfica |
| Website | `web` | Input scoring IA (madurez digital) |
| Teléfono | `telefono` | Contacto |
| email | `email` | Contacto (único, obligatorio) |
| Latitud / Longitud | — | Descartado |
| Iframe / Imagen Url | — | Descartado |
| hash / id / Saved | — | Descartado |

### Procesamiento del campo ReviewsText

El campo `ReviewsText` contiene XML con las reseñas de Google Maps:

```xml
<reviews>
  <review>
    <user>Nombre usuario</user>
    <stars>5</stars>
    <userComment>Texto de la reseña...</userComment>
  </review>
</reviews>
```

El importador parsea este XML y concatena los comentarios como texto plano para enviarlo como contexto adicional a la Claude API durante el scoring.

### Mapeo de Categoría → Nicho

| Categoría Google Maps | Nicho en BD |
|----------------------|-------------|
| Carpintería metálica y de aluminio | `instalaciones` |
| Climatización / Aire acondicionado | `climatizacion` |
| Instalaciones técnicas | `instalaciones` |
| Gestión energética / Energía solar | `energia` |
| Resto de categorías | `otro` |

> Este mapeo es configurable en `lib/import/nicho-mapping.ts`

---

## Flujo de importación con scoring IA

```
Excel/CSV subido por usuario
        ↓
API route /api/prospects/import
        ↓
Parseo del archivo (xlsx → JSON)
        ↓
Deduplicación por email o nombre_empresa
        ↓
Para cada empresa → /api/prospects/score
        ↓
Claude API recibe:
  - Nombre, categoría, rating, nº reseñas
  - Website (¿tiene web propia?)
  - Horario (¿está activo?)
  - ReviewsText parseado (texto de reseñas)
  - Nicho objetivo de la campaña
        ↓
Claude devuelve JSON:
  { "score": 7.8, "etiqueta": "Alta", "justificacion": "..." }
        ↓
Tabla previa de revisión en UI
        ↓
Usuario filtra por score mínimo y confirma
        ↓
INSERT en Neon solo con registros aprobados
```

### Prompt de scoring — estructura

```
System: Eres un analizador de prospectos comerciales especializado en [NICHO].
Tu tarea es evaluar si una empresa es un buen candidato para contactarle
y ofrecerle [PRODUCTO].

Devuelve ÚNICAMENTE un JSON con este formato exacto:
{
  "score": <número entre 0 y 10 con un decimal>,
  "etiqueta": <"Alta" | "Media" | "Baja" | "Descartar">,
  "justificacion": <string de 1-2 frases explicando el razonamiento>
}

Criterios:
- 8-10 (Alta): Empresa del sector, activa, volumen suficiente, tiene web
- 5-7 (Media): Encaje probable pero con incertidumbre
- 3-4 (Baja): Encaje dudoso
- 0-2 (Descartar): Fuera del sector, inactiva o sin datos suficientes

User: [JSON con datos de la empresa + texto de reseñas]
```

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
│       │   ├── import/route.ts     # POST — importar Excel/CSV
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
│   │   ├── ImportModal.tsx         # Upload Excel + previsualización scoring
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
│   ├── db/
│   │   └── neon.ts                 # Cliente Neon (pg / @neondatabase/serverless)
│   ├── import/
│   │   ├── parser.ts               # Parseo Excel → JSON
│   │   ├── nicho-mapping.ts        # Mapeo categoría Google → nicho BD
│   │   └── reviews-parser.ts      # Parser XML de ReviewsText
│   ├── claude.ts                   # Wrapper Claude API (scoring + mensajes)
│   ├── resend.ts                   # Wrapper Resend
│   └── evolution.ts                # Wrapper Evolution API
├── types/
│   └── index.ts                    # Tipos TypeScript globales
└── middleware.ts                   # Auth middleware NextAuth
```

---

## Variables de entorno necesarias

```env
# Neon (PostgreSQL)
DATABASE_URL=postgresql://user:password@host.neon.tech/prospecta?sslmode=require

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Claude API
ANTHROPIC_API_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Evolution API (ya desplegada en VPS)
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Integraciones externas — Referencias

### Neon
- Docs: https://neon.tech/docs
- SDK recomendado: `@neondatabase/serverless` (optimizado para serverless/Vercel)
- Alternativa: `pg` con connection pooling

### Resend
- Docs: https://resend.com/docs
- SDK: `npm install resend`
- Webhook tracking: configurar en Resend dashboard → `/api/webhooks/resend`

### Evolution API
- Ya desplegada en VPS EasyPanel
- Instancia configurada en proyectos A360/ACLIMAR
- Docs: https://doc.evolution-api.com

### Claude API
- Modelo: `claude-sonnet-4-5`
- Max tokens scoring: 300
- Max tokens mensajes: 800
- Docs: https://docs.anthropic.com

---

*Prospecta — Arquitectura interna · v1.2 · 2026*
