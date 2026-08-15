import { AlertTriangle } from "lucide-react";

/**
 * تنبيه fail-closed لمسار Job Tailor — عرض فقط.
 * يظهر عندما يصدر الوكيل توصياتٍ بصيغة غير مطابقة للعقد فتُسقَط بالكامل،
 * فلا تبقى الحالة صامتة. لا يعدّل شيئاً ولا يحاول إصلاح المخرج.
 */
export default function TailorReviewNotice({ error }) {
  if (!error) return null;
  return (
    <div dir="rtl" className="max-w-3xl mx-auto flex items-start gap-2 text-[11.5px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <p>
        وصلت توصيات بصيغة غير مكتملة، فلم أعرضها كقائمة قابلة للاختيار حتى لا يُطبَّق شيء بالخطأ.
        اطلب مني إعادة التوصيات في قائمة منظّمة لهذه الوظيفة.
      </p>
    </div>
  );
}