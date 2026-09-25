-- coresa_products_in_mercadolibre: que SKUs de Coresa estan publicados en
-- MercadoLibre y si a cada publicacion hay que sincronizarle stock y precio.
--
-- Hoy la clave es PRIMARY KEY (SKU) + UNIQUE (MLA), o sea un SKU tiene como
-- maximo UNA publicacion. La API igual devuelve arrays en los GET by-sku para
-- no tener que cambiar el contrato si mas adelante se permite mas de una MLA
-- por SKU (el flujo de Coresa publica clasica y premium).
--
-- Esta tabla ya existia en la base cuando se escribio el modulo; este archivo
-- es el SHOW CREATE TABLE de produccion, para poder recrearla igual.

CREATE TABLE `coresa_products_in_mercadolibre` (
  `SKU` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `MLA` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updateStock` tinyint(1) NOT NULL DEFAULT '1',
  `updatePrice` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`SKU`),
  UNIQUE KEY `uq_coresa_products_in_mercadolibre_mla` (`MLA`)
);
