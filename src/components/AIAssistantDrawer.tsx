import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, User, CornerDownLeft, RefreshCw, Lightbulb } from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    sender: 'ai',
    text: 'Hello! I am your De-Olive Interior Design AI Assistant. How can I assist with your active concepts, material schedules, or project estimates today?',
    timestamp: 'Just now',
  },
];

const SUGGESTED_PROMPTS = [
  'Estimate Italian Carrara marble budget',
  'Draft mood board concepts for luxury penthouse',
  'Review milestone deadlines for Villa project',
  'Generate client procurement status email',
];

export const AIAssistantDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: 'Now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = "I've reviewed your request for the design workflow. All spatial specifications and material selections have been verified against De-Olive DBMS standards.";
      const lower = query.toLowerCase();

      if (lower.includes('marble') || lower.includes('budget') || lower.includes('cost')) {
        reply = 'Based on current supplier rates from Al-Noor Marble & Granite: 120m² of Carrara Honed slabs with custom edge treatment is estimated at $38,400.00 including dry-lay inspection and transit.';
      } else if (lower.includes('mood') || lower.includes('concept') || lower.includes('penthouse')) {
        reply = 'For the luxury penthouse concept: I recommend pairing brushed brass architectural hardware with bouclé textiles and smoked eucalyptus millwork. Mood board draft #04 is ready in your Design Library.';
      } else if (lower.includes('deadline') || lower.includes('villa') || lower.includes('milestone')) {
        reply = 'The Villa Al-Khobar Renovation milestone "Phase 2 Joinery & MEP Rough-in" is scheduled for completion next Friday. Progress is currently tracked at 68% with zero material delays.';
      } else if (lower.includes('email') || lower.includes('client')) {
        reply = 'Here is a draft update for your client:\n\n"Dear Client, We are pleased to report that 3D renders for the master suite and living pavilions have received municipal approval. Material procurement has commenced on schedule."';
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: reply,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 650);
  };

  return (
    <>
      {/* Floating AI Button fixed at bottom right */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Assistant"
        className="fixed bottom-6 right-6 z-40 w-13 h-13 rounded-full bg-[#111113] ring-2 ring-[#77C614] shadow-xl hover:shadow-[0_0_20px_rgba(119,198,20,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
      >
        <Sparkles className="w-6 h-6 text-[#77C614] group-hover:rotate-12 transition-transform duration-300" />
      </button>

      {/* Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <aside className="relative w-full sm:w-[440px] h-full bg-[#0E0E10] text-stone-100 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-[#222226]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#222226] bg-[#121215] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-black ring-2 ring-[#77C614] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#77C614]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white tracking-wide">DE-OLIVE AI</h2>
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#77C614]/15 text-[#77C614] px-1.5 py-0.5 rounded border border-[#77C614]/30">
                      Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400">Interior Design Intelligence</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                aria-label="Close assistant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Suggested Prompts Pill List */}
            <div className="px-4 py-3 bg-[#16161A] border-b border-[#222226] flex gap-2 overflow-x-auto no-scrollbar">
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="shrink-0 text-[11px] bg-[#1E1E24] hover:bg-[#282830] text-stone-300 hover:text-[#77C614] px-2.5 py-1.5 rounded-lg border border-[#2D2D36] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Lightbulb className="w-3 h-3 text-[#77C614]" />
                  <span className="truncate max-w-[210px]">{prompt}</span>
                </button>
              ))}
            </div>

            {/* Conversation Flow */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 text-xs ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-black ring-1 ring-[#77C614] flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-[#77C614]" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      m.sender === 'user'
                        ? 'bg-[#77C614] text-black font-medium shadow-md rounded-br-xs'
                        : 'bg-[#18181D] text-stone-200 border border-[#25252C] rounded-bl-xs leading-relaxed whitespace-pre-wrap'
                    }`}
                  >
                    <p>{m.text}</p>
                    <span
                      className={`block text-[10px] mt-1.5 ${
                        m.sender === 'user' ? 'text-black/60 text-right' : 'text-stone-500'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>

                  {m.sender === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-stone-800 flex items-center justify-center shrink-0 mt-0.5 text-stone-300 font-bold text-[11px]">
                      U
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2 items-center text-xs text-stone-400 italic pl-10">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#77C614]" />
                  <span>AI assistant is calculating design insights...</span>
                </div>
              )}
            </div>

            {/* Input Box */}
            <div className="p-4 border-t border-[#222226] bg-[#121215]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about design concepts, budgets, or materials..."
                  className="w-full bg-[#1A1A20] border border-[#2C2C34] focus:border-[#77C614] rounded-xl pl-4 pr-11 py-3 text-xs text-stone-100 placeholder-stone-500 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[#77C614] text-black flex items-center justify-center hover:bg-[#68B012] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <CornerDownLeft className="w-4 h-4" />
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
