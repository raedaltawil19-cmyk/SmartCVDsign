import TailorRecommendationRow from "@/components/tailor/TailorRecommendationRow";
import { Send } from "lucide-react";

/**
 * شاشة اقتراحات التخصيص داخل نفس النافذة — عرض واختيار فقط.
 * لا تطبيق هنا: الإرسال يمرّ بمساعد السيرة وهو نقطة التنفيذ الوحيدة.
 */
export default function TailorSuggestionsStep({ review, selectedIds, sentIds = [], onToggle, onSend, error }) {
  const recs = Array.isArray(review?.recommendations) ? review.recommendations : [];
  return (
    <div className="space-y-3">
      {review?.summary && <p className="text-[12px] text-slate-600 leading-relaxed">{review.summary}</p>}

      {recs.length === 0 ? (
        <p className="text-[12px] text-slate-500">سيرتك متوافقة مع هذا الإعلان، ولا توصيات تخصيص الآن.</p>
      ) : (
        <>
          <p className="text-[11px] text-slate-400">اختر ما تريد تخصيصه. بعد الإرسال تبقى القائمة مفتوحة ويمكنك مراجعة ما أُرسل بعلامة ✓ وسحب النافذة إلى أي مكان.</p>
          <ul className="space-y-2 max-h-[46vh] overflow-y-auto">
            {recs.map((rec) => (
              <TailorRecommendationRow
                key={rec.id}
                rec={rec}
                selected={selectedIds.includes(rec.id)}
                sent={sentIds.includes(rec.id)}
                onToggle={onToggle}
              />
            ))}
          </ul>

          {error && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{error}</p>}

          <button
            type="button"
            onClick={() => onSend(selectedIds)}
            disabled={selectedIds.filter((id) => !sentIds.includes(id)).length === 0}
            className="w-full inline-flex items-center justify-center gap-2 text-[13px] px-4 py-2.5 rounded-xl bg-[#000066] text-white hover:bg-[#00003d] transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            <span>تطبيق التخصيصات{selectedIds.filter((id) => !sentIds.includes(id)).length > 0 ? ` (${selectedIds.filter((id) => !sentIds.includes(id)).length})` : ""}</span>
          </button>
          <p className="text-[10.5px] text-slate-400">سيتم تطبيق ما اخترته على النسخة المخصصة فقط.</p>
        </>
      )}
    </div>
  );
}