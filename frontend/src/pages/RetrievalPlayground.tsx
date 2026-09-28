import { useState } from 'react';
import { 
  Search, 
  Zap 
} from 'lucide-react';
import { memoriesApi } from '../services/api';
import { ScoredMemory } from '../types';

export default function RetrievalPlayground() {
  const userId = localStorage.getItem('recallai_user_id') || '56f3c1ec-1d26-4413-91f3-b0d1f549c470';
  const [query, setQuery] = useState('What backend framework and database does this user build with?');
  const [limit] = useState(5);
  const [results, setResults] = useState<ScoredMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const sampleQueries = [
    "What backend framework and database does this user build with?",
    "How does the user prefer to receive notifications?",
    "What AI projects is the user currently working on?",
    "Does the user prefer concise explanations?",
    "What frontend technology does this user use?"
  ];

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await memoriesApi.search(userId, searchQuery, limit);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Semantic Retrieval & Ranking Playground
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Inspect how pgvector embeddings and the 4-factor scoring formula rank memories in real-time.
        </p>
      </div>

      {/* Query Search Card */}
      <div className="p-6 rounded-2xl bg-[#0f1420] border border-slate-800/80 shadow-xl space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 font-mono">
            Natural Language Query
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ask anything about the user's preferences, skills, or constraints..."
                className="w-full bg-[#141b2d] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex-shrink-0"
            >
              <Zap className="w-4 h-4" />
              {loading ? 'Retrieving...' : 'Retrieve & Rank'}
            </button>
          </div>
        </div>

        {/* Preset Sample Queries */}
        <div>
          <span className="text-[11px] font-mono text-slate-400 mr-2">Try sample queries:</span>
          <div className="inline-flex flex-wrap gap-1.5 mt-1 sm:mt-0">
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => { setQuery(q); handleSearch(q); }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>
            {hasSearched ? `Retrieved ${results.length} ranked active memories` : 'Results will appear below'}
          </span>
          <span>Target User ID: {userId.slice(0, 8)}...</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500 font-mono">
            Generating vector embedding and computing 4-factor scoring matrix...
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0f1420] border border-slate-800 text-center text-sm text-slate-400 font-mono">
            No relevant active memories found matching this query for the current tenant.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {results.map((item, index) => (
              <div 
                key={item.id}
                className="p-5 rounded-2xl bg-[#0f1420] border border-slate-800/80 hover:border-indigo-500/40 transition-all shadow-lg flex flex-col md:flex-row gap-5 justify-between items-start md:items-center"
              >
                {/* Left Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-bold flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      {item.memory_type}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {item.status}
                    </span>
                  </div>

                  <p className="text-base font-semibold text-white">
                    "{item.content}"
                  </p>

                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
                    <span>ID: {item.id.slice(0, 8)}...</span>
                    <span>Last accessed: {new Date(item.last_accessed_at || item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Right 4-Factor Scoring Matrix */}
                <div className="p-3.5 rounded-xl bg-[#141b2d] border border-slate-800 text-xs font-mono w-full md:w-80 flex-shrink-0 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-slate-300">
                    <span className="font-semibold text-indigo-400">Composite Score</span>
                    <span className="text-sm font-bold text-white bg-indigo-600/30 px-2 py-0.5 rounded border border-indigo-500/30">
                      {(item.final_score * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Factor 1: Semantic (60%) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Semantic Similarity (60%)</span>
                      <span className="text-slate-200">{(item.semantic_similarity * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.semantic_similarity * 100}%` }} />
                    </div>
                  </div>

                  {/* Factor 2: Importance (20%) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Importance (20%)</span>
                      <span className="text-slate-200">{(item.importance_score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.importance_score * 100}%` }} />
                    </div>
                  </div>

                  {/* Factor 3: Confidence (10%) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Confidence (10%)</span>
                      <span className="text-slate-200">{(item.confidence_score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.confidence_score * 100}%` }} />
                    </div>
                  </div>

                  {/* Factor 4: Recency Decay (10%) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Recency Decay (10%)</span>
                      <span className="text-slate-200">{(item.recency_score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${item.recency_score * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
