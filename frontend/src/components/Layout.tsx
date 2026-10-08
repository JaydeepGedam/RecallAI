import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Database, 
  MessageSquare, 
  Sparkles, 
  RotateCcw,
  LogOut,
  ShieldCheck,
  Code2
} from 'lucide-react';
import { demoApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSeeding, setIsSeeding] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const location = useLocation();

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await demoApi.seed();
      setFeedbackMsg(res.message || 'Demo memories seeded successfully!');
      setTimeout(() => {
        setFeedbackMsg(null);
        window.location.reload();
      }, 1200);
    } catch {
      setFeedbackMsg('Failed to seed demo data.');
      setTimeout(() => setFeedbackMsg(null), 2500);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all demo memories and conversations for your user profile?')) return;
    try {
      await demoApi.reset();
      setFeedbackMsg('Data reset completed.');
      setTimeout(() => {
        setFeedbackMsg(null);
        window.location.reload();
      }, 1000);
    } catch {
      setFeedbackMsg('Reset failed.');
      setTimeout(() => setFeedbackMsg(null), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { to: '/chat', label: 'Live Chat & Demo', icon: MessageSquare, badge: 'Hero' },
    { to: '/memories', label: 'Memories Bank', icon: Database },
    { to: '/integration', label: 'Integration Guide', icon: Code2, badge: 'API' },
  ];

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0d14] text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-800/80 bg-[#0c101a] flex flex-col justify-between select-none">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
                E
              </div>
              <div>
                <div className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                  EpisodicAI
                </div>
                <div className="text-[10px] font-mono text-indigo-400 font-semibold tracking-wider">
                  MEMORY INFRASTRUCTURE
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links (Simplified to 2 main views) */}
          <nav className="p-3 space-y-1.5">
            <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Workspace
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to || (item.to === '/chat' && location.pathname === '/');
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile Section */}
        <div className="p-3.5 border-t border-slate-800/80 bg-[#090d16]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow">
                {userInitial}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1">
                  <span>{user?.name || 'User'}</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate font-mono">
                  {user?.email || 'user@example.com'}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between px-1">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3 h-3" /> Isolated Partition
            </span>
            <span className="text-slate-400">{user?.id.slice(0, 8)}...</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 flex-shrink-0 border-b border-slate-800/80 bg-[#0f1420]/80 backdrop-blur px-6 flex items-center justify-between">
          <div />

          {/* Quick Actions & Seed/Reset */}
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
              title="Seed 8 benchmark memories for your profile"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isSeeding ? 'Seeding...' : 'Seed Sample Memories'}
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all"
              title="Reset All Memories"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Reset
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
