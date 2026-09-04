const express = require('express');
const { VERSAO_POLITICA_PRIVACIDADE, VERSAO_TERMOS_USO } = require('../constantes');

const router = express.Router();

router.get('/politica', (req, res) => {
  res.json({
    versao_politica_privacidade: VERSAO_POLITICA_PRIVACIDADE,
    versao_termos_uso: VERSAO_TERMOS_USO,
    resumo:
      'Coletamos apenas nome, e-mail e senha (armazenada de forma criptografada, nunca em texto puro) ' +
      'para criar sua conta e enviar os alertas de preço que você configurar. Você pode acessar, ' +
      'baixar uma cópia ou excluir os seus dados a qualquer momento pelas rotas em /usuarios/me.'
  });
});

module.exports = router;
