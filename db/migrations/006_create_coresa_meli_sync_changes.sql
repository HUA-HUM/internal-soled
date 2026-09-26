-- coresa_meli_sync_changes: historial de cambios de precio y stock que el
-- actualizador de coresa-api aplica sobre publicaciones de MercadoLibre.
--
-- Una fila por actualizacion enviada a ML, no una por campo: si cambian
-- precio y stock juntos, es una sola fila.
--
-- Solo se registran las actualizaciones que se intentaron. Las
-- publicaciones que ya estaban con el valor correcto no dejan fila.
--
-- result distingue tres casos que antes se confundian en uno:
--   updated      se mando y ML lo aplico
--   not_applied  se mando, ML respondio OK, pero el valor no cambio
--                (items con variaciones, catalogo, topes de precio)
--   failed       ML lo rechazo o hubo error de red
--
-- price_* van en enteros de pesos, que es como se publica en ML.
--
-- Los campos de precio o de stock van en NULL cuando esa actualizacion no
-- tocaba ese campo: si solo se actualizo stock, los tres price_* quedan NULL.
--
-- run_id NO lleva foreign key contra process_runs: si alguna vez se limpian
-- corridas viejas no queremos que se caigan las filas de historial.
--
-- La tabla es solo de insercion: nada se borra ni se actualiza.
--
-- Nota de numeracion: el 005 lo ocupa el ALTER de installments en
-- mercadolibre_products, asi que esta migracion quedo como 006.

CREATE TABLE coresa_meli_sync_changes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_id BIGINT UNSIGNED NULL,
  sku VARCHAR(64) NOT NULL,
  mla VARCHAR(32) NOT NULL,
  source ENUM('cron', 'manual') NOT NULL DEFAULT 'cron',
  result ENUM('updated', 'not_applied', 'failed') NOT NULL,

  price_before INT NULL,
  price_requested INT NULL,
  price_applied INT NULL,

  stock_before INT NULL,
  stock_requested INT NULL,
  stock_applied INT NULL,

  meli_status VARCHAR(32) NULL,
  meli_sub_status JSON NULL,

  error_code VARCHAR(120) NULL,
  error_message TEXT NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_cmsc_sku (sku),
  INDEX idx_cmsc_mla (mla),
  INDEX idx_cmsc_created_at (created_at),
  INDEX idx_cmsc_result (result),
  INDEX idx_cmsc_run (run_id),
  INDEX idx_cmsc_sku_created (sku, created_at)
);
