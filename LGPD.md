# Como este backend se relaciona com a LGPD

Este documento explica, de forma técnica, quais medidas o código já
implementa para respeitar a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).

**Aviso importante: isto não é um parecer jurídico.** É uma implementação
técnica alinhada aos princípios mais conhecidos da LGPD. Antes de usar este
projeto com usuários reais (principalmente em escala), vale a pena revisar
o texto da Política de Privacidade e o funcionamento do site com um
advogado ou profissional de privacidade — cada operação de dados tem
particularidades que um código genérico não cobre sozinho.

## 1. Quais dados pessoais o sistema coleta

Só o mínimo necessário para a conta funcionar (princípio da necessidade,
art. 6º, III):

- Nome
- E-mail
- Senha (nunca guardada em texto puro — veja a seção 4)
- Data de criação da conta
- Se a pessoa aceitou (ou não) receber comunicações de marketing

Não pedimos CPF, telefone, endereço ou qualquer outro dado sensível, porque
o site não precisa deles para funcionar.

## 2. Base legal usada

- **Consentimento (art. 7º, I):** ao marcar as duas caixinhas obrigatórias
  no cadastro (Termos de Uso e Política de Privacidade), a pessoa consente
  com o tratamento dos dados necessários para criar a conta. Sem marcar as
  duas, a API recusa o cadastro (`POST /usuarios/cadastro` retorna erro 400).
- **Execução de contrato (art. 7º, V):** usar a conta para criar alertas de
  preço, por exemplo, é parte do serviço que a pessoa pediu ao se cadastrar.
- O aceite de comunicações de **marketing é sempre opcional** e separado dos
  demais — é um consentimento à parte, que pode ser revogado a qualquer
  momento (`POST /usuarios/me/revogar-consentimento`), como exige o
  art. 8º, §5º.

## 3. Direitos do titular implementados (art. 18)

| Direito | Como é atendido |
|---|---|
| Confirmação e acesso aos dados | `GET /usuarios/me` |
| Correção de dados incompletos ou desatualizados | `PUT /usuarios/me` |
| Portabilidade (baixar uma cópia dos dados) | `GET /usuarios/me/exportar` |
| Eliminação dos dados tratados com consentimento | `DELETE /usuarios/me` |
| Revogação do consentimento | `POST /usuarios/me/revogar-consentimento` |

No frontend (`pixelradar.html`), esses direitos aparecem como botões
simples dentro do painel "Minha conta": **Baixar meus dados** e
**Excluir minha conta**.

## 4. Segurança (art. 46)

- Senhas nunca são armazenadas em texto puro: usamos `scrypt` (função de
  hash lenta, resistente a força bruta) com um salt aleatório por senha.
- O login usa tokens JWT com validade de 7 dias — o token não carrega
  nenhum dado pessoal dentro dele, só um identificador interno.
- As rotas de cadastro e login têm limite de tentativas (`express-rate-limit`)
  para dificultar ataques automatizados.
- `helmet` adiciona cabeçalhos HTTP de segurança padrão.
- A conexão com o banco usa TLS (obrigatório em provedores como Neon e
  Supabase).
- Recomendação: sempre rode a API atrás de HTTPS (Render, Railway,
  Cloudflare e Vercel já entregam isso de graça).

## 5. Registro de consentimento (accountability — art. 6º, X)

A tabela `log_consentimento` guarda, para cada usuário: o tipo de aceite
(termos de uso, política de privacidade ou marketing), a versão do
documento aceito, se foi um aceite ou uma revogação, quando aconteceu, e um
hash do IP (não o IP em texto puro — minimização de dados). Isso cria um
histórico auditável de quando e o que cada pessoa aceitou.

## 6. Exclusão de conta

Ao chamar `DELETE /usuarios/me`, o sistema:

1. Substitui nome e e-mail por valores anônimos e apaga o hash de senha;
2. Marca a conta como excluída (`excluido_em`), para que ela não apareça
   mais em nenhuma consulta nem permita login;
3. Remove os alertas de preço associados à conta.

O registro em `log_consentimento` é mantido (sem dados pessoais
identificáveis além do `usuario_id`), pois serve como comprovação de que a
pessoa um dia aceitou os termos — isso é uma prática comum de
*accountability*, mas se você preferir apagar tudo sem deixar rastro,
adicione uma rotina que também exclua essas linhas.

## 7. O que falta para um uso realmente sério em produção

Este projeto é um ponto de partida sólido, não um produto pronto para uso
massivo. Antes de lançar de verdade, vale considerar:

- Confirmação de e-mail no cadastro (evita contas com e-mails inventados).
- Um encarregado de dados (DPO) definido e um canal de contato visível na
  Política de Privacidade.
- Um processo formal de resposta a incidentes de segurança (a LGPD exige
  comunicar a ANPD e os titulares em caso de vazamento relevante).
- Revisão jurídica da Política de Privacidade e dos Termos de Uso.
- Backups regulares do banco de dados.
