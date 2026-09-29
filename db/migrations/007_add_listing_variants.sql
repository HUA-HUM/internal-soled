-- Variantes de publicacion: con que forma se publico cada MLA.
--
-- Un SKU puede estar publicado varias veces en MercadoLibre: la misma
-- mercaderia vendida de a 1, de a 6 o de a 100, en clasica o premium, y con
-- distintas modalidades de financiacion. Sin esos datos el actualizador le
-- mandaba el mismo precio a todas, y 31 publicaciones quedaron con el precio
-- del pack de Coresa en vez del unitario.
--
-- La formula que habilitan estas columnas:
--   precio_unitario = Precio_Convertido / base_units
--   precio del MLA  = precio_unitario * units_per_listing * price_factor
--   stock del MLA   = floor(Disponible / units_per_listing)
--
-- Las filas que ya existen quedan con origen = 'heredado' y listing_type y
-- units_per_listing en NULL. Ese NULL es el que frena al actualizador: no hay
-- que completarlas con defaults, porque suponer es lo que rompio los precios.
--
-- NOTA SOBRE LAS CLAVES: el archivo 004 dice PRIMARY KEY (SKU), pero en
-- produccion la tabla ya tiene PRIMARY KEY (SKU, MLA) + UNIQUE (MLA), que es
-- exactamente lo que se necesita: un MLA no puede repetirse, el SKU si, y SKU
-- queda indexado por ser la columna izquierda del PK. Por eso esta migracion
-- NO toca claves ni indices.

ALTER TABLE coresa_products_in_mercadolibre
  ADD COLUMN listing_type      VARCHAR(20)  NULL,
  ADD COLUMN units_per_listing INT          NULL,
  ADD COLUMN modalidad         VARCHAR(40)  NULL,
  ADD COLUMN price_factor      DECIMAL(6,4) NOT NULL DEFAULT 1.0000,
  ADD COLUMN origen            VARCHAR(20)  NOT NULL DEFAULT 'heredado',
  ADD COLUMN updated_at        TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP;

-- base_units: a cuantas unidades corresponde Precio_Convertido.
--
-- Precio_Convertido es el precio compuesto que viene de Coresa, pero no
-- siempre corresponde a una unidad: corresponde al empaque de Coresa
-- (CantIntermedia). Sin este dato no se puede sacar el precio unitario.
--
-- coresa-api lo empieza a mandar en POST /internal/coresa/products/bulk. El
-- upsert solo escribe esta columna cuando el producto la trae: si el feed la
-- omite, la fila conserva el valor que ya tenia (y una fila nueva arranca en 1
-- por el DEFAULT). Resetearla a 1 en cada sincronizacion seria repetir el bug.

ALTER TABLE coresa_products
  ADD COLUMN base_units INT NOT NULL DEFAULT 1;
