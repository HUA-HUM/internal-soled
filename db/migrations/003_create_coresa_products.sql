-- coresa_products: espejo del feed de productos de la API de Coresa. Una fila
-- por SKU, que se sobreescribe entera en cada upsert (POST .../products/bulk).
--
-- Los nombres de columna son los del feed, sin traducir, para que quien ya
-- consume la API de Coresa lea esta tabla sin mapear nada. La API expone y
-- acepta exactamente esos nombres.
--
-- Precio_Convertido NO viene del feed: lo calcula otro proceso. Por eso el
-- upsert lo preserva con COALESCE en vez de pisarlo con NULL.
--
-- Esta tabla ya existia en la base cuando se escribio el modulo; este archivo
-- es el SHOW CREATE TABLE de produccion, para poder recrearla igual.

CREATE TABLE `coresa_products` (
  `SKU` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `CodBarra_Unitario` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `CodBarra_Intermedio` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `CodBarra_Master` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Descripcion` text COLLATE utf8mb4_unicode_ci,
  `Marca` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Macro_Familia` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Sub_Familia` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Cod_Alternativo` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Disponible` int NOT NULL DEFAULT '0',
  `Unidad_Medida` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Minimo_Venta` tinyint(1) DEFAULT NULL,
  `Venta_Unitaria` tinyint(1) DEFAULT NULL,
  `Precio_Lista_1` decimal(15,2) NOT NULL,
  `Impuestos` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Moneda` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `CantMaster` decimal(12,4) DEFAULT NULL,
  `CantIntermedia` decimal(12,4) DEFAULT NULL,
  `CantMinima` decimal(12,4) DEFAULT NULL,
  `Alto_cm` decimal(12,4) DEFAULT NULL,
  `Ancho_cm` decimal(12,4) DEFAULT NULL,
  `Largo_cm` decimal(12,4) DEFAULT NULL,
  `Dimensiones_Texto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Peso_kg` decimal(12,4) DEFAULT NULL,
  `Volumen_cc` decimal(14,4) DEFAULT NULL,
  `Material` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Color` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Tipo_Montaje` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Tipo_Instalacion` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Soporte` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `IP` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `IK` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Anti_Vandalico` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Apto_Exterior` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Alimentacion` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Tension_Entrada` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Tension_Salida` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Potencia_Nominal` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Potencia_Max` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Corriente` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Polos` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Ciclos_Electricos` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Ciclos_Mecanicos` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Lumenes` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Temp_Color` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Angulo` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Dimerizable` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Tipo_Luz` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Tipo_Camara` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Tipo_Lente` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Resolucion` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Canales` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Mic` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Audio_Bidireccional` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Reconocimiento_IA` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Capacidad_Rostros` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SATA` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `HDMI` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Tipo_Conexion` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Tipo_Conector` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `POE` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Puertos_POE` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Ancho_Banda` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `URL_Datasheet` text COLLATE utf8mb4_unicode_ci,
  `URL_Web` text COLLATE utf8mb4_unicode_ci,
  `URL_Imagen` text COLLATE utf8mb4_unicode_ci,
  `Certificado` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Precio_Convertido` int DEFAULT NULL,
  PRIMARY KEY (`SKU`)
);
