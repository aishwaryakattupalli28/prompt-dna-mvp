import { useEffect, useState } from 'react';
import { GitBranch, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { ProvenanceRecord } from '@/types';
import { supabase } from '@/lib/supabase';

interface LineageTabProps {
  records: ProvenanceRecord[];
}

interface LineageNode {
  record: ProvenanceRecord;
  children: LineageNode[];
}

function buildTree(records: ProvenanceRecord[]): LineageNode[] {
  const map = new Map<string, LineageNode>();
  const roots: LineageNode[] = [];

  for (const r of records) {
    map.set(r.id, { record: r, children: [] });
  }

  for (const r of records) {
    const node = map.get(r.id)!;
    if (r.parent_id && map.has(r.parent_id)) {
      map.get(r.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function LineageCard({ node, depth }: { node: LineageNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col" style={{ marginLeft: `${depth * 32}px` }}>
      <div className="flex items-start gap-3">
        {/* Connector line */}
        {depth > 0 && (
          <div className="flex flex-col items-center mt-3">
            <div className="w-6 h-px bg-slate-600" />
          </div>
        )}

        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 flex-1 min-w-0 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-700">
              <img
                src={node.record.image_url}
                alt={node.record.asset_id}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-mono text-sm font-bold">
                  {node.record.asset_id}
                </span>
                {depth === 0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    ORIGINAL
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    DERIVATIVE
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs truncate mt-0.5">{node.record.prompt}</p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                <span>{node.record.creator_id}</span>
                <span>{node.record.model_name}</span>
                {hasChildren && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    {expanded ? 'Collapse' : `${node.children.length} variant(s)`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="mt-2 space-y-2 border-l border-slate-700 ml-6 pl-3">
          {node.children.map((child) => (
            <LineageCard key={child.record.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LineageTab({ records }: LineageTabProps) {
  const [allRecords, setAllRecords] = useState<ProvenanceRecord[]>(records);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (records.length > 0) {
      setAllRecords(records);
      return;
    }
    setLoading(true);
    supabase
      .from('provenance_records')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setAllRecords(data as ProvenanceRecord[]);
        setLoading(false);
      });
  }, [records]);

  const tree = buildTree(allRecords);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Media Lineage Tree</h2>
        <p className="text-slate-400 text-sm">
          Visualize how original AI images branch into edited and remixed derivatives.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
          <span className="text-slate-400 text-sm">Loading lineage data...</span>
        </div>
      )}

      {!loading && tree.length === 0 && (
        <div className="text-center py-12">
          <GitBranch className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            No lineage records yet. Generate and seal an image to start a lineage tree.
          </p>
        </div>
      )}

      {!loading && tree.length > 0 && (
        <div className="space-y-3">
          {tree.map((node) => (
            <LineageCard key={node.record.id} node={node} depth={0} />
          ))}
        </div>
      )}

      {!loading && allRecords.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            {allRecords.length} total assets
          </span>
          <span className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" />
            {tree.length} root{tree.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
