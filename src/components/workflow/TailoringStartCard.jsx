import { FileText, Loader2, Copy, Play, X } from "lucide-react";

const CONF_LABEL = {
  explicit: "اخترتَها أنت",
  strong: "الأقرب لهذا الإعلان بفارق واضح",
  weak: "الأقرب لهذا الإعلان لكن الفارق بسيط",
};

/**
 * بطاقة تأكيد بدء التخصيص — تعرض السيرة الأساسية قبل إنشاء أي نسخة.
 * قراءة وعرض فقط: لا إنشاء ولا حفظ داخلها — كل الإجراءات عبر callbacks.
 */
export default function TailoringStartCard({ base, confidence, cautious, existing, identity, error, busy, onStart, onOpenExisting, onSkip, onCancel }) {
  return (
    <div dir="rtl" className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-4 text-right">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-[#000066]" />
        <p className="text-sm font-semibold text-slate-900">قبل أن نبدأ التخصيص</p>
        <button onClick={onCancel} className="mr-auto text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
      </div>

      {error && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed mb-3">
          لم أستطع تحديد سيرة أساسية مناسبة لهذا الإعلان بثقة. لن أنشئ أي نسخة — يمكنك المتابعة بالمحادثة فقط، أو فتح السيرة التي تريد الانطلاق منها ثم إعادة المحاولة.
        </p>
      )}

      {base && (
        <div className="mb-3">
          <p className="text-[11px] text-slate-400 mb-1">السيرة الأساسية</p>
          <p className="text-sm font-medium text-slate-900">{base.titel || "سيرة بدون عنوان"}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{CONF_LABEL[confidence] || "اختيار الأساس"}{cautious ? " — أكّد أنها الأساس الصحيح" : ""}</p>
        </div>
      )}

      {existing && (
        <div className="mb-3 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 leading-relaxed text-slate-700">
          توجد نسخة مخصّصة سابقة لهذه الوظيفة: <span className="font-medium">{existing.titel}</span>
          {identity === "titel" && <span className="block text-[11px] text-slate-500 mt-1">التطابق مبني على عنوان الوظيفة فقط، فقرّر أنت.</span>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {existing && (
          <button onClick={onOpenExisting} disabled={busy} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-[#000066] text-white hover:bg-[#00003d] transition-colors disabled:opacity-40">
            <FileText className="w-4 h-4" />
            فتح النسخة الموجودة
          </button>
        )}
        {base && (
          <button onClick={onStart} disabled={busy} className={`inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl transition-colors disabled:opacity-40 ${existing ? "border border-slate-200 hover:bg-slate-50 text-slate-700" : "bg-[#D9E830] text-black hover:bg-[#c5d420] font-medium"}`}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : existing ? <Copy className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {existing ? "إنشاء نسخة جديدة" : "ابدأ التخصيص"}
          </button>
        )}
        {error && (
          <button onClick={onSkip} disabled={busy} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40">
            متابعة بلا نسخة مخصّصة
          </button>
        )}
      </div>
    </div>
  );
}