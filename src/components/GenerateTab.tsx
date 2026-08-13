import { useState } from 'react';
import {
  Sparkles,
  Loader2,
  ShieldCheck,
  Fingerprint,
  Hash,
  Image as ImageIcon,
  Clock,
  Code2,
  X,
  Copy,
  Check,
  GitBranch,
} from 'lucide-react';
import type { ProvenanceRecord, C2PAManifest } from '@/types';
import { MODELS, type ModelId } from '@/types';
import {
  hashCreatorId,
  hashPrompt,
  computePHash,
  generateAssetId,
  assembleC2PAManifest,
  buildPollinationsUrl,
} from '@/lib/provenance';
import { supabase } from '@/lib/supabase';

interface GenerateTabProps {
  onRecordCreated: (record: ProvenanceRecord) => void;
  records: ProvenanceRecord[];
}

export default function GenerateTab({ onRecordCreated, records }: GenerateTabProps) {
  const [email, setEmail] = useState('');
  const [prompt, setPrompt] = useState('Cyberpunk street with neon rain');
  const [modelId, setModelId] = useState<ModelId>('flux');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ProvenanceRecord | null>(null);
  const [showManifest, setShowManifest] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  const selectedModel = MODELS.find((m) => m.id === modelId)!;

  const handleGenerate = async () => {
    if (!email.trim()) {
      setError('Please enter your email to generate a Creator ID.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const seed = Math.floor(Math.random() * 1_000_000);
      const imageUrl = buildPollinationsUrl(
        prompt,
        selectedModel.pollinationsModel,
        seed,
      );

      // Preload the image to ensure it's ready
      await preloadImage(imageUrl);

      const creatorId = await hashCreatorId(email);
      const promptHash = await hashPrompt(prompt);
      const phash = await computePHash(imageUrl, promptHash);
      const assetId = generateAssetId(promptHash);
      const { manifest, signature } = await assembleC2PAManifest({
        creatorId,
        prompt,
        promptHash,
        phash,
        modelName: selectedModel.name,
        assetId,
      });

      // Persist to Supabase
      const { data, error: dbError } = await supabase
        .from('provenance_records')
        .insert({
          asset_id: assetId,
          creator_id: creatorId,
          prompt,
          prompt_hash: promptHash,
          phash,
          model_name: selectedModel.name,
          image_url: imageUrl,
          c2pa_manifest: manifest,
          signature,
          parent_id: null,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);

      const record = data as unknown as ProvenanceRecord;
      setResult(record);
      onRecordCreated(record);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Generation failed: ${err.message}`
          : 'Generation failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemix = async () => {
    if (!result) return;
    setLoading(true);
    setError('');

    try {
      const remixPrompt = `${result.prompt}, remixed with dramatic lighting and enhanced detail`;
      const seed = Math.floor(Math.random() * 1_000_000);
      const imageUrl = buildPollinationsUrl(
        remixPrompt,
        selectedModel.pollinationsModel,
        seed,
      );

      await preloadImage(imageUrl);

      const promptHash = await hashPrompt(remixPrompt);
      const phash = await computePHash(imageUrl, promptHash);
      const assetId = generateAssetId(promptHash);
      const { manifest, signature } = await assembleC2PAManifest({
        creatorId: result.creator_id,
        prompt: remixPrompt,
        promptHash,
        phash,
        modelName: selectedModel.name,
        assetId,
      });

      const { data, error: dbError } = await supabase
        .from('provenance_records')
        .insert({
          asset_id: assetId,
          creator_id: result.creator_id,
          prompt: remixPrompt,
          prompt_hash: promptHash,
          phash,
          model_name: selectedModel.name,
          image_url: imageUrl,
          c2pa_manifest: manifest,
          signature,
          parent_id: result.id,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);

      const newRecord = data as unknown as ProvenanceRecord;
      setResult(newRecord);
      onRecordCreated(newRecord);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remix failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyField = (field: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Generate &amp; Seal DNA</h2>
        <p className="text-slate-400 text-sm">
          Generate a live AI image and attach cryptographic provenance metadata in real time.
        </p>
      </div>

      {/* Input panel */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Creator Email (hashed to pseudonymous ID)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="creator@example.com"
              className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Model</label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value as ModelId)}
              className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">AI Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            rows={3}
            className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none transition-colors resize-none"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-emerald-500/20"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating &amp; Sealing...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate &amp; Stamp DNA
            </>
          )}
        </button>
        {error && (
          <p className="text-red-400 text-sm mt-3 text-center">{error}</p>
        )}
      </div>

      {/* Output display */}
      {loading && !result && (
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-12 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-slate-400 text-sm">
            Fetching live AI image and computing provenance hashes...
          </p>
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generated image */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
            <div className="aspect-square bg-slate-900 relative">
              <img
                src={result.image_url}
                alt={result.asset_id}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-white font-mono">{result.asset_id}</span>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Model: <span className="text-white">{result.model_name}</span>
              </span>
              <button
                onClick={handleRemix}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
              >
                <GitBranch className="w-3.5 h-3.5" />
                Remix as Derivative
              </button>
            </div>
          </div>

          {/* Provenance card */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-6 flex flex-col">
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-700">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-emerald-400 font-bold text-sm tracking-wide">
                C2PA SIGNED &amp; SEALED
              </span>
            </div>

            {/* Provenance fields */}
            <div className="space-y-3 flex-1">
              <ProvenanceField
                icon={<Fingerprint className="w-4 h-4" />}
                label="Creator ID"
                value={result.creator_id}
                onCopy={() => copyField('creator', result.creator_id)}
                copied={copiedField === 'creator'}
              />
              <ProvenanceField
                icon={<Hash className="w-4 h-4" />}
                label="Prompt SHA-256"
                value={result.prompt_hash}
                onCopy={() => copyField('prompt', result.prompt_hash)}
                copied={copiedField === 'prompt'}
                mono
              />
              <ProvenanceField
                icon={<ImageIcon className="w-4 h-4" />}
                label="Asset Fingerprint (pHash)"
                value={result.phash}
                onCopy={() => copyField('phash', result.phash)}
                copied={copiedField === 'phash'}
                mono
              />
              <ProvenanceField
                icon={<Clock className="w-4 h-4" />}
                label="Generation Timestamp"
                value={new Date(result.created_at).toLocaleString()}
                onCopy={() => copyField('ts', result.created_at)}
                copied={copiedField === 'ts'}
              />
            </div>

            <button
              onClick={() => setShowManifest(true)}
              className="mt-5 flex items-center justify-center gap-2 w-full bg-slate-900/60 border border-slate-700 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 text-sm py-2.5 rounded-lg transition-colors"
            >
              <Code2 className="w-4 h-4" />
              View Full C2PA Manifest
            </button>
          </div>
        </div>
      )}

      {/* Manifest modal */}
      {showManifest && result && (
        <ManifestModal
          manifest={result.c2pa_manifest}
          onClose={() => setShowManifest(false)}
        />
      )}
    </div>
  );
}

function ProvenanceField({
  icon,
  label,
  value,
  onCopy,
  copied,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 bg-slate-900/40 rounded-lg p-2.5">
      <div className="text-slate-500 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-sm text-white truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
      <button
        onClick={onCopy}
        className="text-slate-500 hover:text-emerald-400 transition-colors flex-shrink-0"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ManifestModal({
  manifest,
  onClose,
}: {
  manifest: C2PAManifest;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(manifest, null, 2);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-400" />
            C2PA Manifest
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(json);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-slate-400 hover:text-emerald-400 transition-colors text-xs flex items-center gap-1"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <pre className="overflow-auto p-4 text-xs text-emerald-300 font-mono flex-1 leading-relaxed">
          {json}
        </pre>
      </div>
    </div>
  );
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image generation failed. Please try again.'));
    img.src = url;
  });
}
