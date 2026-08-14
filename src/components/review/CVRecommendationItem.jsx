import { Check } from "lucide-react";

const SEVERITY_LABEL = { necessary: "ضروري", valuable: "ذو قيمة", cosmetic: "تجميلي" };
const SEVERITY_STYLE = {
  necessary: "bg-red-50 text-red-700 border-red-200",
  valuable: "bg-amber-50 text-amber-700 border-amber-200",
  cosmetic: "bg-slate-100 text-slate-600 border-slate-200"
};
const TYPE_LABEL = {
  content: "المحتوى",
  structure: "البنية",
  layout: "التنسيق",
  ats: "توافق ATS",
  positioning: "التموضع المهني",
  job_alignment: "مطابقة الوظيفة",
  language: "اللغة"
};
const SECTION_LABEL = {
  header: "الترويسة",
  kontakt: "معلومات التواصل",
  profil: "الملف الشخصي",
  erfarenhet: "الخبرات",
  utbildning: "التعليم",
  fardigheter: "المهارات",
  sprak: "اللغات",
  layout: "ترتيب الأقسام"
};

/**
 * توصية واحدة — عرض واختيار محلي فقط.
 * لا تعرض itemRef ولا أي معرّف تقني ولا JSON خام، ولا تحمل أي زر تطبيق.
 */
export default function CVRecommendationItem({ rec, selected, onToggle, dependencyTitles }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(rec.id)}
        aria-pressed={selected}
        className="w-full text-right flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors"
      >
        <span className={`shrink-0 mt-0.5 w-4 h-4 rounded border grid place-items-center ${selected ? "bg-[#000066] border-[#000066] text-white" : "border-slate-300 bg-white"}`}>
          {selected && <Check className="w-3 h-3" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${SEVERITY_STYLE[rec.severity]}`}>
              {SEVERITY_LABEL[rec.severity]}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-500">
              {TYPE_LABEL[rec.type]}
            </span>
            {SECTION_LABEL[rec.target?.section] && (
              <span className="text-[10px] text-slate-400">{SECTION_LABEL[rec.target.section]}</span>
            )}
          </span>
          <span className="block text-[13px] font-semibold text-slate-800 leading-snug">{rec.title}</span>
        </span>
      </button>

      <div className="px-3 pb-3 pt-0 space-y-1.5 text-[11.5px] leading-relaxed text-slate-600">
        <p><span className="text-slate-400">المشكلة: </span>{rec.problem}</p>
        <p><span className="text-slate-400">لماذا تهم: </span>{rec.why}</p>
        <p className="text-slate-700"><span className="text-slate-400">المقترح: </span>{rec.recommendation}</p>
        {dependencyTitles?.length > 0 && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
            مرتبطة بـ: {dependencyTitles.join("، ")}
          </p>
        )}
      </div>
    </li>
  );
}