require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const jogosRotas = require('./src/rotas/jogos');
const lojasRotas = require('./src/rotas/lojas');
const usuariosRotas = require('./src/rotas/usuarios');
const alertasRotas = require('./src/rotas/alertas');
const privacidadeRotas = require('./src/rotas/privacidade');

const app = express();

// A API pode ficar atrás de um proxy (Render, Cloudflare, etc.)
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGEM || '*' }));
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => {
  res.json({
    servico: 'PixelRadar API',
    status: 'ok',
    documentacao: '/api/v1'
  });
});

app.get('/api/v1', (req, res) => {
  res.json({
    servico: 'PixelRadar API',
    versao: 'v1',
    endpoints: [
      'GET /api/v1/jogos',
      'GET /api/v1/jogos/:id/lojas',
      'GET /api/v1/lojas',
      'POST /api/v1/usuarios/cadastro',
      'POST /api/v1/usuarios/login',
      'GET /api/v1/usuarios/me',
      'PUT /api/v1/usuarios/me',
      'GET /api/v1/usuarios/me/exportar',
      'DELETE /api/v1/usuarios/me',
      'POST /api/v1/usuarios/me/revogar-consentimento',
      'GET /api/v1/alertas',
      'POST /api/v1/alertas',
      'DELETE /api/v1/alertas/:id',
      'GET /api/v1/privacidade/politica'
    ]
  });
});

app.use('/api/v1/jogos', jogosRotas);
app.use('/api/v1/lojas', lojasRotas);
app.use('/api/v1/usuarios', usuariosRotas);
app.use('/api/v1/alertas', alertasRotas);
app.use('/api/v1/privacidade', privacidadeRotas);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ erro: err.publico || 'Erro interno do servidor.' });
});

const porta = process.env.PORT || 3000;
app.listen(porta, () => {
  console.log(`PixelRadar API rodando na porta ${porta}`);
});
