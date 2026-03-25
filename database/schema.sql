-- ============================================
-- ProspectFlow — Esquema de base de datos
-- Supabase / PostgreSQL
-- v1.1 · 2026
-- ============================================

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- ============================================
-- TABLA: prospects
-- ============================================
create table prospects (
  id                    uuid primary key default gen_random_uuid(),
  nombre_empresa        text not null,
  nicho                 text not null check (nicho in ('climatizacion', 'instalaciones', 'energia', 'otro')),
  direccion             text,
  email                 text unique,
  telefono              text,
  contacto_nombre       text,
  contacto_cargo        text,
  web                   text,
  valoracion_google     numeric(3,1),
  num_resenas           integer,

  -- Scoring IA
  score_ia              numeric(4,1) check (score_ia >= 0 and score_ia <= 10),
  score_etiqueta        text check (score_etiqueta in ('Alta', 'Media', 'Baja', 'Descartar')),
  score_justificacion   text,

  -- Estado comercial
  estado                text not null default 'sin_contactar'
                          check (estado in (
                            'sin_contactar',
                            'contactado',
                            'respondio',
                            'interesado',
                            'demo_enviada',
                            'cerrado',
                            'descartado'
                          )),

  notas                 text,
  campaign_id           uuid references campaigns(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Índices
create index idx_prospects_nicho on prospects(nicho);
create index idx_prospects_estado on prospects(estado);
create index idx_prospects_score on prospects(score_ia);
create index idx_prospects_campaign on prospects(campaign_id);

-- ============================================
-- TABLA: campaigns
-- ============================================
create table campaigns (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  nicho           text not null,
  canal           text not null check (canal in ('email', 'whatsapp', 'ambos')),
  template_id     uuid references templates(id) on delete set null,
  score_minimo    numeric(4,1) default 5.0,
  estado          text not null default 'borrador'
                    check (estado in ('borrador', 'activa', 'pausada', 'finalizada')),
  fecha_inicio    date,
  fecha_fin       date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_campaigns_estado on campaigns(estado);
create index idx_campaigns_nicho on campaigns(nicho);

-- ============================================
-- TABLA: templates
-- ============================================
create table templates (
  id                      uuid primary key default gen_random_uuid(),
  nombre                  text not null,
  nicho                   text not null,
  producto                text not null,
  tono                    text not null check (tono in ('formal', 'cercano', 'tecnico')),
  instrucciones_sistema   text not null,
  asunto_base             text,
  cuerpo_base             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ============================================
-- TABLA: messages
-- ============================================
create table messages (
  id                uuid primary key default gen_random_uuid(),
  prospect_id       uuid not null references prospects(id) on delete cascade,
  campaign_id       uuid references campaigns(id) on delete set null,
  canal             text not null check (canal in ('email', 'whatsapp')),
  asunto            text,
  contenido         text not null,
  estado_envio      text not null default 'pendiente'
                      check (estado_envio in ('pendiente', 'enviado', 'entregado', 'abierto', 'error')),
  fecha_envio       timestamptz,
  fecha_respuesta   timestamptz,
  created_at        timestamptz not null default now()
);

create index idx_messages_prospect on messages(prospect_id);
create index idx_messages_campaign on messages(campaign_id);
create index idx_messages_canal on messages(canal);
create index idx_messages_estado on messages(estado_envio);

-- ============================================
-- TABLA: activity_log
-- ============================================
create table activity_log (
  id            uuid primary key default gen_random_uuid(),
  prospect_id   uuid references prospects(id) on delete cascade,
  tipo          text not null check (tipo in ('scoring', 'email', 'whatsapp', 'respuesta', 'nota', 'estado')),
  descripcion   text not null,
  created_at    timestamptz not null default now()
);

create index idx_activity_prospect on activity_log(prospect_id);
create index idx_activity_tipo on activity_log(tipo);
create index idx_activity_fecha on activity_log(created_at desc);

-- ============================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_prospects_updated_at
  before update on prospects
  for each row execute function update_updated_at();

create trigger trg_campaigns_updated_at
  before update on campaigns
  for each row execute function update_updated_at();

create trigger trg_templates_updated_at
  before update on templates
  for each row execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (preparado para Fase 4)
-- ============================================
-- Activar RLS en todas las tablas
alter table prospects enable row level security;
alter table campaigns enable row level security;
alter table templates enable row level security;
alter table messages enable row level security;
alter table activity_log enable row level security;

-- Política temporal: acceso total para usuario autenticado (Fase 1)
-- En Fase 4 se reemplaza por políticas por organización
create policy "Acceso total usuario autenticado" on prospects
  for all using (auth.role() = 'authenticated');

create policy "Acceso total usuario autenticado" on campaigns
  for all using (auth.role() = 'authenticated');

create policy "Acceso total usuario autenticado" on templates
  for all using (auth.role() = 'authenticated');

create policy "Acceso total usuario autenticado" on messages
  for all using (auth.role() = 'authenticated');

create policy "Acceso total usuario autenticado" on activity_log
  for all using (auth.role() = 'authenticated');

-- ============================================
-- DATOS INICIALES: plantillas por nicho
-- ============================================
insert into templates (nombre, nicho, producto, tono, instrucciones_sistema, asunto_base, cuerpo_base) values
(
  'Climatización — Partes de conductos — Cercano',
  'climatizacion',
  'partes_conductos',
  'cercano',
  'Eres un consultor de digitalización especializado en el sector de climatización y aislamiento térmico en España. Tu objetivo es contactar con empresas del sector para presentarles una aplicación de gestión de partes de trabajo de conductos. El mensaje debe ser breve, directo y mostrar que conoces el sector. Menciona el ahorro de tiempo en la gestión administrativa. Evita tecnicismos. Usa un tono cercano pero profesional.',
  'Una herramienta hecha para empresas de climatización como la tuya',
  'Hola [CONTACTO],\n\nHe desarrollado una aplicación específica para empresas de climatización que simplifica la gestión de partes de conductos...'
),
(
  'Instalaciones — Partes de instalaciones — Formal',
  'instalaciones',
  'partes_instalaciones',
  'formal',
  'Eres un consultor de digitalización especializado en el sector de instalaciones técnicas en España. Tu objetivo es contactar con empresas instaladoras para presentarles una aplicación de gestión de partes de trabajo. El mensaje debe ser profesional, breve y centrado en el valor operativo: reducción de papel, firma digital, control de trabajos en campo. Usa un tono formal.',
  'Solución digital para la gestión de partes de instalaciones',
  'Estimado/a [CONTACTO],\n\nMe dirijo a usted para presentarle una solución diseñada específicamente para empresas instaladoras...'
),
(
  'Energía — Gestión energética — Técnico',
  'energia',
  'gestion_energetica',
  'tecnico',
  'Eres un consultor especializado en digitalización para empresas de gestión energética en España. Tu objetivo es contactar con empresas del sector para presentarles una plataforma de gestión energética. El mensaje debe ser técnico pero accesible, centrado en métricas, reporting y automatización de procesos. Menciona la integración con sistemas existentes.',
  'Plataforma de gestión energética — Demo disponible',
  'Hola [CONTACTO],\n\nHe desarrollado una plataforma de gestión energética orientada a empresas como la suya...'
);
