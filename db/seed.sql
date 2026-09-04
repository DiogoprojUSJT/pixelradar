-- Dados 100% ficticios, so para o site ter algo pra mostrar.
-- Rode este arquivo apenas uma vez em um banco novo (ou limpe as tabelas antes).

insert into lojas (nome) values
  ('ByteZone'), ('NerdBit Store'), ('GameFênix'), ('PixelKey'),
  ('ArcadeBR'), ('ChipStore'), ('ZetaGames'), ('Compufácil')
on conflict (nome) do nothing;

insert into jogos (titulo, plataforma, capa_estilo, preco_original_centavos) values
  ('Elden Ring', 'pc', 'gradiente-violeta', 24900),
  ('EA Sports FC 25', 'playstation', 'gradiente-verde', 29900),
  ('God of War Ragnarök', 'playstation', 'gradiente-vermelho', 34900),
  ('Grand Theft Auto V', 'pc', 'gradiente-dourado', 9900),
  ('Minecraft', 'switch', 'gradiente-verde-2', 14900),
  ('Red Dead Redemption 2', 'xbox', 'gradiente-rosa', 19900),
  ('Cyberpunk 2077', 'pc', 'gradiente-roxo', 19900),
  ('Cartão Steam Wallet R$100', 'pc', 'gradiente-azul', 10000);

-- Elden Ring
insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('ByteZone', 6890, true, false, true, 'imediata'),
  ('NerdBit Store', 7250, true, true, true, 'imediata'),
  ('GameFênix', 7490, true, false, true, 'até 10 min'),
  ('PixelKey', 7990, false, true, true, 'imediata'),
  ('ArcadeBR', 8200, true, false, false, 'imediata')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'Elden Ring';

-- EA Sports FC 25
insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('ChipStore', 14990, true, false, true, 'imediata'),
  ('ZetaGames', 15590, true, true, false, 'até 30 min'),
  ('ByteZone', 16200, false, false, true, 'imediata'),
  ('Compufácil', 16990, true, true, true, 'imediata')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'EA Sports FC 25';

-- God of War Ragnarök
insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('GameFênix', 9990, true, false, true, 'imediata'),
  ('NerdBit Store', 10450, true, true, true, 'imediata'),
  ('ArcadeBR', 10990, true, false, false, 'até 15 min'),
  ('PixelKey', 11490, false, true, true, 'imediata')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'God of War Ragnarök';

-- Grand Theft Auto V
insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('Compufácil', 2990, true, true, true, 'imediata'),
  ('ByteZone', 3190, true, false, true, 'imediata'),
  ('ChipStore', 3390, false, false, true, 'imediata')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'Grand Theft Auto V';

-- Minecraft
insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('ZetaGames', 8490, true, false, true, 'imediata'),
  ('PixelKey', 8890, true, true, true, 'imediata'),
  ('NerdBit Store', 9190, true, false, false, 'até 20 min')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'Minecraft';

-- Red Dead Redemption 2
insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('ArcadeBR', 6490, true, false, true, 'imediata'),
  ('GameFênix', 6790, true, true, false, 'até 15 min'),
  ('ByteZone', 6990, false, false, true, 'imediata'),
  ('Compufácil', 7290, true, true, true, 'imediata')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'Red Dead Redemption 2';

-- Cyberpunk 2077
insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('NerdBit Store', 5990, true, false, true, 'imediata'),
  ('ChipStore', 6290, true, true, true, 'imediata'),
  ('PixelKey', 6590, false, true, false, 'até 10 min')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'Cyberpunk 2077';

-- Cartão Steam Wallet R$100
insert into ofertas (jogo_id, loja_id, preco_centavos, aceita_cartao, aceita_boleto, aceita_pix, prazo_entrega)
select j.id, l.id, o.preco, o.cartao, o.boleto, o.pix, o.prazo
from (values
  ('ByteZone', 9490, true, false, true, 'imediata'),
  ('ZetaGames', 9650, true, true, true, 'imediata'),
  ('GameFênix', 9790, false, false, true, 'imediata')
) as o(loja, preco, cartao, boleto, pix, prazo)
join lojas l on l.nome = o.loja
join jogos j on j.titulo = 'Cartão Steam Wallet R$100';
