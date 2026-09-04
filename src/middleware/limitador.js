const rateLimit = require('express-rate-limit');

// Protege as rotas de cadastro/login contra tentativas em massa
// (medida de segurança exigida pelo art. 46 da LGPD).
const limitadorAutenticacao = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.' }
});

module.exports = { limitadorAutenticacao };
