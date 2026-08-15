import { Loader2, Search } from "lucide-react";

/** خطوة إدخال الإعلان: نصّ ملصوق أو رابط. لا بحث عن وظائف من هنا. */
export default function JobAdInputStep({ adText, onAdText, adUrl, onAdUrl, cvTitle, busy, error, onAnalyze }) {
  const canAnalyze = !!(adText.trim() || adUrl.trim()) && !busy;
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">
        سنخصّص سيرتك الحالية{cvTitle ? ` «${cvTitle}»` : ""} لهذا الإعلان. لا حاجة لاختيار سيرة من جديد.
      </p>

      <div>
        <label className="block text-[12px] font-medium text-slate-700 mb-1">نصّ إعلان الوظيفة</label>
        <textarea
          value={adText}
          onChange={(e) => onAdText(e.target.value)}
          rows={7}
          placeholder="الصق نصّ الإعلان هنا…"
          className="w-full resize-none border border-slate-200 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#000066] focus:ring-2 focus:ring-[#000066]/10 transition-all"
        />
      </div>

      <div>
        <label className="block text-[12px] font-medium text-slate-700 mb-1">أو رابط الوظيفة</label>
        <input
          value={adUrl}
          onChange={(e) => onAdUrl(e.target.value)}
          placeholder="https://…"
          dir="ltr"
          className="inp"
        />
      </div>

      {error && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{error}</p>}

      <button
        type="button"
        onClick={onAnalyze}
        disabled={!canAnalyze}
        className="w-full inline-flex items-center justify-center gap-2 text-[13px] px-4 py-2.5 rounded-xl bg-[#000066] text-white hover:bg-[#00003d] transition-colors disabled:opacity-40"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        <span>{busy ? "جارٍ تحليل الوظيفة…" : "تحليل الوظيفة"}</span>
      </button>
    </div>
  );
}