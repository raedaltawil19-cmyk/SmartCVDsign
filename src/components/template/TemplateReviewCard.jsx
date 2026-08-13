import { Check, ArrowLeft, LayoutTemplate } from "lucide-react";
import CVPreview from "@/components/CVPreview";
import { TEMPLATES, DEFAULT_LAYOUTS, normalizeLayout } from "@/lib/cvModel";

const A4_W = 794;
const PREVIEW_W = 240;
const PREVIEW_H = 300;
const SCALE = PREVIEW_W / A4_W;

const templateName = (id) => TEMPLATES.find((t) => t.id === id)?.namn || id;
const isKnown = (id) => TEMPLATES.some((t) => t.id === id);

/** معاينة حقيقية للقراءة فقط — نفس مكوّنات القالب الفعلية، مقصوصة بصرياً */
function MiniCV({ templateId, data, layout, label, highlight }) {
  return (
    <div className="min-w-0">
      <div className={`text-[12px] font-medium mb-1.5 ${highlight ? "text-[#000066]" : "text-slate-500"}`}>{label}</div>
      <div
        className={`relative overflow-hidden rounded-lg bg-white ${highlight ? "border-2 border-[#000066]" : "border border-slate-200"}`}
        style={{ width: PREVIEW_W, height: PREVIEW_H, maxWidth: "100%" }}
        aria-hidden="true"
      >
        <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left", width: A4_W }}>
          <CVPreview templateId={templateId} data={data} layout={layout} editable={false} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
      </div>
    </div>
  );
}

/**
 * TemplateReviewCard — بطاقة عرض غير حاجزة لقرار مراجعة القالب.
 * عرض فقط: لا قاعدة بيانات، لا وكلاء، لا ملاحة، ولا أي تعديل على السيرة.
 * كل ما تفعله الأزرار هو استدعاء callbacks يملكها Builder.
 */
export default function TemplateReviewCard({
  visible = true,
  decision,
  currentTemplateId,
  suggestedTemplateId,
  reason,
  data,
  currentLayout,
  onAccept,
  onReject,
  onContinue
}) {
  // حالة آمنة: لا تخمين ولا تركيب معاينات ثقيلة
  if (!visible) return null;
  if (decision !== "keep" && decision !== "suggest") return null;
  if (!isKnown(currentTemplateId)) return null;

  const shell = "no-print mx-auto w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-sm px-4 py-3.5 sm:px-5";

  if (decision === "keep") {
    return (
      <div dir="rtl" className={shell}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-green-50 border border-green-200 grid place-items-center">
            <Check className="w-4 h-4 text-green-600" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-slate-900">قالب سيرتك مناسب لهذا النوع من السيرة.</p>
            {reason && <p className="text-[12.5px] text-slate-500 leading-relaxed mt-0.5">{reason}</p>}
          </div>
          <button
            onClick={onContinue}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#000066] text-white hover:bg-[#00003d] transition-colors"
          >
            <span>متابعة</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // suggest — يتطلب قالباً مقترحاً معروفاً ومختلفاً، وبيانات للمعاينة
  if (!isKnown(suggestedTemplateId) || suggestedTemplateId === currentTemplateId || !data) return null;

  const suggestedLayout = normalizeLayout(DEFAULT_LAYOUTS[suggestedTemplateId], suggestedTemplateId);
  const activeLayout = normalizeLayout(currentLayout, currentTemplateId);

  return (
    <div dir="rtl" className={shell}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-[#000066]/5 border border-[#000066]/15 grid place-items-center">
          <LayoutTemplate className="w-4 h-4 text-[#000066]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-slate-900">
            قالب <span className="text-[#000066]">{templateName(suggestedTemplateId)}</span> قد يبرز سيرتك أكثر
          </p>
          {reason && <p className="text-[12.5px] text-slate-500 leading-relaxed mt-0.5">{reason}</p>}
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-start justify-center gap-4 sm:gap-6">
        <MiniCV
          templateId={currentTemplateId}
          data={data}
          layout={activeLayout}
          label={`الحالي · ${templateName(currentTemplateId)}`}
        />
        <MiniCV
          templateId={suggestedTemplateId}
          data={data}
          layout={suggestedLayout}
          label={`المقترح · ${templateName(suggestedTemplateId)}`}
          highlight
        />
      </div>

      <div className="mt-3.5 flex flex-col sm:flex-row gap-2 sm:justify-end">
        <button
          onClick={onReject}
          className="order-2 sm:order-1 text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          الاحتفاظ بالقالب الحالي
        </button>
        <button
          onClick={onAccept}
          className="order-1 sm:order-2 text-sm px-4 py-2 rounded-lg bg-[#000066] text-white hover:bg-[#00003d] transition-colors"
        >
          استخدام القالب المقترح
        </button>
      </div>
    </div>
  );
}