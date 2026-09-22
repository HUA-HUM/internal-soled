-- coresa_meli_publications: un registro por intento de publicar un SKU de Coresa
-- en MercadoLibre. No tiene nada que ver con publisher_job_runs, que es el flujo
-- de OnCity/Fravega: aca hay revision humana del borrador y dos publicaciones por
-- SKU (clasica y premium), que aquel flujo no contempla.
--
-- Es append-only por intento: si un SKU se republica, se inserta una fila nueva y
-- la anterior queda como historial. Por eso sku NO es unico.
--
-- draft_json guarda el borrador completo (titulo, descripcion, categoria,
-- atributos, fotos, precio, stock) tal como se va a mandar a meli-api. Es la
-- fuente de verdad de lo que se publico, incluso si despues cambia en ML.

CREATE TABLE coresa_meli_publications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(120) NOT NULL,
  status ENUM('draft', 'ready', 'publishing', 'published', 'partial', 'failed', 'discarded')
    NOT NULL DEFAULT 'draft',

  -- Quien lo pidio, informativo. Viene del panel; puede ser NULL.
  requested_by VARCHAR(180) NULL,

  -- Producto de Coresa tal cual vino de su API, sin normalizar.
  coresa_snapshot JSON NULL,

  -- Borrador armado por coresa-api (con OpenAI) y corregido por el usuario.
  draft_json JSON NULL,
  ai_model VARCHAR(80) NULL,
  ai_generated_at DATETIME NULL,

  -- Categoria elegida, repetida afuera del JSON para poder filtrar y agrupar.
  category_id VARCHAR(40) NULL,

  -- Respuesta de POST /meli/items/validate.
  validation_json JSON NULL,

  -- Resultado: un meli_item_id por listing type.
  classic_item_id VARCHAR(40) NULL,
  premium_item_id VARCHAR(40) NULL,
  permalink VARCHAR(500) NULL,
  response_json JSON NULL,

  error_code VARCHAR(120) NULL,
  error_message TEXT NULL,

  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_coresa_meli_pub_sku (sku),
  INDEX idx_coresa_meli_pub_status (status),
  INDEX idx_coresa_meli_pub_created_at (created_at),
  INDEX idx_coresa_meli_pub_sku_status (sku, status),
  UNIQUE KEY uq_coresa_meli_pub_classic (classic_item_id),
  UNIQUE KEY uq_coresa_meli_pub_premium (premium_item_id)
);
