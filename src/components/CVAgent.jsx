import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CV_SCHEMA, mergeCV, normalizeLayout, SECTIONS } from "@/lib/cvModel";
import { parseReorderCommand, applyReorder } from "@/lib/sectionMover";
import { logAction } from "@/lib/actionLog";
import { useToast } from "@/components/ui/use-toast";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

const EXAMPLES = [
  "أعد صياغة فقرة الخبرة الأولى",
  "أضف مهارة Python بمستوى جيد جداً",
  "انقل قسم التعليم فوق قسم اللغات",
  "اجعل الملف الشخصي أقصر",
];

const SECTION_KEYS = SECTIONS.map((s) => s.key).join(", ");

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
    }
  }
};

export default function CVAgent({ open, onClose, data, layout, templateId, onApply }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const send = async () => {
    const instr = input.trim();
    if (!instr || busy) return;
    setBusy(true);
    setError("");
    try {
      const currentLayout = layout || { main: [], sidebar: [] };

      // 1) أوامر إعادة الترتيب: تطبيق حتمي (بدون LLM) لضمان التنفيذ الفعلي
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

      // 2) تعديل المحتوى: استدعاء النموذج
      const prompt =
        `Du är en CV-redigeringsassistent. Du kan BOTH redigera CV-innehåll AND ordna om avsnitten.\n\n` +
        `Aktuellt CV (JSON):\n${JSON.stringify(data)}\n\n` +
        `Aktuell layout (ordning på avsnitt i kolumner):\n` +
        `main: [${currentLayout.main.join(", ")}]\n` +
        `sidebar: [${currentLayout.sidebar.join(", ")}]\n\n` +
        `Tillgängliga avsnittsnycklar: ${SECTION_KEYS}.\n` +
        `Avsnittsordningen styrs av "layout", inte av CV-data. Varje avsnitt får finnas EXAKT EN gång (i main ELLER sidebar, aldrig i båda). Bevara alla fem avsnitten.\n\n` +
        `Hur man flyttar ett avsnitt (t.ex. "flytta utbildning ovanför språk" / "انقل التعليم فوق اللغات"):\n` +
        `1. Ta bort käll-avsnittet (utbildning) från dess nuvarande plats.\n` +
        `2. Leta upp mål-avsnittets (språk) kolumn och position.\n` +
        `3. Sätt in käll-avsnittet direkt FÖRE mål-avsnittet i mål-avsnittets kolumn.\n` +
        `   Om käll- och mål-avsnitten ligger i olika kolumner, flyttas käll-avsnittet till mål-avsnittets kolumn.\n` +
        `Resultatet: käll-avsnittet hamnar ovanför mål-avsnittet i samma kolumn.\n\n` +
        `Regler:\n` +
        `- Ändra bara layout om instruktionen uttryckligen handlar om att flytta/ordna/flytta upp/ned ett avsnitt. Annars returnera layout oförändrad.\n` +
        `- Behåll samma kolumnuppdelning om användaren inte ber om att flytta mellan kolumner.\n` +
        `- För text/innehåll-ändringar, tillämpa på "cv". Bevara all information — SAMMANFATTA INTE och FÖRKORTA INTE.\n` +
        `- Returnera giltig JSON med "cv" (hela CV:t) och "layout" (kolumnordning med alla fem avsnitten exakt en gång).`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: AGENT_SCHEMA
      });
      const cv = mergeCV(res?.cv || res);
      const rawLayout = res?.layout && (res.layout.main || res.layout.sidebar)
        ? res.layout
        : null;
      const newLayout = rawLayout ? normalizeLayout(rawLayout, templateId) : null;
      const layoutChanged = newLayout && JSON.stringify(newLayout) !== JSON.stringify(currentLayout);
      onApply({ data: cv, layout: layoutChanged ? newLayout : null });
      logAction("ai_command", { command: instr, layoutChanged: !!layoutChanged });
      setInput("");
      onClose();
      toast({
        title: "تم التنفيذ",
        description: layoutChanged ? "طبّقت تعليمتك وحدّثت ترتيب الأقسام." : "طبّقت تعليمتك على السيرة."
      });
    } catch (e) {
      setError("تعذّر تنفيذ التعليمات. حاول مجدداً.");
      logAction("ai_command", { command: instr, error: String(e?.message || e).slice(0, 120) });
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden" dir="rtl">
      <div className="px-4 py-3 bg-[#1B4FD8] text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="font-medium text-sm">مساعد التعديل الذكي</span>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          <X className="w-4 h-4" />
        </button>
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
  );
}