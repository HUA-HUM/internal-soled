-- Cuotas de MercadoLibre en mercadolibre_products.
--
-- El dato sale de sale_terms.INSTALLMENTS_CAMPAIGN del item de MELI, que no se
-- estaba guardando. El vocabulario observado sobre publicaciones activas es
-- acotado: 3x_campaign, 9x_campaign, 12x_campaign y pcj-co-funded (cuotas
-- simples, sobre listing type clasico); las premium sin campana no traen el
-- sale_term.
--
-- installments_quantity guarda el numero suelto (3, 9, 12) para poder filtrar y
-- agrupar sin parsear el string de la campana.
--
-- YA APLICADO EN PRODUCCION a mano. Este archivo queda para el historial y para
-- poder reproducir el esquema en otro entorno.

ALTER TABLE mercadolibre_products
  ADD COLUMN installments_campaign VARCHAR(30) NULL AFTER logistic_type,
  ADD COLUMN installments_quantity TINYINT UNSIGNED NULL AFTER installments_campaign;
