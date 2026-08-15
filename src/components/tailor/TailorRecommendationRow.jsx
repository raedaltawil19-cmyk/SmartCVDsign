import { Check } from "lucide-react";

const SEVERITY_LABEL = { necessary: "ضروري", valuable: "ذو قيمة", cosmetic: "تجميلي" };
const SEVERITY_STYLE = {
  necessary: "bg-red-50 text-red-700 border-red-200",
  valuable: "bg-amber-50 text-amber-700 border-amber-200",
  cosmetic: "bg-slate-100 text-slate-600 border-slate-200"
};

/**
 * توصية تخصيص مختصرة — عنوان + سبب موجز فقط.
 * لا تفاصيل ضخمة، ولا Evidence Pack، ولا معرّفات تقنية، ولا زر تطبيق.
 */
export default function TailorRecommendationRow({ rec, selected, sent = false, onToggle }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => !sent && onToggle(rec.id)}
        aria-pressed={selected}
        aria-disabled={sent}
        disabled={sent}
        className={`w-full text-right flex items-start gap-2.5 px-3 py-2.5 rounded-xl border transition-colors ${sent ? "border-green-200 bg-green-50/60" : selected ? "border-[#000066] bg-[#000066]/5" : "border-slate-200 bg-white hover:bg-slate-50"}`}
      >
        <span className={`shrink-0 mt-0.5 w-4 h-4 rounded border grid place-items-center ${selected ? "bg-[#000066] border-[#000066] text-white" : "border-slate-300 bg-white"}`}>
          {selected && <Check className="w-3 h-3" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 mb-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${SEVERITY_STYLE[rec.severity]}`}>
              {SEVERITY_LABEL[rec.severity]}
            </span>
          </span>
          <span className="block text-[13px] font-semibold text-slate-800 leading-snug">{rec.title}</span>
          <span className="block text-[11.5px] text-slate-500 leading-relaxed mt-0.5">{rec.why}</span>
        </span>
      </button>
    </li>
  );
}