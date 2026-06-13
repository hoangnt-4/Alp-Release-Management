-- =========================================================
-- Release Manager · Ads Data Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =========================================================

-- Ad units (one row per ad unit per app)
CREATE TABLE IF NOT EXISTS ad_units (
  id        BIGSERIAL PRIMARY KEY,
  app_key   TEXT NOT NULL,
  name      TEXT NOT NULL,
  type      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (app_key, name)
);

-- Ad metrics (one row per ad unit per reporting period)
CREATE TABLE IF NOT EXISTS ad_metrics (
  id               BIGSERIAL PRIMARY KEY,
  ad_unit_id       BIGINT NOT NULL REFERENCES ad_units(id) ON DELETE CASCADE,
  month            TEXT NOT NULL,          -- YYYYMM or YYYYMMDD
  requests         BIGINT,
  match_rate       NUMERIC(7,4),           -- percent, e.g. 97.28
  matched_req      BIGINT,
  show_rate        NUMERIC(7,4),
  impressions      BIGINT,
  ctr              NUMERIC(7,4),
  clicks           BIGINT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ad_unit_id, month)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ad_units_app_key ON ad_units(app_key);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_unit  ON ad_metrics(ad_unit_id);

-- Enable RLS (service key bypasses it; optional for extra safety)
ALTER TABLE ad_units   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_metrics ENABLE ROW LEVEL SECURITY;
