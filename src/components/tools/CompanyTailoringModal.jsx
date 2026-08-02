import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import { mergeCV } from "@/lib/cvModel";
import { X, Loader2, Building2, Scale, Sparkles, ArrowRight, Check, Globe, FileText, Tag, Lightbulb, Hash } from "lucide-react";

const SECTION_LABELS = {
  titel: "العنوان المهني",
  profil: "النبذة المهنية",
  fardigheter: "المهارات",
  erfarenhet: "الخبرات",
  utbildning: "التعليم",
  sprak: "اللغات",
};

export default function CompanyTailoringModal({ data, onApply, onClose }) {
  const { toast } = useToast();
  const { llm } = useServices();
  const [company, setCompany] = useState("");
  const [job, setJob] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [applying, setApplying] = useState(false);

  const run = async () => {
    if (!company.trim()) { toast({ title: "أدخل اسم الشركة", variant: "destructive" }); return; }
    setBusy(true); setResult(null);
    try {
      const res = await llm.tailorCompany({ data, companyName: company.trim(), jobDescription: job.trim() });
      setResult(res);
    } catch (e) {
      toast({ title: "تعذّر تحليل الشركة", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!result?.cv) return;
    setApplying(true);
    try {
      onApply(mergeCV(result.cv));
      toast({ title: "تم تخصيص سيرتك للشركة" });
      onClose();
    } finally {
      setApplying(false);
    }
  };

  const culture = result?.culture || {};
  const changes = result?.changes || [];

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <span className="font-medium text-slate-900 inline-flex items-center gap-2">
          <Scale className="w-4 h-4 text-[#1B4FD8]" /> تخصيص السيرة للشركة
        </span>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          <X className="w-4 h-4" /><span>إغلاق</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-100">
        <div className="max-w-2xl mx-auto space-y-5">
          {!result && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="rounded-xl bg-[#1B4FD8]/5 border border-[#1B4FD8]/15 p-3 text-[12px] text-slate-600 leading-relaxed flex gap-2">
                <Lightbulb className="w-4 h-4 text-[#1B4FD8] shrink-0 mt-0.5" />
                <span>نحلّل ثقافة الشركة من مصادرها العامة، ثم نعيد صياغة سيرتك — النبذة والمهارات والإنجازات والكلمات المفتاحية والنبرة — لتناسبها، مع شرح كل تعديل.</span>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block inline-flex items-center gap-1.5"><Building2 className="w-4 h-4 text-slate-400" /> اسم الشركة</label>
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="مثال: Spotify, IKEA, Klarna"
                  className="w-full text-[14px] border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#1B4FD8]" />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block inline-flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-400" /> وصف الوظيفة (اختياري لكن موصى به)</label>
                <textarea value={job} onChange={(e) => setJob(e.target.value)} rows={6}
                  placeholder="الصق نص إعلان الوظيفة هنا لتخصيص أدق..."
                  className="w-full text-[13px] leading-relaxed border border-slate-200 rounded-xl p-3 outline-none focus:border-[#1B4FD8] resize-none" />
              </div>

              <button onClick={run} disabled={busy} className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#0f3db0] disabled:opacity-40">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
                {busy ? "نحلّل الثقافة ونخصّص السيرة..." : "حلّل وخصّص"}
              </button>
            </div>
          )}

          {busy && !result && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B4FD8]" />
              <span className="text-sm">نبحث في ثقافة الشركة ونعيد صياغة سيرتك...</span>
            </div>
          )}

          {result && (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 inline-flex items-center gap-1.5"><Globe className="w-4 h-4 text-[#1B4FD8]" /> تحليل ثقافة {company}</h3>
                {culture.summary && <p className="text-[13px] text-slate-600 leading-relaxed mb-3">{culture.summary}</p>}
                {culture.values?.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[11px] text-slate-400 mb-1.5">القيم والسمات</div>
                    <div className="flex flex-wrap gap-1.5">
                      {culture.values.map((v, i) => <span key={i} className="text-[12px] px-2.5 py-1 rounded-full bg-[#1B4FD8]/10 text-[#0f3db0]">{v}</span>)}
                    </div>
                  </div>
                )}
                {culture.tone && (
                  <div className="mb-3 flex items-start gap-2 text-[12px] text-slate-600">
                    <Tag className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span><b className="text-slate-700">النبرة الموصى بها:</b> {culture.tone}</span>
                  </div>
                )}
                {culture.keywords?.length > 0 && (
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1.5 inline-flex items-center gap-1"><Hash className="w-3 h-3" /> الكلمات المفتاحية</div>
                    <div className="flex flex-wrap gap-1.5">
                      {culture.keywords.map((k, i) => <span key={i} className="text-[12px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{k}</span>)}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-1 inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-500" /> التعديلات المطبّقة ({changes.length})</h3>
                <p className="text-[11px] text-slate-400 mb-3">كل تعديل مع النص الأصلي والجديد وسبب التغيير.</p>
                <div className="space-y-3">
                  {changes.length === 0 && <div className="text-[12px] text-slate-400">لم تُجرَ أي تعديلات.</div>}
                  {changes.map((c, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{SECTION_LABELS[c.section] || c.section}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{c.field}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="rounded-lg bg-rose-50/60 border border-rose-100 p-2.5">
                          <div className="text-[10px] text-rose-400 mb-1">الأصلي</div>
                          <div className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-4">{c.original || "—"}</div>
                        </div>
                        <div className="flex justify-center -my-1"><ArrowRight className="w-4 h-4 text-slate-300 rotate-90" /></div>
                        <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-2.5">
                          <div className="text-[10px] text-emerald-500 mb-1">الجديد</div>
                          <div className="text-[12px] text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-4">{c.modified || "—"}</div>
                        </div>
                      </div>
                      {c.reason && (
                        <div className="mt-2 text-[12px] text-slate-500 leading-relaxed bg-slate-50 rounded-lg p-2.5">
                          <b className="text-slate-600">لماذا:</b> {c.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setResult(null)} disabled={applying} className="inline-flex items-center justify-center gap-1.5 text-sm px-4 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50">
                  إعادة التحليل
                </button>
                <button onClick={apply} disabled={applying} className="inline-flex items-center justify-center gap-1.5 text-sm px-4 py-3 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#0f3db0] disabled:opacity-40">
                  <Check className="w-4 h-4" /> تطبيق السيرة المخصّصة
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}