const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/v1/jogos?plataforma=pc&busca=elden&ordenar=menor-preco
router.get('/', async (req, res, next) => {
  try {
    const { plataforma, busca, ordenar } = req.query;
    const condicoes = [];
    const valores = [];

    if (plataforma && plataforma !== 'todos') {
      valores.push(plataforma);
      condicoes.push(`j.plataforma = $${valores.length}`);
    }
    if (busca) {
      valores.push(`%${String(busca).toLowerCase()}%`);
      condicoes.push(`lower(j.titulo) like $${valores.length}`);
    }

    const where = condicoes.length ? `where ${condicoes.join(' and ')}` : '';

    let ordem = 'j.id asc';
    if (ordenar === 'menor-preco') ordem = 'menor_preco asc';
    if (ordenar === 'nome') ordem = 'j.titulo asc';
    if (ordenar === 'maior-desconto') {
      ordem = '((j.preco_original_centavos - menor_preco)::float / j.preco_original_centavos) desc';
    }

    const sql = `
      select
        j.id, j.titulo, j.plataforma, j.capa_estilo, j.preco_original_centavos,
        min(o.preco_centavos) as menor_preco,
        count(o.id) as total_lojas
      from jogos j
      join ofertas o on o.jogo_id = j.id
      ${where}
      group by j.id
      order by ${ordem}
    `;

    const resultado = await pool.query(sql, valores);
    res.json({ jogos: resultado.rows });
  } catch (erro) {
    next(erro);
  }
});

// GET /api/v1/jogos/:id/lojas
router.get('/:id/lojas', async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `
      select
        o.id, l.nome as loja, o.preco_centavos,
        o.aceita_cartao, o.aceita_boleto, o.aceita_pix, o.prazo_entrega
      from ofertas o
      join lojas l on l.id = o.loja_id
      where o.jogo_id = $1
      order by o.preco_centavos asc
    `;
    const resultado = await pool.query(sql, [id]);
    res.json({ ofertas: resultado.rows });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
