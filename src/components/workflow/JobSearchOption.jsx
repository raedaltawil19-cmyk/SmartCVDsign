import { Search } from "lucide-react";

/**
 * خيار مستقل وواضح للبحث عن وظائف — منفصل عن أمثلة التخصيص.
 * لا يستدعي أي أداة: يضع طلباً صريحاً في حقل الكتابة ليرسله المستخدم بنفسه.
 */
export default function JobSearchOption({ onPick }) {
  return (
    <div className="mt-6 pt-5 border-t border-slate-200">
      <p className="text-[11px] text-slate-400 mb-2">أو مسار مختلف — ليس لديك إعلان وظيفة بعد؟</p>
      <button
        onClick={() => onPick("ابحث لي عن وظائف مناسبة لخبراتي")}
        className="w-full inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-[#000066] text-[#000066] bg-white hover:bg-[#000066]/5 transition-colors font-medium"
      >
        <Search className="w-4 h-4" />
        <span>ابحث لي عن وظائف</span>
      </button>
    </div>
  );
}