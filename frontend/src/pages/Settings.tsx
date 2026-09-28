import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Cpu, 
  Check 
} from 'lucide-react';
import { authApi, healthApi } from '../services/api';
import { User, HealthStatus } from '../types';

export default function Settings() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>(
    localStorage.getItem('recallai_user_id') || '56f3c1ec-1d26-4413-91f3-b0d1f549c470'
  );
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    authApi.getUsers().then(setUsers).catch(() => {});
    healthApi.check().then(setHealth).catch(() => {});
  }, []);

  const handleSwitchUser = (id: string) => {
    setCurrentUserId(id);
    localStorage.setItem('recallai_user_id', id);
    const u = users.find(x => x.id === id);
    if (u) localStorage.setItem('recallai_user_name', u.name);
    setFeedback(`Active user switched to ${u?.name || id}`);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserName.trim()) return;

    try {
      const res = await authApi.register(newUserEmail.trim(), newUserName.trim(), 'password123');
      setNewUserEmail('');
      setNewUserName('');
      setFeedback(`Registered new tenant: ${res.user.name}`);
      const updatedUsers = await authApi.getUsers();
      setUsers(updatedUsers);
      handleSwitchUser(res.user.id);
    } catch (err: any) {
      setFeedback(`Registration failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          System Settings & Tenant Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure tenant context, verify isolation, and inspect AI memory engine parameters.
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-indigo-950/50 border border-indigo-500/40 text-indigo-300 text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tenant / User Switcher */}
      <div className="p-6 rounded-2xl bg-[#0f1420] border border-slate-800/80 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <Users className="w-4 h-4 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Active Tenant & Data Isolation</h2>
        </div>

        <p className="text-xs text-slate-400">
          RecallAI strictly isolates all memories and conversations by tenant user ID. Switching accounts tests multi-tenant isolation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {users.map(u => {
            const isSelected = u.id === currentUserId;
            return (
              <button
                key={u.id}
                onClick={() => handleSwitchUser(u.id)}
                className={`p-4 rounded-xl text-left border transition-all ${
                  isSelected 
                    ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/20' 
                    : 'bg-[#141b2d] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">{u.name}</div>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">{u.email}</div>
                <div className="text-[10px] text-slate-500 mt-2 font-mono truncate">ID: {u.id}</div>
              </button>
            );
          })}
        </div>

        {/* Add new user inline */}
        <form onSubmit={handleCreateUser} className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="User Name (e.g. Alice)"
            value={newUserName}
            onChange={e => setNewUserName(e.target.value)}
            className="flex-1 bg-[#141b2d] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="email"
            placeholder="Email (e.g. alice@example.com)"
            value={newUserEmail}
            onChange={e => setNewUserEmail(e.target.value)}
            className="flex-1 bg-[#141b2d] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700/60 transition-colors"
          >
            Create Tenant
          </button>
        </form>
      </div>

      {/* Engine & Configuration Readout */}
      <div className="p-6 rounded-2xl bg-[#0f1420] border border-slate-800/80 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Engine Configuration Readout</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#141b2d] border border-slate-800">
            <span className="text-slate-400 block mb-1">Embedding Model</span>
            <span className="text-slate-200 font-semibold">text-embedding-3-small</span>
            <span className="text-slate-500 block text-[10px] mt-0.5">1536-dimensional vectors</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141b2d] border border-slate-800">
            <span className="text-slate-400 block mb-1">Reasoning / Chat Model</span>
            <span className="text-slate-200 font-semibold">gpt-4o-mini</span>
            <span className="text-slate-500 block text-[10px] mt-0.5">Extraction & conflict resolution</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141b2d] border border-slate-800">
            <span className="text-slate-400 block mb-1">Ranking Weights</span>
            <span className="text-slate-200 font-semibold">0.60 / 0.20 / 0.10 / 0.10</span>
            <span className="text-slate-500 block text-[10px] mt-0.5">Sim / Imp / Conf / Recency</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141b2d] border border-slate-800">
            <span className="text-slate-400 block mb-1">Vector Database Engine</span>
            <span className="text-slate-200 font-semibold">PostgreSQL + pgvector</span>
            <span className="text-slate-500 block text-[10px] mt-0.5">Status: {health?.database || 'healthy'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
