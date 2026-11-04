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
  excluido_em timestamptz,
  -- Código de 6 dígitos de "esqueci minha senha" (guardado só como hash)
  redefinicao_codigo_hash text,
  redefinicao_expira_em timestamptz,
  redefinicao_tentativas integer not null default 0,
  redefinicao_enviado_em timestamptz,
  -- Troca de e-mail em duas etapas: o novo e-mail só vale depois do código
  novo_email text,
  novo_email_codigo_hash text,
  novo_email_expira_em timestamptz,
  novo_email_tentativas integer not null default 0,
  novo_email_enviado_em timestamptz
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
  nome text not null unique,
  -- Comissão que o PixelRadar recebe da loja e endereço do site (vazio nas lojas fictícias)
  comissao_percentual numeric(5,2) not null default 5.00,
  site_url text
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

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id),
  loja_id integer not null references lojas(id),
  forma_pagamento text not null check (forma_pagamento in ('cartao', 'boleto', 'pix')),
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento', 'pago', 'cancelado')),
  total_centavos integer not null check (total_centavos > 0),
  comissao_percentual numeric(5,2) not null,
  comissao_centavos integer not null,
  codigo_pagamento text,
  criado_em timestamptz not null default now(),
  pago_em timestamptz
);

-- Cada item guarda uma "foto" do título e do preço no momento da compra.
create table if not exists itens_pedido (
  id serial primary key,
  pedido_id uuid not null references pedidos(id) on delete cascade,
  oferta_id integer references ofertas(id) on delete set null,
  titulo text not null,
  plataforma text not null,
  preco_centavos integer not null check (preco_centavos > 0),
  quantidade integer not null check (quantidade between 1 and 5)
);

-- Cliques em "Ir para a loja". Anônimo de propósito: não guarda usuário nem IP.
create table if not exists cliques_loja (
  id uuid primary key default gen_random_uuid(),
  loja_id integer references lojas(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_pedidos_usuario on pedidos(usuario_id);
create index if not exists idx_itens_pedido_pedido on itens_pedido(pedido_id);
create index if not exists idx_ofertas_jogo on ofertas(jogo_id);
create index if not exists idx_alertas_usuario on alertas_preco(usuario_id);
create index if not exists idx_log_consentimento_usuario on log_consentimento(usuario_id);
