import { useMemo, useRef, useState } from "react";
import { X, Target, GripVertical } from "lucide-react";
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
  const [sentIds, setSentIds] = useState([]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const cvRecord = useMemo(() => (cvId ? { id: cvId, templateId, data } : null), [cvId, templateId, data]);
  const tailor = useJobTailorPopup({ cvRecord });

  const send = (ids) => {
    const result = onSend(ids.filter((id) => !sentIds.includes(id)), tailor.review);
    // يدعم الجسر الجديد (ok/sentIds) مع الحفاظ على التوافق مع أي مسار قديم يعيد نص خطأ.
    if (typeof result === "string") {
      if (result) setSendError(result);
      return;
    }
    if (!result?.ok) {
      setSendError(result?.error || "تعذّر إرسال التوصيات المحددة.");
      return;
    }
    setSentIds((prev) => [...new Set([...prev, ...(result.sentIds || [])])]);
    setSendError(result.error || "");
  };

  const startDrag = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const moveDrag = (e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({ x: dragRef.current.originX + dx, y: dragRef.current.originY + dy });
  };

  const endDrag = () => {
    dragRef.current.active = false;
  };

  const showSuggestions = tailor.ready;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 cursor-move select-none touch-none"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          title="اسحب النافذة إلى أي مكان"
        >
          <GripVertical className="w-3.5 h-3.5 text-slate-300" />
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
              sentIds={sentIds}
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