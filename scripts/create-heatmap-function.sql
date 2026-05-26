-- Run this once in Supabase SQL Editor
-- Creates a grid-aggregation function for the permits heatmap
-- ROUND(lat, 2) ≈ 1.1 km grid, giving ~500–1500 cells for Toronto

CREATE OR REPLACE FUNCTION get_permit_heatmap(
  p_status      text DEFAULT NULL,
  p_permit_type text DEFAULT NULL,
  p_year_from   text DEFAULT NULL
)
RETURNS TABLE(grid_lat float8, grid_lng float8, cnt bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ROUND(lat::numeric, 2)::float8  AS grid_lat,
    ROUND(lng::numeric, 2)::float8  AS grid_lng,
    COUNT(*)::bigint                AS cnt
  FROM permits
  WHERE
    lat IS NOT NULL
    AND lng IS NOT NULL
    AND (p_status      IS NULL OR status       = p_status)
    AND (p_permit_type IS NULL OR permit_type  = p_permit_type)
    AND (p_year_from   IS NULL OR application_date >= (p_year_from || '-01-01')::date)
  GROUP BY grid_lat, grid_lng
  ORDER BY cnt DESC
$$;
