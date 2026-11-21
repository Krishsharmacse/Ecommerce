'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, X, Send, ArrowRight, Bot } from 'lucide-react';

const QUICK_PROMPTS = [
  { label: '🎧 Top Studio Audio', query: 'Electronics' },
  { label: '👟 Best Footwear Drops', query: 'Footwear' },
  { label: '🔥 Deals Under ₹2,000', query: 'deals' },
  { label: '📦 Track My Order', href: '/dashboard/customer?tab=orders' },
  { label: '⚡ Open AI Workstation', href: '/workspace' },
];

export default function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'ai' | 'user'; text: string; link?: string; linkText?: string }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your ShopVault AI Concierge. How can I help you find products or manage orders today?',
    },
  ]);

  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSend = (userText: string) => {
    const text = userText.trim();
    if (!text) return;

    setChatHistory(prev => [...prev, { sender: 'user', text }]);
    setQuery('');
    setIsTyping(true);

    setTimeout(() => {
      const lower = text.toLowerCase();
      let reply = "Here's what I found on ShopVault:";
      let link: string | undefined = `/shop?q=${encodeURIComponent(text)}`;
      let linkText: string | undefined = `View search results for "${text}"`;

      if (lower.includes('headphone') || lower.includes('audio') || lower.includes('earphone')) {
        reply = 'We have studio monitors and noise-cancelling headphones available from verified audio makers.';
        link = '/shop?category=Electronics';
        linkText = 'Browse Electronics & Audio';
      } else if (lower.includes('order') || lower.includes('track') || lower.includes('status')) {
        reply = 'You can track active shipments and delivery milestones directly in your customer dashboard.';
        link = '/dashboard/customer?tab=orders';
        linkText = 'Open My Orders';
      } else if (lower.includes('deal') || lower.includes('discount') || lower.includes('sale')) {
        reply = 'Check out our curated drops with up to 45% off limited inventory items!';
        link = '/shop?deals=true';
        linkText = 'Explore Top Deals';
      } else if (lower.includes('cloth') || lower.includes('wear') || lower.includes('shirt')) {
        reply = 'Explore handcrafted tailoring, organic wool overcoats, and everyday bespoke apparel.';
        link = '/shop?category=Clothing';
        linkText = 'Browse Clothing Collection';
      } else if (lower.includes('shoe') || lower.includes('footwear') || lower.includes('sneaker')) {
        reply = 'Step into premium artisanal footwear and athletic training shoes.';
        link = '/shop?category=Footwear';
        linkText = 'Browse Footwear';
      } else if (lower.includes('workstation') || lower.includes('ai') || lower.includes('prompt')) {
        reply = 'ShopVault features a developer workstation for model inference and prompt workflows.';
        link = '/workspace';
        linkText = 'Launch AI Workstation';
      }

      setChatHistory(prev => [...prev, { sender: 'ai', text: reply, link, linkText }]);
      setIsTyping(false);
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(query);
  };

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Interactive Chat Panel */}
      {isOpen && (
        <div
          className="mb-3 w-[92vw] sm:w-96 max-h-[500px] flex flex-col rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">ShopVault Concierge</h3>
                <p className="text-[10px] text-blue-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  AI shopping assistant online
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              aria-label="Close assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto max-h-72 text-xs" style={{ background: 'var(--surface-sunken)' }}>
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl p-2.5 space-y-1.5 ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white font-medium rounded-tr-none'
                      : 'border rounded-tl-none'
                  }`}
                  style={
                    msg.sender === 'ai'
                      ? { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }
                      : undefined
                  }
                >
                  <p className="leading-relaxed">{msg.text}</p>
                  {msg.link && (
                    <Link
                      href={msg.link}
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:underline pt-1"
                    >
                      {msg.linkText || 'View Details'} <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2 items-center text-[11px]" style={{ color: 'var(--foreground-muted)' }}>
                <Bot className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>ShopVault AI is thinking...</span>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="p-2 border-t flex flex-wrap gap-1.5" style={{ background: 'var(--surface)', borderColor: 'var(--border-subtle)' }}>
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (prompt.href) {
                    setIsOpen(false);
                    router.push(prompt.href);
                  } else if (prompt.query) {
                    handleSend(`Search for ${prompt.query}`);
                  }
                }}
                className="text-[10px] font-medium px-2 py-1 rounded-md transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground-secondary)',
                }}
              >
                {prompt.label}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-2.5 border-t flex items-center gap-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask anything or request products..."
              className="flex-1 px-3 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Send query"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Trigger Button with Tooltip */}
      <div className="group relative flex items-center">
        {/* Tooltip on Hover */}
        {!isOpen && (
          <div
            className="absolute right-full mr-3 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{
              background: 'var(--surface-elevated)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Ask ShopVault AI Concierge</span>
          </div>
        )}

        {/* Pulse Aura Ring */}
        <span className="absolute -inset-1 rounded-full bg-blue-500/20 animate-ping pointer-events-none" />

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          aria-expanded={isOpen}
          aria-label="ShopVault AI Assistant"
          className="relative flex items-center gap-2 px-3.5 py-3 rounded-full text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border border-white/20"
        >
          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          <span className="text-xs font-bold hidden sm:inline tracking-tight">AI Concierge</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
        </button>
      </div>
    </div>
  );
}
