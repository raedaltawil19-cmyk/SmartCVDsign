import { useState, useRef, useEffect } from "react";
import { runCVAgent } from "@/lib/agent/cvAgent";
import { Loader2, Send, Eye } from "lucide-react";
import UnderstandingResult from "./UnderstandingResult";

export default function AgentChatPanel({ data, layout = null, templateId = null, onChange, allowEdits = true, disabled }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const lastRefRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const send = async (e) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await runCVAgent({
        data,
        layout,
        templateId,
        message,
        history,
        lastItemRef: lastRefRef.current,
        allowEdits: allowEdits && !!onChange
      });
      lastRefRef.current = res.lastItemRef;
      if (res.change && onChange) onChange({ data: res.change.data, layout: res.change.layout });
      setMessages((m) => [...m, { role: "assistant", content: res.reply, internal: res.internal }]);
    } catch (err) {
      // نُظهر الخطأ التقني الحقيقي بدل رسالة عامة تخفي السبب
      console.error("[cvAgent] failed:", err);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `تعذّر تنفيذ الأمر: ${err?.message || err}` }
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white flex flex-col h-[520px]">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-slate-800">
          {allowEdits && onChange ? "مساعد السيرة" : "مساعد السيرة — قراءة فقط"}
        </div>
        <button onClick={() => setShowDebug((v) => !v)} className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border ${showDebug ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-500"}`}>
          <Eye className="w-3.5 h-3.5" /> تفاصيل الفهم
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-[13px] text-slate-400">اسأل عن أي شيء في سيرتك — مثال: «وين خبرة Arbetsförmedlingen؟»</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-start" : "flex justify-end"}>
            <div className="max-w-[85%] space-y-1.5">
              <div className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${m.role === "user" ? "bg-[#000066] text-white" : "bg-slate-100 text-slate-800"}`}>
                {m.content}
              </div>
              {showDebug && m.internal && (
                <UnderstandingResult
                  result={{
                    intent: m.internal.intent,
                    target: m.internal.targetId ? { ref: m.internal.targetId, field: m.internal.field } : null,
                    modifiers: m.internal.modifiers,
                    confidence: m.internal.confidence,
                    resolution: m.internal.resolution,
                    understanding: m.internal.reasoning_summary
                  }}
                />
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-end">
            <div className="px-3 py-2 rounded-2xl bg-slate-100 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="p-3 border-t border-slate-100 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? "حمّل سيرة أولاً..." : "اكتب رسالتك..."}
          className="inp flex-1"
        />
        <button disabled={disabled || busy} className="w-10 h-10 rounded-xl bg-[#000066] text-white flex items-center justify-center disabled:opacity-40">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}