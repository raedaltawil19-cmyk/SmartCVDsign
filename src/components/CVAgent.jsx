import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CV_SCHEMA, mergeCV } from "@/lib/cvModel";
import { sectionLabelAr } from "@/lib/sectionMover";
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

      // استدعاء واحد فقط: LLM ذكي يفهم الأمر وينفذه — محتوى و/أو هيكل دفعة واحدة
      const layoutContext =
        `Layout (vilka sektioner är i vilka kolumner):\n` +
        `- Vänster kolumn (main): ${currentLayout.main.map(sectionLabelAr).join(", ") || "tom"}\n` +
        `- Höger kolumn (sidebar): ${currentLayout.sidebar.map(sectionLabelAr).join(", ") || "tom"}`;

      const prompt =
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
        `- Flytta sektion: om användaren ber att flytta en sektion till en annan kolumn eller ovanför/under en annan sektion, ändra "layout" (main/sidebar-ordning) och lämna "cv" oförändrat.\n` +
        `- Flytta innehåll: flytta information mellan sektioner om det passar bättre.\n` +
        `- Balansera kolumner: justera innehåll så att vänster och höger kolumn ser balanserade ut.\n` +
        `- Formatering: ändra radbrytningar, indrag, och struktur för bättre läsbarhet.\n\n` +
        `Regler:\n` +
        `- Bevara ALL information — SAMMANFATTA INTE eller FÖRKORTA INTE om användaren inte uttryckligen ber om det.\n` +
        `- Skriv med en naturlig, mänsklig röst på svenska. Undvik AI-klyschor och formella floskler.\n` +
        `- Hitta inte på information. Om något saknas, lämna fältet tomt.\n` +
        `- För punktlistor: använd "• " i början av varje punkt i beskrivningsfältet.\n` +
        `- Sektioner som kan förekomma i layout: profil, erfarenhet, utbildning, fardigheter, sprak.\n` +
        `- Returnera giltig JSON med "cv" (hela CV-objektet) och "layout" (main+sidebar arrayer). ` +
        `Om layout inte ska ändras, returnera samma layout som input.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: AGENT_SCHEMA,
        model: "claude_sonnet_4_6",
      });

      const cv = mergeCV(res?.cv || res);
      const newLayout = res?.layout || null;
      const layoutChanged = newLayout && JSON.stringify(newLayout) !== JSON.stringify(currentLayout);
      onApply({ data: cv, layout: layoutChanged ? newLayout : null });
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