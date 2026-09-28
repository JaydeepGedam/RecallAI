import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  Search, 
  MessageSquare, 
  Settings, 
  Sparkles, 
  RotateCcw,
  Users,
  Activity
} from 'lucide-react';
import { demoApi, healthApi, authApi } from '../services/api';
import { HealthStatus, User } from '../types';

export default function Layout() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>(
    localStorage.getItem('recallai_user_id') || '56f3c1ec-1d26-4413-91f3-b0d1f549c470'
  );
  const [isSeeding, setIsSeeding] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    healthApi.check()
      .then(setHealth)
      .catch(() => setHealth({ status: 'offline', version: '0.1.0', environment: 'dev', database: 'disconnected' }));

    authApi.getUsers()
      .then(list => {
        setUsers(list);
        if (list.length > 0 && !localStorage.getItem('recallai_user_id')) {
          setCurrentUserId(list[0].id);
          localStorage.setItem('recallai_user_id', list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await demoApi.seed();
      setFeedbackMsg(res.message || 'Demo data seeded successfully!');
      setTimeout(() => {
        setFeedbackMsg(null);
        window.location.reload();
      }, 1500);
    } catch {
      setFeedbackMsg('Failed to seed demo data.');
      setTimeout(() => setFeedbackMsg(null), 2500);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all demo memories and conversations for Rahul?')) return;
    try {
      await demoApi.reset();
      setFeedbackMsg('Demo data reset.');
      setTimeout(() => {
        setFeedbackMsg(null);
        window.location.reload();
      }, 1000);
    } catch {
      setFeedbackMsg('Reset failed.');
      setTimeout(() => setFeedbackMsg(null), 2000);
    }
  };

  const handleUserChange = (newId: string) => {
    setCurrentUserId(newId);
    localStorage.setItem('recallai_user_id', newId);
    const u = users.find(x => x.id === newId);
    if (u) localStorage.setItem('recallai_user_name', u.name);
    window.location.reload();
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/memories', label: 'Memories Bank', icon: Database },
    { to: '/retrieval', label: 'Retrieval Tester', icon: Search },
    { to: '/chat', label: 'Chat Demo', icon: MessageSquare },
    { to: '/settings', label: 'Settings & Config', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0d14] text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-800/80 bg-[#0c101a] flex flex-col justify-between">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
                R
              </div>
              <div>
                <div className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                  RecallAI
                </div>
                <div className="text-[10px] font-mono text-indigo-400 font-semibold tracking-wider">
                  MEMORY ENGINE MVP
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom User / Tenant Status */}
        <div className="p-4 border-t border-slate-800/80 bg-[#090d16]">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" /> Active Tenant / User
          </div>
          <select
            value={currentUserId}
            onChange={(e) => handleUserChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-xs rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
          >
            {users.length > 0 ? (
              users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email.split('@')[0]})
                </option>
              ))
            ) : (
              <option value="56f3c1ec-1d26-4413-91f3-b0d1f549c470">Rahul (demo)</option>
            )}
          </select>
          <div className="mt-2 text-[10px] text-slate-400 truncate">
            ID: <span className="font-mono text-slate-400">{currentUserId.slice(0, 14)}...</span>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 flex-shrink-0 border-b border-slate-800/80 bg-[#0f1420]/80 backdrop-blur px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>Engine:</span>
              <span className={health?.status === 'ok' ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
                {health?.status || 'connecting...'}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400">
              <Activity className="w-3 h-3 text-indigo-400" />
              <span>DB:</span>
              <span className="text-slate-300 font-semibold">{health?.database || 'ready'}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            {feedbackMsg && (
              <span className="text-xs font-mono text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded border border-indigo-500/30 animate-fade-in">
                {feedbackMsg}
              </span>
            )}
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isSeeding ? 'Seeding...' : 'Seed Demo Data'}
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all"
              title="Reset Demo Data"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Reset
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
