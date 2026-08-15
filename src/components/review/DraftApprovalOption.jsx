import { Check } from "lucide-react";

/**
 * اعتماد صريح للصياغة المقترحة (draft) — بلا هذا الإقرار لا تصبح الصياغة قيمة معتمدة.
 * عرض وتفاعل فقط: لا كتابة ولا إرسال.
 */
export default function DraftApprovalOption({ draft, checked, onToggle }) {
  if (!draft) return null;
  return (
    <div>
      <p className="text-[11px] text-slate-400 mb-1.5">صياغة مقترحة — لن تُعتمد إلا إذا اعتمدتها أنت</p>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full text-right flex items-start gap-2 text-[12px] px-3 py-2 rounded-xl border transition-colors ${checked ? "border-[#000066] bg-[#000066]/5 text-[#000066]" : "border-slate-200 hover:bg-slate-50 text-slate-700"}`}
      >
        <span className={`w-4 h-4 mt-0.5 shrink-0 rounded border grid place-items-center ${checked ? "bg-[#000066] border-[#000066]" : "border-slate-300"}`}>
          {checked && <Check className="w-3 h-3 text-white" />}
        </span>
        <span className="leading-relaxed">{draft}</span>
      </button>
    </div>
  );
}