-- Lojas ficticias, mas precos baseados em pesquisa de mercado real (Steam, PSN, varejo BR).
-- Rode este arquivo apenas uma vez em um banco novo (ou limpe as tabelas antes).

insert into lojas (nome) values
  ('ByteZone'), ('NerdBit Store'), ('GameFênix'), ('PixelKey'),
  ('ArcadeBR'), ('ChipStore'), ('ZetaGames'), ('Compufácil')
on conflict (nome) do nothing;

insert into jogos (titulo, plataforma, capa_estilo, preco_original_centavos) values
  ('Elden Ring', 'pc', 'gradiente-violeta', 27450),
  ('EA Sports FC 25', 'playstation', 'gradiente-verde', 29990),
  ('God of War Ragnarök', 'playstation', 'gradiente-vermelho', 34990),
  ('Grand Theft Auto V', 'pc', 'gradiente-dourado', 14990),
  ('Minecraft', 'switch', 'gradiente-verde-2', 14990),
  ('Red Dead Redemption 2', 'xbox', 'gradiente-rosa', 24990),
  ('Cyberpunk 2077', 'pc', 'gradiente-roxo', 19990),
  ('Cartão Steam Wallet R$100', 'pc', 'gradiente-azul', 10000);

insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('ByteZone', 16490, true, false, true, 'imediata'),
  ('NerdBit Store', 17490, true, true, true, 'imediata'),
  ('GameFênix', 18490, true, false, true, 'até 10 min'),
  ('PixelKey', 19490, false, true, true, 'imediata'),
  ('ArcadeBR', 20490, true, false, false, 'imediata')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'Elden Ring';

insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('ChipStore', 8990, true, false, true, 'imediata'),
  ('ZetaGames', 9990, true, true, false, 'até 30 min'),
  ('ByteZone', 11490, false, false, true, 'imediata'),
  ('Compufácil', 12990, true, true, true, 'imediata')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'EA Sports FC 25';

insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('GameFênix', 12990, true, false, true, 'imediata'),
  ('NerdBit Store', 13990, true, true, true, 'imediata'),
  ('ArcadeBR', 14990, true, false, false, 'até 15 min'),
  ('PixelKey', 15990, false, true, true, 'imediata')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'God of War Ragnarök';

insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('Compufácil', 5990, true, true, true, 'imediata'),
  ('ByteZone', 6490, true, false, true, 'imediata'),
  ('ChipStore', 6990, false, false, true, 'imediata')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'Grand Theft Auto V';

insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('ZetaGames', 7990, true, false, true, 'imediata'),
  ('PixelKey', 8490, true, true, true, 'imediata'),
  ('NerdBit Store', 8990, true, false, false, 'até 20 min')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'Minecraft';

insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('ArcadeBR', 7490, true, false, true, 'imediata'),
  ('GameFênix', 7990, true, true, false, 'até 15 min'),
  ('ByteZone', 8490, false, false, true, 'imediata'),
  ('Compufácil', 8990, true, true, true, 'imediata')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'Red Dead Redemption 2';

insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('NerdBit Store', 7990, true, false, true, 'imediata'),
  ('ChipStore', 8490, true, true, true, 'imediata'),
  ('PixelKey', 8990, false, true, false, 'até 10 min')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'Cyberpunk 2077';

insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('ByteZone', 9290, true, false, true, 'imediata'),
  ('ZetaGames', 9490, true, true, true, 'imediata'),
  ('GameFênix', 9690, false, false, true, 'imediata')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'Cartão Steam Wallet R$100';
