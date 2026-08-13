import type { C2PAManifest } from '@/types';

const encoder = new TextEncoder();

export async function sha256(text: string): Promise<string> {
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashCreatorId(email: string): Promise<string> {
  const hash = await sha256(email.trim().toLowerCase());
  return `CR_${hash.slice(0, 6).toUpperCase()}`;
}

export async function hashPrompt(prompt: string): Promise<string> {
  return sha256(prompt);
}

/**
 * Computes a simulated perceptual hash (pHash) from image pixel data.
 * Loads the image into an 8x8 canvas, converts to grayscale, and produces
 * a 64-bit hash. Falls back to a URL-based deterministic hash if canvas
 * is tainted by CORS.
 */
export async function computePHash(imageUrl: string, promptHash: string): Promise<string> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('image load failed'));
      img.src = imageUrl;
    });

    await loaded;

    const size = 8;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas context');

    ctx.drawImage(img, 0, 0, size, size);

    let pixelData: Uint8ClampedArray;
    try {
      pixelData = ctx.getImageData(0, 0, size, size).data;
    } catch {
      // Canvas tainted by CORS — fall back to deterministic hash
      return fallbackPHash(imageUrl, promptHash);
    }

    const grays: number[] = [];
    for (let i = 0; i < pixelData.length; i += 4) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      grays.push(0.299 * r + 0.587 * g + 0.114 * b);
    }

    const avg = grays.reduce((a, b) => a + b, 0) / grays.length;
    let hash = '';
    for (const g of grays) {
      hash += g >= avg ? '1' : '0';
    }

    // Convert 64-bit binary to 16-char hex
    let hex = '';
    for (let i = 0; i < hash.length; i += 4) {
      hex += parseInt(hash.slice(i, i + 4), 2).toString(16);
    }
    return hex.toUpperCase();
  } catch {
    return fallbackPHash(imageUrl, promptHash);
  }
}

function fallbackPHash(imageUrl: string, promptHash: string): string {
  // Deterministic fallback: XOR the URL hash with the prompt hash
  let result = '';
  for (let i = 0; i < 16; i++) {
    const a = promptHash.charCodeAt(i % promptHash.length);
    const b = imageUrl.charCodeAt(i % imageUrl.length);
    result += ((a ^ b) & 0xff).toString(16).padStart(2, '0').slice(0, 1);
  }
  return result.toUpperCase();
}

export function generateAssetId(promptHash: string): string {
  return `ASSET_${promptHash.slice(0, 6).toUpperCase()}`;
}

export async function generateSignature(manifestData: string): Promise<string> {
  const hash = await sha256(manifestData + '::PROMPT_DNA_SEAL::v1');
  return `SIG_${hash.slice(0, 48).toUpperCase()}`;
}

export async function assembleC2PAManifest(params: {
  creatorId: string;
  prompt: string;
  promptHash: string;
  phash: string;
  modelName: string;
  assetId: string;
}): Promise<{ manifest: C2PAManifest; signature: string }> {
  const timestamp = new Date().toISOString();

  const manifest: C2PAManifest = {
    claim_generator: {
      name: 'Prompt-DNA Provenance Engine',
      version: '1.0.0',
    },
    claim_created: timestamp,
    assertions: {
      algorithmic_media: {
        model: params.modelName,
        prompt: params.prompt,
        prompt_hash: params.promptHash,
        generator: 'Pollinations.ai',
      },
      creative_work: {
        creator_id: params.creatorId,
        creator_pseudonym: params.creatorId,
      },
      content_credentials: {
        asset_id: params.assetId,
        perceptual_hash: params.phash,
        signature: '',
        provenance_level: 'C2PA_SIGNED_SEALED',
      },
    },
    signature: {
      algorithm: 'SHA-256',
      value: '',
      certificate: 'PROMPT-DNA-CA-2026',
    },
  };

  const manifestString = JSON.stringify(manifest);
  const signature = await generateSignature(manifestString);

  manifest.assertions.content_credentials.signature = signature;
  manifest.signature.value = signature;

  return { manifest, signature };
}

export function buildPollinationsUrl(prompt: string, model: string, seed: number): string {
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?model=${model}&seed=${seed}&width=768&height=768&nologo=true`;
}
