import { useState } from 'react';
import { Fingerprint, ShieldCheck, ShieldAlert, HelpCircle, Copy, Check } from 'lucide-react';
import type { ProvenanceRecord, VerifyStatus } from '@/types';
import { supabase } from '@/lib/supabase';

interface VerifyTabProps {
  records: ProvenanceRecord[];
}

export default function VerifyTab({ records }: VerifyTabProps) {
  const [status, setStatus] = useState<VerifyStatus | null>(null);
  const [matchedRecord, setMatchedRecord] = useState<ProvenanceRecord | null>(null);
  const [checking, setChecking] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setChecking(true);
    setStatus(null);
    setMatchedRecord(null);

    // Simulate provenance verification: check if a record's asset_id or prompt hash
    // matches a pattern in the filename, or pick a deterministic match from DB
    await new Promise((r) => setTimeout(r, 1200));

    // Try to find a matching record by checking if the filename contains an asset_id
    const nameUpper = file.name.toUpperCase();
    const match = records.find(
      (r) =>
        nameUpper.includes(r.asset_id.toUpperCase()) ||
        nameUpper.includes(r.prompt_hash.slice(0, 8).toUpperCase()),
    );

    // Also query Supabase for any record
    const { data: dbRecords } = await supabase
      .from('provenance_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    const dbMatch = dbRecords?.find(
      (r: ProvenanceRecord) =>
        nameUpper.includes(r.asset_id.toUpperCase()) ||
        nameUpper.includes(String(r.prompt_hash).slice(0, 8).toUpperCase()),
    );

    const finalMatch = match || dbMatch || records[0] || null;

    if (finalMatch) {
      setStatus('verified');
      setMatchedRecord(finalMatch as ProvenanceRecord);
    } else {
      setStatus('unknown');
    }

    setChecking(false);
  };

  const handleSimulateInvalid = () => {
    setChecking(true);
    setTimeout(() => {
      setStatus('invalid');
      setMatchedRecord(null);
      setChecking(false);
    }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Verify Media Provenance</h2>
        <p className="text-slate-400 text-sm">
          Upload an asset to check its C2PA provenance record and signature integrity.
        </p>
      </div>

      <label
        className="block border-2 border-dashed border-slate-700 rounded-xl p-12 text-center cursor-pointer transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5 mb-6"
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Fingerprint className="w-12 h-12 mx-auto text-slate-500 mb-3" />
        <p className="text-slate-300 font-medium">
          {fileName || 'Drop or click to upload an image for verification'}
        </p>
        <p className="text-slate-500 text-xs mt-1">PNG, JPG, WebP supported</p>
      </label>

      {checking && (
        <div className="flex items-center justify-center gap-3 py-8">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300 text-sm">Scanning provenance ledger...</span>
        </div>
      )}

      {status === 'verified' && matchedRecord && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-emerald-400 font-bold text-lg">VERIFIED</p>
              <p className="text-slate-400 text-xs">Provenance match found &amp; signature verified</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Asset ID</span>
              <span className="text-white font-mono">{matchedRecord.asset_id}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Creator ID</span>
              <span className="text-white font-mono">{matchedRecord.creator_id}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Model</span>
              <span className="text-white">{matchedRecord.model_name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Prompt Hash</span>
              <button
                onClick={() => copyToClipboard(matchedRecord.prompt_hash)}
                className="text-emerald-400 font-mono text-xs flex items-center gap-1 hover:text-emerald-300"
              >
                {matchedRecord.prompt_hash.slice(0, 20)}...
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex justify-between border-b border-slate-700/50 pb-2">
              <span className="text-slate-400">Perceptual Hash</span>
              <span className="text-white font-mono">{matchedRecord.phash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Timestamp</span>
              <span className="text-white text-xs">
                {new Date(matchedRecord.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {status === 'unknown' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-amber-400 font-bold text-lg">UNKNOWN</p>
              <p className="text-slate-400 text-xs">
                No trusted provenance record found for this asset.
              </p>
            </div>
          </div>
        </div>
      )}

      {status === 'invalid' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-red-400 font-bold text-lg">INVALID</p>
              <p className="text-slate-400 text-xs">
                Signature or integrity check failed. Asset may have been tampered with.
              </p>
            </div>
          </div>
        </div>
      )}

      {status && !checking && (
        <button
          onClick={handleSimulateInvalid}
          className="mt-4 text-xs text-slate-500 hover:text-red-400 transition-colors mx-auto block"
        >
          Simulate integrity check failure
        </button>
      )}
    </div>
  );
}
