require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/db');

async function migrar() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, '..', 'db', 'seed.sql'), 'utf8');

  console.log('Criando tabelas (se ainda não existirem)...');
  await pool.query(schema);

  console.log('Verificando se já existem jogos cadastrados...');
  const existentes = await pool.query('select count(*)::int as total from jogos');

  if (existentes.rows[0].total > 0) {
    console.log('Já existem jogos no banco — pulando a inserção dos dados fictícios de exemplo.');
  } else {
    console.log('Inserindo dados fictícios de exemplo (jogos, lojas e ofertas)...');
    await pool.query(seed);
  }

  console.log('Pronto! Banco de dados preparado.');
  await pool.end();
}

migrar().catch((erro) => {
  console.error('Erro ao preparar o banco de dados:', erro);
  process.exit(1);
});
