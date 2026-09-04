const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const { gerarHash, verificarSenha } = require('../utils/senha');
const { gerarToken } = require('../utils/token');
const { emailValido, senhaValida } = require('../utils/validacao');
const autenticar = require('../middleware/autenticar');
const { limitadorAutenticacao } = require('../middleware/limitador');
const { VERSAO_POLITICA_PRIVACIDADE, VERSAO_TERMOS_USO } = require('../constantes');

const router = express.Router();

// Nunca guardamos o IP em texto puro: aplicamos hash (minimização de dados,
// art. 6º da LGPD) e usamos só para investigar abuso, se necessário.
function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip || '')).digest('hex');
}

// POST /api/v1/usuarios/cadastro
router.post('/cadastro', limitadorAutenticacao, async (req, res, next) => {
  try {
    const { nome, email, senha, aceite_termos, aceite_privacidade, aceite_marketing } = req.body || {};

    if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
      return res.status(400).json({ erro: 'Informe um nome válido.' });
    }
    if (!emailValido(email)) {
      return res.status(400).json({ erro: 'Informe um e-mail válido.' });
    }
    if (!senhaValida(senha)) {
      return res.status(400).json({ erro: 'A senha precisa ter pelo menos 8 caracteres.' });
    }
    // Base legal: consentimento (art. 7º, I da LGPD). Sem aceite explícito
    // dos dois documentos, a conta não é criada.
    if (aceite_termos !== true || aceite_privacidade !== true) {
      return res.status(400).json({
        erro: 'É necessário aceitar os Termos de Uso e a Política de Privacidade para criar uma conta.'
      });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const existe = await pool.query('select id from usuarios where email = $1', [emailNormalizado]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.' });
    }

    const senhaHash = gerarHash(senha);
    const agora = new Date();
    const marketingConsentido = aceite_marketing === true;

    const resultado = await pool.query(
      `insert into usuarios
        (nome, email, senha_hash, termos_versao, termos_aceito_em,
         privacidade_versao, privacidade_aceito_em, marketing_consentido, marketing_consentido_em)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       returning id, nome, email, criado_em`,
      [
        nome.trim(),
        emailNormalizado,
        senhaHash,
        VERSAO_TERMOS_USO,
        agora,
        VERSAO_POLITICA_PRIVACIDADE,
        agora,
        marketingConsentido,
        marketingConsentido ? agora : null
      ]
    );

    const usuario = resultado.rows[0];
    const ipHash = hashIp(req.ip);

    // Registro de auditoria do consentimento (accountability, art. 6º, X da LGPD)
    await pool.query(
      `insert into log_consentimento (usuario_id, tipo, versao_documento, aceito, ip_hash) values
       ($1, 'termos_uso', $2, true, $3),
       ($1, 'politica_privacidade', $4, true, $3),
       ($1, 'marketing', $4, $5, $3)`,
      [usuario.id, VERSAO_TERMOS_USO, ipHash, VERSAO_POLITICA_PRIVACIDADE, marketingConsentido]
    );

    const token = gerarToken(usuario.id);
    res.status(201).json({ token, usuario });
  } catch (erro) {
    next(erro);
  }
});

// POST /api/v1/usuarios/login
router.post('/login', limitadorAutenticacao, async (req, res, next) => {
  try {
    const { email, senha } = req.body || {};
    if (!emailValido(email) || !senha) {
      return res.status(400).json({ erro: 'Informe e-mail e senha.' });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const resultado = await pool.query(
      'select id, nome, email, senha_hash from usuarios where email = $1 and excluido_em is null',
      [emailNormalizado]
    );
    const usuario = resultado.rows[0];

    if (!usuario || !verificarSenha(senha, usuario.senha_hash)) {
      // Mensagem genérica de propósito: não revela se o e-mail existe ou não.
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    const token = gerarToken(usuario.id);
    res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
  } catch (erro) {
    next(erro);
  }
});

// GET /api/v1/usuarios/me — direito de confirmação e acesso (art. 18, I e II)
router.get('/me', autenticar, async (req, res, next) => {
  try {
    const resultado = await pool.query(
      `select id, nome, email, criado_em, marketing_consentido, termos_versao, privacidade_versao
       from usuarios where id = $1 and excluido_em is null`,
      [req.usuarioId]
    );
    if (!resultado.rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json({ usuario: resultado.rows[0] });
  } catch (erro) {
    next(erro);
  }
});

// PUT /api/v1/usuarios/me — direito de correção (art. 18, III)
router.put('/me', autenticar, async (req, res, next) => {
  try {
    const { nome } = req.body || {};
    if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
      return res.status(400).json({ erro: 'Informe um nome válido.' });
    }
    const resultado = await pool.query(
      `update usuarios set nome = $1, atualizado_em = now()
       where id = $2 and excluido_em is null
       returning id, nome, email`,
      [nome.trim(), req.usuarioId]
    );
    if (!resultado.rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json({ usuario: resultado.rows[0] });
  } catch (erro) {
    next(erro);
  }
});

// GET /api/v1/usuarios/me/exportar — direito de portabilidade (art. 18, V)
router.get('/me/exportar', autenticar, async (req, res, next) => {
  try {
    const usuario = await pool.query(
      `select id, nome, email, criado_em, marketing_consentido, termos_versao, privacidade_versao
       from usuarios where id = $1`,
      [req.usuarioId]
    );
    if (!usuario.rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });

    const alertas = await pool.query(
      'select id, jogo_id, preco_alvo_centavos, criado_em from alertas_preco where usuario_id = $1',
      [req.usuarioId]
    );
    const consentimentos = await pool.query(
      `select tipo, versao_documento, aceito, criado_em
       from log_consentimento where usuario_id = $1 order by criado_em asc`,
      [req.usuarioId]
    );

    res.setHeader('Content-Disposition', 'attachment; filename="meus-dados-pixelradar.json"');
    res.json({
      exportado_em: new Date().toISOString(),
      usuario: usuario.rows[0],
      alertas_de_preco: alertas.rows,
      historico_de_consentimento: consentimentos.rows
    });
  } catch (erro) {
    next(erro);
  }
});

// DELETE /api/v1/usuarios/me — direito de eliminação (art. 18, VI)
router.delete('/me', autenticar, async (req, res, next) => {
  try {
    const emailAnonimo = `removido-${req.usuarioId}@excluido.pixelradar`;
    await pool.query(
      `update usuarios
       set nome = 'Usuário removido', email = $1, senha_hash = '', excluido_em = now()
       where id = $2`,
      [emailAnonimo, req.usuarioId]
    );
    await pool.query('delete from alertas_preco where usuario_id = $1', [req.usuarioId]);
    res.json({ mensagem: 'Sua conta e os seus dados pessoais foram removidos.' });
  } catch (erro) {
    next(erro);
  }
});

// POST /api/v1/usuarios/me/revogar-consentimento — art. 8º, §5º da LGPD
router.post('/me/revogar-consentimento', autenticar, async (req, res, next) => {
  try {
    await pool.query('update usuarios set marketing_consentido = false where id = $1', [req.usuarioId]);
    await pool.query(
      `insert into log_consentimento (usuario_id, tipo, versao_documento, aceito)
       values ($1, 'marketing', $2, false)`,
      [req.usuarioId, VERSAO_POLITICA_PRIVACIDADE]
    );
    res.json({ mensagem: 'Consentimento para comunicações de marketing revogado.' });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
