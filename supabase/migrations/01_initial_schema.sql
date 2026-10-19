-- ============================================================
-- FitApp — Migração inicial do schema multi-tenant
-- Arquivo: supabase/migrations/01_initial_schema.sql
--
-- Regra de isolamento (tenant):
--   * Toda linha operacional pertence a um profissional autenticado
--     (`profiles.id = auth.uid()`), direto via coluna `professional_id`
--     ou indiretamente por JOIN até `fichas_treino` / `alunos`.
--   * `profiles` é o espelho de `auth.users` (1:1) — é o "tenant".
--   * `exercicios_catalogo.professional_id` nullable: `NULL` = exercício
--     global (visível para todos, editável apenas via service role).
-- ============================================================

-- ------------------------------------------------------------
-- Extensões
-- ------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELAS
-- ============================================================

-- ------------------------------------------------------------
-- profiles — profissional autenticado (tenant do PWA white-label)
-- ------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  nome         text not null,
  whatsapp     text,
  slug         text not null unique,
  logo_url     text,
  cor_primaria text,
  created_at   timestamptz not null default now()
);

comment on table public.profiles is 'Profissionais (tenants). Espelho 1:1 de auth.users.';
comment on column public.profiles.slug is 'Slug única do PWA white-label do profissional.';
comment on column public.profiles.cor_primaria is 'Cor da marca em hexadecimal (#RRGGBB).';

-- ------------------------------------------------------------
-- alunos — alunos do profissional (acessam o PWA via token_acesso)
-- ------------------------------------------------------------
create table public.alunos (
  id             uuid primary key default uuid_generate_v4(),
  professional_id uuid not null references public.profiles (id) on delete cascade,
  nome           text not null,
  whatsapp       text,
  token_acesso   uuid not null unique default uuid_generate_v4(),
  ativo          boolean not null default true,
  created_at     timestamptz not null default now()
);

comment on table public.alunos is 'Alunos vinculados a um profissional.';
comment on column public.alunos.token_acesso is 'Token único de acesso do aluno ao PWA (magic link / deep link).';
comment on column public.alunos.ativo is 'Aluno inativo não aparece nas listagens nem pode autenticar.';

-- ------------------------------------------------------------
-- exercicios_catalogo — catálogo de exercícios
--   professional_id NULL = exercício global (compartilhado)
-- ------------------------------------------------------------
create table public.exercicios_catalogo (
  id               uuid primary key default uuid_generate_v4(),
  professional_id  uuid references public.profiles (id) on delete cascade,
  nome             text not null,
  grupo_muscular   text not null,
  video_gif_url    text,
  instrucoes       text
);

comment on table public.exercicios_catalogo is 'Catálogo de exercícios: globais (professional_id NULL) ou do profissional.';
comment on column public.exercicios_catalogo.grupo_muscular is 'Ex.: Peito, Costas, Pernas, Ombro, Braço, Core.';

-- ------------------------------------------------------------
-- fichas_treino — ficha/alocado de treino de um aluno
-- ------------------------------------------------------------
create table public.fichas_treino (
  id              uuid primary key default uuid_generate_v4(),
  aluno_id        uuid not null references public.alunos (id) on delete cascade,
  professional_id uuid not null references public.profiles (id) on delete cascade,
  titulo          text not null,
  ativa           boolean not null default false,
  created_at      timestamptz not null default now()
);

comment on table public.fichas_treino is 'Fichas de treino. Uma ficha ativa por aluno é a regra de negócio sugerida.';

-- ------------------------------------------------------------
-- treino_dias — dias/seções dentro de uma ficha (A, B, C...)
-- ------------------------------------------------------------
create table public.treino_dias (
  id       uuid primary key default uuid_generate_v4(),
  ficha_id uuid not null references public.fichas_treino (id) on delete cascade,
  letra    char(1) not null,
  nome_dia text,
  ordem    integer not null default 0
);

comment on table public.treino_dias is 'Dias de treino de uma ficha (letra + ordem de exibição).';
comment on column public.treino_dias.letra is 'Identificador visual do dia (A, B, C, ...).';

-- ------------------------------------------------------------
-- treino_itens — exercício prescrito dentro de um dia
-- ------------------------------------------------------------
create table public.treino_itens (
  id                uuid primary key default uuid_generate_v4(),
  treino_dia_id     uuid not null references public.treino_dias (id) on delete cascade,
  exercicio_id      uuid not null references public.exercicios_catalogo (id) on delete cascade,
  series            integer not null,
  repeticoes        text,
  carga_sugerida    text,
  descanso_segundos integer,
  ordem             integer not null default 0,
  notas             text
);

comment on table public.treino_itens is 'Prescrição de um exercício em um dia de treino.';
comment on column public.treino_itens.repeticoes is 'Texto livre para acomodar formatos como "8-12" ou "AMRAP".';

-- ------------------------------------------------------------
-- treino_logs — execução registrada pelo aluno
-- ------------------------------------------------------------
create table public.treino_logs (
  id             uuid primary key default uuid_generate_v4(),
  aluno_id       uuid not null references public.alunos (id) on delete cascade,
  treino_item_id uuid not null references public.treino_itens (id) on delete cascade,
  data           date not null default current_date,
  series_feitas  integer,
  carga_utilizada numeric,
  rpe            integer,
  concluido      boolean not null default false,
  created_at     timestamptz not null default now()
);

comment on table public.treino_logs is 'Histórico de execução dos itens prescritos.';
comment on column public.treino_logs.rpe is 'Percepção de esforço (1-10), preenchida pelo aluno.';
comment on column public.treino_logs.concluido is 'true quando o aluno marcou o item/exercício como concluído.';

-- ============================================================
-- ÍNDICES (alimentam os JOINs das políticas RLS e as listagens)
-- ============================================================
create index idx_alunos_professional_id          on public.alunos (professional_id);
create index idx_exercicios_catalogo_professional_id on public.exercicios_catalogo (professional_id);
create index idx_fichas_treino_aluno_id           on public.fichas_treino (aluno_id);
create index idx_fichas_treino_professional_id    on public.fichas_treino (professional_id);
create index idx_treino_dias_ficha_id             on public.treino_dias (ficha_id);
create index idx_treino_itens_treino_dia_id       on public.treino_itens (treino_dia_id);
create index idx_treino_itens_exercicio_id        on public.treino_itens (exercicio_id);
create index idx_treino_logs_aluno_id             on public.treino_logs (aluno_id);
create index idx_treino_logs_treino_item_id       on public.treino_logs (treino_item_id);
create index idx_treino_logs_data                 on public.treino_logs (data);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles           enable row level security;
alter table public.alunos             enable row level security;
alter table public.exercicios_catalogo enable row level security;
alter table public.fichas_treino      enable row level security;
alter table public.treino_dias        enable row level security;
alter table public.treino_itens       enable row level security;
alter table public.treino_logs        enable row level security;

-- ------------------------------------------------------------
-- profiles — o profissional só enxerga/altera o próprio registro
-- ------------------------------------------------------------
create policy "profiles_acesso_proprio"
  on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ------------------------------------------------------------
-- alunos — pertence ao profissional que o criou
-- ------------------------------------------------------------
create policy "alunos_acesso_profissional"
  on public.alunos
  for all to authenticated
  using ((select auth.uid()) = professional_id)
  with check ((select auth.uid()) = professional_id);

-- ------------------------------------------------------------
-- exercicios_catalogo — leitura dos globais + próprios;
-- escrita apenas nos próprios (globais são imutáveis no cliente)
-- ------------------------------------------------------------
create policy "exercicios_catalogo_leitura"
  on public.exercicios_catalogo
  for select to authenticated
  using (professional_id is null or professional_id = (select auth.uid()));

create policy "exercicios_catalogo_insert"
  on public.exercicios_catalogo
  for insert to authenticated
  with check (professional_id = (select auth.uid()));

create policy "exercicios_catalogo_update"
  on public.exercicios_catalogo
  for update to authenticated
  using (professional_id = (select auth.uid()))
  with check (professional_id = (select auth.uid()));

create policy "exercicios_catalogo_delete"
  on public.exercicios_catalogo
  for delete to authenticated
  using (professional_id = (select auth.uid()));

-- ------------------------------------------------------------
-- fichas_treino — dono da ficha
-- ------------------------------------------------------------
create policy "fichas_treino_acesso_profissional"
  on public.fichas_treino
  for all to authenticated
  using ((select auth.uid()) = professional_id)
  with check ((select auth.uid()) = professional_id);

-- ------------------------------------------------------------
-- treino_dias — propriedade resolvida via ficha (sem professional_id)
-- ------------------------------------------------------------
create policy "treino_dias_acesso_profissional"
  on public.treino_dias
  for all to authenticated
  using (
    exists (
      select 1
      from public.fichas_treino f
      where f.id = ficha_id
        and f.professional_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.fichas_treino f
      where f.id = ficha_id
        and f.professional_id = (select auth.uid())
    )
  );

-- ------------------------------------------------------------
-- treino_itens — propriedade resolvida via dia -> ficha
-- ------------------------------------------------------------
create policy "treino_itens_acesso_profissional"
  on public.treino_itens
  for all to authenticated
  using (
    exists (
      select 1
      from public.treino_dias d
      join public.fichas_treino f on f.id = d.ficha_id
      where d.id = treino_dia_id
        and f.professional_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.treino_dias d
      join public.fichas_treino f on f.id = d.ficha_id
      where d.id = treino_dia_id
        and f.professional_id = (select auth.uid())
    )
  );

-- ------------------------------------------------------------
-- treino_logs — propriedade resolvida via aluno
-- ------------------------------------------------------------
create policy "treino_logs_acesso_profissional"
  on public.treino_logs
  for all to authenticated
  using (
    exists (
      select 1
      from public.alunos a
      where a.id = aluno_id
        and a.professional_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.alunos a
      where a.id = aluno_id
        and a.professional_id = (select auth.uid())
    )
  );

-- Nota: políticas de acesso do ALUNO (autenticação por token_acesso,
-- papel `anon`) serão adicionadas em migração específica — por enquanto
-- apenas o profissional autenticado acessa os dados.
