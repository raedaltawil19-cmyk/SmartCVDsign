import { useMemo, useState } from "react";
import { X, Target } from "lucide-react";
import JobAdInputStep from "@/components/tailor/JobAdInputStep";
import TailorSuggestionsStep from "@/components/tailor/TailorSuggestionsStep";
import useJobTailorPopup from "@/lib/agent/useJobTailorPopup";

const MESSAGES = {
  NO_AD: "الصق نصّ الإعلان أو أرسل رابطه أولاً.",
  NO_CV: "احفظ سيرتك أولاً حتى نخصّصها لهذه الوظيفة.",
  ANALYZE_FAILED: "تعذّر تحليل الوظيفة، حاول مرة أخرى."
};

/**
 * نافذة «تخصيص CV لوظيفة معينة»: إدخال الإعلان ثم اقتراحات التخصيص في المكان نفسه.
 * السيرة الحالية معروفة من Builder، فلا يُطلَب معرّف سيرة إطلاقاً.
 * لا كتابة على السيرة من هنا: onSend يسلّم التوصيات المختارة إلى مساعد السيرة فقط.
 */
export default function JobTailorDialog({ cvId, templateId, data, cvTitle, onSend, onClose }) {
  const [adText, setAdText] = useState("");
  const [adUrl, setAdUrl] = useState("");
  const [sendError, setSendError] = useState("");

  const cvRecord = useMemo(() => (cvId ? { id: cvId, templateId, data } : null), [cvId, templateId, data]);
  const tailor = useJobTailorPopup({ cvRecord });

  const send = (ids) => {
    const err = onSend(ids, tailor.review);
    if (err) { setSendError(err); return; }
    setSendError("");
    onClose();
  };

  const showSuggestions = tailor.ready;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
          <Target className="w-4 h-4 text-[#000066]" />
          <h3 className="text-[13px] font-semibold text-slate-800">
            {showSuggestions ? "اقتراحات التخصيص لهذه الوظيفة" : "تخصيص CV لوظيفة معينة"}
          </h3>
          <button onClick={onClose} className="mr-auto text-slate-400 hover:text-slate-700 transition-colors" aria-label="إغلاق">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 max-h-[70vh] overflow-y-auto">
          {showSuggestions ? (
            <TailorSuggestionsStep
              review={tailor.review}
              selectedIds={tailor.selectedIds}
              onToggle={tailor.toggleRecommendation}
              onSend={send}
              error={sendError}
            />
          ) : (
            <JobAdInputStep
              adText={adText}
              onAdText={setAdText}
              adUrl={adUrl}
              onAdUrl={setAdUrl}
              cvTitle={cvTitle}
              busy={tailor.analyzing}
              error={tailor.error ? MESSAGES[tailor.error] || "تعذّر إكمال التحليل، حاول مرة أخرى." : ""}
              onAnalyze={() => tailor.analyze({ adText, adUrl })}
            />
          )}
        </div>
      </div>
    </div>
  );
}