import { useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Linkedin, Upload, X, Plus, Loader2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useServices } from "@/hooks/useServices";

export default function AddCVSourceSheet({ currentCV, onApply, onClose }) {
  const { llm } = useServices();
  const [text, setText] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [linkedinText, setLinkedinText] = useState("");
  const [linkedinFile, setLinkedinFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const hasSource = text.trim() || cvFile || linkedinText.trim() || linkedinFile;

  const create = async () => {
    if (!hasSource || busy) return;
    setBusy(true);
    setError("");
    try {
      let fileUrl = null;
      let linkedinFileUrl = null;
      if (cvFile) fileUrl = (await base44.integrations.Core.UploadFile({ file: cvFile })).file_url;
      if (linkedinFile) linkedinFileUrl = (await base44.integrations.Core.UploadFile({ file: linkedinFile })).file_url;
      const result = await llm.aggregateCVSources({
        text,
        fileUrl,
        linkedinText,
        linkedinFileUrl,
        baseCV: currentCV && (currentCV.namn || currentCV.titel || currentCV.erfarenhet?.length) ? currentCV : undefined,
      });
      onApply(result);
      onClose();
    } catch (e) {
      setError("تعذّر جمع المصادر. جرّب مرة أخرى.");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[2147483000] bg-slate-950/35 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <div className="w-full sm:max-w-xl bg-white rounded-t-[28px] sm:rounded-[24px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 grid place-items-center"><Plus className="w-5 h-5 text-slate-800" /></div>
          <div className="min-w-0"><h2 className="font-semibold text-base text-slate-900">إضافة معلومات إلى السيرة</h2><p className="text-xs text-slate-500 mt-0.5">يمكنك استخدام مصدر واحد أو جمع المصادر الثلاثة معًا.</p></div>
          <button onClick={onClose} className="mr-auto w-10 h-10 rounded-full hover:bg-slate-100 grid place-items-center" aria-label="إغلاق"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-slate-700" /><h3 className="font-medium text-sm">لصق نص CV</h3></div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="الصق نص السيرة هنا…" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300" />
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2"><Upload className="w-4 h-4 text-slate-700" /><h3 className="font-medium text-sm">رفع ملف CV</h3></div>
            <label className="min-h-16 rounded-xl border border-dashed border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer px-3 text-sm text-slate-600">
              <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
              {cvFile ? <><Check className="w-4 h-4 text-green-600" />{cvFile.name}</> : <>اختر PDF أو DOC أو DOCX أو TXT</>}
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2"><Linkedin className="w-4 h-4 text-[#0A66C2]" /><h3 className="font-medium text-sm">استيراد من LinkedIn</h3></div>
            <textarea value={linkedinText} onChange={(e) => setLinkedinText(e.target.value)} rows={3} placeholder="الصق محتوى LinkedIn هنا…" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300 mb-2" />
            <label className="min-h-12 rounded-xl border border-dashed border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer px-3 text-xs text-slate-600">
              <input type="file" accept=".pdf,.txt" className="hidden" onChange={(e) => setLinkedinFile(e.target.files?.[0] || null)} />
              {linkedinFile ? <><Check className="w-4 h-4 text-green-600" />{linkedinFile.name}</> : <>أو ارفع ملف LinkedIn</>}
            </label>
          </section>

          {error && <div className="rounded-xl bg-red-50 text-red-700 px-3 py-2.5 text-sm">{error}</div>}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3 bg-slate-50/80">
          <p className="text-[11px] text-slate-500 flex-1">سيتم جمع المصادر وتصنيفها في CV واحد. لا يتم حل التعارضات بصمت في مرحلة الجمع.</p>
          <button onClick={create} disabled={!hasSource || busy} className="min-h-11 px-5 rounded-full bg-slate-900 text-white font-semibold text-sm disabled:opacity-40 inline-flex items-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {busy ? "جارٍ إنشاء السيرة…" : "إنشاء CV"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
