import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CV_SCHEMA, mergeCV } from "@/lib/cvModel";
import { parseReorderCommand, applyReorder, parseMoveColumnCommand, applyMoveColumn, parseAddCommand, applyAdd, sectionLabelAr } from "@/lib/sectionMover";
import { logAction } from "@/lib/actionLog";
import { useToast } from "@/components/ui/use-toast";
import { Sparkles, X, Send, Loader2, Mic, MicOff } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const EXAMPLES = [
  "أعد صياغة فقرة الخبرة الأولى",
  "أضف مهارة Python بمستوى جيد جداً",
  "انقل قسم التعليم فوق قسم اللغات",
  "اجعل الملف الشخصي أقصر",
];

const AGENT_SCHEMA = {
  type: "object",
  properties: {
    cv: { type: "object", properties: CV_SCHEMA.properties }
  }
};

export default function CVAgent({ open, onClose, data, layout, templateId, onApply }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
    try {
      const currentLayout = layout || { main: [], sidebar: [] };

      // 1) نقل قسم فوق/تحت آخر: تطبيق حتمي
      const reorder = parseReorderCommand(instr);
      if (reorder) {
        const newLayout = applyReorder(currentLayout, reorder);
        const layoutChanged = JSON.stringify(newLayout) !== JSON.stringify(currentLayout);
        onApply({ data, layout: layoutChanged ? newLayout : null });
        logAction("ai_command", { command: instr, layoutChanged: !!layoutChanged, source: reorder.source, target: reorder.target, direction: reorder.direction });
        setInput("");
        onClose();
        toast({
          title: "تم التنفيذ",
          description: layoutChanged
            ? `نقلت «${reorder.source}» ${reorder.direction === "before" ? "فوق" : "تحت"} «${reorder.target}».`
            : "القسم في موضعه بالفعل."
        });
        return;
      }

      // 2) نقل قسم إلى عمود (يمين/يسار): تطبيق حتمي
      const moveCol = parseMoveColumnCommand(instr);
      if (moveCol) {
        const newLayout = applyMoveColumn(currentLayout, moveCol);
        const layoutChanged = JSON.stringify(newLayout) !== JSON.stringify(currentLayout);
        onApply({ data, layout: layoutChanged ? newLayout : null });
        logAction("ai_command", { command: instr, layoutChanged: !!layoutChanged, source: moveCol.source, column: moveCol.column });
        setInput("");
        onClose();
        toast({
          title: "تم التنفيذ",
          description: layoutChanged
            ? `نقلت «${sectionLabelAr(moveCol.source)}» إلى العمود ${moveCol.column === "sidebar" ? "الأيمن" : "الأيسر"}.`
            : "القسم في ذلك العمود بالفعل."
        });
        return;
      }

      // 3) إضافة عنصر إلى قسم: تطبيق حتمي
      const addCmd = parseAddCommand(instr);
      if (addCmd) {
        const newData = applyAdd(data, addCmd);
        onApply({ data: newData, layout: null });
        logAction("ai_command", { command: instr, action: "add", section: addCmd.section });
        setInput("");
        onClose();
        toast({
          title: "تم التنفيذ",
          description: `أضفت عنصرًا جديدًا إلى قسم «${sectionLabelAr(addCmd.section)}».`
        });
        return;
      }

      // 4) تعديل المحتوى النصّي: استدعاء النموذج (لا يلمس الترتيب أبدًا)
      const prompt =
        `Du är en CV-redigeringsassistent. Redigera endast CV-innehållet enligt användarens instruktion.\n\n` +
        `Aktuellt CV (JSON):\n${JSON.stringify(data)}\n\n` +
        `Regler:\n` +
        `- Bevara ALL information — SAMMANFATTA INTE och FÖRKORTA INTE.\n` +
        `- Skriv med en naturlig, mänsklig röst. Undvik AI-klyschor.\n` +
        `- Hitta inte på information. Om något saknas, lämna fältet tomt.\n` +
        `- Returnera giltig JSON med endast "cv" (hela CV-objektet).`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: AGENT_SCHEMA
      });
      const cv = mergeCV(res?.cv || res);
      onApply({ data: cv, layout: null });
      logAction("ai_command", { command: instr });
      setInput("");
      onClose();
      toast({
        title: "تم التنفيذ",
        description: "طبّقت تعليمتك على السيرة."
      });
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
          اكتب تعليمتك بالعربية أو انطقها بصوتك، مثلاً: «أعد صياغة فقرة الخبرة الأولى» أو «أضف مهارة Python» — وسيطبّقها على السيرة مباشرة.
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