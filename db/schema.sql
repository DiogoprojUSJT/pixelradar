-- Necessário para gen_random_uuid(); já vem habilitado no Neon e no Supabase.
create extension if not exists pgcrypto;

create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  senha_hash text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  termos_versao text not null,
  termos_aceito_em timestamptz not null,
  privacidade_versao text not null,
  privacidade_aceito_em timestamptz not null,
  marketing_consentido boolean not null default false,
  marketing_consentido_em timestamptz,
  excluido_em timestamptz
);

-- Trilha de auditoria de consentimento: guarda cada aceite (ou revogação),
-- com a versão do documento aceito e quando isso aconteceu.
create table if not exists log_consentimento (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) on delete set null,
  tipo text not null, -- 'termos_uso' | 'politica_privacidade' | 'marketing'
  versao_documento text not null,
  aceito boolean not null,
  criado_em timestamptz not null default now(),
  ip_hash text
);

create table if not exists lojas (
  id serial primary key,
  nome text not null unique
);

create table if not exists jogos (
  id serial primary key,
  titulo text not null,
  plataforma text not null,
  capa_estilo text,
  preco_original_centavos integer not null
);

create table if not exists ofertas (
  id serial primary key,
  jogo_id integer not null references jogos(id) on delete cascade,
  loja_id integer not null references lojas(id) on delete cascade,
  preco_centavos integer not null,
  aceita_cartao boolean not null default false,
  aceita_boleto boolean not null default false,
  aceita_pix boolean not null default false,
  prazo_entrega text
);

create table if not exists alertas_preco (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  jogo_id integer not null references jogos(id) on delete cascade,
  preco_alvo_centavos integer not null,
  criado_em timestamptz not null default now(),
  notificado_em timestamptz
);

create index if not exists idx_ofertas_jogo on ofertas(jogo_id);
create index if not exists idx_alertas_usuario on alertas_preco(usuario_id);
create index if not exists idx_log_consentimento_usuario on log_consentimento(usuario_id);
