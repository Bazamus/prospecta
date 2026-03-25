# Flujos de Automatización n8n — ProspectFlow

> Estos flujos se activan en **Fase 2**, una vez validado el MVP.
> n8n ya está desplegado en VPS y conectado al proyecto.

---

## Flujo 1 — Seguimiento automático (sin respuesta)

**Trigger:** Schedule — se ejecuta cada día a las 9:00

**Lógica:**
1. Consulta en Supabase todos los prospectos con estado `contactado` cuyo último mensaje tiene más de N días (configurable, por defecto 4)
2. Para cada prospecto, comprueba si el canal del último contacto fue email
3. Si fue email → sugiere cambio a WhatsApp (crea tarea en activity_log)
4. Si fue WhatsApp → crea nota de seguimiento manual para el usuario
5. Envía notificación resumen al usuario con la lista de prospectos pendientes

**Tablas implicadas:** `prospects`, `messages`, `activity_log`

---

## Flujo 2 — Clasificación automática de respuestas

**Trigger:** Webhook — se activa cuando llega una respuesta entrante (desde Chatwoot o Resend webhook)

**Lógica:**
1. Recibe el contenido de la respuesta y el email/teléfono del remitente
2. Identifica el prospecto en Supabase por email o teléfono
3. Envía el texto de la respuesta a Claude API con este prompt:

```
Clasifica esta respuesta de un prospecto comercial:
- "interesado": quiere más información, pide demo, responde positivamente
- "no_interesado": rechaza, pide que no le contacten, responde negativamente  
- "neutral": pregunta algo, pide tiempo, respuesta ambigua

Responde SOLO con una de las tres opciones.
```

4. Actualiza el estado del prospecto en Supabase según la clasificación
5. Registra la respuesta en `activity_log`
6. Dispara el Flujo 3 (notificación)

**Tablas implicadas:** `prospects`, `messages`, `activity_log`

---

## Flujo 3 — Notificación en tiempo real

**Trigger:** Se llama desde Flujo 2 o desde webhooks de Resend/Evolution

**Lógica:**
1. Recibe datos del evento (prospecto, tipo de evento, clasificación)
2. Formatea un mensaje de notificación
3. Envía por email al usuario (Resend) y/o WhatsApp personal

**Mensaje ejemplo:**
```
🟢 ProspectFlow — Nueva respuesta

Empresa: Climatizaciones Pérez S.L.
Canal: Email
Clasificación: INTERESADO
Score original: 8.4

→ Ver prospecto en el dashboard
```

---

## Flujo 4 — Reporte semanal

**Trigger:** Schedule — cada lunes a las 8:00

**Lógica:**
1. Consulta Supabase para obtener métricas de la semana anterior:
   - Nuevos prospectos importados
   - Mensajes enviados (email / WhatsApp)
   - Respuestas recibidas
   - Nuevos interesados
   - Demos enviadas
2. Calcula variación respecto a la semana anterior
3. Genera resumen con Claude API (párrafo de análisis + recomendaciones)
4. Envía por email al usuario

---

## Flujo 5 — Escalado de canal

**Trigger:** Se llama desde Flujo 1 cuando detecta prospectos sin respuesta por email

**Lógica:**
1. Para cada prospecto sin respuesta por email tras N días:
   - Comprueba que tiene teléfono en Supabase
   - Recupera el mensaje original y el scoring
   - Llama a Claude API para generar versión WhatsApp del mensaje (más corta, más directa)
   - Crea el mensaje en estado `pendiente` en la tabla `messages`
2. Notifica al usuario con la lista de mensajes WhatsApp listos para revisar y enviar

> **Nota:** El envío siempre requiere revisión manual del usuario. El flujo prepara, no envía automáticamente.

---

## Configuración de credenciales en n8n

Las siguientes credenciales deben configurarse en n8n antes de activar los flujos:

| Servicio | Tipo de credencial | Notas |
|----------|--------------------|-------|
| Supabase | HTTP Header Auth | Service Role Key |
| Claude API | HTTP Header Auth | Bearer + API Key |
| Resend | HTTP Header Auth | Bearer + API Key |
| Evolution API | HTTP Header Auth | Ya configurada en otros proyectos |

---

## Variables configurables (n8n)

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `DIAS_SIN_RESPUESTA_EMAIL` | 4 | Días antes de sugerir escalado a WA |
| `DIAS_SIN_RESPUESTA_WA` | 7 | Días antes de marcar para seguimiento manual |
| `MAX_CONTACTOS_DIA` | 20 | Límite diario de contactos nuevos |
| `EMAIL_NOTIFICACIONES` | — | Email del usuario para alertas |

---

*ProspectFlow — Automatización n8n · Fase 2 · 2026*
