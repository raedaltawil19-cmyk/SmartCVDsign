import { Check } from "lucide-react";

/**
 * الخطوة 1 من طبقة التأكيد: عرض القيمة الحالية + السؤال + مرشَّحات + نصّ حرّ.
 * عرض واختيار فقط — لا كتابة إلى السيرة ولا إرسال إلى أي وكيل.
 */
export default function EvidenceCollectStep({ request, picked, onPick, userText, onUserText }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] text-slate-400 mb-1">الوصف الحالي</p>
        <p className="text-[12px] leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 whitespace-pre-wrap">
          {request.currentValue || "(فارغ)"}
        </p>
      </div>

      <div>
        <p className="text-[11px] text-slate-400 mb-1">المعلومة المطلوبة</p>
        <p className="text-[12px] leading-relaxed text-slate-700">{request.question}</p>
      </div>

      {request.candidates.length > 0 && (
        <div>
          <p className="text-[11px] text-slate-400 mb-1.5">
            اقتراحات يمكن أن تكون ذات صلة — مأخوذة من محتوى سيرتك، ولن تُضاف إلا إذا أكّدتها
          </p>
          <ul className="space-y-1.5">
            {request.candidates.map((c) => {
              const on = picked.includes(c.label);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onPick(c.label)}
                    className={`w-full text-right flex items-center gap-2 text-[12px] px-3 py-2 rounded-xl border transition-colors ${on ? "border-[#000066] bg-[#000066]/5 text-[#000066]" : "border-slate-200 hover:bg-slate-50 text-slate-700"}`}
                  >
                    <span className={`w-4 h-4 shrink-0 rounded border grid place-items-center ${on ? "bg-[#000066] border-[#000066]" : "border-slate-300"}`}>
                      {on && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span>{c.label}</span>
                    <span className="mr-auto text-[10px] text-slate-400">{c.from}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <p className="text-[11px] text-slate-400 mb-1">معلوماتي الخاصة</p>
        <textarea
          value={userText}
          onChange={(e) => onUserText(e.target.value)}
          rows={3}
          placeholder="اكتب ما تناولته فعلاً بكلماتك…"
          className="w-full resize-none border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#000066] focus:ring-2 focus:ring-[#000066]/10 transition-all"
        />
      </div>
    </div>
  );
}