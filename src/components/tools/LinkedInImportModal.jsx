import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import { mergeCV } from "@/lib/cvModel";
import { X, Loader2, Linkedin, Upload, FileText, ArrowRightLeft, AlertTriangle, Check, Sparkles } from "lucide-react";

const nonEmpty = (arr, key) => (arr || []).filter((x) => x && (!key || (x[key] && String(x[key]).trim()))).length;

const fillObj = (cur, inc) => {
  const out = {};
  for (const k of Object.keys(inc || {})) out[k] = (cur && cur[k] && String(cur[k]).trim()) ? cur[k] : (inc && inc[k] ? inc[k] : (cur && cur[k] ? cur[k] : ""));
  return out;
};

export default function LinkedInImportModal({ data, onApply, onClose }) {
  const { toast } = useToast();
  const { llm } = useServices();
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [raw, setRaw] = useState(null);
  const [confirmReplace, setConfirmReplace] = useState(null);
  const [applying, setApplying] = useState(false);

  const ownLinkedin = (() => {
    const cur = (data?.erfarenhet || []).length || (data?.fardigheter || []).length || (data?.profil || "").trim();
    return !!cur;
  })();

  const importRun = async () => {
    if (!text.trim() && !file) { toast({ title: "الصق نص الملف الشخصي أو ارفع ملفاً", variant: "destructive" }); return; }
    setBusy(true); setRaw(null); setConfirmReplace(null);
    try {
      let fileUrl = null;
      if (file) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        fileUrl = file_url;
      }
      const res = await llm.importLinkedIn({ text: text.trim(), fileUrl });
      if (!res || (!res.erfarenhet?.length && !res.utbildning?.length && !res.fardigheter?.length && !res.certifikat?.length && !res.projekt?.length && !res.profil)) {
        toast({ title: "لم نتمكن من استخراج بيانات", description: "تأكد من لصق ملف LinkedIn كاملاً.", variant: "destructive" });
      } else {
        setRaw(res);
      }
    } catch (e) {
      toast({ title: "تعذّر الاستيراد", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const buildExtracted = () => {
    if (!raw) return null;
    const base = mergeCV(raw);
    const clean = (a) => (a || []).filter((x) => x && Object.values(x).some((v) => v && String(v).trim()));
    const certs = clean(raw.certifikat).map((c) => ({ examen: c.namn || "", skola: c.utvardare || "", period: c.datum || "", beskrivning: "" }));
    const projs = clean(raw.projekt).map((p) => ({ roll: p.namn || "", foretag: "", period: p.period || "", beskrivning: p.beskrivning || "" }));
    return {
      ...base,
      utbildning: [...clean(base.utbildning), ...certs],
      erfarenhet: [...clean(base.erfarenhet), ...projs],
      _meta: {
        experience: clean(base.erfarenhet).length,
        education: clean(base.utbildning).length,
        skills: clean(base.fardigheter).length,
        languages: clean(base.sprak).length,
        certificates: certs.length,
        projects: projs.length,
      },
    };
  };

  const extracted = buildExtracted();

  const currentCounts = {
    experience: nonEmpty(data?.erfarenhet, "roll"),
    education: nonEmpty(data?.utbildning, "examen"),
    skills: nonEmpty(data?.fardigheter, "namn"),
    languages: nonEmpty(data?.sprak, "sprak"),
  };

  const applyMerge = () => {
    if (!extracted) return;
    setApplying(true);
    try {
      const cur = data || {};
      const cleanArr = (a, key) => (a || []).filter((x) => x && (!key || (x[key] && String(x[key]).trim())));
      const dedupe = (base, add, key) => {
        const names = new Set(base.map((b) => (b[key] || "").toLowerCase().trim()).filter(Boolean));
        return add.filter((x) => !x[key] || !names.has((x[key] || "").toLowerCase().trim()));
      };
      const merged = {
        namn: cur.namn || extracted.namn,
        titel: cur.titel || extracted.titel,
        kontakt: fillObj(cur.kontakt, extracted.kontakt),
        profil: (cur.profil || "").trim() || extracted.profil,
        erfarenhet: [...cleanArr(cur.erfarenhet, "roll"), ...cleanArr(extracted.erfarenhet, "roll")],
        utbildning: [...cleanArr(cur.utbildning, "examen"), ...cleanArr(extracted.utbildning, "examen")],
        fardigheter: (() => {
          const b = cleanArr(cur.fardigheter, "namn");
          return [...b, ...dedupe(b, cleanArr(extracted.fardigheter, "namn"), "namn")];
        })(),
        sprak: (() => {
          const b = cleanArr(cur.sprak, "sprak");
          return [...b, ...dedupe(b, cleanArr(extracted.sprak, "sprak"), "sprak")];
        })(),
      };
      onApply(merged);
      toast({ title: "تم دمج بيانات LinkedIn", description: "أُضيفت الأقسام الجديدة دون حذف بياناتك الحالية." });
      onClose();
    } finally {
      setApplying(false);
    }
  };

  const applyReplace = () => {
    if (!extracted) return;
    const { _meta, ...cv } = extracted;
    onApply(cv);
    toast({ title: "تم استبدال السيرة ببيانات LinkedIn" });
    onClose();
  };

  const m = extracted?._meta || {};

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <span className="font-medium text-slate-900 inline-flex items-center gap-2">
          <Linkedin className="w-4 h-4 text-[#0A66C2]" /> استيراد من LinkedIn
        </span>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          <X className="w-4 h-4" /><span>إغلاق</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-100">
        <div className="max-w-xl mx-auto space-y-5">
          {!extracted && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="rounded-xl bg-[#0A66C2]/5 border border-[#0A66C2]/15 p-3 text-[12px] text-slate-600 leading-relaxed flex gap-2">
                <Sparkles className="w-4 h-4 text-[#0A66C2] shrink-0 mt-0.5" />
                <span>افتح ملفك الشخصي على LinkedIn ← زر «More» ← «Save to PDF»، ثم ارفع الملف هنا. أو الصق محتوى الملف الشخصي كاملاً (النبذة، الخبرات، التعليم، المهارات، الشهادات، المشاريع). سنحوّلها لأقسام سيرة قابلة للتحرير بالسويدية.</span>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">نص الملف الشخصي</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  placeholder="الصق محتوى ملف LinkedIn الشخصي هنا..."
                  className="w-full text-[13px] leading-relaxed border border-slate-200 rounded-xl p-3 outline-none focus:border-[#0A66C2] resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">أو ارفع ملف LinkedIn (PDF/نص)</label>
                <label className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-6 ${file ? "border-[#0A66C2] bg-[#0A66C2]/5" : "border-slate-200 hover:border-slate-300"}`}>
                  <input type="file" accept=".pdf,.txt,.doc,.docx,.json" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  {file ? (
                    <span className="text-sm font-medium text-slate-700 inline-flex items-center gap-1.5"><FileText className="w-4 h-4 text-[#0A66C2]" /> {file.name}</span>
                  ) : (
                    <span className="text-sm text-slate-500 inline-flex items-center gap-1.5"><Upload className="w-4 h-4 text-slate-400" /> اختر ملف LinkedIn</span>
                  )}
                </label>
              </div>

              <button onClick={importRun} disabled={busy} className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-[#0A66C2] text-white hover:bg-[#0852a6] disabled:opacity-40">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Linkedin className="w-4 h-4" />}
                {busy ? "جاري الاستخراج..." : "استورد وحلّل"}
              </button>
            </div>
          )}

          {busy && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#0A66C2]" />
              <span className="text-sm">نقرأ ملف LinkedIn ونحوّله لأقسام سيرة...</span>
            </div>
          )}

          {extracted && (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> تم استخراج البيانات</h3>
                {extracted.namn && <div className="text-[15px] font-medium text-slate-900 mb-0.5">{extracted.namn}</div>}
                {extracted.titel && <div className="text-[13px] text-slate-500 mb-3">{extracted.titel}</div>}

                <div className="grid grid-cols-3 gap-2">
                  <Count label="خبرات" n={m.experience} />
                  <Count label="تعليم" n={m.education} />
                  <Count label="مهارات" n={m.skills} />
                  <Count label="لغات" n={m.languages} />
                  <Count label="شهادات" n={m.certificates} sub="ضمن التعليم" />
                  <Count label="مشاريع" n={m.projects} sub="ضمن الخبرات" />
                </div>
                <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                  ملاحظة: الشهادات تُضاف ضمن قسم التعليم، والمشاريع ضمن قسم الخبرات — كلها قابلة للتحرير بعد التطبيق.
                </p>
              </div>

              {ownLinkedin && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">البيانات الحالية في سيرتك</h3>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <MiniCount label="خبرات" n={currentCounts.experience} />
                    <MiniCount label="تعليم" n={currentCounts.education} />
                    <MiniCount label="مهارات" n={currentCounts.skills} />
                    <MiniCount label="لغات" n={currentCounts.languages} />
                  </div>
                </div>
              )}

              {!confirmReplace ? (
                <div className="grid grid-cols-2 gap-3">
                  {ownLinkedin && (
                    <button onClick={applyMerge} disabled={applying} className="inline-flex items-center justify-center gap-1.5 text-sm px-4 py-3 rounded-xl bg-[#0A66C2] text-white hover:bg-[#0852a6] disabled:opacity-40">
                      <ArrowRightLeft className="w-4 h-4" /> دمج (إضافة)
                    </button>
                  )}
                  <button
                    onClick={() => ownLinkedin ? setConfirmReplace(true) : applyReplace()}
                    disabled={applying}
                    className={`inline-flex items-center justify-center gap-1.5 text-sm px-4 py-3 rounded-xl border ${ownLinkedin ? "border-slate-200 text-slate-700 hover:bg-slate-50" : "bg-[#0A66C2] text-white hover:bg-[#0852a6] border-[#0A66C2]"}`}
                  >
                    <Sparkles className="w-4 h-4" /> استبدال السيرة
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border-2 border-rose-200 p-5">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-rose-700">سيتم استبدال كل بياناتك الحالية</div>
                      <p className="text-[12px] text-slate-500 mt-0.5">لا يمكن التراجع. يُنصح بالدمج إن أردت الإبقاء على بياناتك الحالية.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={applyReplace} className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700">
                      <Check className="w-4 h-4" /> تأكيد الاستبدال
                    </button>
                    <button onClick={() => setConfirmReplace(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">إلغاء</button>
                  </div>
                </div>
              )}

              <button onClick={() => { setRaw(null); setConfirmReplace(null); }} className="w-full text-[12px] text-slate-400 hover:text-slate-600">
                إعادة الاستيراد ببيانات أخرى
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Count({ label, n, sub }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-center">
      <div className="text-xl font-bold text-slate-900">{n}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

function MiniCount({ label, n }) {
  return (
    <div>
      <div className="text-lg font-semibold text-slate-800">{n}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}