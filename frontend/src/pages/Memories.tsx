import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  History, 
  Tag,
  Sparkles,
  Inbox,
  Database,
  CheckCircle2
} from 'lucide-react';
import { memoriesApi, demoApi } from '../services/api';
import { Memory, MemoryType, MemoryStatus } from '../types';
import CreateMemoryModal from '../components/CreateMemoryModal';
import MemoryLineageModal from '../components/MemoryLineageModal';
import { useAuth } from '../context/AuthContext';

export default function Memories() {
  const { user } = useAuth();
  const userId = user?.id || '';
  const [memories, setMemories] = useState<Memory[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState(false);
  
  // Filter state
  const [search, setSearch] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLineageId, setSelectedLineageId] = useState<string | null>(null);

  const fetchMemories = () => {
    if (!userId) return;
    setLoading(true);
    memoriesApi.list({
      user_id: userId,
      search: search.trim() || undefined,
      memory_type: selectedType !== 'all' ? (selectedType as MemoryType) : undefined,
      status: selectedStatus !== 'all' ? (selectedStatus as MemoryStatus) : undefined,
      limit: 100,
    })
      .then(res => {
        setMemories(res.memories);
        setTotal(res.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMemories();
  }, [userId, selectedType, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMemories();
  };

  const handleDelete = async (id: string, content: string) => {
    if (!window.confirm(`Delete memory: "${content}"?`)) return;
    try {
      await memoriesApi.delete(id);
      fetchMemories();
    } catch {
      alert('Failed to delete memory.');
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await demoApi.seed();
      fetchMemories();
    } finally {
      setSeeding(false);
    }
  };

  const activeCount = memories.filter(m => m.status === 'active').length;
  const supersededCount = memories.filter(m => m.status === 'superseded').length;

  const getTypeBadgeColor = (type: MemoryType) => {
    switch (type) {
      case 'preference': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'skill': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'project': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'goal': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadge = (status: MemoryStatus) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>;
      case 'superseded':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">Superseded</span>;
      case 'expired':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700">Expired</span>;
      case 'deleted':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">Deleted</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Memories Bank
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Structured knowledge units stored exclusively for <span className="text-indigo-300 font-semibold">{user?.name || 'your profile'}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Custom Memory
          </button>
        </div>
      </div>

      {/* Top 3 KPI Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-[#141b2d] border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Total Memories</div>
            <div className="text-2xl font-bold text-white font-mono mt-0.5">{loading ? '...' : total}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Database className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#141b2d] border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-emerald-400">Active Memories</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">{loading ? '...' : activeCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#141b2d] border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-amber-400">Superseded / History</div>
            <div className="text-2xl font-bold text-amber-400 font-mono mt-0.5">{loading ? '...' : supersededCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <History className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#0f1420] border border-slate-800/80 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memory content (e.g. 'FastAPI', 'WhatsApp', 'books')..."
            className="w-full bg-[#141b2d] border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-1 md:flex-initial">
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[#141b2d] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono w-full md:w-auto"
            >
              <option value="all">All Types</option>
              <option value="preference">Preference</option>
              <option value="skill">Skill / Stack</option>
              <option value="project">Project</option>
              <option value="fact">Fact</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-1 md:flex-initial">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#141b2d] border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono w-full md:w-auto"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="superseded">Superseded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Memories Table Card */}
      <div className="rounded-2xl bg-[#0f1420] border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141b2d] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Memory Statement</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Importance</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created / Accessed</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                    Loading memories...
                  </td>
                </tr>
              ) : memories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                        <Inbox className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-200">No memories found</h3>
                      <p className="text-xs text-slate-400 mt-1 mb-4">
                        This user partition is clean. You can add a memory manually, have a conversation in Chat, or seed demo benchmark records.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsCreateOpen(true)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                        >
                          Add Custom Memory
                        </button>
                        <button
                          onClick={handleSeed}
                          disabled={seeding}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          {seeding ? 'Seeding...' : 'Seed Benchmark Memories'}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                memories.map((mem) => {
                  const createdDate = new Date(mem.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const accessedDate = new Date(mem.last_accessed_at || mem.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric'
                  });

                  return (
                    <tr key={mem.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-200 max-w-sm truncate">
                        "{mem.content}"
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${getTypeBadgeColor(mem.memory_type)}`}>
                          {mem.memory_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full" 
                              style={{ width: `${mem.importance_score * 100}%` }}
                            />
                          </div>
                          <span>{mem.importance_score.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full" 
                              style={{ width: `${mem.confidence_score * 100}%` }}
                            />
                          </div>
                          <span>{mem.confidence_score.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(mem.status)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        <div>{createdDate}</div>
                        <div className="text-[10px] text-slate-500">Access: {accessedDate}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedLineageId(mem.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                            title="View Evolution History & Lineage"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          {mem.status !== 'deleted' && (
                            <button
                              onClick={() => handleDelete(mem.id, mem.content)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete Memory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0c101a] flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Showing {memories.length} memories</span>
          <span>User: {user?.email}</span>
        </div>
      </div>

      {/* Modals */}
      <CreateMemoryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchMemories}
        userId={userId}
      />

      <MemoryLineageModal
        memoryId={selectedLineageId}
        onClose={() => setSelectedLineageId(null)}
      />
    </div>
  );
}
