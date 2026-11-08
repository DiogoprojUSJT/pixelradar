const express = require('express');
const pool = require('../db');
const autenticar = require('../middleware/autenticar');
const { limitadorCarrinho } = require('../middleware/limitador');
const { normalizarItens, buscarOfertas } = require('../utils/carrinho');
 
const router = express.Router();
 
// POST /api/v1/carrinho/resumo  { itens: [{ oferta_id, quantidade }] }
// Quem não está logado guarda o carrinho só no navegador; quem está logado
// tem o carrinho salvo na conta (GET/PUT abaixo). Esta rota não guarda nada.
// Esta rota recalcula tudo com os preços ATUAIS do banco e agrupa por loja,
// porque cada compra é feita em uma loja por vez.
router.post('/resumo', limitadorCarrinho, async (req, res, next) => {
  try {
    const { itens, erro } = normalizarItens((req.body || {}).itens);
    if (erro) return res.status(400).json({ erro });
 
    const ofertas = await buscarOfertas(pool, itens.map((i) => i.oferta_id));
    const indisponiveis = [];
    const grupos = new Map();
 
    for (const item of itens) {
      const oferta = ofertas.get(item.oferta_id);
      if (!oferta) {
        indisponiveis.push(item.oferta_id);
        continue;
      }
      if (!grupos.has(oferta.loja_id)) {
        grupos.set(oferta.loja_id, {
          loja: { id: oferta.loja_id, nome: oferta.loja },
          itens: [],
          total_centavos: 0,
          formas_pagamento: { cartao: true, boleto: true, pix: true }
        });
      }
      const grupo = grupos.get(oferta.loja_id);
      const subtotal = oferta.preco_centavos * item.quantidade;
      grupo.itens.push({
        oferta_id: item.oferta_id,
        titulo: oferta.titulo,
        plataforma: oferta.plataforma,
        capa_estilo: oferta.capa_estilo,
        prazo_entrega: oferta.prazo_entrega,
        preco_centavos: oferta.preco_centavos,
        quantidade: item.quantidade,
        subtotal_centavos: subtotal
      });
      grupo.total_centavos += subtotal;
      // A loja só oferece uma forma de pagamento se TODOS os itens dela aceitarem.
      grupo.formas_pagamento.cartao = grupo.formas_pagamento.cartao && oferta.aceita_cartao;
      grupo.formas_pagamento.boleto = grupo.formas_pagamento.boleto && oferta.aceita_boleto;
      grupo.formas_pagamento.pix = grupo.formas_pagamento.pix && oferta.aceita_pix;
    }
 
    const lista = Array.from(grupos.values()).sort((a, b) => a.loja.nome.localeCompare(b.loja.nome));
    res.json({
      grupos: lista,
      indisponiveis,
      total_centavos: lista.reduce((soma, g) => soma + g.total_centavos, 0)
    });
  } catch (erro) {
    next(erro);
  }
});
 
// POST /api/v1/carrinho/ir-para-loja  { loja_id }
// Registra o clique (para saber quanto tráfego geramos para cada loja, base
// da comissão por indicação) e devolve o endereço da loja. Anônimo de
// propósito: não guarda usuário, IP nem o que estava no carrinho.
router.post('/ir-para-loja', limitadorCarrinho, async (req, res, next) => {
  try {
    const lojaId = Number((req.body || {}).loja_id);
    if (!Number.isInteger(lojaId) || lojaId <= 0) {
      return res.status(400).json({ erro: 'Loja inválida.' });
    }
    const loja = await pool.query('select id, nome, site_url from lojas where id = $1', [lojaId]);
    if (!loja.rows[0]) return res.status(404).json({ erro: 'Loja não encontrada.' });
 
    const clique = await pool.query('insert into cliques_loja (loja_id) values ($1) returning id', [lojaId]);
 
    let url = null;
    if (loja.rows[0].site_url) {
      const destino = new URL(loja.rows[0].site_url);
      destino.searchParams.set('ref', 'pixelradar');
      destino.searchParams.set('clique', clique.rows[0].id);
      url = destino.toString();
    }
    res.json({ loja: loja.rows[0].nome, url, clique_id: clique.rows[0].id });
  } catch (erro) {
    next(erro);
  }
});
 
// GET /api/v1/carrinho — carrinho guardado na conta de quem está logado
router.get('/', autenticar, limitadorCarrinho, async (req, res, next) => {
  try {
    const resultado = await pool.query(
      `select ci.oferta_id, ci.quantidade
       from carrinho_itens ci join ofertas o on o.id = ci.oferta_id
       where ci.usuario_id = $1 order by ci.atualizado_em asc, ci.oferta_id asc`,
      [req.usuarioId]
    );
    res.json({ itens: resultado.rows });
  } catch (erro) {
    next(erro);
  }
});
 
// PUT /api/v1/carrinho  { itens: [{ oferta_id, quantidade }] } — substitui o carrinho da conta.
// Lista vazia esvazia. Ofertas que não existem mais são ignoradas.
router.put('/', autenticar, limitadorCarrinho, async (req, res, next) => {
  let cliente = null;
  try {
    const entrada = (req.body || {}).itens;
    let itens = [];
    if (!Array.isArray(entrada) || entrada.length > 0) {
      const normalizado = normalizarItens(entrada);
      if (normalizado.erro) return res.status(400).json({ erro: normalizado.erro });
      const existentes = await buscarOfertas(pool, normalizado.itens.map((i) => i.oferta_id));
      itens = normalizado.itens.filter((i) => existentes.has(i.oferta_id));
    }
 
    cliente = await pool.connect();
    await cliente.query('begin');
    await cliente.query('delete from carrinho_itens where usuario_id = $1', [req.usuarioId]);
    for (const item of itens) {
      await cliente.query(
        'insert into carrinho_itens (usuario_id, oferta_id, quantidade) values ($1, $2, $3)',
        [req.usuarioId, item.oferta_id, item.quantidade]
      );
    }
    await cliente.query('commit');
    cliente.release();
    cliente = null;
    res.json({ itens: itens });
  } catch (erro) {
    if (cliente) {
      try { await cliente.query('rollback'); } catch (e) { /* já falhou */ }
      cliente.release();
    }
    next(erro);
  }
});
 
module.exports = router;