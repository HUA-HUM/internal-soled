ALTER TABLE mercadolibre_products
  MODIFY sku VARCHAR(100) NULL;

ALTER TABLE mercadolibre_products_delta
  MODIFY sku VARCHAR(100) NULL;
