/**
 * الخطوة 2 من طبقة التأكيد: القيمة الحالية + ما أكّده المستخدم + الصياغة المقترحة (قابلة للتعديل).
 * لا شيء يُطبَّق هنا — الإرسال يحدث بزرّ التأكيد في البطاقة الحاوية.
 */
export default function EvidenceDraftStep({ request, confirmed, text, onText, editing, onEdit }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] text-slate-400 mb-1">الوصف الحالي</p>
        <p className="text-[12px] leading-relaxed text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 whitespace-pre-wrap">
          {request.currentValue || "(فارغ)"}
        </p>
      </div>

      <div>
        <p className="text-[11px] text-slate-400 mb-1">المعلومات المؤكدة</p>
        {confirmed.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {confirmed.map((c) => (
              <li key={c} className="text-[11px] px-2 py-1 rounded-lg bg-[#000066]/5 border border-[#000066]/10 text-[#000066]">{c}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-slate-400">لم تُحدَّد معلومات من القائمة — سيُعتمد ما كتبته أنت فقط.</p>
        )}
      </div>

      <div>
        <p className="text-[11px] text-slate-400 mb-1">الاقتراح</p>
        {editing ? (
          <textarea
            value={text}
            onChange={(e) => onText(e.target.value)}
            rows={4}
            className="w-full resize-none border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#000066] focus:ring-2 focus:ring-[#000066]/10 transition-all"
          />
        ) : (
          <p className="text-[12px] leading-relaxed text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 whitespace-pre-wrap">{text}</p>
        )}
        {!editing && (
          <button type="button" onClick={onEdit} className="mt-1.5 text-[11px] text-[#000066] hover:underline">
            تعديل النص
          </button>
        )}
      </div>
    </div>
  );
}