import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import MessageBubble from "@/components/agent/MessageBubble";
import { Send, Loader2, X, Sparkles } from "lucide-react";

const MARK = "<<<CV_CONTEXT";
const strip = (m) => ({ ...m, content: String(m.content || "").split(MARK)[0].trim() });

/**
 * Smart CV Assistant — واجهة محادثة للقراءة فقط (المرحلة 1).
 * ترسل السيرة الحالية (cvModel + template + layout) كسياق مع كل رسالة،
 * فتكون إجابات الوكيل مبنية على السيرة المعروضة فعلاً لا على شكلها البصري.
 */
export default function SmartCVAssistantPanel({ data, layout, templateId, cvId, onClose }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const ctxRef = useRef({ data, layout, templateId, cvId });
  ctxRef.current = { data, layout, templateId, cvId };

  useEffect(() => {
    (async () => {
      const conv = await base44.agents.createConversation({
        agent_name: "smart_cv_assistant",
        metadata: { name: "Smart CV Assistant", description: "قراءة وفهم السيرة الحالية" }
      });
      setConversation(conv);
    })();
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (d) => {
      setMessages(d.messages || []);
      setSending(false);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !conversation || sending) return;
    const { data: d, layout: l, templateId: t, cvId: id } = ctxRef.current;
    setInput("");
    setSending(true);
    await base44.agents.addMessage(conversation, {
      role: "user",
      content: `${text}\n\n${MARK}\n${JSON.stringify({ cvId: id, templateId: t, layout: l, CV_DATA: d })}\nCV_CONTEXT>>>`
    });
  };

  return (
    <div dir="rtl" className="flex flex-col h-[460px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200">
        <Sparkles className="w-4 h-4 text-[#000066]" />
        <span className="text-sm font-semibold text-slate-800">مساعد السيرة</span>
        <span className="text-[10px] text-slate-400">قراءة فقط</span>
        <button onClick={onClose} className="mr-auto text-slate-400 hover:text-slate-700 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-slate-400 text-center pt-8 leading-relaxed">
            اسألني عن أي شيء في سيرتك.<br />مثال: «شو آخر خبرة عندي؟» أو «شو رقم التلفون؟»
          </p>
        )}
        {messages.map((m, i) => <MessageBubble key={i} message={strip(m)} />)}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="shrink-0 flex items-center gap-2 p-3 bg-white border-t border-slate-200">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={conversation ? "اكتب سؤالك…" : "جارٍ التهيئة…"}
          disabled={!conversation}
          className="inp"
        />
        <button
          type="submit"
          disabled={!conversation || sending || !input.trim()}
          className="shrink-0 w-9 h-9 rounded-xl bg-[#000066] text-white grid place-items-center disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}