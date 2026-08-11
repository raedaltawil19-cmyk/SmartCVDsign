import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CV_SCHEMA, mergeCV } from "@/lib/cvModel";
import { sectionLabelAr } from "@/lib/sectionMover";
import { logAction } from "@/lib/actionLog";
import { useToast } from "@/components/ui/use-toast";
import { Sparkles, X, Send, Loader2, Mic, MicOff, MessageCircle } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const EXAMPLES = [
  "أعد صياغة فقرة الخبرة الأولى",
  "حوّل وصف الخبرة الثانية إلى نقاط",
  "احذف رابط LinkedIn من القسم الأعلى",
  "اجعل الملف الشخصي أقصر",
];

const AGENT_SCHEMA = {
  type: "object",
  properties: {
    cv: { type: "object", properties: CV_SCHEMA.properties },
    layout: {
      type: "object",
      properties: {
        main: { type: "array", items: { type: "string" } },
        sidebar: { type: "array", items: { type: "string" } }
      }
    },
    summary: { type: "string", description: "وصف عربي قصير لما فهمه الوكيل ونفذه" },
    needs_clarification: { type: "string", description: "سؤال توضيحي بالعربية إذا لم يفهم الوكيل الأمر" }
  }
};

export default function CVAgent({ open, onClose, data, layout, templateId, onApply }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clarification, setClarification] = useState("");
  const [lastSummary, setLastSummary] = useState("");
  const { toast } = useToast();
  const { supported: micSupported, listening, interim, toggle: toggleMic, stop: stopMic } = useSpeechRecognition({
    lang: "ar-SA",
    onResult: (text) => setInput(text),
  });

  const send = async () => {
    const instr = input.trim();
    if (!instr || busy) return;
    setBusy(true);
    setError("");
    setClarification("");

    // حفظ الأمر في الخلفية (بدون انتظار) لعدم إعاقة المعالجة
    base44.entities.AgentCommand.create({
      command: instr, action: "none", section: "", status: "pending", intent: {}
    }).catch(() => {});

    try {
      const currentLayout = layout || { main: [], sidebar: [] };

      const layoutContext =
        `Layout (vilka sektioner är i vilka kolumner):\n` +
        `- Vänster kolumn (main): ${currentLayout.main.map(sectionLabelAr).join(", ") || "tom"}\n` +
        `- Höger kolumn (sidebar): ${currentLayout.sidebar.map(sectionLabelAr).join(", ") || "tom"}`;

      const prompt =
        `Du är en CV-redigeringsassistent för den svenska arbetsmarknaden. Användaren skriver instruktioner på arabiska eller svenska. Förstå INstruktionen djupt och agera.\n\n` +
        `CV (JSON): ${JSON.stringify(data)}\n${layoutContext}\n\n` +
        `Instruktion: ${instr}\n\n` +
        `## Viktiga regler för förståelse\n` +
        `- "احذف"/"ta bort" + namn på ett fält (t.ex. LinkedIn, telefon, adress) = TÖM fältet (sätt till ""), INTE ta bort ordet inuti en sträng.\n` +
        `  Exempel: "احذف LinkedIn" → kontakt.linkedin = "" (töm hela fältet, inte ta bort ordet "linkedin" från URL:en).\n` +
        `- "القسم الأعلى"/"toppen"/"الهيدر" = kontakt + namn-området (header). "العمود الجانبي"/"sidebar" = höger kolumn.\n` +
        `- "أعد الصياغة"/"omskriv" = skriv om texten med naturlig svensk röst, bevara all info.\n` +
        `- "حوّل إلى نقاط"/"gör punktlista" = lägg till "• " i början av varje rad i beskrivningen.\n` +
        `- "أقصر"/"förkorta" = korta ner texten men behåll kärnan.\n` +
        `- "أضف"/"lägg till" + erfarenhet/utbildning/färdighet = lägg till en ny tom post i den sektionen.\n` +
        `- "انقل"/"flytta" + sektion + till + kolumn = flytta sektionen till angiven kolumn i layout.\n` +
        `- Bevara ALL info som användaren inte ber om att ändra. Naturlig svensk röst. Hitta inte på info.\n\n` +
        `## Om du inte förstår instruktionen\n` +
        `Om instruktionen är tvetydig eller otydlig, sätt needs_clarification till en kort arabisk fråga.\n` +
        `Exempel: "هل تقصد حذف رابط LinkedIn بالكامل أم تعديله؟"\n\n` +
        `Returnera JSON: { "cv": <hela CV>, "layout": {...}, "summary": "<arabisk beskrivning>", "needs_clarification": "" }.\n` +
        `summary-exempel: "حذفت رابط LinkedIn من قسم التواصل" eller "أعدت صياغة الخبرة الأولى".\n` +
        `Oförändrad layout = samma som input. Om needs_clarification inte är tom, lämna cv oförändrat.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: AGENT_SCHEMA,
        model: "gemini_3_flash",
      });

      // إذا الوكيل لم يفهم وطلب توضيحاً
      if (res?.needs_clarification) {
        setClarification(res.needs_clarification);
        logAction("ai_command", { command: instr, action: "clarification", question: res.needs_clarification });
        setBusy(false);
        return;
      }

      const cv = mergeCV(res?.cv || res, data);
      const newLayout = res?.layout || null;
      const layoutChanged = newLayout && JSON.stringify(newLayout) !== JSON.stringify(currentLayout);
      onApply({ data: cv, layout: layoutChanged ? newLayout : null });

      const summary = res?.summary || "تم تنفيذ تعليمتك";
      setLastSummary(summary);
      logAction("ai_command", { command: instr, action: "content", summary });
      setInput("");
      toast({ title: "تم التنفيذ", description: summary });
    } catch (e) {
      setError("تعذّر تنفيذ التعليمات. حاول مجدداً.");
      logAction("ai_command", { command: instr, error: String(e?.message || e).slice(0, 120) });
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    stopMic();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden" dir="rtl">
      <div className="px-4 py-3 bg-[#1B4FD8] text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="font-medium text-sm">مساعد التعديل الذكي</span>
        </div>
        <button onClick={close} className="text-white/80 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4">
        <p className="text-[12px] text-slate-500 mb-2 leading-relaxed">
          اكتب تعليمتك بالعربية أو انطقها بصوتك — أفهم أي أمر: إعادة صياغة، تحويل لنقاط، توحيد مسافات، إضافة، حذف، تقصير، توازن الأعمدة...
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
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب تعليمتك هنا..."
            rows={3}
            disabled={busy}
            className="w-full text-[13px] leading-relaxed resize-none border border-slate-200 rounded-xl p-3 pl-11 outline-none focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/10 disabled:opacity-50"
          />
          {micSupported && (
            <button
              type="button"
              onClick={() => toggleMic(input)}
              disabled={busy}
              title={listening ? "إيقاف التسجيل" : "تحدث بأمر صوتي"}
              className={`absolute top-2 left-2 w-7 h-7 inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
                listening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          )}
          {listening && interim && (
            <p className="text-[11px] text-slate-400 mt-1 px-1 italic">…{interim}</p>
          )}
        </div>
        {error && <p className="text-[11px] text-red-500 mt-2">{error}</p>}
        {clarification && (
          <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
            <MessageCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[12px] text-amber-800 font-medium mb-0.5">لم أفهم تماماً</p>
              <p className="text-[12px] text-amber-700 leading-relaxed">{clarification}</p>
              <p className="text-[11px] text-amber-600 mt-1">وضّح أكثر ثم اضغط تطبيق.</p>
            </div>
          </div>
        )}
        {lastSummary && !clarification && !busy && (
          <div className="mt-2 p-2.5 rounded-xl bg-green-50 border border-green-200 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
            <p className="text-[12px] text-green-700 leading-relaxed">{lastSummary}</p>
          </div>
        )}
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
  );
}