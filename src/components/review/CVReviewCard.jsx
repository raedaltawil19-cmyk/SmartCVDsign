import { X, ClipboardCheck, Sparkles } from "lucide-react";
import CVRecommendationItem from "@/components/review/CVRecommendationItem";

const SEVERITY_ORDER = { necessary: 0, valuable: 1, cosmetic: 2 };

/**
 * بطاقة مراجعة السيرة — عرض واختيار فقط (M5).
 * لا زر تطبيق، ولا تعديل سيرة، ولا حفظ، ولا CV_ACTION.
 * القيم الداخلية (severity/type/id) تُعرض مترجَمةً دون تغييرها.
 */
export default function CVReviewCard({ review, selectedIds = [], onToggle, onClose, onSendToAssistant }) {
  if (!review) return null;
  const noImprovement = review.reviewStatus === "no_improvement";
  const list = [...review.recommendations].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
  );
  const titleById = new Map(review.recommendations.map((r) => [r.id, r.title]));

  return (
    <div dir="rtl" className="no-print bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
        <ClipboardCheck className="w-4 h-4 text-[#000066]" />
        <h3 className="text-[13px] font-semibold text-slate-800">مراجعة سيرتك الذاتية</h3>
        {!noImprovement && selectedIds.length > 0 && (
          <span className="text-[10px] text-slate-500">اخترت {selectedIds.length}</span>
        )}
        <button onClick={onClose} className="mr-auto text-slate-400 hover:text-slate-700 transition-colors" aria-label="إغلاق">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 max-h-[38vh] overflow-y-auto">
        {noImprovement ? (
          <div className="space-y-1.5">
            <p className="text-[13px] font-medium text-slate-800">السيرة متماسكة ولا توجد تحسينات جوهرية ضرورية حالياً.</p>
            <p className="text-[12px] leading-relaxed text-slate-600">{review.summary}</p>
          </div>
        ) : (
          <>
            <p className="text-[12px] leading-relaxed text-slate-600 mb-3">{review.summary}</p>
            <p className="text-[11px] text-slate-400 mb-2">التحسينات المقترحة — اختر ما يهمك، لن يُطبَّق شيء الآن.</p>
            <ul className="space-y-2">
              {list.map((rec) => (
                <CVRecommendationItem
                  key={rec.id}
                  rec={rec}
                  selected={selectedIds.includes(rec.id)}
                  onToggle={onToggle}
                  dependencyTitles={(rec.dependsOn || []).map((id) => titleById.get(id)).filter(Boolean)}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {!noImprovement && onSendToAssistant && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50">
          <p className="text-[11px] text-slate-500">
            {selectedIds.length > 0 ? "سيتولّى مساعد السيرة تنفيذ ما اخترته فقط." : "اختر توصية واحدة أو أكثر لتنفيذها."}
          </p>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => onSendToAssistant(selectedIds)}
            className="mr-auto inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-[#000066] text-white disabled:opacity-40 hover:bg-[#00003d] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>أرسل المحدد إلى مساعد السيرة</span>
          </button>
        </div>
      )}
    </div>
  );
}