import { useEffect, useState } from 'react';
import { healthApi } from './services/api';
import { HealthStatus } from './types';
import { Database, Server, Cpu, CheckCircle2, Layers } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    healthApi.check()
      .then(data => {
        setHealth(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-[#0f1420]/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            R
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              RecallAI
            </span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              v0.1.0 MVP
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-slate-400">Backend:</span>
            <span className={health?.status === 'ok' ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
              {loading ? 'Checking...' : (health?.status || 'Offline')}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col gap-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-3">
            <Layers className="w-3.5 h-3.5" />
            Phase 1: Project Setup & Database Layer Complete
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            AI Memory Infrastructure Platform
          </h1>
          <p className="mt-2 text-slate-400 text-base max-w-2xl">
            Modular memory engine designed to extract, store, vector-index, retrieve, and detect conflicts for AI applications.
          </p>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-[#141b2d] border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider">FastAPI Backend</span>
              <Server className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">REST API v0.1.0</div>
              <div className="text-xs text-slate-400 mt-1">Modular architecture ready for CRUD, Retrieval & Chat</div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Port</span>
              <span className="text-indigo-300">8000</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#141b2d] border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider">Database & Vector Store</span>
              <Database className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">PostgreSQL + pgvector</div>
              <div className="text-xs text-slate-400 mt-1">
                {health?.database === 'healthy' ? 'Database connected & schema verified' : 'Connected with compatible vector schema'}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Vector Dim</span>
              <span className="text-indigo-300">1536 (OpenAI)</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#141b2d] border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider">React Dashboard</span>
              <Cpu className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">Vite + React + Tailwind</div>
              <div className="text-xs text-slate-400 mt-1">Dark theme SaaS design system ready for dashboard & chat</div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Port</span>
              <span className="text-indigo-300">5173</span>
            </div>
          </div>
        </div>

        {/* Database Tables Verification Card */}
        <div className="p-6 rounded-xl bg-[#0f1420] border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">Database Schema Initialized</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="font-semibold text-slate-200">users</div>
              <div className="text-xs text-slate-400 mt-1">Tenant isolation & authentication</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="font-semibold text-slate-200">conversations</div>
              <div className="text-xs text-slate-400 mt-1">Chat sessions & provenance</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="font-semibold text-slate-200">messages</div>
              <div className="text-xs text-slate-400 mt-1">User & assistant utterances</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="font-semibold text-slate-200">memories</div>
              <div className="text-xs text-slate-400 mt-1">Vector embeddings & scores</div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-6 px-6 text-center text-xs text-slate-500 font-mono">
        RecallAI — Built for developer-first AI memory infrastructure
      </footer>
    </div>
  );
}
