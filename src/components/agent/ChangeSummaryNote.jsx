import { Check, X } from "lucide-react";

/**
 * ملخّص تغييرات مبنيّ على نتيجة التنفيذ الفعلية (results) لا على كلام الوكيل.
 * عرض فقط — لا ينفّذ ولا يحفظ شيئاً.
 */
export default function ChangeSummaryNote({ note }) {
  const { ok, text, results } = note;
  const list = Array.isArray(results) ? results : [];
  const applied = list.filter((r) => r.ok);
  const failed = list.filter((r) => !r.ok);

  return (
    <div className={`text-[11px] leading-relaxed rounded-xl px-3 py-2 border ${ok ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
      <p className="font-medium">{text}</p>
      {applied.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {applied.map((r, i) => (
            <li key={`a${i}`} className="flex items-start gap-1">
              <Check className="w-3 h-3 mt-0.5 shrink-0 text-green-600" />
              <span>{r.label}</span>
            </li>
          ))}
        </ul>
      )}
      {failed.length > 0 && (
        <>
          <p className="mt-1.5 font-medium">{ok ? "لم يتم تنفيذ:" : "سبب عدم التنفيذ:"}</p>
          <ul className="mt-0.5 space-y-0.5">
            {failed.map((r, i) => (
              <li key={`f${i}`} className="flex items-start gap-1">
                <X className="w-3 h-3 mt-0.5 shrink-0 text-amber-600" />
                <span>{r.label}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}