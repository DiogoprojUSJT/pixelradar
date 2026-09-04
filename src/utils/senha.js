const crypto = require('crypto');

// Usa apenas o módulo "crypto" nativo do Node (scrypt), então não depende
// de pacotes com compilação nativa (como bcrypt), o que evita problemas
// em plataformas de hospedagem gratuita mais restritas.

function gerarHash(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verificarSenha(senha, senhaHashArmazenada) {
  if (!senhaHashArmazenada || !senhaHashArmazenada.includes(':')) return false;
  const [salt, hashArmazenado] = senhaHashArmazenada.split(':');
  const hash = crypto.scryptSync(senha, salt, 64).toString('hex');
  const bufA = Buffer.from(hash, 'hex');
  const bufB = Buffer.from(hashArmazenado, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { gerarHash, verificarSenha };
