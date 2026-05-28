CREATE TABLE IF NOT EXISTS publisher_jobs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  job_id VARCHAR(80) NOT NULL,
  source VARCHAR(80) NOT NULL DEFAULT 'mercadolibre',

  status ENUM(
    'queued',
    'processing',
    'completed',
    'completed_with_errors',
    'failed',
    'cancelled'
  ) NOT NULL DEFAULT 'queued',

  total_items INT NOT NULL DEFAULT 0,
  queued_items INT NOT NULL DEFAULT 0,
  processing_items INT NOT NULL DEFAULT 0,
  done_items INT NOT NULL DEFAULT 0,
  error_items INT NOT NULL DEFAULT 0,
  skipped_items INT NOT NULL DEFAULT 0,

  requested_by_odoo_user_id BIGINT NULL,
  requested_by_name VARCHAR(255) NULL,
  requested_by_email VARCHAR(255) NULL,

  options JSON NULL,
  original_request JSON NOT NULL,

  idempotency_key VARCHAR(160) NULL,

  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_publisher_jobs_job_id (job_id),
  UNIQUE KEY uq_publisher_jobs_idempotency_key (idempotency_key),

  KEY idx_publisher_jobs_status (status),
  KEY idx_publisher_jobs_source (source),
  KEY idx_publisher_jobs_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS publisher_job_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  run_id VARCHAR(100) NOT NULL,
  job_id VARCHAR(80) NOT NULL,

  sku VARCHAR(120) NOT NULL,
  marketplace VARCHAR(80) NOT NULL,
  source VARCHAR(80) NOT NULL DEFAULT 'mercadolibre',

  status ENUM(
    'queued',
    'processing',
    'retrying',
    'completed',
    'failed',
    'skipped',
    'cancelled'
  ) NOT NULL DEFAULT 'queued',

  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,

  bullmq_job_id VARCHAR(160) NULL,

  message VARCHAR(500) NULL,
  error_message TEXT NULL,
  error_code VARCHAR(120) NULL,

  source_product_snapshot JSON NULL,
  payload_snapshot JSON NULL,
  response_snapshot JSON NULL,

  marketplace_publication_id BIGINT NULL,
  external_product_id VARCHAR(160) NULL,

  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_publisher_job_runs_run_id (run_id),
  UNIQUE KEY uq_publisher_job_runs_job_sku_marketplace (job_id, sku, marketplace),

  KEY idx_publisher_job_runs_job_id (job_id),
  KEY idx_publisher_job_runs_status (status),
  KEY idx_publisher_job_runs_sku (sku),
  KEY idx_publisher_job_runs_marketplace (marketplace),
  KEY idx_publisher_job_runs_bullmq_job_id (bullmq_job_id),
  KEY idx_publisher_job_runs_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS marketplace_product_publications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  sku VARCHAR(120) NOT NULL,
  marketplace VARCHAR(80) NOT NULL,
  source VARCHAR(80) NOT NULL DEFAULT 'mercadolibre',

  meli_item_id VARCHAR(80) NULL,
  external_product_id VARCHAR(160) NULL,
  external_sku VARCHAR(160) NULL,
  external_url VARCHAR(500) NULL,

  publication_status ENUM(
    'draft',
    'pending_publish',
    'published',
    'paused',
    'rejected',
    'error',
    'out_of_sync',
    'deleted'
  ) NOT NULL DEFAULT 'draft',

  sync_status ENUM(
    'synced',
    'pending',
    'processing',
    'failed'
  ) NOT NULL DEFAULT 'pending',

  title VARCHAR(500) NULL,
  description MEDIUMTEXT NULL,
  brand VARCHAR(255) NULL,
  model VARCHAR(255) NULL,
  gtin VARCHAR(80) NULL,

  category_id VARCHAR(160) NULL,
  category_name VARCHAR(255) NULL,
  category_path JSON NULL,

  list_price DECIMAL(14, 2) NULL,
  sale_price DECIMAL(14, 2) NULL,
  net_price DECIMAL(14, 2) NULL,
  discount_percentage DECIMAL(8, 2) NULL,
  stock INT NULL,

  currency VARCHAR(10) NOT NULL DEFAULT 'ARS',

  thumbnail VARCHAR(500) NULL,
  images_json JSON NULL,
  attributes_json JSON NULL,
  variations_json JSON NULL,

  payload_json JSON NULL,
  last_response_json JSON NULL,

  last_job_id VARCHAR(80) NULL,
  last_run_id VARCHAR(100) NULL,

  last_published_at DATETIME NULL,
  last_synced_at DATETIME NULL,
  last_error_at DATETIME NULL,
  last_error_message TEXT NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_marketplace_product_publications_sku_marketplace (sku, marketplace),

  KEY idx_marketplace_product_publications_sku (sku),
  KEY idx_marketplace_product_publications_marketplace (marketplace),
  KEY idx_marketplace_product_publications_meli_item_id (meli_item_id),
  KEY idx_marketplace_product_publications_external_product_id (external_product_id),
  KEY idx_marketplace_product_publications_publication_status (publication_status),
  KEY idx_marketplace_product_publications_sync_status (sync_status),
  KEY idx_marketplace_product_publications_updated_at (updated_at)
);
