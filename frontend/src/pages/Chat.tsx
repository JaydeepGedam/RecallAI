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
  PlusCircle
} from 'lucide-react';
import { chatApi } from '../services/api';
import { ChatResponse, ScoredMemory, Memory } from '../types';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  retrievedMemories?: ScoredMemory[];
  extractedMemories?: Memory[];
  actionNotes?: string[];
  timestamp: string;
}

export default function Chat() {
  const userId = localStorage.getItem('recallai_user_id') || '56f3c1ec-1d26-4413-91f3-b0d1f549c470';
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
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
    { label: "How Notify?", text: "How will you notify me?" },
  ];

  const handleSend = async (messageToSend: string = input) => {
    const text = messageToSend.trim();
    if (!text || loading) return;

    setInput('');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message
    const userMsg: ChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: now,
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res: ChatResponse = await chatApi.send({
        user_id: userId,
        message: text,
        conversation_id: conversationId,
      });

      setConversationId(res.conversation_id);

      const assistantMsg: ChatTurn = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.message,
        retrievedMemories: res.retrieved_memories,
        extractedMemories: res.extracted_memories,
        actionNotes: res.action_notes,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatTurn = {
        id: `error-${Date.now()}`,
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
    setMessages([]);
    setConversationId(undefined);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-[#0f1420] border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
      {/* Top Bar */}
      <div className="p-4 border-b border-slate-800 bg-[#141b2d] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">RecallAI Interactive Demonstration Chat</h2>
            <p className="text-[11px] text-slate-400">Retrieves past memories as context and continuously stores newly extracted knowledge.</p>
          </div>
        </div>

        <button
          onClick={handleNewChat}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium border border-slate-700/60 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          New Chat
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Experience AI Memory In Action</h3>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Send a statement to store a memory, then ask a follow-up question to see the bot retrieve and use that context.
            </p>

            <div className="w-full space-y-2 text-left">
              <div className="text-[11px] font-mono text-slate-400 font-semibold uppercase">
                Section 33 Test Sequence:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presetScenarios.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(s.text)}
                    className="p-2.5 rounded-xl bg-[#141b2d] border border-slate-800 hover:border-indigo-500/40 text-left transition-all group"
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
                  {/* Bubble */}
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20'
                      : 'bg-[#141b2d] border border-slate-800 text-slate-200 rounded-tl-sm shadow-lg'
                  }`}>
                    {msg.content}
                  </div>

                  {/* Metadata Drawer for Assistant Messages */}
                  {!isUser && (
                    <div className="space-y-1.5 text-xs font-mono">
                      {/* Action notes / Conflict resolution badge */}
                      {msg.actionNotes && msg.actionNotes.length > 0 && (
                        <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px] flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                          <span>{msg.actionNotes.join('; ')}</span>
                        </div>
                      )}

                      {/* Newly Extracted Memories Badge */}
                      {msg.extractedMemories && msg.extractedMemories.length > 0 && (
                        <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px] flex items-center gap-1.5">
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
                                    <span className="text-indigo-400">Score: {(rm.final_score * 100).toFixed(1)}%</span>
                                    <span>Sim: {(rm.semantic_similarity * 100).toFixed(1)}%</span>
                                    <span>Recency: {(rm.recency_score * 100).toFixed(1)}%</span>
                                    <span className="uppercase text-slate-400 font-semibold">{rm.status}</span>
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
              Retrieving memories & reasoning...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Preset Pill Triggers */}
      {messages.length > 0 && (
        <div className="px-6 py-2 border-t border-slate-800/60 bg-[#0c101a] flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-400 text-[10px] font-mono uppercase flex-shrink-0">Next Step:</span>
          {presetScenarios.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s.text)}
              disabled={loading}
              className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-white transition-colors flex-shrink-0"
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
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message (e.g. 'I prefer WhatsApp notifications' or 'What backend am I using?')..."
            className="flex-1 bg-[#0f1420] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
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
