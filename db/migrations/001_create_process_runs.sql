-- process_runs: un registro por corrida completa de un proceso (crons y ejecuciones
-- manuales). Complementa marketplace_product_change_actions, que registra cambios
-- puntuales por SKU; esta tabla responde "cuantas veces corrio" y "cuanto tardo".
--
-- process_name es generico a proposito ('meli_reconciliation',
-- 'marketplace_publications_sync', y lo que venga). Una sola tabla sirve para todos
-- los crons; no hace falta una tabla por proceso.
--
-- started_at y finished_at son DATETIME(3) para que duration_ms tenga resolucion
-- real de milisegundos y no multiplos de 1000.

CREATE TABLE process_runs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  process_name VARCHAR(120) NOT NULL,
  trigger_type ENUM('cron', 'manual') NOT NULL DEFAULT 'cron',
  status ENUM('running', 'completed', 'failed') NOT NULL DEFAULT 'running',
  started_at DATETIME(3) NOT NULL,
  finished_at DATETIME(3) NULL,
  duration_ms INT UNSIGNED NULL,
  summary_json JSON NULL,
  error_message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_process_runs_process_name (process_name),
  INDEX idx_process_runs_status (status),
  INDEX idx_process_runs_started_at (started_at),
  INDEX idx_process_runs_process_name_started_at (process_name, started_at)
);
