import { useEffect, useState } from 'react';
import { Dna, Sparkles, ScanSearch, GitBranch, ShieldCheck } from 'lucide-react';
import type { ProvenanceRecord } from '@/types';
import { supabase } from '@/lib/supabase';
import GenerateTab from '@/components/GenerateTab';
import VerifyTab from '@/components/VerifyTab';
import LineageTab from '@/components/LineageTab';

type TabId = 'generate' | 'verify' | 'lineage';

const TABS = [
  { id: 'generate' as TabId, label: 'Generate & Seal DNA', icon: Sparkles },
  { id: 'verify' as TabId, label: 'Verify Media', icon: ScanSearch },
  { id: 'lineage' as TabId, label: 'Lineage Tree', icon: GitBranch },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('generate');
  const [records, setRecords] = useState<ProvenanceRecord[]>([]);

  useEffect(() => {
    supabase
      .from('provenance_records')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setRecords(data as ProvenanceRecord[]);
      });
  }, []);

  const handleRecordCreated = (record: ProvenanceRecord) => {
    setRecords((prev) => [...prev, record]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Dna className="w-6 h-6 text-slate-950" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Prompt<span className="text-emerald-400">-DNA</span>
              </h1>
              <p className="text-[10px] text-slate-500 tracking-wider uppercase">
                AI Provenance Engine
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            C2PA Compliant
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    active
                      ? 'border-emerald-400 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'generate' && (
          <GenerateTab onRecordCreated={handleRecordCreated} records={records} />
        )}
        {activeTab === 'verify' && <VerifyTab records={records} />}
        {activeTab === 'lineage' && <LineageTab records={records} />}
      </main>

      {/* Footer */}
      <footer className="relative border-t border-slate-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Prompt-DNA Provenance Engine v1.0 — SHA-256 hashing via Web Crypto API
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Engine Online
            </span>
            <span>{records.length} assets sealed</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
