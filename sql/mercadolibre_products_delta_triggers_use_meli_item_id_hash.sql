DROP TRIGGER IF EXISTS trg_mercadolibre_products_after_update;
DROP TRIGGER IF EXISTS trg_mercadolibre_products_after_insert;

DELIMITER $$

CREATE TRIGGER trg_mercadolibre_products_after_update
AFTER UPDATE ON mercadolibre_products
FOR EACH ROW
BEGIN

  IF NOT (OLD.price <=> NEW.price) THEN
    INSERT IGNORE INTO mercadolibre_products_delta (
      producto_id, meli_item_id, sku, campo,
      valor_anterior, valor_nuevo,
      operacion, origen, hash_idem
    )
    VALUES (
      NEW.id,
      NEW.meli_item_id,
      NEW.sku,
      'price',
      OLD.price,
      NEW.price,
      'UPDATE',
      'trigger',
      SHA2(CONCAT_WS('|', NEW.meli_item_id, NEW.sku, 'price', NEW.price, 'UPDATE'), 256)
    );
  END IF;

  IF NOT (OLD.available_quantity <=> NEW.available_quantity) THEN
    INSERT IGNORE INTO mercadolibre_products_delta (
      producto_id, meli_item_id, sku, campo,
      valor_anterior, valor_nuevo,
      operacion, origen, hash_idem
    )
    VALUES (
      NEW.id,
      NEW.meli_item_id,
      NEW.sku,
      'available_quantity',
      OLD.available_quantity,
      NEW.available_quantity,
      'UPDATE',
      'trigger',
      SHA2(CONCAT_WS('|', NEW.meli_item_id, NEW.sku, 'available_quantity', NEW.available_quantity, 'UPDATE'), 256)
    );
  END IF;

  IF NOT (OLD.status <=> NEW.status) THEN
    INSERT IGNORE INTO mercadolibre_products_delta (
      producto_id, meli_item_id, sku, campo,
      valor_anterior, valor_nuevo,
      operacion, origen, hash_idem
    )
    VALUES (
      NEW.id,
      NEW.meli_item_id,
      NEW.sku,
      'status',
      OLD.status,
      NEW.status,
      'UPDATE',
      'trigger',
      SHA2(CONCAT_WS('|', NEW.meli_item_id, NEW.sku, 'status', NEW.status, 'UPDATE'), 256)
    );
  END IF;

  IF NOT (OLD.title <=> NEW.title) THEN
    INSERT IGNORE INTO mercadolibre_products_delta (
      producto_id, meli_item_id, sku, campo,
      valor_anterior, valor_nuevo,
      operacion, origen, hash_idem
    )
    VALUES (
      NEW.id,
      NEW.meli_item_id,
      NEW.sku,
      'title',
      OLD.title,
      NEW.title,
      'UPDATE',
      'trigger',
      SHA2(CONCAT_WS('|', NEW.meli_item_id, NEW.sku, 'title', NEW.title, 'UPDATE'), 256)
    );
  END IF;

  IF NOT (OLD.category_id <=> NEW.category_id) THEN
    INSERT IGNORE INTO mercadolibre_products_delta (
      producto_id, meli_item_id, sku, campo,
      valor_anterior, valor_nuevo,
      operacion, origen, hash_idem
    )
    VALUES (
      NEW.id,
      NEW.meli_item_id,
      NEW.sku,
      'category_id',
      OLD.category_id,
      NEW.category_id,
      'UPDATE',
      'trigger',
      SHA2(CONCAT_WS('|', NEW.meli_item_id, NEW.sku, 'category_id', NEW.category_id, 'UPDATE'), 256)
    );
  END IF;

  IF NOT (OLD.listing_type_id <=> NEW.listing_type_id) THEN
    INSERT IGNORE INTO mercadolibre_products_delta (
      producto_id, meli_item_id, sku, campo,
      valor_anterior, valor_nuevo,
      operacion, origen, hash_idem
    )
    VALUES (
      NEW.id,
      NEW.meli_item_id,
      NEW.sku,
      'listing_type_id',
      OLD.listing_type_id,
      NEW.listing_type_id,
      'UPDATE',
      'trigger',
      SHA2(CONCAT_WS('|', NEW.meli_item_id, NEW.sku, 'listing_type_id', NEW.listing_type_id, 'UPDATE'), 256)
    );
  END IF;

END$$

CREATE TRIGGER trg_mercadolibre_products_after_insert
AFTER INSERT ON mercadolibre_products
FOR EACH ROW
BEGIN
  INSERT IGNORE INTO mercadolibre_products_delta (
    producto_id,
    meli_item_id,
    sku,
    campo,
    valor_anterior,
    valor_nuevo,
    operacion,
    origen,
    hash_idem
  )
  VALUES (
    NEW.id,
    NEW.meli_item_id,
    NEW.sku,
    'new_sku',
    NULL,
    NEW.sku,
    'INSERT',
    'trigger',
    SHA2(CONCAT_WS('|', NEW.meli_item_id, NEW.sku, 'new_sku', NEW.sku, 'INSERT'), 256)
  );
END$$

DELIMITER ;
