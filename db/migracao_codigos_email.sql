-- Migração para bancos que JÁ EXISTEM (como o seu no Neon).
-- Cole no SQL Editor do Neon e rode UMA vez. Pode rodar de novo sem problema:
-- cada comando só cria a coluna se ela ainda não existir.
-- Não apaga nenhum dado: contas, jogos e preços continuam como estão.

alter table usuarios add column if not exists redefinicao_codigo_hash text;
alter table usuarios add column if not exists redefinicao_expira_em timestamptz;
alter table usuarios add column if not exists redefinicao_tentativas integer not null default 0;
alter table usuarios add column if not exists redefinicao_enviado_em timestamptz;

alter table usuarios add column if not exists novo_email text;
alter table usuarios add column if not exists novo_email_codigo_hash text;
alter table usuarios add column if not exists novo_email_expira_em timestamptz;
alter table usuarios add column if not exists novo_email_tentativas integer not null default 0;
alter table usuarios add column if not exists novo_email_enviado_em timestamptz;
