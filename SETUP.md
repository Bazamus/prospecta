# Instrucciones para subir ProspectFlow a GitHub

## 1. Crear el repositorio en GitHub

Entra en https://github.com/new y configura:
- **Repository name:** `prospectflow`
- **Visibility:** Private
- **NO** marques "Add a README file" (ya lo tenemos)
- Clic en **Create repository**

---

## 2. Inicializar el repo local y subir

Abre la terminal en DAVIDPC (PowerShell o Git Bash) y ejecuta:

```bash
# Ir a la carpeta donde quieres el proyecto
cd C:\Users\David\Projects   # o la ruta que uses

# Crear la carpeta del proyecto
mkdir prospectflow
cd prospectflow

# Crear la estructura de carpetas
mkdir docs database frontend automation

# Copiar los archivos que te he preparado en esta sesión
# (ver sección de archivos más abajo)

# Inicializar git y subir
git init
git add .
git commit -m "feat: estructura inicial y PRD v1.1"
git branch -M main
git remote add origin https://github.com/Bazamus/prospectflow.git
git push -u origin main
```

---

## 3. Archivos a crear antes del push

Copia el contenido de cada archivo desde la sesión de Claude:

| Archivo | Descripción |
|---------|-------------|
| `README.md` | Presentación del proyecto |
| `docs/PRD.md` | Documento de Requisitos de Producto completo |
| `docs/ARCHITECTURE.md` | Decisiones técnicas y estructura de carpetas |
| `docs/ejemplo_import.csv` | CSV de ejemplo para importación |
| `database/schema.sql` | Esquema completo de Supabase |
| `automation/FLOWS.md` | Documentación de flujos n8n |

---

## 4. Siguiente paso tras el push

Una vez el repo esté en GitHub, el siguiente paso es arrancar el proyecto Next.js:

```bash
cd prospectflow
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir
cd frontend
npx shadcn-ui@latest init
```

Y configurar las variables de entorno en `.env.local` siguiendo la plantilla en `docs/ARCHITECTURE.md`.

---

*Generado en sesión Claude · 2026*
