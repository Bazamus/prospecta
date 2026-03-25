# PRD — ProspectFlow
## Documento de Requisitos de Producto · v1.1 · 2026

---

## 1. Visión del Proyecto

**ProspectFlow** es una herramienta interna de gestión comercial diseñada para automatizar y escalar el proceso de prospección hacia empresas de nicho en sectores poco digitalizados.

Nace de la necesidad de conectar demos de producto ya desarrolladas con clientes potenciales de forma sistemática, personalizada y medible.

> **El problema no es el producto — las demos existen y son sólidas. El problema es la ausencia de un sistema comercial que lleve esas demos al mercado de forma estructurada y repetible.**

El sistema permite importar bases de datos de empresas, analizarlas con IA para determinar su idoneidad como prospectos, segmentarlas por nicho y prioridad, generar comunicaciones altamente personalizadas, enviarlas por email y WhatsApp, y gestionar todo el ciclo de respuestas dentro de un único entorno.

### Productos demo que impulsan la prospección

| Producto | Sector objetivo | Estado |
|----------|----------------|--------|
| Partes de conductos | Climatización / Aislamiento térmico | Demo lista |
| Partes de instalaciones | Instalaciones técnicas | Demo lista |
| Gestión energética A360 | Empresas de energía | En desarrollo |

### Usuario principal

David (freelance), responsable único del ciclo comercial completo. Herramienta de uso individual intensivo, optimizada para gestionar volumen con mínimo tiempo de administración.

---

## 2. Objetivos

### Objetivo primario

Reducir el tiempo dedicado a prospección manual y aumentar el volumen de contactos cualificados de forma sostenible, apoyando directamente la comercialización de los productos demo desarrollados.

### Objetivos secundarios

- Calificar automáticamente cada prospecto con IA antes de iniciar contacto
- Personalizar cada comunicación según el nicho, perfil y scoring del prospecto
- Centralizar el seguimiento de todos los contactos en un único sistema
- Automatizar los flujos de respuesta según el comportamiento del prospecto
- Construir una base de conocimiento comercial reutilizable por nicho

### KPIs iniciales

| Métrica | Descripción |
|---------|-------------|
| Prospectos contactados/semana | Volumen de alcance semanal por canal |
| Score medio de la base | Calidad media de los prospectos importados |
| Tasa de apertura email | Efectividad del asunto y remitente |
| Tasa de respuesta (email / WA) | Comparativa de rendimiento por canal |
| Conversión a reunión o demo | Objetivo final del proceso comercial |

---

## 3. Alcance del MVP

El MVP incluye las funcionalidades mínimas que permiten iniciar campañas reales desde el primer día, **incluyendo el scoring IA como parte del flujo de importación**.

### Incluido en MVP

- Importación de empresas vía CSV estandarizado
- Análisis y scoring automático de idoneidad por IA
- Visualización y gestión de prospectos con filtros por score, nicho y estado
- Segmentación por nicho y creación de campañas
- Generación de mensajes personalizados con IA (Claude API)
- Envío de emails individuales vía Resend
- Envío de WhatsApp vía Evolution API
- Registro de estado por prospecto
- Dashboard con métricas básicas y embudo comercial

### Excluido del MVP

- Automatizaciones avanzadas de n8n (Fase 2)
- Integración con Chatwoot (Fase 2)
- Módulo de redes sociales (Fase 3)
- Multiusuario y multitenancy (Fase 4)

---

## 4. Módulos Funcionales

### 4.1 Importación de Prospectos

Acepta archivos CSV con esquema estandarizado derivado de exportaciones de Google Maps o bases de datos propias.

**Campos mínimos requeridos:**
- Nombre de empresa
- Sector / nicho
- Dirección
- Email
- Teléfono

**Campos opcionales:**
- Persona de contacto y cargo
- Web
- Valoración Google y número de reseñas
- Notas adicionales

**Flujo de importación:**

```
Carga CSV → Validación → Análisis IA (scoring) → Revisión usuario → Importación
```

El sistema detecta duplicados por email o nombre de empresa. Tras el scoring, el usuario filtra por score antes de confirmar qué registros entran en la base.

---

### 4.2 Módulo de Scoring IA — Análisis de Idoneidad

> **Módulo de mayor valor diferencial del sistema.** Convierte una lista bruta de empresas en una base de prospectos cualificada y priorizada antes de iniciar cualquier contacto.

#### Datos de entrada analizados por la IA

| Campo | Señal que aporta |
|-------|-----------------|
| Nombre y categoría del negocio | Valida el encaje real con el producto ofrecido |
| Valoración y número de reseñas | Indicador de actividad, volumen y madurez |
| Existencia de web propia | Señal de madurez digital y receptividad tecnológica |
| Horario de apertura | Diferencia negocios activos de inactivos |
| Zona geográfica | Permite priorizar zonas estratégicas |
| Persona de contacto y cargo | Si existe, aumenta significativamente la puntuación |

#### Output del análisis por empresa

| Elemento | Descripción | Ejemplo |
|----------|-------------|---------|
| Puntuación 0-10 | Índice numérico de idoneidad global | 8.4 / 10 |
| Etiqueta de prioridad | Clasificación operativa | Alta / Media / Baja / Descartar |
| Justificación | Párrafo explicando el razonamiento | "Empresa activa con web, 127 reseñas positivas, categoría exacta del nicho objetivo..." |

#### Integración con el generador de mensajes

La justificación generada por el scoring se convierte en contexto de entrada para el módulo de mensajes. Si la IA ya sabe por qué esa empresa es un buen prospecto, el mensaje generado es significativamente más preciso que uno basado solo en el nombre y el nicho.

---

### 4.3 Segmentación y Campañas

Los prospectos se agrupan en campañas. Cada campaña tiene:
- Nicho específico asociado
- Canal principal (email, WhatsApp o ambos)
- Plantilla de comunicación
- **Score mínimo configurable** — solo entran empresas que superan el umbral

Una empresa puede pertenecer a varias campañas.

---

### 4.4 Generador de Mensajes con IA

Usa Claude API para generar mensajes personalizados. Inputs del generador:

- Nicho de la empresa
- Nombre y cargo del contacto (si existe)
- Producto demo que se ofrece
- Tono configurado (formal / cercano / técnico)
- **Scoring y justificación de idoneidad**

El usuario puede revisar, editar o regenerar con instrucciones adicionales antes del envío.

Las plantillas base se gestionan desde un módulo específico donde se definen las instrucciones del sistema para cada nicho y producto.

---

### 4.5 Envío por Email — Resend

- Envío individual, nunca en bloque
- Registro de fecha, estado de entrega y métricas de apertura
- Límite de envíos diarios configurable para proteger la reputación del dominio

---

### 4.6 Envío por WhatsApp — Evolution API

- Mensaje personalizado generado por IA, revisado por el usuario, enviado individualmente
- Integración con Evolution API ya desplegada
- Si el prospecto no respondió por email en X días, el sistema sugiere cambio a WhatsApp
- El mensaje puede incluir enlace directo a la demo del nicho correspondiente

---

### 4.7 Gestión de Respuestas y Seguimiento

Cada prospecto tiene una vista de detalle con:
- Historial completo de mensajes enviados (canal, fecha, contenido)
- Score inicial y justificación
- Respuestas recibidas
- Estado actual y notas manuales

**Estados del prospecto:**

```
Sin contactar → Contactado → Respondió → Interesado → Demo enviada → Cerrado
                                        ↘ No interesado / Descartado
```

En Fase 2, Chatwoot centraliza la gestión de respuestas entrantes de ambos canales.

---

### 4.8 Dashboard y Métricas

Vista principal con:
- KPIs globales (total prospectos, respondieron, interesados, demos enviadas)
- Distribución por score, nicho y estado
- Actividad reciente
- Rendimiento por campaña
- Embudo comercial completo

---

## 5. Flujos de Automatización — n8n (Fase 2)

| Flujo | Descripción |
|-------|-------------|
| Seguimiento automático | Si no hay respuesta en N días, lanza segundo contacto por canal alternativo |
| Clasificación de respuesta | Analiza el contenido de la respuesta con IA y actualiza el estado automáticamente |
| Notificación en tiempo real | Alerta inmediata cuando un prospecto responde |
| Reporte semanal | Resumen automático de actividad cada lunes |
| Escalado de canal | Detecta prospectos sin respuesta por email y sugiere WhatsApp |

---

## 6. Módulo de Redes Sociales — Fase 3

Generador de contenido de autoridad para LinkedIn y X, diseñado para reforzar la estrategia de prospección. Cuando un prospecto busca el perfil del remitente, encontrar contenido relevante aumenta la tasa de respuesta.

### Funcionalidades

- Generador de posts con IA basado en el nicho y producto en comercialización
- Calendario editorial semanal/mensual
- Historial de publicaciones con métricas básicas
- Publicación vía n8n + Buffer como puente a las APIs

### Situación de las APIs

| Red social | Situación | Solución |
|------------|-----------|----------|
| LinkedIn | API limitada, requiere aprobación de partner | n8n + Buffer como intermediario |
| X / Twitter | De pago desde 2023 (~$100/mes) | Buffer en plan básico |

---

## 7. Stack Tecnológico

| Componente | Tecnología | Justificación |
|------------|------------|---------------|
| Frontend | Next.js 14 + Tailwind + Shadcn/ui | API routes integradas, middleware Supabase nativo, optimizado para Vercel |
| Base de datos | Supabase (PostgreSQL) | Stack conocido, Auth integrado, soporte multitenancy futuro con RLS |
| Deploy | Vercel | Integración nativa con Next.js, previews automáticos |
| Email | Resend | Envío transaccional, métricas de apertura, API simple |
| WhatsApp | Evolution API | Ya desplegada, integración testada en otros proyectos |
| IA — Scoring | Claude API | Análisis contextual, justificación legible, fácil de prompt-enginear |
| IA — Mensajes | Claude API | Mismo modelo, reutilización de contexto del scoring |
| Automatización | n8n | Ya desplegado en VPS, flujos conocidos, sin coste adicional |
| Respuestas (F2) | Chatwoot + Evolution API | Ya configurado en A360, reutilización directa |
| RRSS (F3) | Buffer + n8n | Puente legal y estable a LinkedIn y X |

---

## 8. Modelo de Datos

### Tabla: prospects

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | Clave primaria |
| nombre_empresa | text | Nombre del negocio |
| nicho | text | Sector: climatización, instalaciones, energía |
| direccion | text | Dirección completa |
| email | text | Email de contacto (único) |
| telefono | text | Teléfono |
| contacto_nombre | text | Persona de contacto (opcional) |
| contacto_cargo | text | Cargo del contacto (opcional) |
| web | text | URL web (opcional) |
| valoracion_google | numeric | Valoración Google Maps (opcional) |
| num_resenas | integer | Número de reseñas (opcional) |
| score_ia | numeric | Puntuación IA 0-10 |
| score_etiqueta | text | Alta / Media / Baja / Descartar |
| score_justificacion | text | Párrafo explicativo del scoring |
| estado | text | Sin contactar / Contactado / Respondió / Interesado / Descartado |
| notas | text | Notas manuales |
| campaign_id | uuid | FK campaigns |
| created_at | timestamptz | Fecha de importación |

### Tabla: campaigns

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | Clave primaria |
| nombre | text | Nombre de la campaña |
| nicho | text | Nicho objetivo |
| canal | text | email / whatsapp / ambos |
| template_id | uuid | FK templates |
| score_minimo | numeric | Score mínimo para incluir prospectos |
| estado | text | Borrador / Activa / Pausada / Finalizada |
| fecha_inicio | date | Inicio de la campaña |
| fecha_fin | date | Fin estimado |
| created_at | timestamptz | Fecha de creación |

### Tabla: messages

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | Clave primaria |
| prospect_id | uuid | FK prospects |
| campaign_id | uuid | FK campaigns |
| canal | text | email / whatsapp |
| asunto | text | Asunto del email (si aplica) |
| contenido | text | Cuerpo del mensaje |
| estado_envio | text | Pendiente / Enviado / Entregado / Error |
| fecha_envio | timestamptz | Fecha real de envío |
| fecha_respuesta | timestamptz | Fecha de respuesta (si existe) |
| created_at | timestamptz | Fecha de creación |

### Tabla: templates

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | Clave primaria |
| nombre | text | Nombre descriptivo |
| nicho | text | Nicho al que aplica |
| producto | text | Demo asociada |
| tono | text | Formal / Cercano / Técnico |
| instrucciones_sistema | text | System prompt para Claude API |
| asunto_base | text | Asunto base para emails |
| cuerpo_base | text | Estructura base del mensaje |
| created_at | timestamptz | Fecha de creación |

### Tabla: activity_log

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | Clave primaria |
| prospect_id | uuid | FK prospects |
| tipo | text | Scoring / Email / WhatsApp / Respuesta / Nota |
| descripcion | text | Detalle de la actividad |
| created_at | timestamptz | Fecha del evento |

---

## 9. Fases de Desarrollo

### Fase 1 — MVP (3-4 semanas)
- Importación CSV con validación y detección de duplicados
- Módulo de scoring IA — análisis de idoneidad por empresa
- Gestión de prospectos con filtros por score, nicho y estado
- Creación y gestión de campañas con score mínimo configurable
- Generador de mensajes personalizados con IA
- Envío de email vía Resend
- Envío de WhatsApp vía Evolution API
- Dashboard con KPIs, embudo comercial y actividad reciente

### Fase 2 — Automatización (2-3 semanas)
- Flujos n8n completos (seguimiento, clasificación, alertas, reportes)
- Integración con Chatwoot para gestión de respuestas entrantes
- Escalado automático de canal email → WhatsApp
- Notificaciones en tiempo real

### Fase 3 — Contenido y RRSS (2 semanas)
- Generador de posts para LinkedIn y X con IA
- Calendario editorial
- Publicación vía n8n + Buffer
- Historial y métricas básicas de contenido

### Fase 4 — Comercialización (según demanda)
- Multitenancy con Row Level Security en Supabase
- Gestión de organizaciones y usuarios
- Sistema de invitación y onboarding guiado
- Plan de precios y facturación

---

## 10. Consideraciones para Comercialización Futura

El sistema está diseñado desde el inicio para ser extraíble como producto independiente:

- **Supabase** soporta multitenancy con Row Level Security sin cambios estructurales
- **Next.js** permite añadir gestión de organizaciones con cambios mínimos en middleware
- **n8n** está desacoplado del frontend, reutilizable por múltiples tenants
- **El módulo de scoring IA** es agnóstico al nicho — solo cambia el prompt del sistema
- **La arquitectura de campañas** está preparada para ser configurada por organización

Cuando llegue el momento, los cambios principales serán: añadir tabla `organizations`, aplicar RLS a todas las tablas, crear sistema de invitación de usuarios y onboarding guiado.

---

*ProspectFlow — Documento interno confidencial · David / ACLIMAR Freelance · 2026*
