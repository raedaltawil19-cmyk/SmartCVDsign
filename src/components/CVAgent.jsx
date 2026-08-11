import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CV_SCHEMA, mergeCV } from "@/lib/cvModel";
import { applyReorder, applyMoveColumn, sectionLabelAr } from "@/lib/sectionMover";
import { logAction } from "@/lib/actionLog";
import { useToast } from "@/components/ui/use-toast";
import { Sparkles, X, Send, Loader2, Mic, MicOff } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const EXAMPLES = [
  "أعد صياغة فقرة الخبرة الأولى",
  "حوّل وصف الخبرة الثانية إلى نقاط",
  "وحّد المسافات في العمود الجانبي",
  "اجعل الملف الشخصي أقصر",
];

const AGENT_SCHEMA = {
  type: "object",
  properties: {
    cv: { type: "object", properties: CV_SCHEMA.properties }
  }
};

// مصنف بسيط: هيكلي (نقل أقسام) vs محتوى (كل شيء آخر يترك للـ LLM الذكي)
const INTENT_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["reorder", "move_column", "content"] },
    section: { type: "string", enum: ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"] },
    targetSection: { type: "string", enum: ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"] },
    direction: { type: "string", enum: ["before", "after"] },
    column: { type: "string", enum: ["main", "sidebar"] }
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

    // حفظ الأمر فوراً في قاعدة البيانات (قبل أي معالجة) لضمان تسجيله
    try {
      await base44.entities.AgentCommand.create({
        command: instr,
        action: "none",
        section: "",
        status: "pending",
        intent: {}
      });
    } catch (e) {}

    try {
      const currentLayout = layout || { main: [], sidebar: [] };

      // 1) تصنيف بسيط: هل هذا أمر هيكلي (نقل أقسام) أم أمر محتوى؟
      const classifyPrompt =
        `Du klassificerar en användares instruktion för att redigera ett CV.\n\n` +
        `Avgör om instruktionen gäller:\n` +
        `- "reorder": Flytta en sektion ovanför/under en annan sektion (ändra ordningen). Ange section (den som flyttas), targetSection (referensen), direction ("before"=ovanför, "after"=nedanför).\n` +
        `- "move_column": Flytta en sektion till vänster/höger kolumn. Ange section och column ("main"=vänster, "sidebar"=höger).\n` +
        `- "content": Allt annat — textändringar, formatering, avstånd, lägga till, ta bort, omformulera, punktlistor, förkorta, etc.\n\n` +
        `Sektioner: profil, erfarenhet, utbildning, fardigheter, sprak.\n\n` +
        `Exempel:\n` +
        `- "انقل قسم التعليم فوق قسم اللغات" → action="reorder", section="utbildning", targetSection="sprak", direction="before"\n` +
        `- "انقل المهارات للعمود الأيمن" → action="move_column", section="fardigheter", column="sidebar"\n` +
        `- "أعد صياغة فقرة الخبرة الأولى" → action="content"\n` +
        `- "وحّد المسافات" → action="content"\n` +
        `- "حوّل الوصف إلى نقاط" → action="content"\n` +
        `- "أضف مهارة Python" → action="content"\n\n` +
        `Instruktion: "${instr}"\n\nReturnera giltig JSON.`;

      const intent = await base44.integrations.Core.InvokeLLM({
        prompt: classifyPrompt,
        response_json_schema: INTENT_SCHEMA,
        model: "claude_sonnet_4_6",
      });

      const action = intent?.action || "content";

      // 2) الأوامر الهيكلية: تنفيذ حتمي (الـ LLM لا يلمس الهيكل)
      if (action === "reorder" && intent.section && intent.targetSection && intent.direction) {
        const newLayout = applyReorder(currentLayout, {
          source: intent.section, target: intent.targetSection, direction: intent.direction
        });
        const layoutChanged = JSON.stringify(newLayout) !== JSON.stringify(currentLayout);
        onApply({ data, layout: layoutChanged ? newLayout : null });
        logAction("ai_command", { command: instr, action: "reorder", source: intent.section, target: intent.targetSection, direction: intent.direction });
        setInput(""); onClose();
        toast({
          title: "تم التنفيذ",
          description: layoutChanged
            ? `نقلت «${sectionLabelAr(intent.section)}» ${intent.direction === "before" ? "فوق" : "تحت"} «${sectionLabelAr(intent.targetSection)}».`
            : "القسم في موضعه بالفعل."
        });
        return;
      }

      if (action === "move_column" && intent.section && intent.column) {
        const newLayout = applyMoveColumn(currentLayout, { source: intent.section, column: intent.column });
        const layoutChanged = JSON.stringify(newLayout) !== JSON.stringify(currentLayout);
        onApply({ data, layout: layoutChanged ? newLayout : null });
        logAction("ai_command", { command: instr, action: "move_column", source: intent.section, column: intent.column });
        setInput(""); onClose();
        toast({
          title: "تم التنفيذ",
          description: layoutChanged
            ? `نقلت «${sectionLabelAr(intent.section)}» إلى العمود ${intent.column === "sidebar" ? "الأيمن" : "الأيسر"}.`
            : "القسم في ذلك العمود بالفعل."
        });
        return;
      }

      // 3) كل شيء آخر: LLM ذكي يفهم نية المستخدم ويعدّل المحتوى بسياق كامل
      const layoutContext =
        `Layout (vilka sektioner är i vilka kolumner):\n` +
        `- Vänster kolumn (main): ${currentLayout.main.map(sectionLabelAr).join(", ") || "tom"}\n` +
        `- Höger kolumn (sidebar): ${currentLayout.sidebar.map(sectionLabelAr).join(", ") || "tom"}`;

      const editPrompt =
        `Du är en extremt intelligent CV-redigeringsassistent för den svenska arbetsmarknaden. ` +
        `Du förstår användarens instruktioner på arabiska eller svenska i kontexten av CV-design, ` +
        `layout, visuella avstånd och bästa praxis för ATS-vänliga CV:n.\n\n` +
        `Aktuellt CV (JSON):\n${JSON.stringify(data)}\n\n` +
        `${layoutContext}\n\n` +
        `Användarens instruktion: ${instr}\n\n` +
        `Dina förmågor (förstå användarens avsikt och agera därefter):\n` +
        `- Omskrivning: formulera om text mer professionellt och naturligt på svenska.\n` +
        `- Förkorta/förläng: gör text mer koncis eller mer detaljerad.\n` +
        `- Punktlista: dela upp långa stycken i konkreta, korta punkter (använd "• " i början av varje rad).\n` +
        `- Avstånd: justera textlängder så att sektioner ser visuellt balanserade och enhetliga ut.\n` +
        `- Lägg till: lägg till nya poster i rätt sektion med rätt format och naturlig svensk text.\n` +
        `- Ta bort: ta bort specifika poster om användaren ber om det.\n` +
        `- Flytta innehåll: flytta information mellan sektioner om det passar bättre.\n` +
        `- Balansera kolumner: justera innehåll så att vänster och höger kolumn ser balanserade ut.\n` +
        `- Formatering: ändra radbrytningar, indrag, och struktur för bättre läsbarhet.\n\n` +
        `Regler:\n` +
        `- Bevara ALL information — SAMMANFATTA INTE eller FÖRKORTA INTE om användaren inte uttryckligen ber om det.\n` +
        `- Skriv med en naturlig, mänsklig röst på svenska. Undvik AI-klyschor och formella floskler.\n` +
        `- Hitta inte på information. Om något saknas, lämna fältet tomt.\n` +
        `- Ändra INTE strukturen (sektionsordning eller kolumnplacering) — det hanteras separat.\n` +
        `- För punktlistor: använd "• " i början av varje punkt i beskrivningsfältet.\n` +
        `- Returnera giltig JSON med endast "cv" (hela CV-objektet).`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: editPrompt,
        response_json_schema: AGENT_SCHEMA,
        model: "claude_sonnet_4_6",
      });
      const cv = mergeCV(res?.cv || res);
      onApply({ data: cv, layout: null });
      logAction("ai_command", { command: instr, action: "content" });
      setInput(""); onClose();
      toast({ title: "تم التنفيذ", description: "طبّقت تعليمتك على السيرة بذكاء." });
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