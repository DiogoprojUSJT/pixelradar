const crypto = require('crypto');

// Regras dos códigos enviados por e-mail (redefinir senha e trocar e-mail).
const VALIDADE_MINUTOS = 15;
const MAX_TENTATIVAS = 5;
const INTERVALO_REENVIO_SEGUNDOS = 60;

// 6 dígitos com aleatoriedade criptográfica (nunca Math.random).
function gerarCodigo() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// O código nunca é guardado em texto puro: só um HMAC dele, preso ao usuário
// e à finalidade (um código de "trocar e-mail" não serve para "redefinir senha").
function hashCodigo(usuarioId, finalidade, codigo) {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET || '')
    .update(`${usuarioId}:${finalidade}:${codigo}`)
    .digest('hex');
}

function codigoConfere(usuarioId, finalidade, codigoInformado, hashArmazenado) {
  if (!hashArmazenado || typeof codigoInformado !== 'string') return false;
  const calculado = hashCodigo(usuarioId, finalidade, codigoInformado.trim());
  const a = Buffer.from(calculado, 'hex');
  const b = Buffer.from(hashArmazenado, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function codigoComFormatoValido(codigo) {
  return typeof codigo === 'string' && /^\d{6}$/.test(codigo.trim());
}

function expiraEm() {
  return new Date(Date.now() + VALIDADE_MINUTOS * 60 * 1000);
}

module.exports = {
  VALIDADE_MINUTOS,
  MAX_TENTATIVAS,
  INTERVALO_REENVIO_SEGUNDOS,
  gerarCodigo,
  hashCodigo,
  codigoConfere,
  codigoComFormatoValido,
  expiraEm
};
