export interface C2PAManifest {
  claim_generator: {
    name: string;
    version: string;
  };
  claim_created: string;
  assertions: {
    algorithmic_media: {
      model: string;
      prompt: string;
      prompt_hash: string;
      generator: string;
    };
    creative_work: {
      creator_id: string;
      creator_pseudonym: string;
    };
    content_credentials: {
      asset_id: string;
      perceptual_hash: string;
      signature: string;
      provenance_level: string;
    };
  };
  signature: {
    algorithm: string;
    value: string;
    certificate: string;
  };
}

export interface ProvenanceRecord {
  id: string;
  asset_id: string;
  creator_id: string;
  prompt: string;
  prompt_hash: string;
  phash: string;
  model_name: string;
  image_url: string;
  c2pa_manifest: C2PAManifest;
  signature: string;
  parent_id: string | null;
  created_at: string;
}

export type VerifyStatus = 'verified' | 'unknown' | 'invalid';

export const MODELS = [
  { id: 'flux', name: 'FLUX.1', pollinationsModel: 'flux' },
  { id: 'sdxl', name: 'SDXL Turbo', pollinationsModel: 'sdxl' },
  { id: 'sd3', name: 'Stable Diffusion 3', pollinationsModel: 'sd3' },
] as const;

export type ModelId = (typeof MODELS)[number]['id'];
