/*
# Create provenance records table for Prompt-DNA

1. New Tables
- `provenance_records`: Stores C2PA-style provenance manifests for AI-generated images.
  - `id` (uuid, primary key)
  - `asset_id` (text, unique) — public asset identifier like ASSET_9A4F12
  - `creator_id` (text) — pseudonymous creator ID like CR_9A4F12
  - `prompt` (text) — the original AI prompt
  - `prompt_hash` (text) — SHA-256 hash of the prompt
  - `phash` (text) — simulated perceptual hash of the generated image
  - `model_name` (text) — model used (FLUX.1, SDXL Turbo, etc.)
  - `image_url` (text) — URL of the generated image
  - `c2pa_manifest` (jsonb) — full C2PA manifest JSON
  - `signature` (text) — digital signature mockup
  - `parent_id` (uuid, nullable, self-referential FK) — for lineage tree (null = original)
  - `created_at` (timestamptz)

2. Security
- Enable RLS on `provenance_records`.
- Single-tenant (no auth): allow anon + authenticated full CRUD since data is intentionally shared/public.
*/

CREATE TABLE IF NOT EXISTS provenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text UNIQUE NOT NULL,
  creator_id text NOT NULL,
  prompt text NOT NULL,
  prompt_hash text NOT NULL,
  phash text NOT NULL,
  model_name text NOT NULL,
  image_url text NOT NULL,
  c2pa_manifest jsonb NOT NULL,
  signature text NOT NULL,
  parent_id uuid REFERENCES provenance_records(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE provenance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_provenance" ON provenance_records;
CREATE POLICY "anon_select_provenance" ON provenance_records FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_provenance" ON provenance_records;
CREATE POLICY "anon_insert_provenance" ON provenance_records FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_provenance" ON provenance_records;
CREATE POLICY "anon_update_provenance" ON provenance_records FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_provenance" ON provenance_records;
CREATE POLICY "anon_delete_provenance" ON provenance_records FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_provenance_parent_id ON provenance_records(parent_id);
CREATE INDEX IF NOT EXISTS idx_provenance_creator_id ON provenance_records(creator_id);
CREATE INDEX IF NOT EXISTS idx_provenance_asset_id ON provenance_records(asset_id);
