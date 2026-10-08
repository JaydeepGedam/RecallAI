import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogIn, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  BrainCircuit, 
  AlertCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';

export default function Login() {
  const { login, quickDemoLogin } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password.trim());
      navigate('/chat', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setQuickLoading(true);
    setError(null);
    try {
      await quickDemoLogin();
      navigate('/chat', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to authenticate demo user.');
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#0a0d14] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold text-xl shadow-lg shadow-indigo-500/25 mb-1">
            E
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Episodic<span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono tracking-wide">
            ENTERPRISE AI MEMORY INFRASTRUCTURE
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0f1420]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-7 shadow-2xl shadow-black/60 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-slate-200">Sign in to your workspace</h2>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Isolated Storage
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* 1-Click Demo Shortcut */}
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={quickLoading || loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50"
          >
            {quickLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 text-amber-300" />
            )}
            <span>1-Click Demo Login as Rahul</span>
          </button>
          <div className="text-center text-[10px] text-slate-400 -mt-2">
            Loads pre-seeded demo user with 8 active memories
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#0f1420] px-3 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              or enter credentials
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 font-mono">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-900/90 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300 font-mono">
                  Password
                </label>
                <span className="text-[10px] text-slate-400 font-mono">default: password123</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-lg px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || quickLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <LogIn className="w-4 h-4 text-indigo-400" />
              )}
              <span>Sign In</span>
            </button>
          </form>

          {/* Footer link to Signup */}
          <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            Don't have an account yet?{' '}
            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Create User Account
            </Link>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
            <div className="text-[10px] font-mono text-slate-300 font-medium">User Isolation</div>
            <div className="text-[9px] text-slate-400">Strict per-user data</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <BrainCircuit className="w-3.5 h-3.5 text-indigo-400 mx-auto mb-1" />
            <div className="text-[10px] font-mono text-slate-300 font-medium">4-Factor Ranking</div>
            <div className="text-[9px] text-slate-400">Semantic + Recency</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
            <div className="text-[10px] font-mono text-slate-300 font-medium">Conflict Lineage</div>
            <div className="text-[9px] text-slate-400">Auto superseding</div>
          </div>
        </div>
      </div>
    </div>
  );
}
