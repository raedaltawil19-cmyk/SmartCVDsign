import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";
import { ArrowRight, Send, Loader2, MessageSquarePlus, Sparkles } from "lucide-react";
import MessageBubble from "@/components/agent/MessageBubble";

const AGENT_NAME = "cv_review_coach";

const EXAMPLES = [
  "راجع سيرتي واقترح تحسينات لوظيفة مطور برمجيات",
  "لدي إعلان وظيفة رقم 12345678، كيف أطابق سيرتي معه؟",
  "ابحث عن وظائف مهندس بيانات في ستوكهولم وقارنها بسيرتي",
];

export default function AgentChat() {
  const navigate = useNavigate();
  const { dir, t } = useLanguage();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(list || []);
      if (list && list.length > 0 && !activeId) {
        setActiveId(list[0].id);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    base44.agents.getConversation(activeId).then((c) => {
      setMessages(c.messages || []);
      setLoading(false);
    }).catch(() => setLoading(false));

    const unsubscribe = base44.agents.subscribeToConversation(activeId, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [activeId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const newConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: "مراجعة سيرة جديدة", description: "مراجعة وتحسين السيرة الذاتية" },
      });
      setConversations((c) => [conv, ...c]);
      setActiveId(conv.id);
      setMessages([]);
    } catch (e) {
      // ignore
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (!activeId) {
      await newConversation();
    }
    setSending(true);
    setInput("");
    try {
      const conv = conversations.find((c) => c.id === activeId) || await base44.agents.getConversation(activeId);
      await base44.agents.addMessage(conv, { role: "user", content: text });
    } catch (e) {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div dir={dir} className="h-screen bg-[#F5F5F5] flex flex-col overflow-hidden" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="px-5 py-3 flex items-center justify-between gap-3">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>{t("builder.back")}</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#000066] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#D9E830]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">مرشد تحسين السيرة</p>
              <p className="text-[11px] text-slate-400">خبير توظيف سويدي</p>
            </div>
          </div>
          <button onClick={newConversation} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <MessageSquarePlus className="w-4 h-4" />
            <span className="hidden sm:inline">محادثة جديدة</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {conversations.length > 1 && (
          <aside className="hidden md:block w-64 shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-right px-4 py-3 text-sm border-b border-slate-100 transition-colors ${activeId === c.id ? "bg-[#000066]/5 text-[#000066] font-medium" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {c.metadata?.name || "مراجعة سيرة"}
              </button>
            ))}
          </aside>
        )}

        <main className="flex-1 flex flex-col min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#000066]" />
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div className="max-w-md mx-auto text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-[#000066] flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-[#D9E830]" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">مرشد تحسين السيرة الذاتية</h2>
                <p className="text-sm text-slate-500 mb-6">سأساعدك على مراجعة سيرتك ومطابقتها مع متطلبات الوظائف في السوق السويدي.</p>
                <div className="space-y-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => { setInput(ex); }}
                      className="w-full text-right text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#000066] hover:bg-[#000066]/5 transition-colors text-slate-700"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!loading && messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <div className="max-w-3xl mx-auto flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={1}
                placeholder="اكتب طلبك هنا… (مثال: راجع سيرتي واقترح تحسينات)"
                className="flex-1 resize-none border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#000066] focus:ring-2 focus:ring-[#000066]/10 transition-all max-h-32"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="w-11 h-11 shrink-0 rounded-xl bg-[#000066] text-white flex items-center justify-center hover:bg-[#00003d] transition-colors disabled:opacity-40"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}