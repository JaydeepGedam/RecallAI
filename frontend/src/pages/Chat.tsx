import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Sparkles, 
  BrainCircuit, 
  History, 
  ChevronDown, 
  ChevronUp, 
  PlusCircle,
  Play,
  Loader2
} from 'lucide-react';
import { chatApi } from '../services/api';
import { ChatResponse, ScoredMemory, Memory } from '../types';
import { useAuth } from '../context/AuthContext';
import { useChat, ChatTurn } from '../context/ChatContext';
import FormattedMessage from '../components/FormattedMessage';

export default function Chat() {
  const { user } = useAuth();
  const userId = user?.id || '';
  const { messages, conversationId, setMessages, setConversationId, clearChat } = useChat();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [expandedContextIndex, setExpandedContextIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const presetScenarios = [
    { label: "1. State Tech", text: "I'm building my backend using FastAPI and PostgreSQL." },
    { label: "2. Ask Tech", text: "What backend technology am I using?" },
    { label: "3. Migrate Stack", text: "I've moved my backend to Node.js." },
    { label: "4. Ask Tech Now", text: "What backend am I using now?" },
    { label: "Notification Pref", text: "I prefer WhatsApp notifications." },
    { label: "Hobby / Like", text: "I love football and I like reading books." },
  ];

  const handleSend = async (messageToSend: string = input, currentConvId?: string) => {
    const text = messageToSend.trim();
    if (!text || !userId) return;

    setInput('');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message
    const userMsg: ChatTurn = {
      id: `user-${Date.now()}-${Math.random()}`,
      role: 'user',
      content: text,
      timestamp: now,
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const activeConvId = currentConvId !== undefined ? currentConvId : conversationId;
      const res: ChatResponse = await chatApi.send({
        user_id: userId,
        message: text,
        conversation_id: activeConvId,
      });

      setConversationId(res.conversation_id);

      const assistantMsg: ChatTurn = {
        id: `assistant-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: res.message,
        retrievedMemories: res.retrieved_memories,
        extractedMemories: res.extracted_memories,
        actionNotes: res.action_notes,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMsg]);
      return res.conversation_id;
    } catch (err: any) {
      const errorMsg: ChatTurn = {
        id: `error-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content: `Error communicating with memory engine: ${err.message || 'Please check backend connectivity.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    clearChat();
  };

  // Run the full Section 33 Benchmark live in the chat transcript
  const runBenchmark = async () => {
    if (benchmarkRunning || loading || !userId) return;
    setBenchmarkRunning(true);
    handleNewChat();

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    try {
      // Step 1: State tech stack
      const conv1 = await handleSend("I'm building my backend using FastAPI and PostgreSQL.");
      await delay(1600);

      // Step 2: Ask backend tech
      await handleSend("What backend technology am I using?", conv1);
      await delay(1600);

      // Step 3: State migration to Node.js (triggers conflict & superseding)
      await handleSend("I've moved my backend to Node.js.", conv1);
      await delay(1600);

      // Step 4: Ask backend tech now (verifies active Node.js over superseded FastAPI)
      await handleSend("What backend am I using now?", conv1);
    } finally {
      setBenchmarkRunning(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-[#0f1420] border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
      {/* Top Bar with Benchmark Runner */}
      <div className="p-4 border-b border-slate-800 bg-[#141b2d] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Interactive Memory Chat</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Continuous Learning
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Retrieves past memories for <span className="text-indigo-300 font-medium">{user?.name || 'you'}</span> and updates state.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 1-Click Section 33 Benchmark Runner */}
          <button
            onClick={runBenchmark}
            disabled={loading || benchmarkRunning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            title="Automatically run the 4-step Section 33 Acceptance Scenario live"
          >
            {benchmarkRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>{benchmarkRunning ? 'Running Benchmark...' : 'Run Section 33 Benchmark'}</span>
          </button>

          <button
            onClick={handleNewChat}
            disabled={benchmarkRunning}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium border border-slate-700/60 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Welcome, {user?.name || 'User'}!
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Chat naturally with the assistant. Facts, preferences, and projects you mention will be extracted into your private memory partition.
            </p>

            <div className="w-full space-y-2 text-left">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 font-semibold uppercase">
                <span>Interactive Test Pills:</span>
                <span className="text-[10px] text-indigo-400 font-normal">Click to send</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presetScenarios.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(s.text)}
                    disabled={loading || benchmarkRunning}
                    className="p-2.5 rounded-xl bg-[#141b2d] border border-slate-800 hover:border-indigo-500/40 text-left transition-all group disabled:opacity-50"
                  >
                    <div className="text-[10px] font-mono text-indigo-400 font-semibold mb-0.5">{s.label}</div>
                    <div className="text-xs text-slate-300 group-hover:text-white line-clamp-1">{s.text}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isContextOpen = expandedContextIndex === index;

            return (
              <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-xl space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Message Bubble */}
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20'
                      : 'bg-[#141b2d] border border-slate-800 text-slate-200 rounded-tl-sm shadow-lg'
                  }`}>
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <FormattedMessage content={msg.content} />
                    )}
                  </div>

                  {/* Metadata Drawer for Assistant Messages */}
                  {!isUser && (
                    <div className="space-y-1.5 text-xs font-mono">
                      {/* Action notes / Conflict resolution badge */}
                      {msg.actionNotes && msg.actionNotes.length > 0 && (
                        <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px] flex items-center gap-1.5 animate-fade-in">
                          <History className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                          <span>{msg.actionNotes.join('; ')}</span>
                        </div>
                      )}

                      {/* Newly Extracted Memories Badge */}
                      {msg.extractedMemories && msg.extractedMemories.length > 0 && (
                        <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px] flex items-center gap-1.5 animate-fade-in">
                          <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                          <span>Learned {msg.extractedMemories.length} new memory: "{msg.extractedMemories[0].content}"</span>
                        </div>
                      )}

                      {/* Retrieved Memories Context Toggle */}
                      {msg.retrievedMemories && msg.retrievedMemories.length > 0 && (
                        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60">
                          <button
                            onClick={() => setExpandedContextIndex(isContextOpen ? null : index)}
                            className="w-full px-3 py-1.5 text-[11px] text-slate-400 hover:text-slate-200 flex items-center justify-between transition-colors"
                          >
                            <span className="flex items-center gap-1.5 text-indigo-400">
                              <BrainCircuit className="w-3.5 h-3.5" />
                              {msg.retrievedMemories.length} Supporting Memories Used as Context
                            </span>
                            {isContextOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {isContextOpen && (
                            <div className="p-3 border-t border-slate-800/80 space-y-2 bg-[#0a0d14]">
                              {msg.retrievedMemories.map(rm => (
                                <div key={rm.id} className="p-2 rounded-md bg-[#141b2d] border border-slate-800/80 text-[11px]">
                                  <div className="text-slate-200 font-sans font-medium">"{rm.content}"</div>
                                  <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className="text-indigo-400 font-semibold">Ranked Score: {(rm.final_score * 100).toFixed(1)}%</span>
                                    <span>Sim: {(rm.semantic_similarity * 100).toFixed(1)}%</span>
                                    <span>Recency: {(rm.recency_score * 100).toFixed(1)}%</span>
                                    <span className="uppercase text-slate-500 font-semibold">{rm.status}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`text-[10px] font-mono text-slate-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-700 flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-md shadow-indigo-600/30">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-1">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-[#141b2d] border border-slate-800 text-slate-400 text-xs font-mono flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Retrieving context & reasoning...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Preset Pill Triggers (Quick followup buttons) */}
      {messages.length > 0 && (
        <div className="px-6 py-2 border-t border-slate-800/60 bg-[#0c101a] flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-400 text-[10px] font-mono uppercase flex-shrink-0">Next Step:</span>
          {presetScenarios.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s.text)}
              disabled={loading || benchmarkRunning}
              className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-white transition-colors flex-shrink-0 disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800 bg-[#141b2d]">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input
            type="text"
            value={input}
            disabled={benchmarkRunning}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message (e.g. 'I prefer WhatsApp notifications' or 'What backend am I using?')..."
            className="flex-1 bg-[#0f1420] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || benchmarkRunning}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
