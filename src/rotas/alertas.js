const express = require('express');
const pool = require('../db');
const autenticar = require('../middleware/autenticar');

const router = express.Router();
router.use(autenticar);

// GET /api/v1/alertas
router.get('/', async (req, res, next) => {
  try {
    const resultado = await pool.query(
      `select a.id, a.jogo_id, j.titulo, a.preco_alvo_centavos, a.criado_em
       from alertas_preco a
       join jogos j on j.id = a.jogo_id
       where a.usuario_id = $1
       order by a.criado_em desc`,
      [req.usuarioId]
    );
    res.json({ alertas: resultado.rows });
  } catch (erro) {
    next(erro);
  }
});

// POST /api/v1/alertas  { jogo_id, preco_alvo_centavos }
router.post('/', async (req, res, next) => {
  try {
    const { jogo_id, preco_alvo_centavos } = req.body || {};
    if (!jogo_id || !Number.isInteger(preco_alvo_centavos) || preco_alvo_centavos <= 0) {
      return res.status(400).json({
        erro: 'Informe jogo_id e preco_alvo_centavos (um número inteiro maior que zero).'
      });
    }

    const jogo = await pool.query('select id from jogos where id = $1', [jogo_id]);
    if (!jogo.rows[0]) return res.status(404).json({ erro: 'Jogo não encontrado.' });

    const resultado = await pool.query(
      `insert into alertas_preco (usuario_id, jogo_id, preco_alvo_centavos)
       values ($1,$2,$3)
       returning id, jogo_id, preco_alvo_centavos, criado_em`,
      [req.usuarioId, jogo_id, preco_alvo_centavos]
    );
    res.status(201).json({ alerta: resultado.rows[0] });
  } catch (erro) {
    next(erro);
  }
});

// DELETE /api/v1/alertas/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('delete from alertas_preco where id = $1 and usuario_id = $2', [
      req.params.id,
      req.usuarioId
    ]);
    res.json({ mensagem: 'Alerta removido.' });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
