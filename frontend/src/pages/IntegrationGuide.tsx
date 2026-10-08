import { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  Code2, 
  Terminal, 
  Sparkles, 
  ShieldCheck, 
  Play, 
  Layers, 
  CheckCircle2, 
  Loader2,
  Send,
  AlertCircle,
  KeyRound,
  CheckCheck,
  RefreshCw,
  Zap
} from 'lucide-react';
import { apiKeysApi, v1Api, APIKeyItem, APIKeyCreated } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function IntegrationGuide() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<APIKeyItem[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdKeyData, setCreatedKeyData] = useState<APIKeyCreated | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Active SDK Tab
  const [activeTab, setActiveTab] = useState<'python' | 'typescript' | 'curl'>('python');

  // Interactive Live Sandbox state
  const [sandboxEndpoint, setSandboxEndpoint] = useState<'context' | 'process'>('context');
  const [sandboxUserId, setSandboxUserId] = useState(user?.id || 'demo_user_123');
  const [sandboxQuery, setSandboxQuery] = useState('How should you contact me?');
  const [sandboxProcessMsg, setSandboxProcessMsg] = useState("I've moved from Seattle to London and I'm now using Node.js instead of FastAPI.");
  const [sandboxCustomKey, setSandboxCustomKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxResponse, setSandboxResponse] = useState<any>(null);
  const [sandboxStatus, setSandboxStatus] = useState<number | null>(null);
  const [sandboxLatency, setSandboxLatency] = useState<number | null>(null);
  const [copiedResponse, setCopiedResponse] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setLoadingKeys(true);
      const data = await apiKeysApi.list();
      setKeys(data);
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
    if (!window.confirm(`Are you sure you want to revoke API key "${name}"? Any external applications using this key will immediately lose access.`)) {
      return;
    }
    try {
      await apiKeysApi.revoke(id);
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

  // Keep sandbox user ID synced with active logged-in user
  useEffect(() => {
    if (user?.id && (sandboxUserId === 'demo_user_123' || !sandboxUserId)) {
      setSandboxUserId(user.id);
    }
  }, [user]);

  const runLiveSandbox = async () => {
    setSandboxLoading(true);
    setSandboxResponse(null);
    setSandboxStatus(null);
    setSandboxLatency(null);

    const startTime = performance.now();
    // Precedence: Typed custom key > session generated key > undefined (auto-uses current JWT session)
    const effectiveKey = sandboxCustomKey.trim() || (createdKeyData?.api_key || undefined);

    try {
      let res;
      if (sandboxEndpoint === 'context') {
        if (!sandboxQuery.trim()) {
          setSandboxLoading(false);
          return;
        }
        res = await v1Api.getContext(sandboxUserId.trim(), sandboxQuery.trim(), effectiveKey);
      } else {
        if (!sandboxProcessMsg.trim()) {
          setSandboxLoading(false);
          return;
        }
        res = await v1Api.processMessage(sandboxUserId.trim(), sandboxProcessMsg.trim(), effectiveKey);
      }
      const elapsed = Math.round(performance.now() - startTime);
      setSandboxLatency(elapsed);
      setSandboxStatus(200);
      setSandboxResponse(res);
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      setSandboxLatency(elapsed);
      setSandboxStatus(err.response?.status || 500);
      setSandboxResponse(err.response?.data || { error: err.message || 'Failed to execute query' });
    } finally {
      setSandboxLoading(false);
    }
  };

  // Determine placeholder or real API key for snippets
  const displayApiKey = createdKeyData?.api_key || (keys.length > 0 ? `${keys[0].key_prefix}****************` : 'epi_live_your_api_key_here');

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0d14] p-6 lg:p-8 space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-medium mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Memory-as-a-Service Platform
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Developer Integration Guide</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Plug EpisodicAI into your AI application. Keep your existing LLM (OpenAI, Claude, Gemini, Ollama) and use EpisodicAI as your persistent memory layer.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {/* Newly Created Key Alert Banner */}
      {createdKeyData && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 shadow-xl space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 font-mono">
              <CheckCircle2 className="w-4 h-4" /> API Key Created: {createdKeyData.name}
            </span>
            <button
              onClick={() => setCreatedKeyData(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs text-slate-300">
            Please copy this key now. For your security, <strong className="text-emerald-300">you will not be able to see it again</strong>.
          </p>
          <div className="flex items-center gap-2 bg-slate-950/80 border border-emerald-500/30 rounded-lg p-2.5 font-mono text-xs text-emerald-300">
            <span className="flex-1 select-all break-all">{createdKeyData.api_key}</span>
            <button
              onClick={() => copyToClipboard(createdKeyData.api_key, 'key')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-sans font-medium transition-colors"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey ? 'Copied!' : 'Copy Key'}
            </button>
          </div>
        </div>
      )}

      {/* Section 1: Active API Keys */}
      <section className="bg-[#0f1420]/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Your Multi-Tenant API Keys</h2>
              <p className="text-[11px] text-slate-400">All memories stored with these keys are isolated under your tenant workspace.</p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded">
            {keys.length} Active {keys.length === 1 ? 'Key' : 'Keys'}
          </span>
        </div>

        {loadingKeys ? (
          <div className="py-8 flex justify-center items-center text-slate-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin mr-2 text-indigo-400" /> Loading your API keys...
          </div>
        ) : keys.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
            <Key className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs text-slate-300 font-medium">No API keys created yet</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Create an API key to authenticate external requests from your application to EpisodicAI.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Generate First Key
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Key Prefix</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3">Last Used</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-200">{k.name}</td>
                    <td className="py-3 px-3 font-mono text-indigo-300">{k.key_prefix}••••••••</td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(k.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleRevokeKey(k.id, k.name)}
                        className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 text-[11px] font-medium transition-colors"
                        title="Revoke this key"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 2: Architecture Flow */}
      <section className="bg-[#0f1420]/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">How EpisodicAI Plugs Into Your App</h2>
            <p className="text-[11px] text-slate-400">Keep your existing LLM provider. EpisodicAI acts as the persistent memory layer.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-mono text-indigo-400 font-semibold uppercase">Step 1: Before Answering</span>
            <h3 className="text-xs font-bold text-white">1. Fetch Context</h3>
            <p className="text-[11px] text-slate-400">
              Call <code className="text-indigo-300 font-mono bg-indigo-950/60 px-1 py-0.5 rounded">POST /api/v1/context</code> with your user's query.
            </p>
            <div className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800 font-mono">
              EpisodicAI returns ranked active memories and automatically suppresses superseded facts.
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase">Step 2: Generate Reply</span>
            <h3 className="text-xs font-bold text-white">2. Call Your Own LLM</h3>
            <p className="text-[11px] text-slate-400">
              Inject the retrieved memories into your prompt to OpenAI, Claude, Gemini, or local Ollama.
            </p>
            <div className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800 font-mono">
              Your LLM answers with personalized, accurate memory without hallucinations.
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-mono text-purple-400 font-semibold uppercase">Step 3: Continuous Learning</span>
            <h3 className="text-xs font-bold text-white">3. Process Message</h3>
            <p className="text-[11px] text-slate-400">
              Send the dialogue to <code className="text-purple-300 font-mono bg-purple-950/60 px-1 py-0.5 rounded">POST /api/v1/memory/process</code>.
            </p>
            <div className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800 font-mono">
              EpisodicAI extracts facts, updates preferences, supersedes conflicting facts, and reinforces duplicates.
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Code Integration Snippets */}
      <section className="bg-[#0f1420]/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Quickstart Code Integration</h2>
              <p className="text-[11px] text-slate-400">Copy and paste these snippets directly into your backend or application.</p>
            </div>
          </div>

          {/* Language Tabs */}
          <div className="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === 'python' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setActiveTab('typescript')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === 'typescript' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TypeScript / JS
            </button>
            <button
              onClick={() => setActiveTab('curl')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === 'curl' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              cURL
            </button>
          </div>
        </div>

        {/* Snippet 1: Fetch Context */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 font-mono">1. Retrieve Memory Context (POST /api/v1/context)</span>
            <button
              onClick={() => copyToClipboard(
                activeTab === 'python' 
                  ? pythonContextCode(displayApiKey) 
                  : activeTab === 'typescript' 
                    ? tsContextCode(displayApiKey) 
                    : curlContextCode(displayApiKey),
                'snippet1'
              )}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 font-mono"
            >
              {copiedSnippet === 'snippet1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedSnippet === 'snippet1' ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto">
            {activeTab === 'python' && pythonContextCode(displayApiKey)}
            {activeTab === 'typescript' && tsContextCode(displayApiKey)}
            {activeTab === 'curl' && curlContextCode(displayApiKey)}
          </pre>
        </div>

        {/* Snippet 2: Process Message */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 font-mono">2. Process & Learn New Memories (POST /api/v1/memory/process)</span>
            <button
              onClick={() => copyToClipboard(
                activeTab === 'python' 
                  ? pythonProcessCode(displayApiKey) 
                  : activeTab === 'typescript' 
                    ? tsProcessCode(displayApiKey) 
                    : curlProcessCode(displayApiKey),
                'snippet2'
              )}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 font-mono"
            >
              {copiedSnippet === 'snippet2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedSnippet === 'snippet2' ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto">
            {activeTab === 'python' && pythonProcessCode(displayApiKey)}
            {activeTab === 'typescript' && tsProcessCode(displayApiKey)}
            {activeTab === 'curl' && curlProcessCode(displayApiKey)}
          </pre>
        </div>
      </section>

      {/* Section 4: Live Interactive Sandbox */}
      <section className="bg-[#0f1420]/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Live API Sandbox
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Server
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Test EpisodicAI endpoints directly from your browser. Use your active session or test external API keys.
              </p>
            </div>
          </div>

          {/* Endpoint Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => {
                setSandboxEndpoint('context');
                setSandboxResponse(null);
                setSandboxStatus(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sandboxEndpoint === 'context'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              POST /api/v1/context
            </button>
            <button
              onClick={() => {
                setSandboxEndpoint('process');
                setSandboxResponse(null);
                setSandboxStatus(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sandboxEndpoint === 'process'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              POST /api/v1/memory/process
            </button>
          </div>
        </div>

        {/* Authentication Mode Status Bar */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Authentication:</span>
            {sandboxCustomKey.trim() ? (
              <span className="font-mono text-amber-300 font-medium">
                Custom API Key ({sandboxCustomKey.trim().slice(0, 12)}••••)
              </span>
            ) : (
              <span className="font-mono text-emerald-300 font-medium">
                Active Dashboard Session ({user?.email || 'Logged in'})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {createdKeyData && !sandboxCustomKey && (
              <button
                onClick={() => setSandboxCustomKey(createdKeyData.api_key)}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 underline"
              >
                Use Created Key ({createdKeyData.key_prefix}...)
              </button>
            )}
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors"
            >
              <KeyRound className="w-3 h-3 text-slate-400" />
              {showKeyInput ? 'Hide API Key Input' : 'Test with Custom API Key'}
            </button>
          </div>
        </div>

        {/* Optional Custom API Key Input */}
        {showKeyInput && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-indigo-300 font-medium">
                Custom EpisodicAI API Key (<code className="text-indigo-200">epi_live_...</code>)
              </label>
              {sandboxCustomKey && (
                <button
                  onClick={() => setSandboxCustomKey('')}
                  className="text-[11px] text-slate-400 hover:text-rose-400 font-mono"
                >
                  Clear (revert to session auth)
                </button>
              )}
            </div>
            <input
              type="text"
              value={sandboxCustomKey}
              onChange={(e) => setSandboxCustomKey(e.target.value)}
              placeholder="epi_live_... (Leave empty to use your active login session automatically)"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400">
              When empty, your active dashboard login session is used automatically so you can test without creating a key.
            </p>
          </div>
        )}

        {/* Sandbox Playground Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Request Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                User Identifier (<code className="text-indigo-300">user_id</code>)
              </label>
              <input
                type="text"
                value={sandboxUserId}
                onChange={(e) => setSandboxUserId(e.target.value)}
                placeholder="e.g. user_123 or your user id"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                The identifier for this user inside your application. Isolated under your tenant account.
              </p>
            </div>

            {sandboxEndpoint === 'context' ? (
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  User Query / Prompt (<code className="text-indigo-300">query</code>)
                </label>
                <input
                  type="text"
                  value={sandboxQuery}
                  onChange={(e) => setSandboxQuery(e.target.value)}
                  placeholder="e.g. How should you contact me?"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                
                {/* Sample Preset Chips */}
                <div className="mt-2 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Quick Test Queries:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'How should you contact me?',
                      'What backend framework does the user prefer?',
                      'Where does the user live?',
                      'What projects is the user working on?'
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSandboxQuery(preset)}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                      >
                        "{preset}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Conversation Message (<code className="text-indigo-300">message</code>)
                </label>
                <textarea
                  rows={3}
                  value={sandboxProcessMsg}
                  onChange={(e) => setSandboxProcessMsg(e.target.value)}
                  placeholder="e.g. I prefer Python over Java, and my primary contact is email."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />

                {/* Sample Preset Chips */}
                <div className="mt-2 space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Quick Test Statements:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "I've moved from Seattle to London and I'm now using Node.js instead of FastAPI.",
                      'My preferred contact method is Slack, not email.',
                      'I am currently building an AI agent platform using React.'
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSandboxProcessMsg(preset)}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-colors text-left"
                      >
                        "{preset.slice(0, 48)}..."
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={runLiveSandbox}
                disabled={sandboxLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
              >
                {sandboxLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Executing Query...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Execute Live Query
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSandboxQuery('How should you contact me?');
                  setSandboxProcessMsg("I've moved from Seattle to London and I'm now using Node.js instead of FastAPI.");
                  setSandboxResponse(null);
                  setSandboxStatus(null);
                }}
                className="px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
              >
                Reset
              </button>
            </div>

            {/* Live cURL Preview */}
            <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Equivalent cURL Request</span>
                <button
                  onClick={() => {
                    const authHeader = sandboxCustomKey.trim() 
                      ? `Bearer ${sandboxCustomKey.trim()}` 
                      : (createdKeyData?.api_key ? `Bearer ${createdKeyData.api_key}` : 'Bearer epi_live_your_key');
                    const body = sandboxEndpoint === 'context'
                      ? JSON.stringify({ user_id: sandboxUserId, query: sandboxQuery, limit: 5 })
                      : JSON.stringify({ user_id: sandboxUserId, message: sandboxProcessMsg });
                    const url = sandboxEndpoint === 'context'
                      ? 'http://localhost:8005/api/v1/context'
                      : 'http://localhost:8005/api/v1/memory/process';
                    copyToClipboard(`curl -X POST ${url} \\\n  -H "Authorization: ${authHeader}" \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`, 'sandbox_curl');
                  }}
                  className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
                >
                  {copiedSnippet === 'sandbox_curl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedSnippet === 'sandbox_curl' ? 'Copied' : 'Copy cURL'}
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400 overflow-x-auto">
                {`curl -X POST http://localhost:8005/api/v1/${sandboxEndpoint === 'context' ? 'context' : 'memory/process'} \\
  -H "Authorization: Bearer ${sandboxCustomKey.trim() || (createdKeyData?.api_key || 'epi_live_... (or session)')}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(sandboxEndpoint === 'context' ? { user_id: sandboxUserId, query: sandboxQuery, limit: 5 } : { user_id: sandboxUserId, message: sandboxProcessMsg })}'`}
              </pre>
            </div>
          </div>

          {/* Response Viewer */}
          <div className="space-y-2 flex flex-col">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-400 text-[11px]">Server Response (JSON)</span>
                {sandboxStatus && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      sandboxStatus === 200
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {sandboxStatus} {sandboxStatus === 200 ? 'OK' : 'Error'} {sandboxLatency ? `(${sandboxLatency}ms)` : ''}
                  </span>
                )}
              </div>

              {sandboxResponse && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(sandboxResponse, null, 2));
                    setCopiedResponse(true);
                    setTimeout(() => setCopiedResponse(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 font-mono"
                >
                  {copiedResponse ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedResponse ? 'Copied' : 'Copy Response'}
                </button>
              )}
            </div>

            <pre className="flex-1 min-h-[320px] max-h-[460px] p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-y-auto overflow-x-auto">
              {sandboxLoading ? (
                <div className="h-full flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> Querying EpisodicAI backend...
                </div>
              ) : sandboxResponse ? (
                JSON.stringify(sandboxResponse, null, 2)
              ) : (
                <div className="text-slate-600 space-y-2 py-4">
                  <p className="text-slate-400 font-semibold">// How to use Live Sandbox:</p>
                  <p>1. Keep your active user ID or enter any test customer ID.</p>
                  <p>2. Select a quick test query or type your own question.</p>
                  <p>3. Click "Execute Live Query" to see real memories retrieved with similarity scores.</p>
                  <p className="text-slate-500 text-[10px] pt-4">Tip: Switch to "POST /api/v1/memory/process" to test adding new facts and superseding old memories live.</p>
                </div>
              )}
            </pre>
          </div>
        </div>
      </section>

      {/* Modal: Create API Key */}
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
                  Key Description / Application Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Production Mobile App, Discord Bot"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Tenant Scope Security
                </div>
                <p className="text-slate-400">
                  This key will have full programmatic access to create and search memories within your tenant partition.
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
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {creatingKey ? 'Generating...' : 'Create Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Code Generators
function pythonContextCode(key: string) {
  return `import requests

EPISODIC_API_URL = "http://localhost:8005/api/v1"
API_KEY = "${key}"

# 1. Fetch relevant memories for your user before calling your LLM
response = requests.post(
    f"{EPISODIC_API_URL}/context",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "user_id": "customer_user_123",
        "query": "How should you contact me?",
        "limit": 5
    }
)

memories = response.json().get("context", [])
print(f"Retrieved {len(memories)} memories:")
for mem in memories:
    print(f"- [{mem['type']}] {mem['content']} (score: {mem['score']})")

# 2. Inject memories directly into your OpenAI / Claude / Gemini prompt:
# system_prompt = f"User memories: {memories}\\nAnswer user query..."`;
}

function pythonProcessCode(key: string) {
  return `import requests

EPISODIC_API_URL = "http://localhost:8005/api/v1"
API_KEY = "${key}"

# Send conversation message to autonomously extract, deduplicate, and resolve conflicts
response = requests.post(
    f"{EPISODIC_API_URL}/memory/process",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "user_id": "customer_user_123",
        "message": "I've moved from Seattle to London and I'm now using Node.js instead of FastAPI."
    }
)

result = response.json()
print("Created memories:", result.get("created"))
print("Superseded conflicts:", result.get("superseded"))`;
}

function tsContextCode(key: string) {
  return `// 1. Fetch relevant memories before answering
const res = await fetch("http://localhost:8005/api/v1/context", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${key}"
  },
  body: JSON.stringify({
    user_id: "customer_user_123",
    query: "How should you contact me?",
    limit: 5
  })
});

const { context } = await res.json();
console.log("Retrieved memories:", context);

// Inject into your prompt:
// const prompt = \`User context: \${JSON.stringify(context)}\\nUser query...\`;`;
}

function tsProcessCode(key: string) {
  return `// 2. Automatically extract, dedupe, and resolve conflicts
const res = await fetch("http://localhost:8005/api/v1/memory/process", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${key}"
  },
  body: JSON.stringify({
    user_id: "customer_user_123",
    message: "I've moved to London and switched backend from FastAPI to Node.js."
  })
});

const data = await res.json();
console.log("Memory process result:", data);`;
}

function curlContextCode(key: string) {
  return `curl -X POST http://localhost:8005/api/v1/context \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{
    "user_id": "customer_user_123",
    "query": "How should you contact me?",
    "limit": 5
  }'`;
}

function curlProcessCode(key: string) {
  return `curl -X POST http://localhost:8005/api/v1/memory/process \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{
    "user_id": "customer_user_123",
    "message": "I prefer WhatsApp notifications over email."
  }'`;
}
