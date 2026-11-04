const MAX_ITENS_DIFERENTES = 20;
const MAX_QUANTIDADE = 5;
const FORMAS_PAGAMENTO = ['cartao', 'boleto', 'pix'];

// Valida a lista enviada pelo navegador: [{ oferta_id, quantidade }].
// O navegador só diz QUAL oferta e QUANTAS unidades; preço, título e loja
// sempre vêm do banco, nunca do que o navegador mandar.
function normalizarItens(entrada) {
  if (!Array.isArray(entrada) || entrada.length === 0) {
    return { erro: 'O carrinho está vazio.' };
  }
  const porOferta = new Map();
  for (const item of entrada) {
    const ofertaId = Number(item && item.oferta_id);
    const quantidade = Number(item && item.quantidade);
    if (!Number.isInteger(ofertaId) || ofertaId <= 0) {
      return { erro: 'Item inválido no carrinho.' };
    }
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      return { erro: 'Quantidade inválida no carrinho.' };
    }
    const atual = porOferta.get(ofertaId) || 0;
    porOferta.set(ofertaId, Math.min(MAX_QUANTIDADE, atual + quantidade));
  }
  if (porOferta.size > MAX_ITENS_DIFERENTES) {
    return { erro: `O carrinho aceita no máximo ${MAX_ITENS_DIFERENTES} itens diferentes.` };
  }
  return {
    itens: Array.from(porOferta, ([oferta_id, quantidade]) => ({ oferta_id, quantidade }))
  };
}

// Busca no banco os dados reais das ofertas pedidas. Devolve um Map por id.
async function buscarOfertas(consulta, ids) {
  const resultado = await consulta.query(
    `select o.id, o.loja_id, o.preco_centavos, o.aceita_cartao, o.aceita_boleto, o.aceita_pix,
            o.prazo_entrega, j.titulo, j.plataforma, j.capa_estilo,
            l.nome as loja, l.comissao_percentual
     from ofertas o
     join jogos j on j.id = o.jogo_id
     join lojas l on l.id = o.loja_id
     where o.id = any($1::int[])`,
    [ids]
  );
  return new Map(resultado.rows.map((linha) => [Number(linha.id), linha]));
}

module.exports = {
  MAX_QUANTIDADE,
  FORMAS_PAGAMENTO,
  normalizarItens,
  buscarOfertas
};
