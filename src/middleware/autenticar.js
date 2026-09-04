const { verificarToken } = require('../utils/token');

function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const [tipo, token] = cabecalho.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Autenticação necessária. Faça login novamente.' });
  }

  try {
    const payload = verificarToken(token);
    req.usuarioId = payload.sub;
    next();
  } catch (erro) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

module.exports = autenticar;
