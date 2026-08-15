import { Check } from "lucide-react";
import EvidencePackView from "@/components/review/EvidencePackView";

/**
 * الخطوة 1: عرض حزمة الأدلّة الجاهزة + تأكيد ما يحتاج تأكيداً + نصّ حرّ.
 * لا اكتشاف أدلّة هنا، ولا كتابة إلى السيرة، ولا إرسال إلى أي وكيل.
 */
export default function EvidenceCollectStep({ request, picked, onPick, userText, onUserText }) {
  const confirmables = [...request.confirmationRequired, ...request.relevant.filter((r) => !request.confirmationRequired.includes(r))];

  return (
    <div className="space-y-3">
      <EvidencePackView request={request} />

      {request.question && (
        <div>
          <p className="text-[11px] text-slate-400 mb-1">المطلوب منك</p>
          <p className="text-[12px] leading-relaxed text-slate-700">{request.question}</p>
        </div>
      )}

      {confirmables.length > 0 && (
        <div>
          <p className="text-[11px] text-slate-400 mb-1.5">
            تحتاج تأكيدك — لن تُدخل إلى سيرتك إلا إذا أكّدتها أنت
          </p>
          <ul className="space-y-1.5">
            {confirmables.map((label) => {
              const on = picked.includes(label);
              return (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => onPick(label)}
                    className={`w-full text-right flex items-center gap-2 text-[12px] px-3 py-2 rounded-xl border transition-colors ${on ? "border-[#000066] bg-[#000066]/5 text-[#000066]" : "border-slate-200 hover:bg-slate-50 text-slate-700"}`}
                  >
                    <span className={`w-4 h-4 shrink-0 rounded border grid place-items-center ${on ? "bg-[#000066] border-[#000066]" : "border-slate-300"}`}>
                      {on && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span>{label}</span>
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
          placeholder="أضف ما ينقص بكلماتك…"
          className="w-full resize-none border border-slate-200 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#000066] focus:ring-2 focus:ring-[#000066]/10 transition-all"
        />
      </div>
    </div>
  );
}