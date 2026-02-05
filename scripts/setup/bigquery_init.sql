-- Script to initialize BigQuery Environment for CLIMB (All Environments)

-- Note: Datasets must be created manually or via gcloud first.
-- The tables below should be created in each dataset: climb_prod, climb_dev_1, climb_dev_2.

-- Example for climb_dev_1 (Repeat for others)
-- TABLE: geological_knowledge (For RAG)
CREATE OR REPLACE TABLE `climb_dev_1.geological_knowledge` (
  id STRING OPTIONS(description="Unique ID for the snippet"),
  content STRING OPTIONS(description="Text content from geological reports"),
  metadata JSON OPTIONS(description="Source metadata (filename, page, etc)"),
  location GEOGRAPHY OPTIONS(description="Centroid location of the study area"),
  embedding ARRAY<FLOAT64> OPTIONS(description="Vector embedding of the content")
);

CREATE OR REPLACE TABLE `climb_dev_2.geological_knowledge` LIKE `climb_dev_1.geological_knowledge`;
CREATE OR REPLACE TABLE `climb_prod.geological_knowledge` LIKE `climb_dev_1.geological_knowledge`;

-- TABLE: external_mineral_data (For Kaggle Data)
CREATE OR REPLACE TABLE `climb_dev_1.external_mineral_data` (
  site_name STRING,
  latitude FLOAT64,
  longitude FLOAT64,
  geom GEOGRAPHY,
  mineral_type STRING,
  grade FLOAT64,
  unit STRING,
  source STRING
);

CREATE OR REPLACE TABLE `climb_dev_2.external_mineral_data` LIKE `climb_dev_1.external_mineral_data`;
CREATE OR REPLACE TABLE `climb_prod.external_mineral_data` LIKE `climb_dev_1.external_mineral_data`;

-- TABLE: actual_production (For Reconciliation)
CREATE OR REPLACE TABLE `climb_dev_1.actual_production` (
  project_id STRING,
  timestamp TIMESTAMP,
  location GEOGRAPHY,
  depth_from FLOAT64,
  depth_to FLOAT64,
  mineral_type STRING,
  actual_grade FLOAT64
);

CREATE OR REPLACE TABLE `climb_dev_2.actual_production` LIKE `climb_dev_1.actual_production`;
CREATE OR REPLACE TABLE `climb_prod.actual_production` LIKE `climb_dev_1.actual_production`;
