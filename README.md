# PixelRadar — API (backend)

API do site PixelRadar: um comparador **fictício** de preços de jogos (os
jogos, lojas e preços são dados de exemplo), com cadastro de usuários e
alertas de preço construídos para respeitar a LGPD.

Stack: Node.js + Express + PostgreSQL. Sem dependências com compilação
nativa (funciona em praticamente qualquer hospedagem gratuita).

## 1. Rodando localmente

Pré-requisitos: Node.js 18 ou mais recente, e acesso a um banco Postgres
(veja a seção 3 para opções gratuitas — você pode já criar o banco de
verdade e usar aqui, não precisa de Postgres instalado na sua máquina).

```bash
cd pixelradar-backend
npm install
cp .env.example .env
# edite o .env e cole a DATABASE_URL do seu banco Postgres
npm run migrar   # cria as tabelas e insere os dados fictícios de exemplo
npm start        # inicia a API em http://localhost:3000
```

Teste rápido: abra `http://localhost:3000/api/v1/jogos` no navegador — deve
devolver uma lista de jogos em JSON.

## 2. Endpoints principais

Documentação completa "viva" em `GET /api/v1` (lista todas as rotas).

| Rota | O que faz | Precisa de login? |
|---|---|---|
| `GET /api/v1/jogos` | Lista jogos, com filtro por `plataforma`, `busca` e `ordenar` | Não |
| `GET /api/v1/jogos/:id/lojas` | Todas as ofertas de lojas para um jogo | Não |
| `GET /api/v1/lojas` | Lista as lojas parceiras (fictícias) | Não |
| `POST /api/v1/usuarios/cadastro` | Cria uma conta | Não |
| `POST /api/v1/usuarios/login` | Faz login, devolve um token | Não |
| `POST /api/v1/usuarios/esqueci-senha` | Envia um código de 6 dígitos para o e-mail cadastrado | Não |
| `POST /api/v1/usuarios/redefinir-senha` | Valida o código e grava a nova senha | Não |
| `GET /api/v1/usuarios/me` | Dados da conta logada | Sim |
| `PUT /api/v1/usuarios/me` | Edita o nome | Sim |
| `POST /api/v1/usuarios/me/email/solicitar` | Pede troca de e-mail (exige a senha atual); envia código ao NOVO e-mail | Sim |
| `POST /api/v1/usuarios/me/email/confirmar` | Confirma o código e troca o e-mail na hora | Sim |
| `PUT /api/v1/usuarios/me/senha` | Troca a senha estando logado | Sim |
| `GET /api/v1/usuarios/me/exportar` | Baixa uma cópia dos seus dados (LGPD) | Sim |
| `DELETE /api/v1/usuarios/me` | Exclui a conta (LGPD) | Sim |
| `GET /api/v1/alertas` | Lista os alertas de preço da conta | Sim |
| `POST /api/v1/alertas` | Cria um alerta de preço | Sim |

Rotas que exigem login esperam o cabeçalho:
`Authorization: Bearer <token recebido no login ou cadastro>`

## 3. Hospedagem gratuita, sem cartão e sem prazo de validade

Nenhuma hospedagem é "grátis para sempre" com desempenho de plano pago —
mas as opções abaixo **não exigem assinatura fixa** e não têm data de
expiração automática (não são só um "trial"). A combinação recomendada é:
**banco de dados em um lugar + API rodando em outro**.

### Banco de dados Postgres (escolha um)

| Serviço | Por que | Ressalva |
|---|---|---|
| **Neon** (recomendado) | Postgres gratuito "para sempre", sem cartão. Quando ninguém usa por um tempo, o banco "dorme" e acorda sozinho na próxima consulta — sem você precisar fazer nada. | Limite de armazenamento pequeno (bom para um projeto como este). |
| **Supabase** | Também Postgres gratuito para sempre, sem cartão, e já vem com autenticação pronta se um dia você quiser trocar a nossa. | Projetos gratuitos pausam depois de ~1 semana sem uso, e aí é preciso entrar no painel e clicar em "restaurar" manualmente. |

Evite o Postgres gratuito do próprio Render: ele expira depois de 30 dias.

### Onde rodar a API (escolha um)

| Serviço | Por que | Ressalva |
|---|---|---|
| **Render** (recomendado para começar) | Plano gratuito de "Web Service" sem cartão, sem prazo de validade. Você conecta o repositório do GitHub e ele publica sozinho a cada alteração. | Depois de ~15 minutos sem receber nenhuma requisição, o serviço "dorme"; a próxima pessoa que acessar espera uns 30-50 segundos enquanto ele acorda. Para um projeto de estudo/demonstração, é um preço justo por ser gratuito. |
| **Cloudflare Workers** | Nunca "dorme" (sempre pronto para responder), gratuito para sempre, sem cartão, com um limite generoso de requisições por dia. | Não roda um servidor Express comum — é preciso adaptar o código para o formato de "Workers" (mais trabalho de configuração). Ótima opção se, no futuro, o tempo de resposta do Render incomodar. |

**Evite** contar com Fly.io ou Railway para "gratuito e sem prazo": hoje o
Fly.io pede cartão de crédito mesmo no teste gratuito, e o Railway dá um
crédito único de US$ 5 por 30 dias e depois cai para um crédito bem
pequeno (US$ 1/mês) — pode não ser suficiente para manter a API no ar o
mês inteiro.

### Passo a passo sugerido (Render + Neon)

1. Crie uma conta gratuita em **neon.tech**, crie um projeto e copie a
   "Connection string" do Postgres (algo como
   `postgresql://usuario:senha@ep-xxxx.neon.tech/neondb?sslmode=require`).
2. Suba a pasta `pixelradar-backend` para um repositório no GitHub.
3. Crie uma conta gratuita em **render.com**, escolha
   "New > Web Service", conecte o repositório.
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Em "Environment", adicione as variáveis:
   - `DATABASE_URL` → a connection string do Neon
   - `JWT_SECRET` → qualquer texto longo e aleatório
   - `CORS_ORIGEM` → o endereço onde o site (frontend) vai ficar (ex:
     `https://seunome.netlify.app`), ou `*` enquanto estiver testando
   - `RESEND_API_KEY` → chave da Resend (veja a seção "E-mails" abaixo)
   - `EMAIL_REMETENTE` → (opcional no teste) remetente com domínio verificado
5. Depois do primeiro deploy, rode a migração do banco uma única vez.
   A forma mais simples: no seu computador, com o `.env` local apontando
   para a `DATABASE_URL` do Neon, rode `npm run migrar`.
6. Pronto — sua API pública estará em algo como
   `https://pixelradar-api.onrender.com`. Cole essa URL na constante
   `API_BASE` dentro do `pixelradar.html` (procure por essa linha no
   início do `<script>`).

### Onde hospedar o site (o arquivo `pixelradar.html`)

Ele é um único arquivo HTML — qualquer hospedagem de site estático
gratuita serve, sem prazo de validade e sem cartão: **Cloudflare Pages**,
**Netlify**, **Vercel** ou **GitHub Pages** são boas opções.

## 4. E-mails (esqueci minha senha e troca de e-mail)

Os códigos de 6 dígitos são enviados pela **Resend** (resend.com, plano
gratuito: 3.000 e-mails/mês, 100/dia). Configure no Render:

- `RESEND_API_KEY`: a chave criada em resend.com > API Keys.
- `EMAIL_REMETENTE`: o remetente. **Sem esta variável** o sistema usa
  `onboarding@resend.dev`, que é só de teste e **entrega apenas para o
  e-mail dono da conta Resend**. Para qualquer usuário receber o código, é
  preciso verificar um domínio seu na Resend (Domains) e usar um endereço
  dele, ex.: `PixelRadar <nao-responda@seudominio.com.br>`.

Se o envio falhar, o motivo aparece nos logs do Render (`[email] Resend
recusou ...`), e o site continua respondendo normalmente.

### Atualizando um banco que já existe

Se o banco no Neon já foi criado antes desta versão, cole o conteúdo de
`db/migracao_codigos_email.sql` no SQL Editor e execute uma vez. Ele só
**adiciona colunas** (e pode ser repetido sem problema); nenhum dado é
apagado. Não rode `seed.sql` de novo.

### Sessão no navegador

Depois do login, o site guarda o token no `localStorage`
(`pixelradar_token`), para a pessoa continuar logada ao recarregar a
página. "Sair" apaga o token. Um token inválido ou expirado é descartado
automaticamente.

## 5. Aviso sobre os dados

Os jogos, lojas e preços são **fictícios**, criados só para o site ter
conteúdo para mostrar (veja `db/seed.sql`). Para usar dados reais, troque o
conteúdo do `seed.sql` — o resto do código não muda.
