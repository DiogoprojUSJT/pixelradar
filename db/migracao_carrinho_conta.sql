-- Migração: carrinho guardado na conta (volta ao entrar de novo, em qualquer aparelho).
-- Cole no SQL Editor do Neon e rode UMA vez. Pode repetir sem problema.
-- Não apaga nenhum dado. Rode depois de db/migracao_carrinho.sql.
 
create table if not exists carrinho_itens (
  usuario_id uuid not null references usuarios(id) on delete cascade,
  oferta_id integer not null references ofertas(id) on delete cascade,
  quantidade integer not null check (quantidade between 1 and 5),
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, oferta_id)
);