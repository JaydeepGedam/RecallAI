import { useEffect, useState } from 'react';
import { X, ArrowDown, History, AlertTriangle } from 'lucide-react';
import { memoriesApi } from '../services/api';
import { MemoryLineageResponse, LineageItem } from '../types';

interface Props {
  memoryId: string | null;
  onClose: () => void;
}

export default function MemoryLineageModal({ memoryId, onClose }: Props) {
  const [lineage, setLineage] = useState<MemoryLineageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memoryId) return;
    setLoading(true);
    setError(null);

    memoriesApi.getLineage(memoryId)
      .then(res => {
        setLineage(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load memory evolution lineage.');
        setLoading(false);
      });
  }, [memoryId]);

  if (!memoryId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0f1420] border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Memory Evolution & Lineage</h3>
              <p className="text-xs text-slate-400">Tracking how facts and preferences evolved over time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-6 max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="py-12 text-center text-sm text-slate-400 font-mono">
              Loading memory evolution chain...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && lineage && lineage.chain.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400">
              No historical evolution recorded for this memory.
            </div>
          )}

          {!loading && lineage && lineage.chain.length > 0 && (
            <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {lineage.chain.map((item: LineageItem, index: number) => {
                const isActive = item.status === 'active';
                const isSuperseded = item.status === 'superseded';
                const formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div key={item.id} className="relative group">
                    {/* Node Dot */}
                    <div className={`absolute -left-[1.85rem] top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-[#0f1420] transition-colors ${
                      isActive 
                        ? 'border-emerald-400 text-emerald-400 shadow-md shadow-emerald-500/20' 
                        : isSuperseded 
                        ? 'border-amber-400 text-amber-400' 
                        : 'border-slate-600 text-slate-500'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : isSuperseded ? 'bg-amber-400' : 'bg-slate-500'}`} />
                    </div>

                    {/* Card */}
                    <div className={`p-4 rounded-xl border transition-all ${
                      item.is_current 
                        ? 'bg-indigo-950/30 border-indigo-500/40 ring-1 ring-indigo-500/20' 
                        : 'bg-[#141b2d]/70 border-slate-800/80 hover:border-slate-700'
                    }`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">{formattedDate}</span>
                          {item.is_current && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                            {item.memory_type}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold tracking-wider border ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : isSuperseded
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-slate-200 font-medium">
                        "{item.content}"
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Importance: <strong className="text-slate-300">{item.importance_score.toFixed(2)}</strong></span>
                        <span>Confidence: <strong className="text-slate-300">{item.confidence_score.toFixed(2)}</strong></span>
                      </div>
                    </div>

                    {/* Arrow to Next Node */}
                    {index < lineage.chain.length - 1 && (
                      <div className="flex items-center justify-center my-1 text-slate-600">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
