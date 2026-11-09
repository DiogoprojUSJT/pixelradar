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
| Correção de dados incompletos ou desatualizados | `PUT /usuarios/me` (nome) e troca de e-mail confirmada por código (seção 4.1) |
| Portabilidade (baixar uma cópia dos dados) | `GET /usuarios/me/exportar` |
| Eliminação dos dados tratados com consentimento | `DELETE /usuarios/me` |
| Revogação do consentimento | `POST /usuarios/me/revogar-consentimento` |

No frontend (`index.html`), esses direitos aparecem como botões
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

### 4.1 Códigos por e-mail (esqueci a senha e troca de e-mail)

- **Sem enumeração de contas:** "esqueci minha senha" responde sempre a mesma
  mensagem, exista ou não o e-mail, para ninguém descobrir quem tem conta.
- **Código só como hash:** o código de 6 dígitos nunca é guardado em texto
  puro (HMAC-SHA256 ligado ao usuário e à finalidade) e nunca aparece na
  tela do site; só chega ao e-mail.
- **Validade e tentativas:** vale 15 minutos, no máximo 5 tentativas, e um
  novo pedido só é aceito após 60 segundos. Após o uso, o código é apagado.
- **Finalidades separadas:** um código de redefinição de senha não serve
  para trocar o e-mail, e vice-versa.
- **Troca de e-mail em duas etapas:** exige a senha atual e um código
  enviado ao **novo** endereço (prova que a pessoa controla a caixa). O
  e-mail só muda após a confirmação — e aí vale na hora. O endereço
  **antigo** recebe um aviso de segurança, para a pessoa reagir se não foi
  ela. O novo e-mail pendente é guardado só até a confirmação ou expiração
  (minimização) e é apagado se a conta for excluída.
- **Operador de e-mail:** a Resend recebe o endereço e o código apenas para
  entregar a mensagem. Isso deve constar na Política de Privacidade (já
  consta no texto do site).
- **Sessão no navegador:** o token de login fica no `localStorage` do
  próprio navegador da pessoa, para manter o login ao recarregar; "Sair"
  apaga. Nada de dados pessoais além do identificador vai dentro do token.

### 4.2 Carrinho, pedidos e cliques para as lojas

- **Carrinho:** guarda só o número da oferta e a quantidade. Sem login, fica
  apenas no navegador. Com login, fica salvo na conta (`carrinho_itens`) para
  voltar no próximo acesso. Ao sair, o carrinho é removido da tela e do
  navegador. Ele é apagado do servidor se a conta for excluída e consta na
  exportação dos dados.
- **Pedido (demonstração):** exige login e guarda apenas loja, jogos, valores,
  forma de pagamento escolhida, situação e datas. **Não pedimos nem guardamos
  número de cartão**, endereço, CPF ou telefone.
- **Guarda após excluir a conta:** os pedidos continuam no banco, mas ligados
  a uma conta já anonimizada (sem nome nem e-mail), como registro das
  transações (art. 16, I). Em um negócio real, o prazo de guarda segue as
  obrigações fiscais e deve ser definido com um contador.
- **Portabilidade:** `GET /usuarios/me/exportar` inclui os pedidos da pessoa.
- **Cliques em "Ir para o site da loja":** a tabela `cliques_loja` guarda só a
  loja e a hora, sem usuário, IP ou conteúdo do carrinho. A comissão por
  indicação é conciliada com o código do clique que vai no link para a loja.
- **Transparência:** o carrinho avisa que o PixelRadar recebe comissão da
  loja, sem custo extra para quem compra, e a Política de Privacidade do site
  descreve essa coleta.

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

- Confirmação de e-mail no cadastro (hoje a confirmação por código existe
  só na troca de e-mail; no cadastro ainda é possível usar um e-mail
  inventado).
- Para vender de verdade pelo site: gateway de pagamento com divisão de
  pagamento, nota fiscal, política de reembolso e contrato com as lojas; o
  pagamento aqui é apenas simulado.
- Verificar um domínio na Resend (sem isso, só o dono da conta Resend
  recebe e-mails).
- Um encarregado de dados (DPO) definido e um canal de contato visível na
  Política de Privacidade.
- Um processo formal de resposta a incidentes de segurança (a LGPD exige
  comunicar a ANPD e os titulares em caso de vazamento relevante).
- Revisão jurídica da Política de Privacidade e dos Termos de Uso.
- Backups regulares do banco de dados.
