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

// Limite separado para as rotas que enviam ou conferem códigos por e-mail
// (esqueci a senha e troca de e-mail), para que errar o login não bloqueie
// a recuperação de senha, e vice-versa.
const limitadorCodigos = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.' }
});

// Carrinho e pedidos: mais folgado que o login, mas ainda protegido contra abuso.
const limitadorCarrinho = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas requisições em pouco tempo. Aguarde alguns minutos e tente novamente.' }
});

module.exports = { limitadorAutenticacao, limitadorCodigos, limitadorCarrinho };
