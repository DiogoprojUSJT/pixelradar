const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const resultado = await pool.query('select id, nome from lojas order by nome asc');
    res.json({ lojas: resultado.rows });
  } catch (erro) {
    next(erro);
  }
});

module.exports = router;
