import { Sparkles, Target, X } from "lucide-react";

/**
 * نقطة اختيار المسار — عرض فقط: تُبلّغ الأب بالقرار ولا تعدّل سيرة ولا تشغّل وكيلاً بنفسها.
 */
export default function WorkflowChoiceCard({ onGeneral, onTailor, onClose }) {
  return (
    <div dir="rtl" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-semibold text-slate-900">ماذا تريد أن تفعل بالسيرة؟</p>
        <button onClick={onClose} className="mr-auto text-slate-400 hover:text-slate-700 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={onGeneral}
          className="text-right p-4 rounded-xl border border-slate-200 hover:border-[#000066] hover:bg-[#000066]/5 transition-colors"
        >
          <Sparkles className="w-5 h-5 text-[#000066] mb-2" />
          <p className="text-sm font-semibold text-slate-900">تحسين CV بشكل عام</p>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">مراجعة سيرتك الأساسية وتوصيات تختار منها ما تريد تنفيذه.</p>
        </button>
        <button
          onClick={onTailor}
          className="text-right p-4 rounded-xl border border-slate-200 hover:border-[#000066] hover:bg-[#D9E830]/20 transition-colors"
        >
          <Target className="w-5 h-5 text-[#000066] mb-2" />
          <p className="text-sm font-semibold text-slate-900">تخصيص CV لوظيفة معينة</p>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">نسخة مستقلة لهذه الوظيفة — سيرتك الأساسية تبقى كما هي.</p>
        </button>
      </div>
    </div>
  );
}