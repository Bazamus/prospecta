# Variables de entorno — Prospecta

Configura estas variables en el dashboard de Vercel (Settings > Environment Variables).

## Base de datos

| Variable | Descripcion |
|----------|-------------|
| `DATABASE_URL` | Connection string de Neon PostgreSQL. Formato: `postgresql://user:password@host.neon.tech/dbname?sslmode=require` |

## Autenticacion (NextAuth)

| Variable | Descripcion |
|----------|-------------|
| `NEXTAUTH_SECRET` | Secret para firmar tokens JWT. Generar con: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL base de la app. En produccion: `https://tu-dominio.vercel.app` |

## Usuario admin

| Variable | Descripcion |
|----------|-------------|
| `ADMIN_EMAIL` | Email del usuario administrador para login |
| `ADMIN_PASSWORD` | Password del usuario administrador para login |

## IA (opcional si se configura desde la UI)

| Variable | Descripcion |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key de Anthropic (Claude). Fallback si no hay proveedor configurado en la BD |

## Email (Resend)

| Variable | Descripcion |
|----------|-------------|
| `RESEND_API_KEY` | API key de Resend para envio de emails transaccionales |
| `RESEND_FROM_EMAIL` | Direccion de email remitente (debe estar verificada en Resend) |

## WhatsApp (Evolution API)

| Variable | Descripcion |
|----------|-------------|
| `EVOLUTION_API_URL` | URL base de la instancia Evolution API (ej: `https://evolution.tudominio.com`) |
| `EVOLUTION_API_KEY` | API key de autenticacion de Evolution API |
| `EVOLUTION_INSTANCE` | Nombre de la instancia de WhatsApp en Evolution API |

## App

| Variable | Descripcion |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | URL publica de la app (usada en el frontend) |
