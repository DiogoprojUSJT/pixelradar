const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const autenticar = require('../middleware/autenticar');
const { limitadorCarrinho } = require('../middleware/limitador');
const { FORMAS_PAGAMENTO, normalizarItens, buscarOfertas } = require('../utils/carrinho');

const router = express.Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ATENÇÃO: o pagamento aqui é SIMULADO (demonstração). Nenhum dado de cartão é
// pedido ou guardado, e nenhuma cobrança real acontece. Os códigos abaixo
// são só texto de exemplo, sem valor de pagamento.
function codigoDemonstracao(forma) {
  if (forma === 'pix') {
    return 'DEMO-PIX-' + crypto.randomBytes(10).toString('hex').toUpperCase();
  }
  if (forma === 'boleto') {
    const d = Array.from(crypto.randomBytes(47), (b) => b % 10).join('');
    return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ` +
      `${d.slice(21, 26)}.${d.slice(26, 32)} ${d.slice(32, 33)} ${d.slice(33, 47)}`;
  }
  return null;
}

// Junta os pedidos com seus itens, no formato que o site usa.
async function carregarPedidos(usuarioId, pedidoId) {
  const filtro = pedidoId ? 'and p.id = $2' : '';
  const valores = pedidoId ? [usuarioId, pedidoId] : [usuarioId];
  const pedidos = await pool.query(
    `select p.id, p.forma_pagamento, p.status, p.total_centavos, p.codigo_pagamento,
            p.criado_em, p.pago_em, l.nome as loja
     from pedidos p
     join lojas l on l.id = p.loja_id
     where p.usuario_id = $1 ${filtro}
     order by p.criado_em desc
     limit 50`,
    valores
  );
  if (pedidos.rows.length === 0) return [];

  const itens = await pool.query(
    `select pedido_id, titulo, plataforma, preco_centavos, quantidade
     from itens_pedido where pedido_id = any($1::uuid[]) order by id asc`,
    [pedidos.rows.map((p) => p.id)]
  );
  return pedidos.rows.map((p) => ({
    ...p,
    itens: itens.rows.filter((i) => i.pedido_id === p.id).map(({ pedido_id, ...resto }) => resto)
  }));
}

// POST /api/v1/pedidos  { loja_id, forma_pagamento, itens: [{ oferta_id, quantidade }] }
router.post('/', autenticar, limitadorCarrinho, async (req, res, next) => {
  let cliente = null;
  try {
    const { loja_id, forma_pagamento } = req.body || {};
    const lojaId = Number(loja_id);
    if (!Number.isInteger(lojaId) || lojaId <= 0) {
      return res.status(400).json({ erro: 'Escolha a loja do pedido.' });
    }
    if (!FORMAS_PAGAMENTO.includes(forma_pagamento)) {
      return res.status(400).json({ erro: 'Escolha uma forma de pagamento: cartão, boleto ou Pix.' });
    }
    const { itens, erro } = normalizarItens((req.body || {}).itens);
    if (erro) return res.status(400).json({ erro });

    // Tudo abaixo vem do banco, nunca do navegador.
    const ofertas = await buscarOfertas(pool, itens.map((i) => i.oferta_id));
    const linhas = [];
    let total = 0;
    for (const item of itens) {
      const oferta = ofertas.get(item.oferta_id);
      if (!oferta) {
        return res.status(409).json({ erro: 'Alguma oferta não está mais disponível. Atualize o carrinho.' });
      }
      if (Number(oferta.loja_id) !== lojaId) {
        return res.status(400).json({ erro: 'Cada pedido é feito em uma loja por vez.' });
      }
      if (!oferta[`aceita_${forma_pagamento}`]) {
        return res.status(400).json({ erro: 'Essa loja não aceita essa forma de pagamento para todos os itens.' });
      }
      total += oferta.preco_centavos * item.quantidade;
      linhas.push({ oferta, quantidade: item.quantidade });
    }

    const percentual = Number(linhas[0].oferta.comissao_percentual);
    const comissao = Math.round((total * percentual) / 100);
    const codigo = codigoDemonstracao(forma_pagamento);
    const jaPago = forma_pagamento === 'cartao';

    cliente = await pool.connect();
    await cliente.query('begin');
    const novo = await cliente.query(
      `insert into pedidos
         (usuario_id, loja_id, forma_pagamento, status, total_centavos,
          comissao_percentual, comissao_centavos, codigo_pagamento, pago_em)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning id`,
      [
        req.usuarioId, lojaId, forma_pagamento,
        jaPago ? 'pago' : 'aguardando_pagamento',
        total, percentual, comissao, codigo,
        jaPago ? new Date() : null
      ]
    );
    const pedidoId = novo.rows[0].id;
    for (const { oferta, quantidade } of linhas) {
      await cliente.query(
        `insert into itens_pedido (pedido_id, oferta_id, titulo, plataforma, preco_centavos, quantidade)
         values ($1, $2, $3, $4, $5, $6)`,
        [pedidoId, oferta.id, oferta.titulo, oferta.plataforma, oferta.preco_centavos, quantidade]
      );
    }
    await cliente.query('commit');
    cliente.release();
    cliente = null;

    const [pedido] = await carregarPedidos(req.usuarioId, pedidoId);
    res.status(201).json({ pedido });
  } catch (erro) {
    if (cliente) {
      try { await cliente.query('rollback'); } catch (e) { /* já falhou */ }
      cliente.release();
    }
    next(erro);
  }
});

// GET /api/v1/pedidos — histórico da pessoa logada
router.get('/', autenticar, limitadorCarrinho, async (req, res, next) => {
  try {
    res.json({ pedidos: await carregarPedidos(req.usuarioId) });
  } catch (erro) {
    next(erro);
  }
});

// POST /api/v1/pedidos/:id/pagar-simulado — só para a demonstração de Pix/boleto
router.post('/:id/pagar-simulado', autenticar, limitadorCarrinho, async (req, res, next) => {
  try {
    if (!UUID.test(req.params.id)) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    const atualizado = await pool.query(
      `update pedidos set status = 'pago', pago_em = now()
       where id = $1 and usuario_id = $2 and status = 'aguardando_pagamento'
       returning id`,
      [req.params.id, req.usuarioId]
    );
    if (atualizado.rows.length === 0) {
      const existe = await pool.query('select status from pedidos where id = $1 and usuario_id = $2', [req.params.id, req.usuarioId]);
      if (!existe.rows[0]) return res.status(404).json({ erro: 'Pedido não encontrado.' });
      return res.status(409).json({ erro: 'Esse pedido não está aguardando pagamento.' });
    }
    const [pedido] = await carregarPedidos(req.usuarioId, req.params.id);
    res.json({ pedido });
  } catch (erro) {
    next(erro);
  }
});

// POST /api/v1/pedidos/:id/cancelar — só enquanto aguarda pagamento
router.post('/:id/cancelar', autenticar, limitadorCarrinho, async (req, res, next) => {
  try {
    if (!UUID.test(req.params.id)) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    const atualizado = await pool.query(
      `update pedidos set status = 'cancelado'
       where id = $1 and usuario_id = $2 and status = 'aguardando_pagamento'
       returning id`,
      [req.params.id, req.usuarioId]
    );
    if (atualizado.rows.length === 0) {
      const existe = await pool.query('select status from pedidos where id = $1 and usuario_id = $2', [req.params.id, req.usuarioId]);
      if (!existe.rows[0]) return res.status(404).json({ erro: 'Pedido não encontrado.' });
      return res.status(409).json({ erro: 'Só dá para cancelar pedidos que ainda aguardam pagamento.' });
    }
    const [pedido] = await carregarPedidos(req.usuarioId, req.params.id);
    res.json({ pedido });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
