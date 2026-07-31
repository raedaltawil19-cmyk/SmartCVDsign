import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CV_SCHEMA, mergeCV } from "@/lib/cvModel";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

const EXAMPLES = [
  "أعد صياغة فقرة الخبرة الأولى",
  "أضف مهارة Python بمستوى جيد جداً",
  "امسح آخر خبرة",
  "اجعل الملف الشخصي أقصر",
];

export default function CVAgent({ data, onApply }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    const instr = input.trim();
    if (!instr || busy) return;
    setBusy(true);
    setError("");
    try {
      const prompt = `Du är en CV-redigeringsassistent. Här är det aktuella CV:t som JSON:\n${JSON.stringify(data)}\n\nAnvändarens instruktion (kan vara på arabiska eller annat språk — förstå och tillämpa den på CV:t, alla CV-fält förblir på svenska): "${instr}".\n\nTillämpa instruktionen exakt. Bevara all annan information oförändrad om instruktionen inte uttryckligen säger annat. SAMMANFATTA INTE och FÖRKORTA INTE — behåll fullständigt innehåll. Returnera hela det uppdaterade CV:t som giltig JSON enligt schemat.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: CV_SCHEMA
      });
      onApply(mergeCV(res));
      setInput("");
      setOpen(false);
    } catch (e) {
      setError("تعذّر تنفيذ التعليمات. حاول مجدداً.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="no-print fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-[#1B4FD8] text-white shadow-lg shadow-[#1B4FD8]/30 flex items-center justify-center hover:bg-[#1640b0] transition-colors"
        title="مساعد التعديل الذكي"
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="no-print fixed bottom-24 left-6 z-40 w-[340px] max-w-[calc(100vw-3rem)] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden" dir="rtl">
          <div className="px-4 py-3 bg-[#1B4FD8] text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium text-sm">مساعد التعديل الذكي</span>
          </div>
          <div className="p-4">
            <p className="text-[12px] text-slate-500 mb-2 leading-relaxed">
              اكتب تعليمتك بالعربية، مثلاً: «أعد صياغة فقرة الخبرة الأولى» أو «أضف مهارة Python» — وسيطبّقها على السيرة مباشرة.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-[#1B4FD8] hover:text-[#1B4FD8] transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب تعليمتك هنا..."
              rows={3}
              disabled={busy}
              className="w-full text-[13px] leading-relaxed resize-none border border-slate-200 rounded-xl p-3 outline-none focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/10 disabled:opacity-50"
            />
            {error && <p className="text-[11px] text-red-500 mt-2">{error}</p>}
            <button
              onClick={send}
              disabled={!input.trim() || busy}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#1640b0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {busy ? "جارٍ التنفيذ..." : "تطبيق"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}