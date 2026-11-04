-- Migração para bancos que JÁ EXISTEM (como o seu no Neon): carrinho, pedidos
-- simulados e registro de cliques para comissão.
-- Cole no SQL Editor do Neon e rode UMA vez. Pode rodar de novo sem problema.
-- Não apaga nenhum dado: usuários, jogos, lojas e preços continuam como estão.
-- Se o Neon mostrar avisos "already exists, skipping", é normal.

-- Comissão que o PixelRadar recebe de cada loja (ajuste por loja quando quiser)
alter table lojas add column if not exists comissao_percentual numeric(5,2) not null default 5.00;
-- Endereço do site da loja (fica vazio nas lojas fictícias)
alter table lojas add column if not exists site_url text;

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
