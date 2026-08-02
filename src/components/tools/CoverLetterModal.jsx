import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import CoverLetterTemplate from "./CoverLetterTemplate";
import { X, Loader2, Download, Mail } from "lucide-react";

const CL_SCHEMA = {
  type: "object",
  properties: {
    rubrik: { type: "string" },
    text: { type: "string" }
  }
};

export default function CoverLetterModal({ data, onClose }) {
  const { toast } = useToast();
  const [ad, setAd] = useState("");
  const [busy, setBusy] = useState(false);
  const [letter, setLetter] = useState(null);
  const [scale, setScale] = useState(0.7);

  const generate = async () => {
    setBusy(true);
    try {
      const prompt = `Skriv ett personligt brev på svenska baserat på följande CV (JSON):\n${JSON.stringify(data)}\n${ad ? `\nAnpassa brevet mot denna jobbannons:\n"""\n${ad}\n"""` : "Skriv ett generellt, professionellt brev."}\n\nBrevet ska vara varmt och mänskligt — inte stelt, utan AI-klyschor (undvik "passionerad", "mångsidig", "resultatorienterad"). 3–4 stycken i löpande form. Börja med rubriken "Personligt brev". Skilj stycken med dubbla radbrytningar (\\n\\n). Returnera JSON enligt schemat.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: CL_SCHEMA });
      setLetter(res);
    } catch (e) {
      toast({ title: "Kunde inte skapa brevet", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const print = () => {
    document.body.classList.add("cl-mode");
    const after = () => {
      document.body.classList.remove("cl-mode");
      window.removeEventListener("afterprint", after);
    };
    window.addEventListener("afterprint", after);
    setTimeout(() => window.print(), 80);
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 no-print">
        <span className="font-medium text-slate-900 inline-flex items-center gap-2"><Mail className="w-4 h-4 text-[#1B4FD8]" /> رسالة مقدمة (Personligt brev)</span>
        <div className="flex items-center gap-2">
          {letter && (
            <button onClick={print} className="no-print inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#1B4FD8] text-white hover:bg-[#1640b0] transition-colors">
              <Download className="w-4 h-4" /><span>تنزيل PDF</span>
            </button>
          )}
          <button onClick={onClose} className="no-print inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"><X className="w-4 h-4" /><span>إغلاق</span></button>
        </div>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="no-print w-[320px] shrink-0 border-l border-slate-200 bg-white p-5 flex flex-col">
          <label className="text-sm font-medium text-slate-700 mb-2">الصق إعلان الوظيفة (اختياري)</label>
          <textarea
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            rows={10}
            placeholder="Klistra in annonsen för att anpassa brevet — lämna tomt för ett generellt brev."
            className="flex-1 w-full text-[13px] leading-relaxed resize-none border border-slate-200 rounded-xl p-3 outline-none focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/10"
          />
          <button
            onClick={generate}
            disabled={busy}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#1640b0] transition-colors disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {busy ? "جارٍ الكتابة..." : letter ? "أعد الكتابة" : "اكتب الرسالة"}
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-slate-100 flex flex-col items-center">
          {!letter && !busy && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
              <Mail className="w-10 h-10 mb-3 opacity-40" />
              ستظهر الرسالة هنا
            </div>
          )}
          {busy && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B4FD8]" />
              <span className="text-sm">نكتب رسالتك...</span>
            </div>
          )}
          {letter && (
            <div style={{ width: 794 * scale }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 794, height: 1123 * scale }}>
                <CoverLetterTemplate data={data} letter={letter} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}