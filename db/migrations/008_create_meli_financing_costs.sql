-- meli_financing_costs: lo que nos cobra MercadoLibre por financiar una venta
-- en cuotas, editable desde el panel en vez de compilado en coresa-api.
--
-- El costo se descuenta del precio de venta, asi que para que queden los
-- mismos pesos en la mano el precio se calcula dividiendo por (1 - costo), no
-- multiplicando por (1 + costo). En 12 cuotas la diferencia entre las dos
-- cuentas es de casi seis puntos. Esa division la hace coresa-api: aca se
-- guarda el costo, que es el dato, no el coeficiente, que es una cuenta.
--
-- costo va como FRACCION, no porcentaje: 21,6% se guarda 0.2160. La API valida
-- que este entre 0 y 0.5, asi un 21.6 escrito de mas se rechaza.
--
-- modalidad es la PK y es el mismo string que guarda
-- coresa_products_in_mercadolibre.modalidad, asi que los nombres de la carga
-- inicial tienen que quedar letra por letra: en produccion hay 327 filas en
-- contado, 41 en 3_cuotas, 32 en 9_cuotas y 32 en 12_cuotas, y si cambia una
-- letra esas filas dejan de encontrar su costo.
--
-- No hay DELETE a proposito: borrar una modalidad deja huerfanas las filas que
-- la usan, y esas filas son las que le dicen al actualizador que precio
-- corresponde. Para dejar de ofrecerla, activa = 0.
--
-- ALCANCE: estos costos los usa solo el publicador para cotizar una
-- publicacion nueva. El actualizador usa el price_factor guardado en cada fila
-- de coresa_products_in_mercadolibre, asi que cambiar un costo aca NO repecia
-- las publicaciones que ya existen.

CREATE TABLE meli_financing_costs (
  modalidad       VARCHAR(40)   NOT NULL,
  etiqueta        VARCHAR(80)   NOT NULL,
  costo           DECIMAL(6,4)  NOT NULL,
  activa          TINYINT(1)    NOT NULL DEFAULT 1,
  vigente_desde   DATE          NOT NULL,
  actualizado_por VARCHAR(120)  NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (modalidad)
);

-- Historial, para poder explicar dentro de seis meses por que un producto
-- salio a ese precio. Se escribe una fila antes de pisar el costo; si el costo
-- que llega es igual al que ya estaba, no se registra nada.

CREATE TABLE meli_financing_costs_history (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  modalidad      VARCHAR(40)  NOT NULL,
  costo_anterior DECIMAL(6,4) NOT NULL,
  costo_nuevo    DECIMAL(6,4) NOT NULL,
  cambiado_por   VARCHAR(120) NULL,
  cambiado_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mfch_modalidad_fecha (modalidad, cambiado_at)
);

-- Carga inicial: los valores que hoy estan escritos en el codigo de coresa-api.

INSERT INTO meli_financing_costs
  (modalidad, etiqueta, costo, activa, vigente_desde) VALUES
  ('contado',            'Contado',            0.0000, 1, '2026-09-30'),
  ('cuota_promocionada', 'Cuota promocionada', 0.0500, 1, '2026-09-30'),
  ('3_cuotas',           '3 cuotas',           0.0890, 1, '2026-09-30'),
  ('6_cuotas',           '6 cuotas',           0.1340, 1, '2026-09-30'),
  ('9_cuotas',           '9 cuotas',           0.1780, 1, '2026-09-30'),
  ('12_cuotas',          '12 cuotas',          0.2160, 1, '2026-09-30');
