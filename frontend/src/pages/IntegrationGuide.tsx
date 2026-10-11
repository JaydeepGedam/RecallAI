import React, { useState, useEffect, useRef } from 'react';
import { 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  Code2, 
  Zap, 
  Cpu, 
  Play, 
  CheckCircle2, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  Database,
  HelpCircle,
  FileCode2,
  Send,
  User as UserIcon
} from 'lucide-react';
import { apiKeysApi, v1Api, APIKeyItem, APIKeyCreated } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Local storage key for preserving created secret keys in this browser
const LOCAL_STORAGE_FULL_KEYS = 'episodic_full_keys';

export default function IntegrationGuide() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<APIKeyItem[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdKeyData, setCreatedKeyData] = useState<APIKeyCreated | null>(null);
  
  // Selected Key for Code Snippets & Simulator
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

  // Copy status indicators
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Active Main Tab: 'unified' (Method 1) | 'headless' (Method 2) | 'simulator' (Live Simulator)
  const [activeTab, setActiveTab] = useState<'unified' | 'headless' | 'simulator'>('unified');

  // Code Language Switcher: 'python' | 'typescript' | 'curl'
  const [codeLang, setCodeLang] = useState<'python' | 'typescript' | 'curl'>('python');

  // Method 2 (Headless): Before vs After Code Toggle
  const [headlessMode, setHeadlessMode] = useState<'after' | 'before'>('after');

  // Collapsible Keys Drawer (Open by default if user wants to see their keys)
  const [showKeysTable, setShowKeysTable] = useState(false);
  const keysTableRef = useRef<HTMLDivElement>(null);

  const handleScrollToKeys = () => {
    setShowKeysTable(true);
    setTimeout(() => {
      keysTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // Explainer banner collapse toggle
  const [showConceptHelp, setShowConceptHelp] = useState(false);

  // =========================================================================
  // Simulator State (2-Stage Interactive Lab)
  // =========================================================================
  const [simUserId, setSimUserId] = useState(user?.id || 'customer_123');
  // Stage 1: Teach Fact
  const [simTeachText, setSimTeachText] = useState("I've switched our backend to Node.js and moved to London.");
  const [simTeaching, setSimTeaching] = useState(false);
  const [simTeachResult, setSimTeachResult] = useState<any>(null);

  // Stage 2: Ask / Recall
  const [simQueryText, setSimQueryText] = useState("What backend framework am I using now and where do I live?");
  const [simQuerying, setSimQuerying] = useState(false);
  const [simQueryResult, setSimQueryResult] = useState<any>(null);

  // Inline Quick Test for Tab 1
  const [quickChatMessage, setQuickChatMessage] = useState("What backend framework am I using?");
  const [quickChatLoading, setQuickChatLoading] = useState(false);
  const [quickChatResult, setQuickChatResult] = useState<any>(null);

  // Inline Quick Test for Tab 2
  const [quickCtxQuery, setQuickCtxQuery] = useState("What are my developer preferences?");
  const [quickCtxLoading, setQuickCtxLoading] = useState(false);
  const [quickCtxResult, setQuickCtxResult] = useState<any>(null);

  // Load API keys on mount
  useEffect(() => {
    fetchKeys();
  }, []);

  useEffect(() => {
    if (user?.id && (simUserId === 'customer_123' || !simUserId)) {
      setSimUserId(user.id);
    }
  }, [user]);

  // Helpers for Local Key Secret Caching
  const getCachedKeys = (): Record<string, string> => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_FULL_KEYS) || '{}');
    } catch {
      return {};
    }
  };

  const saveCachedKey = (id: string, fullKey: string) => {
    try {
      const cache = getCachedKeys();
      cache[id] = fullKey;
      localStorage.setItem(LOCAL_STORAGE_FULL_KEYS, JSON.stringify(cache));
    } catch (err) {
      console.error('Failed to cache key:', err);
    }
  };

  const fetchKeys = async () => {
    try {
      setLoadingKeys(true);
      const data = await apiKeysApi.list();
      setKeys(data);
      if (data.length > 0 && !selectedKeyId) {
        setSelectedKeyId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      setCreatingKey(true);
      const created = await apiKeysApi.create(newKeyName.trim());
      setCreatedKeyData(created);
      saveCachedKey(created.id, created.api_key);
      setSelectedKeyId(created.id);
      setNewKeyName('');
      setShowCreateModal(false);
      await fetchKeys();
    } catch (err) {
      alert('Failed to generate API key.');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id: string, name: string) => {
    if (!window.confirm(`Revoke API key "${name}"? External apps using this key will immediately lose access.`)) {
      return;
    }
    try {
      await apiKeysApi.revoke(id);
      if (selectedKeyId === id) {
        setSelectedKeyId(null);
      }
      await fetchKeys();
    } catch (err) {
      alert('Failed to revoke API key.');
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedSnippet(type);
      setTimeout(() => setCopiedSnippet(null), 2000);
    }
  };

  // Derive active selected key
  const localCache = getCachedKeys();
  const selectedKey = keys.find(k => k.id === selectedKeyId) || (keys.length > 0 ? keys[0] : null);
  const cachedSecretForSelected = selectedKey ? localCache[selectedKey.id] : null;
  const isFullSecretAvailable = Boolean((createdKeyData && createdKeyData.id === selectedKey?.id) || cachedSecretForSelected);

  const activeKeyString = 
    (createdKeyData && createdKeyData.id === selectedKey?.id) 
      ? createdKeyData.api_key 
      : cachedSecretForSelected 
        ? cachedSecretForSelected 
        : selectedKey 
          ? `${selectedKey.key_prefix}****************` 
          : 'epi_live_your_api_key_here';

  const backendUrl = window.location.origin.includes('5173') ? 'http://localhost:8000' : window.location.origin;

  // Tab 1: Run Quick Chat
  const handleQuickChat = async () => {
    if (!quickChatMessage.trim() || !simUserId.trim()) return;
    setQuickChatLoading(true);
    setQuickChatResult(null);
    try {
      const res = await v1Api.chat(simUserId.trim(), quickChatMessage.trim(), isFullSecretAvailable ? activeKeyString : undefined);
      setQuickChatResult(res);
    } catch (err: any) {
      setQuickChatResult({ error: err.response?.data?.detail || err.message || 'Request failed' });
    } finally {
      setQuickChatLoading(false);
    }
  };

  // Tab 2: Run Quick Context Query
  const handleQuickCtx = async () => {
    if (!quickCtxQuery.trim() || !simUserId.trim()) return;
    setQuickCtxLoading(true);
    setQuickCtxResult(null);
    try {
      const res = await v1Api.getContext(simUserId.trim(), quickCtxQuery.trim(), isFullSecretAvailable ? activeKeyString : undefined);
      setQuickCtxResult(res);
    } catch (err: any) {
      setQuickCtxResult({ error: err.response?.data?.detail || err.message || 'Context fetch failed' });
    } finally {
      setQuickCtxLoading(false);
    }
  };

  // Simulator Stage 1: Teach Fact
  const handleSimTeach = async () => {
    if (!simTeachText.trim() || !simUserId.trim()) return;
    setSimTeaching(true);
    setSimTeachResult(null);
    try {
      const res = await v1Api.processMessage(simUserId.trim(), simTeachText.trim(), isFullSecretAvailable ? activeKeyString : undefined);
      setSimTeachResult(res);
    } catch (err: any) {
      setSimTeachResult({ error: err.response?.data?.detail || err.message || 'Failed to learn fact' });
    } finally {
      setSimTeaching(false);
    }
  };

  // Simulator Stage 2: Ask & Recall
  const handleSimQuery = async () => {
    if (!simQueryText.trim() || !simUserId.trim()) return;
    setSimQuerying(true);
    setSimQueryResult(null);
    try {
      const res = await v1Api.chat(simUserId.trim(), simQueryText.trim(), isFullSecretAvailable ? activeKeyString : undefined);
      setSimQueryResult(res);
    } catch (err: any) {
      setSimQueryResult({ error: err.response?.data?.detail || err.message || 'Failed to query' });
    } finally {
      setSimQuerying(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0d14] p-4 sm:p-6 lg:p-8 space-y-6 font-sans max-w-5xl mx-auto text-slate-100">
      
      {/* --------------------------------------------------------------------- */}
      {/* 1. Header & Quick Intro                                               */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-mono font-medium mb-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Quickstart Guide
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Connect Your App to EpisodicAI
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Give your AI application permanent long-term memory in under 2 minutes.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create New API Key
        </button>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. Top-Mounted Active API Key Card with Dropdown Selector             */}
      {/* --------------------------------------------------------------------- */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900/90 via-[#101726]/90 to-[#141b2d]/90 border border-slate-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5 sm:mt-0">
            <Key className="w-5 h-5" />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                Active Key for Code & Tests:
              </span>

              {/* If user has multiple keys, let them switch instantly */}
              {keys.length > 1 ? (
                <div className="relative inline-block">
                  <select
                    value={selectedKey?.id || ''}
                    onChange={(e) => setSelectedKeyId(e.target.value)}
                    className="bg-slate-900 border border-indigo-500/40 rounded-lg px-2.5 py-1 text-xs text-indigo-300 font-semibold focus:outline-none focus:border-indigo-400 cursor-pointer shadow-sm hover:border-indigo-500"
                  >
                    {keys.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name} ({k.key_prefix}••••)
                      </option>
                    ))}
                  </select>
                </div>
              ) : selectedKey ? (
                <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {selectedKey.name}
                </span>
              ) : (
                <span className="text-xs text-slate-500">No keys generated</span>
              )}

            </div>

            {/* Key Preview */}
            <div className="font-mono text-xs text-indigo-300 truncate select-all">
              {activeKeyString}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
          <button
            onClick={() => copyToClipboard(activeKeyString, 'key')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
            title={selectedKey ? `Copy key for ${selectedKey.name}` : 'Copy Key'}
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>
              {copiedKey 
                ? 'Copied!' 
                : selectedKey 
                  ? `Copy "${selectedKey.name}"` 
                  : 'Copy Key'}
            </span>
          </button>

          <button
            onClick={handleScrollToKeys}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700/60 transition-colors flex items-center gap-1.5"
            title="Scroll down to manage all generated keys"
          >
            <span>{keys.length} Keys</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Alert when a new key was just generated */}
      {createdKeyData && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between gap-3 animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              New key <strong>"{createdKeyData.name}"</strong> generated and set as active. Copy it now, as full secrets are never revealed again by the server.
            </span>
          </div>
          <button
            onClick={() => setCreatedKeyData(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 3. "How It Works" 3-Pillar Visual Explainer (Collapsible / Toggleable) */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-[#0f1420]/80 border border-slate-800 rounded-xl overflow-hidden text-xs">
        <button
          onClick={() => setShowConceptHelp(!showConceptHelp)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-slate-400 hover:text-slate-200 transition-colors bg-slate-900/40"
        >
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>How does EpisodicAI work under the hood? (Click to {showConceptHelp ? 'hide' : 'expand'})</span>
          </div>
          {showConceptHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showConceptHelp && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-800/80 bg-slate-950/50 animate-fade-in">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-indigo-300 font-mono text-[11px]">
                <Key className="w-3.5 h-3.5 text-indigo-400" /> 1. Project API Key
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Authenticates your server. Keep it secure in your backend environment variables (<code className="text-indigo-300">EPISODIC_API_KEY</code>). Never expose in browser code.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-300 font-mono text-[11px]">
                <UserIcon className="w-3.5 h-3.5 text-emerald-400" /> 2. Customer <code className="text-emerald-300">user_id</code>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Any string identifying your end user (e.g. <code className="text-emerald-300">user_123</code> or email). EpisodicAI creates a 100% isolated private vault for each user so memories never leak.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-purple-300 font-mono text-[11px]">
                <Database className="w-3.5 h-3.5 text-purple-400" /> 3. Autonomous Memory Vault
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                EpisodicAI extracts facts, updates changing preferences, and resolves conflicts automatically so your AI remembers context forever.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 4. Three Clear Navigation Tabs                                        */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tab 1 Button */}
        <button
          onClick={() => setActiveTab('unified')}
          className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
            activeTab === 'unified'
              ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg ring-1 ring-indigo-500/40'
              : 'bg-[#0f1420]/70 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                <Zap className="w-3 h-3" /> Method 1 • Simplest
              </span>
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                activeTab === 'unified' ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
              }`}>
                {activeTab === 'unified' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white">1-Call Turnkey Chat</div>
            <p className="text-[11px] text-slate-400 leading-snug">
              1 single API call does it all: memory search, prompt generation, and learning.
            </p>
          </div>
          <div className="text-[10px] font-mono text-emerald-400 font-medium mt-2 pt-1.5 border-t border-slate-800/60">
            Setup: 1 Minute &rarr;
          </div>
        </button>

        {/* Tab 2 Button */}
        <button
          onClick={() => setActiveTab('headless')}
          className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
            activeTab === 'headless'
              ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg ring-1 ring-indigo-500/40'
              : 'bg-[#0f1420]/70 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                <Cpu className="w-3 h-3" /> Method 2 • Bring Your Own LLM
              </span>
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                activeTab === 'headless' ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
              }`}>
                {activeTab === 'headless' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white">3-Line Memory Drop-in</div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Keep your existing OpenAI, Claude, or LangChain setup. Just wrap it with 3 lines.
            </p>
          </div>
          <div className="text-[10px] font-mono text-indigo-400 font-medium mt-2 pt-1.5 border-t border-slate-800/60">
            Before & After Diff &rarr;
          </div>
        </button>

        {/* Tab 3 Button */}
        <button
          onClick={() => setActiveTab('simulator')}
          className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
            activeTab === 'simulator'
              ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg ring-1 ring-indigo-500/40'
              : 'bg-[#0f1420]/70 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                <Play className="w-3 h-3" /> Live Simulator
              </span>
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                activeTab === 'simulator' ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
              }`}>
                {activeTab === 'simulator' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <div className="text-xs sm:text-sm font-bold text-white">Interactive Memory Lab</div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Teach a fact live, then ask in a new session to watch EpisodicAI recall it!
            </p>
          </div>
          <div className="text-[10px] font-mono text-amber-400 font-medium mt-2 pt-1.5 border-t border-slate-800/60">
            Interactive Test &rarr;
          </div>
        </button>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: 1-CALL TURNKEY CHAT                                            */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'unified' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Visual Architecture Flow Diagram */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Data Flow Diagram
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              <div className="w-full md:w-1/3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <div className="font-semibold text-white">Your Backend / App</div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">Sends user_id + message</div>
              </div>

              <div className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                <span>1 POST Call</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>

              <div className="w-full md:w-1/3 p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-center">
                <div className="font-semibold text-emerald-300">EpisodicAI Engine</div>
                <div className="text-[10px] text-slate-400 mt-1">1. Recalls Facts &bull; 2. Generates Reply &bull; 3. Auto-Saves</div>
              </div>

              <div className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Instant Reply</span>
              </div>

              <div className="w-full md:w-1/3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <div className="font-semibold text-white">End User Display</div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">Reads response.message</div>
              </div>
            </div>
          </div>

          {/* 3 Numbered Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Step 1</span>
              <h4 className="text-xs font-semibold text-white">Copy Your API Key</h4>
              <p className="text-[11px] text-slate-400">Put your key in your server's <code className="text-indigo-300">Authorization: Bearer</code> header.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Step 2</span>
              <h4 className="text-xs font-semibold text-white">Send 1 POST Request</h4>
              <p className="text-[11px] text-slate-400">Call <code className="text-emerald-300">/api/v1/chat</code> with <code className="text-slate-300">user_id</code> and <code className="text-slate-300">message</code>.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">Step 3</span>
              <h4 className="text-xs font-semibold text-white">Display the Answer</h4>
              <p className="text-[11px] text-slate-400">Show <code className="text-purple-300">response.message</code>. Memory updates happen autonomously.</p>
            </div>
          </div>

          {/* Code Snippet Box */}
          <div className="bg-[#0f1420] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>Code Example (POST /api/v1/chat) — Using key: <strong>{selectedKey?.name || 'Default'}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                  <button
                    onClick={() => setCodeLang('python')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      codeLang === 'python' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Python
                  </button>
                  <button
                    onClick={() => setCodeLang('typescript')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      codeLang === 'typescript' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    TypeScript
                  </button>
                  <button
                    onClick={() => setCodeLang('curl')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                      codeLang === 'curl' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    cURL
                  </button>
                </div>

                <button
                  onClick={() => copyToClipboard(getUnifiedSnippet(codeLang, activeKeyString, backendUrl), 'tab1_code')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono border border-slate-700"
                >
                  {copiedSnippet === 'tab1_code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet === 'tab1_code' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed bg-slate-950/80">
              {getUnifiedSnippet(codeLang, activeKeyString, backendUrl)}
            </pre>
          </div>

          {/* Quick Try-It-Now Box */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-emerald-400" /> Test This Request Live
              </span>
              <span className="text-[10px] font-mono text-slate-400">User ID: <code className="text-indigo-300">{simUserId}</code></span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={quickChatMessage}
                onChange={(e) => setQuickChatMessage(e.target.value)}
                placeholder="Ask something to test memory..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleQuickChat}
                disabled={quickChatLoading || !quickChatMessage.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all flex-shrink-0"
              >
                {quickChatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send</span>
              </button>
            </div>

            {quickChatResult && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-2 animate-fade-in">
                {quickChatResult.error ? (
                  <div className="text-rose-400">Error: {quickChatResult.error}</div>
                ) : (
                  <>
                    <div className="text-slate-200 font-sans text-xs bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded">
                      <span className="text-emerald-400 font-semibold block text-[11px] mb-1">🤖 Assistant Reply:</span>
                      {quickChatResult.message}
                    </div>
                    {quickChatResult.retrieved_memories?.length > 0 && (
                      <div className="text-[11px] text-indigo-300 space-y-0.5 pt-1">
                        <span className="text-indigo-400 font-semibold block text-[10px] uppercase">Recalled from Vault:</span>
                        {quickChatResult.retrieved_memories.map((rm: any, i: number) => (
                          <div key={i}>&bull; "{rm.content}" ({(rm.score * 100).toFixed(0)}% match)</div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: BRING YOUR OWN LLM (BEFORE & AFTER CODE PARADIGM)              */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'headless' && (
        <div className="space-y-6 animate-fade-in">

          {/* Visual Architecture Flow Diagram */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Bring Your Own LLM Architecture
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              <div className="w-full md:w-1/3 p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/40 text-center">
                <div className="font-semibold text-indigo-300">1. Fetch Memories</div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">POST /api/v1/context</div>
              </div>

              <div className="flex items-center gap-1 text-indigo-400 font-mono text-[10px]">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Inject</span>
              </div>

              <div className="w-full md:w-1/3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <div className="font-semibold text-white">2. Your OpenAI / Claude</div>
                <div className="text-[10px] text-slate-400 mt-1">Runs with memories in system prompt</div>
              </div>

              <div className="flex items-center gap-1 text-purple-400 font-mono text-[10px]">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Async</span>
              </div>

              <div className="w-full md:w-1/3 p-3 rounded-lg bg-purple-950/30 border border-purple-500/40 text-center">
                <div className="font-semibold text-purple-300">3. Learn Facts</div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">POST /api/v1/memory/process</div>
              </div>
            </div>
          </div>

          {/* The "Before & After" Code Box */}
          <div className="bg-[#0f1420] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-200">
                  The 3-Line Drop-in Paradigm — Using key: <strong>{selectedKey?.name || 'Default'}</strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Before vs After Switcher */}
                <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                  <button
                    onClick={() => setHeadlessMode('before')}
                    className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                      headlessMode === 'before'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🔴 Before (No Memory)
                  </button>
                  <button
                    onClick={() => setHeadlessMode('after')}
                    className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                      headlessMode === 'after'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🟢 After (+ EpisodicAI 3 Lines)
                  </button>
                </div>

                {/* Language Switcher */}
                <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                  <button
                    onClick={() => setCodeLang('python')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      codeLang === 'python' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Python
                  </button>
                  <button
                    onClick={() => setCodeLang('typescript')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      codeLang === 'typescript' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    TypeScript
                  </button>
                  <button
                    onClick={() => setCodeLang('curl')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      codeLang === 'curl' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    cURL
                  </button>
                </div>

                <button
                  onClick={() => copyToClipboard(getBeforeAfterSnippet(codeLang, headlessMode, activeKeyString, backendUrl), 'tab2_code')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono border border-slate-700"
                >
                  {copiedSnippet === 'tab2_code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet === 'tab2_code' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Banner explaining the view */}
            <div className={`px-4 py-2 border-b text-xs flex items-center justify-between ${
              headlessMode === 'before'
                ? 'bg-rose-950/20 border-rose-500/20 text-rose-300'
                : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
            }`}>
              {headlessMode === 'before' ? (
                <span>Standard code: LLM forgets customer preferences as soon as the session closes.</span>
              ) : (
                <span>Only 3 lines added around your existing LLM call to unlock permanent lifetime memory!</span>
              )}
            </div>

            <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed bg-slate-950/80">
              {getBeforeAfterSnippet(codeLang, headlessMode, activeKeyString, backendUrl)}
            </pre>
          </div>

          {/* Quick Context Query Tester */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-indigo-400" /> Test Memory Context Retrieval (Line 1)
              </span>
              <span className="text-[10px] font-mono text-slate-400">User ID: <code className="text-indigo-300">{simUserId}</code></span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={quickCtxQuery}
                onChange={(e) => setQuickCtxQuery(e.target.value)}
                placeholder="Query for relevant memories..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleQuickCtx}
                disabled={quickCtxLoading || !quickCtxQuery.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all flex-shrink-0"
              >
                {quickCtxLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Fetch Context</span>
              </button>
            </div>

            {quickCtxResult && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-2 animate-fade-in">
                {quickCtxResult.error ? (
                  <div className="text-rose-400">Error: {quickCtxResult.error}</div>
                ) : (
                  <>
                    <div className="text-emerald-400 font-semibold text-[11px]">
                      Retrieved {quickCtxResult.context?.length || 0} Memories for this prompt:
                    </div>
                    {quickCtxResult.context && quickCtxResult.context.length > 0 ? (
                      <div className="space-y-1 pt-1">
                        {quickCtxResult.context.map((m: any, i: number) => (
                          <div key={i} className="p-2 rounded bg-indigo-950/40 border border-indigo-500/20 text-indigo-200 text-xs flex items-center justify-between">
                            <span>&bull; [{m.type}] "{m.content}"</span>
                            <span className="text-[10px] text-indigo-400">{(m.score * 100).toFixed(0)}% match</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500 italic text-xs">No memories stored for this user yet. Try adding one in the Live Simulator tab!</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 3: LIVE INTEGRATION SIMULATOR (2-STAGE MEMORY LAB)                */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'simulator' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/20 to-indigo-950/20 border border-amber-500/30 space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-amber-400" /> Interactive 2-Stage Memory Lab
            </h3>
            <p className="text-xs text-slate-300">
              Experience the memory loop in real-time. In <strong>Stage 1</strong>, teach EpisodicAI a new fact. In <strong>Stage 2</strong>, ask a question and watch EpisodicAI recall it seamlessly.
            </p>
          </div>

          {/* Test User ID Row */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-300 font-medium">Customer User ID:</span>
              <input
                type="text"
                value={simUserId}
                onChange={(e) => setSimUserId(e.target.value)}
                placeholder="e.g. customer_123"
                className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 w-48"
              />
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Memories are securely isolated to this user ID
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* STAGE 1: TEACH FACT */}
            <div className="p-5 rounded-2xl bg-[#0f1420] border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase font-mono">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px]">1</span>
                    Stage 1: Teach a New Fact
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">POST /api/v1/memory/process</span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Type a statement about preferences, tech stack, or personal details:
                </p>

                <textarea
                  rows={3}
                  value={simTeachText}
                  onChange={(e) => setSimTeachText(e.target.value)}
                  placeholder="e.g. I moved to London and switched to Node.js"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />

                <div className="flex flex-wrap gap-1.5">
                  {[
                    "I prefer dark mode and TypeScript.",
                    "My company is launching in March 2026.",
                    "Contact me on WhatsApp instead of email."
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSimTeachText(preset)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      "{preset}"
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 space-y-3">
                <button
                  onClick={handleSimTeach}
                  disabled={simTeaching || !simTeachText.trim()}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
                >
                  {simTeaching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>1. Learn & Store in Vault</span>
                </button>

                {simTeachResult && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1.5 animate-fade-in">
                    {simTeachResult.error ? (
                      <div className="text-rose-400">Error: {simTeachResult.error}</div>
                    ) : (
                      <>
                        <div className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ingested & Saved!
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {simTeachResult.extracted_count > 0 ? (
                            <span>Extracted <strong>{simTeachResult.extracted_count}</strong> new memory items.</span>
                          ) : (
                            <span>Fact ingested and analyzed by EpisodicAI pipeline.</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* STAGE 2: TEST RECALL */}
            <div className="p-5 rounded-2xl bg-[#0f1420] border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase font-mono">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px]">2</span>
                    Stage 2: Ask & Verify Recall
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">POST /api/v1/chat</span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Ask a question in a new session. EpisodicAI will recall the fact stored in Stage 1:
                </p>

                <textarea
                  rows={3}
                  value={simQueryText}
                  onChange={(e) => setSimQueryText(e.target.value)}
                  placeholder="e.g. What backend do I use and where do I live?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />

                <div className="flex flex-wrap gap-1.5">
                  {[
                    "What backend framework am I using?",
                    "What is my preferred theme?",
                    "When is our launch date?"
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSimQueryText(preset)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      "{preset}"
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 space-y-3">
                <button
                  onClick={handleSimQuery}
                  disabled={simQuerying || !simQueryText.trim()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
                >
                  {simQuerying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>2. Ask Assistant (Test Recall)</span>
                </button>

                {simQueryResult && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-2 animate-fade-in">
                    {simQueryResult.error ? (
                      <div className="text-rose-400">Error: {simQueryResult.error}</div>
                    ) : (
                      <>
                        <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/20 text-slate-200 font-sans text-xs">
                          <span className="text-emerald-400 font-semibold block text-[11px] mb-1">🤖 Assistant Answer:</span>
                          {simQueryResult.message}
                        </div>

                        {simQueryResult.retrieved_memories?.length > 0 && (
                          <div className="text-[11px] text-indigo-300 space-y-0.5 pt-1">
                            <span className="text-indigo-400 font-semibold block text-[10px] uppercase">✨ Recalled from Vault:</span>
                            {simQueryResult.retrieved_memories.map((rm: any, i: number) => (
                              <div key={i} className="pl-1.5 border-l border-indigo-500/40">
                                &bull; "{rm.content}" ({(rm.score * 100).toFixed(0)}% match)
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 5. "Manage All Project API Keys" Table (Each row has its own Copy)     */}
      {/* --------------------------------------------------------------------- */}
      <div 
        id="manage-keys-section"
        ref={keysTableRef}
        className="border border-slate-800 rounded-2xl bg-[#0f1420]/80 overflow-hidden shadow-xl scroll-mt-6"
      >
        <button
          onClick={() => setShowKeysTable(!showKeysTable)}
          className="w-full p-4 flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Key className="w-4 h-4 text-indigo-400" />
            <span>Manage All Project API Keys ({keys.length})</span>
            <span className="text-[10px] text-slate-500 font-mono font-normal">
              — Click "Use in Snippets" to switch active key
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-mono">
            <span>{showKeysTable ? 'Hide Table' : 'Show All Keys'}</span>
            {showKeysTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {showKeysTable && (
          <div className="p-4 border-t border-slate-800/80 space-y-3 animate-fade-in">
            {loadingKeys ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading keys...</div>
            ) : keys.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">No API keys created yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Key Name</th>
                      <th className="py-2.5 px-3">Prefix / Value</th>
                      <th className="py-2.5 px-3">Created</th>
                      <th className="py-2.5 px-3">Last Used</th>
                      <th className="py-2.5 px-3">Active In Guide</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {keys.map((k) => {
                      const isSelected = selectedKey?.id === k.id;
                      const cachedSecret = localCache[k.id];
                      const copyVal = cachedSecret || `${k.key_prefix}****************`;

                      return (
                        <tr key={k.id} className={`hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-indigo-950/25' : ''}`}>
                          <td className="py-3 px-3 font-sans font-medium text-slate-200">
                            <div className="flex items-center gap-2">
                              <span>{k.name}</span>
                              {isSelected && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                                  Selected
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-indigo-300 font-mono">
                            {cachedSecret ? (
                              <span title="Full secret stored in browser">{cachedSecret.slice(0, 16)}••••</span>
                            ) : (
                              <span>{k.key_prefix}••••••••</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-400">{new Date(k.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-3 text-slate-400">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</td>
                          <td className="py-3 px-3 font-sans">
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                                <Check className="w-3.5 h-3.5" /> In Code Snippets
                              </span>
                            ) : (
                              <button
                                onClick={() => setSelectedKeyId(k.id)}
                                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-sans"
                              >
                                Use in Snippets
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-sans">
                            <div className="inline-flex items-center gap-2">
                              {/* Dedicated Copy Button for each key row! */}
                              <button
                                onClick={() => copyToClipboard(copyVal, `table_${k.id}`)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors"
                                title={`Copy key value for "${k.name}"`}
                              >
                                {copiedSnippet === `table_${k.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedSnippet === `table_${k.id}` ? 'Copied' : 'Copy'}</span>
                              </button>

                              <button
                                onClick={() => handleRevokeKey(k.id, k.name)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition-colors"
                              >
                                Revoke
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 6. Modal: Create API Key                                              */}
      {/* --------------------------------------------------------------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1420] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" /> Generate New API Key
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  Key Description / App Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Production Backend, Mobile App"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Account Isolation
                </div>
                <p className="text-slate-400">
                  This key allows your external backend server to securely read and store memories for your customer users.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingKey || !newKeyName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {creatingKey ? 'Generating...' : 'Generate API Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// ============================================================================
// HELPER CODE GENERATORS
// ============================================================================

function getUnifiedSnippet(lang: 'python' | 'typescript' | 'curl', key: string, host: string) {
  if (lang === 'python') {
    return `import requests

EPISODIC_URL = "${host}/api/v1"
API_KEY = "${key}"

# 1-Single API Call handles memory retrieval, LLM response & autonomous learning:
response = requests.post(
    f"{EPISODIC_URL}/chat",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "user_id": "customer_123",
        "message": "What backend framework am I using now?"
    }
)

data = response.json()
print("Assistant:", data["message"])
print("Recalled Memories:", data["retrieved_memories"])`;
  }

  if (lang === 'typescript') {
    return `const EPISODIC_URL = "${host}/api/v1";
const API_KEY = "${key}";

// 1-Single API Call handles memory retrieval, LLM response & autonomous learning:
const res = await fetch(\`\${EPISODIC_URL}/chat\`, {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${API_KEY}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    user_id: "customer_123",
    message: "What backend framework am I using now?"
  })
});

const data = await res.json();
console.log("Assistant:", data.message);
console.log("Recalled Memories:", data.retrieved_memories);`;
  }

  return `curl -X POST ${host}/api/v1/chat \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "customer_123",
    "message": "What backend framework am I using now?"
  }'`;
}

function getBeforeAfterSnippet(
  lang: 'python' | 'typescript' | 'curl',
  mode: 'before' | 'after',
  key: string,
  host: string
) {
  if (mode === 'before') {
    if (lang === 'python') {
      return `# STANDARD OPENAI CHAT (Forgets everything when the session ends)
from openai import OpenAI

client = OpenAI()

def answer_user(user_id: str, message: str):
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "user", "content": message}
        ]
    )
    return response.choices[0].message.content

# ❌ Result: If user says "What city do I live in?", the AI has zero idea!`;
    }

    if (lang === 'typescript') {
      return `// STANDARD OPENAI CHAT (Forgets everything when session ends)
import OpenAI from "openai";

const openai = new OpenAI();

async function answerUser(userId: string, message: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: message }]
  });

  return response.choices[0].message.content;
}

// ❌ Result: Zero memory across sessions`;
    }

    return `# Standard OpenAI call without EpisodicAI:
curl https://api.openai.com/v1/chat/completions \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "What is my city?"}]}'`;
  }

  // mode === 'after'
  if (lang === 'python') {
    return `# OPENAI + EPISODICAI (Remembers forever — Only 3 lines added!)
import requests
from openai import OpenAI

client = OpenAI()
EPISODIC_URL = "${host}/api/v1"
API_KEY = "${key}"

def answer_user(user_id: str, message: str):
    # ✨ LINE 1: Fetch relevant memories for this user
    ctx_res = requests.post(
        f"{EPISODIC_URL}/context",
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={"user_id": user_id, "query": message, "limit": 4}
    )
    memories = [m["content"] for m in ctx_res.json().get("context", [])]

    # ✨ LINE 2: Inject memories into your existing OpenAI prompt
    system_prompt = f"User context: {'; '.join(memories)}" if memories else "Helpful assistant"
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ]
    )

    # ✨ LINE 3: Learn new facts in background (fire-and-forget)
    requests.post(
        f"{EPISODIC_URL}/memory/process",
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={"user_id": user_id, "message": message}
    )

    return response.choices[0].message.content

# ✅ Result: The AI now knows their preferences, history & facts!`;
  }

  if (lang === 'typescript') {
    return `// OPENAI + EPISODICAI (Remembers forever — Only 3 lines added!)
import OpenAI from "openai";

const openai = new OpenAI();
const EPISODIC_URL = "${host}/api/v1";
const API_KEY = "${key}";

async function answerUser(userId: string, message: string) {
  // ✨ LINE 1: Fetch relevant memories for this customer
  const ctxRes = await fetch(\`\${EPISODIC_URL}/context\`, {
    method: "POST",
    headers: { "Authorization": \`Bearer \${API_KEY}\`, "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, query: message, limit: 4 })
  });
  const { context } = await ctxRes.json();
  const memoryText = context.map((m: any) => m.content).join("; ");

  // ✨ LINE 2: Inject memories into your prompt
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: \`User context: \${memoryText}\` },
      { role: "user", content: message }
    ]
  });

  // ✨ LINE 3: Ingest message in background to extract new facts
  fetch(\`\${EPISODIC_URL}/memory/process\`, {
    method: "POST",
    headers: { "Authorization": \`Bearer \${API_KEY}\`, "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, message })
  }).catch(() => {});

  return response.choices[0].message.content;
}

// ✅ Result: Seamless lifetime memory across all devices!`;
  }

  return `# Step 1: Fetch memories
curl -X POST ${host}/api/v1/context \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": "customer_123", "query": "What is my tech stack?", "limit": 4}'

# Step 2: Ingest chat in background to extract & learn facts
curl -X POST ${host}/api/v1/memory/process \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": "customer_123", "message": "I switched backend to Node.js."}'`;
}
