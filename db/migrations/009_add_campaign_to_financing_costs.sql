-- campaign: con que nombre le decimos a MercadoLibre que cuotas ofrece una
-- publicacion.
--
-- ML no permite publicaciones sueltas del mismo producto que solo se
-- diferencien en el precio: las agrupa y anula las que considera duplicadas.
-- Nos paso porque nunca le deciamos que cuotas ofrece cada una, asi que dos
-- variantes salian identicas en cuotas y entrega. El dato viaja como termino
-- de venta INSTALLMENTS_CAMPAIGN, con vocabulario propio de ML.
--
-- NULL significa "sin campana", que es lo que corresponde al contado: la
-- publicacion no lleva el termino de venta. No va '' ni 'sin_campana': NULL es
-- lo que dice la verdad.
--
-- 6x_campaign es el unico de los cinco que NO esta observado en las
-- publicaciones de la cuenta, porque hoy no hay ninguna con 6 cuotas; se
-- asume por el patron de los otros. Si ML lo rechaza al publicar, se corrige
-- con un UPDATE y sin deploy, que es la razon de tenerlo en la tabla.

ALTER TABLE meli_financing_costs
  ADD COLUMN campaign VARCHAR(40) NULL AFTER costo;

UPDATE meli_financing_costs SET campaign = 'pcj-co-funded' WHERE modalidad = 'cuota_promocionada';
UPDATE meli_financing_costs SET campaign = '3x_campaign'   WHERE modalidad = '3_cuotas';
UPDATE meli_financing_costs SET campaign = '6x_campaign'   WHERE modalidad = '6_cuotas';
UPDATE meli_financing_costs SET campaign = '9x_campaign'   WHERE modalidad = '9_cuotas';
UPDATE meli_financing_costs SET campaign = '12x_campaign'  WHERE modalidad = '12_cuotas';
