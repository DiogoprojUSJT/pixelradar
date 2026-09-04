function emailValido(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function senhaValida(senha) {
  return typeof senha === 'string' && senha.length >= 8;
}

module.exports = { emailValido, senhaValida };
