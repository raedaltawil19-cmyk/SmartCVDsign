import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CV_SCHEMA, mergeCV } from "@/lib/cvModel";
import { applyReorder, applyMoveColumn, applyAdd, sectionLabelAr } from "@/lib/sectionMover";
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

const INTENT_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["add", "reorder", "move_column", "edit_content", "format", "none"] },
    section: { type: "string", enum: ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"] },
    value: { type: "string" },
    items: { type: "array", items: { type: "string" } },
    targetSection: { type: "string", enum: ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"] },
    direction: { type: "string", enum: ["before", "after"] },
    column: { type: "string", enum: ["main", "sidebar"] },
    formatInstruction: { type: "string", description: "Detaljerad beskrivning av önskad formateringsändring" }
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

      // 1) LLM يفهم نية الأمر أولاً (تصنيف حتمي آمن)
      const classifyPrompt =
        `Du tolkar en användares instruktion för att redigera ett CV. Avgör vilken åtgärd användaren vill göra.\n\n` +
        `Möjliga åtgärder:\n` +
        `- "add": Lägg till en eller flera poster i en sektion.\n` +
        `  - För EN post: sätt value = titeln/namnet.\n` +
        `  - För FLERA poster (t.ex. en lista med kurser under en rubrik): sätt items = ["rubrik", "post1", "post2", ...] och lämna value tom. Varje post blir en separat rad.\n` +
        `  - Ta BORT instruktionsord som "عنوان", "فرعي", "باسم", "rubrik" från värdena.\n` +
        `- "reorder": Flytta en sektion ovanför/under en annan sektion. Ange section (den som flyttas), targetSection (referensen), direction ("before"=ovanför, "after"=nedanför).\n` +
        `- "move_column": Flytta en sektion till vänster/höger kolumn. Ange section och column ("main"=vänster, "sidebar"=höger).\n` +
        `- "edit_content": Ändra själva texten/innehållet (t.ex. "skriv om profil", "gör texten kortare", "förbättra beskrivningen").\n` +
        `- "format": Justera visuell formatering — avstånd, marginaler, radbrytningar, balansera kolumner. Sätt formatInstruction = användarens exakta önskemål. Exempel: "المسافات غير موحدة", "وحّد المسافات", "اضبط الهوامش", "العمود غير متوازن".\n` +
        `- "none": Inte relaterat till CV-redigering.\n\n` +
        `Sektioner: profil, erfarenhet, utbildning, fardigheter, sprak.\n\n` +
        `Exempel:\n` +
        `- "أضف عنوان فرعي باسم tjänsteutbildningar تحت بند utbildning" → action="add", section="utbildning", value="tjänsteutbildningar"\n` +
        `- "تحت عنوان tjänsteutbildningar ضع الدورات: Motiverande samtal, kundbemötande, prioritera rätt" → action="add", section="utbildning", items=["tjänsteutbildningar", "Motiverande samtal", "kundbemötande", "prioritera rätt"]\n` +
        `- "انقل قسم التعليم فوق قسم اللغات" → action="reorder", section="utbildning", targetSection="sprak", direction="before"\n` +
        `- "أعد صياغة فقرة الخبرة الأولى" → action="edit_content"\n\n` +
        `Instruktion: "${instr}"\n\nReturnera giltig JSON.`;

      const intent = await base44.integrations.Core.InvokeLLM({
        prompt: classifyPrompt,
        response_json_schema: INTENT_SCHEMA,
        model: "claude_sonnet_4_6",
      });

      const action = intent?.action || "none";

      // 2) تطبيق حتمي بناءً على النية المفهومة (الـ LLM لا يلمس الهيكل أبداً)

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

      if (action === "add" && intent.section && intent.section !== "profil") {
        const items = Array.isArray(intent.items) ? intent.items.map(i => (i || "").trim()).filter(Boolean) : [];
        const namn = (intent.value || "").trim();
        const newData = applyAdd(data, { section: intent.section, namn, namnList: items });
        onApply({ data: newData, layout: null });
        logAction("ai_command", { command: instr, action: "add", section: intent.section, namn, namnList: items });
        setInput(""); onClose();
        const count = items.length || (namn ? 1 : 0);
        toast({
          title: "تم التنفيذ",
          description: count > 1
            ? `أضفت ${count} عناصر إلى قسم «${sectionLabelAr(intent.section)}».`
            : (namn || items[0])
              ? `أضفت «${namn || items[0]}» إلى قسم «${sectionLabelAr(intent.section)}».`
              : `أضفت عنصرًا جديدًا إلى قسم «${sectionLabelAr(intent.section)}».`
        });
        return;
      }

      if (action === "edit_content") {
        const editPrompt =
          `Du är en CV-redigeringsassistent. Redigera endast CV-innehållet enligt användarens instruktion.\n\n` +
          `Aktuellt CV (JSON):\n${JSON.stringify(data)}\n\n` +
          `Instruktion: ${instr}\n\n` +
          `Regler:\n` +
          `- Bevara ALL information — SAMMANFATTA INTE och FÖRKORTA INTE.\n` +
          `- Skriv med en naturlig, mänsklig röst. Undvik AI-klyschor.\n` +
          `- Hitta inte på information. Om något saknas, lämna fältet tomt.\n` +
          `- Returnera giltig JSON med endast "cv" (hela CV-objektet).`;
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: editPrompt,
          response_json_schema: AGENT_SCHEMA
        });
        const cv = mergeCV(res?.cv || res);
        onApply({ data: cv, layout: null });
        logAction("ai_command", { command: instr, action: "edit_content" });
        setInput(""); onClose();
        toast({ title: "تم التنفيذ", description: "طبّقت تعليمتك على السيرة." });
        return;
      }

      if (action === "format") {
        const fmtInstruction = intent?.formatInstruction || instr;
        const fmtPrompt =
          `Du är en CV-formateringsassistent. Användaren vill justera visuell formatering av sitt CV.\n\n` +
          `Aktuellt CV (JSON):\n${JSON.stringify(data)}\n\n` +
          `Användarens önskemål: ${fmtInstruction}\n\n` +
          `Regler:\n` +
          `- Bevara ALL information — SAMMANFATTA INTE och FÖRKORTA INTE.\n` +
          `- För att förbättra visuell balans: justera textlängder, lägg till/ta bort tomma rader, eller flytta innehåll mellan sektioner.\n` +
          `- Om avstånden är ojämna: gör texterna mer enhetliga i längd så att sektionerna ser balanserade ut.\n` +
          `- Skriv med en naturlig, mänsklig röst.\n` +
          `- Returnera giltig JSON med endast "cv" (hela CV-objektet).`;
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: fmtPrompt,
          response_json_schema: AGENT_SCHEMA
        });
        const cv = mergeCV(res?.cv || res);
        onApply({ data: cv, layout: null });
        logAction("ai_command", { command: instr, action: "format", formatInstruction: fmtInstruction });
        setInput(""); onClose();
        toast({ title: "تم التنفيذ", description: "طبّقت تعديلات التنسيق على السيرة." });
        return;
      }

      // action === "none" أو غير مفهوم
      setError("لم أتعرف على تعليمتك بوضوح. حاول صياغتها بطريقة أخرى.");
      logAction("ai_command", { command: instr, action: "none" });
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