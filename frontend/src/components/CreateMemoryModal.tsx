import React, { useState } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { memoriesApi } from '../services/api';
import { MemoryType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

export default function CreateMemoryModal({ isOpen, onClose, onSuccess, userId }: Props) {
  const [content, setContent] = useState('');
  const [memoryType, setMemoryType] = useState<MemoryType>('fact');
  const [importance, setImportance] = useState<number>(0.8);
  const [confidence, setConfidence] = useState<number>(0.95);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await memoriesApi.create({
        user_id: userId,
        content: content.trim(),
        memory_type: memoryType,
        importance_score: importance,
        confidence_score: confidence,
      });
      setContent('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create memory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0f1420] border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Create New Memory</h3>
              <p className="text-xs text-slate-400">Stores structured fact with vector embedding</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Memory Statement (Third Person)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. User prefers WhatsApp notifications for critical alerts."
              rows={3}
              required
              className="w-full bg-[#141b2d] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={memoryType}
                onChange={(e) => setMemoryType(e.target.value as MemoryType)}
                className="w-full bg-[#141b2d] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="fact">fact</option>
                <option value="preference">preference</option>
                <option value="skill">skill</option>
                <option value="project">project</option>
                <option value="goal">goal</option>
                <option value="event">event</option>
                <option value="temporary">temporary</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Importance ({importance.toFixed(2)})
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={importance}
                onChange={(e) => setImportance(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 mt-2"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Confidence ({confidence.toFixed(2)})
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 mt-2"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Intelligent Pipeline:</span> Deduplication and conflict detection will automatically inspect existing memories to either reinforce or supersede older contradictory statements.
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? 'Creating...' : 'Save Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
