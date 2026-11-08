const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const { gerarHash, verificarSenha } = require('../utils/senha');
const { gerarToken } = require('../utils/token');
const { emailValido, senhaValida } = require('../utils/validacao');
const autenticar = require('../middleware/autenticar');
const { limitadorAutenticacao, limitadorCodigos } = require('../middleware/limitador');
const { VERSAO_POLITICA_PRIVACIDADE, VERSAO_TERMOS_USO } = require('../constantes');
const {
  enviarCodigoRedefinicaoSenha,
  enviarCodigoNovoEmail,
  enviarAvisoEmailAlterado
} = require('../email');
const {
  MAX_TENTATIVAS,
  INTERVALO_REENVIO_SEGUNDOS,
  gerarCodigo,
  hashCodigo,
  codigoConfere,
  codigoComFormatoValido,
  expiraEm
} = require('../utils/codigo');
 
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
 
// POST /api/v1/usuarios/esqueci-senha  { email }
// Envia um código de 6 dígitos para o e-mail cadastrado (válido por 15 min).
router.post('/esqueci-senha', limitadorCodigos, async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!emailValido(email)) {
      return res.status(400).json({ erro: 'Informe um e-mail válido.' });
    }
 
    const emailNormalizado = email.trim().toLowerCase();
    const resultado = await pool.query(
      'select id, redefinicao_enviado_em from usuarios where email = $1 and excluido_em is null',
      [emailNormalizado]
    );
    const usuario = resultado.rows[0];
 
    // Resposta sempre igual, exista a conta ou não: ninguém consegue usar este
    // formulário para descobrir quem está cadastrado.
    const respostaPadrao = {
      mensagem: 'Se esse e-mail estiver cadastrado, enviamos um código de 6 dígitos. Ele vale por 15 minutos.'
    };
 
    if (!usuario) return res.json(respostaPadrao);
 
    // Intervalo mínimo entre envios (evita encher a caixa de e-mail de alguém).
    if (
      usuario.redefinicao_enviado_em &&
      Date.now() - new Date(usuario.redefinicao_enviado_em).getTime() < INTERVALO_REENVIO_SEGUNDOS * 1000
    ) {
      return res.json(respostaPadrao);
    }
 
    const codigo = gerarCodigo();
    await pool.query(
      `update usuarios
       set redefinicao_codigo_hash = $1, redefinicao_expira_em = $2,
           redefinicao_tentativas = 0, redefinicao_enviado_em = now()
       where id = $3`,
      [hashCodigo(usuario.id, 'redefinir_senha', codigo), expiraEm(), usuario.id]
    );
 
    // Sem "await" de propósito: a resposta sai na mesma velocidade exista a
    // conta ou não (evita descobrir contas pelo tempo de resposta).
    enviarCodigoRedefinicaoSenha(emailNormalizado, codigo)
      .then((enviado) => {
        if (enviado) return null;
        // Falhou: apaga o código pendente para a pessoa poder tentar de novo já.
        return pool.query(
          `update usuarios
           set redefinicao_codigo_hash = null, redefinicao_expira_em = null, redefinicao_enviado_em = null
           where id = $1`,
          [usuario.id]
        );
      })
      .catch((erro) => console.error('Erro ao finalizar envio do código:', erro.message));
 
    res.json(respostaPadrao);
  } catch (erro) {
    next(erro);
  }
});
 
// POST /api/v1/usuarios/redefinir-senha  { email, codigo, nova_senha }
router.post('/redefinir-senha', limitadorCodigos, async (req, res, next) => {
  try {
    const { email, codigo, nova_senha } = req.body || {};
    if (!emailValido(email) || !codigoComFormatoValido(codigo)) {
      return res.status(400).json({ erro: 'Informe o e-mail e o código de 6 dígitos.' });
    }
    if (!senhaValida(nova_senha)) {
      return res.status(400).json({ erro: 'A nova senha precisa ter pelo menos 8 caracteres.' });
    }
 
    const erroCodigo = { erro: 'Código inválido ou expirado. Peça um novo código.' };
 
    // Consome uma tentativa ANTES de conferir o código, numa única operação
    // atômica: mesmo com vários palpites ao mesmo tempo, o limite vale.
    const consumo = await pool.query(
      `update usuarios
       set redefinicao_tentativas = redefinicao_tentativas + 1
       where email = $1 and excluido_em is null
         and redefinicao_codigo_hash is not null
         and redefinicao_expira_em > now()
         and redefinicao_tentativas < $2
       returning id, redefinicao_codigo_hash`,
      [email.trim().toLowerCase(), MAX_TENTATIVAS]
    );
    const usuario = consumo.rows[0];
    if (!usuario) return res.status(400).json(erroCodigo);
 
    if (!codigoConfere(usuario.id, 'redefinir_senha', codigo, usuario.redefinicao_codigo_hash)) {
      return res.status(400).json(erroCodigo);
    }
 
    await pool.query(
      `update usuarios
       set senha_hash = $1, redefinicao_codigo_hash = null, redefinicao_expira_em = null,
           redefinicao_tentativas = 0, redefinicao_enviado_em = null, atualizado_em = now()
       where id = $2`,
      [gerarHash(nova_senha), usuario.id]
    );
 
    res.json({ mensagem: 'Senha redefinida! Você já pode entrar com a nova senha.' });
  } catch (erro) {
    next(erro);
  }
});
 
// POST /api/v1/usuarios/me/email/solicitar  { novo_email, senha_atual }
// Passo 1 da troca de e-mail: confirma a senha e manda um código para o
// NOVO endereço (assim ninguém fica trancado fora por um e-mail digitado errado).
router.post('/me/email/solicitar', autenticar, limitadorCodigos, async (req, res, next) => {
  try {
    const { novo_email, senha_atual } = req.body || {};
    if (!emailValido(novo_email)) {
      return res.status(400).json({ erro: 'Informe um e-mail válido.' });
    }
 
    const resultado = await pool.query(
      'select id, email, senha_hash, novo_email_enviado_em from usuarios where id = $1 and excluido_em is null',
      [req.usuarioId]
    );
    const usuario = resultado.rows[0];
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
 
    if (!verificarSenha(senha_atual || '', usuario.senha_hash)) {
      return res.status(401).json({ erro: 'Senha atual incorreta.' });
    }
 
    const novoEmail = novo_email.trim().toLowerCase();
    if (novoEmail === usuario.email) {
      return res.status(400).json({ erro: 'Esse já é o e-mail da sua conta.' });
    }
 
    if (
      usuario.novo_email_enviado_em &&
      Date.now() - new Date(usuario.novo_email_enviado_em).getTime() < INTERVALO_REENVIO_SEGUNDOS * 1000
    ) {
      return res.status(429).json({ erro: 'Aguarde um minuto antes de pedir outro código.' });
    }
 
    const emUso = await pool.query('select id from usuarios where email = $1', [novoEmail]);
    if (emUso.rows.length > 0) {
      return res.status(409).json({ erro: 'Esse e-mail já está em uso por outra conta.' });
    }
 
    const codigo = gerarCodigo();
    await pool.query(
      `update usuarios
       set novo_email = $1, novo_email_codigo_hash = $2, novo_email_expira_em = $3,
           novo_email_tentativas = 0, novo_email_enviado_em = now()
       where id = $4`,
      [novoEmail, hashCodigo(usuario.id, 'novo_email', codigo), expiraEm(), usuario.id]
    );
 
    const enviado = await enviarCodigoNovoEmail(novoEmail, codigo);
    if (!enviado) {
      await pool.query(
        `update usuarios
         set novo_email = null, novo_email_codigo_hash = null, novo_email_expira_em = null,
             novo_email_tentativas = 0, novo_email_enviado_em = null
         where id = $1`,
        [usuario.id]
      );
      return res.status(502).json({ erro: 'Não conseguimos enviar o e-mail agora. Tente de novo em instantes.' });
    }
 
    res.json({ mensagem: `Enviamos um código de 6 dígitos para ${novoEmail}. Ele vale por 15 minutos.` });
  } catch (erro) {
    next(erro);
  }
});
 
// POST /api/v1/usuarios/me/email/confirmar  { codigo }
// Passo 2: com o código certo, o e-mail muda na hora.
router.post('/me/email/confirmar', autenticar, limitadorCodigos, async (req, res, next) => {
  try {
    const { codigo } = req.body || {};
    if (!codigoComFormatoValido(codigo)) {
      return res.status(400).json({ erro: 'Informe o código de 6 dígitos.' });
    }
 
    const erroCodigo = { erro: 'Código inválido ou expirado. Peça um novo código.' };
 
    const consumo = await pool.query(
      `update usuarios
       set novo_email_tentativas = novo_email_tentativas + 1
       where id = $1 and excluido_em is null
         and novo_email is not null and novo_email_codigo_hash is not null
         and novo_email_expira_em > now()
         and novo_email_tentativas < $2
       returning id, email, novo_email, novo_email_codigo_hash`,
      [req.usuarioId, MAX_TENTATIVAS]
    );
    const usuario = consumo.rows[0];
    if (!usuario) return res.status(400).json(erroCodigo);
 
    if (!codigoConfere(usuario.id, 'novo_email', codigo, usuario.novo_email_codigo_hash)) {
      return res.status(400).json(erroCodigo);
    }
 
    let atualizado;
    try {
      atualizado = await pool.query(
        `update usuarios
         set email = $1, novo_email = null, novo_email_codigo_hash = null, novo_email_expira_em = null,
             novo_email_tentativas = 0, novo_email_enviado_em = null, atualizado_em = now()
         where id = $2
         returning id, nome, email`,
        [usuario.novo_email, usuario.id]
      );
    } catch (erro) {
      // 23505 = e-mail já usado por outra conta (alguém cadastrou nesse meio tempo)
      if (erro.code === '23505') {
        return res.status(409).json({ erro: 'Esse e-mail acabou de ser usado por outra conta.' });
      }
      throw erro;
    }
 
    // Aviso de segurança para o e-mail antigo (não bloqueia a resposta).
    enviarAvisoEmailAlterado(usuario.email).catch(() => {});
 
    res.json({ mensagem: 'E-mail atualizado!', usuario: atualizado.rows[0] });
  } catch (erro) {
    next(erro);
  }
});
 
// PUT /api/v1/usuarios/me/senha — trocar a senha estando logado
router.put('/me/senha', autenticar, limitadorAutenticacao, async (req, res, next) => {
  try {
    const { senha_atual, nova_senha } = req.body || {};
    if (!senhaValida(nova_senha)) {
      return res.status(400).json({ erro: 'A nova senha precisa ter pelo menos 8 caracteres.' });
    }
    const resultado = await pool.query(
      'select senha_hash from usuarios where id = $1 and excluido_em is null',
      [req.usuarioId]
    );
    const usuario = resultado.rows[0];
    if (!usuario || !verificarSenha(senha_atual || '', usuario.senha_hash)) {
      return res.status(401).json({ erro: 'Senha atual incorreta.' });
    }
    const novoHash = gerarHash(nova_senha);
    await pool.query(
      'update usuarios set senha_hash = $1, atualizado_em = now() where id = $2',
      [novoHash, req.usuarioId]
    );
    res.json({ mensagem: 'Senha atualizada com sucesso.' });
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
 
    const pedidos = await pool.query(
      `select p.id, l.nome as loja, p.forma_pagamento, p.status, p.total_centavos, p.criado_em, p.pago_em,
              coalesce((select json_agg(json_build_object(
                'titulo', i.titulo, 'plataforma', i.plataforma,
                'preco_centavos', i.preco_centavos, 'quantidade', i.quantidade) order by i.id)
               from itens_pedido i where i.pedido_id = p.id), '[]'::json) as itens
       from pedidos p join lojas l on l.id = p.loja_id
       where p.usuario_id = $1 order by p.criado_em asc`,
      [req.usuarioId]
    );
 
    const carrinhoSalvo = await pool.query(
      `select j.titulo, l.nome as loja, ci.quantidade
       from carrinho_itens ci join ofertas o on o.id = ci.oferta_id
       join jogos j on j.id = o.jogo_id join lojas l on l.id = o.loja_id
       where ci.usuario_id = $1 order by ci.atualizado_em asc`,
      [req.usuarioId]
    );
 
    res.setHeader('Content-Disposition', 'attachment; filename="meus-dados-pixelradar.json"');
    res.json({
      exportado_em: new Date().toISOString(),
      usuario: usuario.rows[0],
      alertas_de_preco: alertas.rows,
      carrinho: carrinhoSalvo.rows,
      pedidos: pedidos.rows,
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
       set nome = 'Usuário removido', email = $1, senha_hash = '', excluido_em = now(),
           redefinicao_codigo_hash = null, redefinicao_expira_em = null,
           redefinicao_tentativas = 0, redefinicao_enviado_em = null,
           novo_email = null, novo_email_codigo_hash = null, novo_email_expira_em = null,
           novo_email_tentativas = 0, novo_email_enviado_em = null
       where id = $2`,
      [emailAnonimo, req.usuarioId]
    );
    await pool.query('delete from alertas_preco where usuario_id = $1', [req.usuarioId]);
    await pool.query('delete from carrinho_itens where usuario_id = $1', [req.usuarioId]);
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