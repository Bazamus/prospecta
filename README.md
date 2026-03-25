# Prospecta

**Sistema de Prospección Comercial Inteligente**

Herramienta interna para gestionar el ciclo completo de prospección comercial B2B en sectores de nicho poco digitalizados: climatización, instalaciones técnicas y gestión energética.

---

## ¿Qué hace?

1. **Importa** bases de datos de empresas desde CSV (exportaciones de Google Maps u otras fuentes)
2. **Califica** cada empresa automáticamente con IA — puntuación 0-10 de idoneidad como prospecto
3. **Genera** mensajes personalizados por nicho y perfil usando Claude API
4. **Envía** por email (Resend) y/o WhatsApp (Evolution API)
5. **Gestiona** respuestas y seguimiento desde un único dashboard

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 14 + Tailwind CSS + Shadcn/ui |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Deploy | Vercel |
| Email | Resend |
| WhatsApp | Evolution API |
| IA (scoring + mensajes) | Claude API (claude-sonnet-4-5) |
| Automatización | n8n |
| Respuestas (Fase 2) | Chatwoot + Evolution API |

---

## Estructura del proyecto

```
prospectflow/
├── docs/               # Documentación del proyecto
│   ├── PRD.md          # Documento de Requisitos de Producto
│   ├── ARCHITECTURE.md # Decisiones de arquitectura
│   └── DATABASE.md     # Esquema y modelo de datos
├── database/           # SQL para Supabase
│   └── schema.sql      # Esquema completo de tablas
├── frontend/           # Notas y estructura Next.js
│   └── STRUCTURE.md    # Estructura de carpetas del frontend
├── automation/         # Documentación de flujos n8n
│   └── FLOWS.md        # Descripción de flujos de automatización
└── README.md           # Este archivo
```

---

## Fases de desarrollo

| Fase | Contenido | Estimación |
|------|-----------|------------|
| **1 — MVP** | Importación CSV, scoring IA, campañas, envío email + WhatsApp, dashboard | 3-4 semanas |
| **2 — Automatización** | Flujos n8n, Chatwoot, alertas, reportes automáticos | 2-3 semanas |
| **3 — RRSS** | Generador de contenido LinkedIn/X, calendario editorial | 2 semanas |
| **4 — Comercialización** | Multitenancy, onboarding, precios | Según demanda |

---

## Arranque rápido

```bash
# Clonar el repo
git clone https://github.com/Bazamus/prospectflow.git
cd prospectflow

# El proyecto Next.js se creará en /frontend
# Ver docs/ARCHITECTURE.md para instrucciones completas
```

---

## Documentación

- [PRD completo](docs/PRD.md)
- [Arquitectura y decisiones técnicas](docs/ARCHITECTURE.md)
- [Modelo de datos](docs/DATABASE.md)
- [Flujos de automatización n8n](automation/FLOWS.md)

---

*Proyecto interno — David / ACLIMAR Freelance · 2026*
